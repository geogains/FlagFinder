-- ================================================================
-- Phase 2B Stage 2A: start_duel_match RPC
-- Phase 2B Stage 2C: Lifecycle transition hardening
--
-- DEPLOYMENT ORDER: Apply this migration AND update duel.html
-- (handleBothReady → start_duel_match RPC) in the same deployment.
-- Stage 2C's column grants revoke the client's ability to write
-- started_at directly — the frontend must already be using the RPC
-- before this migration is applied in production.
-- ================================================================

-- ================================================================
-- STAGE 2A: start_duel_match RPC
--
-- Becomes the sole authoritative mechanism for the waiting→active
-- transition.  Replaces the direct client UPDATE that was previously
-- done in handleBothReady().
--
-- Guarantees:
--   • caller is the match creator (player1)
--   • opponent has joined (player2_id IS NOT NULL)
--   • match is in a startable state
--   • started_at is written from the DB server clock (no client drift)
--   • idempotent: returns existing timestamps if already started
--   • FOR UPDATE serialises concurrent calls at the row level
-- ================================================================
CREATE OR REPLACE FUNCTION public.start_duel_match(p_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match      h2h_matches%rowtype;
  v_caller     uuid;
  v_started_at timestamptz;
  v_timeout_at timestamptz;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING errcode = 'P0001';
  END IF;

  -- Lock the row for this transaction to serialise concurrent start attempts
  SELECT * INTO v_match
  FROM public.h2h_matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found'
      USING errcode = 'P0002';
  END IF;

  -- Only the match creator may drive the game start
  IF v_match.player1_id != v_caller THEN
    RAISE EXCEPTION 'Only the match creator can start the game'
      USING errcode = 'P0003';
  END IF;

  -- Reject terminal states before checking idempotency
  IF v_match.status IN ('finished', 'abandoned') THEN
    RAISE EXCEPTION 'Match cannot be started: status is %', v_match.status
      USING errcode = 'P0004';
  END IF;

  -- Idempotent path: already started — return the authoritative timestamps
  -- without modifying the row.  This handles duplicate RPC calls safely.
  IF v_match.started_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'started_at',      v_match.started_at,
      'timeout_at',      v_match.timeout_at,
      'already_started', true
    );
  END IF;

  -- Ensure an opponent has joined before the game can start
  IF v_match.player2_id IS NULL THEN
    RAISE EXCEPTION 'Cannot start: no opponent has joined yet'
      USING errcode = 'P0005';
  END IF;

  -- Write authoritative timestamps from the DB server clock.
  -- clock_timestamp() returns the actual wall time at this point
  -- in the function, not the transaction start time (NOW()).
  v_started_at := clock_timestamp();
  v_timeout_at := v_started_at + INTERVAL '5 minutes';

  UPDATE public.h2h_matches
  SET
    status     = 'active',
    started_at = v_started_at,
    timeout_at = v_timeout_at
  WHERE id = p_match_id;

  RETURN jsonb_build_object(
    'started_at',      v_started_at,
    'timeout_at',      v_timeout_at,
    'already_started', false
  );
END;
$$;

-- Callable by authenticated users (player1 calls from the lobby)
REVOKE ALL ON FUNCTION public.start_duel_match(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_duel_match(uuid) TO authenticated;


-- ================================================================
-- STAGE 2C: Lifecycle transition hardening
--
-- Replaces the single broad duel_match_update policy with two
-- narrow policies that enforce valid transition semantics, and
-- restricts column-level write access so clients can never directly
-- mutate lifecycle fields (started_at, timeout_at, seed, category,
-- player1_id, etc.).
--
-- After this migration:
--   • Direct client writes to started_at / timeout_at are impossible
--   • Status can only move to 'active' (via join) or 'abandoned'
--     (via client-side expiry) through direct client UPDATE
--   • All other lifecycle transitions are RPC-driven and bypass RLS
-- ================================================================

-- Revoke the general UPDATE grant on the table.
-- Clients can no longer freely update any column.
REVOKE UPDATE ON public.h2h_matches FROM authenticated;

-- Re-grant update access on only the two columns that client code
-- legitimately mutates via direct UPDATE:
--   player2_id: set during the join flow in loadWaitingRoom
--   status:     set to 'active' on join, or 'abandoned' on expiry
GRANT UPDATE (player2_id, status) ON public.h2h_matches TO authenticated;

-- Drop the old overly-permissive update policy
DROP POLICY IF EXISTS "duel_match_update" ON public.h2h_matches;

-- ----------------------------------------------------------------
-- Policy 1: claim a waiting room as player2
--
-- PRE  (USING):     row must be unclaimed and in waiting state
-- POST (WITH CHECK): the resulting row must have the caller as
--                   player2_id and status must be 'active'
--
-- This is the only path for the join UPDATE in loadWaitingRoom:
--   UPDATE h2h_matches
--   SET player2_id = <uid>, status = 'active'
--   WHERE id = <matchId> AND player2_id IS NULL
-- ----------------------------------------------------------------
CREATE POLICY "duel_match_join"
  ON public.h2h_matches FOR UPDATE
  USING  (player2_id IS NULL AND status = 'waiting')
  WITH CHECK (auth.uid() = player2_id AND status = 'active');

-- ----------------------------------------------------------------
-- Policy 2: abandon a waiting match (client-side expiry)
--
-- PRE  (USING):     match is still waiting and caller belongs to it
-- POST (WITH CHECK): status can only transition to 'abandoned'
--
-- This covers the client-side expiry check in loadWaitingRoom:
--   UPDATE h2h_matches
--   SET status = 'abandoned'
--   WHERE id = <matchId>
-- ----------------------------------------------------------------
CREATE POLICY "duel_match_abandon"
  ON public.h2h_matches FOR UPDATE
  USING  (
    status = 'waiting'
    AND (auth.uid() = player1_id OR auth.uid() = player2_id)
  )
  WITH CHECK (status = 'abandoned');
