-- Recreate vs_leaderboard_scores to expose users.country_code.
-- This view was originally created outside migrations. We drop-and-recreate
-- here to add the country_code column needed for leaderboard flag display.
-- Column order is preserved; country_code is appended last.

DROP VIEW IF EXISTS public.vs_leaderboard_scores;

CREATE VIEW public.vs_leaderboard_scores AS
SELECT
  s.user_id,
  s.category_id,
  s.score,
  s.correct_count,
  s.accuracy,
  RANK() OVER (PARTITION BY s.category_id ORDER BY s.score DESC) AS rank,
  u.username,
  u.avatar_url,
  u.is_premium,
  u.country_code
FROM public.vs_scores s
JOIN public.users u ON u.id = s.user_id;

GRANT SELECT ON public.vs_leaderboard_scores TO anon, authenticated;
