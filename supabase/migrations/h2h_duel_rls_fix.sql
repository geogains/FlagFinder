-- ================================================================
-- Fix: h2h_matches RLS + table grants
--
-- Run this against any database that already has h2h_matches deployed
-- from the original h2h_duel.sql migration.
--
-- Problems fixed:
--   1. Missing table-level GRANTs — Supabase does not auto-grant when
--      tables are created via a SQL migration run outside the dashboard.
--      Without explicit GRANTs, ALL queries return 403/406 regardless
--      of RLS policies.
--
--   2. duel_match_select was too restrictive — it only permitted reads
--      when auth.uid() = player1_id OR auth.uid() = player2_id.
--      When player2 first opens the invite link, player2_id IS NULL,
--      so auth.uid() = NULL evaluates to false.  PostgREST returns HTTP
--      406 (PGRST116 "JSON object requested, multiple (or no) rows
--      returned") from .single(), which surfaces as "No API key found"
--      in some Supabase gateway configurations.
--      Fix: also allow any authenticated user to SELECT a waiting match
--      whose player2 slot is still open.
-- ================================================================

-- 1. Table-level grants
grant usage on schema public to anon, authenticated;

grant select, insert, update on h2h_matches to authenticated;
grant select, insert           on h2h_results to authenticated;

-- 2. Drop and recreate the broken SELECT policy
drop policy if exists "duel_match_select" on h2h_matches;

create policy "duel_match_select"
  on h2h_matches for select
  using (
    auth.uid() = player1_id
    or auth.uid() = player2_id
    or (player2_id is null and status = 'waiting')
  );
