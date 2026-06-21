-- =============================================================================
-- SceneArc — Phase One database schema + Row Level Security
-- =============================================================================
-- Every table carries a `user_id` and enables RLS so a user can only ever read
-- or write their own rows. Child tables also reference their project for
-- relational integrity, but ownership is enforced directly on `user_id` for
-- simple, robust policies.
-- =============================================================================

-- Enable useful extensions (uuid generation).
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- profiles: one row per authenticated user.
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at  timestamptz not null default now()
);

-- Automatically create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- projects
-- -----------------------------------------------------------------------------
create table if not exists public.projects (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  title              text not null,
  creative_direction jsonb not null default '{}'::jsonb,
  -- workflow status: draft -> analyzed -> approved
  status             text not null default 'draft',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists projects_user_id_idx on public.projects (user_id);

-- -----------------------------------------------------------------------------
-- scripts (original pasted/uploaded text)
-- -----------------------------------------------------------------------------
create table if not exists public.scripts (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  original_text text not null,
  created_at    timestamptz not null default now()
);
create index if not exists scripts_project_id_idx on public.scripts (project_id);

-- -----------------------------------------------------------------------------
-- characters
-- -----------------------------------------------------------------------------
create table if not exists public.characters (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  entity_key    text not null,
  name          text not null,
  description   text not null default '',
  relationships text[] not null default '{}',
  created_at    timestamptz not null default now(),
  unique (project_id, entity_key)
);
create index if not exists characters_project_id_idx on public.characters (project_id);

-- -----------------------------------------------------------------------------
-- locations
-- -----------------------------------------------------------------------------
create table if not exists public.locations (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  entity_key  text not null,
  name        text not null,
  description text not null default '',
  created_at  timestamptz not null default now(),
  unique (project_id, entity_key)
);
create index if not exists locations_project_id_idx on public.locations (project_id);

-- -----------------------------------------------------------------------------
-- scenes
-- -----------------------------------------------------------------------------
create table if not exists public.scenes (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references public.projects (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  location_id      uuid references public.locations (id) on delete set null,
  entity_key       text not null,
  number           text not null,
  slugline         text not null default '',
  summary          text not null default '',
  time_of_day      text not null default 'UNSPECIFIED',
  props            text[] not null default '{}',
  continuity_notes text[] not null default '{}',
  wardrobe         jsonb not null default '[]'::jsonb,
  suggested_stages text[] not null default '{}',
  position         integer not null default 0,
  created_at       timestamptz not null default now(),
  unique (project_id, entity_key)
);
create index if not exists scenes_project_id_idx on public.scenes (project_id);

-- -----------------------------------------------------------------------------
-- scene_beats
-- -----------------------------------------------------------------------------
create table if not exists public.scene_beats (
  id          uuid primary key default gen_random_uuid(),
  scene_id    uuid not null references public.scenes (id) on delete cascade,
  project_id  uuid not null references public.projects (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  beat_order  integer not null,
  description text not null,
  created_at  timestamptz not null default now()
);
create index if not exists scene_beats_scene_id_idx on public.scene_beats (scene_id);

-- -----------------------------------------------------------------------------
-- scene_characters (join: which characters appear in which scene)
-- -----------------------------------------------------------------------------
create table if not exists public.scene_characters (
  id           uuid primary key default gen_random_uuid(),
  scene_id     uuid not null references public.scenes (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  project_id   uuid not null references public.projects (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (scene_id, character_id)
);
create index if not exists scene_characters_scene_id_idx on public.scene_characters (scene_id);

-- -----------------------------------------------------------------------------
-- assets (uploaded references / imported results — minimal in Phase One)
-- -----------------------------------------------------------------------------
create table if not exists public.assets (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  scene_id     uuid references public.scenes (id) on delete set null,
  kind         text not null default 'reference',
  storage_path text,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists assets_project_id_idx on public.assets (project_id);

-- -----------------------------------------------------------------------------
-- generation_tasks
-- -----------------------------------------------------------------------------
create table if not exists public.generation_tasks (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  scene_id        uuid references public.scenes (id) on delete cascade,
  stage           text not null default 'scene_still',
  target_platform text not null default 'generic_image_generator',
  status          text not null default 'prepared',
  created_at      timestamptz not null default now()
);
create index if not exists generation_tasks_project_id_idx on public.generation_tasks (project_id);

-- -----------------------------------------------------------------------------
-- prompt_packages
-- -----------------------------------------------------------------------------
create table if not exists public.prompt_packages (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references public.projects (id) on delete cascade,
  user_id            uuid not null references auth.users (id) on delete cascade,
  scene_id           uuid references public.scenes (id) on delete cascade,
  generation_task_id uuid references public.generation_tasks (id) on delete set null,
  stage              text not null default 'scene_still',
  target_platform    text not null default 'generic_image_generator',
  payload            jsonb not null,
  created_at         timestamptz not null default now()
);
create index if not exists prompt_packages_scene_id_idx on public.prompt_packages (scene_id);

-- -----------------------------------------------------------------------------
-- approvals
-- -----------------------------------------------------------------------------
create table if not exists public.approvals (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  subject_type text not null,            -- e.g. 'breakdown', 'asset'
  subject_id   uuid,                     -- nullable for project-level subjects
  status       text not null default 'approved',
  created_at   timestamptz not null default now()
);
create index if not exists approvals_project_id_idx on public.approvals (project_id);

-- -----------------------------------------------------------------------------
-- revision_requests
-- -----------------------------------------------------------------------------
create table if not exists public.revision_requests (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  subject_type text not null,
  subject_id   uuid,
  notes        text not null default '',
  created_at   timestamptz not null default now()
);
create index if not exists revision_requests_project_id_idx on public.revision_requests (project_id);

-- =============================================================================
-- Row Level Security
-- =============================================================================
-- Enable RLS and add owner-only policies for every table.

alter table public.profiles          enable row level security;
alter table public.projects          enable row level security;
alter table public.scripts           enable row level security;
alter table public.characters        enable row level security;
alter table public.locations         enable row level security;
alter table public.scenes            enable row level security;
alter table public.scene_beats       enable row level security;
alter table public.scene_characters  enable row level security;
alter table public.assets            enable row level security;
alter table public.generation_tasks  enable row level security;
alter table public.prompt_packages   enable row level security;
alter table public.approvals         enable row level security;
alter table public.revision_requests enable row level security;

-- profiles: a user can see/update only their own profile.
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

-- Helper: generate identical owner-only policies for a user_id table.
do $$
declare
  t text;
  owner_tables text[] := array[
    'projects', 'scripts', 'characters', 'locations', 'scenes',
    'scene_beats', 'scene_characters', 'assets', 'generation_tasks',
    'prompt_packages', 'approvals', 'revision_requests'
  ];
begin
  foreach t in array owner_tables loop
    execute format(
      'create policy %I on public.%I for select using (user_id = auth.uid());',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert with check (user_id = auth.uid());',
      t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update using (user_id = auth.uid()) with check (user_id = auth.uid());',
      t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete using (user_id = auth.uid());',
      t || '_delete_own', t);
  end loop;
end;
$$;

-- =============================================================================
-- Storage bucket for project files (references / imports). Private by default.
-- Files are stored under a path beginning with the owner's user id:
--   <user_id>/<project_id>/<filename>
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('project-assets', 'project-assets', false)
on conflict (id) do nothing;

create policy "project_assets_select_own" on storage.objects
  for select using (
    bucket_id = 'project-assets' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "project_assets_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'project-assets' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "project_assets_update_own" on storage.objects
  for update using (
    bucket_id = 'project-assets' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "project_assets_delete_own" on storage.objects
  for delete using (
    bucket_id = 'project-assets' and (storage.foldername(name))[1] = auth.uid()::text
  );
