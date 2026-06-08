-- ================================================================
-- Make all four World Cup categories free in create_duel_match().
-- 2026-06-08
--
-- Background:
--   20260608020000 added worldcupgoals/appearances/wins (IDs 38-40)
--   and made worldcup (ID 9) free in can_access_category() and
--   categories-config.js. create_duel_match() has a separate
--   hardcoded known-category list and free-tier allowlist that was
--   not updated in that migration.
--
-- This migration:
--   1. Adds worldcup, worldcupgoals, worldcupappearances, worldcupwins
--      to the known-category validation list (so duels can be created
--      for the 3 new categories, which were previously unknown).
--   2. Adds all four to the free-tier allowlist so free users can
--      host duel rooms for any World Cup category.
--   3. All other logic (rate limiting, tier resolution, insert) is
--      preserved exactly from 20260520010000.
-- ================================================================

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
  v_recent_count         int;
BEGIN
  -- 1. Identify the authenticated host
  v_host_id := auth.uid();
  IF v_host_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING errcode = 'P0001';
  END IF;

  -- 2. Validate category is a known key
  IF p_category NOT IN (
    'landmass', 'population', 'gdp', 'altitude', 'forest',
    'olympic', 'passport', 'beer',
    'bigmac', 'carexports', 'coastline', 'crimerate', 'cuisine',
    'density', 'disasterrisk', 'flamingo', 'gm', 'f1', 'happiness',
    'lifeexpectancy', 'longestriver', 'marriageage', 'michelin',
    'militarypersonel', 'millionaires', 'nobelprize', 'poorestgdp',
    'precipitation', 'rainfall', 'renewableenergy', 'rent', 'sexratio',
    'tallestbuilding', 'temperature', 'hightemp', 'tourism',
    'university', 'volcano', 'worldcup',
    'worldcupgoals', 'worldcupappearances', 'worldcupwins'
  ) THEN
    RAISE EXCEPTION 'Unknown category: %', p_category
      USING errcode = 'P0002';
  END IF;

  -- 3. Determine required tier for the category.
  --    Free categories require no subscription.
  --    This list must stay in sync with can_access_category() in the
  --    backend and premium: false entries in categories-config.js.
  v_required_tier := CASE
    WHEN p_category = ANY(ARRAY[
      'landmass', 'population', 'gdp', 'altitude', 'forest',
      'olympic', 'passport', 'beer',
      'worldcup', 'worldcupgoals', 'worldcupappearances', 'worldcupwins'
    ]) THEN 'free'
    ELSE 'premium'
  END;

  -- 4. Resolve host subscription tier
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

  -- 5. Compare tiers (free=0, light=1, premium=2)
  v_tier_rank_host     := CASE v_host_tier     WHEN 'free' THEN 0 WHEN 'light' THEN 1 WHEN 'premium' THEN 2 ELSE 0 END;
  v_tier_rank_required := CASE v_required_tier WHEN 'free' THEN 0 WHEN 'light' THEN 1 WHEN 'premium' THEN 2 ELSE 2 END;

  IF v_tier_rank_host < v_tier_rank_required THEN
    RAISE EXCEPTION 'Subscription upgrade required to create a % category match', v_required_tier
      USING errcode = 'P0004';
  END IF;

  -- 6. Rate limiting: at most 20 rooms created per host per hour.
  --    This is intentionally generous — a legitimate user playing duels all day
  --    would need roughly 1 room per game, and 20/hour is far beyond normal use.
  SELECT COUNT(*) INTO v_recent_count
  FROM public.h2h_matches
  WHERE player1_id = v_host_id
    AND created_at > NOW() - INTERVAL '1 hour';

  IF v_recent_count >= 20 THEN
    RAISE EXCEPTION 'Too many challenges created recently. Please wait before creating another.'
      USING errcode = 'P0006';
  END IF;

  -- 7. Insert match with entitlement snapshot
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

REVOKE ALL ON FUNCTION public.create_duel_match(text, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_duel_match(text, bigint) TO authenticated;
