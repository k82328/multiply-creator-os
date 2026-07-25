-- MULTIPLY Creator OS — Supabase schema
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query) once per project.

-- ---------- per-user tables ----------

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default '',
  service text not null default '',
  audience text not null default '',
  tone text not null default '',
  price text not null default '',
  trait text not null default '',
  avoid text not null default '',
  updated_at timestamptz not null default now()
);
alter table profiles enable row level security;
create policy "own profile select" on profiles for select using (auth.uid() = id);
create policy "own profile insert" on profiles for insert with check (auth.uid() = id);
create policy "own profile update" on profiles for update using (auth.uid() = id);

create table if not exists daily_tasks (
  user_id uuid not null references auth.users(id) on delete cascade,
  task_date date not null,
  done jsonb not null default '{}'::jsonb,
  primary key (user_id, task_date)
);
alter table daily_tasks enable row level security;
create policy "own daily tasks" on daily_tasks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists execution_reports (
  user_id uuid not null references auth.users(id) on delete cascade,
  report_date date not null,
  primary key (user_id, report_date)
);
alter table execution_reports enable row level security;
create policy "own execution reports" on execution_reports for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists analytics_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  week date not null,
  values jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, week)
);
alter table analytics_history enable row level security;
create policy "own analytics" on analytics_history for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists growth_checklist (
  user_id uuid primary key references auth.users(id) on delete cascade,
  checks jsonb not null default '{}'::jsonb
);
alter table growth_checklist enable row level security;
create policy "own growth checklist" on growth_checklist for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- team-shared tables ----------
-- Any authenticated (logged-in) team member can read/write these.
-- A real per-role permission model (designer/主管/教育長/...) is a known follow-up — see project memory.

create table if not exists content_calendar (
  year int not null,
  month int not null,
  day int not null,
  topic text not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (year, month, day)
);
alter table content_calendar enable row level security;
create policy "team read calendar" on content_calendar for select using (auth.role() = 'authenticated');
create policy "team write calendar" on content_calendar for insert with check (auth.role() = 'authenticated');
create policy "team update calendar" on content_calendar for update using (auth.role() = 'authenticated');
create policy "team delete calendar" on content_calendar for delete using (auth.role() = 'authenticated');

create table if not exists tag_items (
  id bigint generated always as identity primary key,
  list_key text not null check (list_key in ('content-categories','pain-points','service-topics')),
  label text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table tag_items enable row level security;
create policy "team read tags" on tag_items for select using (auth.role() = 'authenticated');
create policy "team write tags" on tag_items for insert with check (auth.role() = 'authenticated');
create policy "team delete tags" on tag_items for delete using (auth.role() = 'authenticated');

create table if not exists publishing_board (
  id bigint generated always as identity primary key,
  title text not null,
  status text not null default '草稿' check (status in ('草稿','待審核','已排程','已發布')),
  owner_nickname text not null default '未命名',
  owner_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table publishing_board enable row level security;
create policy "team read board" on publishing_board for select using (auth.role() = 'authenticated');
create policy "team write board" on publishing_board for insert with check (auth.role() = 'authenticated');
create policy "team update board" on publishing_board for update using (auth.role() = 'authenticated');
create policy "team delete board" on publishing_board for delete using (auth.role() = 'authenticated');

create table if not exists leaderboard (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  count int not null default 0
);
alter table leaderboard enable row level security;
create policy "team read leaderboard" on leaderboard for select using (auth.role() = 'authenticated');
create policy "own leaderboard insert" on leaderboard for insert with check (auth.uid() = user_id);
create policy "own leaderboard update" on leaderboard for update using (auth.uid() = user_id);
