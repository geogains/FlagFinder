-- Phase 3B: profile country flag identity.
-- Users can optionally display a country flag on their public profile.
-- country_code stores a 2-letter ISO 3166-1 alpha-2 code (e.g. 'GB', 'US').
-- NULL = no flag selected (default; not shown on profile).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS country_code text;
