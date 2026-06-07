-- ================================================================
-- Deactivate V1 legacy achievements
-- 2026-06-07
--
-- These 7 achievements predate the GeoRanks 2.0 badge system.
-- They have no badge_key, no artwork, and are invisible in the
-- badge collection UI (BADGE_CATALOG does not include them).
-- Three are exact duplicates of modern badge achievements:
--   first_game  → bronze_first_steps  (same condition: games >= 1)
--   games_100   → gold_centurion      (same condition: games >= 100)
--   perfect_score → bronze_perfectionist (same condition: first perfect)
-- The remaining four fill gaps with no modern equivalent but are
-- still invisible and badge-less.
--
-- Setting is_active = false is sufficient:
--   evaluate_and_award_achievements() filters WHERE is_active = true
--   in both Loop 1 and Loop 2. The rows will no longer enter the
--   cursor, so no CASE branch changes are needed.
--
-- Existing user_achievements rows are preserved. This is a soft
-- deactivation — rows can be restored with SET is_active = true.
-- ================================================================

UPDATE public.achievements
SET    is_active = false
WHERE  achievement_key IN (
  'first_game',
  'games_10',
  'games_100',
  'streak_7',
  'explorer_10',
  'explorer_20',
  'perfect_score'
);
