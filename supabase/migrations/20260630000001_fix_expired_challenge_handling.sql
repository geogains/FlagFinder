-- ================================================================
-- Fix: expired challenges blocking new challenges and showing action buttons
--
-- Problems fixed:
--
-- 1. send_direct_challenge — duplicate check blocked new challenges even when
--    the existing row was past its timeout_at / invite_expires_at.
--    Fix: only block if the row is within its live window.
--
-- 2. get_my_direct_challenges — returned raw DB status, so challenges that
--    were past their expiry timestamps but not yet cleaned up still showed
--    "YOUR TURN", "WAITING", "IN PROGRESS" etc. with action buttons.
--    Fix: compute effective_status and effective_abandon_reason based on
--    current timestamps, without modifying the DB.
--
-- 3. cleanup_stale_duel_matches — Rule 5 set status = 'abandoned' for timed-out
--    challenger_playing matches but did not set direct_abandon_reason = 'expired'.
--    This caused the frontend to show the generic "ABANDONED" badge after cleanup.
--    Rule 2 had the same problem for timed-out active direct-challenge matches.
--    Fix: set direct_abandon_reason = 'expired' in both rules.
--
-- Functions changed (full replacements):
--   1. send_direct_challenge
--   2. get_my_direct_challenges
--   3. cleanup_stale_duel_matches
-- ================================================================


-- ── 1. send_direct_challenge ──────────────────────────────────────
--
-- Duplicate check now ignores rows that are past their expiry window:
--   - challenger_playing: ignore if timeout_at is in the past
--   - direct_pending:     ignore if invite_expires_at is in the past
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

  -- Block only LIVE (non-expired) pending challenges in either direction.
  -- A challenger_playing row past its timeout_at is effectively stale
  -- (cleanup may not have run yet), so it must not block a new challenge.
  -- Similarly, a direct_pending row past invite_expires_at is expired.
  IF EXISTS (
    SELECT 1 FROM public.h2h_matches
     WHERE player1_id        = v_caller
       AND invited_player_id = p_challenged_user_id
       AND match_type        = 'direct'
       AND (
         (status = 'challenger_playing' AND (timeout_at        IS NULL OR timeout_at        > NOW()))
         OR
         (status = 'direct_pending'     AND (invite_expires_at IS NULL OR invite_expires_at > NOW()))
       )
  ) THEN
    RAISE EXCEPTION 'You already have a pending challenge with this player'
      USING errcode = 'P0005';
  END IF;

  -- Cross-challenge check: same expiry-aware logic for the reverse direction.
  IF EXISTS (
    SELECT 1 FROM public.h2h_matches
     WHERE player1_id        = p_challenged_user_id
       AND invited_player_id = v_caller
       AND match_type        = 'direct'
       AND (
         (status = 'challenger_playing' AND (timeout_at        IS NULL OR timeout_at        > NOW()))
         OR
         (status = 'direct_pending'     AND (invite_expires_at IS NULL OR invite_expires_at > NOW()))
       )
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


-- ── 2. get_my_direct_challenges ───────────────────────────────────
--
-- Computes effective_status and effective_abandon_reason based on
-- current timestamps, without writing to the DB. This means expired
-- challenges are returned as 'abandoned'/'expired' to the frontend
-- even before the cleanup cron has processed them.
--
-- Expiry conditions:
--   challenger_playing + timeout_at        < NOW() → abandoned/expired
--   direct_pending     + invite_expires_at < NOW() → abandoned/expired
--   active             + timeout_at        < NOW() → abandoned/expired
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
      -- Effective status: override stale active rows to 'abandoned' without
      -- writing to the DB (cleanup cron may not have fired yet).
      CASE
        WHEN m.status = 'challenger_playing'
             AND m.timeout_at IS NOT NULL AND m.timeout_at < NOW()              THEN 'abandoned'
        WHEN m.status = 'direct_pending'
             AND m.invite_expires_at IS NOT NULL AND m.invite_expires_at < NOW() THEN 'abandoned'
        WHEN m.status = 'active'
             AND m.timeout_at IS NOT NULL AND m.timeout_at < NOW()              THEN 'abandoned'
        ELSE m.status
      END                                                                           AS effective_status,
      m.invite_expires_at,
      -- Effective abandon reason: if an active/pending row is past its window,
      -- treat it as 'expired' even if direct_abandon_reason is not yet set.
      CASE
        WHEN m.status IN ('challenger_playing', 'direct_pending', 'active')
             AND (
               (m.timeout_at        IS NOT NULL AND m.timeout_at        < NOW())
               OR
               (m.invite_expires_at IS NOT NULL AND m.invite_expires_at < NOW())
             )                                                                   THEN 'expired'
        ELSE m.direct_abandon_reason
      END                                                                           AS effective_abandon_reason,
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
      'match_status',          b.effective_status,
      'invite_expires_at',     b.invite_expires_at,
      'direct_abandon_reason', b.effective_abandon_reason,
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
      'opponent_score', CASE WHEN b.effective_status = 'finished' THEN (
        SELECT res.score FROM public.h2h_results res
         WHERE res.match_id = b.id
           AND res.user_id = CASE
             WHEN b.player1_id = v_caller THEN b.invited_player_id
             ELSE b.player1_id
           END
      ) ELSE NULL END,
      'opponent_max_score', CASE WHEN b.effective_status = 'finished' THEN (
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


-- ── 3. cleanup_stale_duel_matches ────────────────────────────────
--
-- Rule 2: now sets direct_abandon_reason = 'expired' for direct matches
--   so abandoned direct challenges show the EXPIRED badge, not ABANDONED.
-- Rule 5: now sets direct_abandon_reason = 'expired' for timed-out
--   challenger_playing matches (same reason).
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

  -- Rule 2: abandon active matches past timeout with fewer than 2 results.
  -- For direct-challenge matches, also record the abandon reason as 'expired'
  -- so the frontend can show the EXPIRED badge instead of the generic ABANDONED.
  UPDATE public.h2h_matches
     SET status                = 'abandoned',
         direct_abandon_reason = CASE WHEN match_type = 'direct' THEN 'expired'
                                      ELSE direct_abandon_reason END
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
  -- Record direct_abandon_reason = 'expired' so the EXPIRED badge is shown.
  UPDATE public.h2h_matches
     SET status                = 'abandoned',
         direct_abandon_reason = 'expired'
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
