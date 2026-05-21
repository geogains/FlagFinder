-- submit_daily_score: authoritative daily challenge score submission.
--
-- Guarantees first-completed-wins semantics:
--   • If a completed=true row already exists for (user, category, date): NO-OP.
--   • Only inserts or updates when no completed row exists for that slot.
--   • played_date must equal the current UTC date — prevents backdating.
--   • User identity is taken from auth.uid() — client cannot spoof user_id.

CREATE OR REPLACE FUNCTION public.submit_daily_score(
  p_category_id     integer,
  p_played_date     date,
  p_score           integer,
  p_correct_count   integer DEFAULT NULL,
  p_time_taken      integer DEFAULT NULL,
  p_time_remaining  integer DEFAULT NULL,
  p_wrong_count     integer DEFAULT NULL,
  p_game_state_json text    DEFAULT NULL
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
    correct_count, time_taken, time_remaining, wrong_count, game_state_json
  )
  VALUES (
    v_user_id, p_category_id, p_played_date, p_score, true,
    p_correct_count, p_time_taken, p_time_remaining, p_wrong_count, p_game_state_json
  )
  ON CONFLICT (user_id, category_id, played_date)
  DO UPDATE SET
    score             = EXCLUDED.score,
    completed         = true,
    correct_count     = EXCLUDED.correct_count,
    time_taken        = EXCLUDED.time_taken,
    time_remaining    = EXCLUDED.time_remaining,
    wrong_count       = EXCLUDED.wrong_count,
    game_state_json   = EXCLUDED.game_state_json
  WHERE public.daily_challenge_scores.completed = false;

  RETURN jsonb_build_object('status', 'saved', 'score', p_score);
END;
$$;

GRANT EXECUTE
  ON FUNCTION public.submit_daily_score(integer, date, integer, integer, integer, integer, integer, text)
  TO authenticated;
