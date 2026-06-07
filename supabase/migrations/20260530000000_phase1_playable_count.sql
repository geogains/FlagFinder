-- ================================================================
-- Phase 1 — playable_count support for Top 10 scoring
-- 2026-05-30
--
-- Problem: Top 10 boards assumed exactly 10 answerable slots.
-- World Cup has only 8 (Netherlands and Portugal filtered as 0-win
-- finalists). Scores were stored as correct/10 even for 8-slot boards.
--
-- Fix:
--   1. Add nullable playable_count to top10_best_scores
--   2. Add nullable playable_count to daily_challenge_scores
--   3. Replace submit_daily_score RPC to accept + store p_playable_count
--
-- NULL playable_count = historical row written before this migration.
-- Treat NULL as 10 (safe: no pre-migration category had < 10 slots).
-- ================================================================

-- ── 1. top10_best_scores ─────────────────────────────────────────

ALTER TABLE public.top10_best_scores
  ADD COLUMN IF NOT EXISTS playable_count integer
  CHECK (playable_count IS NULL OR playable_count > 0);

-- ── 2. daily_challenge_scores ────────────────────────────────────

ALTER TABLE public.daily_challenge_scores
  ADD COLUMN IF NOT EXISTS playable_count integer
  CHECK (playable_count IS NULL OR playable_count > 0);

-- ── 3. submit_daily_score RPC ─────────────────────────────────────
-- Replace the existing 8-param function with a 9-param version that
-- accepts and stores p_playable_count. Old callers continue to work
-- because all trailing params have DEFAULT values.
-- Revoke the old grant and issue a new one matching the new signature.

REVOKE EXECUTE
  ON FUNCTION public.submit_daily_score(integer, date, integer, integer, integer, integer, integer, text)
  FROM authenticated;

CREATE OR REPLACE FUNCTION public.submit_daily_score(
  p_category_id     integer,
  p_played_date     date,
  p_score           integer,
  p_correct_count   integer DEFAULT NULL,
  p_time_taken      integer DEFAULT NULL,
  p_time_remaining  integer DEFAULT NULL,
  p_wrong_count     integer DEFAULT NULL,
  p_game_state_json text    DEFAULT NULL,
  p_playable_count  integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        uuid    := auth.uid();
  v_today          date    := current_date;
  v_existing_comp  boolean;
  v_existing_score integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  -- Server validates the date — client cannot backdate a submission.
  IF p_played_date <> v_today THEN
    RETURN jsonb_build_object('error', 'invalid_date', 'server_today', v_today::text);
  END IF;

  SELECT completed, score
    INTO v_existing_comp, v_existing_score
    FROM public.daily_challenge_scores
   WHERE user_id     = v_user_id
     AND category_id = p_category_id
     AND played_date = p_played_date;

  -- Already completed: return existing score, write nothing.
  IF FOUND AND v_existing_comp = true THEN
    RETURN jsonb_build_object(
      'status', 'already_completed',
      'score',  v_existing_score
    );
  END IF;

  -- Insert new row or update an existing incomplete row.
  -- The WHERE clause on DO UPDATE is a belt-and-suspenders guard against
  -- a race condition between the SELECT above and this write.
  INSERT INTO public.daily_challenge_scores (
    user_id, category_id, played_date, score, completed,
    correct_count, time_taken, time_remaining, wrong_count, game_state_json,
    playable_count
  )
  VALUES (
    v_user_id, p_category_id, p_played_date, p_score, true,
    p_correct_count, p_time_taken, p_time_remaining, p_wrong_count, p_game_state_json,
    p_playable_count
  )
  ON CONFLICT (user_id, category_id, played_date)
  DO UPDATE SET
    score             = EXCLUDED.score,
    completed         = true,
    correct_count     = EXCLUDED.correct_count,
    time_taken        = EXCLUDED.time_taken,
    time_remaining    = EXCLUDED.time_remaining,
    wrong_count       = EXCLUDED.wrong_count,
    game_state_json   = EXCLUDED.game_state_json,
    playable_count    = EXCLUDED.playable_count
  WHERE public.daily_challenge_scores.completed = false;

  RETURN jsonb_build_object('status', 'saved', 'score', p_score);
END;
$$;

GRANT EXECUTE
  ON FUNCTION public.submit_daily_score(integer, date, integer, integer, integer, integer, integer, text, integer)
  TO authenticated;
