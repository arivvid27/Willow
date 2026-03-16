-- ============================================================
--  Willow — Supabase Database Schema
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ── Profiles ──────────────────────────────────────────────────
-- One profile = one care recipient (child/adult being supported)
create table public.profiles (
  id              uuid primary key default uuid_generate_v4(),
  child_name      text not null,
  date_of_birth   date,
  diagnosis_notes text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz default now()
);

-- ── Caregiver Access ──────────────────────────────────────────
-- Many caregivers ↔ many profiles (join table)
create table public.caregiver_access (
  id         uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'viewer' check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz default now(),
  unique (profile_id, user_id)
);

-- ── Daily Logs ────────────────────────────────────────────────
create table public.logs (
  id           uuid primary key default uuid_generate_v4(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  caregiver_id uuid not null references auth.users(id) on delete set null,
  mood         integer not null check (mood between 1 and 10),
  sleep        numeric(4,1) not null check (sleep between 0 and 24),
  medications  text[],         -- Array of medication names taken
  notes        text,
  created_at   timestamptz default now()
);

-- ── Row-Level Security ────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.caregiver_access enable row level security;
alter table public.logs enable row level security;

-- Profiles: visible to users who have caregiver_access
create policy "Caregivers can view their profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.caregiver_access ca
      where ca.profile_id = profiles.id
        and ca.user_id = auth.uid()
    )
  );

create policy "Profile owners can update"
  on public.profiles for update
  using (
    exists (
      select 1 from public.caregiver_access ca
      where ca.profile_id = profiles.id
        and ca.user_id = auth.uid()
        and ca.role = 'owner'
    )
  );

create policy "Authenticated users can create profiles"
  on public.profiles for insert
  with check (auth.uid() is not null);

-- caregiver_access: users see their own rows
create policy "Users see own access rows"
  on public.caregiver_access for select
  using (user_id = auth.uid());

create policy "Owners can manage access"
  on public.caregiver_access for all
  using (
    exists (
      select 1 from public.caregiver_access ca
      where ca.profile_id = caregiver_access.profile_id
        and ca.user_id = auth.uid()
        and ca.role = 'owner'
    )
  );

create policy "Self-insert on signup"
  on public.caregiver_access for insert
  with check (user_id = auth.uid());

-- Logs: caregivers with access can view/insert
create policy "Caregivers can view logs"
  on public.logs for select
  using (
    exists (
      select 1 from public.caregiver_access ca
      where ca.profile_id = logs.profile_id
        and ca.user_id = auth.uid()
    )
  );

create policy "Caregivers can insert logs"
  on public.logs for insert
  with check (
    caregiver_id = auth.uid()
    and exists (
      select 1 from public.caregiver_access ca
      where ca.profile_id = logs.profile_id
        and ca.user_id = auth.uid()
    )
  );

-- ── Enable Realtime ───────────────────────────────────────────
-- In Supabase Dashboard → Database → Replication, also enable these tables.
alter publication supabase_realtime add table public.logs;

-- ── Indexes ───────────────────────────────────────────────────
create index on public.logs (profile_id, created_at desc);
create index on public.caregiver_access (user_id);
create index on public.caregiver_access (profile_id);
