-- Lokale Demo-Daten (nur `supabase db reset` / lokale Entwicklung – NIE in Produktion einspielen).
--
-- Logins (Passwort für alle: Lernen2026):
--   lehrerin@trainsched.test  → Admin/Lehrerin
--   schueler@trainsched.test  → Schüler Hương (Zeitzone Asia/Ho_Chi_Minh, UI Vietnamesisch)
--   lehrer@trainsched.test    → reiner Lehrer (keine Admin-Rechte) mit Demo-Schüler Bảo
--   bao@trainsched.test       → Schüler Bảo Lê (gehört zu Thomas Lehrer)
-- Offene Einladung für Schüler „Minh“: Code TEST-2345

do $$
declare
  v_teacher uuid := '11111111-1111-1111-1111-111111111111';
  v_student uuid := '22222222-2222-2222-2222-222222222222';
  v_password text := extensions.crypt('Lernen2026', extensions.gen_salt('bf'));
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values
    (v_teacher, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'lehrerin@trainsched.test', v_password, now(),
     '{"provider":"email","providers":["email"],"role":"admin"}',
     '{"display_name":"Lan Nguyễn","timezone":"Europe/Zurich","locale":"de"}', now(), now(), '', '', '', ''),
    (v_student, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'schueler@trainsched.test', v_password, now(),
     '{"provider":"email","providers":["email"],"role":"student"}',
     '{"display_name":"Hương Trần","timezone":"Asia/Ho_Chi_Minh","locale":"vi"}', now(), now(), '', '', '', '');

  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values
    (gen_random_uuid(), v_teacher, v_teacher::text, 'email',
     jsonb_build_object('sub', v_teacher::text, 'email', 'lehrerin@trainsched.test', 'email_verified', true), now(), now(), now()),
    (gen_random_uuid(), v_student, v_student::text, 'email',
     jsonb_build_object('sub', v_student::text, 'email', 'schueler@trainsched.test', 'email_verified', true), now(), now(), now());

  -- Lehrerin hat der Datenschutzerklärung schon zugestimmt; die Schülerin sieht den Consent-Screen.
  update public.profiles set privacy_consent_version = '2026-10', privacy_consent_at = now() where id = v_teacher;

  insert into public.students (id, teacher_id, profile_id, first_name, last_name, email, timezone, locale, start_level, current_level, goal, currency)
  values
    ('33333333-3333-3333-3333-333333333331', v_teacher, v_student, 'Hương', 'Trần', 'schueler@trainsched.test',
     'Asia/Ho_Chi_Minh', 'vi', 'A1', 'A2', 'Goethe-Zertifikat A2 im Frühling', 'VND'),
    ('33333333-3333-3333-3333-333333333332', v_teacher, null, 'Minh', 'Phạm', null,
     'Europe/Berlin', 'de', 'B1', 'B1', 'Business-Deutsch', 'EUR');

  insert into public.invitations (teacher_id, student_id, role, code_hash, expires_at)
  values (v_teacher, '33333333-3333-3333-3333-333333333332', 'student',
          private.hash_invite_code('TEST-2345'), now() + interval '365 days');
end;
$$;

-- Reiner Lehrer-Account (keine Admin-Rechte) mit eigenem Demo-Schüler.
-- Idempotent, damit er auch in eine bestehende lokale DB eingespielt werden kann.
do $$
declare
  v_teacher uuid := '44444444-4444-4444-4444-444444444444';
  v_password text := extensions.crypt('Lernen2026', extensions.gen_salt('bf'));
begin
  if exists (select 1 from auth.users where id = v_teacher) then
    return;
  end if;

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values
    (v_teacher, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'lehrer@trainsched.test', v_password, now(),
     '{"provider":"email","providers":["email"],"role":"teacher"}',
     '{"display_name":"Thomas Lehrer","timezone":"Europe/Zurich","locale":"de"}', now(), now(), '', '', '', '');

  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_teacher, v_teacher::text, 'email',
          jsonb_build_object('sub', v_teacher::text, 'email', 'lehrer@trainsched.test', 'email_verified', true), now(), now(), now());

  update public.profiles set privacy_consent_version = '2026-10', privacy_consent_at = now() where id = v_teacher;

  insert into public.students (id, teacher_id, first_name, last_name, timezone, locale, start_level, current_level, goal, currency)
  values ('55555555-5555-5555-5555-555555555551', v_teacher, 'Bảo', 'Lê', 'Asia/Ho_Chi_Minh', 'vi', 'A2', 'B1',
          'Alltagsdeutsch für die Arbeit', 'EUR');
end;
$$;

-- Schüler-Login für Bảo Lê (Schüler von Thomas Lehrer). Idempotent.
do $$
declare
  v_user uuid := '66666666-6666-6666-6666-666666666666';
  v_password text := extensions.crypt('Lernen2026', extensions.gen_salt('bf'));
begin
  if exists (select 1 from auth.users where email = 'bao@trainsched.test') then
    return;
  end if;

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values
    (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'bao@trainsched.test', v_password, now(),
     '{"provider":"email","providers":["email"],"role":"student"}',
     '{"display_name":"Bảo Lê","timezone":"Asia/Ho_Chi_Minh","locale":"vi"}', now(), now(), '', '', '', '');

  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_user, v_user::text, 'email',
          jsonb_build_object('sub', v_user::text, 'email', 'bao@trainsched.test', 'email_verified', true), now(), now(), now());

  update public.students set profile_id = v_user, email = 'bao@trainsched.test'
  where id = '55555555-5555-5555-5555-555555555551';
end;
$$;

-- Push-Versand lokal: Datenbank (pg_net) ruft die Edge Function send-push über das Docker-Netz auf.
-- Das Secret muss zu PUSH_DISPATCH_SECRET in supabase/functions/.env passen (siehe .env.example).
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'push_dispatch_url') then
    perform vault.create_secret('http://supabase_kong_TrainSched:8000/functions/v1/send-push', 'push_dispatch_url');
  end if;
  if not exists (select 1 from vault.secrets where name = 'push_dispatch_secret') then
    perform vault.create_secret('local-dev-push-secret', 'push_dispatch_secret');
  end if;
end;
$$;
