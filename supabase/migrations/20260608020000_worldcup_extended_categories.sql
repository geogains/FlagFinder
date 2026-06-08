-- ================================================================
-- Add 3 World Cup categories (IDs 38-40): worldcupgoals,
-- worldcupappearances, worldcupwins.
-- 2026-06-08
--
-- All three are FREE categories (capitalizing on World Cup interest —
-- accessible to every GeoRanks user regardless of subscription tier).
--
-- This migration:
--   0. Inserts 3 rows into the categories table (IDs 38-40).
--      categories(id, name) is the FK parent for category_scores,
--      vs_scores, top10_best_scores, and game_sessions. Without these
--      rows score saves raise a FK violation (409 Conflict).
--   1. Inserts 3 Specialist Tier I achievement rows (category_id 38-40)
--   2. Inserts 3 Specialist Tier II achievement rows (category_id 38-40)
--   3. Replaces evaluate_and_award_achievements() — the ONLY change is
--      platinum_geodex_completionist threshold 37 → 40 (Tier I count
--      now spans 40 categories). No other condition/logic changes.
--   4. Replaces can_access_category() — the change is adding
--      38, 39, 40 to the free-category-id array (the 3 new categories
--      are free), and adding 9 (worldcup), since the original World Cup
--      Trophies category is also being made free in this release.
-- ================================================================

-- ── 0. categories table rows ────────────────────────────────────────
-- categories(id, name) is the FK parent for every score table.
-- ID 9 (worldcup) already exists; ON CONFLICT DO NOTHING is safe.
-- IDs 38-40 are new and must be inserted before any score row for
-- those categories can be saved.
INSERT INTO public.categories (id, name) VALUES
  (38, 'worldcupgoals'),
  (39, 'worldcupappearances'),
  (40, 'worldcupwins')
ON CONFLICT (id) DO NOTHING;

-- ── 1. Specialist Tier I achievements (participation) ──────────────
INSERT INTO public.achievements
  (achievement_key, name, description, category,
   is_badge_reward, badge_key, sort_order,
   specialist_category_id, specialist_tier)
VALUES
  ('specialist_worldcupgoals_t1',       'World Cup Goals Expert I',       'Play World Cup Goals in Classic, VS, and Top 10.',       'specialist', false, 'badge_worldcupgoals_t1',       1038, 38, 1),
  ('specialist_worldcupappearances_t1', 'World Cup Appearances Expert I', 'Play World Cup Appearances in Classic, VS, and Top 10.', 'specialist', false, 'badge_worldcupappearances_t1', 1039, 39, 1),
  ('specialist_worldcupwins_t1',        'World Cup Wins Expert I',        'Play World Cup Wins in Classic, VS, and Top 10.',         'specialist', false, 'badge_worldcupwins_t1',        1040, 40, 1)
ON CONFLICT (achievement_key) DO NOTHING;

-- ── 2. Specialist Tier II achievements (mastery) ───────────────────
INSERT INTO public.achievements
  (achievement_key, name, description, category,
   is_badge_reward, badge_key, badge_name, sort_order,
   specialist_category_id, specialist_tier)
VALUES
  ('specialist_worldcupgoals_t2',       'World Cup Goals Expert II',       'Master World Cup Goals — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',       'specialist', false, 'badge_worldcupgoals_t2',       'World Cup Goals Expert II',       2038, 38, 2),
  ('specialist_worldcupappearances_t2', 'World Cup Appearances Expert II', 'Master World Cup Appearances — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.', 'specialist', false, 'badge_worldcupappearances_t2', 'World Cup Appearances Expert II', 2039, 39, 2),
  ('specialist_worldcupwins_t2',        'World Cup Wins Expert II',        'Master World Cup Wins — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',         'specialist', false, 'badge_worldcupwins_t2',        'World Cup Wins Expert II',        2040, 40, 2)
ON CONFLICT (achievement_key) DO NOTHING;

-- ── 3. evaluate_and_award_achievements ──────────────────────────────
-- Drop-in CREATE OR REPLACE of the active version
-- (20260608010000_fix_founding_cutoff_to_launch_time.sql).
-- The ONLY change is platinum_geodex_completionist: 37 → 40, reflecting
-- that there are now 40 Specialist Tier I categories to complete.

CREATE OR REPLACE FUNCTION public.evaluate_and_award_achievements()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid               uuid    := auth.uid();
  v_earned_keys       text[];

  -- Game counts
  v_games_count       bigint;
  v_games_count_hist  bigint;
  v_daily_count       bigint;
  v_duel_count        bigint;
  v_duel_count_hist   bigint;
  v_mode_count        bigint;

  -- Streak
  v_streak            int;
  v_longest           int;

  -- Category exploration
  v_cat_count         bigint;
  v_top10_cat_count   bigint;

  -- Perfect scores
  v_classic_perf      boolean;
  v_top10_perf        boolean;
  v_top10_perfect_count bigint;

  -- Classic 90+ category count (for precision_master)
  v_classic_cats_90_count bigint;

  -- Specialist Tier I earned count (for geodex_initiate, geodex_completionist)
  v_specialist_t1_count bigint;

  -- Specialist Tier II earned count (for geography_scholar)
  v_specialist_t2_count bigint;

  -- Founding status
  v_is_founder        boolean;

  -- Loop state
  v_condition_met     boolean;
  v_newly_awarded     jsonb   := '[]'::jsonb;
  v_ach               RECORD;

  -- ── Thresholds ───────────────────────────────────────────────────
  -- Specialist Tier II (all categories, including gdp_master / population_expert)
  SPEC_CLASSIC      CONSTANT int := 90;
  SPEC_VS_SCORE     CONSTANT int := 1000;  -- score (= 10 correct × 100 pts)

  -- Founding cutoff = GeoRanks 2.0 production launch timestamp
  -- (Vercel prod deploy of commit 127ae9d, 2026-06-07 21:25:33 +01:00 BST)
  FOUNDING_CUTOFF   CONSTANT timestamptz := '2026-06-07 20:25:33+00';

BEGIN
  IF v_uid IS NULL THEN RETURN '[]'::jsonb; END IF;

  -- ── Pre-fetch earned achievement keys ─────────────────────────────
  -- One query instead of per-row EXISTS inside the loop.
  SELECT ARRAY_AGG(achievement_key) INTO v_earned_keys
    FROM public.user_achievements
   WHERE user_id = v_uid;
  v_earned_keys := COALESCE(v_earned_keys, ARRAY[]::text[]);

  -- ── Data gathering ────────────────────────────────────────────────

  -- Live counts — the canonical source once game_sessions is populated.
  SELECT COUNT(*) INTO v_games_count
    FROM public.game_sessions WHERE user_id = v_uid;

  SELECT COUNT(*) INTO v_duel_count
    FROM public.game_sessions WHERE user_id = v_uid AND game_mode = 'duel';

  -- Historical lower-bound estimate — sums distinct best-score rows across
  -- every legacy mode table. Each row represents at least one completed
  -- game, so the sum can only under-count true plays, never over-count.
  SELECT
      (SELECT COUNT(*) FROM public.category_scores        WHERE user_id = v_uid)
    + (SELECT COUNT(*) FROM public.top10_best_scores      WHERE user_id = v_uid)
    + (SELECT COUNT(*) FROM public.vs_scores              WHERE user_id = v_uid)
    + (SELECT COUNT(*) FROM public.daily_challenge_scores WHERE user_id = v_uid AND completed = true)
    + (SELECT COUNT(*) FROM public.h2h_results            WHERE user_id = v_uid)
    INTO v_games_count_hist;

  -- h2h_results: one row per finished duel per user (UNIQUE(match_id, user_id)) —
  -- this is an exact historical duel count, not an estimate.
  SELECT COUNT(*) INTO v_duel_count_hist
    FROM public.h2h_results WHERE user_id = v_uid;

  -- GREATEST() is self-obsoleting: as game_sessions accumulates real rows,
  -- the live count overtakes the frozen historical figure permanently.
  v_games_count := GREATEST(v_games_count, v_games_count_hist);
  v_duel_count  := GREATEST(v_duel_count,  v_duel_count_hist);

  SELECT COUNT(*)               INTO v_daily_count  FROM public.daily_challenge_scores WHERE user_id = v_uid AND completed = true;
  SELECT COUNT(DISTINCT game_mode) INTO v_mode_count FROM public.game_sessions WHERE user_id = v_uid;

  SELECT current_streak, longest_streak INTO v_streak, v_longest
    FROM public.user_streaks WHERE user_id = v_uid;
  v_streak  := COALESCE(v_streak, 0);
  v_longest := COALESCE(v_longest, 0);

  -- Cross-mode category exploration (union covers all modes + daily)
  SELECT COUNT(DISTINCT category_id) INTO v_cat_count FROM (
    SELECT category_id FROM public.category_scores        WHERE user_id = v_uid
    UNION
    SELECT category_id FROM public.top10_best_scores      WHERE user_id = v_uid
    UNION
    SELECT category_id FROM public.vs_scores              WHERE user_id = v_uid
    UNION
    SELECT category_id FROM public.daily_challenge_scores WHERE user_id = v_uid AND completed = true
  ) sub;

  SELECT COUNT(DISTINCT category_id) INTO v_top10_cat_count
    FROM public.top10_best_scores WHERE user_id = v_uid;

  -- Perfect Classic: category_scores (retroactive) OR game_sessions (forward)
  SELECT (
    EXISTS(SELECT 1 FROM public.category_scores  WHERE user_id = v_uid AND score = 100)
    OR
    EXISTS(SELECT 1 FROM public.game_sessions    WHERE user_id = v_uid AND game_mode = 'classic' AND score = 100)
  ) INTO v_classic_perf;

  -- Perfect Top 10: correct_count = COALESCE(playable_count, 10)
  -- COALESCE handles pre-Phase-1 rows (NULL playable_count → treat as 10).
  SELECT EXISTS(
    SELECT 1 FROM public.top10_best_scores
    WHERE user_id = v_uid
      AND correct_count = COALESCE(playable_count, 10)
  ) INTO v_top10_perf;

  -- Count of Top 10 categories with a perfect board (for top10_challenger)
  SELECT COUNT(DISTINCT category_id) INTO v_top10_perfect_count
    FROM public.top10_best_scores
   WHERE user_id = v_uid
     AND correct_count = COALESCE(playable_count, 10);

  -- Classic categories with score >= 90 (for precision_master)
  SELECT COUNT(DISTINCT category_id) INTO v_classic_cats_90_count
    FROM public.category_scores
   WHERE user_id = v_uid AND score >= 90;

  -- Count earned specialist Tier I achievements (for geodex_initiate + geodex_completionist).
  SELECT COUNT(*) INTO v_specialist_t1_count
    FROM public.achievements
   WHERE achievement_key = ANY(v_earned_keys)
     AND specialist_tier = 1;

  -- Count earned specialist Tier II achievements (for geography_scholar).
  SELECT COUNT(*) INTO v_specialist_t2_count
    FROM public.achievements
   WHERE achievement_key = ANY(v_earned_keys)
     AND specialist_tier = 2;

  -- Founding status
  SELECT (created_at < FOUNDING_CUTOFF) INTO v_is_founder FROM auth.users WHERE id = v_uid;
  v_is_founder := COALESCE(v_is_founder, false);

  -- ── Loop 1: Named achievements ────────────────────────────────────
  -- Covers: foundational, streak, exploration, performance, founding,
  --         bronze, silver, gold, platinum.
  -- Skips specialist rows (specialist_category_id IS NULL filter);
  -- gdp_master and population_expert are handled by Loop 2 after Phase 2 migration.
  FOR v_ach IN
    SELECT achievement_key, name, description, category,
           is_badge_reward, badge_key, badge_name
      FROM public.achievements
     WHERE is_active = true
       AND specialist_category_id IS NULL
     ORDER BY sort_order
  LOOP
    CONTINUE WHEN v_ach.achievement_key = ANY(v_earned_keys);

    v_condition_met := false;

    CASE v_ach.achievement_key

      -- ── Existing foundational / streak / exploration / performance / mastery ──

      WHEN 'first_game'             THEN v_condition_met := v_games_count >= 1;
      WHEN 'games_10'               THEN v_condition_met := v_games_count >= 10;
      WHEN 'games_100'              THEN v_condition_met := v_games_count >= 100;

      WHEN 'streak_7'               THEN v_condition_met := v_streak >= 7  OR v_longest >= 7;
      WHEN 'streak_30'              THEN v_condition_met := v_streak >= 30 OR v_longest >= 30;

      WHEN 'explorer_10'            THEN v_condition_met := v_cat_count >= 10;
      WHEN 'explorer_20'            THEN v_condition_met := v_cat_count >= 20;

      WHEN 'perfect_score'          THEN v_condition_met := v_classic_perf OR v_top10_perf;

      WHEN 'founding_explorer'      THEN v_condition_met := v_is_founder;

      -- ── Bronze ────────────────────────────────────────────────────

      WHEN 'bronze_first_steps'     THEN v_condition_met := v_games_count >= 1;
      WHEN 'bronze_getting_started' THEN v_condition_met := v_games_count >= 5;

      WHEN 'bronze_streak_starter'  THEN v_condition_met := v_streak >= 3 OR v_longest >= 3;

      WHEN 'bronze_fresh_face' THEN
        SELECT (
          avatar_url IS NOT NULL
          AND trim(avatar_url) <> ''
          AND avatar_url NOT ILIKE '%profile-icon.jpg%'
        ) INTO v_condition_met
          FROM public.users WHERE id = v_uid;

      WHEN 'bronze_explorer'        THEN v_condition_met := v_cat_count >= 3;

      WHEN 'bronze_first_blood'     THEN v_condition_met := v_duel_count >= 1;

      WHEN 'bronze_perfectionist'   THEN v_condition_met := v_classic_perf OR v_top10_perf;

      WHEN 'bronze_daily_debut'     THEN v_condition_met := v_daily_count >= 1;

      -- ── Silver ────────────────────────────────────────────────────

      WHEN 'silver_daily_warrior'   THEN v_condition_met := v_daily_count >= 10;
      WHEN 'silver_quarter_century' THEN v_condition_met := v_games_count >= 25;
      WHEN 'silver_world_traveller' THEN v_condition_met := v_cat_count >= 15;

      WHEN 'silver_geodex_initiate' THEN v_condition_met := v_specialist_t1_count >= 10;

      WHEN 'silver_duel_veteran'    THEN v_condition_met := v_duel_count >= 10;

      WHEN 'silver_streak_keeper'   THEN v_condition_met := v_streak >= 14 OR v_longest >= 14;

      -- ── Gold ──────────────────────────────────────────────────────

      WHEN 'silver_top10_challenger' THEN v_condition_met := v_top10_perfect_count >= 10;

      WHEN 'gold_centurion'         THEN v_condition_met := v_games_count >= 100;
      WHEN 'gold_geography_scholar' THEN v_condition_met := v_specialist_t2_count >= 5;
      WHEN 'gold_duel_master'       THEN v_condition_met := v_duel_count >= 50;
      WHEN 'gold_precision_master'  THEN
        -- 20 distinct (category, mode) perfect pairs.
        -- Classic perfect: score=100 in category_scores (retroactive) OR game_sessions (forward).
        -- Top 10 perfect: correct_count = COALESCE(playable_count, 10) in top10_best_scores.
        -- Each category contributes at most 1 point per mode, so max 2 per category.
        -- Repeated perfect runs in the same category-mode never add extra progress.
        -- VS and Duel are excluded — neither source table contains those modes.
        SELECT COUNT(*) >= 20 INTO v_condition_met
          FROM (
            SELECT DISTINCT category_id, 'classic' AS m
              FROM (
                SELECT category_id FROM public.category_scores
                 WHERE user_id = v_uid AND score = 100
                UNION
                SELECT category_id FROM public.game_sessions
                 WHERE user_id = v_uid AND game_mode = 'classic'
                   AND score = 100 AND category_id IS NOT NULL
              ) classic_cats
            UNION
            SELECT DISTINCT category_id, 'top10' AS m
              FROM public.top10_best_scores
             WHERE user_id = v_uid
               AND correct_count = COALESCE(playable_count, 10)
          ) pairs;

      WHEN 'gold_game_mode_master'  THEN
        -- Classic source: category_scores (retroactive) UNION game_sessions (forward).
        -- Matches the dual-track pattern used for v_classic_perf above.
        -- Protects against upsert_high_score not being deployed on fresh installs.
        SELECT COUNT(*) >= 5 INTO v_condition_met
          FROM (
            SELECT category_id FROM public.category_scores
             WHERE user_id = v_uid
            UNION
            SELECT category_id FROM public.game_sessions
             WHERE user_id = v_uid AND game_mode = 'classic' AND category_id IS NOT NULL
          ) classic
         WHERE category_id IN (SELECT category_id FROM public.vs_scores        WHERE user_id = v_uid)
           AND category_id IN (SELECT category_id FROM public.top10_best_scores WHERE user_id = v_uid);

      -- ── Platinum ──────────────────────────────────────────────────

      WHEN 'platinum_georanks_legend'       THEN v_condition_met := v_games_count >= 500;

      WHEN 'platinum_geodex_completionist'  THEN v_condition_met := v_specialist_t1_count >= 40;

      ELSE v_condition_met := false;

    END CASE;

    CONTINUE WHEN NOT v_condition_met;

    INSERT INTO public.user_achievements (user_id, achievement_key, source)
    VALUES (v_uid, v_ach.achievement_key, 'system')
    ON CONFLICT (user_id, achievement_key) DO NOTHING;

    IF FOUND THEN
      v_earned_keys   := v_earned_keys || ARRAY[v_ach.achievement_key];
      v_newly_awarded := v_newly_awarded || jsonb_build_object(
        'achievement_key', v_ach.achievement_key,
        'name',            v_ach.name,
        'description',     v_ach.description,
        'category',        v_ach.category,
        'is_badge_reward', v_ach.is_badge_reward,
        'badge_key',       v_ach.badge_key,
        'badge_name',      v_ach.badge_name
      );
    END IF;

  END LOOP;

  -- ── Loop 2: Specialist achievements (data-driven) ─────────────────
  -- No CASE branches. Each row in achievements with specialist_category_id IS NOT NULL
  -- is evaluated generically by tier.
  --
  -- Tier 1 — participation: played the category in Classic, VS, and Top 10.
  -- Tier 2 — mastery: Classic score >= 90, VS score >= 1000, Top 10 perfect board.

  FOR v_ach IN
    SELECT achievement_key, name, description, category,
           is_badge_reward, badge_key, badge_name,
           specialist_category_id, specialist_tier
      FROM public.achievements
     WHERE is_active = true
       AND specialist_category_id IS NOT NULL
     ORDER BY specialist_tier, specialist_category_id
  LOOP
    CONTINUE WHEN v_ach.achievement_key = ANY(v_earned_keys);

    v_condition_met := false;

    IF v_ach.specialist_tier = 1 THEN
      -- Participation: at least one session in each of the three main modes.
      SELECT (
        EXISTS(SELECT 1 FROM public.category_scores   WHERE user_id = v_uid AND category_id = v_ach.specialist_category_id)
        AND EXISTS(SELECT 1 FROM public.vs_scores     WHERE user_id = v_uid AND category_id = v_ach.specialist_category_id)
        AND EXISTS(SELECT 1 FROM public.top10_best_scores WHERE user_id = v_uid AND category_id = v_ach.specialist_category_id)
      ) INTO v_condition_met;

    ELSIF v_ach.specialist_tier = 2 THEN
      -- Mastery: meet thresholds in all three modes.
      -- VS uses score column (100 pts per correct answer, so 1000 = 10 correct).
      -- Top 10 uses perfect board: correct_count = COALESCE(playable_count, 10).
      SELECT (
        COALESCE((SELECT MAX(score) FROM public.category_scores WHERE user_id = v_uid AND category_id = v_ach.specialist_category_id), 0) >= SPEC_CLASSIC
        AND COALESCE((SELECT MAX(score) FROM public.vs_scores WHERE user_id = v_uid AND category_id = v_ach.specialist_category_id), 0) >= SPEC_VS_SCORE
        AND EXISTS(
          SELECT 1 FROM public.top10_best_scores
          WHERE user_id       = v_uid
            AND category_id   = v_ach.specialist_category_id
            AND correct_count = COALESCE(playable_count, 10)
        )
      ) INTO v_condition_met;

    END IF;

    CONTINUE WHEN NOT v_condition_met;

    INSERT INTO public.user_achievements (user_id, achievement_key, source)
    VALUES (v_uid, v_ach.achievement_key, 'system')
    ON CONFLICT (user_id, achievement_key) DO NOTHING;

    IF FOUND THEN
      v_earned_keys   := v_earned_keys || ARRAY[v_ach.achievement_key];
      v_newly_awarded := v_newly_awarded || jsonb_build_object(
        'achievement_key', v_ach.achievement_key,
        'name',            v_ach.name,
        'description',     v_ach.description,
        'category',        v_ach.category,
        'is_badge_reward', v_ach.is_badge_reward,
        'badge_key',       v_ach.badge_key,
        'badge_name',      v_ach.badge_name
      );
      -- Increment in-memory specialist T2 count so aggregate achievements
      -- evaluated in the SAME call (e.g., gold_geography_scholar in Loop 1)
      -- will benefit on the NEXT call.  Aggregate checks are Loop 1 and
      -- cannot retroactively use v_specialist_t2_count incremented here,
      -- but the array membership update ensures no double-award.
      IF v_ach.specialist_tier = 2 THEN
        v_specialist_t2_count := v_specialist_t2_count + 1;
      END IF;
    END IF;

  END LOOP;

  RETURN v_newly_awarded;
END;
$$;

GRANT EXECUTE ON FUNCTION public.evaluate_and_award_achievements() TO authenticated;

-- ── 4. can_access_category ───────────────────────────────────────────
-- Drop-in CREATE OR REPLACE of the active version
-- (20260606000000_fix_upsert_high_score.sql).
-- The change is adding 38, 39, 40 (worldcupgoals/worldcupappearances/
-- worldcupwins — new free categories) and 9 (worldcup — the original
-- World Cup Trophies category, now also made free) to the
-- free-category-id array.

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
  -- for the categories where premium: false.
  IF category_id_input = ANY(ARRAY[1, 2, 3, 5, 8, 9, 10, 12, 13, 38, 39, 40]) THEN
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

GRANT EXECUTE ON FUNCTION public.can_access_category(integer, boolean)
  TO authenticated, anon;
