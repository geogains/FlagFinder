-- Phase 3B: make profiles public by default.
-- The column was created with DEFAULT false in 20260521000002.
-- V1 public profiles assume opt-in privacy (users are public unless they
-- explicitly opt out).  The UI for opting out will be added in a later phase.
ALTER TABLE public.users
  ALTER COLUMN profile_is_public SET DEFAULT true;

-- Backfill: existing users created before this migration — set to public.
-- Users who want privacy will be able to opt out once the settings UI ships.
UPDATE public.users SET profile_is_public = true WHERE profile_is_public = false;
