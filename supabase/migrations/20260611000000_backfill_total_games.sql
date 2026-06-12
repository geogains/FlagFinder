-- ================================================================
-- Backfill users.total_games with historical lower-bound estimate
-- 2026-06-11
--
-- Problem: users.total_games was initialised by migration
-- 20260525000000_profile_stats_cache by counting rows in game_sessions,
-- which was empty at that time. The client-side INSERT code that writes
-- to game_sessions only shipped on 2026-06-08, so all users had
-- total_games = 0 after the initial backfill. Only post-launch sessions
-- have been counted since, producing a visible inconsistency on the
-- public profile page (e.g. "Games Played: 17, Categories: 35").
--
-- Fix: apply the same GREATEST(live, historical_estimate) pattern used
-- by evaluate_and_award_achievements() since 20260608000000. The
-- historical estimate sums distinct best-score / history rows per user
-- across every legacy table — it is a conservative lower bound (one row
-- per best performance per category/mode, so replayed categories count
-- once), meaning it can under-count true lifetime games but never
-- over-count them.
--
-- Sources included in the historical estimate:
--   category_scores        — Classic best score per category
--   top10_best_scores      — Top 10 best score per category
--   vs_scores              — VS best score per category
--   daily_challenge_scores — one row per completed daily per date+category
--   h2h_results            — one row per finished duel match per user
--
-- categories_played is NOT touched — it already has correct historical
-- coverage from the 20260525000000 backfill.
--
-- The existing sync_game_session_counters trigger is not changed; it
-- continues to increment total_games + 1 on each new game_sessions row.
-- After this migration, the trigger increments from the new higher
-- baseline.
--
-- Idempotent: GREATEST() means re-running this migration can only
-- increase total_games further, never decrease it.
-- ================================================================

UPDATE public.users u
   SET total_games = GREATEST(
         u.total_games,
         (SELECT COUNT(*) FROM public.category_scores         WHERE user_id = u.id)
       + (SELECT COUNT(*) FROM public.top10_best_scores       WHERE user_id = u.id)
       + (SELECT COUNT(*) FROM public.vs_scores               WHERE user_id = u.id)
       + (SELECT COUNT(*) FROM public.daily_challenge_scores  WHERE user_id = u.id AND completed = true)
       + (SELECT COUNT(*) FROM public.h2h_results             WHERE user_id = u.id)
       );
