-- Level-Verlauf: jede Änderung von students.current_level wird mit Zeitpunkt festgehalten.
-- Grundlage für den Lernfortschritt (M6). Geschrieben wird nur per Trigger, nie direkt.

create table public.student_level_changes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  level public.cefr_level,
  changed_at timestamptz not null default now(),
  changed_by uuid references public.profiles (id) on delete set null
);

create index student_level_changes_student_idx on public.student_level_changes (student_id, changed_at);

alter table public.student_level_changes enable row level security;

revoke all on public.student_level_changes from anon, authenticated;
grant select on public.student_level_changes to authenticated;

create policy student_level_changes_select on public.student_level_changes
for select to authenticated
using (
  exists (
    select 1 from public.students s
    where s.id = student_id
      and (
        private.can_manage_teacher_data(s.teacher_id)
        or (s.profile_id = (select auth.uid()) and private.is_active_user())
      )
  )
);

create function private.log_level_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.current_level is null then
      return new;
    end if;
  elsif new.current_level is not distinct from old.current_level then
    return new;
  end if;

  insert into public.student_level_changes (student_id, level, changed_by)
  values (new.id, new.current_level, auth.uid());
  return new;
end;
$$;

revoke all on function private.log_level_change() from public, anon, authenticated;

create trigger students_level_history
after insert or update of current_level on public.students
for each row execute function private.log_level_change();

-- Bestand: Startlevel zum Anlagedatum, aktuelles Level (falls abweichend) zum letzten Update.
insert into public.student_level_changes (student_id, level, changed_at)
select id, coalesce(start_level, current_level), created_at
from public.students
where coalesce(start_level, current_level) is not null;

insert into public.student_level_changes (student_id, level, changed_at)
select id, current_level, updated_at
from public.students
where start_level is not null and current_level is not null and current_level <> start_level;
