-- ================================================================
-- Quick Match Phase 1: Classic mode matchmaking + category lobby
-- 2026-06-11
--
-- OVERVIEW
-- --------
-- Adds the full data-layer for public Quick Match matchmaking.
-- Classic mode only in Phase 1; Top 10 and VS are structural
-- stubs — the mode CHECK constraints accepts those strings but
-- no routes produce them yet.
--
-- TABLES ADDED
--   quick_match_queue — public waiting queue; one row per searcher
--
-- h2h_matches CHANGES
--   match_type column    — 'private' (default) | 'quick'
--   status CHECK         — adds 'category_select'
--   category             — made nullable (set after lobby pick)
--   qm_p1_pick           — player1 category pick during lobby
--   qm_p2_pick           — player2 category pick during lobby
--   category_deadline    — server-side lobby expiry timestamp
--
-- RPCS ADDED
--   join_quick_match(p_mode)
--     Atomically: expire stale queue entries → check if caller is
--     already matched → cancel caller's stale waiting entries →
--     SKIP LOCKED claim a waiting opponent or create a new entry.
--     Returns { status:'waiting'|'matched', queue_id, match_id? }
--
--   cancel_quick_match(p_queue_id)
--     Marks caller's waiting entry as 'cancelled'.
--
--   submit_qm_category_pick(p_match_id, p_category_key)
--     Records caller's category pick, FOR UPDATE serialises.
--     If both picks are in: picks final category (same → that one;
--     different → random choice), writes category + started_at +
--     status='active'.
--     Returns { status:'category_select'|'active', ... }
--
-- cleanup_stale_duel_matches EXTENDED
--   Rule 3: quick matches stuck in category_select after
--   deadline + 30 s are abandoned.
--
-- IDEMPOTENCY
--   All DDL uses IF NOT EXISTS or OR REPLACE.
--   The status/match_type CHECK constraints are dropped before
--   recreation (safe because existing rows satisfy the new set).
-- ================================================================

-- ── 1. Extend h2h_matches ─────────────────────────────────────

-- 1a. Add match_type (private duel vs quick match)
ALTER TABLE public.h2h_matches
  ADD COLUMN IF NOT EXISTS match_type text NOT NULL DEFAULT 'private';

-- Ensure the CHECK exists (idempotent DROP + re-add)
ALTER TABLE public.h2h_matches
  DROP CONSTRAINT IF EXISTS h2h_matches_match_type_check;
ALTER TABLE public.h2h_matches
  ADD CONSTRAINT h2h_matches_match_type_check
  CHECK (match_type IN ('private', 'quick'));

-- 1b. Widen status CHECK to include 'category_select'
ALTER TABLE public.h2h_matches
  DROP CONSTRAINT IF EXISTS h2h_matches_status_check;
ALTER TABLE public.h2h_matches
  ADD CONSTRAINT h2h_matches_status_check
  CHECK (status IN ('waiting', 'category_select', 'active', 'finished', 'abandoned'));

-- 1c. Make category nullable (quick matches start without a category)
ALTER TABLE public.h2h_matches
  ALTER COLUMN category DROP NOT NULL;

-- 1d. Category selection lobby columns
ALTER TABLE public.h2h_matches
  ADD COLUMN IF NOT EXISTS category_deadline timestamptz;
ALTER TABLE public.h2h_matches
  ADD COLUMN IF NOT EXISTS qm_p1_pick text;
ALTER TABLE public.h2h_matches
  ADD COLUMN IF NOT EXISTS qm_p2_pick text;

-- ── 2. quick_match_queue table ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.quick_match_queue (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id),
  mode        text        NOT NULL DEFAULT 'classic'
              CHECK (mode IN ('classic')),
  status      text        NOT NULL DEFAULT 'waiting'
              CHECK (status IN ('waiting', 'matched', 'cancelled', 'expired')),
  match_id    uuid        REFERENCES public.h2h_matches(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '90 seconds'
);

-- Index for atomic queue scan: find oldest waiting entry for a mode
CREATE INDEX IF NOT EXISTS idx_qmq_waiting_mode_created
  ON public.quick_match_queue (mode, created_at)
  WHERE status = 'waiting';

-- Index for polling: look up own entry by id
CREATE INDEX IF NOT EXISTS idx_qmq_user_status
  ON public.quick_match_queue (user_id, status);

GRANT SELECT ON public.quick_match_queue TO authenticated;

ALTER TABLE public.quick_match_queue ENABLE ROW LEVEL SECURITY;

-- Users can read only their own queue entries
DROP POLICY IF EXISTS "qmq_select_own" ON public.quick_match_queue;
CREATE POLICY "qmq_select_own"
  ON public.quick_match_queue FOR SELECT
  USING (auth.uid() = user_id);

-- All mutations go through SECURITY DEFINER RPCs — no direct-write policies.

-- ── 3. RPC: join_quick_match ──────────────────────────────────
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

  -- Step 1: expire stale queue entries globally
  UPDATE public.quick_match_queue
     SET status = 'expired'
   WHERE status = 'waiting'
     AND expires_at < now();

  -- Step 2: check if caller is already matched from a previous call
  SELECT id, match_id
    INTO v_queue_id, v_match_id
    FROM public.quick_match_queue
   WHERE user_id  = v_caller
     AND status   = 'matched'
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_match_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status',   'matched',
      'match_id', v_match_id,
      'queue_id', v_queue_id
    );
  END IF;

  -- Step 3: cancel caller's stale waiting entries before creating a new one
  UPDATE public.quick_match_queue
     SET status = 'cancelled'
   WHERE user_id = v_caller
     AND status  = 'waiting';

  -- Step 4: try to claim a waiting opponent (FOR UPDATE SKIP LOCKED prevents
  -- two concurrent join_quick_match calls from claiming the same row)
  SELECT id, user_id
    INTO v_opp_queue_id, v_opp_user_id
    FROM public.quick_match_queue
   WHERE status   = 'waiting'
     AND mode     = p_mode
     AND user_id != v_caller
     AND expires_at > now()
   ORDER BY created_at ASC
   LIMIT 1
   FOR UPDATE SKIP LOCKED;

  IF v_opp_user_id IS NOT NULL THEN
    -- Matched! Generate seed server-side.
    v_seed := floor(random() * 2147483647)::bigint;

    -- Create the match: waiting player is player1, joiner is player2.
    -- category is NULL — determined in the lobby.
    -- started_at is NULL — set by submit_qm_category_pick when both picks in.
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
      now() + interval '25 seconds'   -- 15 s pick window + 10 s buffer
    )
    RETURNING id INTO v_match_id;

    -- Mark opponent's queue entry as matched
    UPDATE public.quick_match_queue
       SET status   = 'matched',
           match_id = v_match_id
     WHERE id = v_opp_queue_id;

    -- Create caller's queue entry as matched (so they can poll for match_id too)
    INSERT INTO public.quick_match_queue (user_id, mode, status, match_id)
    VALUES (v_caller, p_mode, 'matched', v_match_id)
    RETURNING id INTO v_queue_id;

    RETURN jsonb_build_object(
      'status',   'matched',
      'match_id', v_match_id,
      'queue_id', v_queue_id
    );
  END IF;

  -- Step 5: no opponent found — enter the waiting queue
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


-- ── 4. RPC: cancel_quick_match ────────────────────────────────
CREATE OR REPLACE FUNCTION public.cancel_quick_match(
  p_queue_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = 'P0001';
  END IF;

  UPDATE public.quick_match_queue
     SET status = 'cancelled'
   WHERE id      = p_queue_id
     AND user_id = v_caller
     AND status  = 'waiting';

  RETURN jsonb_build_object('status', 'cancelled');
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_quick_match(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.cancel_quick_match(uuid) TO authenticated;


-- ── 5. RPC: submit_qm_category_pick ──────────────────────────
CREATE OR REPLACE FUNCTION public.submit_qm_category_pick(
  p_match_id uuid,
  p_category text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller     uuid := auth.uid();
  v_match      h2h_matches%rowtype;
  v_is_p1      boolean;
  v_p1_pick    text;
  v_p2_pick    text;
  v_final_cat  text;
  v_started_at timestamptz;
  v_timeout_at timestamptz;
  -- Only free-tier categories are offered in Quick Match Phase 1.
  -- This list must stay in sync with FREE_QM_CATS in quickmatch.html.
  v_free_cats  text[] := ARRAY[
    'landmass','population','gdp','altitude','forest','olympic',
    'passport','beer','worldcup','worldcupgoals','worldcupappearances','worldcupwins'
  ];
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = 'P0001';
  END IF;

  -- Lock the match row — serialises concurrent submissions
  SELECT * INTO v_match
    FROM public.h2h_matches
   WHERE id = p_match_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found' USING errcode = 'P0002';
  END IF;

  -- Security: caller must be a participant
  IF v_match.player1_id != v_caller AND v_match.player2_id != v_caller THEN
    RAISE EXCEPTION 'User does not belong to this match' USING errcode = 'P0003';
  END IF;

  -- Idempotent: if already active (2nd pick already resolved), return current state
  IF v_match.status = 'active' THEN
    RETURN jsonb_build_object(
      'status',     'active',
      'category',   v_match.category,
      'seed',       v_match.seed,
      'started_at', v_match.started_at
    );
  END IF;

  IF v_match.status != 'category_select' THEN
    RAISE EXCEPTION 'Match is not in category_select state (status: %)', v_match.status
      USING errcode = 'P0004';
  END IF;

  IF v_match.match_type != 'quick' THEN
    RAISE EXCEPTION 'Not a quick match' USING errcode = 'P0005';
  END IF;

  -- Validate the submitted category is in the free set
  IF p_category != ALL(v_free_cats) THEN
    RAISE EXCEPTION 'Invalid category for quick match: %', p_category
      USING errcode = 'P0006';
  END IF;

  v_is_p1 := (v_match.player1_id = v_caller);

  -- Store pick idempotently (first-write-wins per player)
  IF v_is_p1 THEN
    IF v_match.qm_p1_pick IS NULL THEN
      UPDATE public.h2h_matches SET qm_p1_pick = p_category WHERE id = p_match_id;
    END IF;
    v_p1_pick := COALESCE(v_match.qm_p1_pick, p_category);
    v_p2_pick := v_match.qm_p2_pick;
  ELSE
    IF v_match.qm_p2_pick IS NULL THEN
      UPDATE public.h2h_matches SET qm_p2_pick = p_category WHERE id = p_match_id;
    END IF;
    v_p1_pick := v_match.qm_p1_pick;
    v_p2_pick := COALESCE(v_match.qm_p2_pick, p_category);
  END IF;

  -- Check if both picks are now in
  IF v_p1_pick IS NOT NULL AND v_p2_pick IS NOT NULL THEN

    -- Determine final category:
    -- Same pick → that category. Different picks → random choice between the two.
    IF v_p1_pick = v_p2_pick THEN
      v_final_cat := v_p1_pick;
    ELSIF random() < 0.5 THEN
      v_final_cat := v_p1_pick;
    ELSE
      v_final_cat := v_p2_pick;
    END IF;

    -- Set started_at 5 seconds in the future so both clients have time to
    -- transition from the lobby reveal screen before the game timer begins.
    v_started_at := clock_timestamp() + interval '5 seconds';
    v_timeout_at := v_started_at + interval '5 minutes';

    UPDATE public.h2h_matches
       SET status            = 'active',
           category          = v_final_cat,
           started_at        = v_started_at,
           timeout_at        = v_timeout_at,
           qm_p1_pick        = v_p1_pick,
           qm_p2_pick        = v_p2_pick
     WHERE id = p_match_id;

    RETURN jsonb_build_object(
      'status',     'active',
      'category',   v_final_cat,
      'seed',       v_match.seed,
      'started_at', v_started_at
    );
  END IF;

  -- One pick in — waiting for the opponent
  RETURN jsonb_build_object(
    'status',  'category_select',
    'my_pick', p_category
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_qm_category_pick(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.submit_qm_category_pick(uuid, text) TO authenticated;


-- ── 6. Extend cleanup_stale_duel_matches ─────────────────────
-- Adds Rule 3: abandon quick matches whose category deadline has
-- passed by more than 30 s (both players failed to pick even after
-- auto-pick should have fired on the client).
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

  RETURN jsonb_build_object(
    'waiting_abandoned',      v_waiting_count,
    'zombie_abandoned',       v_zombie_count,
    'lobby_abandoned',        v_lobby_count,
    'ran_at',                 NOW()
  );
END;
$$;

-- Grant unchanged: service_role only
REVOKE ALL ON FUNCTION public.cleanup_stale_duel_matches() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_stale_duel_matches() FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.cleanup_stale_duel_matches() TO service_role;
