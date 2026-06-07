-- ================================================================
-- Profile Stats Cache Layer
-- 2026-05-25
--
-- Problem: public profile pages show "—" for Games Played, Streak,
-- and Best Streak because game_sessions and user_streaks are protected
-- by RLS policies that correctly restrict raw gameplay data.
--
-- Solution: denormalized counter columns on public.users — precomputed
-- at write-time and readable by anyone, since public.users already has
-- a permissive SELECT policy used by the leaderboard and profile pages.
--
-- Columns added:
--   total_games       — incremented on every game_sessions INSERT
--   current_streak    — synced from user_streaks on INSERT/UPDATE
--   best_streak       — synced from user_streaks.longest_streak
--   achievement_count — incremented on every user_achievements INSERT
--   categories_played — recomputed from all-mode union on game_sessions INSERT
--
-- Underlying tables (game_sessions, user_streaks, user_achievements)
-- remain the canonical sources. These columns are a public cache only.
-- ================================================================

-- ── 1. Add counter columns to public.users ────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS total_games        integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_streak     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_streak        integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS achievement_count  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS categories_played  integer NOT NULL DEFAULT 0;

-- ── 2. Backfill existing users ────────────────────────────────────

-- total_games: count all rows in game_sessions per user
UPDATE public.users u
   SET total_games = (
         SELECT COUNT(*)
           FROM public.game_sessions gs
          WHERE gs.user_id = u.id
       );

-- current_streak + best_streak: copy from user_streaks
UPDATE public.users u
   SET current_streak = COALESCE(us.current_streak, 0),
       best_streak    = COALESCE(us.longest_streak,  0)
  FROM public.user_streaks us
 WHERE us.user_id = u.id;

-- achievement_count: count rows in user_achievements per user
UPDATE public.users u
   SET achievement_count = (
         SELECT COUNT(*)
           FROM public.user_achievements ua
          WHERE ua.user_id = u.id
       );

-- categories_played: distinct category_id union across all mode tables.
-- Matches the same union used by the profile page's JS computation.
UPDATE public.users u
   SET categories_played = (
         SELECT COUNT(DISTINCT category_id)
           FROM (
             SELECT category_id FROM public.category_scores       WHERE user_id = u.id
             UNION
             SELECT category_id FROM public.top10_best_scores     WHERE user_id = u.id
             UNION
             SELECT category_id FROM public.vs_scores             WHERE user_id = u.id
             UNION
             SELECT category_id FROM public.daily_challenge_scores
              WHERE user_id = u.id AND completed = true
             UNION
             SELECT category_id FROM public.game_sessions
              WHERE user_id = u.id AND category_id IS NOT NULL
           ) sub
       );

-- ── 3. Trigger: game_sessions INSERT → total_games + categories_played
-- Combined into one function to avoid two separate UPDATE statements.
-- categories_played is recomputed as a full distinct-count union on
-- every session that records a category_id. The union is cheap —
-- all five tables are indexed on user_id.

CREATE OR REPLACE FUNCTION public.sync_game_session_counters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.category_id IS NOT NULL THEN
    -- Game with a category: increment total_games and recompute categories_played.
    -- The recompute runs AFTER INSERT, so the new row is already in game_sessions.
    UPDATE public.users
       SET total_games       = total_games + 1,
           categories_played = (
             SELECT COUNT(DISTINCT category_id)
               FROM (
                 SELECT category_id FROM public.category_scores       WHERE user_id = NEW.user_id
                 UNION
                 SELECT category_id FROM public.top10_best_scores     WHERE user_id = NEW.user_id
                 UNION
                 SELECT category_id FROM public.vs_scores             WHERE user_id = NEW.user_id
                 UNION
                 SELECT category_id FROM public.daily_challenge_scores
                  WHERE user_id = NEW.user_id AND completed = true
                 UNION
                 SELECT category_id FROM public.game_sessions
                  WHERE user_id = NEW.user_id AND category_id IS NOT NULL
               ) sub
           )
     WHERE id = NEW.user_id;
  ELSE
    -- Game without a category (e.g. some duel variants): increment total_games only.
    UPDATE public.users
       SET total_games = total_games + 1
     WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_game_session_insert ON public.game_sessions;
CREATE TRIGGER on_game_session_insert
  AFTER INSERT ON public.game_sessions
  FOR EACH ROW EXECUTE FUNCTION public.sync_game_session_counters();

-- ── 4. Trigger: user_streaks INSERT/UPDATE → current_streak + best_streak
-- record_user_activity() is the sole writer to user_streaks, so this
-- trigger covers every streak change.

CREATE OR REPLACE FUNCTION public.sync_streak_to_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
     SET current_streak = NEW.current_streak,
         best_streak    = NEW.longest_streak
   WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_streaks_change ON public.user_streaks;
CREATE TRIGGER on_user_streaks_change
  AFTER INSERT OR UPDATE ON public.user_streaks
  FOR EACH ROW EXECUTE FUNCTION public.sync_streak_to_users();

-- ── 5. Trigger: user_achievements INSERT → achievement_count
-- evaluate_and_award_achievements() is the sole writer to user_achievements.

CREATE OR REPLACE FUNCTION public.sync_achievement_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
     SET achievement_count = achievement_count + 1
   WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_achievement_insert ON public.user_achievements;
CREATE TRIGGER on_achievement_insert
  AFTER INSERT ON public.user_achievements
  FOR EACH ROW EXECUTE FUNCTION public.sync_achievement_count();
