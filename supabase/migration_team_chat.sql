-- ============================================================
--  Willow — Migration: Team Chat
--  Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Team chat messages ────────────────────────────────────────
create table if not exists public.team_messages (
  id           uuid primary key default uuid_generate_v4(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  sender_id    uuid not null references auth.users(id) on delete cascade,
  sender_name  text,                        -- display name cached at send time
  content      text not null,
  created_at   timestamptz default now()
);

alter table public.team_messages enable row level security;

-- Members of the care team can read messages
create policy "Team members can read messages"
  on public.team_messages for select
  using (
    profile_id in (
      select profile_id from public.caregiver_access
      where user_id = auth.uid()
    )
  );

-- Members can send messages
create policy "Team members can send messages"
  on public.team_messages for insert
  with check (
    sender_id = auth.uid()
    and profile_id in (
      select profile_id from public.caregiver_access
      where user_id = auth.uid()
    )
  );

-- Realtime for team messages
alter publication supabase_realtime add table public.team_messages;

create index if not exists team_messages_profile_created
  on public.team_messages (profile_id, created_at desc);
