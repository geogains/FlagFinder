CREATE OR REPLACE FUNCTION public.record_user_activity(p_category_id integer, p_game_mode text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id        uuid    := auth.uid();
  v_timezone       text;
  v_today          date;
  v_last_played    date;
  v_current_streak integer;
  v_new_streak     integer;
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
  -- This is the only line that drives the streak day boundary — everything else
  -- compares dates derived from this same expression, so the logic stays consistent.
  v_today := (now() AT TIME ZONE v_timezone)::date;

  -- Insert one activity row per user per local calendar day.
  -- ON CONFLICT DO NOTHING is the duplicate-play guard: if the row already
  -- exists (same user_id + activity_date), the insert is silently skipped
  -- and `found` will be false, which causes an early return below.
  insert into public.user_daily_activity (
    user_id,
    activity_date,
    category_id,
    game_mode
  )
  values (
    v_user_id,
    v_today,
    p_category_id,
    p_game_mode
  )
  on conflict (user_id, activity_date) do nothing;

  -- `found` is false when the conflict fired (row already existed for today).
  -- Nothing to update in user_streaks — the streak was already counted.
  if not found then
    return;
  end if;

  -- First play of this local day: read the existing streak record.
  select last_played_date, current_streak
  into   v_last_played, v_current_streak
  from   public.user_streaks
  where  user_id = v_user_id;

  -- No streak row yet — this is the user's very first recorded activity.
  if not found then
    insert into public.user_streaks (
      user_id,
      current_streak,
      longest_streak,
      last_played_date
    )
    values (
      v_user_id,
      1,
      1,
      v_today
    );
    return;
  end if;

  -- Streak arithmetic: all three dates (v_today, v_last_played, v_today - 1)
  -- are now in the same local-timezone calendar, so the ±1 day comparisons
  -- are correct relative to the user's midnight, not UTC midnight.
  if v_last_played = v_today then
    -- Same local day as last play — streak already counted, nothing to do.
    return;
  elsif v_last_played = v_today - 1 then
    -- Consecutive local days — extend the streak.
    v_new_streak := v_current_streak + 1;
  else
    -- Gap of 2+ local days — streak broken, restart at 1.
    v_new_streak := 1;
  end if;

  update public.user_streaks
  set
    current_streak   = v_new_streak,
    longest_streak   = greatest(longest_streak, v_new_streak),
    last_played_date = v_today,
    updated_at       = now()
  where user_id = v_user_id;
end;
$function$;
