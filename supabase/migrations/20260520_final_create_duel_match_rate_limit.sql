-- ================================================================
-- Phase 2B Final: Rate limiting on create_duel_match
--
-- Adds a per-host rate limit: at most 20 rooms per hour.
-- This is generous for legitimate use but prevents table bloat
-- from automated or malicious room spam.
--
-- All other validation logic is preserved exactly.
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
    'university', 'volcano', 'worldcup'
  ) THEN
    RAISE EXCEPTION 'Unknown category: %', p_category
      USING errcode = 'P0002';
  END IF;

  -- 3. Determine required tier for the category
  v_required_tier := CASE
    WHEN p_category = ANY(ARRAY[
      'landmass', 'population', 'gdp', 'altitude', 'forest',
      'olympic', 'passport', 'beer'
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
