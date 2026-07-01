-- ================================================================
-- Direct Player Challenges — RPCs
-- 2026-06-26
--
-- CHANGES TO EXISTING FUNCTIONS (surgical):
--
--   verify_and_save_duel_result
--     One change: the status check (previously a single IF != 'active')
--     gains an ELSIF branch for 'direct_pending' that allows the
--     challenger (player1) to submit while their opponent has not
--     yet accepted.  All other logic is byte-for-byte identical to
--     the version in 20260609000002_duel_mode.sql.
--
--   cleanup_stale_duel_matches
--     One addition: Rule 3 abandons direct_pending challenges that
--     have passed invite_expires_at.  Rules 1 and 2 are untouched.
--
-- NEW FUNCTIONS:
--
--   send_direct_challenge      — creates challenge via create_duel_match
--   accept_direct_challenge    — direct_pending → active
--   decline_direct_challenge   — direct_pending → abandoned (declined)
--   get_my_direct_challenges   — enriched challenge list for history UI
--   get_pending_challenge_count — integer count for notification bell
-- ================================================================


-- ================================================================
-- MODIFIED: verify_and_save_duel_result
--
-- Diff from 20260609000002_duel_mode.sql:
--   Lines 197-199  (the status check block)  →  lines marked ★ below.
--   Everything else is identical.
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
  -- For direct_pending matches player2_id IS NULL, so the second
  -- condition evaluates to (NULL != v_caller) = NULL, making the
  -- whole AND expression false — player1 passes through unchanged.
  IF v_match.player1_id != v_caller AND v_match.player2_id != v_caller THEN
    RAISE EXCEPTION 'User does not belong to this match' USING errcode = 'P0004';
  END IF;

  -- ★ CHANGED: allow direct_pending for the challenger (player1) only.
  -- All other callers still require status = 'active'.
  -- After player1 submits during direct_pending, COUNT(*) = 1 < 2
  -- so v_both_done stays false and status remains direct_pending —
  -- it only transitions to 'finished' when the challenged player
  -- later submits during the active phase.
  IF v_match.status = 'direct_pending' THEN
    IF v_match.match_type != 'direct' OR v_match.player1_id != v_caller THEN
      RAISE EXCEPTION 'Only the challenger can submit to a pending direct challenge' USING errcode = 'P0005';
    END IF;
  ELSIF v_match.status != 'active' THEN
    RAISE EXCEPTION 'Match is not active (status: %)', v_match.status USING errcode = 'P0005';
  END IF;
  -- ★ END CHANGE

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
  -- During direct_pending, player2_id IS NULL so v_opponent_id = NULL,
  -- the score lookup returns no rows, and v_is_winner = NULL.
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

  RETURN jsonb_build_object(
    'score',     v_score,
    'max_score', v_max_score,
    'is_winner', v_is_winner
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verify_and_save_duel_result(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_and_save_duel_result(uuid, jsonb) TO authenticated;


-- ================================================================
-- MODIFIED: cleanup_stale_duel_matches
--
-- Base: 20260611000001_quick_match_phase1.sql (the most recent prior
-- version, which already extended the original 2-rule version with
-- a quick-match category lobby rule and queue entry expiry).
--
-- Diff from 20260611000001_quick_match_phase1.sql:
--   Added: DECLARE v_expired_count int := 0;
--   Added: Rule 4 UPDATE block (marked ★ below)
--   Added: 'direct_expired' field in RETURN
--   Rules 1, 2, 3 and queue expiry are byte-for-byte identical.
-- ================================================================
CREATE OR REPLACE FUNCTION public.cleanup_stale_duel_matches()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_waiting_count int := 0;
  v_zombie_count  int := 0;
  v_lobby_count   int := 0;
  v_expired_count int := 0; -- ★ ADDED
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

  -- ★ ADDED — Rule 4: Expire direct challenges past their invite window.
  -- Covers both: challenger played but opponent never accepted, and
  -- challenger never played (rare edge case).
  -- Rule 2 continues to handle active direct matches where the
  -- challenged player accepted but timed out mid-game.
  UPDATE public.h2h_matches
     SET status                = 'abandoned',
         direct_abandon_reason = 'expired'
   WHERE match_type        = 'direct'
     AND status            = 'direct_pending'
     AND invite_expires_at < NOW();

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  -- ★ END ADDITION

  RETURN jsonb_build_object(
    'waiting_abandoned', v_waiting_count,
    'zombie_abandoned',  v_zombie_count,
    'lobby_abandoned',   v_lobby_count,
    'direct_expired',    v_expired_count, -- ★ ADDED
    'ran_at',            NOW()
  );
END;
$$;

-- Not callable by end users — service_role / pg_cron only
REVOKE ALL ON FUNCTION public.cleanup_stale_duel_matches() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_stale_duel_matches() FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.cleanup_stale_duel_matches() TO service_role;


-- ================================================================
-- NEW: send_direct_challenge
--
-- Creates a direct challenge by delegating to create_duel_match for
-- category validation, tier enforcement, and the combined 20/hour
-- rate limit, then converting the returned match to direct_pending.
-- Both steps run in the same transaction — the intermediate
-- 'waiting'/'private' state is never visible to concurrent readers.
--
-- Additional direct-challenge-specific guards applied before calling
-- create_duel_match:
--   • no self-challenge
--   • target player exists
--   • no duplicate pending challenge in either direction
--   • 10 direct challenges per hour (stricter than the shared 20/hr)
--
-- Returns the parameters the challenger's game page needs.
-- challenger_game_start is the server clock at creation time and is
-- used only for the challenger's browser timer — it is NOT stored in
-- the DB (started_at remains NULL until the challenged player accepts).
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

  -- No existing pending challenge: caller → target
  IF EXISTS (
    SELECT 1 FROM public.h2h_matches
     WHERE player1_id        = v_caller
       AND invited_player_id = p_challenged_user_id
       AND match_type        = 'direct'
       AND status            = 'direct_pending'
  ) THEN
    RAISE EXCEPTION 'You already have a pending challenge with this player'
      USING errcode = 'P0005';
  END IF;

  -- No cross-challenge: target → caller already pending
  IF EXISTS (
    SELECT 1 FROM public.h2h_matches
     WHERE player1_id        = p_challenged_user_id
       AND invited_player_id = v_caller
       AND match_type        = 'direct'
       AND status            = 'direct_pending'
  ) THEN
    RAISE EXCEPTION 'This player has already sent you a pending challenge'
      USING errcode = 'P0006';
  END IF;

  -- Delegate to create_duel_match for category validation, tier check,
  -- seed storage, and the combined 20/hr rate limit.
  v_seed       := floor(random() * 2147483647)::bigint;
  v_cdm_result := public.create_duel_match(p_category, v_seed, p_duel_mode);
  v_match_id   := (v_cdm_result->>'id')::uuid;

  -- Convert from private/waiting to direct/direct_pending in the same transaction
  v_now := clock_timestamp();
  UPDATE public.h2h_matches
     SET status            = 'direct_pending',
         match_type        = 'direct',
         invited_player_id = p_challenged_user_id,
         invite_expires_at = v_now + INTERVAL '24 hours'
   WHERE id = v_match_id;

  RETURN jsonb_build_object(
    'match_id',              v_match_id,
    'seed',                  v_seed,
    'category',              p_category,
    'duel_mode',             p_duel_mode,
    'challenger_game_start', v_now
  );
END;
$$;

REVOKE ALL  ON FUNCTION public.send_direct_challenge(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_direct_challenge(uuid, text, text) TO authenticated;


-- ================================================================
-- NEW: accept_direct_challenge
--
-- Challenged player accepts the invite.
-- Transitions: direct_pending → active
-- Sets player2_id, started_at, timeout_at (standard 5-minute window).
-- Idempotent: if already accepted by the same caller, returns the
-- existing timestamps without modifying the row.
-- ================================================================
CREATE OR REPLACE FUNCTION public.accept_direct_challenge(
  p_match_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller     uuid := auth.uid();
  v_match      h2h_matches%rowtype;
  v_started_at timestamptz;
  v_timeout_at timestamptz;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = 'P0001';
  END IF;

  SELECT * INTO v_match
  FROM public.h2h_matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found' USING errcode = 'P0002';
  END IF;

  IF v_match.match_type != 'direct' THEN
    RAISE EXCEPTION 'Not a direct challenge' USING errcode = 'P0003';
  END IF;

  IF v_match.invited_player_id != v_caller THEN
    RAISE EXCEPTION 'You are not the challenged player' USING errcode = 'P0004';
  END IF;

  -- Idempotent: caller already accepted this challenge
  IF v_match.status = 'active' AND v_match.player2_id = v_caller THEN
    RETURN jsonb_build_object(
      'match_id',        v_match.id,
      'seed',            v_match.seed,
      'category',        v_match.category,
      'duel_mode',       v_match.duel_mode,
      'game_started_at', v_match.started_at,
      'already_accepted', true
    );
  END IF;

  IF v_match.status != 'direct_pending' THEN
    RAISE EXCEPTION 'Challenge is no longer available (status: %)', v_match.status
      USING errcode = 'P0005';
  END IF;

  IF v_match.invite_expires_at < NOW() THEN
    RAISE EXCEPTION 'This challenge has expired'
      USING errcode = 'P0006';
  END IF;

  v_started_at := clock_timestamp();
  v_timeout_at := v_started_at + INTERVAL '5 minutes';

  UPDATE public.h2h_matches
     SET status     = 'active',
         player2_id = v_caller,
         started_at = v_started_at,
         timeout_at = v_timeout_at
   WHERE id = p_match_id;

  RETURN jsonb_build_object(
    'match_id',        v_match.id,
    'seed',            v_match.seed,
    'category',        v_match.category,
    'duel_mode',       v_match.duel_mode,
    'game_started_at', v_started_at,
    'already_accepted', false
  );
END;
$$;

REVOKE ALL  ON FUNCTION public.accept_direct_challenge(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_direct_challenge(uuid) TO authenticated;


-- ================================================================
-- NEW: decline_direct_challenge
--
-- Challenged player declines the invite before it expires.
-- Transitions: direct_pending → abandoned (direct_abandon_reason = 'declined')
-- ================================================================
CREATE OR REPLACE FUNCTION public.decline_direct_challenge(
  p_match_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_match  h2h_matches%rowtype;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = 'P0001';
  END IF;

  SELECT * INTO v_match
  FROM public.h2h_matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found' USING errcode = 'P0002';
  END IF;

  IF v_match.match_type != 'direct' THEN
    RAISE EXCEPTION 'Not a direct challenge' USING errcode = 'P0003';
  END IF;

  IF v_match.invited_player_id != v_caller THEN
    RAISE EXCEPTION 'You are not the challenged player' USING errcode = 'P0004';
  END IF;

  IF v_match.status != 'direct_pending' THEN
    RAISE EXCEPTION 'Challenge cannot be declined (status: %)', v_match.status
      USING errcode = 'P0005';
  END IF;

  UPDATE public.h2h_matches
     SET status                = 'abandoned',
         direct_abandon_reason = 'declined'
   WHERE id = p_match_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL  ON FUNCTION public.decline_direct_challenge(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decline_direct_challenge(uuid) TO authenticated;


-- ================================================================
-- NEW: get_my_direct_challenges
--
-- Returns the caller's full challenge list (as challenger and as
-- challenged player), enriched with opponent usernames and scores.
--
-- Score secrecy is enforced manually (this is SECURITY DEFINER, so
-- RLS is bypassed): opponent scores are only included when status is
-- 'finished' or 'abandoned'.  Own score is always included (it is
-- the caller's own data).
--
-- Returns: jsonb array ordered newest-first, capped at 50 rows.
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


-- ================================================================
-- NEW: get_pending_challenge_count
--
-- Returns the count of unexpired direct challenges directed at the
-- caller that are still in direct_pending (awaiting acceptance).
-- Used by the notification bell and homepage banner.
-- Returns { count: N } — always succeeds, returns 0 if unauthenticated.
-- ================================================================
CREATE OR REPLACE FUNCTION public.get_pending_challenge_count()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_count  int  := 0;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('count', 0);
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.h2h_matches
  WHERE match_type        = 'direct'
    AND status            = 'direct_pending'
    AND invited_player_id = v_caller
    AND invite_expires_at > NOW();

  RETURN jsonb_build_object('count', v_count);
END;
$$;

REVOKE ALL  ON FUNCTION public.get_pending_challenge_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pending_challenge_count() TO authenticated;
