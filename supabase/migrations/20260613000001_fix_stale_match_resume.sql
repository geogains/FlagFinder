-- ================================================================
-- Quick Match: stale active match resume fix
-- 2026-06-13
--
-- Root cause
-- ----------
-- join_quick_match Step 2 resumed ANY matched queue entry where
-- the linked match was in ('category_select', 'active') — no
-- freshness check.  A Classic match that ended via the 5-minute
-- game timeout remains in status='active' indefinitely (no result
-- was submitted, so verify_and_save_duel_result never ran).
-- On the user's next search, Step 2 found that stale entry,
-- returned the old match_id, and enterLobby routed directly to
-- the game page, which immediately bounced to results with timeout=1.
--
-- Fix
-- ---
-- 1. join_quick_match Step 1 (cleanup)
--    Proactively mark stale Quick Matches as abandoned so that
--    duelresults.html polling can exit cleanly and the matches
--    can no longer be returned by Step 2.
--    • active matches: abandoned after started_at + 10 minutes.
--    • category_select matches: abandoned 30 s after category_deadline.
--
-- 2. join_quick_match Step 2 (freshness filter)
--    Only resume a matched entry if the linked match is genuinely
--    in-progress:
--    • category_select AND now() < category_deadline
--    • active AND now() < started_at + 10 minutes
--
-- 3. join_quick_match Step 3 (stale-entry cancel)
--    Extend the existing cleanup to also cancel matched queue entries
--    that point to stale (but not yet abandoned) matches, so a second
--    call to join_quick_match does not re-encounter them.
--
-- 4. poll_quick_match_queue (same freshness check)
--    When the polled queue entry is already 'matched', verify the
--    referenced match is still fresh before returning it.
--    Stale → cancel entry and return 'cancelled' so the client retries.
--
-- Classic and Versus Quick Match both use the same 10-minute active
-- window (5-min Classic game + 5-min VS game are both well within it).
-- Mode isolation and all other behaviour are unchanged.
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

  -- Step 1a: expire stale waiting queue entries globally.
  UPDATE public.quick_match_queue
     SET status = 'expired'
   WHERE status    = 'waiting'
     AND expires_at < now();

  -- Step 1b: abandon stale active Quick Matches.
  -- Matches stay 'active' forever when a player times out without
  -- submitting.  Marking them abandoned lets duelresults.html polling
  -- exit and prevents Step 2 from resuming them.
  UPDATE public.h2h_matches
     SET status = 'abandoned'
   WHERE match_type = 'quick'
     AND status     = 'active'
     AND started_at IS NOT NULL
     AND started_at + interval '10 minutes' < now();

  -- Step 1c: abandon Quick Match lobbies that expired without both
  -- players picking a category.
  UPDATE public.h2h_matches
     SET status = 'abandoned'
   WHERE match_type      = 'quick'
     AND status          = 'category_select'
     AND category_deadline + interval '30 seconds' < now();

  -- Step 2: resume a genuinely in-progress match for this mode.
  -- Only resumes if the match is still within its active window:
  --   category_select  → before the category deadline
  --   active           → within 10 minutes of started_at
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

  -- Step 3: cancel caller's stale queue entries before searching.
  -- Covers: (a) waiting rows, (b) matched rows pointing to finished /
  -- abandoned matches, (c) matched rows pointing to matches that have
  -- now passed their freshness window (but Steps 1b/1c may not have
  -- abandoned them yet if they belong to a different mode or caller).
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
  v_caller            uuid := auth.uid();
  v_status            text;
  v_match_id          uuid;
  v_mode              text;
  v_expires_at        timestamptz;
  v_match_status      text;
  v_started_at        timestamptz;
  v_category_deadline timestamptz;
  v_opp_queue_id      uuid;
  v_opp_user_id       uuid;
  v_new_match_id      uuid;
  v_seed              bigint;
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

  -- Already matched: verify the referenced match is still fresh and
  -- has the correct duel_mode for this queue entry's mode.
  -- Stale or mode-mismatched → cancel entry and return 'cancelled'.
  IF v_status = 'matched' AND v_match_id IS NOT NULL THEN
    SELECT m.status, m.started_at, m.category_deadline
      INTO v_match_status, v_started_at, v_category_deadline
      FROM public.h2h_matches m
     WHERE m.id        = v_match_id
       AND m.duel_mode = v_mode;

    IF (v_match_status = 'category_select' AND now() < v_category_deadline)
       OR (v_match_status = 'active'
           AND v_started_at IS NOT NULL
           AND now() < v_started_at + interval '10 minutes')
    THEN
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
