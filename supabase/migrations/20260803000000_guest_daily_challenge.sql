-- ================================================================
-- Guest Daily Challenge — isolated guest-attempt pipeline
-- 2026-08-03
--
-- Lets signed-out visitors play the Daily Challenge and claim their
-- result after signing up/in. Deliberately does NOT touch
-- daily_challenge_scores, category_scores, top10_best_scores,
-- vs_scores, user_streaks, or user_daily_activity — guest attempts
-- live entirely in their own table until claimed, at which point the
-- claim RPC writes into the existing authenticated tables using the
-- exact same shapes the authenticated client already writes today.
--
-- Retention: unclaimed rows have no expiry logic yet. They are safe
-- to archive/delete after a generous retention window (e.g. 180
-- days) once there's real volume to justify it — no cleanup job is
-- part of this migration.
-- ================================================================

-- ── 1. daily_challenge_guest_attempts ──────────────────────────────

CREATE TABLE public.daily_challenge_guest_attempts (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id          uuid        NOT NULL,
  claim_token       uuid        NOT NULL DEFAULT gen_random_uuid(),
  game_mode         text        NOT NULL CHECK (game_mode IN ('classic', 'top10', 'vs')),
  category_id       integer     NOT NULL,
  played_date       date        NOT NULL,
  score             integer     NOT NULL CHECK (score >= 0),
  max_score         integer,
  correct_count     integer,
  wrong_count       integer,
  time_taken        integer,
  time_remaining    integer,
  game_state_json   text,
  playable_count    integer     CHECK (playable_count IS NULL OR playable_count > 0),
  created_at        timestamptz NOT NULL DEFAULT now(),
  claimed_by        uuid        REFERENCES auth.users(id),
  claimed_at        timestamptz,
  UNIQUE (guest_id, category_id, played_date),
  UNIQUE (claim_token)
);

-- Analytics / funnel queries: "how many attempts for date X", claimed vs not.
CREATE INDEX idx_guest_attempts_played_date
  ON public.daily_challenge_guest_attempts (played_date);

CREATE INDEX idx_guest_attempts_claimed
  ON public.daily_challenge_guest_attempts (claimed_by)
  WHERE claimed_by IS NOT NULL;

-- Locked down: no table-level grants, no RLS policies. All access goes
-- through the two SECURITY DEFINER RPCs below (same "RPC only" posture
-- used for user_achievements writes elsewhere in this schema).
ALTER TABLE public.daily_challenge_guest_attempts ENABLE ROW LEVEL SECURITY;


-- ── 2. submit_guest_daily_attempt ──────────────────────────────────
-- Records a completed guest attempt. Callable by anon (guests have no
-- JWT at all) and authenticated (harmless no-op path, never used by
-- the frontend for logged-in users — they use the normal pipeline).
--
-- Validates: game_mode is one of the three real modes, played_date is
-- today (server clock — mirrors submit_daily_score's own-day guard),
-- score is non-negative. Duplicate submissions (same guest_id +
-- category_id + played_date) are NOT an error — they return the
-- existing attempt's id/token so a retry or double-click is harmless.

CREATE OR REPLACE FUNCTION public.submit_guest_daily_attempt(
  p_guest_id         uuid,
  p_game_mode        text,
  p_category_id      integer,
  p_played_date      date,
  p_score            integer,
  p_max_score        integer DEFAULT NULL,
  p_correct_count    integer DEFAULT NULL,
  p_wrong_count      integer DEFAULT NULL,
  p_time_taken       integer DEFAULT NULL,
  p_time_remaining   integer DEFAULT NULL,
  p_game_state_json  text    DEFAULT NULL,
  p_playable_count   integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today   date := current_date;
  v_id      uuid;
  v_token   uuid;
  v_claimed uuid;
BEGIN
  IF p_guest_id IS NULL THEN
    RETURN jsonb_build_object('error', 'missing_guest_id');
  END IF;

  IF p_game_mode NOT IN ('classic', 'top10', 'vs') THEN
    RETURN jsonb_build_object('error', 'invalid_game_mode');
  END IF;

  IF p_category_id IS NULL OR p_category_id <= 0 THEN
    RETURN jsonb_build_object('error', 'invalid_category');
  END IF;

  IF p_score IS NULL OR p_score < 0 THEN
    RETURN jsonb_build_object('error', 'invalid_score');
  END IF;

  -- Server validates the date, same rule as submit_daily_score: a guest
  -- attempt can only be recorded for today. Claiming it later is fine —
  -- that's a separate step with its own date handling.
  IF p_played_date <> v_today THEN
    RETURN jsonb_build_object('error', 'invalid_date', 'server_today', v_today::text);
  END IF;

  INSERT INTO public.daily_challenge_guest_attempts (
    guest_id, game_mode, category_id, played_date, score, max_score,
    correct_count, wrong_count, time_taken, time_remaining,
    game_state_json, playable_count
  )
  VALUES (
    p_guest_id, p_game_mode, p_category_id, p_played_date, p_score, p_max_score,
    p_correct_count, p_wrong_count, p_time_taken, p_time_remaining,
    p_game_state_json, p_playable_count
  )
  ON CONFLICT (guest_id, category_id, played_date) DO NOTHING
  RETURNING id, claim_token INTO v_id, v_token;

  IF v_id IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'created', 'attempt_id', v_id, 'claim_token', v_token);
  END IF;

  -- Conflict fired: an attempt already exists for this guest/category/day.
  -- Return it gracefully instead of erroring — the client can proceed
  -- with the same claim_token it (or a retried request) already has.
  SELECT id, claim_token, claimed_by
    INTO v_id, v_token, v_claimed
    FROM public.daily_challenge_guest_attempts
   WHERE guest_id = p_guest_id AND category_id = p_category_id AND played_date = p_played_date;

  IF v_claimed IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'already_claimed', 'attempt_id', v_id);
  END IF;

  RETURN jsonb_build_object('status', 'duplicate', 'attempt_id', v_id, 'claim_token', v_token);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_guest_daily_attempt(
  uuid, text, integer, date, integer, integer, integer, integer, integer, integer, text, integer
) TO anon, authenticated;


-- ── 3. Internal helpers (no GRANT — callable only from other
--       SECURITY DEFINER functions owned by the same role. Never
--       exposed via PostgREST. Ordinary clients cannot call these
--       directly, so they cannot submit arbitrary activity dates or
--       backdated scores.)

-- ── 3a. _save_historical_daily_result
--       Same guarded insert as submit_daily_score, minus the
--       "played_date must be today" check and taking the target user
--       explicitly instead of auth.uid(). submit_daily_score itself is
--       NOT modified — normal same-day gameplay is untouched.

CREATE OR REPLACE FUNCTION public._save_historical_daily_result(
  p_user_id          uuid,
  p_category_id      integer,
  p_played_date      date,
  p_score            integer,
  p_correct_count    integer,
  p_time_taken       integer,
  p_time_remaining   integer,
  p_wrong_count      integer,
  p_game_state_json  text,
  p_playable_count   integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_comp  boolean;
  v_existing_score integer;
BEGIN
  SELECT completed, score
    INTO v_existing_comp, v_existing_score
    FROM public.daily_challenge_scores
   WHERE user_id = p_user_id AND category_id = p_category_id AND played_date = p_played_date;

  IF FOUND AND v_existing_comp = true THEN
    RETURN jsonb_build_object('status', 'already_completed', 'score', v_existing_score);
  END IF;

  INSERT INTO public.daily_challenge_scores (
    user_id, category_id, played_date, score, completed,
    correct_count, time_taken, time_remaining, wrong_count, game_state_json,
    playable_count
  )
  VALUES (
    p_user_id, p_category_id, p_played_date, p_score, true,
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

-- ── 3b. _apply_streak_activity — the ONE place the streak algorithm
--       lives. Takes the target activity date as a parameter instead
--       of deriving it, so it works for both "today" (normal play)
--       and a historical daily-challenge date (guest claim). Identical
--       arithmetic to the pre-existing record_user_activity() body —
--       moved here, not duplicated.

CREATE OR REPLACE FUNCTION public._apply_streak_activity(
  p_user_id       uuid,
  p_activity_date date,
  p_category_id   integer,
  p_game_mode     text
)
RETURNS TABLE(prev_streak integer, new_streak integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_played    date;
  v_current_streak integer;
  v_new_streak     integer;
BEGIN
  insert into public.user_daily_activity (user_id, activity_date, category_id, game_mode)
  values (p_user_id, p_activity_date, p_category_id, p_game_mode)
  on conflict (user_id, activity_date) do nothing;

  if not found then
    -- Already recorded for this day — nothing changes, report current streak.
    select current_streak into v_current_streak
      from public.user_streaks where user_id = p_user_id;
    prev_streak := coalesce(v_current_streak, 0);
    new_streak  := coalesce(v_current_streak, 0);
    return next;
    return;
  end if;

  select last_played_date, current_streak
    into v_last_played, v_current_streak
    from public.user_streaks where user_id = p_user_id;

  if not found then
    insert into public.user_streaks (user_id, current_streak, longest_streak, last_played_date)
    values (p_user_id, 1, 1, p_activity_date);
    prev_streak := 0;
    new_streak  := 1;
    return next;
    return;
  end if;

  prev_streak := v_current_streak;

  if v_last_played = p_activity_date then
    v_new_streak := v_current_streak;
  elsif v_last_played = p_activity_date - 1 then
    v_new_streak := v_current_streak + 1;
  else
    v_new_streak := 1;
  end if;

  update public.user_streaks
     set current_streak   = v_new_streak,
         longest_streak    = greatest(longest_streak, v_new_streak),
         last_played_date = p_activity_date,
         updated_at       = now()
   where user_id = p_user_id;

  new_streak := v_new_streak;
  return next;
END;
$$;

-- No GRANT statements for _save_historical_daily_result or
-- _apply_streak_activity: they stay inaccessible to anon and
-- authenticated. Only record_user_activity() and
-- claim_guest_daily_attempt() (both below) call them, and both run as
-- the owner (same as these functions), so no explicit grant is
-- required for those calls to succeed.


-- ── 4. record_user_activity — refactored to call the shared helper.
--       Signature, grants, and every external behavior are unchanged:
--       still resolves auth.uid() itself, still silently no-ops for a
--       null session, still derives "today" from the user's stored
--       timezone. It just no longer contains its own copy of the
--       streak arithmetic — see _apply_streak_activity above, which is
--       now the single implementation shared with claim_guest_daily_attempt.

CREATE OR REPLACE FUNCTION public.record_user_activity(p_category_id integer, p_game_mode text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id  uuid := auth.uid();
  v_timezone text;
  v_today    date;
begin
  if v_user_id is null then
    return;
  end if;

  -- Read the user's stored IANA timezone. Fall back to UTC if the row is
  -- missing or the column is null (defensive; column DEFAULT is 'UTC').
  select coalesce(timezone, 'UTC')
  into   v_timezone
  from   public.users
  where  id = v_user_id;

  if not found then
    v_timezone := 'UTC';
  end if;

  -- Derive the user's local calendar date from the server's current UTC moment.
  v_today := (now() AT TIME ZONE v_timezone)::date;

  perform public._apply_streak_activity(v_user_id, v_today, p_category_id, p_game_mode);
end;
$function$;

-- Same signature as before (record_user_activity(integer, text)), so
-- the existing GRANT EXECUTE ... TO authenticated (applied live,
-- outside migrations per the earlier audit) is untouched by this
-- CREATE OR REPLACE.


-- ── 5. claim_guest_daily_attempt ───────────────────────────────────
-- Atomically attaches a completed guest attempt to the authenticated
-- caller — score, best-score table, streak (for the ORIGINAL
-- challenge date), game history, AND achievements, all in one
-- transaction. Idempotent and retry-safe: calling it again after a
-- success (same or different tab) replays the same success payload
-- without re-running any side effect, because the FOR UPDATE lock +
-- the claimed_by check make every branch after the first successful
-- claim a no-op read. No partial success is possible: if any statement
-- in here raises, Postgres rolls back the entire function's effects.

CREATE OR REPLACE FUNCTION public.claim_guest_daily_attempt(
  p_claim_token uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid            uuid := auth.uid();
  v_attempt        public.daily_challenge_guest_attempts%ROWTYPE;
  v_existing_comp  boolean;
  v_existing_score integer;
  v_save_result    jsonb;
  v_prev_streak    integer;
  v_new_streak     integer;
  v_max_score      integer;
  v_correct        integer;
  v_duration_ms    integer;
  v_achievements   jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  SELECT * INTO v_attempt
    FROM public.daily_challenge_guest_attempts
   WHERE claim_token = p_claim_token
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'attempt_not_found');
  END IF;

  -- Idempotent replay: this exact account already claimed this attempt.
  -- Achievements/streak/history were already applied on the original
  -- claim — nothing to redo, just report the same success.
  IF v_attempt.claimed_by = v_uid THEN
    RETURN jsonb_build_object(
      'status', 'claimed', 'score', v_attempt.score,
      'category_id', v_attempt.category_id, 'game_mode', v_attempt.game_mode,
      'played_date', v_attempt.played_date, 'already', true
    );
  END IF;

  IF v_attempt.claimed_by IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'already_claimed_by_other');
  END IF;

  -- This account already has a real completed result for that date/category —
  -- do not overwrite it with the guest attempt.
  SELECT completed, score
    INTO v_existing_comp, v_existing_score
    FROM public.daily_challenge_scores
   WHERE user_id = v_uid AND category_id = v_attempt.category_id AND played_date = v_attempt.played_date;

  IF FOUND AND v_existing_comp = true THEN
    RETURN jsonb_build_object('status', 'already_completed', 'score', v_existing_score);
  END IF;

  -- 1. Daily Challenge result (historical-safe insert).
  v_save_result := public._save_historical_daily_result(
    v_uid, v_attempt.category_id, v_attempt.played_date, v_attempt.score,
    v_attempt.correct_count, v_attempt.time_taken, v_attempt.time_remaining,
    v_attempt.wrong_count, v_attempt.game_state_json, v_attempt.playable_count
  );

  -- 2. Mode-specific best-score table — mirrors each results page's own
  --    write exactly (see classicresults.html / top10results.html /
  --    vsresults.html "Pending Score Save" blocks).
  IF v_attempt.game_mode = 'classic' THEN
    PERFORM public.upsert_high_score(v_attempt.category_id, v_attempt.score, true);
    v_max_score := 100;
  ELSIF v_attempt.game_mode = 'top10' THEN
    INSERT INTO public.top10_best_scores (
      user_id, category_id, score, correct_count, wrong_count, time_remaining, playable_count
    )
    VALUES (
      v_uid, v_attempt.category_id, v_attempt.score, v_attempt.correct_count,
      v_attempt.wrong_count, v_attempt.time_remaining, v_attempt.playable_count
    )
    ON CONFLICT (user_id, category_id) DO UPDATE
      SET score          = EXCLUDED.score,
          correct_count  = EXCLUDED.correct_count,
          wrong_count    = EXCLUDED.wrong_count,
          time_remaining = EXCLUDED.time_remaining,
          playable_count = EXCLUDED.playable_count
      WHERE public.top10_best_scores.score < EXCLUDED.score;
    v_correct := v_attempt.correct_count;
    v_duration_ms := CASE WHEN v_attempt.time_taken IS NOT NULL THEN v_attempt.time_taken * 1000 END;
  ELSIF v_attempt.game_mode = 'vs' THEN
    -- Unconditional overwrite — matches vsresults.html's existing
    -- (unguarded) upsert behavior exactly; not "fixed" here.
    INSERT INTO public.vs_scores (
      user_id, category_id, score, correct_count, incorrect_count, accuracy, time_played
    )
    VALUES (
      v_uid, v_attempt.category_id, v_attempt.score, v_attempt.correct_count,
      v_attempt.wrong_count, NULL, v_attempt.time_taken
    )
    ON CONFLICT (user_id, category_id) DO UPDATE
      SET score           = EXCLUDED.score,
          correct_count   = EXCLUDED.correct_count,
          incorrect_count = EXCLUDED.incorrect_count,
          time_played     = EXCLUDED.time_played;
    v_correct := v_attempt.correct_count;
    v_duration_ms := CASE WHEN v_attempt.time_taken IS NOT NULL THEN v_attempt.time_taken * 1000 END;
  END IF;

  -- 3. Streak — for the ORIGINAL challenge date, not today. Same shared
  --    helper record_user_activity() itself calls (see section 3b/4).
  SELECT prev_streak, new_streak
    INTO v_prev_streak, v_new_streak
    FROM public._apply_streak_activity(v_uid, v_attempt.played_date, v_attempt.category_id, 'daily_challenge');

  -- 4. Game history (Games Played / profile stats triggers fire on this insert).
  INSERT INTO public.game_sessions (
    user_id, game_mode, category_id, score, max_score, correct, duration_ms, is_daily
  )
  VALUES (
    v_uid, v_attempt.game_mode, v_attempt.category_id, v_attempt.score,
    v_max_score, v_correct, v_duration_ms, true
  );

  -- 5. Achievements — evaluated HERE, inside the same transaction, so a
  --    claimed score can never end up without its achievements applied
  --    even if the frontend is interrupted right after this call returns.
  --    Same RPC the authenticated flow already calls client-side; reused
  --    as-is, just invoked server-side instead.
  SELECT public.evaluate_and_award_achievements() INTO v_achievements;

  -- 6. Mark claimed.
  UPDATE public.daily_challenge_guest_attempts
     SET claimed_by = v_uid, claimed_at = now()
   WHERE id = v_attempt.id;

  RETURN jsonb_build_object(
    'status', 'claimed', 'score', v_attempt.score,
    'category_id', v_attempt.category_id, 'game_mode', v_attempt.game_mode,
    'played_date', v_attempt.played_date,
    'prev_streak', v_prev_streak, 'new_streak', v_new_streak,
    'achievements', coalesce(v_achievements, '[]'::jsonb),
    'already', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_guest_daily_attempt(uuid) TO authenticated;
