-- One row per authenticated user. PK mirrors auth.users(id) so cascade delete is free.
create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  persona_tone text not null default 'professional',
  theme_preference text not null default 'default',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

-- Users can only see and modify their own profile. No delete policy: profile is
-- removed automatically when auth.users row is deleted (via cascade above).
create policy "user_profiles_select_own" on public.user_profiles
  for select using (auth.uid() = id);

create policy "user_profiles_insert_own" on public.user_profiles
  for insert with check (auth.uid() = id);

create policy "user_profiles_update_own" on public.user_profiles
  for update using (auth.uid() = id);

create trigger user_profiles_set_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();
