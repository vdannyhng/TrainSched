-- Admin-Protokoll (Threat Model T18): nachvollziehbar, wer Konten pausiert, Rollen ändert,
-- Einladungen erstellt/widerruft und Schüler oder Konten löscht.
-- Schreiben nur über Trigger bzw. die Edge Function `delete-account` (service_role), Lesen nur für Admins.
-- Gespeichert werden IDs statt Namen (Datensparsamkeit); Einträge werden nach 12 Monaten gelöscht.

create table public.audit_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor_id uuid,                 -- bewusst ohne Fremdschlüssel: bleibt nach Konto-Löschung erhalten
  action text not null check (action in (
    'access_paused', 'access_resumed', 'role_changed',
    'invitation_created', 'invitation_revoked', 'invitation_redeemed',
    'student_deleted', 'account_deleted'
  )),
  target_type text not null check (target_type in ('profile', 'invitation', 'student')),
  target_id uuid,
  details jsonb not null default '{}'
);

create index audit_log_created_idx on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

create policy audit_log_admin_select on public.audit_log
for select to authenticated
using (private.is_admin());

create function private.audit(p_action text, p_target_type text, p_target_id uuid, p_details jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, action, target_type, target_id, details)
  values ((select auth.uid()), p_action, p_target_type, p_target_id, coalesce(p_details, '{}'));
$$;

-- Profile: Pausieren/Reaktivieren und Rollenwechsel
create function private.audit_profiles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.access_paused_at is distinct from old.access_paused_at then
    perform private.audit(
      case when new.access_paused_at is null then 'access_resumed' else 'access_paused' end,
      'profile', new.id, jsonb_build_object('role', new.role));
  end if;
  if new.role is distinct from old.role then
    perform private.audit('role_changed', 'profile', new.id, jsonb_build_object('from', old.role, 'to', new.role));
  end if;
  return new;
end;
$$;

create trigger profiles_audit
after update of access_paused_at, role on public.profiles
for each row execute function private.audit_profiles();

-- Einladungen: erstellt, widerrufen, eingelöst
create function private.audit_invitations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.audit('invitation_created', 'invitation', new.id,
      jsonb_build_object('role', new.role, 'student_id', new.student_id, 'teacher_id', new.teacher_id));
  elsif new.revoked_at is not null and old.revoked_at is null then
    perform private.audit('invitation_revoked', 'invitation', new.id, jsonb_build_object('role', new.role));
  elsif new.redeemed_at is not null and old.redeemed_at is null then
    perform private.audit('invitation_redeemed', 'invitation', new.id,
      jsonb_build_object('role', new.role, 'redeemed_by', new.redeemed_by));
  end if;
  return new;
end;
$$;

create trigger invitations_audit
after insert or update of revoked_at, redeemed_at on public.invitations
for each row execute function private.audit_invitations();

-- Schüler gelöscht (in der App oder per Konto-Löschung der Lehrkraft)
create function private.audit_students_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.audit('student_deleted', 'student', old.id,
    jsonb_build_object('teacher_id', old.teacher_id, 'had_login', old.profile_id is not null));
  return old;
end;
$$;

create trigger students_audit_delete
after delete on public.students
for each row execute function private.audit_students_delete();

revoke all on function
  private.audit(text, text, uuid, jsonb), private.audit_profiles(),
  private.audit_invitations(), private.audit_students_delete()
from public, anon, authenticated;

-- Aufbewahrung: 12 Monate
select cron.schedule('trainsched-audit-retention', '17 3 1 * *',
  $$delete from public.audit_log where created_at < now() - interval '12 months'$$);
