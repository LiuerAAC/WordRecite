create table if not exists public.memory_deck_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.memory_deck_profiles enable row level security;

drop policy if exists "memory deck profiles are readable by owner" on public.memory_deck_profiles;
create policy "memory deck profiles are readable by owner"
  on public.memory_deck_profiles
  for select
  using (auth.uid() = user_id);

drop policy if exists "memory deck profiles are insertable by owner" on public.memory_deck_profiles;
create policy "memory deck profiles are insertable by owner"
  on public.memory_deck_profiles
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "memory deck profiles are updatable by owner" on public.memory_deck_profiles;
create policy "memory deck profiles are updatable by owner"
  on public.memory_deck_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
