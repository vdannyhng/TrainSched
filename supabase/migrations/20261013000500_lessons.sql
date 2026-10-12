-- =============================================================================
-- M3 · Termine: Serien, Einzeltermine, Teilnehmer, Tags, Konflikte
-- =============================================================================
-- Zeitlogik:
--   * start_at/end_at sind timestamptz (UTC). Jeder Termin kennt zusätzlich seine
--     Wanduhr-Zeitzone (meist Europe/Zurich).
--   * Serien werden als (Startdatum, lokale Uhrzeit, Zeitzone) gespeichert und in
--     Postgres expandiert: (datum + uhrzeit) AT TIME ZONE tz ist DST-sicher.
--   * Vorkommen werden materialisiert (echte Zeilen), ca. 26 Wochen im Voraus;
--     pg_cron verlängert wöchentlich.
--   * Doppelbuchungen verhindert ein Exclusion-Constraint (hart); Pufferzeiten
--     prüft check_conflicts (weich, nur Warnung).

create extension if not exists btree_gist with schema extensions;
create extension if not exists pg_cron;

create type public.lesson_status as enum ('scheduled', 'held', 'cancelled');
create type public.lesson_format as enum ('online', 'in_person');
create type public.series_frequency as enum ('weekly', 'biweekly');
create type public.attendance_status as enum ('pending', 'present', 'excused', 'absent');

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------
create table public.lesson_series (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  title text check (char_length(title) <= 120),
  frequency public.series_frequency not null,
  start_date date not null,
  end_date date,
  local_start_time time not null,
  duration_min integer not null check (duration_min between 15 and 480),
  timezone text not null check (private.is_valid_timezone(timezone)),
  format public.lesson_format not null default 'in_person',
  location text check (char_length(location) <= 300),
  meeting_url text check (char_length(meeting_url) <= 1000),
  level public.cefr_level,
  materialized_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create table public.series_participants (
  series_id uuid not null references public.lesson_series (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  primary key (series_id, student_id)
);

create table public.series_tags (
  series_id uuid not null references public.lesson_series (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (series_id, tag_id)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  series_id uuid references public.lesson_series (id) on delete set null,
  original_start_at timestamptz,
  start_at timestamptz not null,
  end_at timestamptz not null,
  timezone text not null check (private.is_valid_timezone(timezone)),
  status public.lesson_status not null default 'scheduled',
  cancel_reason text check (char_length(cancel_reason) <= 500),
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles (id) on delete set null,
  is_exception boolean not null default false,
  title text check (char_length(title) <= 120),
  format public.lesson_format not null default 'in_person',
  location text check (char_length(location) <= 300),
  meeting_url text check (char_length(meeting_url) <= 1000),
  level public.cefr_level,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at),
  check (end_at - start_at <= interval '8 hours'),
  unique (series_id, original_start_at),
  constraint lessons_no_double_booking exclude using gist (
    teacher_id with =,
    tstzrange(start_at, end_at) with &&
  ) where (status <> 'cancelled')
);

create index lessons_teacher_start_idx on public.lessons (teacher_id, start_at);
create index lessons_series_idx on public.lessons (series_id, original_start_at);

create table public.lesson_participants (
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  attendance public.attendance_status not null default 'pending',
  primary key (lesson_id, student_id)
);

create index lesson_participants_student_idx on public.lesson_participants (student_id);

create table public.lesson_tags (
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (lesson_id, tag_id)
);

create trigger lesson_series_updated_at before update on public.lesson_series
for each row execute function private.set_updated_at();
create trigger lessons_updated_at before update on public.lessons
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helfer
-- ---------------------------------------------------------------------------
create function private.lesson_teacher_id(p_lesson_id uuid)
returns uuid language sql stable security definer set search_path = ''
as $$ select teacher_id from public.lessons where id = p_lesson_id; $$;

create function private.series_teacher_id(p_series_id uuid)
returns uuid language sql stable security definer set search_path = ''
as $$ select teacher_id from public.lesson_series where id = p_series_id; $$;

create function private.is_lesson_participant(p_lesson_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.lesson_participants lp
    join public.students s on s.id = lp.student_id
    where lp.lesson_id = p_lesson_id and s.profile_id = (select auth.uid())
  );
$$;

-- Vorkommen einer Serie im Datumsfenster [p_from, p_to] (lokale Daten der Serie)
create function private.series_occurrences(
  p_start_date date,
  p_end_date date,
  p_frequency public.series_frequency,
  p_local_time time,
  p_timezone text,
  p_from date,
  p_to date
)
returns table (occurrence_date date, start_at timestamptz)
language sql
immutable
set search_path = ''
as $$
  select d::date, (d::date + p_local_time) at time zone p_timezone
    from generate_series(
           p_start_date::timestamp,
           least(coalesce(p_end_date, p_to), p_to)::timestamp,
           case p_frequency when 'weekly' then interval '7 days' else interval '14 days' end
         ) as d
   where d::date >= p_from;
$$;

-- Fehlende Vorkommen einer Serie bis p_until anlegen (idempotent).
-- Überschneidungen mit bestehenden Terminen werden übersprungen (ON CONFLICT DO NOTHING
-- greift auch für das Exclusion-Constraint) und gezählt.
create function private.materialize_series(p_series_id uuid, p_until date)
returns table (created integer, skipped integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.lesson_series%rowtype;
  v_from date;
  v_to date;
  v_created integer := 0;
  v_total integer := 0;
  occ record;
  v_lesson_id uuid;
begin
  select * into s from public.lesson_series where id = p_series_id;
  if not found then
    raise exception 'series_not_found';
  end if;
  -- Aufruf aus der App: nur eigene Serien. pg_cron (kein auth.uid()) darf alles.
  if (select auth.uid()) is not null and not private.can_manage_teacher_data(s.teacher_id) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  v_from := greatest(s.start_date, coalesce(s.materialized_until + 1, s.start_date));
  v_to := least(coalesce(s.end_date, p_until), p_until);

  if v_to >= v_from then
    for occ in
      select * from private.series_occurrences(
        s.start_date, s.end_date, s.frequency, s.local_start_time, s.timezone, v_from, v_to)
    loop
      v_total := v_total + 1;
      v_lesson_id := null;
      insert into public.lessons (
        teacher_id, series_id, original_start_at, start_at, end_at, timezone,
        title, format, location, meeting_url, level
      ) values (
        s.teacher_id, s.id, occ.start_at, occ.start_at,
        occ.start_at + make_interval(mins => s.duration_min), s.timezone,
        s.title, s.format, s.location, s.meeting_url, s.level
      )
      on conflict do nothing
      returning id into v_lesson_id;

      if v_lesson_id is not null then
        v_created := v_created + 1;
        insert into public.lesson_participants (lesson_id, student_id)
          select v_lesson_id, sp.student_id from public.series_participants sp where sp.series_id = s.id;
        insert into public.lesson_tags (lesson_id, tag_id)
          select v_lesson_id, st.tag_id from public.series_tags st where st.series_id = s.id;
      end if;
    end loop;

    update public.lesson_series set materialized_until = v_to where id = s.id;
  end if;

  return query select v_created, v_total - v_created;
end;
$$;

-- Horizont aller offenen Serien verlängern (pg_cron, wöchentlich)
create function private.extend_all_series()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select id from public.lesson_series
     where end_date is null or end_date > coalesce(materialized_until, start_date - 1)
  loop
    perform private.materialize_series(r.id, (now() at time zone 'utc')::date + 182);
  end loop;
end;
$$;

select cron.schedule('trainsched-extend-series', '0 3 * * 1', $$select private.extend_all_series()$$);

-- ---------------------------------------------------------------------------
-- RLS + Grants
-- ---------------------------------------------------------------------------
revoke all on function
  private.lesson_teacher_id(uuid), private.series_teacher_id(uuid), private.is_lesson_participant(uuid),
  private.series_occurrences(date, date, public.series_frequency, time, text, date, date),
  private.materialize_series(uuid, date), private.extend_all_series()
from public, anon;
grant execute on function
  private.lesson_teacher_id(uuid), private.series_teacher_id(uuid), private.is_lesson_participant(uuid),
  private.series_occurrences(date, date, public.series_frequency, time, text, date, date),
  private.materialize_series(uuid, date)
to authenticated;
revoke all on function private.extend_all_series() from authenticated;

alter table public.lesson_series enable row level security;
alter table public.series_participants enable row level security;
alter table public.series_tags enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_participants enable row level security;
alter table public.lesson_tags enable row level security;

revoke all on public.lesson_series, public.series_participants, public.series_tags,
  public.lessons, public.lesson_participants, public.lesson_tags
from anon, authenticated;

-- Serien: nur Lehrer
grant select, delete on public.lesson_series to authenticated;
grant insert (teacher_id, title, frequency, start_date, end_date, local_start_time, duration_min, timezone,
              format, location, meeting_url, level)
  on public.lesson_series to authenticated;
grant update (title, end_date, format, location, meeting_url, level) on public.lesson_series to authenticated;

create policy lesson_series_all on public.lesson_series
for all to authenticated
using (private.can_manage_teacher_data(teacher_id))
with check (private.can_manage_teacher_data(teacher_id));

grant select, insert, delete on public.series_participants, public.series_tags to authenticated;

create policy series_participants_all on public.series_participants
for all to authenticated
using (private.can_manage_teacher_data(private.series_teacher_id(series_id)))
with check (
  private.can_manage_teacher_data(private.series_teacher_id(series_id))
  and private.student_teacher_id(student_id) = private.series_teacher_id(series_id)
);

create policy series_tags_all on public.series_tags
for all to authenticated
using (private.can_manage_teacher_data(private.series_teacher_id(series_id)))
with check (
  private.can_manage_teacher_data(private.series_teacher_id(series_id))
  and private.tag_teacher_id(tag_id) = private.series_teacher_id(series_id)
);

-- Termine: Lehrer verwaltet; Teilnehmende lesen
grant select, delete on public.lessons to authenticated;
grant insert (teacher_id, start_at, end_at, timezone, title, format, location, meeting_url, level)
  on public.lessons to authenticated;
grant update (start_at, end_at, timezone, status, cancel_reason, cancelled_at, cancelled_by, is_exception,
              title, format, location, meeting_url, level)
  on public.lessons to authenticated;

create policy lessons_select on public.lessons
for select to authenticated
using (private.can_manage_teacher_data(teacher_id) or private.is_lesson_participant(id));

create policy lessons_insert on public.lessons
for insert to authenticated
with check (private.can_manage_teacher_data(teacher_id));

create policy lessons_update on public.lessons
for update to authenticated
using (private.can_manage_teacher_data(teacher_id))
with check (private.can_manage_teacher_data(teacher_id));

create policy lessons_delete on public.lessons
for delete to authenticated
using (private.can_manage_teacher_data(teacher_id));

-- Teilnehmer: Lehrer verwaltet; Schüler sieht nur die eigene Zeile (Datensparsamkeit bei Gruppen)
grant select, insert, delete on public.lesson_participants to authenticated;
grant update (attendance) on public.lesson_participants to authenticated;

create policy lesson_participants_select on public.lesson_participants
for select to authenticated
using (
  private.can_manage_teacher_data(private.lesson_teacher_id(lesson_id))
  or student_id in (select private.my_student_ids())
);

create policy lesson_participants_insert on public.lesson_participants
for insert to authenticated
with check (
  private.can_manage_teacher_data(private.lesson_teacher_id(lesson_id))
  and private.student_teacher_id(student_id) = private.lesson_teacher_id(lesson_id)
);

create policy lesson_participants_update on public.lesson_participants
for update to authenticated
using (private.can_manage_teacher_data(private.lesson_teacher_id(lesson_id)))
with check (private.can_manage_teacher_data(private.lesson_teacher_id(lesson_id)));

create policy lesson_participants_delete on public.lesson_participants
for delete to authenticated
using (private.can_manage_teacher_data(private.lesson_teacher_id(lesson_id)));

grant select, insert, delete on public.lesson_tags to authenticated;

create policy lesson_tags_select on public.lesson_tags
for select to authenticated
using (
  private.can_manage_teacher_data(private.lesson_teacher_id(lesson_id))
  or private.is_lesson_participant(lesson_id)
);

create policy lesson_tags_insert on public.lesson_tags
for insert to authenticated
with check (
  private.can_manage_teacher_data(private.lesson_teacher_id(lesson_id))
  and private.tag_teacher_id(tag_id) = private.lesson_teacher_id(lesson_id)
);

create policy lesson_tags_delete on public.lesson_tags
for delete to authenticated
using (private.can_manage_teacher_data(private.lesson_teacher_id(lesson_id)));

-- Schüler dürfen Themen ihrer Termine lesen
drop policy tags_select on public.tags;
create policy tags_select on public.tags
for select to authenticated
using (
  private.can_manage_teacher_data(teacher_id)
  or exists (
    select 1 from public.student_tags st
    where st.tag_id = tags.id and st.student_id in (select private.my_student_ids())
  )
  or exists (
    select 1 from public.lesson_tags lt
    where lt.tag_id = tags.id and private.is_lesson_participant(lt.lesson_id)
  )
);

-- ---------------------------------------------------------------------------
-- RPCs (security invoker → RLS gilt; atomar in einer Transaktion)
-- ---------------------------------------------------------------------------
create function private.set_lesson_links(p_lesson_id uuid, p_student_ids uuid[], p_tag_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from public.lesson_participants
   where lesson_id = p_lesson_id and not (student_id = any (p_student_ids));
  insert into public.lesson_participants (lesson_id, student_id)
    select p_lesson_id, unnest(p_student_ids) on conflict do nothing;
  delete from public.lesson_tags
   where lesson_id = p_lesson_id and not (tag_id = any (p_tag_ids));
  insert into public.lesson_tags (lesson_id, tag_id)
    select p_lesson_id, unnest(p_tag_ids) on conflict do nothing;
$$;

grant execute on function private.set_lesson_links(uuid, uuid[], uuid[]) to authenticated;

create function public.create_lesson(
  p_teacher_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_timezone text,
  p_title text,
  p_format public.lesson_format,
  p_location text,
  p_meeting_url text,
  p_level public.cefr_level,
  p_student_ids uuid[],
  p_tag_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if coalesce(cardinality(p_student_ids), 0) = 0 then
    raise exception 'participants_required' using errcode = 'P0001';
  end if;
  insert into public.lessons (teacher_id, start_at, end_at, timezone, title, format, location, meeting_url, level)
  values (p_teacher_id, p_start_at, p_end_at, p_timezone, nullif(btrim(p_title), ''), p_format,
          nullif(btrim(p_location), ''), nullif(btrim(p_meeting_url), ''), p_level)
  returning id into v_id;
  perform private.set_lesson_links(v_id, p_student_ids, coalesce(p_tag_ids, '{}'));
  return v_id;
end;
$$;

create function public.create_lesson_series(
  p_teacher_id uuid,
  p_frequency public.series_frequency,
  p_start_date date,
  p_end_date date,
  p_local_start_time time,
  p_duration_min integer,
  p_timezone text,
  p_title text,
  p_format public.lesson_format,
  p_location text,
  p_meeting_url text,
  p_level public.cefr_level,
  p_student_ids uuid[],
  p_tag_ids uuid[]
)
returns table (series_id uuid, created integer, skipped integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  r record;
begin
  if coalesce(cardinality(p_student_ids), 0) = 0 then
    raise exception 'participants_required' using errcode = 'P0001';
  end if;
  insert into public.lesson_series (
    teacher_id, title, frequency, start_date, end_date, local_start_time, duration_min, timezone,
    format, location, meeting_url, level
  ) values (
    p_teacher_id, nullif(btrim(p_title), ''), p_frequency, p_start_date, p_end_date, p_local_start_time,
    p_duration_min, p_timezone, p_format, nullif(btrim(p_location), ''), nullif(btrim(p_meeting_url), ''), p_level
  ) returning id into v_id;

  insert into public.series_participants (series_id, student_id) select v_id, unnest(p_student_ids);
  insert into public.series_tags (series_id, tag_id) select v_id, unnest(coalesce(p_tag_ids, '{}'));

  select * into r from private.materialize_series(v_id, (now() at time zone 'utc')::date + 182);
  return query select v_id, r.created, r.skipped;
end;
$$;

-- „Nur diesen Termin ändern“ (wird in einer Serie zur Ausnahme)
create function public.update_lesson(
  p_lesson_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_title text,
  p_format public.lesson_format,
  p_location text,
  p_meeting_url text,
  p_level public.cefr_level,
  p_student_ids uuid[],
  p_tag_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if coalesce(cardinality(p_student_ids), 0) = 0 then
    raise exception 'participants_required' using errcode = 'P0001';
  end if;
  update public.lessons
     set start_at = p_start_at,
         end_at = p_end_at,
         title = nullif(btrim(p_title), ''),
         format = p_format,
         location = nullif(btrim(p_location), ''),
         meeting_url = nullif(btrim(p_meeting_url), ''),
         level = p_level,
         is_exception = series_id is not null
   where id = p_lesson_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  perform private.set_lesson_links(p_lesson_id, p_student_ids, coalesce(p_tag_ids, '{}'));
end;
$$;

create function public.reschedule_lesson(p_lesson_id uuid, p_start_at timestamptz, p_end_at timestamptz)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.lessons
     set start_at = p_start_at, end_at = p_end_at, is_exception = series_id is not null
   where id = p_lesson_id and status <> 'held';
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
end;
$$;

create function public.cancel_lesson(p_lesson_id uuid, p_reason text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.lessons
     set status = 'cancelled',
         cancel_reason = nullif(btrim(p_reason), ''),
         cancelled_at = now(),
         cancelled_by = (select auth.uid()),
         is_exception = series_id is not null
   where id = p_lesson_id and status = 'scheduled';
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
end;
$$;

-- Absage zurücknehmen (scheitert am Constraint, falls der Slot inzwischen belegt ist)
create function public.restore_lesson(p_lesson_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.lessons
     set status = 'scheduled', cancel_reason = null, cancelled_at = null, cancelled_by = null
   where id = p_lesson_id and status = 'cancelled';
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
end;
$$;

-- Als gehalten markieren inkl. Anwesenheit ({student_id: status})
create function public.mark_lesson_held(p_lesson_id uuid, p_attendance jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.lessons set status = 'held' where id = p_lesson_id and status <> 'cancelled';
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  update public.lesson_participants lp
     set attendance = coalesce((p_attendance ->> lp.student_id::text)::public.attendance_status, 'present')
   where lp.lesson_id = p_lesson_id;
end;
$$;

-- Serie ab einem Termin beenden: alle künftigen, noch geplanten Vorkommen werden gelöscht
-- (gehaltene/abgesagte bleiben für die Historie). Liegt der Termin am Serienanfang,
-- wird die Serie ganz entfernt.
create function public.end_series(p_lesson_id uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  l public.lessons%rowtype;
  s public.lesson_series%rowtype;
  v_last date;
  v_deleted integer;
begin
  select * into l from public.lessons where id = p_lesson_id;
  if not found or l.series_id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  select * into s from public.lesson_series where id = l.series_id;

  delete from public.lessons
   where series_id = s.id
     and original_start_at >= l.original_start_at
     and status = 'scheduled';
  get diagnostics v_deleted = row_count;

  v_last := (l.original_start_at at time zone s.timezone)::date - 1;
  if v_last < s.start_date then
    delete from public.lesson_series where id = s.id;
  else
    update public.lesson_series set end_date = v_last where id = s.id;
  end if;
  return v_deleted;
end;
$$;

-- „Diesen und alle folgenden ändern“: alte Serie endet, neue Serie ab diesem Termin.
create function public.update_series_from(
  p_lesson_id uuid,
  p_start_date date,
  p_local_start_time time,
  p_duration_min integer,
  p_frequency public.series_frequency,
  p_title text,
  p_format public.lesson_format,
  p_location text,
  p_meeting_url text,
  p_level public.cefr_level,
  p_student_ids uuid[],
  p_tag_ids uuid[]
)
returns table (series_id uuid, created integer, skipped integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  l public.lessons%rowtype;
  s public.lesson_series%rowtype;
begin
  select * into l from public.lessons where id = p_lesson_id;
  if not found or l.series_id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  select * into s from public.lesson_series where id = l.series_id;

  perform public.end_series(p_lesson_id);

  return query select * from public.create_lesson_series(
    s.teacher_id, p_frequency, p_start_date, s.end_date, p_local_start_time, p_duration_min, s.timezone,
    p_title, p_format, p_location, p_meeting_url, p_level, p_student_ids, p_tag_ids);
end;
$$;

-- Vorschau der Vorkommen (für die Konfliktprüfung vor dem Speichern)
create function public.preview_series(
  p_start_date date,
  p_end_date date,
  p_frequency public.series_frequency,
  p_local_start_time time,
  p_duration_min integer,
  p_timezone text
)
returns table (start_at timestamptz, end_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select o.start_at, o.start_at + make_interval(mins => p_duration_min)
    from private.series_occurrences(
      p_start_date, p_end_date, p_frequency, p_local_start_time, p_timezone,
      p_start_date, (now() at time zone 'utc')::date + 182) o
   order by o.start_at;
$$;

-- Konflikte: Überschneidung (hart) oder Puffer unterschritten (Warnung)
create function public.check_conflicts(
  p_teacher_id uuid,
  p_starts timestamptz[],
  p_ends timestamptz[],
  p_ignore_lesson_ids uuid[] default '{}'
)
returns table (
  range_index integer,
  kind text,
  lesson_id uuid,
  start_at timestamptz,
  end_at timestamptz,
  label text
)
language sql
stable
security invoker
set search_path = ''
as $$
  with settings as (
    select coalesce((select buffer_minutes from public.teacher_settings where teacher_id = p_teacher_id), 0) as buffer
  ),
  ranges as (
    select u.idx::integer as idx, tstzrange(u.s, u.e) as rng
      from unnest(p_starts, p_ends) with ordinality as u(s, e, idx)
  )
  select r.idx,
         case when tstzrange(l.start_at, l.end_at) && r.rng then 'overlap' else 'buffer' end,
         l.id, l.start_at, l.end_at,
         coalesce(l.title, (
           select string_agg(st.first_name, ', ' order by st.first_name)
             from public.lesson_participants lp join public.students st on st.id = lp.student_id
            where lp.lesson_id = l.id
         ))
    from ranges r
    cross join settings
    join public.lessons l
      on l.teacher_id = p_teacher_id
     and l.status <> 'cancelled'
     and not (l.id = any (coalesce(p_ignore_lesson_ids, '{}')))
     and tstzrange(l.start_at - make_interval(mins => settings.buffer),
                   l.end_at + make_interval(mins => settings.buffer)) && r.rng
   order by r.idx, l.start_at;
$$;

revoke all on function
  public.create_lesson(uuid, timestamptz, timestamptz, text, text, public.lesson_format, text, text, public.cefr_level, uuid[], uuid[]),
  public.create_lesson_series(uuid, public.series_frequency, date, date, time, integer, text, text, public.lesson_format, text, text, public.cefr_level, uuid[], uuid[]),
  public.update_lesson(uuid, timestamptz, timestamptz, text, public.lesson_format, text, text, public.cefr_level, uuid[], uuid[]),
  public.reschedule_lesson(uuid, timestamptz, timestamptz),
  public.cancel_lesson(uuid, text),
  public.restore_lesson(uuid),
  public.mark_lesson_held(uuid, jsonb),
  public.end_series(uuid),
  public.update_series_from(uuid, date, time, integer, public.series_frequency, text, public.lesson_format, text, text, public.cefr_level, uuid[], uuid[]),
  public.preview_series(date, date, public.series_frequency, time, integer, text),
  public.check_conflicts(uuid, timestamptz[], timestamptz[], uuid[])
from public, anon;

grant execute on function
  public.create_lesson(uuid, timestamptz, timestamptz, text, text, public.lesson_format, text, text, public.cefr_level, uuid[], uuid[]),
  public.create_lesson_series(uuid, public.series_frequency, date, date, time, integer, text, text, public.lesson_format, text, text, public.cefr_level, uuid[], uuid[]),
  public.update_lesson(uuid, timestamptz, timestamptz, text, public.lesson_format, text, text, public.cefr_level, uuid[], uuid[]),
  public.reschedule_lesson(uuid, timestamptz, timestamptz),
  public.cancel_lesson(uuid, text),
  public.restore_lesson(uuid),
  public.mark_lesson_held(uuid, jsonb),
  public.end_series(uuid),
  public.update_series_from(uuid, date, time, integer, public.series_frequency, text, public.lesson_format, text, text, public.cefr_level, uuid[], uuid[]),
  public.preview_series(date, date, public.series_frequency, time, integer, text),
  public.check_conflicts(uuid, timestamptz[], timestamptz[], uuid[])
to authenticated;
