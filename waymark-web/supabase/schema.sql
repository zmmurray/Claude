-- Waymark schema. Run once in the Supabase SQL editor.
-- Every table is locked to the signed-in user via row-level security.

-- Profile: one row per user; freeform context the strategist always reads.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  context text default '',
  created_at timestamptz not null default now()
);

-- Goals: broad, long-term — the "why".
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  notes text default '',
  created_at timestamptz not null default now()
);

-- Projects: the irons in the fire.
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references goals(id) on delete set null,
  name text not null,
  importance int not null default 3 check (importance between 1 and 5),
  deadline_type text not null default 'none' check (deadline_type in ('none','soft','hard')),
  deadline date,
  notes text default '',
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);

-- Tasks: small to-dos under a project. `urgent` = a must-do-soon the engine should
-- surface first even if it doesn't move the big needle.
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  urgent boolean not null default false,
  effort text default 'medium' check (effort in ('quick','medium','deep')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- The strategist conversation.
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- The engine's latest output, cached so "Right now" loads instantly.
create table if not exists focus_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gist text default '',
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_projects_user on projects(user_id);
create index if not exists idx_tasks_user on tasks(user_id);
create index if not exists idx_tasks_project on tasks(project_id);
create index if not exists idx_goals_user on goals(user_id);
create index if not exists idx_chat_user on chat_messages(user_id, created_at);
create index if not exists idx_focus_user on focus_snapshots(user_id, created_at desc);

-- Row-level security: a user only ever sees their own rows.
alter table profiles enable row level security;
alter table goals enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table chat_messages enable row level security;
alter table focus_snapshots enable row level security;

do $$
declare t text;
begin
  foreach t in array array['goals','projects','tasks','chat_messages','focus_snapshots']
  loop
    execute format('drop policy if exists "own rows" on %I;', t);
    execute format($f$create policy "own rows" on %I
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);$f$, t);
  end loop;
end $$;

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Create a profile row automatically when a user signs up.
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();
