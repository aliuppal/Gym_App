-- Gym Days schema. Every row belongs to the signed-in user (auth.uid()), and
-- row-level security makes sure nobody can read or change another user's rows.

create table public.workout_days (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  types text[] not null check (cardinality(types) between 1 and 6),
  note text not null default '' check (char_length(note) <= 500),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  weekly_goal smallint not null default 3 check (weekly_goal between 1 and 7),
  week_start smallint not null default 1 check (week_start in (0, 1)),
  updated_at timestamptz not null default now()
);

alter table public.workout_days enable row level security;
alter table public.user_settings enable row level security;

create policy "Users manage their own workout days" on public.workout_days
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own settings" on public.user_settings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Replaces all of the caller's data in one transaction (used by import and
-- "Delete all data"). Runs as the caller, so the policies above still apply.
--   p_days:     [{ "date": "YYYY-MM-DD", "types": [...], "note": "..." }, ...]
--   p_settings: { "weeklyGoal": 3, "weekStart": 1 }
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

  insert into public.workout_days (user_id, date, types, note)
  select auth.uid(),
         (d ->> 'date')::date,
         array(select jsonb_array_elements_text(d -> 'types')),
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
