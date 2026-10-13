-- =============================================================================
-- M4 · Notizen pro Termin, Anhänge (Storage), Hausaufgaben, Suche
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Notizen: zusätzlich pro Termin; diakritik-tolerante Suche
-- ---------------------------------------------------------------------------
alter table public.notes add column lesson_id uuid references public.lessons (id) on delete cascade;
alter table public.notes alter column student_id drop not null;
alter table public.notes add constraint notes_target check (lesson_id is not null or student_id is not null);
alter table public.notes add column search_text text generated always as (lower(private.immutable_unaccent(body))) stored;

create index notes_lesson_idx on public.notes (lesson_id, created_at);
create index notes_search_idx on public.notes using gin (search_text extensions.gin_trgm_ops);

grant insert (lesson_id) on public.notes to authenticated;

drop policy notes_select on public.notes;
create policy notes_select on public.notes
for select to authenticated
using (
  private.can_manage_teacher_data(teacher_id)
  or (
    visibility = 'student'
    and (
      student_id in (select private.my_student_ids())
      or (lesson_id is not null and private.is_lesson_participant(lesson_id))
    )
  )
);

drop policy notes_insert on public.notes;
create policy notes_insert on public.notes
for insert to authenticated
with check (
  private.can_manage_teacher_data(teacher_id)
  and (lesson_id is null or private.lesson_teacher_id(lesson_id) = teacher_id)
  and (student_id is null or private.student_teacher_id(student_id) = teacher_id)
);

-- ---------------------------------------------------------------------------
-- Anhänge (Metadaten; Dateien im privaten Bucket „attachments“ unter {teacher_id}/…)
-- ---------------------------------------------------------------------------
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete cascade,
  student_id uuid references public.students (id) on delete cascade,
  visibility public.note_visibility not null default 'student',
  storage_path text not null unique,
  original_name text not null check (char_length(original_name) between 1 and 200),
  mime_type text not null check (char_length(mime_type) <= 100),
  size_bytes integer not null check (size_bytes between 1 and 20971520),
  uploaded_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (lesson_id is not null or student_id is not null),
  check (storage_path like teacher_id::text || '/%')
);

create index attachments_lesson_idx on public.attachments (lesson_id, created_at);
create index attachments_student_idx on public.attachments (student_id, created_at);

alter table public.attachments enable row level security;
revoke all on public.attachments from anon, authenticated;
grant select, delete on public.attachments to authenticated;
grant insert (teacher_id, lesson_id, student_id, visibility, storage_path, original_name, mime_type, size_bytes),
      update (visibility)
  on public.attachments to authenticated;

create policy attachments_select on public.attachments
for select to authenticated
using (
  private.can_manage_teacher_data(teacher_id)
  or (
    visibility = 'student'
    and (
      student_id in (select private.my_student_ids())
      or (lesson_id is not null and private.is_lesson_participant(lesson_id))
    )
  )
);

create policy attachments_insert on public.attachments
for insert to authenticated
with check (
  private.can_manage_teacher_data(teacher_id)
  and (lesson_id is null or private.lesson_teacher_id(lesson_id) = teacher_id)
  and (student_id is null or private.student_teacher_id(student_id) = teacher_id)
);

create policy attachments_update on public.attachments
for update to authenticated
using (private.can_manage_teacher_data(teacher_id))
with check (private.can_manage_teacher_data(teacher_id));

create policy attachments_delete on public.attachments
for delete to authenticated
using (private.can_manage_teacher_data(teacher_id));

-- Storage-Bucket (privat, max. 20 MB, nur Bilder/PDF/Audio)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments', 'attachments', false, 20971520,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'application/pdf',
    'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg'
  ]
)
on conflict (id) do nothing;

-- Erster Ordner im Pfad = Lehrer-ID (nur gültige UUIDs werden ausgewertet)
create function private.storage_teacher_id(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when (storage.foldername(p_name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then ((storage.foldername(p_name))[1])::uuid
  end;
$$;

revoke all on function private.storage_teacher_id(text) from public, anon;
grant execute on function private.storage_teacher_id(text) to authenticated;

create policy attachments_objects_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'attachments'
  and private.can_manage_teacher_data(private.storage_teacher_id(name))
);

-- Lesen nur, wenn der Anhang (per RLS) sichtbar ist → Signed URLs für Berechtigte
create policy attachments_objects_select on storage.objects
for select to authenticated
using (
  bucket_id = 'attachments'
  and exists (select 1 from public.attachments a where a.storage_path = name)
);

create policy attachments_objects_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'attachments'
  and private.can_manage_teacher_data(private.storage_teacher_id(name))
);

-- ---------------------------------------------------------------------------
-- Hausaufgaben
-- ---------------------------------------------------------------------------
create type public.homework_status as enum ('open', 'done');

create table public.homework (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  student_id uuid not null references public.students (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text check (char_length(description) <= 4000),
  due_date date,
  status public.homework_status not null default 'open',
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index homework_student_idx on public.homework (student_id, status, due_date);
create index homework_lesson_idx on public.homework (lesson_id);

create trigger homework_updated_at before update on public.homework
for each row execute function private.set_updated_at();

alter table public.homework enable row level security;
revoke all on public.homework from anon, authenticated;
grant select, delete on public.homework to authenticated;
grant insert (teacher_id, lesson_id, student_id, title, description, due_date),
      update (title, description, due_date)
  on public.homework to authenticated;

create policy homework_select on public.homework
for select to authenticated
using (private.can_manage_teacher_data(teacher_id) or student_id in (select private.my_student_ids()));

create policy homework_insert on public.homework
for insert to authenticated
with check (
  private.can_manage_teacher_data(teacher_id)
  and private.student_teacher_id(student_id) = teacher_id
  and (lesson_id is null or private.lesson_teacher_id(lesson_id) = teacher_id)
);

create policy homework_update on public.homework
for update to authenticated
using (private.can_manage_teacher_data(teacher_id))
with check (private.can_manage_teacher_data(teacher_id));

create policy homework_delete on public.homework
for delete to authenticated
using (private.can_manage_teacher_data(teacher_id));

-- Abhaken: Schüler (eigene Aufgaben) und Lehrer. Nur der Status ändert sich.
create function public.set_homework_status(p_homework_id uuid, p_done boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.homework h
     set status = case when p_done then 'done' else 'open' end::public.homework_status,
         done_at = case when p_done then coalesce(h.done_at, now()) end
   where h.id = p_homework_id
     and (
       h.student_id in (select private.my_student_ids())
       or private.can_manage_teacher_data(h.teacher_id)
     );
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_homework_status(uuid, boolean) from public, anon;
grant execute on function public.set_homework_status(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- „Letzte Stunde in 1 Minute“: vorheriger Termin mit mind. einem gemeinsamen Teilnehmer
-- ---------------------------------------------------------------------------
create function public.previous_lesson_id(p_lesson_id uuid)
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select prev.id
    from public.lessons cur
    join public.lessons prev
      on prev.teacher_id = cur.teacher_id
     and prev.start_at < cur.start_at
     and prev.status <> 'cancelled'
   where cur.id = p_lesson_id
     and exists (
       select 1
         from public.lesson_participants a
         join public.lesson_participants b on b.student_id = a.student_id
        where a.lesson_id = cur.id and b.lesson_id = prev.id
     )
   order by prev.start_at desc
   limit 1;
$$;

revoke all on function public.previous_lesson_id(uuid) from public, anon;
grant execute on function public.previous_lesson_id(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Volltextsuche über Notizen (diakritik-tolerant, Teilwörter) mit Filtern
-- ---------------------------------------------------------------------------
create function public.search_notes(
  p_query text,
  p_student_id uuid default null,
  p_level public.cefr_level default null,
  p_tag_id uuid default null,
  p_from date default null,
  p_to date default null,
  p_limit integer default 30,
  p_offset integer default 0
)
returns table (
  id uuid,
  body text,
  visibility public.note_visibility,
  created_at timestamptz,
  lesson_id uuid,
  lesson_start_at timestamptz,
  student_id uuid,
  student_names text
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select '%' || replace(replace(replace(lower(private.immutable_unaccent(btrim(coalesce(p_query, '')))),
             '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
  )
  select n.id, n.body, n.visibility, n.created_at, n.lesson_id, l.start_at,
         n.student_id,
         coalesce(
           (select s.first_name || coalesce(' ' || s.last_name, '') from public.students s where s.id = n.student_id),
           (select string_agg(s.first_name, ', ' order by s.first_name)
              from public.lesson_participants lp join public.students s on s.id = lp.student_id
             where lp.lesson_id = n.lesson_id)
         )
    from public.notes n
    cross join q
    left join public.lessons l on l.id = n.lesson_id
   where n.search_text like q.pattern
     and (p_student_id is null
          or n.student_id = p_student_id
          or exists (select 1 from public.lesson_participants lp where lp.lesson_id = n.lesson_id and lp.student_id = p_student_id))
     and (p_level is null
          or l.level = p_level
          or exists (select 1 from public.students s where s.id = n.student_id and s.current_level = p_level))
     and (p_tag_id is null
          or exists (select 1 from public.lesson_tags lt where lt.lesson_id = n.lesson_id and lt.tag_id = p_tag_id)
          or exists (select 1 from public.student_tags st where st.student_id = n.student_id and st.tag_id = p_tag_id))
     and (p_from is null or coalesce(l.start_at, n.created_at) >= p_from::timestamptz)
     and (p_to is null or coalesce(l.start_at, n.created_at) < (p_to + 1)::timestamptz)
   order by coalesce(l.start_at, n.created_at) desc, n.id
   limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$$;

revoke all on function public.search_notes(text, uuid, public.cefr_level, uuid, date, date, integer, integer) from public, anon;
grant execute on function public.search_notes(text, uuid, public.cefr_level, uuid, date, date, integer, integer) to authenticated;
