-- ============================================================
--  Willow — Migration: Team Member Info Function
--  Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- This function lets caregivers see the name + email of
-- other members on the same care team, without exposing
-- the full auth.users table publicly.

create or replace function public.get_team_members(p_profile_id uuid)
returns table (
  user_id    uuid,
  email      text,
  full_name  text,
  role       text,
  joined_at  timestamptz
)
language plpgsql
security definer          -- runs as the DB owner, can read auth.users
set search_path = public
as $$
begin
  -- Caller must be a member of this profile's care team
  if not exists (
    select 1 from public.caregiver_access
    where profile_id = p_profile_id
      and user_id = auth.uid()
  ) then
    raise exception 'Access denied';
  end if;

  return query
    select
      ca.user_id,
      au.email::text,
      coalesce(
        au.raw_user_meta_data->>'full_name',
        au.raw_user_meta_data->>'name',
        split_part(au.email, '@', 1)   -- fallback: email prefix
      )::text                           as full_name,
      ca.role,
      ca.created_at                     as joined_at
    from public.caregiver_access ca
    join auth.users au on au.id = ca.user_id
    where ca.profile_id = p_profile_id
    order by ca.created_at asc;
end;
$$;

-- Grant execute to authenticated users
grant execute on function public.get_team_members(uuid) to authenticated;
