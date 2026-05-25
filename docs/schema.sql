-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

create table sessions (
  id text primary key,
  week integer not null,
  day_name text,
  day_label text,
  date date,
  notes text,
  weights text,
  back_pain text,
  night_shift boolean default false,
  technique_feel text,
  energy_level text,
  focus_next text,
  rating text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table sets (
  id text primary key,
  week integer not null,
  day_id text not null,
  exercise_name text not null,
  set_index integer not null,
  done boolean default false,
  weight numeric,
  updated_at timestamptz default now()
);

create table reviews (
  week integer primary key,
  rating text,
  energy_trend text,
  injuries jsonb default '[]',
  general_notes text,
  ai_response text,
  confirmed boolean default false,
  days jsonb default '{}',
  updated_at timestamptz default now()
);

-- Row Level Security — allow anonymous read/write (single-user personal app)
alter table sessions enable row level security;
alter table sets enable row level security;
alter table reviews enable row level security;

create policy "allow all" on sessions for all to anon using (true) with check (true);
create policy "allow all" on sets for all to anon using (true) with check (true);
create policy "allow all" on reviews for all to anon using (true) with check (true);

-- NOTE: RLS allows full anon access. Intentional for single-athlete personal app.

-- Performance indexes for sets table queries
create index idx_sets_week_day on sets(week, day_id);
create index idx_sets_week_day_exercise on sets(week, day_id, exercise_name);
