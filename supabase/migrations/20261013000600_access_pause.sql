-- =============================================================================
-- Konten vorübergehend pausieren (Daten bleiben erhalten)
-- =============================================================================
-- Ein pausiertes Konto kann sich anmelden und sein eigenes Profil lesen (für den
-- Hinweis „Zugang pausiert“), sieht aber keine Fachdaten mehr: Die zentralen
-- RLS-Helfer liefern für pausierte Nutzer nichts.

alter table public.profiles add column access_paused_at timestamptz;

create function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and access_paused_at is null
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_app_role() = 'admin', false) and private.is_active_user();
$$;

create or replace function private.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_app_role() in ('admin', 'teacher'), false) and private.is_active_user();
$$;

create or replace function private.my_student_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id
    from public.students s
   where s.profile_id = (select auth.uid())
     and private.is_active_user();
$$;

revoke all on function private.is_active_user() from public, anon;
grant execute on function private.is_active_user() to authenticated;

-- Pausieren / reaktivieren:
--   * Lehrer: Konten der eigenen Schüler
--   * Admin: alle Konten außer dem eigenen
create function public.set_access_paused(p_profile_id uuid, p_paused boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
begin
  if p_profile_id = (select auth.uid()) then
    raise exception 'cannot_pause_self' using errcode = 'P0001';
  end if;

  select role into v_role from public.profiles where id = p_profile_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if not (
    private.is_admin()
    or (
      v_role = 'student'
      and exists (
        select 1 from public.students s
         where s.profile_id = p_profile_id and private.can_manage_teacher_data(s.teacher_id)
      )
    )
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  update public.profiles
     set access_paused_at = case when p_paused then coalesce(access_paused_at, now()) else null end
   where id = p_profile_id;
end;
$$;

revoke all on function public.set_access_paused(uuid, boolean) from public, anon;
grant execute on function public.set_access_paused(uuid, boolean) to authenticated;
