-- =============================================================================
-- SceneArc — Phase Three: real generation provider (Freepik)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- provider_credentials: a user's own third-party API key, stored ENCRYPTED.
-- The raw key is never stored; only AES-256-GCM ciphertext + iv + auth tag.
-- -----------------------------------------------------------------------------
create table if not exists public.provider_credentials (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  provider      text not null,                 -- e.g. 'freepik'
  encrypted_key text not null,
  iv            text not null,
  auth_tag      text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, provider)
);

-- -----------------------------------------------------------------------------
-- generation_tasks: track the external provider job.
-- -----------------------------------------------------------------------------
alter table public.generation_tasks
  add column if not exists provider text;
alter table public.generation_tasks
  add column if not exists provider_model text;
alter table public.generation_tasks
  add column if not exists provider_task_id text;
alter table public.generation_tasks
  add column if not exists provider_status text;
alter table public.generation_tasks
  add column if not exists error_message text;

-- =============================================================================
-- Row Level Security (owner-only).
-- =============================================================================
alter table public.provider_credentials enable row level security;

create policy "provider_credentials_select_own" on public.provider_credentials
  for select using (user_id = auth.uid());
create policy "provider_credentials_insert_own" on public.provider_credentials
  for insert with check (user_id = auth.uid());
create policy "provider_credentials_update_own" on public.provider_credentials
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "provider_credentials_delete_own" on public.provider_credentials
  for delete using (user_id = auth.uid());
