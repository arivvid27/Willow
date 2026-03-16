-- ============================================================
--  Willow — Migration: Extended Daily Log Fields
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Add new columns to the logs table
alter table public.logs
  -- Overall day rating
  add column if not exists day_rating text check (day_rating in ('good', 'neutral', 'bad')),

  -- Time tracking (hours, nullable)
  add column if not exists hours_school    numeric(4,1),
  add column if not exists hours_outdoor   numeric(4,1),
  add column if not exists hours_aba       numeric(4,1),
  add column if not exists hours_home      numeric(4,1),
  add column if not exists hours_screen    numeric(4,1),

  -- Outdoor activities (array of tags)
  add column if not exists outdoor_activities text[],

  -- Food by meal (arrays of tags)
  add column if not exists food_breakfast text[],
  add column if not exists food_lunch     text[],
  add column if not exists food_dinner    text[],
  add column if not exists food_snacks    text[];

-- ── Persistent tag suggestions ────────────────────────────────
-- Stores user-specific tag history for medications, food, outdoor activities
create table if not exists public.tag_suggestions (
  id         uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  category   text not null,   -- 'medication' | 'food' | 'outdoor_activity'
  value      text not null,
  use_count  integer not null default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (profile_id, category, value)
);

-- RLS for tag_suggestions
alter table public.tag_suggestions enable row level security;

create policy "Caregivers can view tag suggestions"
  on public.tag_suggestions for select
  using (
    profile_id in (
      select profile_id from public.caregiver_access
      where user_id = auth.uid()
    )
  );

create policy "Caregivers can insert tag suggestions"
  on public.tag_suggestions for insert
  with check (
    profile_id in (
      select profile_id from public.caregiver_access
      where user_id = auth.uid()
    )
  );

create policy "Caregivers can update tag suggestions"
  on public.tag_suggestions for update
  using (
    profile_id in (
      select profile_id from public.caregiver_access
      where user_id = auth.uid()
    )
  );

-- Index for fast lookups
create index if not exists tag_suggestions_profile_category
  on public.tag_suggestions (profile_id, category, use_count desc);
