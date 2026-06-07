-- ================================================================
-- h2h_matches: grant fix + duel_match_select policy correction.
--
-- Normalized from the original h2h_duel_rls_fix.sql (no timestamp).
-- Timestamped 20260501 so it applies immediately after the schema
-- file (20260501000000) in fresh deployments.
--
-- Problems originally fixed:
--   1. Missing table-level GRANTs when tables were created via SQL
--      migration run outside the Supabase dashboard.
--   2. duel_match_select was too restrictive: blocked player2 from
--      reading the match row before they had joined (player2_id IS NULL
--      at that point, so auth.uid() = player2_id was always false).
-- ================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.h2h_matches TO authenticated;
GRANT SELECT, INSERT          ON public.h2h_results TO authenticated;

DROP POLICY IF EXISTS "duel_match_select" ON public.h2h_matches;
CREATE POLICY "duel_match_select"
  ON public.h2h_matches FOR SELECT
  USING (
    auth.uid() = player1_id
    OR auth.uid() = player2_id
    OR (player2_id IS NULL AND status = 'waiting')
  );
