-- ================================================================
-- Fix: upsert_high_score + can_access_category
-- 2026-06-06
--
-- Root causes addressed:
--   Bug 1 (Over-blocking): IDs 8, 10, 12, 13 were treated as
--     premium despite being free in categories-config.js. These
--     categories were promoted to free after the original RPCs
--     were written and the backend was never updated.
--   Bug 2 (Under-blocking): IDs 17–37 had no entitlement check at
--     all. These categories did not exist when the RPCs were first
--     written and were never added to the hardcoded list.
--   Legacy: Both functions read is_premium only, ignoring
--     subscription_tier (the GeoRanks 2.0 source of truth).
--
-- Neither function existed in any prior migration — both are
-- unversioned live database objects being brought under migration
-- control here for the first time.
--
-- Free category IDs (canonical list — must match categories-config.js):
--   1  population   2  altitude   3  gdp     5  forest
--   8  olympic     10  landmass  12  passport  13 beer
--
-- All other category IDs require subscription_tier = 'premium'
-- (or legacy is_premium = true).
--
-- Preserved behaviour:
--   is_daily_challenge = true / is_daily = true bypasses all
--   entitlement checks. Daily Challenge must always be accessible
--   regardless of category tier or user subscription.
-- ================================================================

-- ── 1. can_access_category ──────────────────────────────────────
--
-- Returns true if the current user (or an unauthenticated visitor)
-- may access the given category.
--
-- Decision order:
--   1. is_daily = true                  → true  (Daily Challenge bypass)
--   2. category_id in free list         → true  (no subscription needed)
--   3. auth.uid() IS NULL               → false (guest, premium required)
--   4. user.subscription_tier = premium → true
--   5. user.is_premium = true           → true  (legacy fallback)
--   6. otherwise                        → false

CREATE OR REPLACE FUNCTION public.can_access_category(
  category_id_input integer,
  is_daily          boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_tier text;
BEGIN
  -- Daily Challenge always allowed regardless of category tier or user tier.
  IF is_daily THEN
    RETURN true;
  END IF;

  -- Free categories require no subscription.
  -- This list must stay in sync with CATEGORY_ID_MAP in categories-config.js
  -- for the 8 categories where premium: false.
  IF category_id_input = ANY(ARRAY[1, 2, 3, 5, 8, 10, 12, 13]) THEN
    RETURN true;
  END IF;

  -- All remaining categories are premium-gated.
  -- Unauthenticated users cannot hold a subscription.
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  -- Resolve the user's effective tier.
  -- subscription_tier is the GeoRanks 2.0 source of truth.
  -- is_premium is the legacy fallback for rows that predate the
  -- subscription_tier migration (20260519190000).
  -- Matches the resolveEffectiveTier() logic in js/permissions.js.
  SELECT COALESCE(
    subscription_tier::text,
    CASE WHEN is_premium THEN 'premium' ELSE 'free' END,
    'free'
  )
  INTO v_tier
  FROM public.users
  WHERE id = v_uid;

  -- Profile not found: deny access rather than default-allow.
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  RETURN v_tier = 'premium';
END;
$$;

-- can_access_category is called by the frontend to preview access
-- before a game starts (via REST /rpc/can_access_category), so it
-- must be executable by both authenticated users and anon visitors.
GRANT EXECUTE ON FUNCTION public.can_access_category(integer, boolean)
  TO authenticated, anon;


-- ── 2. upsert_high_score ────────────────────────────────────────
--
-- Saves a Classic mode game score to category_scores.
-- Only promotes the stored score when new_score exceeds the current
-- personal best (high-score semantics).
--
-- Requires an authenticated session. Premium categories require
-- subscription_tier = 'premium' unless is_daily_challenge = true,
-- which enables free users to save scores for the Daily Challenge
-- regardless of the category's tier.

CREATE OR REPLACE FUNCTION public.upsert_high_score(
  category_id_input  integer,
  new_score          integer,
  is_daily_challenge boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  -- Must be logged in to record a score.
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING errcode = 'P0001';
  END IF;

  -- Delegate entitlement check to can_access_category.
  -- is_daily_challenge maps directly to can_access_category's is_daily
  -- parameter so the Daily Challenge bypass propagates correctly.
  IF NOT public.can_access_category(category_id_input, is_daily_challenge) THEN
    RAISE EXCEPTION 'Premium subscription required for this category'
      USING errcode = 'P0001';
  END IF;

  -- Upsert: insert on first play, update only if new score beats existing.
  INSERT INTO public.category_scores (user_id, category_id, score)
  VALUES (v_uid, category_id_input, new_score)
  ON CONFLICT (user_id, category_id)
  DO UPDATE SET score = EXCLUDED.score
  WHERE public.category_scores.score < EXCLUDED.score;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_high_score(integer, integer, boolean)
  TO authenticated;
