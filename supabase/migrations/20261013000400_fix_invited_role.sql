-- =============================================================================
-- Fix: Rolle aus der Einladung verbindlich setzen
-- =============================================================================
-- GoTrue legt den User zuerst ohne die übergebenen app_metadata an und ergänzt
-- sie erst danach per UPDATE. Der Insert-Trigger handle_new_user sieht die Rolle
-- deshalb nicht → eingeladene Lehrer wurden als „student“ angelegt.
-- complete_invitation setzt die Rolle jetzt selbst (Quelle der Wahrheit = Einladung).

create or replace function public.complete_invitation(p_invitation_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid;
  v_role public.app_role;
begin
  update public.invitations
     set redeemed_at = now(), redeemed_by = p_user_id
   where id = p_invitation_id
     and redeemed_at is null
     and revoked_at is null
     and expires_at > now()
  returning student_id, role into v_student_id, v_role;

  if not found then
    return false;
  end if;

  update public.profiles set role = v_role where id = p_user_id;

  if v_role = 'teacher' then
    insert into public.teacher_settings (teacher_id) values (p_user_id) on conflict do nothing;
  end if;

  if v_student_id is not null then
    update public.students
       set profile_id = p_user_id
     where id = v_student_id and profile_id is null;
    if not found then
      raise exception 'student_already_linked';
    end if;
  end if;

  return true;
end;
$$;

revoke all on function public.complete_invitation(uuid, uuid) from public, anon, authenticated;
grant execute on function public.complete_invitation(uuid, uuid) to service_role;

-- Bereits falsch angelegte Konten aus eingelösten Lehrer-Einladungen reparieren
update public.profiles p
   set role = 'teacher'
  from public.invitations i
 where i.redeemed_by = p.id
   and i.role = 'teacher'
   and p.role = 'student';

insert into public.teacher_settings (teacher_id)
select p.id from public.profiles p
 where p.role in ('teacher', 'admin')
on conflict do nothing;
