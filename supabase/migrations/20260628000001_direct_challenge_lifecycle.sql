-- ================================================================
-- Direct Challenge lifecycle redesign
--
-- Changes from prior design (20260626000002_direct_challenges_rpcs.sql):
--
-- New status: 'challenger_playing'
--   Challenger is sent directly into game after clicking "Start & Play".
--   The challenge is invisible to the opponent until the challenger submits.
--
-- Old lifecycle (REMOVED):
--   challenger sends → direct_pending
--   challenger sees "Play Your Turn" in account page
--   challenger plays → direct_pending remains
--   → opponent sees incoming challenge (TOO EARLY — challenger may not submit)
--
-- New lifecycle:
--   challenger clicks "Start & Play"
--   → send_direct_challenge creates match with status = 'challenger_playing'
--   → challenger is taken directly to game page (no account redirect)
--   → opponent sees nothing yet
--   challenger submits score
--   → verify_and_save_duel_result transitions challenger_playing → direct_pending
--   → challenger is sent to normal classicresults/top10results page
--   → opponent NOW sees "Accept & Play" / "Decline" card
--   opponent accepts → active
--   opponent plays → finished
--   → opponent is sent to normal results page
--   → both players can view duel comparison via modal on completed challenge card
--
-- Functions changed (full replacements):
--   1. h2h_matches status constraint — add 'challenger_playing'
--   2. send_direct_challenge — create with challenger_playing, set started_at/timeout_at
--   3. verify_and_save_duel_result — accept challenger_playing, transition to direct_pending
--   4. get_my_direct_challenges — exclude challenger_playing from opponent's view
--   5. cleanup_stale_duel_matches — add Rule 5 for stale challenger_playing matches
-- ================================================================


-- ── 1. Extend status CHECK ────────────────────────────────────────

ALTER TABLE public.h2h_matches
  DROP CONSTRAINT IF EXISTS h2h_matches_status_check;

ALTER TABLE public.h2h_matches
  ADD CONSTRAINT h2h_matches_status_check
  CHECK (status IN (
    'waiting', 'category_select', 'active',
    'direct_pending', 'challenger_playing',
    'finished', 'abandoned'
  ));


-- ── 2. send_direct_challenge ──────────────────────────────────────
--
-- Now creates the match with status = 'challenger_playing' and sets
-- started_at/timeout_at so the challenger's game timer is server-authoritative.
-- Opponent sees nothing until challenger submits.
--
-- Returns game_started_at (was challenger_game_start) for the challenger's
-- client-side timer reference.
-- ================================================================
CREATE OR REPLACE FUNCTION public.send_direct_challenge(
  p_challenged_user_id uuid,
  p_category           text,
  p_duel_mode          text DEFAULT 'classic'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller       uuid := auth.uid();
  v_seed         bigint;
  v_cdm_result   jsonb;
  v_match_id     uuid;
  v_now          timestamptz;
  v_direct_count int;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = 'P0001';
  END IF;

  IF p_challenged_user_id IS NULL OR p_challenged_user_id = v_caller THEN
    RAISE EXCEPTION 'Cannot challenge yourself' USING errcode = 'P0002';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_challenged_user_id) THEN
    RAISE EXCEPTION 'Target player not found' USING errcode = 'P0003';
  END IF;

  -- Stricter per-type rate limit for direct challenges
  SELECT COUNT(*) INTO v_direct_count
  FROM public.h2h_matches
  WHERE player1_id = v_caller
    AND match_type = 'direct'
    AND created_at > NOW() - INTERVAL '1 hour';

  IF v_direct_count >= 10 THEN
    RAISE EXCEPTION 'Too many direct challenges sent recently. Please wait before sending another.'
      USING errcode = 'P0004';
  END IF;

  -- No existing active challenge in either direction (include challenger_playing)
  IF EXISTS (
    SELECT 1 FROM public.h2h_matches
     WHERE player1_id        = v_caller
       AND invited_player_id = p_challenged_user_id
       AND match_type        = 'direct'
       AND status            IN ('direct_pending', 'challenger_playing')
  ) THEN
    RAISE EXCEPTION 'You already have a pending challenge with this player'
      USING errcode = 'P0005';
  END IF;

  -- No cross-challenge: target → caller already pending or playing
  IF EXISTS (
    SELECT 1 FROM public.h2h_matches
     WHERE player1_id        = p_challenged_user_id
       AND invited_player_id = v_caller
       AND match_type        = 'direct'
       AND status            IN ('direct_pending', 'challenger_playing')
  ) THEN
    RAISE EXCEPTION 'This player has already sent you a pending challenge'
      USING errcode = 'P0006';
  END IF;

  -- Delegate to create_duel_match for category validation, tier check,
  -- seed storage, and the combined 20/hr rate limit.
  v_seed       := floor(random() * 2147483647)::bigint;
  v_cdm_result := public.create_duel_match(p_category, v_seed, p_duel_mode);
  v_match_id   := (v_cdm_result->>'id')::uuid;

  -- Challenger starts playing immediately — record the server time as the
  -- authoritative game-start. The challenge is invisible to the opponent
  -- until the challenger submits (challenger_playing status).
  v_now := clock_timestamp();
  UPDATE public.h2h_matches
     SET status            = 'challenger_playing',
         match_type        = 'direct',
         invited_player_id = p_challenged_user_id,
         invite_expires_at = v_now + INTERVAL '24 hours',
         started_at        = v_now,
         timeout_at        = v_now + INTERVAL '5 minutes'
   WHERE id = v_match_id;

  RETURN jsonb_build_object(
    'match_id',         v_match_id,
    'seed',             v_seed,
    'category',         p_category,
    'duel_mode',        p_duel_mode,
    'game_started_at',  v_now
  );
END;
$$;

REVOKE ALL  ON FUNCTION public.send_direct_challenge(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_direct_challenge(uuid, text, text) TO authenticated;


-- ── 3. verify_and_save_duel_result ───────────────────────────────
--
-- Now also accepts challenger_playing (in addition to direct_pending)
-- for player1 of a direct match. After the challenger submits during
-- challenger_playing, the status transitions to direct_pending so the
-- opponent can see and accept the challenge.
-- ================================================================
CREATE OR REPLACE FUNCTION public.verify_and_save_duel_result(
  p_match_id   uuid,
  p_placements jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller        uuid := auth.uid();
  v_match         h2h_matches%rowtype;
  v_elem          jsonb;
  v_placed        int;
  v_min           int;
  v_max           int;
  v_diff          int;
  v_points        int;
  v_score         int  := 0;
  v_max_score     int;
  v_both_done     boolean;
  v_opponent_id   uuid;
  v_opp_score     int;
  v_is_winner     boolean;
  v_rows_inserted int;
BEGIN
  -- Caller must be authenticated
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = 'P0001';
  END IF;

  -- Reject empty or null placements
  IF p_placements IS NULL OR jsonb_array_length(p_placements) < 1 THEN
    RAISE EXCEPTION 'Placements array must not be empty' USING errcode = 'P0002';
  END IF;

  -- Lock the match row to serialise concurrent submissions
  SELECT * INTO v_match FROM public.h2h_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found' USING errcode = 'P0003';
  END IF;

  -- Caller must be a participant in this specific match.
  -- For challenger_playing/direct_pending, player2_id IS NULL so the
  -- second condition evaluates to (NULL != v_caller) = NULL — player1
  -- passes through unchanged.
  IF v_match.player1_id != v_caller AND v_match.player2_id != v_caller THEN
    RAISE EXCEPTION 'User does not belong to this match' USING errcode = 'P0004';
  END IF;

  -- Allow challenger_playing and direct_pending for the challenger (player1) only.
  -- challenger_playing: challenger is actively playing (new lifecycle).
  -- direct_pending: backward compat for matches created before this migration.
  -- All other callers still require status = 'active'.
  IF v_match.status IN ('challenger_playing', 'direct_pending') THEN
    IF v_match.match_type != 'direct' OR v_match.player1_id != v_caller THEN
      RAISE EXCEPTION 'Only the challenger can submit during challenger_playing/direct_pending' USING errcode = 'P0005';
    END IF;
  ELSIF v_match.status != 'active' THEN
    RAISE EXCEPTION 'Match is not active (status: %)', v_match.status USING errcode = 'P0005';
  END IF;

  -- Re-derive score server-side based on duel_mode
  IF v_match.duel_mode IN ('vs', 'top10') THEN
    -- VS / Top10: score = count of rounds where wasCorrect is true
    v_max_score := jsonb_array_length(p_placements);
    FOR v_elem IN SELECT jsonb_array_elements(p_placements) LOOP
      IF (v_elem->>'wasCorrect')::boolean THEN
        v_score := v_score + 1;
      END IF;
    END LOOP;
  ELSE
    -- Classic: GREATEST(10 - diff, 1) per placement, max = placements * 10
    v_max_score := jsonb_array_length(p_placements) * 10;
    FOR v_elem IN SELECT jsonb_array_elements(p_placements) LOOP
      v_placed := (v_elem->>'placedRank')::int;
      v_min    := (v_elem->>'correctRankMin')::int;
      v_max    := (v_elem->>'correctRankMax')::int;

      IF v_placed >= v_min AND v_placed <= v_max THEN
        v_diff := 0;
      ELSIF v_placed < v_min THEN
        v_diff := v_min - v_placed;
      ELSE
        v_diff := v_placed - v_max;
      END IF;

      v_points := GREATEST(10 - v_diff, 1);
      v_score  := v_score + v_points;
    END LOOP;
  END IF;

  -- First-submission-wins: if a result row already exists, do nothing
  INSERT INTO public.h2h_results (match_id, user_id, placements, score, max_score)
  VALUES (p_match_id, v_caller, p_placements, v_score, v_max_score)
  ON CONFLICT (match_id, user_id) DO NOTHING;

  GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;

  -- Duplicate submission: return the committed score
  IF v_rows_inserted = 0 THEN
    SELECT score, max_score INTO v_score, v_max_score
    FROM public.h2h_results
    WHERE match_id = p_match_id AND user_id = v_caller;
  END IF;

  -- Determine opponent for winner comparison.
  -- During challenger_playing/direct_pending, player2_id IS NULL so
  -- v_opponent_id = NULL, score lookup returns no rows, v_is_winner = NULL.
  v_opponent_id := CASE WHEN v_caller = v_match.player1_id
                        THEN v_match.player2_id
                        ELSE v_match.player1_id
                   END;

  SELECT score INTO v_opp_score
  FROM public.h2h_results
  WHERE match_id = p_match_id AND user_id = v_opponent_id;

  v_is_winner := CASE WHEN v_opp_score IS NULL THEN NULL
                      ELSE (v_score > v_opp_score)
                 END;

  -- Mark match finished once both results are recorded
  SELECT COUNT(*) = 2 INTO v_both_done
  FROM public.h2h_results
  WHERE match_id = p_match_id;

  IF v_both_done THEN
    UPDATE public.h2h_matches SET status = 'finished' WHERE id = p_match_id;
  END IF;

  -- After challenger submits during challenger_playing, reveal the challenge
  -- to the opponent by transitioning to direct_pending.
  IF v_match.status = 'challenger_playing' AND v_rows_inserted > 0 THEN
    UPDATE public.h2h_matches SET status = 'direct_pending' WHERE id = p_match_id;
  END IF;

  RETURN jsonb_build_object(
    'score',     v_score,
    'max_score', v_max_score,
    'is_winner', v_is_winner
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verify_and_save_duel_result(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_and_save_duel_result(uuid, jsonb) TO authenticated;


-- ── 4. get_my_direct_challenges ──────────────────────────────────
--
-- Excludes challenger_playing matches from the invited player's view —
-- the opponent should not see a challenge until the challenger submits.
-- The challenger can still see their own challenger_playing match (to
-- resume if they close the browser mid-game).
-- ================================================================
CREATE OR REPLACE FUNCTION public.get_my_direct_challenges()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = 'P0001';
  END IF;

  WITH base AS (
    SELECT
      m.id,
      m.category,
      m.duel_mode,
      m.seed,
      m.status,
      m.invite_expires_at,
      m.direct_abandon_reason,
      m.created_at,
      m.started_at,
      m.timeout_at,
      m.player1_id,
      m.invited_player_id,
      CASE WHEN m.player1_id = v_caller
           THEN 'challenger' ELSE 'challenged' END                              AS my_role,
      CASE WHEN m.player1_id = v_caller
           THEN u_chal.username  ELSE u_chlr.username  END                     AS opponent_username,
      CASE WHEN m.player1_id = v_caller
           THEN u_chal.avatar_url ELSE u_chlr.avatar_url END                   AS opponent_avatar_url,
      EXISTS (
        SELECT 1 FROM public.h2h_results r
         WHERE r.match_id = m.id AND r.user_id = m.player1_id
      )                                                                         AS challenger_played
    FROM public.h2h_matches m
    LEFT JOIN public.users u_chlr ON u_chlr.id = m.player1_id
    LEFT JOIN public.users u_chal  ON u_chal.id  = m.invited_player_id
    WHERE m.match_type = 'direct'
      AND (m.player1_id = v_caller OR m.invited_player_id = v_caller)
      -- Opponent cannot see challenger_playing matches: challenger hasn't submitted yet.
      -- Challenger can still see their own match (player1_id = v_caller).
      AND NOT (m.status = 'challenger_playing' AND m.invited_player_id = v_caller)
    ORDER BY m.created_at DESC
    LIMIT 50
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'match_id',              b.id,
      'category',              b.category,
      'duel_mode',             b.duel_mode,
      'seed',                  b.seed,
      'match_status',          b.status,
      'invite_expires_at',     b.invite_expires_at,
      'direct_abandon_reason', b.direct_abandon_reason,
      'created_at',            b.created_at,
      'started_at',            b.started_at,
      'timeout_at',            b.timeout_at,
      'my_role',               b.my_role,
      'opponent_username',     b.opponent_username,
      'opponent_avatar_url',   b.opponent_avatar_url,
      'challenger_played',     b.challenger_played,
      'my_score', (
        SELECT res.score FROM public.h2h_results res
         WHERE res.match_id = b.id AND res.user_id = v_caller
      ),
      'my_max_score', (
        SELECT res.max_score FROM public.h2h_results res
         WHERE res.match_id = b.id AND res.user_id = v_caller
      ),
      'opponent_score', CASE WHEN b.status = 'finished' THEN (
        SELECT res.score FROM public.h2h_results res
         WHERE res.match_id = b.id
           AND res.user_id = CASE
             WHEN b.player1_id = v_caller THEN b.invited_player_id
             ELSE b.player1_id
           END
      ) ELSE NULL END,
      'opponent_max_score', CASE WHEN b.status = 'finished' THEN (
        SELECT res.max_score FROM public.h2h_results res
         WHERE res.match_id = b.id
           AND res.user_id = CASE
             WHEN b.player1_id = v_caller THEN b.invited_player_id
             ELSE b.player1_id
           END
      ) ELSE NULL END
    )
  ) INTO v_result
  FROM base b;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

REVOKE ALL  ON FUNCTION public.get_my_direct_challenges() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_direct_challenges() TO authenticated;


-- ── 5. cleanup_stale_duel_matches ────────────────────────────────
--
-- Added Rule 5: abandon challenger_playing matches past timeout_at.
-- These are matches where the challenger started but never submitted
-- (closed browser, abandoned mid-game, etc.).
-- Rule 2 continues to handle active direct matches where the challenged
-- player accepted but timed out mid-game.
-- Rule 4 continues to handle direct_pending matches past invite_expires_at.
-- ================================================================
CREATE OR REPLACE FUNCTION public.cleanup_stale_duel_matches()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_waiting_count  int := 0;
  v_zombie_count   int := 0;
  v_lobby_count    int := 0;
  v_expired_count  int := 0;
  v_draft_count    int := 0;
BEGIN
  -- Rule 1: abandon private waiting rooms older than 30 minutes
  UPDATE public.h2h_matches
     SET status = 'abandoned'
   WHERE status     = 'waiting'
     AND match_type = 'private'
     AND created_at < NOW() - INTERVAL '30 minutes';

  GET DIAGNOSTICS v_waiting_count = ROW_COUNT;

  -- Rule 2: abandon active matches past timeout with fewer than 2 results
  UPDATE public.h2h_matches
     SET status = 'abandoned'
   WHERE status    = 'active'
     AND timeout_at IS NOT NULL
     AND timeout_at < NOW()
     AND (
       SELECT COUNT(*)
         FROM public.h2h_results r
        WHERE r.match_id = public.h2h_matches.id
     ) < 2;

  GET DIAGNOSTICS v_zombie_count = ROW_COUNT;

  -- Rule 3: abandon quick match category lobbies past deadline + 30 s
  UPDATE public.h2h_matches
     SET status = 'abandoned'
   WHERE status           = 'category_select'
     AND match_type       = 'quick'
     AND category_deadline < NOW() - INTERVAL '30 seconds';

  GET DIAGNOSTICS v_lobby_count = ROW_COUNT;

  -- Also expire stale queue entries that slipped through
  UPDATE public.quick_match_queue
     SET status = 'expired'
   WHERE status    = 'waiting'
     AND expires_at < NOW();

  -- Rule 4: expire direct_pending challenges past their invite window
  UPDATE public.h2h_matches
     SET status                = 'abandoned',
         direct_abandon_reason = 'expired'
   WHERE match_type        = 'direct'
     AND status            = 'direct_pending'
     AND invite_expires_at < NOW();

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  -- Rule 5: abandon challenger_playing matches past their game timeout.
  -- Challenger started but never submitted (closed browser / abandoned).
  UPDATE public.h2h_matches
     SET status = 'abandoned'
   WHERE match_type = 'direct'
     AND status     = 'challenger_playing'
     AND timeout_at IS NOT NULL
     AND timeout_at < NOW();

  GET DIAGNOSTICS v_draft_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'waiting_abandoned',     v_waiting_count,
    'zombie_abandoned',      v_zombie_count,
    'lobby_abandoned',       v_lobby_count,
    'direct_expired',        v_expired_count,
    'challenger_abandoned',  v_draft_count,
    'ran_at',                NOW()
  );
END;
$$;

-- Not callable by end users — service_role / pg_cron only
REVOKE ALL ON FUNCTION public.cleanup_stale_duel_matches() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_stale_duel_matches() FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.cleanup_stale_duel_matches() TO service_role;
