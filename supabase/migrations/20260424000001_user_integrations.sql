-- One row per (user, provider) for OAuth integrations (Gmail, Outlook, Teams, …).
-- Tokens live server-side — the frontend never reads these columns directly.
-- Edge Functions use the service-role key to upsert / refresh / read tokens
-- on behalf of the authenticated user, then expose only the downstream API
-- results (e.g. message lists) back to the browser.
create table public.user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('gmail', 'outlook', 'teams')),
  account_email text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index user_integrations_user_id_idx on public.user_integrations(user_id);

alter table public.user_integrations enable row level security;

-- Users can see the non-sensitive metadata of their own integration rows
-- from the frontend (the widget needs to know "am I connected, and to
-- which email?"). Token columns stay readable by the row owner too because
-- PostgREST doesn't support per-column RLS; in practice the frontend only
-- SELECTs id, provider, account_email, scopes, token_expires_at — never
-- access_token / refresh_token.
create policy "user_integrations_select_own" on public.user_integrations
  for select using (auth.uid() = user_id);

create policy "user_integrations_insert_own" on public.user_integrations
  for insert with check (auth.uid() = user_id);

create policy "user_integrations_update_own" on public.user_integrations
  for update using (auth.uid() = user_id);

create policy "user_integrations_delete_own" on public.user_integrations
  for delete using (auth.uid() = user_id);

create trigger user_integrations_set_updated_at
  before update on public.user_integrations
  for each row execute function public.set_updated_at();
