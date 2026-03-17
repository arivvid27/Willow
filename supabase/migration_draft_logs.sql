-- ============================================================
--  Willow — Migration: Draft Logs
--  Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Add status + edit tracking to logs
alter table public.logs
  add column if not exists status          text not null default 'published'
    check (status in ('draft', 'published')),
  add column if not exists last_edited_by  uuid references auth.users(id) on delete set null,
  add column if not exists updated_at      timestamptz default now();

-- Backfill existing rows as published
update public.logs set status = 'published' where status is null;

-- Remove NOT NULL constraints that block saving drafts with partial data
-- (mood and sleep may be blank when first saving a draft)
alter table public.logs
  alter column mood  drop not null,
  alter column sleep drop not null;

-- Re-add soft constraints as CHECK with null allowed
alter table public.logs
  drop constraint if exists logs_mood_check,
  drop constraint if exists logs_sleep_check;

alter table public.logs
  add constraint logs_mood_check  check (mood  is null or (mood  between 1 and 10)),
  add constraint logs_sleep_check check (sleep is null or (sleep between 0 and 24));

-- Updated-at trigger for logs
create or replace function public.set_logs_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists logs_updated_at on public.logs;
create trigger logs_updated_at
  before update on public.logs
  for each row execute procedure public.set_logs_updated_at();

-- ── RLS: allow any team member to UPDATE a log ────────────────
-- (previously only the caregiver_id could write logs)
drop policy if exists "Caregivers can insert logs" on public.logs;

create policy "Caregivers can insert logs"
  on public.logs for insert
  with check (
    profile_id in (
      select profile_id from public.caregiver_access
      where user_id = auth.uid()
    )
  );

-- Allow any team member to edit any log for their profile
create policy "Team members can update logs"
  on public.logs for update
  using (
    profile_id in (
      select profile_id from public.caregiver_access
      where user_id = auth.uid()
    )
  )
  with check (
    profile_id in (
      select profile_id from public.caregiver_access
      where user_id = auth.uid()
    )
  );

-- Enable realtime UPDATE events for logs (in addition to INSERT/DELETE)
-- (Already added in schema.sql — this is a no-op if already set)
alter publication supabase_realtime add table public.logs;
