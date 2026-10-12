-- =============================================================================
-- M1 · Kern: Profile, Rollen, Lehrer-Einstellungen, Schüler, Einladungen, RLS
-- =============================================================================
-- Grundsätze:
--   * Jede Tabelle hat RLS aktiv. Supabase vergibt per Default-Privileges ALL an
--     anon/authenticated – das wird hier explizit zurückgenommen und durch
--     spaltengenaue GRANTs ersetzt.
--   * Helper-Funktionen liegen im nicht exponierten Schema `private`.
--   * Rollen kommen ausschliesslich aus auth.users.raw_app_meta_data (nur
--     serverseitig setzbar) – nie aus Client-Eingaben.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Typen
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'teacher', 'student');
create type public.app_locale as enum ('de', 'vi');
create type public.cefr_level as enum ('A1', 'A2', 'B1', 'B2');
create type public.student_status as enum ('active', 'inactive', 'archived');
create type public.currency_code as enum ('EUR', 'VND');

-- ---------------------------------------------------------------------------
-- Allgemeine Helfer
-- ---------------------------------------------------------------------------
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create function private.is_valid_timezone(tz text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from pg_catalog.pg_timezone_names where name = tz);
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'student',
  display_name text not null default '' check (char_length(display_name) <= 100),
  email text,
  timezone text not null default 'Europe/Zurich' check (private.is_valid_timezone(timezone)),
  locale public.app_locale not null default 'de',
  reminder_offsets_min integer[] not null default '{1440,60}'
    check (cardinality(reminder_offsets_min) <= 5),
  privacy_consent_version text,
  privacy_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- teacher_settings
-- ---------------------------------------------------------------------------
create table public.teacher_settings (
  teacher_id uuid primary key references public.profiles (id) on delete cascade,
  buffer_minutes integer not null default 15 check (buffer_minutes between 0 and 240),
  default_duration_min integer not null default 60 check (default_duration_min between 15 and 480),
  cancel_deadline_hours integer not null default 24 check (cancel_deadline_hours between 0 and 336),
  default_timezone text not null default 'Europe/Zurich'
    check (private.is_valid_timezone(default_timezone)),
  updated_at timestamptz not null default now()
);

create trigger teacher_settings_updated_at
before update on public.teacher_settings
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- students
-- ---------------------------------------------------------------------------
create table public.students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  profile_id uuid unique references public.profiles (id) on delete set null,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 100),
  last_name text check (char_length(last_name) <= 100),
  email text check (char_length(email) <= 320),
  phone text check (char_length(phone) <= 50),
  timezone text not null default 'Europe/Zurich' check (private.is_valid_timezone(timezone)),
  locale public.app_locale not null default 'de',
  start_level public.cefr_level,
  current_level public.cefr_level,
  goal text check (char_length(goal) <= 2000),
  status public.student_status not null default 'active',
  is_minor boolean not null default false,
  guardian_name text check (char_length(guardian_name) <= 200),
  guardian_email text check (char_length(guardian_email) <= 320),
  guardian_phone text check (char_length(guardian_phone) <= 50),
  guardian_consent_at timestamptz,
  hourly_rate numeric(12, 2) check (hourly_rate >= 0),
  currency public.currency_code not null default 'EUR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index students_teacher_id_idx on public.students (teacher_id);

create trigger students_updated_at
before update on public.students
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- invitations
-- ---------------------------------------------------------------------------
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid references public.students (id) on delete cascade,
  role public.app_role not null check (role in ('student', 'teacher')),
  code_hash text not null unique,
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  redeemed_by uuid references public.profiles (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check ((role = 'student') = (student_id is not null))
);

create index invitations_student_id_idx on public.invitations (student_id);

-- ---------------------------------------------------------------------------
-- Rollen-Helfer (security definer → umgehen RLS, daher keine Rekursion)
-- ---------------------------------------------------------------------------
create function private.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_app_role() = 'admin', false);
$$;

create function private.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_app_role() in ('admin', 'teacher'), false);
$$;

-- Darf der aktuelle Nutzer Daten des Lehrers p_teacher_id verwalten?
create function private.can_manage_teacher_data(p_teacher_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin()
      or (p_teacher_id = (select auth.uid()) and private.is_teacher());
$$;

-- Schüler-IDs des aktuellen Nutzers (ein Login = ein Schülerdatensatz, aber als Menge modelliert)
create function private.my_student_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.students where profile_id = (select auth.uid());
$$;

-- Ist p_profile_id ein Schüler des aktuellen Lehrers?
create function private.is_my_student_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.students
    where profile_id = p_profile_id and teacher_id = (select auth.uid())
  );
$$;

-- Ist p_profile_id der Lehrer des aktuellen Schülers?
create function private.is_my_teacher_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.students
    where profile_id = (select auth.uid()) and teacher_id = p_profile_id
  );
$$;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Neuer Auth-User → Profil (+ Lehrer-Einstellungen)
-- ---------------------------------------------------------------------------
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role := coalesce(
    (new.raw_app_meta_data ->> 'role')::public.app_role, 'student'
  );
  v_tz text := new.raw_user_meta_data ->> 'timezone';
  v_locale text := new.raw_user_meta_data ->> 'locale';
begin
  insert into public.profiles (id, role, email, display_name, timezone, locale)
  values (
    new.id,
    v_role,
    new.email,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 100),
    case when v_tz is not null and private.is_valid_timezone(v_tz) then v_tz else 'Europe/Zurich' end,
    case when v_locale in ('de', 'vi') then v_locale::public.app_locale else 'de' end
  );

  if v_role in ('admin', 'teacher') then
    insert into public.teacher_settings (teacher_id) values (new.id);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- Einmaliges Bootstrapping der ersten Admin-Person (nur im SQL-Editor als postgres):
--   select private.bootstrap_admin('mail@example.com');
create function private.bootstrap_admin(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  update public.profiles set role = 'admin' where lower(email) = lower(p_email) returning id into v_id;
  if v_id is null then
    raise exception 'no profile with email %', p_email;
  end if;
  insert into public.teacher_settings (teacher_id) values (v_id) on conflict do nothing;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.bootstrap_admin(text) from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS + Grants
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.teacher_settings enable row level security;
alter table public.students enable row level security;
alter table public.invitations enable row level security;

revoke all on public.profiles, public.teacher_settings, public.students, public.invitations
  from anon, authenticated;

-- profiles: lesen (sich selbst, eigene Schüler, eigene Lehrer, Admin alles);
-- ändern nur sich selbst und nur unkritische Spalten (Rolle bleibt tabu).
grant select on public.profiles to authenticated;
grant update (display_name, timezone, locale, reminder_offsets_min) on public.profiles to authenticated;

create policy profiles_select on public.profiles
for select to authenticated
using (
  id = (select auth.uid())
  or private.is_admin()
  or private.is_my_student_profile(id)
  or private.is_my_teacher_profile(id)
);

create policy profiles_update_self on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- teacher_settings: nur Besitzer bzw. Admin
grant select, update (buffer_minutes, default_duration_min, cancel_deadline_hours, default_timezone)
  on public.teacher_settings to authenticated;

create policy teacher_settings_select on public.teacher_settings
for select to authenticated
using (private.can_manage_teacher_data(teacher_id));

create policy teacher_settings_update on public.teacher_settings
for update to authenticated
using (private.can_manage_teacher_data(teacher_id))
with check (private.can_manage_teacher_data(teacher_id));

-- students: Lehrer verwaltet eigene, Schüler liest nur sich selbst.
-- profile_id wird nur serverseitig (Einladung) gesetzt, teacher_id ist unveränderlich.
grant select, delete on public.students to authenticated;
grant insert (
  teacher_id, first_name, last_name, email, phone, timezone, locale, start_level, current_level,
  goal, status, is_minor, guardian_name, guardian_email, guardian_phone, guardian_consent_at,
  hourly_rate, currency
) on public.students to authenticated;
grant update (
  first_name, last_name, email, phone, timezone, locale, start_level, current_level,
  goal, status, is_minor, guardian_name, guardian_email, guardian_phone, guardian_consent_at,
  hourly_rate, currency
) on public.students to authenticated;

create policy students_select on public.students
for select to authenticated
using (private.can_manage_teacher_data(teacher_id) or profile_id = (select auth.uid()));

create policy students_insert on public.students
for insert to authenticated
with check (private.can_manage_teacher_data(teacher_id));

create policy students_update on public.students
for update to authenticated
using (private.can_manage_teacher_data(teacher_id))
with check (private.can_manage_teacher_data(teacher_id));

create policy students_delete on public.students
for delete to authenticated
using (private.can_manage_teacher_data(teacher_id));

-- invitations: Lehrer sieht eigene (ohne Hash). Anlegen/Widerrufen nur per RPC.
grant select (id, teacher_id, student_id, role, expires_at, redeemed_at, redeemed_by, revoked_at, created_at)
  on public.invitations to authenticated;

create policy invitations_select on public.invitations
for select to authenticated
using (private.can_manage_teacher_data(teacher_id));

-- ---------------------------------------------------------------------------
-- Einladungen: Code-Erzeugung & RPCs
-- ---------------------------------------------------------------------------
-- 8 Zeichen aus 32 eindeutig lesbaren Zeichen (ohne 0/O/1/I) = 40 Bit.
create function private.generate_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(8);
  result text := '';
begin
  for i in 0..7 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return result;
end;
$$;

create function private.hash_invite_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(
    sha256(convert_to(upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')), 'UTF8')),
    'hex'
  );
$$;

-- Lehrer erzeugt Einladung für einen eigenen, noch nicht verknüpften Schüler.
-- Der Klartext-Code wird genau einmal zurückgegeben; gespeichert wird nur der Hash.
create function public.create_student_invitation(p_student_id uuid)
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student public.students%rowtype;
  v_code text := private.generate_invite_code();
  v_expires timestamptz := now() + interval '14 days';
begin
  select * into v_student from public.students where id = p_student_id;

  if not found or not private.can_manage_teacher_data(v_student.teacher_id) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if v_student.profile_id is not null then
    raise exception 'student_already_linked' using errcode = 'P0001';
  end if;
  if v_student.is_minor and v_student.guardian_consent_at is null then
    raise exception 'guardian_consent_required' using errcode = 'P0001';
  end if;

  -- Ältere offene Einladungen für diesen Schüler werden ungültig.
  update public.invitations i
     set revoked_at = now()
   where i.student_id = p_student_id and i.redeemed_at is null and i.revoked_at is null;

  insert into public.invitations (teacher_id, student_id, role, code_hash, expires_at)
  values (v_student.teacher_id, p_student_id, 'student', private.hash_invite_code(v_code), v_expires);

  return query select v_code, v_expires;
end;
$$;

-- Admin lädt weitere Lehrer ein.
create function public.create_teacher_invitation()
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := private.generate_invite_code();
  v_expires timestamptz := now() + interval '14 days';
begin
  if not private.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  insert into public.invitations (teacher_id, role, code_hash, expires_at)
  values ((select auth.uid()), 'teacher', private.hash_invite_code(v_code), v_expires);

  return query select v_code, v_expires;
end;
$$;

create function public.revoke_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_teacher uuid;
begin
  select teacher_id into v_teacher from public.invitations where id = p_invitation_id;
  if v_teacher is null or not private.can_manage_teacher_data(v_teacher) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  update public.invitations
     set revoked_at = now()
   where id = p_invitation_id and redeemed_at is null and revoked_at is null;
end;
$$;

-- Nur für die Edge Function `accept-invite` (service_role):
-- 1) gültige Einladung finden und Daten für das neue Konto liefern
create function public.find_open_invitation(p_code text)
returns table (
  invitation_id uuid,
  role public.app_role,
  student_id uuid,
  display_name text,
  timezone text,
  locale public.app_locale
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id,
         i.role,
         i.student_id,
         coalesce(btrim(s.first_name || ' ' || coalesce(s.last_name, '')), ''),
         coalesce(s.timezone, 'Europe/Zurich'),
         coalesce(s.locale, 'de')
    from public.invitations i
    left join public.students s on s.id = i.student_id
   where i.code_hash = private.hash_invite_code(p_code)
     and i.redeemed_at is null
     and i.revoked_at is null
     and i.expires_at > now()
     and (i.student_id is null or s.profile_id is null);
$$;

-- 2) nach Anlage des Auth-Users: Einladung atomar einlösen und Schüler verknüpfen.
--    Gibt false zurück, wenn die Einladung inzwischen eingelöst/ungültig wurde
--    (dann löscht die Edge Function den frisch angelegten User wieder).
create function public.complete_invitation(p_invitation_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid;
begin
  update public.invitations
     set redeemed_at = now(), redeemed_by = p_user_id
   where id = p_invitation_id
     and redeemed_at is null
     and revoked_at is null
     and expires_at > now()
  returning student_id into v_student_id;

  if not found then
    return false;
  end if;

  if v_student_id is not null then
    update public.students
       set profile_id = p_user_id
     where id = v_student_id and profile_id is null;
    if not found then
      raise exception 'student_already_linked';
    end if;
  end if;

  return true;
end;
$$;

-- Einwilligung in die Datenschutzerklärung (Zeitpunkt setzt der Server)
create function public.accept_privacy_policy(p_version text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
     set privacy_consent_version = left(p_version, 20), privacy_consent_at = now()
   where id = (select auth.uid());
$$;

revoke all on function
  public.create_student_invitation(uuid),
  public.create_teacher_invitation(),
  public.revoke_invitation(uuid),
  public.find_open_invitation(text),
  public.complete_invitation(uuid, uuid),
  public.accept_privacy_policy(text)
from public, anon, authenticated;

grant execute on function
  public.create_student_invitation(uuid),
  public.create_teacher_invitation(),
  public.revoke_invitation(uuid),
  public.accept_privacy_policy(text)
to authenticated;

grant execute on function
  public.find_open_invitation(text),
  public.complete_invitation(uuid, uuid)
to service_role;

revoke all on function private.generate_invite_code(), private.hash_invite_code(text)
  from public, anon, authenticated;
grant execute on function private.generate_invite_code(), private.hash_invite_code(text) to service_role;
