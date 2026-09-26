-- Optional details for each workout day, e.g. {Cycling,Treadmill,Legs,Biceps}.
alter table public.workout_days
  add column details text[] not null default '{}' check (cardinality(details) <= 60);

-- Same as before, but also saves each day's details.
create or replace function public.replace_all_data(p_days jsonb, p_settings jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  delete from public.workout_days where user_id = auth.uid();

  insert into public.workout_days (user_id, date, types, details, note)
  select auth.uid(),
         (d ->> 'date')::date,
         array(select jsonb_array_elements_text(d -> 'types')),
         array(select jsonb_array_elements_text(coalesce(d -> 'details', '[]'::jsonb))),
         coalesce(d ->> 'note', '')
  from jsonb_array_elements(coalesce(p_days, '[]'::jsonb)) as d;

  insert into public.user_settings (user_id, weekly_goal, week_start)
  values (auth.uid(),
          coalesce((p_settings ->> 'weeklyGoal')::smallint, 3),
          coalesce((p_settings ->> 'weekStart')::smallint, 1))
  on conflict (user_id) do update
    set weekly_goal = excluded.weekly_goal,
        week_start = excluded.week_start,
        updated_at = now();
end;
$$;

revoke execute on function public.replace_all_data(jsonb, jsonb) from public, anon;
grant execute on function public.replace_all_data(jsonb, jsonb) to authenticated;
