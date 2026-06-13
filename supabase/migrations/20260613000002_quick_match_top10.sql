-- ================================================================
-- Quick Match Phase 3: Top 10 mode support
-- 2026-06-13
--
-- Changes
-- -------
-- 1. quick_match_queue.mode CHECK constraint: add 'top10'.
-- 2. join_quick_match: allow p_mode = 'top10'; propagates to
--    duel_mode in the h2h_matches INSERT via the existing p_mode usage.
--
-- Not changed
-- -----------
-- poll_quick_match_queue  — already fully mode-agnostic (uses v_mode).
-- submit_qm_category_pick — category pool (FREE_QM_CATS) is valid for
--   all three modes; no mode-specific filtering required.
-- Stale-match freshness rules — 10-minute active window covers the
--   2-minute Top 10 game with ample buffer.
--
-- Classic and Versus Quick Match are unaffected.
-- ================================================================


-- ── 1. Update quick_match_queue.mode constraint ──────────────────────────
ALTER TABLE public.quick_match_queue
  DROP CONSTRAINT IF EXISTS quick_match_queue_mode_check;

ALTER TABLE public.quick_match_queue
  ADD CONSTRAINT quick_match_queue_mode_check
  CHECK (mode IN ('classic', 'vs', 'top10'));


-- ── 2. Updated join_quick_match ──────────────────────────────────────────
-- Only change from 20260613000001: p_mode validation now accepts 'top10'.
-- All stale-match cleanup and freshness logic is preserved unchanged.
CREATE OR REPLACE FUNCTION public.join_quick_match(
  p_mode text DEFAULT 'classic'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller       uuid := auth.uid();
  v_queue_id     uuid;
  v_match_id     uuid;
  v_opp_user_id  uuid;
  v_opp_queue_id uuid;
  v_seed         bigint;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = 'P0001';
  END IF;

  IF p_mode NOT IN ('classic', 'vs', 'top10') THEN
    RAISE EXCEPTION 'Unknown quick match mode: %', p_mode USING errcode = 'P0002';
  END IF;

  -- Step 1a: expire stale waiting queue entries globally.
  UPDATE public.quick_match_queue
     SET status = 'expired'
   WHERE status    = 'waiting'
     AND expires_at < now();

  -- Step 1b: abandon stale active Quick Matches.
  UPDATE public.h2h_matches
     SET status = 'abandoned'
   WHERE match_type = 'quick'
     AND status     = 'active'
     AND started_at IS NOT NULL
     AND started_at + interval '10 minutes' < now();

  -- Step 1c: abandon Quick Match lobbies whose deadline has long expired.
  UPDATE public.h2h_matches
     SET status = 'abandoned'
   WHERE match_type      = 'quick'
     AND status          = 'category_select'
     AND category_deadline + interval '30 seconds' < now();

  -- Step 2: resume a genuinely in-progress match for this mode.
  SELECT q.id, q.match_id
    INTO v_queue_id, v_match_id
    FROM public.quick_match_queue q
    JOIN public.h2h_matches m ON m.id = q.match_id
   WHERE q.user_id  = v_caller
     AND q.status   = 'matched'
     AND q.mode     = p_mode
     AND (
       (m.status = 'category_select' AND now() < m.category_deadline)
       OR
       (m.status = 'active'
        AND m.started_at IS NOT NULL
        AND now() < m.started_at + interval '10 minutes')
     )
   ORDER BY q.created_at DESC
   LIMIT 1;

  IF v_match_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status',   'matched',
      'match_id', v_match_id,
      'queue_id', v_queue_id
    );
  END IF;

  -- Step 3: cancel caller's stale queue entries.
  UPDATE public.quick_match_queue q
     SET status = 'cancelled'
   WHERE q.user_id = v_caller
     AND (
       q.status = 'waiting'
       OR (
         q.status = 'matched'
         AND EXISTS (
           SELECT 1 FROM public.h2h_matches m
            WHERE m.id = q.match_id
              AND (
                m.status IN ('finished', 'abandoned')
                OR (m.status = 'category_select' AND now() >= m.category_deadline)
                OR (m.status = 'active'
                    AND (m.started_at IS NULL
                         OR now() >= m.started_at + interval '10 minutes'))
              )
         )
       )
     );

  -- Step 4: serialise the opponent scan for this mode
  PERFORM pg_advisory_xact_lock(public.qmq_advisory_lock_key(p_mode));

  -- Step 5: claim a waiting opponent atomically
  SELECT id, user_id
    INTO v_opp_queue_id, v_opp_user_id
    FROM public.quick_match_queue
   WHERE status    = 'waiting'
     AND mode      = p_mode
     AND user_id  != v_caller
     AND expires_at > now()
   ORDER BY created_at ASC
   LIMIT 1
   FOR UPDATE SKIP LOCKED;

  IF v_opp_user_id IS NOT NULL THEN
    v_seed := floor(random() * 2147483647)::bigint;

    INSERT INTO public.h2h_matches (
      category, seed,
      player1_id, player2_id,
      status, match_type,
      duel_mode, category_deadline
    ) VALUES (
      NULL, v_seed,
      v_opp_user_id, v_caller,
      'category_select', 'quick',
      p_mode,
      now() + interval '25 seconds'
    )
    RETURNING id INTO v_match_id;

    UPDATE public.quick_match_queue
       SET status   = 'matched',
           match_id = v_match_id
     WHERE id = v_opp_queue_id;

    INSERT INTO public.quick_match_queue (user_id, mode, status, match_id)
    VALUES (v_caller, p_mode, 'matched', v_match_id)
    RETURNING id INTO v_queue_id;

    RETURN jsonb_build_object(
      'status',   'matched',
      'match_id', v_match_id,
      'queue_id', v_queue_id
    );
  END IF;

  -- Step 6: no opponent found — insert waiting entry
  INSERT INTO public.quick_match_queue (user_id, mode, status)
  VALUES (v_caller, p_mode, 'waiting')
  RETURNING id INTO v_queue_id;

  RETURN jsonb_build_object(
    'status',   'waiting',
    'queue_id', v_queue_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.join_quick_match(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.join_quick_match(text) TO authenticated;
