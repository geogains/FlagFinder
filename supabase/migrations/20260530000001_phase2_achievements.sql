-- ================================================================
-- Phase 2 — Achievement Architecture, Specialist System, and
--            playable_count-aware Evaluation
-- 2026-05-30
--
-- Overview:
--   1. Expand achievements table (specialist_category_id, specialist_tier)
--   2. Update category CHECK constraint to include new tiers
--   3. Reclassify founding_explorer → platinum
--   4. Fix perfect_score description
--   5. Insert Bronze / Silver / Gold / Platinum achievement definitions
--   6. Insert Specialist Tier I + Tier II definitions (data-driven)
--   7. Replace evaluate_and_award_achievements() with two-loop architecture:
--        Loop 1 — named achievements (CASE)
--        Loop 2 — specialist achievements (generic, no per-category CASE)
--
-- Data preserved: all existing user_achievements, user_equipped_badges,
-- badge keys, and achievement keys are unchanged.
-- ================================================================

-- ── 1. Schema: extend achievements table ────────────────────────

ALTER TABLE public.achievements
  ADD COLUMN IF NOT EXISTS specialist_category_id integer,
  ADD COLUMN IF NOT EXISTS specialist_tier        integer
    CHECK (specialist_tier IS NULL OR specialist_tier IN (1, 2));

-- Expand category CHECK to cover new tiers.
-- The inline constraint is auto-named achievements_category_check by Postgres.
ALTER TABLE public.achievements
  DROP CONSTRAINT IF EXISTS achievements_category_check;

ALTER TABLE public.achievements
  ADD CONSTRAINT achievements_category_check
  CHECK (category IN (
    'foundational', 'streak', 'exploration', 'performance',
    'mastery',      'founding',
    'bronze',       'silver',  'gold',       'platinum',    'specialist'
  ));

-- ── 2. Reclassify + fix existing achievement rows ────────────────

-- founding_explorer is a Platinum-tier achievement.
UPDATE public.achievements
   SET category = 'platinum'
 WHERE achievement_key = 'founding_explorer';

-- streak_7 / streak_30 are Gold-tier achievements.
-- Reclassifying so the Badge Collection section mapping is one-to-one
-- (Gold section = category 'gold', no 'streak' alias needed).
UPDATE public.achievements
   SET category = 'gold'
 WHERE achievement_key IN ('streak_7', 'streak_30');

-- streak_7 has no badge_key yet — assign one so Phase 4 can add artwork.
UPDATE public.achievements
   SET badge_key = 'badge_streak_7'
 WHERE achievement_key = 'streak_7';

-- gdp_master / population_expert are Specialist Tier II achievements.
-- Setting specialist_tier + specialist_category_id promotes them to generic
-- Loop 2 evaluation (Classic ≥ 90, VS score ≥ 1000, perfect Top 10),
-- matching every other T2 specialist. Legacy CASE branches in Loop 1 are
-- removed below; Loop 1 skips rows with specialist_category_id IS NOT NULL.
UPDATE public.achievements
   SET category              = 'specialist',
       specialist_tier       = 2,
       specialist_category_id = CASE achievement_key
                                  WHEN 'population_expert' THEN 1
                                  WHEN 'gdp_master'        THEN 3
                                END
 WHERE achievement_key IN ('gdp_master', 'population_expert');

-- Generalise the perfect_score description now that boards can be < 10 slots.
UPDATE public.achievements
   SET description = 'Achieve a perfect score — 100/100 in Classic or a perfect board in Top 10.'
 WHERE achievement_key = 'perfect_score';

-- ── 3. Bronze achievements ────────────────────────────────────────

INSERT INTO public.achievements
  (achievement_key, name, description, category, is_badge_reward, badge_key, sort_order)
VALUES
  ('bronze_first_steps',
   'First Steps',
   'Complete your first game on GeoRanks.',
   'bronze', false, 'badge_bronze_first_steps', 200),

  ('bronze_getting_started',
   'Getting Started',
   'Complete 5 games across any mode.',
   'bronze', false, 'badge_bronze_getting_started', 210),

  ('bronze_streak_starter',
   'Streak Starter',
   'Reach a 3-day daily challenge streak.',
   'bronze', false, 'badge_bronze_streak_starter', 220),

  ('bronze_fresh_face',
   'Fresh Face',
   'Upload a custom profile photo.',
   'bronze', false, 'badge_bronze_fresh_face', 240),

  ('bronze_explorer',
   'Explorer',
   'Play 3 different categories across any mode.',
   'bronze', false, 'badge_bronze_explorer', 250),

  ('bronze_first_blood',
   'First Blood',
   'Play your first head-to-head duel.',
   'bronze', false, 'badge_bronze_first_blood', 260),

  ('bronze_perfectionist',
   'Precision Master',
   'Achieve your first perfect score.',
   'bronze', false, 'badge_bronze_perfectionist', 270),

  ('bronze_daily_debut',
   'Daily Debut',
   'Complete your first daily challenge.',
   'bronze', false, 'badge_bronze_daily_debut', 280)

ON CONFLICT (achievement_key) DO NOTHING;

-- ── 4. Silver achievements ────────────────────────────────────────

INSERT INTO public.achievements
  (achievement_key, name, description, category, is_badge_reward, badge_key, sort_order)
VALUES
  ('silver_daily_warrior',
   'Daily Warrior',
   'Complete 10 daily challenges.',
   'silver', false, 'badge_silver_daily_warrior', 300),

  ('silver_quarter_century',
   'Quarter Century',
   'Complete 25 games across any mode.',
   'silver', false, 'badge_silver_quarter_century', 310),

  ('silver_world_traveller',
   'World Traveller',
   'Play 15 different categories across any mode.',
   'silver', false, 'badge_silver_world_traveller', 320),

  ('silver_geodex_initiate',
   'GeoDex Initiate',
   'Complete 25% of Specialist Tier I categories.',
   'silver', false, 'badge_silver_geodex_initiate', 330),

  ('silver_duel_veteran',
   'Duel Veteran',
   'Complete 10 head-to-head duels.',
   'silver', false, 'badge_silver_duel_veteran', 350),

  ('silver_top10_challenger',
   'Top 10 Challenger',
   'Achieve a perfect board in 10 different Top 10 categories.',
   'gold', false, 'badge_silver_top10_challenger', 445),

  ('silver_streak_keeper',
   'Streak Keeper',
   'Reach a 14-day daily challenge streak.',
   'silver', false, 'badge_silver_streak_keeper', 370)

ON CONFLICT (achievement_key) DO NOTHING;

-- ── 5. Gold achievements ──────────────────────────────────────────

INSERT INTO public.achievements
  (achievement_key, name, description, category, is_badge_reward, badge_key, sort_order)
VALUES
  ('gold_centurion',
   'Centurion',
   'Complete 100 games across any mode.',
   'gold', false, 'badge_gold_centurion', 400),

  ('gold_geography_scholar',
   'Geography Scholar',
   'Earn Tier II specialist mastery in 5 different categories.',
   'gold', false, 'badge_gold_geography_scholar', 410),

  ('gold_duel_master',
   'Duel Master',
   'Complete 50 head-to-head duels.',
   'gold', false, 'badge_gold_duel_master', 420),

  ('gold_precision_master',
   'Perfectionist',
   'Earn 20 perfect results across Classic and Top 10.',
   'gold', false, 'badge_gold_precision_master', 430),

  ('gold_game_mode_master',
   'Game Mode Master',
   'Play the same 5 categories in Classic, VS, and Top 10.',
   'gold', false, 'badge_gold_game_mode_master', 440)

ON CONFLICT (achievement_key) DO NOTHING;

-- ── 6. Platinum achievements ──────────────────────────────────────
-- Note: founding_explorer already exists and was reclassified above.
-- Two new rows only.

INSERT INTO public.achievements
  (achievement_key, name, description, category, is_badge_reward, badge_key, sort_order)
VALUES
  ('platinum_georanks_legend',
   'GeoRanks Legend',
   'Complete 500 games across any mode.',
   'platinum', false, 'badge_platinum_georanks_legend', 500),

  ('platinum_geodex_completionist',
   'GeoDex Completionist',
   'Complete all Specialist Tier I categories.',
   'platinum', false, 'badge_platinum_geodex_completionist', 510)

ON CONFLICT (achievement_key) DO NOTHING;

-- ── 7. Specialist Tier I (37 categories) ──────────────────────────
-- Requirement: play the category in Classic, VS, and Top 10.
-- is_badge_reward = false: badge artwork added in Phase 3.
-- badge_key established now so Phase 3 only needs to update is_badge_reward
-- and add badge_image_url + BADGE_META without changing keys.

INSERT INTO public.achievements
  (achievement_key, name, description, category,
   is_badge_reward, badge_key, sort_order,
   specialist_category_id, specialist_tier)
VALUES
  ('specialist_population_t1',   'Census Taker',           'Play Population in Classic, VS, and Top 10.',             'specialist', false, 'badge_population_t1',    1001, 1,  1),
  ('specialist_altitude_t1',     'Summit Chaser',          'Play Highest Altitude in Classic, VS, and Top 10.',        'specialist', false, 'badge_altitude_t1',      1002, 2,  1),
  ('specialist_gdp_t1',          'GDP Grinder',            'Play GDP Per Capita in Classic, VS, and Top 10.',          'specialist', false, 'badge_gdp_t1',           1003, 3,  1),
  ('specialist_happiness_t1',    'Joy Seeker',             'Play Happiness Index in Classic, VS, and Top 10.',         'specialist', false, 'badge_happiness_t1',     1004, 4,  1),
  ('specialist_forest_t1',       'Forest Wanderer',        'Play Forest Cover in Classic, VS, and Top 10.',            'specialist', false, 'badge_forest_t1',        1005, 5,  1),
  ('specialist_coastline_t1',    'Shore Explorer',         'Play Coastline Length in Classic, VS, and Top 10.',        'specialist', false, 'badge_coastline_t1',     1006, 6,  1),
  ('specialist_cuisine_t1',      'Food Lover',             'Play Cuisine Ranking in Classic, VS, and Top 10.',         'specialist', false, 'badge_cuisine_t1',       1007, 7,  1),
  ('specialist_olympic_t1',      'Olympic Fan',            'Play Olympic Medals in Classic, VS, and Top 10.',          'specialist', false, 'badge_olympic_t1',       1008, 8,  1),
  ('specialist_worldcup_t1',     'Football Fan',           'Play World Cup Winners in Classic, VS, and Top 10.',       'specialist', false, 'badge_worldcup_t1',      1009, 9,  1),
  ('specialist_landmass_t1',     'Land Mapper',            'Play Landmass in Classic, VS, and Top 10.',                'specialist', false, 'badge_landmass_t1',      1010, 10, 1),
  ('specialist_crimerate_t1',    'Crime Watcher',          'Play Crime Rate in Classic, VS, and Top 10.',              'specialist', false, 'badge_crimerate_t1',     1011, 11, 1),
  ('specialist_passport_t1',     'Frequent Flyer',         'Play Passport Power in Classic, VS, and Top 10.',          'specialist', false, 'badge_passport_t1',      1012, 12, 1),
  ('specialist_beer_t1',         'Beer Enthusiast',        'Play Beer Consumption in Classic, VS, and Top 10.',        'specialist', false, 'badge_beer_t1',          1013, 13, 1),
  ('specialist_nobelprize_t1',   'Nobel Follower',         'Play Nobel Prize Winners in Classic, VS, and Top 10.',     'specialist', false, 'badge_nobelprize_t1',    1014, 14, 1),
  ('specialist_temperature_t1',  'Weather Watcher',        'Play Temperature in Classic, VS, and Top 10.',             'specialist', false, 'badge_temperature_t1',   1015, 15, 1),
  ('specialist_rainfall_t1',     'Rain Chaser',            'Play Rainfall in Classic, VS, and Top 10.',                'specialist', false, 'badge_rainfall_t1',      1016, 16, 1),
  ('specialist_tourism_t1',      'Tourist Scout',          'Play Tourism in Classic, VS, and Top 10.',                 'specialist', false, 'badge_tourism_t1',       1017, 17, 1),
  ('specialist_michelin_t1',     'Food Explorer',          'Play Michelin Stars in Classic, VS, and Top 10.',          'specialist', false, 'badge_michelin_t1',      1018, 18, 1),
  ('specialist_bigmac_t1',       'Price Tracker',          'Play Big Mac Index in Classic, VS, and Top 10.',           'specialist', false, 'badge_bigmac_t1',        1019, 19, 1),
  ('specialist_lifeexpectancy_t1','Life Tracker',          'Play Life Expectancy in Classic, VS, and Top 10.',         'specialist', false, 'badge_lifeexpectancy_t1',1020, 20, 1),
  ('specialist_marriageage_t1',  'Life Stage Watcher',     'Play Marriage Age in Classic, VS, and Top 10.',            'specialist', false, 'badge_marriageage_t1',   1021, 21, 1),
  ('specialist_sexratio_t1',     'Demographics Fan',       'Play Sex Ratio in Classic, VS, and Top 10.',               'specialist', false, 'badge_sexratio_t1',      1022, 22, 1),
  ('specialist_tallestbuilding_t1','Sky Gazer',            'Play Tallest Buildings in Classic, VS, and Top 10.',       'specialist', false, 'badge_tallestbuilding_t1',1023,23, 1),
  ('specialist_density_t1',      'Crowd Watcher',          'Play Population Density in Classic, VS, and Top 10.',      'specialist', false, 'badge_density_t1',       1024, 24, 1),
  ('specialist_carexports_t1',   'Auto Enthusiast',        'Play Car Exports in Classic, VS, and Top 10.',             'specialist', false, 'badge_carexports_t1',    1025, 25, 1),
  ('specialist_militarypersonel_t1','Military Recruit',    'Play Military Personnel in Classic, VS, and Top 10.',      'specialist', false, 'badge_militarypersonel_t1',1026,26,1),
  ('specialist_rent_t1',         'Cost of Living Watcher', 'Play Rent Prices in Classic, VS, and Top 10.',             'specialist', false, 'badge_rent_t1',          1027, 27, 1),
  ('specialist_poorestgdp_t1',   'Development Watcher',   'Play Poorest GDP in Classic, VS, and Top 10.',             'specialist', false, 'badge_poorestgdp_t1',    1028, 28, 1),
  ('specialist_university_t1',   'Campus Explorer',        'Play University Rankings in Classic, VS, and Top 10.',     'specialist', false, 'badge_university_t1',    1029, 29, 1),
  ('specialist_volcano_t1',      'Volcano Chaser',         'Play Most Volcanoes in Classic, VS, and Top 10.',          'specialist', false, 'badge_volcano_t1',       1030, 30, 1),
  ('specialist_flamingo_t1',     'Nature Watcher',         'Play Flamingo Population in Classic, VS, and Top 10.',     'specialist', false, 'badge_flamingo_t1',      1031, 31, 1),
  ('specialist_disasterrisk_t1', 'Risk Watcher',           'Play Disaster Risk in Classic, VS, and Top 10.',           'specialist', false, 'badge_disasterrisk_t1',  1032, 32, 1),
  ('specialist_longestriver_t1', 'River Explorer',         'Play Longest Rivers in Classic, VS, and Top 10.',          'specialist', false, 'badge_longestriver_t1',  1033, 33, 1),
  ('specialist_renewableenergy_t1','Green Watcher',        'Play Renewable Energy in Classic, VS, and Top 10.',        'specialist', false, 'badge_renewableenergy_t1',1034,34, 1),
  ('specialist_millionaires_t1', 'Wealth Watcher',         'Play Millionaires in Classic, VS, and Top 10.',            'specialist', false, 'badge_millionaires_t1',  1035, 35, 1),
  ('specialist_gm_t1',           'Chess Enthusiast',        'Play Grandmasters in Classic, VS, and Top 10.',            'specialist', false, 'badge_gm_t1',            1036, 36, 1),
  ('specialist_f1_t1',           'Race Fan',               'Play F1 Titles in Classic, VS, and Top 10.',               'specialist', false, 'badge_f1_t1',            1037, 37, 1)

ON CONFLICT (achievement_key) DO NOTHING;

-- ── 8. Specialist Tier II (35 new rows — 37 total) ───────────────────
-- Population (1) and GDP (3) Tier II are the existing population_expert
-- and gdp_master rows, reclassified to 'specialist' in section 2 above.
-- No new rows for categories 1 or 3 — they are already present.
--
-- Mastery thresholds (enforced in RPC Loop 2):
--   Classic  : score >= 90
--   VS       : score >= 1000  (= 10 correct × 100 pts each)
--   Top 10   : correct_count = COALESCE(playable_count, 10)  [perfect board]
--
-- is_badge_reward = false: Phase 3 flips this and adds badge_image_url + BADGE_META.
-- badge_key established now for Phase 3 continuity (no key changes needed).
-- badge_name stored for popup display in achievement notifications.

INSERT INTO public.achievements
  (achievement_key, name, description, category,
   is_badge_reward, badge_key, badge_name, sort_order,
   specialist_category_id, specialist_tier)
VALUES
  ('specialist_altitude_t2',      'Altitude Expert',           'Master Highest Altitude — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',      'specialist', false, 'badge_altitude_t2',      'Altitude Expert',           2002, 2,  2),
  ('specialist_happiness_t2',     'Happiness Guru',            'Master Happiness Index — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',        'specialist', false, 'badge_happiness_t2',     'Happiness Guru',            2004, 4,  2),
  ('specialist_forest_t2',        'Forest Ranger',             'Master Forest Cover — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',            'specialist', false, 'badge_forest_t2',        'Forest Ranger',             2005, 5,  2),
  ('specialist_coastline_t2',     'Coastline Cartographer',    'Master Coastline Length — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',        'specialist', false, 'badge_coastline_t2',     'Coastline Cartographer',    2006, 6,  2),
  ('specialist_cuisine_t2',       'Culinary Master',           'Master Cuisine Ranking — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',         'specialist', false, 'badge_cuisine_t2',       'Culinary Master',           2007, 7,  2),
  ('specialist_olympic_t2',       'Olympic Scholar',           'Master Olympic Medals — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',          'specialist', false, 'badge_olympic_t2',       'Olympic Scholar',           2008, 8,  2),
  ('specialist_worldcup_t2',      'World Cup Historian',       'Master World Cup — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',               'specialist', false, 'badge_worldcup_t2',      'World Cup Historian',       2009, 9,  2),
  ('specialist_landmass_t2',      'Territory Expert',          'Master Landmass — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',                'specialist', false, 'badge_landmass_t2',      'Territory Expert',          2010, 10, 2),
  ('specialist_crimerate_t2',     'Crime Analyst',             'Master Crime Rate — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',              'specialist', false, 'badge_crimerate_t2',     'Crime Analyst',             2011, 11, 2),
  ('specialist_passport_t2',      'Passport Collector',        'Master Passport Power — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',          'specialist', false, 'badge_passport_t2',      'Passport Collector',        2012, 12, 2),
  ('specialist_beer_t2',          'Beer Connoisseur',          'Master Beer Consumption — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',        'specialist', false, 'badge_beer_t2',          'Beer Connoisseur',          2013, 13, 2),
  ('specialist_nobelprize_t2',    'Nobel Scholar',             'Master Nobel Prize Winners — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',     'specialist', false, 'badge_nobelprize_t2',    'Nobel Scholar',             2014, 14, 2),
  ('specialist_temperature_t2',   'Climate Expert',            'Master Temperature — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',             'specialist', false, 'badge_temperature_t2',   'Climate Expert',            2015, 15, 2),
  ('specialist_rainfall_t2',      'Precipitation Expert',      'Master Rainfall — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',                'specialist', false, 'badge_rainfall_t2',      'Precipitation Expert',      2016, 16, 2),
  ('specialist_tourism_t2',       'Tourism Expert',            'Master Tourism — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',                 'specialist', false, 'badge_tourism_t2',       'Tourism Expert',            2017, 17, 2),
  ('specialist_michelin_t2',      'Michelin Master',           'Master Michelin Stars — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',          'specialist', false, 'badge_michelin_t2',      'Michelin Master',           2018, 18, 2),
  ('specialist_bigmac_t2',        'Big Mac Economist',         'Master Big Mac Index — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',           'specialist', false, 'badge_bigmac_t2',        'Big Mac Economist',         2019, 19, 2),
  ('specialist_lifeexpectancy_t2','Longevity Expert',          'Master Life Expectancy — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',         'specialist', false, 'badge_lifeexpectancy_t2','Longevity Expert',          2020, 20, 2),
  ('specialist_marriageage_t2',   'Marriage Age Analyst',      'Master Marriage Age — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',            'specialist', false, 'badge_marriageage_t2',   'Marriage Age Analyst',      2021, 21, 2),
  ('specialist_sexratio_t2',      'Demographics Expert',       'Master Sex Ratio — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',               'specialist', false, 'badge_sexratio_t2',      'Demographics Expert',       2022, 22, 2),
  ('specialist_tallestbuilding_t2','Architecture Expert',      'Master Tallest Buildings — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',       'specialist', false, 'badge_tallestbuilding_t2','Architecture Expert',      2023, 23, 2),
  ('specialist_density_t2',       'Density Expert',            'Master Population Density — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',      'specialist', false, 'badge_density_t2',       'Density Expert',            2024, 24, 2),
  ('specialist_carexports_t2',    'Car Export Expert',         'Master Car Exports — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',             'specialist', false, 'badge_carexports_t2',    'Car Export Expert',         2025, 25, 2),
  ('specialist_militarypersonel_t2','Military Analyst',        'Master Military Personnel — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',      'specialist', false, 'badge_militarypersonel_t2','Military Analyst',        2026, 26, 2),
  ('specialist_rent_t2',          'Real Estate Expert',        'Master Rent Prices — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',             'specialist', false, 'badge_rent_t2',          'Real Estate Expert',        2027, 27, 2),
  ('specialist_poorestgdp_t2',    'Development Expert',        'Master Poorest GDP — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',             'specialist', false, 'badge_poorestgdp_t2',    'Development Expert',        2028, 28, 2),
  ('specialist_university_t2',    'Academic Expert',           'Master University Rankings — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',     'specialist', false, 'badge_university_t2',    'Academic Expert',           2029, 29, 2),
  ('specialist_volcano_t2',       'Volcanologist',             'Master Most Volcanoes — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',          'specialist', false, 'badge_volcano_t2',       'Volcanologist',             2030, 30, 2),
  ('specialist_flamingo_t2',      'Flamingo Expert',           'Master Flamingo Population — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',     'specialist', false, 'badge_flamingo_t2',      'Flamingo Expert',           2031, 31, 2),
  ('specialist_disasterrisk_t2',  'Risk Analyst',              'Master Disaster Risk — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',           'specialist', false, 'badge_disasterrisk_t2',  'Risk Analyst',              2032, 32, 2),
  ('specialist_longestriver_t2',  'Hydrologist',               'Master Longest Rivers — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',          'specialist', false, 'badge_longestriver_t2',  'Hydrologist',               2033, 33, 2),
  ('specialist_renewableenergy_t2','Energy Expert',            'Master Renewable Energy — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',        'specialist', false, 'badge_renewableenergy_t2','Energy Expert',            2034, 34, 2),
  ('specialist_millionaires_t2',  'Wealth Expert',             'Master Millionaires — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',            'specialist', false, 'badge_millionaires_t2',  'Wealth Expert',             2035, 35, 2),
  ('specialist_gm_t2',            'Grandmaster Scholar',       'Master Grandmasters — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',           'specialist', false, 'badge_gm_t2',            'Grandmaster Scholar',       2036, 36, 2),
  ('specialist_f1_t2',            'F1 Historian',              'Master F1 Titles — 90+ in Classic, 1000+ in VS, and a perfect board in Top 10.',               'specialist', false, 'badge_f1_t2',            'F1 Historian',              2037, 37, 2)

ON CONFLICT (achievement_key) DO NOTHING;

-- ── 9. evaluate_and_award_achievements() replacement ─────────────
-- Two-loop architecture:
--   Loop 1 — named achievements (CASE): foundational, streak, exploration,
--             performance, mastery, founding, bronze, silver, gold, platinum.
--   Loop 2 — specialist achievements (generic): uses specialist_category_id
--             and specialist_tier to evaluate without per-category CASE branches.
--
-- Performance: all earned achievement keys are pre-fetched as a text[] array.
-- Loop iterations skip already-earned achievements via array membership (= ANY),
-- avoiding per-row EXISTS subqueries against user_achievements.

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
  v_daily_count       bigint;
  v_duel_count        bigint;
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

  -- Founding cutoff (Phase 3D rollout date)
  FOUNDING_CUTOFF   CONSTANT timestamptz := '2026-05-23 00:00:00+00';

BEGIN
  IF v_uid IS NULL THEN RETURN '[]'::jsonb; END IF;

  -- ── Pre-fetch earned achievement keys ─────────────────────────────
  -- One query instead of per-row EXISTS inside the loop.
  SELECT ARRAY_AGG(achievement_key) INTO v_earned_keys
    FROM public.user_achievements
   WHERE user_id = v_uid;
  v_earned_keys := COALESCE(v_earned_keys, ARRAY[]::text[]);

  -- ── Data gathering ────────────────────────────────────────────────

  SELECT COUNT(*)               INTO v_games_count FROM public.game_sessions WHERE user_id = v_uid;
  SELECT COUNT(*)               INTO v_daily_count  FROM public.daily_challenge_scores WHERE user_id = v_uid AND completed = true;
  SELECT COUNT(*)               INTO v_duel_count   FROM public.game_sessions WHERE user_id = v_uid AND game_mode = 'duel';
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

      WHEN 'platinum_geodex_completionist'  THEN v_condition_met := v_specialist_t1_count >= 37;

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
