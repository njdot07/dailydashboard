-- Per-user OAuth app credentials. Each user registers their own OAuth
-- application in Google Cloud Console (and later Azure AD) and pastes
-- the resulting client_id / client_secret here. This bypasses Google's
-- app-verification requirements entirely — each user is effectively
-- their own developer.
--
-- Kept in a table separate from user_integrations because the config
-- persists independently of a connection (user can set up creds
-- without connecting, or disconnect + reconnect without re-entering
-- credentials).

create table public.user_oauth_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('gmail', 'outlook', 'teams')),
  client_id text not null,
  client_secret text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index user_oauth_configs_user_id_idx on public.user_oauth_configs(user_id);

alter table public.user_oauth_configs enable row level security;

-- Same pattern as user_integrations — RLS restricts rows to the owner.
-- Edge Functions read via service-role key (bypasses RLS) only after
-- verifying the caller's JWT or the signed state token.
create policy "user_oauth_configs_select_own" on public.user_oauth_configs
  for select using (auth.uid() = user_id);

create policy "user_oauth_configs_insert_own" on public.user_oauth_configs
  for insert with check (auth.uid() = user_id);

create policy "user_oauth_configs_update_own" on public.user_oauth_configs
  for update using (auth.uid() = user_id);

create policy "user_oauth_configs_delete_own" on public.user_oauth_configs
  for delete using (auth.uid() = user_id);

create trigger user_oauth_configs_set_updated_at
  before update on public.user_oauth_configs
  for each row execute function public.set_updated_at();
