-- ================================================================
-- Phase 2A Part 1: Authoritative match creation via RPC
--
-- Changes:
--   1. Add entitlement snapshot columns to h2h_matches
--   2. Drop direct-insert RLS policy — clients must use the RPC
--   3. Create create_duel_match() with server-side entitlement
--      validation (mirrors resolveEffectiveTier in permissions.js)
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Entitlement snapshot columns (nullable — backwards-compatible
--    with rows created before this migration)
-- ----------------------------------------------------------------
ALTER TABLE public.h2h_matches
  ADD COLUMN IF NOT EXISTS host_subscription_tier text,
  ADD COLUMN IF NOT EXISTS required_category_tier text;

-- ----------------------------------------------------------------
-- 2. Close the direct-insert path.
--    The create_duel_match() RPC (security definer) is now the only
--    authorised route for creating matches.  Without this policy,
--    any authenticated client insert returns HTTP 403.
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "duel_match_insert" ON public.h2h_matches;

-- ----------------------------------------------------------------
-- 3. RPC: create_duel_match
--
-- Validates host entitlement, determines category tier, and inserts
-- the match atomically with an entitlement snapshot.
--
-- Category tier rules (mirrors categories-config.js):
--   Free:    landmass, population, gdp, altitude, forest, olympic,
--            passport, beer
--   Light:   (none assigned yet — rows will be added here)
--   Premium: all other known categories
--
-- Tier comparison uses numeric rank: free=0, light=1, premium=2.
-- Host rank must be >= required rank for the insert to proceed.
--
-- Returns: { id, category, required_category_tier, host_subscription_tier }
-- Raises:  exception with SQLSTATE P0001–P0004 on validation failure
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_duel_match(
  p_category text,
  p_seed     bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host_id              uuid;
  v_host_tier            text;
  v_required_tier        text;
  v_tier_rank_host       int;
  v_tier_rank_required   int;
  v_match_id             uuid;
BEGIN
  -- 1. Identify the authenticated host
  v_host_id := auth.uid();
  IF v_host_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING errcode = 'P0001';
  END IF;

  -- 2. Validate category is a known key (rejects arbitrary strings
  --    before any subscription lookup)
  IF p_category NOT IN (
    -- Free categories
    'landmass', 'population', 'gdp', 'altitude', 'forest',
    'olympic', 'passport', 'beer',
    -- Premium categories (canonical keys + URL aliases)
    'bigmac', 'carexports', 'coastline', 'crimerate', 'cuisine',
    'density', 'disasterrisk', 'flamingo', 'gm', 'f1', 'happiness',
    'lifeexpectancy', 'longestriver', 'marriageage', 'michelin',
    'militarypersonel', 'millionaires', 'nobelprize', 'poorestgdp',
    'precipitation', 'rainfall', 'renewableenergy', 'rent', 'sexratio',
    'tallestbuilding', 'temperature', 'hightemp', 'tourism',
    'university', 'volcano', 'worldcup'
  ) THEN
    RAISE EXCEPTION 'Unknown category: %', p_category
      USING errcode = 'P0002';
  END IF;

  -- 3. Determine required tier for the requested category.
  --    Free categories are explicitly listed; all others require premium.
  --    When light-tier categories are assigned, add them to the
  --    light branch of this CASE expression via a new migration.
  v_required_tier := CASE
    WHEN p_category = ANY(ARRAY[
      'landmass', 'population', 'gdp', 'altitude', 'forest',
      'olympic', 'passport', 'beer'
    ]) THEN 'free'
    ELSE 'premium'
  END;

  -- 4. Resolve host's subscription tier.
  --    subscription_tier is the source of truth; is_premium is the
  --    fallback for rows that predate the Phase 1 Part 1 migration.
  SELECT COALESCE(
    subscription_tier::text,
    CASE WHEN is_premium THEN 'premium' ELSE 'free' END,
    'free'
  )
  INTO v_host_tier
  FROM public.users
  WHERE id = v_host_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found'
      USING errcode = 'P0003';
  END IF;

  -- 5. Compare tiers using numeric rank (free=0, light=1, premium=2)
  v_tier_rank_host     := CASE v_host_tier     WHEN 'free' THEN 0 WHEN 'light' THEN 1 WHEN 'premium' THEN 2 ELSE 0 END;
  v_tier_rank_required := CASE v_required_tier WHEN 'free' THEN 0 WHEN 'light' THEN 1 WHEN 'premium' THEN 2 ELSE 2 END;

  IF v_tier_rank_host < v_tier_rank_required THEN
    RAISE EXCEPTION 'Subscription upgrade required to create a % category match', v_required_tier
      USING errcode = 'P0004';
  END IF;

  -- 6. Insert match with entitlement snapshot
  INSERT INTO public.h2h_matches (
    category,
    seed,
    player1_id,
    status,
    host_subscription_tier,
    required_category_tier
  ) VALUES (
    p_category,
    p_seed,
    v_host_id,
    'waiting',
    v_host_tier,
    v_required_tier
  )
  RETURNING id INTO v_match_id;

  RETURN jsonb_build_object(
    'id',                     v_match_id,
    'category',               p_category,
    'required_category_tier', v_required_tier,
    'host_subscription_tier', v_host_tier
  );
END;
$$;

-- Grant execute to authenticated users only
REVOKE ALL ON FUNCTION public.create_duel_match(text, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_duel_match(text, bigint) TO authenticated;
