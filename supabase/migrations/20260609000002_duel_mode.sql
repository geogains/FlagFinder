-- ================================================================
-- Duel Mode Selection
--
-- 1. Add duel_mode column to h2h_matches
-- 2. Replace create_duel_match to accept p_duel_mode parameter
-- 3. Replace verify_and_save_duel_result to branch on duel_mode
--    - classic: existing placement-range scoring
--    - vs / top10: count wasCorrect = true
-- ================================================================

-- 1. Add duel_mode column (DEFAULT ensures backward compat for existing rows)
ALTER TABLE public.h2h_matches
  ADD COLUMN IF NOT EXISTS duel_mode text NOT NULL DEFAULT 'classic'
  CHECK (duel_mode IN ('classic', 'vs', 'top10'));

-- 2. Replace create_duel_match
--    The old two-param overload is a different signature — drop it first.
DROP FUNCTION IF EXISTS public.create_duel_match(text, bigint);

CREATE OR REPLACE FUNCTION public.create_duel_match(
  p_category  text,
  p_seed      bigint,
  p_duel_mode text DEFAULT 'classic'
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

  -- 2. Validate duel_mode
  IF p_duel_mode NOT IN ('classic', 'vs', 'top10') THEN
    RAISE EXCEPTION 'Unknown duel mode: %', p_duel_mode
      USING errcode = 'P0007';
  END IF;

  -- 3. Validate category is a known key (includes new World Cup categories)
  IF p_category NOT IN (
    'landmass', 'population', 'gdp', 'altitude', 'forest',
    'olympic', 'passport', 'beer',
    'worldcup', 'worldcupgoals', 'worldcupappearances', 'worldcupwins',
    'bigmac', 'carexports', 'coastline', 'crimerate', 'cuisine',
    'density', 'disasterrisk', 'flamingo', 'gm', 'f1', 'happiness',
    'lifeexpectancy', 'longestriver', 'marriageage', 'michelin',
    'militarypersonel', 'millionaires', 'nobelprize', 'poorestgdp',
    'precipitation', 'rainfall', 'renewableenergy', 'rent', 'sexratio',
    'tallestbuilding', 'temperature', 'hightemp', 'tourism',
    'university', 'volcano'
  ) THEN
    RAISE EXCEPTION 'Unknown category: %', p_category
      USING errcode = 'P0002';
  END IF;

  -- 4. Determine required tier for the category
  v_required_tier := CASE
    WHEN p_category = ANY(ARRAY[
      'landmass', 'population', 'gdp', 'altitude', 'forest',
      'olympic', 'passport', 'beer',
      'worldcup', 'worldcupgoals', 'worldcupappearances', 'worldcupwins'
    ]) THEN 'free'
    ELSE 'premium'
  END;

  -- 5. Resolve host subscription tier
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

  -- 6. Compare tiers (free=0, light=1, premium=2)
  v_tier_rank_host     := CASE v_host_tier     WHEN 'free' THEN 0 WHEN 'light' THEN 1 WHEN 'premium' THEN 2 ELSE 0 END;
  v_tier_rank_required := CASE v_required_tier WHEN 'free' THEN 0 WHEN 'light' THEN 1 WHEN 'premium' THEN 2 ELSE 2 END;

  IF v_tier_rank_host < v_tier_rank_required THEN
    RAISE EXCEPTION 'Subscription upgrade required to create a % category match', v_required_tier
      USING errcode = 'P0004';
  END IF;

  -- 7. Rate limiting: at most 20 rooms per host per hour
  SELECT COUNT(*) INTO v_recent_count
  FROM public.h2h_matches
  WHERE player1_id = v_host_id
    AND created_at > NOW() - INTERVAL '1 hour';

  IF v_recent_count >= 20 THEN
    RAISE EXCEPTION 'Too many challenges created recently. Please wait before creating another.'
      USING errcode = 'P0006';
  END IF;

  -- 8. Insert match
  INSERT INTO public.h2h_matches (
    category,
    seed,
    player1_id,
    status,
    host_subscription_tier,
    required_category_tier,
    duel_mode
  ) VALUES (
    p_category,
    p_seed,
    v_host_id,
    'waiting',
    v_host_tier,
    v_required_tier,
    p_duel_mode
  )
  RETURNING id INTO v_match_id;

  RETURN jsonb_build_object(
    'id',                     v_match_id,
    'category',               p_category,
    'duel_mode',              p_duel_mode,
    'required_category_tier', v_required_tier,
    'host_subscription_tier', v_host_tier
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_duel_match(text, bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_duel_match(text, bigint, text) TO authenticated;


-- 3. Replace verify_and_save_duel_result with multi-mode scoring
CREATE OR REPLACE FUNCTION public.verify_and_save_duel_result(
  p_match_id   uuid,
  p_placements jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller        uuid := auth.uid();
  v_match         h2h_matches%rowtype;
  v_elem          jsonb;
  v_placed        int;
  v_min           int;
  v_max           int;
  v_diff          int;
  v_points        int;
  v_score         int  := 0;
  v_max_score     int;
  v_both_done     boolean;
  v_opponent_id   uuid;
  v_opp_score     int;
  v_is_winner     boolean;
  v_rows_inserted int;
BEGIN
  -- Caller must be authenticated
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = 'P0001';
  END IF;

  -- Reject empty or null placements
  IF p_placements IS NULL OR jsonb_array_length(p_placements) < 1 THEN
    RAISE EXCEPTION 'Placements array must not be empty' USING errcode = 'P0002';
  END IF;

  -- Lock the match row to serialise concurrent submissions
  SELECT * INTO v_match FROM public.h2h_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found' USING errcode = 'P0003';
  END IF;

  -- Caller must be a participant in this specific match
  IF v_match.player1_id != v_caller AND v_match.player2_id != v_caller THEN
    RAISE EXCEPTION 'User does not belong to this match' USING errcode = 'P0004';
  END IF;

  -- Match must be active
  IF v_match.status != 'active' THEN
    RAISE EXCEPTION 'Match is not active (status: %)', v_match.status USING errcode = 'P0005';
  END IF;

  -- Re-derive score server-side based on duel_mode
  IF v_match.duel_mode IN ('vs', 'top10') THEN
    -- VS / Top10: score = count of rounds where wasCorrect is true
    v_max_score := jsonb_array_length(p_placements);
    FOR v_elem IN SELECT jsonb_array_elements(p_placements) LOOP
      IF (v_elem->>'wasCorrect')::boolean THEN
        v_score := v_score + 1;
      END IF;
    END LOOP;
  ELSE
    -- Classic: GREATEST(10 - diff, 1) per placement, max = placements * 10
    v_max_score := jsonb_array_length(p_placements) * 10;
    FOR v_elem IN SELECT jsonb_array_elements(p_placements) LOOP
      v_placed := (v_elem->>'placedRank')::int;
      v_min    := (v_elem->>'correctRankMin')::int;
      v_max    := (v_elem->>'correctRankMax')::int;

      IF v_placed >= v_min AND v_placed <= v_max THEN
        v_diff := 0;
      ELSIF v_placed < v_min THEN
        v_diff := v_min - v_placed;
      ELSE
        v_diff := v_placed - v_max;
      END IF;

      v_points := GREATEST(10 - v_diff, 1);
      v_score  := v_score + v_points;
    END LOOP;
  END IF;

  -- First-submission-wins: if a result row already exists, do nothing
  INSERT INTO public.h2h_results (match_id, user_id, placements, score, max_score)
  VALUES (p_match_id, v_caller, p_placements, v_score, v_max_score)
  ON CONFLICT (match_id, user_id) DO NOTHING;

  GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;

  -- Duplicate submission: return the committed score
  IF v_rows_inserted = 0 THEN
    SELECT score, max_score INTO v_score, v_max_score
    FROM public.h2h_results
    WHERE match_id = p_match_id AND user_id = v_caller;
  END IF;

  -- Determine opponent for winner comparison
  v_opponent_id := CASE WHEN v_caller = v_match.player1_id
                        THEN v_match.player2_id
                        ELSE v_match.player1_id
                   END;

  SELECT score INTO v_opp_score
  FROM public.h2h_results
  WHERE match_id = p_match_id AND user_id = v_opponent_id;

  v_is_winner := CASE WHEN v_opp_score IS NULL THEN NULL
                      ELSE (v_score > v_opp_score)
                 END;

  -- Mark match finished once both results are recorded
  SELECT COUNT(*) = 2 INTO v_both_done
  FROM public.h2h_results
  WHERE match_id = p_match_id;

  IF v_both_done THEN
    UPDATE public.h2h_matches SET status = 'finished' WHERE id = p_match_id;
  END IF;

  RETURN jsonb_build_object(
    'score',     v_score,
    'max_score', v_max_score,
    'is_winner', v_is_winner
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verify_and_save_duel_result(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_and_save_duel_result(uuid, jsonb) TO authenticated;
