-- ================================================================
-- Quick Match: fix cross-mode queue-entry resume
-- 2026-06-13
--
-- Bug
-- ---
-- join_quick_match Step 2 resumed ANY matched queue entry for the
-- caller regardless of mode.  A user with an active Classic match
-- who then searched for Versus was returned the Classic match_id,
-- leading to cross-mode routing.
--
-- poll_quick_match_queue's matched-entry branch similarly did not
-- verify that the referenced h2h_matches row has the same duel_mode
-- as the queue entry's own mode.
--
-- Fix
-- ---
-- join_quick_match  : add AND q.mode = p_mode to Step 2 query.
-- poll_quick_match_queue : add AND m.duel_mode = v_mode to the
--   matched-branch SELECT so a mode-mismatched match is treated as
--   terminal (queue entry cancelled) instead of returned.
--
-- Everything else is identical to 20260612000001_quick_match_vs.sql.
-- ================================================================


-- ── 1. join_quick_match ──────────────────────────────────────────────────
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

  IF p_mode NOT IN ('classic', 'vs') THEN
    RAISE EXCEPTION 'Unknown quick match mode: %', p_mode USING errcode = 'P0002';
  END IF;

  -- Step 1: expire stale waiting entries globally
  UPDATE public.quick_match_queue
     SET status = 'expired'
   WHERE status    = 'waiting'
     AND expires_at < now();

  -- Step 2: resume an in-progress match if we are already matched FOR
  -- THIS MODE.  The mode filter prevents a Classic active match from
  -- being returned when the caller is searching for Versus (and vice versa).
  SELECT q.id, q.match_id
    INTO v_queue_id, v_match_id
    FROM public.quick_match_queue q
    JOIN public.h2h_matches m ON m.id = q.match_id
   WHERE q.user_id  = v_caller
     AND q.status   = 'matched'
     AND q.mode     = p_mode
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


-- ── 2. poll_quick_match_queue ────────────────────────────────────────────
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

  SELECT q.status, q.match_id, q.mode, q.expires_at
    INTO v_status, v_match_id, v_mode, v_expires_at
    FROM public.quick_match_queue q
   WHERE q.id = p_queue_id AND q.user_id = v_caller;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  -- Already matched: verify the referenced match is still in progress
  -- AND has the correct duel_mode for this queue entry's mode.
  -- If the mode doesn't match (data integrity anomaly), treat it as
  -- terminal so the queue entry is cancelled and the caller retries.
  IF v_status = 'matched' AND v_match_id IS NOT NULL THEN
    SELECT m.status INTO v_match_status
      FROM public.h2h_matches m
     WHERE m.id        = v_match_id
       AND m.duel_mode = v_mode;

    IF v_match_status IN ('category_select', 'active') THEN
      RETURN jsonb_build_object('status', 'matched', 'match_id', v_match_id);
    ELSE
      UPDATE public.quick_match_queue
         SET status = 'cancelled'
       WHERE id = p_queue_id;
      RETURN jsonb_build_object('status', 'cancelled');
    END IF;
  END IF;

  IF v_status IN ('cancelled', 'expired') THEN
    RETURN jsonb_build_object('status', v_status);
  END IF;

  IF v_expires_at < now() THEN
    UPDATE public.quick_match_queue
       SET status = 'expired'
     WHERE id = p_queue_id;
    RETURN jsonb_build_object('status', 'expired');
  END IF;

  IF pg_try_advisory_xact_lock(public.qmq_advisory_lock_key(v_mode)) THEN

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
        v_mode,
        now() + interval '25 seconds'
      )
      RETURNING id INTO v_new_match_id;

      UPDATE public.quick_match_queue
         SET status   = 'matched',
             match_id = v_new_match_id
       WHERE id = v_opp_queue_id;

      UPDATE public.quick_match_queue
         SET status   = 'matched',
             match_id = v_new_match_id
       WHERE id = p_queue_id;

      RETURN jsonb_build_object('status', 'matched', 'match_id', v_new_match_id);
    END IF;

  END IF;

  RETURN jsonb_build_object('status', 'waiting');
END;
$$;

REVOKE ALL ON FUNCTION public.poll_quick_match_queue(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.poll_quick_match_queue(uuid) TO authenticated;
