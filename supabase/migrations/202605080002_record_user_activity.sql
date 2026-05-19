CREATE OR REPLACE FUNCTION public.record_user_activity(p_category_id integer, p_game_mode text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_today date := current_date;
  v_last_played date;
  v_current_streak integer;
  v_new_streak integer;
begin
  if v_user_id is null then
    return;
  end if;

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

  if not found then
    return;
  end if;

  select last_played_date, current_streak
  into v_last_played, v_current_streak
  from public.user_streaks
  where user_id = v_user_id;

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

  if v_last_played = v_today then
    return;
  elsif v_last_played = v_today - 1 then
    v_new_streak := v_current_streak + 1;
  else
    v_new_streak := 1;
  end if;

  update public.user_streaks
  set
    current_streak = v_new_streak,
    longest_streak = greatest(longest_streak, v_new_streak),
    last_played_date = v_today,
    updated_at = now()
  where user_id = v_user_id;
end;
$function$;