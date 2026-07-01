-- ================================================================
-- Bootstrap: create public.users with its minimum base schema.
--
-- On the original production project this table was created manually
-- before the migration system was introduced.  This file makes fresh
-- deployments (staging, local) fully self-contained.
--
-- Only the three columns that are assumed to exist before any ALTER
-- TABLE migration runs are included here:
--   • id          – primary key, FK to auth.users
--   • email       – copied from auth at signup via handle_new_user()
--   • is_premium  – referenced by 20260519190000 without an ADD COLUMN
--
-- All other columns (stripe_*, timezone, subscription_tier, username,
-- profile_is_public, …) are added safely by their own migrations.
--
-- The SELECT policy is intentionally broad here (all rows visible) so
-- that the early RPCs can read the table.  It is narrowed to respect
-- profile_is_public in 20260521000005, which runs after that column
-- is added by 20260521000002.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.users (
  id         uuid    PRIMARY KEY REFERENCES auth.users(id),
  email      text,
  is_premium boolean NOT NULL DEFAULT false
);

-- Grants
GRANT USAGE  ON SCHEMA public              TO anon, authenticated;
GRANT SELECT ON public.users               TO anon, authenticated;
GRANT INSERT, UPDATE ON public.users       TO authenticated;

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "users_update" ON public.users;
CREATE POLICY "users_update" ON public.users
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_insert" ON public.users;
CREATE POLICY "users_insert" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);
