-- One dashboard layout per user. layout_config holds the full grid shape:
--   { widgets: [{ i, x, y, w, h, type, settings }], gridCols, editMode, ... }
-- version supports optimistic concurrency when we add multi-device sync later.
create table public.dashboard_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  layout_config jsonb not null default '{"widgets": []}'::jsonb,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index dashboard_states_user_id_idx on public.dashboard_states(user_id);

alter table public.dashboard_states enable row level security;

create policy "dashboard_states_select_own" on public.dashboard_states
  for select using (auth.uid() = user_id);

create policy "dashboard_states_insert_own" on public.dashboard_states
  for insert with check (auth.uid() = user_id);

create policy "dashboard_states_update_own" on public.dashboard_states
  for update using (auth.uid() = user_id);

create policy "dashboard_states_delete_own" on public.dashboard_states
  for delete using (auth.uid() = user_id);

create trigger dashboard_states_set_updated_at
  before update on public.dashboard_states
  for each row execute function public.set_updated_at();
