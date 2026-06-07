-- ================================================================
-- Phase 2 Finalization: username formalization + profile privacy
--
-- username column
--   Already used by auth.html (signup), account.html (display/update),
--   and duelresults.html (opponent name lookup).  This migration
--   formalizes it with a UNIQUE constraint and format CHECK so the
--   DB enforces invariants that currently only exist client-side.
--
--   Format rules (enforced by CHECK):
--     • 3–30 characters
--     • Must start with a letter (a-z, A-Z)
--     • Remaining characters: letters, digits, underscores
--     • NULL is permitted (users who signed up before username was required)
--
-- profile_is_public
--   Privacy groundwork for Phase 3 public profiles.  Defaults to false
--   (private) so no user data becomes public without an explicit opt-in.
--   No UI yet — schema only.
--
-- Trigger update
--   The existing handle_new_user() trigger only copies id + email.
--   Updated here to also copy username from auth.users.raw_user_meta_data
--   so it is available in public.users immediately after signup confirmation.
--   ON CONFLICT DO NOTHING makes the insert safe if a row already exists.
-- ================================================================

-- ── username column ───────────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS username text;

-- UNIQUE constraint (idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'users_username_key'
       AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_username_key UNIQUE (username);
  END IF;
END
$$;

-- Format CHECK constraint (drop-and-recreate for idempotency)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_username_check;
ALTER TABLE public.users ADD CONSTRAINT users_username_check
  CHECK (
    username IS NULL OR (
      length(username) >= 3
      AND length(username) <= 30
      AND username ~ '^[a-zA-Z][a-zA-Z0-9_]*$'
    )
  );

-- ── profile_is_public column ──────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS profile_is_public boolean NOT NULL DEFAULT false;

-- ── Trigger update: copy username from auth metadata ─────────────
-- new.raw_user_meta_data->>'username' is NULL when the key is absent,
-- which is fine — the column is nullable for legacy accounts.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, username)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'username'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
