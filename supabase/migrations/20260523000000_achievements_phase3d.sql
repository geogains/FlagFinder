-- ================================================================
-- Phase 3D — Achievements & Badge Prestige Foundation
-- 2026-05-23
--
-- Creates:
--   achievements          — canonical V1 achievement definitions
--   user_achievements     — unlock ledger (append-only, SECURITY DEFINER writes)
--   user_equipped_badges  — 3-slot badge curation per user
--   evaluate_and_award_achievements()  — centralized evaluation RPC
--   equip_badge(badge_key, slot)       — enforced equip with ownership check
-- ================================================================

-- ── TABLE 1: achievements ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.achievements (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_key text        UNIQUE NOT NULL,
  name            text        NOT NULL,
  description     text        NOT NULL,
  category        text        NOT NULL
                  CHECK (category IN ('foundational','streak','exploration','performance','mastery','founding')),
  is_badge_reward boolean     NOT NULL DEFAULT false,
  badge_key       text,
  badge_name      text,
  badge_image_url text,
  sort_order      integer     NOT NULL DEFAULT 0,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- Achievement definitions are public — profiles and game UI need them
CREATE POLICY "achievements_public_read"
  ON public.achievements FOR SELECT USING (true);

GRANT SELECT ON public.achievements TO anon, authenticated;

-- ── V1 Achievement Definitions ────────────────────────────────────
INSERT INTO public.achievements
  (achievement_key, name, description, category, is_badge_reward, badge_key, badge_name, sort_order)
VALUES
  ('first_game',
   'First Game',
   'Complete your first game on GeoRanks.',
   'foundational', false, null, null, 10),

  ('games_10',
   '10 Games Played',
   'Complete 10 games across any mode.',
   'foundational', false, null, null, 20),

  ('games_100',
   '100 Games Played',
   'Complete 100 games across any mode.',
   'foundational', false, null, null, 30),

  ('streak_7',
   '7-Day Streak',
   'Reach a 7-day daily challenge streak.',
   'streak', false, null, null, 40),

  ('streak_30',
   '30-Day Streak',
   'Reach a 30-day daily challenge streak.',
   'streak', true, 'badge_streak_30', '30-Day Streak', 50),

  ('explorer_10',
   'Category Explorer',
   'Complete 10 unique categories across any game mode.',
   'exploration', false, null, null, 60),

  ('explorer_20',
   'Worldly Player',
   'Complete 20 unique categories across any game mode.',
   'exploration', false, null, null, 70),

  ('perfect_score',
   'First Perfect Score',
   'Achieve a perfect score — 100/100 in Classic or 10/10 in Top 10.',
   'performance', false, null, null, 80),

  ('gdp_master',
   'GDP Master',
   'Demonstrate GDP expertise across Classic, VS Mode, and Top 10.',
   'mastery', true, 'badge_gdp_master', 'GDP Master', 90),

  ('population_expert',
   'Population Expert',
   'Demonstrate population expertise across Classic, VS Mode, and Top 10.',
   'mastery', true, 'badge_population_expert', 'Population Expert', 100),

  ('founding_explorer',
   'Founding Explorer',
   'An early adopter of GeoRanks — you were here before achievements existed.',
   'founding', true, 'badge_founding_explorer', 'Founding Explorer', 110)

ON CONFLICT (achievement_key) DO NOTHING;

-- ── TABLE 2: user_achievements ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id),
  achievement_key text        NOT NULL REFERENCES public.achievements(achievement_key),
  unlocked_at     timestamptz NOT NULL DEFAULT now(),
  source          text,
  UNIQUE(user_id, achievement_key)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Public read — achievement keys are not sensitive; profiles need counts
CREATE POLICY "user_ach_public_read"
  ON public.user_achievements FOR SELECT USING (true);

-- All writes go through evaluate_and_award_achievements (SECURITY DEFINER).
-- Direct client inserts are blocked — no INSERT grant to any client role.

GRANT SELECT ON public.user_achievements TO anon, authenticated;

-- ── TABLE 3: user_equipped_badges ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_equipped_badges (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id),
  badge_key   text        NOT NULL,
  slot_number integer     NOT NULL CHECK (slot_number BETWEEN 1 AND 3),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, slot_number),
  UNIQUE(user_id, badge_key)
);

ALTER TABLE public.user_equipped_badges ENABLE ROW LEVEL SECURITY;

-- Public read — profiles show equipped badges
CREATE POLICY "equipped_badges_public_read"
  ON public.user_equipped_badges FOR SELECT USING (true);

-- Writes go through equip_badge RPC (SECURITY DEFINER).
-- Direct INSERT is blocked. DELETE is allowed (unequip) — RLS guards ownership.
CREATE POLICY "equipped_badges_delete_own"
  ON public.user_equipped_badges FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, DELETE ON public.user_equipped_badges TO authenticated;
GRANT SELECT ON public.user_equipped_badges TO anon;

-- ── RPC: evaluate_and_award_achievements ─────────────────────────
-- SECURITY DEFINER: runs as the function owner (postgres), bypasses RLS.
-- Safe to call repeatedly — ON CONFLICT DO NOTHING prevents duplicates.
-- Returns JSON array of *newly* awarded achievement objects (empty if none new).

CREATE OR REPLACE FUNCTION public.evaluate_and_award_achievements()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid            uuid := auth.uid();
  v_games_count    bigint;
  v_streak         int;
  v_longest        int;
  v_cat_count      bigint;
  v_classic_perf   boolean;
  v_top10_perf     boolean;
  v_gdp_classic    int;
  v_gdp_top10      int;
  v_gdp_vs         int;
  v_pop_classic    int;
  v_pop_top10      int;
  v_pop_vs         int;
  v_is_founder     boolean;
  v_condition_met  boolean;
  v_newly_awarded  jsonb := '[]'::jsonb;
  v_ach            RECORD;

  -- Category IDs (from CATEGORY_ID_MAP in top10-categories-loader.js)
  CAT_GDP        CONSTANT int := 3;
  CAT_POPULATION CONSTANT int := 1;

  -- Mastery thresholds — single source of truth for all V1 conditions.
  -- Tune here; nowhere else.
  CLASSIC_MASTERY  CONSTANT int := 80;  -- points out of 100
  TOP10_MASTERY    CONSTANT int := 8;   -- correct answers out of 10
  VS_MASTERY       CONSTANT int := 10;  -- correct comparisons in best VS session

  -- Founding Explorer: created before Phase 3D rollout
  FOUNDING_CUTOFF  CONSTANT timestamptz := '2026-05-23 00:00:00+00';
BEGIN
  IF v_uid IS NULL THEN RETURN '[]'::jsonb; END IF;

  -- ── Data gathering ────────────────────────────────────────────────

  SELECT COUNT(*) INTO v_games_count
    FROM public.game_sessions WHERE user_id = v_uid;

  SELECT current_streak, longest_streak
    INTO v_streak, v_longest
    FROM public.user_streaks WHERE user_id = v_uid;
  v_streak  := COALESCE(v_streak, 0);
  v_longest := COALESCE(v_longest, 0);

  -- Category exploration: union across all modes
  SELECT COUNT(DISTINCT category_id) INTO v_cat_count FROM (
    SELECT category_id FROM public.category_scores       WHERE user_id = v_uid
    UNION
    SELECT category_id FROM public.top10_best_scores     WHERE user_id = v_uid
    UNION
    SELECT category_id FROM public.vs_scores             WHERE user_id = v_uid
    UNION
    SELECT category_id FROM public.daily_challenge_scores
      WHERE user_id = v_uid AND completed = true
  ) sub;

  -- Perfect Classic: category_scores (retroactive) OR game_sessions (forward)
  SELECT (
    EXISTS(SELECT 1 FROM public.category_scores
           WHERE user_id = v_uid AND score = 100)
    OR
    EXISTS(SELECT 1 FROM public.game_sessions
           WHERE user_id = v_uid AND game_mode = 'classic' AND score = 100)
  ) INTO v_classic_perf;

  -- Perfect Top 10: correct_count = 10 in top10_best_scores (retroactive + forward)
  SELECT EXISTS(
    SELECT 1 FROM public.top10_best_scores
    WHERE user_id = v_uid AND correct_count = 10
  ) INTO v_top10_perf;

  -- GDP mastery
  -- Use MAX() aggregate so zero-row queries return NULL → COALESCE → 0.
  -- Plain SELECT INTO sets the variable to NULL when no row matches,
  -- which would make the >= comparison return NULL instead of false,
  -- causing CONTINUE WHEN NOT v_condition_met to not fire (NULL ≠ TRUE).
  SELECT COALESCE(MAX(score), 0)         INTO v_gdp_classic FROM public.category_scores   WHERE user_id = v_uid AND category_id = CAT_GDP;
  SELECT COALESCE(MAX(correct_count), 0) INTO v_gdp_top10   FROM public.top10_best_scores WHERE user_id = v_uid AND category_id = CAT_GDP;
  SELECT COALESCE(MAX(correct_count), 0) INTO v_gdp_vs      FROM public.vs_scores         WHERE user_id = v_uid AND category_id = CAT_GDP;

  -- Population mastery
  SELECT COALESCE(MAX(score), 0)         INTO v_pop_classic FROM public.category_scores   WHERE user_id = v_uid AND category_id = CAT_POPULATION;
  SELECT COALESCE(MAX(correct_count), 0) INTO v_pop_top10   FROM public.top10_best_scores WHERE user_id = v_uid AND category_id = CAT_POPULATION;
  SELECT COALESCE(MAX(correct_count), 0) INTO v_pop_vs      FROM public.vs_scores         WHERE user_id = v_uid AND category_id = CAT_POPULATION;

  -- Founding Explorer: account created before achievement rollout
  SELECT (created_at < FOUNDING_CUTOFF) INTO v_is_founder
    FROM auth.users WHERE id = v_uid;
  v_is_founder := COALESCE(v_is_founder, false);

  -- ── Evaluate each active achievement ──────────────────────────────
  FOR v_ach IN
    SELECT achievement_key, name, description, category,
           is_badge_reward, badge_key, badge_name
    FROM public.achievements
    WHERE is_active = true
    ORDER BY sort_order
  LOOP
    -- Skip already awarded — prevents duplicate evaluation work
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM public.user_achievements
      WHERE user_id = v_uid AND achievement_key = v_ach.achievement_key
    );

    v_condition_met := false;

    CASE v_ach.achievement_key
      WHEN 'first_game'        THEN v_condition_met := v_games_count >= 1;
      WHEN 'games_10'          THEN v_condition_met := v_games_count >= 10;
      WHEN 'games_100'         THEN v_condition_met := v_games_count >= 100;
      WHEN 'streak_7'          THEN v_condition_met := v_streak >= 7 OR v_longest >= 7;
      WHEN 'streak_30'         THEN v_condition_met := v_streak >= 30 OR v_longest >= 30;
      WHEN 'explorer_10'       THEN v_condition_met := v_cat_count >= 10;
      WHEN 'explorer_20'       THEN v_condition_met := v_cat_count >= 20;
      WHEN 'perfect_score'     THEN v_condition_met := v_classic_perf OR v_top10_perf;
      WHEN 'gdp_master'        THEN v_condition_met :=
          v_gdp_classic >= CLASSIC_MASTERY AND
          v_gdp_top10   >= TOP10_MASTERY   AND
          v_gdp_vs      >= VS_MASTERY;
      WHEN 'population_expert' THEN v_condition_met :=
          v_pop_classic >= CLASSIC_MASTERY AND
          v_pop_top10   >= TOP10_MASTERY   AND
          v_pop_vs      >= VS_MASTERY;
      WHEN 'founding_explorer' THEN v_condition_met := v_is_founder;
      ELSE v_condition_met := false;
    END CASE;

    CONTINUE WHEN NOT v_condition_met;

    INSERT INTO public.user_achievements (user_id, achievement_key, source)
    VALUES (v_uid, v_ach.achievement_key, 'system')
    ON CONFLICT (user_id, achievement_key) DO NOTHING;

    -- FOUND is true only when the INSERT actually wrote a row (no conflict)
    IF FOUND THEN
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

  RETURN v_newly_awarded;
END;
$$;

GRANT EXECUTE ON FUNCTION public.evaluate_and_award_achievements() TO authenticated;

-- ── RPC: equip_badge ──────────────────────────────────────────────
-- Validates badge ownership before writing. Moves badge if already in another slot.
-- SECURITY DEFINER bypasses the INSERT-blocked RLS policy on user_equipped_badges.

CREATE OR REPLACE FUNCTION public.equip_badge(p_badge_key text, p_slot_number int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_slot_number NOT BETWEEN 1 AND 3 THEN
    RAISE EXCEPTION 'invalid_slot';
  END IF;

  -- Verify user has actually earned this badge
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_achievements ua
    JOIN public.achievements a ON a.achievement_key = ua.achievement_key
    WHERE ua.user_id = auth.uid()
      AND a.badge_key = p_badge_key
      AND a.is_badge_reward = true
  ) THEN
    RAISE EXCEPTION 'badge_not_earned';
  END IF;

  -- Remove from current slot if badge is already equipped elsewhere
  DELETE FROM public.user_equipped_badges
    WHERE user_id = auth.uid() AND badge_key = p_badge_key;

  -- Upsert into target slot (replaces whatever was in that slot)
  INSERT INTO public.user_equipped_badges (user_id, badge_key, slot_number)
  VALUES (auth.uid(), p_badge_key, p_slot_number)
  ON CONFLICT (user_id, slot_number)
  DO UPDATE SET badge_key = EXCLUDED.badge_key, created_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.equip_badge(text, int) TO authenticated;
