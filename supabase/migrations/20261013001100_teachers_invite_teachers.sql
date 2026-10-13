-- Lehrkräfte dürfen (wie die Admin-Person) weitere Lehrkräfte einladen.
-- Neue Lehrkräfte sind unabhängig: Sie sehen nur ihre eigenen Schüler.
create or replace function public.create_teacher_invitation()
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := private.generate_invite_code();
  v_expires timestamptz := now() + interval '14 days';
begin
  if not private.is_teacher() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  insert into public.invitations (teacher_id, role, code_hash, expires_at)
  values ((select auth.uid()), 'teacher', private.hash_invite_code(v_code), v_expires);

  return query select v_code, v_expires;
end;
$$;
