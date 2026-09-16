-- ================================================================
-- Exact activity timestamps for user_daily_activity
-- 2026-09-13
--
-- Phase A of the GeoRanks rolling-range instrumentation work (data
-- capability audit). Adds two nullable timestamptz columns so future
-- rolling 24h/48h analytics can be computed from an exact instant
-- instead of only a calendar date. This migration is SCHEMA +
-- WRITE-PATH ONLY:
--   - no default value on either new column
--   - no backfill of existing rows (they stay NULL, per the audit's
--     explicit no-fabricated-history policy)
--   - activity_date, category_id, game_mode are untouched
--   - the UNIQUE (user_id, activity_date) constraint is untouched
--   - no dashboard/analytics logic is enabled by this migration alone
--
-- activity_date remains canonical for: streaks, calendar DAU,
-- day-based retention, and calendar reporting. The two new columns are
-- additive context for exact-instant (rolling-hour) analytics only.
-- ================================================================

-- ── 1. Schema: add the two new columns ─────────────────────────────

ALTER TABLE public.user_daily_activity
  ADD COLUMN IF NOT EXISTS first_activity_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_activity_at  timestamptz;

COMMENT ON COLUMN public.user_daily_activity.first_activity_at IS
  'Exact timestamp of the first recorded activity touch for this user/activity_date. Set once, on first INSERT for the (user_id, activity_date) pair; never updated afterward. NULL for every row written before this column existed — do not backfill. activity_date remains canonical for streaks, calendar DAU, retention, and day-based analytics; this column is additive context for exact-instant (rolling-hour) analytics only.';

COMMENT ON COLUMN public.user_daily_activity.last_activity_at IS
  'Exact timestamp of the most recent recorded activity touch for this user/activity_date. Set on first INSERT and refreshed on every subsequent same-day touch. NULL for every row written before this column existed — do not backfill. activity_date remains canonical for streaks, calendar DAU, retention, and day-based analytics; this column is additive context for exact-instant (rolling-hour) analytics only.';

-- ── 2. Write path: _apply_streak_activity ──────────────────────────
--
-- This is the ONLY function that writes to user_daily_activity — both
-- record_user_activity() (Classic/Top10/VS/Duel, and logged-in Daily
-- Challenge via the same results-page flow) and claim_guest_daily_attempt()
-- (guest Daily Challenge claim) call this shared helper, so the timestamp
-- logic only needs to change in this one place. Neither caller's own
-- signature changes, so neither caller needs any code change.
--
-- Confirmed live definition this REPLACEs: the version created in
-- 20260803000000_guest_daily_challenge.sql (no later migration touches
-- this function — confirmed by grepping every migration referencing
-- user_daily_activity / record_user_activity / _apply_streak_activity).
--
-- CHANGE, precisely scoped:
--   - the INSERT now also sets first_activity_at = now() and
--     last_activity_at = now() on first write for (user_id, activity_date)
--   - ON CONFLICT changes from DO NOTHING to
--       DO UPDATE SET last_activity_at = now()
--     — category_id and game_mode are deliberately EXCLUDED from that SET
--     clause, so their existing "first value of the day wins" behavior
--     (previously implicit under DO NOTHING) is preserved exactly.
--
-- IMPORTANT CORRECTNESS NOTE: under the old `DO NOTHING`, PL/pgSQL's
-- implicit FOUND variable was false whenever the row already existed
-- (nothing was written), which the function used via `if not found then
-- return;` to skip re-running the streak logic on a same-day repeat
-- touch. Under `DO UPDATE`, FOUND becomes TRUE even on the conflict path
-- (an UPDATE did affect a row), which would silently break that guard —
-- causing the streak arithmetic to be reprocessed on every repeat play of
-- the same day. To avoid this regression, the insert now explicitly
-- distinguishes "was this row just created" from "did it already exist"
-- via the standard `RETURNING (xmax = 0)` idiom instead of relying on
-- FOUND, and the guard below is written against that explicit flag.
-- Every other line of the original function body (achievement/streak
-- arithmetic, RETURNS TABLE shape, signature) is unchanged.

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
  v_last_played     date;
  v_current_streak  integer;
  v_new_streak      integer;
  v_is_first_touch  boolean;
BEGIN
  insert into public.user_daily_activity (
    user_id, activity_date, category_id, game_mode, first_activity_at, last_activity_at
  )
  values (
    p_user_id, p_activity_date, p_category_id, p_game_mode, now(), now()
  )
  on conflict (user_id, activity_date)
  do update set last_activity_at = now()
  returning (xmax = 0) into v_is_first_touch;

  if not v_is_first_touch then
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

-- No GRANT changes: _apply_streak_activity remains ungranted (callable
-- only from record_user_activity() and claim_guest_daily_attempt(), both
-- owner-executed SECURITY DEFINER functions in this same schema) — same
-- posture as when it was first created in 20260803000000.
--
-- record_user_activity() and claim_guest_daily_attempt() themselves are
-- NOT redefined by this migration: _apply_streak_activity's signature and
-- return shape are unchanged, so both existing callers keep working
-- against this new definition with zero code changes.
