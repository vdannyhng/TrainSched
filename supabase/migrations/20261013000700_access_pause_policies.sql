-- Pausierte Konten auch dort ausschließen, wo Policies auth.uid() direkt prüfen.

drop policy students_select on public.students;
create policy students_select on public.students
for select to authenticated
using (
  private.can_manage_teacher_data(teacher_id)
  or (profile_id = (select auth.uid()) and private.is_active_user())
);

create or replace function private.is_lesson_participant(p_lesson_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_active_user() and exists (
    select 1 from public.lesson_participants lp
    join public.students s on s.id = lp.student_id
    where lp.lesson_id = p_lesson_id and s.profile_id = (select auth.uid())
  );
$$;

create or replace function private.is_my_student_profile(p_profile_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_active_user() and exists (
    select 1 from public.students
    where profile_id = p_profile_id and teacher_id = (select auth.uid())
  );
$$;

create or replace function private.is_my_teacher_profile(p_profile_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_active_user() and exists (
    select 1 from public.students
    where profile_id = (select auth.uid()) and teacher_id = p_profile_id
  );
$$;
