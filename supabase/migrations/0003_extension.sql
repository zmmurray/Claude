-- =============================================================================
-- SceneArc — Phase Two: Chrome extension pairing + generation results
-- =============================================================================

-- -----------------------------------------------------------------------------
-- extension_pairings: short-lived one-time codes to link the extension.
-- -----------------------------------------------------------------------------
create table if not exists public.extension_pairings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  code       text not null unique,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists extension_pairings_code_idx on public.extension_pairings (code);

-- -----------------------------------------------------------------------------
-- extension_tokens: long-lived bearer tokens issued to a paired extension.
-- Only a hash of the token is stored; the raw token is shown once at pairing.
-- -----------------------------------------------------------------------------
create table if not exists public.extension_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  token_hash   text not null unique,
  label        text not null default 'Chrome extension',
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);
create index if not exists extension_tokens_user_id_idx on public.extension_tokens (user_id);

-- -----------------------------------------------------------------------------
-- generation_tasks: add link to a prompt package + an "active" flag so the
-- extension knows which task to show.
-- -----------------------------------------------------------------------------
alter table public.generation_tasks
  add column if not exists prompt_package_id uuid references public.prompt_packages (id) on delete set null;
alter table public.generation_tasks
  add column if not exists is_active boolean not null default false;

-- -----------------------------------------------------------------------------
-- generation_results: imported results for a task.
-- -----------------------------------------------------------------------------
create table if not exists public.generation_results (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.generation_tasks (id) on delete cascade,
  project_id   uuid not null references public.projects (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  scene_id     uuid references public.scenes (id) on delete set null,
  prompt_package_id uuid references public.prompt_packages (id) on delete set null,
  kind         text not null default 'image',          -- 'image' | 'video'
  source       text not null default 'extension',      -- 'extension' | 'manual'
  storage_path text,
  source_url   text,
  status       text not null default 'imported',        -- imported|approved|rejected|revision_requested
  notes        text not null default '',
  created_at   timestamptz not null default now()
);
create index if not exists generation_results_task_id_idx on public.generation_results (task_id);

-- =============================================================================
-- Row Level Security (owner-only) for the new tables.
-- =============================================================================
alter table public.extension_pairings  enable row level security;
alter table public.extension_tokens    enable row level security;
alter table public.generation_results  enable row level security;

do $$
declare
  t text;
  owner_tables text[] := array['extension_pairings', 'extension_tokens', 'generation_results'];
begin
  foreach t in array owner_tables loop
    execute format('create policy %I on public.%I for select using (user_id = auth.uid());', t || '_select_own', t);
    execute format('create policy %I on public.%I for insert with check (user_id = auth.uid());', t || '_insert_own', t);
    execute format('create policy %I on public.%I for update using (user_id = auth.uid()) with check (user_id = auth.uid());', t || '_update_own', t);
    execute format('create policy %I on public.%I for delete using (user_id = auth.uid());', t || '_delete_own', t);
  end loop;
end;
$$;
