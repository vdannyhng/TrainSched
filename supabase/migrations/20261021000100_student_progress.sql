-- M6: Lernfortschritt eines Schülers (Lehrkraft für eigene Schüler, Schüler für sich selbst).
--
-- Zählt nur Termine, die schon begonnen haben (optional ab p_from):
--   held        gehaltene Termine; davon present / absent / excused / unmarked (Anwesenheit noch offen)
--   cancelled   abgesagte Termine; davon by_student (angenommene Absage-Anfragen) und late (nach Frist)
--   open_past   vergangen, aber weder gehalten noch abgesagt markiert
-- Quoten: attendance_rate = present / (present + absent + excused)
--         cancel_rate     = cancelled / (held + cancelled)
-- Level-Verlauf und Themen gelten über den gewählten Zeitraum bzw. (Level) immer komplett.

create function public.student_progress(p_student_id uuid, p_from timestamptz default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_student public.students;
  v_result jsonb;
begin
  select * into v_student from public.students where id = p_student_id;
  -- coalesce: profile_id kann NULL sein (Schüler ohne App-Zugang) → sonst wäre `not (NULL)` kein Verbot
  if v_student.id is null or not coalesce(
    private.can_manage_teacher_data(v_student.teacher_id)
    or (v_student.profile_id = (select auth.uid()) and private.is_active_user()),
    false
  ) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  with mine as (
    select l.id, l.start_at, l.end_at, l.status, lp.attendance
      from public.lessons l
      join public.lesson_participants lp on lp.lesson_id = l.id and lp.student_id = p_student_id
     where l.start_at < now()
       and (p_from is null or l.start_at >= p_from)
  ),
  counts as (
    select
      count(*) filter (where status = 'held') as held,
      count(*) filter (where status = 'held' and attendance = 'present') as present,
      count(*) filter (where status = 'held' and attendance = 'absent') as absent,
      count(*) filter (where status = 'held' and attendance = 'excused') as excused,
      count(*) filter (where status = 'held' and attendance = 'pending') as unmarked,
      count(*) filter (where status = 'cancelled') as cancelled,
      count(*) filter (where status = 'scheduled') as open_past,
      coalesce(sum(extract(epoch from end_at - start_at) / 60)
                 filter (where status = 'held' and attendance = 'present'), 0)::integer as minutes_present,
      min(start_at) filter (where status = 'held') as first_held_at,
      max(start_at) filter (where status = 'held') as last_held_at
    from mine
  ),
  student_cancels as (
    select count(*) as by_student, count(*) filter (where r.is_late) as late
      from public.lesson_requests r
      join public.lessons l on l.id = r.lesson_id
     where r.student_id = p_student_id
       and r.kind = 'cancel'
       and r.status = 'accepted'
       and l.start_at < now()
       and (p_from is null or l.start_at >= p_from)
  ),
  topics as (
    select t.id, t.label, t.color, count(*)::integer as lessons, max(m.start_at) as last_at
      from mine m
      join public.lesson_tags lt on lt.lesson_id = m.id
      join public.tags t on t.id = lt.tag_id
     where m.status = 'held'
     group by t.id, t.label, t.color
  ),
  levels as (
    select level, changed_at
      from public.student_level_changes
     where student_id = p_student_id
  )
  select jsonb_build_object(
    'held', c.held,
    'present', c.present,
    'absent', c.absent,
    'excused', c.excused,
    'unmarked', c.unmarked,
    'cancelled', c.cancelled,
    'cancelled_by_student', sc.by_student,
    'cancelled_late', sc.late,
    'open_past', c.open_past,
    'minutes_present', c.minutes_present,
    'first_held_at', c.first_held_at,
    'last_held_at', c.last_held_at,
    'attendance_rate', case when c.present + c.absent + c.excused > 0
                         then round(c.present::numeric / (c.present + c.absent + c.excused), 3) end,
    'cancel_rate', case when c.held + c.cancelled > 0
                     then round(c.cancelled::numeric / (c.held + c.cancelled), 3) end,
    'start_level', v_student.start_level,
    'current_level', v_student.current_level,
    'levels', coalesce((select jsonb_agg(jsonb_build_object('level', level, 'changed_at', changed_at)
                                         order by changed_at) from levels), '[]'::jsonb),
    'topics', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'label', label, 'color', color,
                                                            'lessons', lessons, 'last_at', last_at)
                                         order by lessons desc, label) from topics), '[]'::jsonb)
  )
  into v_result
  from counts c cross join student_cancels sc;

  return v_result;
end;
$$;

revoke all on function public.student_progress(uuid, timestamptz) from public, anon;
grant execute on function public.student_progress(uuid, timestamptz) to authenticated;
