-- =============================================================================
-- Review-Fixes
-- =============================================================================

-- 1) Schüler löschen: eigene Termine und Serien mit entfernen
-- Vorher blieben Termine/Serien ohne Teilnehmende zurück (und pg_cron hätte die
-- Serie mit leeren Terminen weiter verlängert). Gruppentermine mit weiteren
-- Teilnehmenden bleiben bestehen – nur dieser Schüler fällt per FK-Cascade heraus.
create function private.delete_solo_lessons_of_student()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.lessons l
   where exists (select 1 from public.lesson_participants lp where lp.lesson_id = l.id and lp.student_id = old.id)
     and not exists (select 1 from public.lesson_participants lp where lp.lesson_id = l.id and lp.student_id <> old.id);

  delete from public.lesson_series s
   where exists (select 1 from public.series_participants sp where sp.series_id = s.id and sp.student_id = old.id)
     and not exists (select 1 from public.series_participants sp where sp.series_id = s.id and sp.student_id <> old.id);

  return old;
end;
$$;

revoke all on function private.delete_solo_lessons_of_student() from public, anon, authenticated;

create trigger students_delete_solo_lessons
before delete on public.students
for each row execute function private.delete_solo_lessons_of_student();

-- 2) Interne Helfer nicht für PUBLIC/anon ausführbar (Schema ist ohnehin nicht exponiert)
revoke all on function private.immutable_unaccent(text) from public, anon;
grant execute on function private.immutable_unaccent(text) to authenticated, service_role;

revoke all on function private.set_lesson_links(uuid, uuid[], uuid[]) from public, anon;
grant execute on function private.set_lesson_links(uuid, uuid[], uuid[]) to authenticated;
