-- ================================================================
-- game_sessions: canonical gameplay session log.
--
-- One INSERT per completed game — append-only event stream.
-- This table is the authoritative source for:
--   • Games Played count (profile page)
--   • Achievement triggers (future)
--   • Progression systems (future)
--   • Match history (future)
--   • Seasonal / ranked systems (future)
--   • Analytics
--
-- NOT a leaderboard table. NOT a best-score table.
-- Best scores live in category_scores / top10_best_scores / vs_scores.
-- This table records each individual session regardless of score rank.
--
-- game_mode values: 'classic' | 'top10' | 'vs' | 'duel'
-- is_daily: true when the session was a daily challenge game
--
-- Schema notes:
--   category_id  nullable — duels technically have one but are tracked
--                via h2h_matches; passing it here is informational.
--   max_score    nullable — Top10 and VS max scores are complex formulas;
--                Classic is always 100; Duel is returned by the RPC.
--   correct      nullable — Classic does not count correct/wrong;
--                Top10 = correct answers (0–10); VS = correct comparisons.
--   duration_ms  nullable — Classic does not track time;
--                Top10/VS = timeElapsed/timePlayed × 1000;
--                Duel = Date.now() − started_at.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.game_sessions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id),
  game_mode    text        NOT NULL
               CHECK (game_mode IN ('classic', 'top10', 'vs', 'duel')),
  category_id  integer,
  score        integer     NOT NULL,
  max_score    integer,
  correct      integer,
  duration_ms  integer,
  is_daily     boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── Row Level Security ────────────────────────────────────────────
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Users can read their own sessions (for profile, future match history)
CREATE POLICY "sessions_select_own"
  ON public.game_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own sessions; server-side RLS prevents spoofing
CREATE POLICY "sessions_insert_own"
  ON public.game_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.game_sessions TO authenticated;

-- ── Indexes ───────────────────────────────────────────────────────
-- Primary pattern: list/count sessions for a user, newest first
CREATE INDEX idx_game_sessions_user_time
  ON public.game_sessions (user_id, created_at DESC);

-- Secondary: filter by mode for per-mode stats
CREATE INDEX idx_game_sessions_user_mode
  ON public.game_sessions (user_id, game_mode);
