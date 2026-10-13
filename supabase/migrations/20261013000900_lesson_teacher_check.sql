-- =============================================================================
-- Termine: Teilnehmende müssen zum Lehrer des Termins gehören – mit klarer Meldung
-- =============================================================================
-- Vorher scheiterte z. B. ein Admin, der für Schüler eines anderen Lehrers plante,
-- mit einer generischen RLS-Meldung. Jetzt: eindeutiger Fehler 'participants_other_teacher'.
-- (Die App ordnet Termine der Admin-Person automatisch dem Lehrer der Teilnehmenden zu.)

create function private.assert_participants_of(p_teacher_id uuid, p_student_ids uuid[])
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if coalesce(cardinality(p_student_ids), 0) = 0 then
    raise exception 'participants_required' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from unnest(p_student_ids) as sid
     where not exists (select 1 from public.students s where s.id = sid and s.teacher_id = p_teacher_id)
  ) then
    raise exception 'participants_other_teacher' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function private.assert_participants_of(uuid, uuid[]) from public, anon;
grant execute on function private.assert_participants_of(uuid, uuid[]) to authenticated;

create or replace function public.create_lesson(
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
  perform private.assert_participants_of(p_teacher_id, p_student_ids);
  insert into public.lessons (teacher_id, start_at, end_at, timezone, title, format, location, meeting_url, level)
  values (p_teacher_id, p_start_at, p_end_at, p_timezone, nullif(btrim(p_title), ''), p_format,
          nullif(btrim(p_location), ''), nullif(btrim(p_meeting_url), ''), p_level)
  returning id into v_id;
  perform private.set_lesson_links(v_id, p_student_ids, coalesce(p_tag_ids, '{}'));
  return v_id;
end;
$$;

create or replace function public.create_lesson_series(
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
  perform private.assert_participants_of(p_teacher_id, p_student_ids);
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

create or replace function public.update_lesson(
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
declare
  v_teacher uuid;
begin
  select teacher_id into v_teacher from public.lessons where id = p_lesson_id;
  if v_teacher is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  perform private.assert_participants_of(v_teacher, p_student_ids);
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
