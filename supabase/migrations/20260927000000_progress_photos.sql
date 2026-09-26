-- Progress photos. Images are stored as base64 JPEG data URLs:
--   image:     the full picture with the chosen stats drawn along the bottom
--   thumbnail: a small copy for the gallery grid, so listing photos stays fast
--   stats:     the stats shown on the picture, e.g. [{"key":"week","label":"This week","value":"3/4"}]

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  taken_on date not null default current_date,
  created_at timestamptz not null default now(),
  image text not null check (image like 'data:image/%;base64,%' and char_length(image) <= 5000000),
  thumbnail text not null check (thumbnail like 'data:image/%;base64,%' and char_length(thumbnail) <= 300000),
  stats jsonb not null default '[]'::jsonb check (jsonb_typeof(stats) = 'array')
);

create index progress_photos_user_created_idx on public.progress_photos (user_id, created_at desc);

alter table public.progress_photos enable row level security;

create policy "Users manage their own progress photos" on public.progress_photos
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
