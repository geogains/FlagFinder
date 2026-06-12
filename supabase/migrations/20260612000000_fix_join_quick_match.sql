-- ================================================================
-- Quick Match: advisory-lock matching + poll_quick_match_queue RPC
-- 2026-06-12
--
-- Architecture
-- ------------
-- The client calls join_quick_match() ONCE per search attempt.
-- While waiting it polls via poll_quick_match_queue(queue_id) —
-- a lightweight read RPC that never creates queue rows.
--
-- Race-condition fix (server-side)
-- ---------------------------------
-- When two users click "Find Match" within the same ~10 ms window,
-- both transactions execute the opponent scan before either has
-- committed a waiting row, so both fall through to insert and get
-- stuck waiting forever.
--
-- Fix: pg_advisory_xact_lock('qmq_match:<mode>') is acquired
-- immediately before the opponent scan in BOTH join_quick_match AND
-- poll_quick_match_queue.  This serialises every matching attempt:
-- the second caller always sees the first caller's committed waiting
-- row and matches them immediately.
--
--  join_quick_match   — blocking lock  (pg_advisory_xact_lock)
--  poll_quick_match_queue — non-blocking (pg_try_advisory_xact_lock)
--    if the lock is held by another call, poll returns 'waiting'
--    and retries on the next tick.
--
-- Stale-entry fixes (also included)
-- -----------------------------------
-- Step 2: only resumes a matched entry if the referenced match is
--   still in progress (category_select / active).
-- Step 3: also cancels 'matched' entries pointing to terminal matches.
--
-- FUNCTIONS CHANGED
--   join_quick_match(p_mode)          — advisory lock + stale fixes
-- FUNCTIONS ADDED
--   qmq_advisory_lock_key(p_mode)     — shared advisory lock key helper
--   poll_quick_match_queue(p_queue_id)
-- ================================================================


-- ── 1. Shared advisory lock key ──────────────────────────────────────────
-- Single source of truth for the advisory lock namespace used by both
-- join_quick_match and poll_quick_match_queue.  If the key formula ever
-- needs to change it only changes here.
CREATE OR REPLACE FUNCTION public.qmq_advisory_lock_key(p_mode text)
RETURNS bigint
LANGUAGE sql
IMMUTABLE PARALLEL SAFE
AS $$
  SELECT hashtext('qmq_match:' || p_mode)::bigint
$$;

-- Not intended for direct client use — callers are SECURITY DEFINER RPCs.
REVOKE ALL ON FUNCTION public.qmq_advisory_lock_key(text) FROM PUBLIC;


-- ── 2. Updated join_quick_match ───────────────────────────────────────────
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

  IF p_mode NOT IN ('classic') THEN
    RAISE EXCEPTION 'Unknown quick match mode: %', p_mode USING errcode = 'P0002';
  END IF;

  -- Step 1: expire stale waiting entries globally
  UPDATE public.quick_match_queue
     SET status = 'expired'
   WHERE status    = 'waiting'
     AND expires_at < now();

  -- Step 2: resume an in-progress match if we are already matched.
  -- Only applies to category_select / active — finished / abandoned
  -- matches must not block a new search.
  SELECT q.id, q.match_id
    INTO v_queue_id, v_match_id
    FROM public.quick_match_queue q
    JOIN public.h2h_matches m ON m.id = q.match_id
   WHERE q.user_id  = v_caller
     AND q.status   = 'matched'
     AND m.status  IN ('category_select', 'active')
   ORDER BY q.created_at DESC
   LIMIT 1;

  IF v_match_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status',   'matched',
      'match_id', v_match_id,
      'queue_id', v_queue_id
    );
  END IF;

  -- Step 3: cancel caller's stale entries before creating a new one.
  -- Cleans up: (a) any waiting rows, (b) matched rows whose match is
  -- already finished / abandoned.
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
              AND m.status IN ('finished', 'abandoned')
         )
       )
     );

  -- Step 4: serialise the opponent scan across all concurrent
  -- join_quick_match and poll_quick_match_queue calls.
  --
  -- pg_advisory_xact_lock BLOCKS until the lock is free.  If User B
  -- calls join_quick_match while User A is mid-transaction, B waits
  -- here.  When A commits (inserting a waiting row), B resumes and
  -- sees A's row in Step 5 — eliminating the simultaneous-insert race.
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
      'classic',
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


-- ── 2. New: poll_quick_match_queue ────────────────────────────────────────
-- Called by the frontend on every poll tick while searching.
-- Reads the caller's queue row and returns its current status.
-- If the row is still 'waiting', attempts a matching under the same
-- advisory lock used by join_quick_match (non-blocking: if the lock
-- is busy the call returns 'waiting' immediately and the client
-- retries on the next tick).
-- Never inserts new queue rows.
CREATE OR REPLACE FUNCTION public.poll_quick_match_queue(
  p_queue_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller       uuid := auth.uid();
  v_status       text;
  v_match_id     uuid;
  v_mode         text;
  v_expires_at   timestamptz;
  v_match_status text;
  v_opp_queue_id uuid;
  v_opp_user_id  uuid;
  v_new_match_id uuid;
  v_seed         bigint;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = 'P0001';
  END IF;

  -- Read own queue entry without locking so join_quick_match can still
  -- claim us (a FOR UPDATE here would cause join's SKIP LOCKED to skip us).
  SELECT q.status, q.match_id, q.mode, q.expires_at
    INTO v_status, v_match_id, v_mode, v_expires_at
    FROM public.quick_match_queue q
   WHERE q.id = p_queue_id AND q.user_id = v_caller;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  -- Already matched: verify the referenced match is still in progress
  IF v_status = 'matched' AND v_match_id IS NOT NULL THEN
    SELECT m.status INTO v_match_status
      FROM public.h2h_matches m
     WHERE m.id = v_match_id;

    IF v_match_status IN ('category_select', 'active') THEN
      RETURN jsonb_build_object('status', 'matched', 'match_id', v_match_id);
    ELSE
      -- Terminal match: mark entry cancelled so the client can show retry
      UPDATE public.quick_match_queue
         SET status = 'cancelled'
       WHERE id = p_queue_id;
      RETURN jsonb_build_object('status', 'cancelled');
    END IF;
  END IF;

  -- Terminal statuses — nothing more to do
  IF v_status IN ('cancelled', 'expired') THEN
    RETURN jsonb_build_object('status', v_status);
  END IF;

  -- Server-side expiry check
  IF v_expires_at < now() THEN
    UPDATE public.quick_match_queue
       SET status = 'expired'
     WHERE id = p_queue_id;
    RETURN jsonb_build_object('status', 'expired');
  END IF;

  -- Still waiting.  Try to acquire the matching advisory lock and pair
  -- with a waiting opponent.  Non-blocking: if join_quick_match or
  -- another poll call holds the lock, skip the matching attempt and
  -- return 'waiting'.  The next poll tick will retry.
  IF pg_try_advisory_xact_lock(public.qmq_advisory_lock_key(v_mode)) THEN

    -- Re-read own entry (with row lock for the upcoming UPDATE) to catch
    -- the case where join_quick_match matched us while we were waiting
    -- for the advisory lock.
    SELECT q.status, q.match_id
      INTO v_status, v_match_id
      FROM public.quick_match_queue q
     WHERE q.id = p_queue_id
     FOR UPDATE;

    IF v_status = 'matched' THEN
      RETURN jsonb_build_object('status', 'matched', 'match_id', v_match_id);
    END IF;

    IF v_status != 'waiting' THEN
      RETURN jsonb_build_object('status', v_status);
    END IF;

    -- Scan for a waiting opponent
    SELECT id, user_id
      INTO v_opp_queue_id, v_opp_user_id
      FROM public.quick_match_queue
     WHERE status    = 'waiting'
       AND mode      = v_mode
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
        'classic',
        now() + interval '25 seconds'
      )
      RETURNING id INTO v_new_match_id;

      UPDATE public.quick_match_queue
         SET status   = 'matched',
             match_id = v_new_match_id
       WHERE id = v_opp_queue_id;

      -- own row already locked above
      UPDATE public.quick_match_queue
         SET status   = 'matched',
             match_id = v_new_match_id
       WHERE id = p_queue_id;

      RETURN jsonb_build_object('status', 'matched', 'match_id', v_new_match_id);
    END IF;

  END IF; -- advisory lock

  RETURN jsonb_build_object('status', 'waiting');
END;
$$;

REVOKE ALL ON FUNCTION public.poll_quick_match_queue(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.poll_quick_match_queue(uuid) TO authenticated;
