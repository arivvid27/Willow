-- ============================================================
--  Willow — Migration: Care Profile + Invite Codes
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Extend profiles table ─────────────────────────────────────
alter table public.profiles
  add column if not exists full_name          text,
  add column if not exists diagnoses          text[],
  add column if not exists allergies          text[],
  add column if not exists emergency_contact  text,
  add column if not exists emergency_phone    text,
  add column if not exists therapist_name     text,
  add column if not exists school_name        text,
  add column if not exists additional_notes   text,
  add column if not exists updated_at         timestamptz default now();

-- Backfill full_name from child_name for existing rows
update public.profiles set full_name = child_name where full_name is null;

-- ── Invite codes ──────────────────────────────────────────────
-- Owners generate a short code; other caregivers enter it to join
create table if not exists public.invite_codes (
  id         uuid primary key default uuid_generate_v4(),
  code       text not null unique,             -- 8-char uppercase code e.g. "WILLOW42"
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'editor' check (role in ('editor', 'viewer')),
  used_by    uuid references auth.users(id) on delete set null,
  used_at    timestamptz,
  expires_at timestamptz default (now() + interval '7 days'),
  created_at timestamptz default now()
);

-- RLS for invite_codes
alter table public.invite_codes enable row level security;

-- Owners can create and view codes for their profiles
create policy "Owners can manage invite codes"
  on public.invite_codes for all
  using (
    profile_id in (
      select profile_id from public.caregiver_access
      where user_id = auth.uid() and role = 'owner'
    )
  )
  with check (
    profile_id in (
      select profile_id from public.caregiver_access
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- Anyone authenticated can look up a code to join (SELECT only)
create policy "Authenticated users can look up invite codes"
  on public.invite_codes for select
  using (auth.uid() is not null);

-- Anyone authenticated can mark a code as used (UPDATE used_by/used_at)
create policy "Authenticated users can redeem invite codes"
  on public.invite_codes for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- ── Indexes ───────────────────────────────────────────────────
create index if not exists invite_codes_code on public.invite_codes (code);
create index if not exists invite_codes_profile on public.invite_codes (profile_id);

-- ── Updated-at trigger for profiles ──────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ── Fix: allow editors to update profiles (not just owners) ──
-- Drop old restrictive policy and replace
drop policy if exists "Profile owners can update" on public.profiles;

create policy "Caregivers with edit access can update profiles"
  on public.profiles for update
  using (
    id in (
      select profile_id from public.caregiver_access
      where user_id = auth.uid()
        and role in ('owner', 'editor')
    )
  );
