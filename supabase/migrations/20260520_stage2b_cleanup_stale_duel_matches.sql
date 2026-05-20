-- ================================================================
-- Phase 2B Stage 2B: Stale match cleanup function
--
-- cleanup_stale_duel_matches() enforces the two expiry rules that
-- were previously only triggered client-side (if ever):
--
--   1. Waiting rooms older than 30 minutes with no opponent joined
--   2. Active matches past their timeout_at with < 2 results submitted
--      (both players abandoned the game without finishing)
--
-- SCHEDULING:
--   Option A — pg_cron (Supabase Pro/Team plans):
--     SELECT cron.schedule(
--       'cleanup-stale-duels',
--       '*/10 * * * *',
--       'SELECT public.cleanup_stale_duel_matches()'
--     );
--
--   Option B — Edge Function + external cron (any plan):
--     Create a Supabase Edge Function that calls:
--       supabase.rpc('cleanup_stale_duel_matches')
--     with the service role key.  Schedule it via GitHub Actions,
--     Vercel Cron, or any external cron service at a ~10 min cadence.
--
-- The function is intentionally NOT callable by authenticated users.
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
BEGIN
  -- Rule 1: Abandon waiting rooms with no opponent after 30 minutes.
  -- These are invite links that were never accepted.
  UPDATE public.h2h_matches
  SET status = 'abandoned'
  WHERE status = 'waiting'
    AND created_at < NOW() - INTERVAL '30 minutes';

  GET DIAGNOSTICS v_waiting_count = ROW_COUNT;

  -- Rule 2: Abandon active matches past their timeout with fewer than
  -- 2 submitted results.  These are games where both players quit
  -- without finishing — the match is stuck in 'active' forever
  -- without this cleanup.
  UPDATE public.h2h_matches
  SET status = 'abandoned'
  WHERE status = 'active'
    AND timeout_at IS NOT NULL
    AND timeout_at < NOW()
    AND (
      SELECT COUNT(*)
      FROM public.h2h_results r
      WHERE r.match_id = public.h2h_matches.id
    ) < 2;

  GET DIAGNOSTICS v_zombie_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'waiting_abandoned', v_waiting_count,
    'zombie_abandoned',  v_zombie_count,
    'ran_at',            NOW()
  );
END;
$$;

-- Not callable by end users — service_role / pg_cron only
REVOKE ALL ON FUNCTION public.cleanup_stale_duel_matches() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_stale_duel_matches() FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.cleanup_stale_duel_matches() TO service_role;
