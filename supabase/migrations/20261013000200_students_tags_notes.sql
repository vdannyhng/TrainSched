-- =============================================================================
-- M2 · Themen-Tags, Schüler↔Tags, Notizen (vorerst nur pro Schüler)
-- =============================================================================
-- Level (A1–B2) bleibt ein Enum auf students (feste Farben in der App).
-- Tags sind frei erweiterbare Themen pro Lehrer.

-- ---------------------------------------------------------------------------
-- Helfer: Besitzer einer Zeile ermitteln (security definer → kein RLS-Zirkel)
-- ---------------------------------------------------------------------------
create function private.student_teacher_id(p_student_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select teacher_id from public.students where id = p_student_id;
$$;

-- ---------------------------------------------------------------------------
-- tags
-- ---------------------------------------------------------------------------
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 40),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now()
);

create unique index tags_teacher_label_key on public.tags (teacher_id, lower(btrim(label)));

create table public.student_tags (
  student_id uuid not null references public.students (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (student_id, tag_id)
);

create index student_tags_tag_id_idx on public.student_tags (tag_id);

create function private.tag_teacher_id(p_tag_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select teacher_id from public.tags where id = p_tag_id;
$$;

-- Standard-Themen für jeden (neuen) Lehrer
create function private.seed_default_tags(p_teacher_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.tags (teacher_id, label, color)
  values
    (p_teacher_id, 'Aussprache', '#0E7490'),
    (p_teacher_id, 'Grammatik', '#7C3AED'),
    (p_teacher_id, 'Alltag', '#15803D'),
    (p_teacher_id, 'Prüfungsvorbereitung', '#B91C1C'),
    (p_teacher_id, 'Business', '#A16207')
  on conflict do nothing;
$$;

create function private.on_teacher_settings_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.seed_default_tags(new.teacher_id);
  return new;
end;
$$;

create trigger teacher_settings_seed_tags
after insert on public.teacher_settings
for each row execute function private.on_teacher_settings_created();

-- bestehende Lehrer nachziehen
select private.seed_default_tags(teacher_id) from public.teacher_settings;

-- ---------------------------------------------------------------------------
-- notes (M2: pro Schüler; lesson_id folgt mit den Terminen)
-- ---------------------------------------------------------------------------
create type public.note_visibility as enum ('student', 'teacher');

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null default auth.uid(),
  student_id uuid not null references public.students (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 20000),
  visibility public.note_visibility not null default 'teacher',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_student_id_idx on public.notes (student_id, created_at desc);

create trigger notes_updated_at
before update on public.notes
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS + Grants
-- ---------------------------------------------------------------------------
revoke all on function
  private.student_teacher_id(uuid),
  private.tag_teacher_id(uuid),
  private.seed_default_tags(uuid),
  private.on_teacher_settings_created()
from public, anon;
grant execute on function private.student_teacher_id(uuid), private.tag_teacher_id(uuid) to authenticated;
revoke all on function private.seed_default_tags(uuid), private.on_teacher_settings_created() from authenticated;

alter table public.tags enable row level security;
alter table public.student_tags enable row level security;
alter table public.notes enable row level security;

revoke all on public.tags, public.student_tags, public.notes from anon, authenticated;

-- tags: Lehrer verwaltet eigene; Schüler sieht nur Themen, die ihm zugeordnet sind.
grant select, delete on public.tags to authenticated;
grant insert (teacher_id, label, color), update (label, color) on public.tags to authenticated;

create policy tags_select on public.tags
for select to authenticated
using (
  private.can_manage_teacher_data(teacher_id)
  or exists (
    select 1 from public.student_tags st
    where st.tag_id = tags.id and st.student_id in (select private.my_student_ids())
  )
);

create policy tags_insert on public.tags
for insert to authenticated
with check (private.can_manage_teacher_data(teacher_id));

create policy tags_update on public.tags
for update to authenticated
using (private.can_manage_teacher_data(teacher_id))
with check (private.can_manage_teacher_data(teacher_id));

create policy tags_delete on public.tags
for delete to authenticated
using (private.can_manage_teacher_data(teacher_id));

-- student_tags: Schüler und Tag müssen demselben (verwaltbaren) Lehrer gehören.
grant select, insert, delete on public.student_tags to authenticated;

create policy student_tags_select on public.student_tags
for select to authenticated
using (
  private.can_manage_teacher_data(private.student_teacher_id(student_id))
  or student_id in (select private.my_student_ids())
);

create policy student_tags_insert on public.student_tags
for insert to authenticated
with check (
  private.can_manage_teacher_data(private.student_teacher_id(student_id))
  and private.tag_teacher_id(tag_id) = private.student_teacher_id(student_id)
);

create policy student_tags_delete on public.student_tags
for delete to authenticated
using (private.can_manage_teacher_data(private.student_teacher_id(student_id)));

-- notes: Lehrer verwaltet Notizen eigener Schüler; Schüler liest nur freigegebene eigene.
grant select, delete on public.notes to authenticated;
grant insert (teacher_id, student_id, body, visibility), update (body, visibility) on public.notes to authenticated;

create policy notes_select on public.notes
for select to authenticated
using (
  private.can_manage_teacher_data(teacher_id)
  or (visibility = 'student' and student_id in (select private.my_student_ids()))
);

create policy notes_insert on public.notes
for insert to authenticated
with check (
  private.can_manage_teacher_data(teacher_id)
  and private.student_teacher_id(student_id) = teacher_id
);

create policy notes_update on public.notes
for update to authenticated
using (private.can_manage_teacher_data(teacher_id))
with check (private.can_manage_teacher_data(teacher_id));

create policy notes_delete on public.notes
for delete to authenticated
using (private.can_manage_teacher_data(teacher_id));

-- ---------------------------------------------------------------------------
-- Einladungsstatus pro Schüler (für die Lehreransicht, ohne Hash)
-- ---------------------------------------------------------------------------
create function public.student_invitation_status(p_student_id uuid)
returns table (expires_at timestamptz, created_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select i.expires_at, i.created_at
    from public.invitations i
   where i.student_id = p_student_id
     and i.redeemed_at is null
     and i.revoked_at is null
     and i.expires_at > now()
   order by i.created_at desc
   limit 1;
$$;

revoke all on function public.student_invitation_status(uuid) from public, anon;
grant execute on function public.student_invitation_status(uuid) to authenticated;
