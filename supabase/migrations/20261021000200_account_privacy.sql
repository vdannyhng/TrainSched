-- M7: Konto löschen, Datenexport, Benachrichtigung bei gelöschtem Schülerkonto.
--
-- Löschen läuft über die Edge Function `delete-account` (braucht service_role für auth.users und Storage):
--   1. account_deletion_plan() prüft als angemeldeter Nutzer, WAS gelöscht werden darf
--   2. die Funktion löscht Datenzeilen, Dateien (attachment_objects) und Logins
-- Modi:
--   student_self  Schüler löscht sein Login. Der Schülerdatensatz der Lehrkraft bleibt (ohne App-Zugang),
--                 die Lehrkraft wird benachrichtigt und kann ihn ebenfalls löschen.
--   student       Lehrkraft löscht einen Schüler komplett (Datensatz, Dateien, Login).
--   teacher_self  Lehrkraft löscht ihr Konto mit allen Schülern, Terminen, Dateien und Schüler-Logins.
--   Admin-Konten können sich nicht selbst löschen (sonst gäbe es niemanden mehr, der Lehrkräfte verwaltet).

alter table public.notification_outbox drop constraint notification_outbox_kind_check;
alter table public.notification_outbox add constraint notification_outbox_kind_check
  check (kind in ('reminder', 'lesson_moved', 'lesson_cancelled', 'request_new', 'request_decided', 'account_deleted'));

-- ---------------------------------------------------------------------------
-- Plan (Berechtigungsprüfung als aufrufender Nutzer)
-- ---------------------------------------------------------------------------
create function public.account_deletion_plan(p_student_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_role public.app_role;
  v_student public.students;
begin
  if v_uid is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_student_id is not null then
    select * into v_student from public.students where id = p_student_id;
    if v_student.id is null or not coalesce(private.can_manage_teacher_data(v_student.teacher_id), false) then
      raise exception 'not_found' using errcode = 'P0002';
    end if;
    return jsonb_build_object(
      'mode', 'student',
      'student_ids', jsonb_build_array(v_student.id),
      'user_ids', case when v_student.profile_id is null then '[]'::jsonb
                       else jsonb_build_array(v_student.profile_id) end,
      'teacher_folder', v_student.teacher_id
    );
  end if;

  select role into v_role from public.profiles where id = v_uid;
  if v_role = 'admin' then
    raise exception 'admin_cannot_delete' using errcode = 'P0001';
  elsif v_role = 'student' then
    return jsonb_build_object('mode', 'student_self', 'student_ids', '[]'::jsonb,
                              'user_ids', jsonb_build_array(v_uid), 'teacher_folder', null);
  elsif v_role = 'teacher' then
    return jsonb_build_object(
      'mode', 'teacher_self',
      'student_ids', coalesce((select jsonb_agg(s.id) from public.students s where s.teacher_id = v_uid), '[]'::jsonb),
      -- eigenes Login zuletzt löschen
      'user_ids', coalesce((select jsonb_agg(s.profile_id) from public.students s
                             where s.teacher_id = v_uid and s.profile_id is not null), '[]'::jsonb)
                  || jsonb_build_array(v_uid),
      'teacher_folder', v_uid
    );
  end if;
  raise exception 'not_found' using errcode = 'P0002';
end;
$$;

revoke all on function public.account_deletion_plan(uuid) from public, anon;
grant execute on function public.account_deletion_plan(uuid) to authenticated;

-- Dateien im Ordner einer Lehrkraft (nur verwaiste oder alle) – nur für die Edge Function
create function public.attachment_objects(p_teacher_id uuid, p_only_orphans boolean)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select o.name
    from storage.objects o
   where o.bucket_id = 'attachments'
     and o.name like p_teacher_id::text || '/%'
     and (not p_only_orphans
          or not exists (select 1 from public.attachments a where a.storage_path = o.name));
$$;

revoke all on function public.attachment_objects(uuid, boolean) from public, anon, authenticated;
grant execute on function public.attachment_objects(uuid, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- Schüler hat sein Konto gelöscht → Lehrkraft informieren
-- ---------------------------------------------------------------------------
create function private.on_student_unlinked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Nicht benachrichtigen, wenn die Lehrkraft im selben Vorgang gelöscht wird (Konto-Löschung der Lehrkraft)
  if old.profile_id is not null and new.profile_id is null
     and exists (select 1 from public.profiles where id = new.teacher_id) then
    perform private.enqueue_push(
      new.teacher_id, 'account_deleted', null, null,
      jsonb_build_object('student_id', new.id, 'student_name', new.first_name),
      'account_deleted:' || new.id || ':' || txid_current()
    );
  end if;
  return new;
end;
$$;

revoke all on function private.on_student_unlinked() from public, anon, authenticated;

create trigger students_unlinked_push
after update of profile_id on public.students
for each row execute function private.on_student_unlinked();

-- ---------------------------------------------------------------------------
-- Datenexport: alles, was der Nutzer laut RLS sehen darf (security invoker!)
-- ---------------------------------------------------------------------------
create function public.export_my_data()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'format', 'trainsched-export-v1',
    'exported_at', now(),
    'profile', (select to_jsonb(p) - 'access_paused_at' from public.profiles p where p.id = (select auth.uid())),
    'teacher_settings', coalesce((select jsonb_agg(to_jsonb(x)) from public.teacher_settings x), '[]'::jsonb),
    'students', coalesce((select jsonb_agg(to_jsonb(x) - 'search_text') from public.students x), '[]'::jsonb),
    'student_level_changes', coalesce((select jsonb_agg(to_jsonb(x)) from public.student_level_changes x), '[]'::jsonb),
    'tags', coalesce((select jsonb_agg(to_jsonb(x)) from public.tags x), '[]'::jsonb),
    'student_tags', coalesce((select jsonb_agg(to_jsonb(x)) from public.student_tags x), '[]'::jsonb),
    'lesson_series', coalesce((select jsonb_agg(to_jsonb(x)) from public.lesson_series x), '[]'::jsonb),
    'lessons', coalesce((select jsonb_agg(to_jsonb(x) order by x.start_at) from public.lessons x), '[]'::jsonb),
    'lesson_participants', coalesce((select jsonb_agg(to_jsonb(x)) from public.lesson_participants x), '[]'::jsonb),
    'lesson_tags', coalesce((select jsonb_agg(to_jsonb(x)) from public.lesson_tags x), '[]'::jsonb),
    'notes', coalesce((select jsonb_agg(to_jsonb(x) - 'search_text' order by x.created_at) from public.notes x), '[]'::jsonb),
    'homework', coalesce((select jsonb_agg(to_jsonb(x)) from public.homework x), '[]'::jsonb),
    'attachments', coalesce((select jsonb_agg(to_jsonb(x)) from public.attachments x), '[]'::jsonb),
    'lesson_requests', coalesce((select jsonb_agg(to_jsonb(x)) from public.lesson_requests x), '[]'::jsonb),
    'blockers', coalesce((select jsonb_agg(to_jsonb(x)) from public.blockers x), '[]'::jsonb),
    'push_tokens', coalesce((select jsonb_agg(jsonb_build_object('platform', x.platform, 'updated_at', x.updated_at))
                               from public.push_tokens x), '[]'::jsonb)
  );
$$;

revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
