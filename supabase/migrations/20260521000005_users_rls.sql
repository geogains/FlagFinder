-- ================================================================
-- Refine public.users SELECT policy to respect profile_is_public.
--
-- Runs after 20260521000002 which adds the profile_is_public column
-- and after 20260521000004 which sets it to true for all existing users.
--
-- Replaces the broad bootstrap policy (true) with one that:
--   • always lets a user read their own row (needed for account page)
--   • lets anyone (including anon) read rows where profile_is_public = true
--     (needed for /u/[username] public profiles)
-- ================================================================

DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users
  FOR SELECT USING (
    auth.uid() = id
    OR profile_is_public = true
  );
