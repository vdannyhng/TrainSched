-- Einladungs-Workflow (M1)
begin;
create extension if not exists pgtap with schema extensions;
-- Unabhängig von Seed-Daten testen (wird am Ende zurückgerollt).
delete from auth.users;
select plan(20);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.local',    '{"role":"admin"}',   now(), now()),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher1@test.local', '{"role":"teacher"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher2@test.local', '{"role":"teacher"}', now(), now());

insert into public.students (id, teacher_id, first_name, last_name, timezone, locale, is_minor, guardian_consent_at)
values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'Thảo', 'Nguyễn', 'Asia/Ho_Chi_Minh', 'vi', false, null),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b1', 'Paul', null,     'Europe/Berlin',    'de', true,  null);

-- Lehrer T1 erzeugt Einladung
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);

create temporary table invite_codes (label text, code text) on commit drop;
grant all on invite_codes to authenticated, service_role;

insert into invite_codes select 'first', code from public.create_student_invitation('00000000-0000-0000-0000-0000000000d1');
insert into invite_codes select 'second', code from public.create_student_invitation('00000000-0000-0000-0000-0000000000d1');

select matches((select code from invite_codes where label = 'second'), '^[A-HJ-NP-Z2-9]{8}$', 'Code hat 8 eindeutige Zeichen');
select is(
  (select count(*)::int from public.invitations where student_id = '00000000-0000-0000-0000-0000000000d1' and revoked_at is null),
  1, 'neue Einladung widerruft die vorherige');
select throws_ok($$select code_hash from public.invitations$$, '42501', null, 'Hash ist für Lehrer nicht lesbar');
select throws_ok(
  $$select * from public.create_student_invitation('00000000-0000-0000-0000-0000000000d2')$$,
  'P0001', 'guardian_consent_required', 'Minderjährige brauchen dokumentierte Einwilligung');
select throws_ok($$select * from public.find_open_invitation('X')$$, '42501', null, 'find_open_invitation ist für Nutzer gesperrt');
select throws_ok($$select * from public.create_teacher_invitation()$$, '42501', null, 'Nur die Admin-Person kann Lehrer einladen (Lehrer nicht)');

-- Lehrer T2 darf für Schüler von T1 nichts tun
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select throws_ok($$select * from public.create_student_invitation('00000000-0000-0000-0000-0000000000d1')$$, '42501', null, 'T2 kann für T1-Schüler nicht einladen');
select is((select count(*)::int from public.invitations), 0, 'T2 sieht keine Einladungen von T1');

-- Edge Function (service_role) löst ein
reset role;
set local role service_role;

select is((select count(*)::int from public.find_open_invitation((select code from invite_codes where label = 'first'))), 0, 'widerrufener Code ist ungültig');
select is(
  (select display_name || '|' || timezone || '|' || locale from public.find_open_invitation(
     lower(substr((select code from invite_codes where label = 'second'), 1, 4)) || '-' || substr((select code from invite_codes where label = 'second'), 5))),
  'Thảo Nguyễn|Asia/Ho_Chi_Minh|vi', 'Code wird normalisiert (Kleinschreibung, Bindestrich) und liefert Schülerdaten');

reset role;
insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'thao@test.local', '{"role":"student"}', '{"locale":"vi"}', now(), now());
set local role service_role;

select ok(
  public.complete_invitation(
    (select invitation_id from public.find_open_invitation((select code from invite_codes where label = 'second'))),
    '00000000-0000-0000-0000-0000000000c1'),
  'Einladung wird eingelöst');

reset role;
select is((select profile_id from public.students where id = '00000000-0000-0000-0000-0000000000d1'),
  '00000000-0000-0000-0000-0000000000c1'::uuid, 'Schüler ist mit dem neuen Login verknüpft');
select is((select locale::text from public.profiles where id = '00000000-0000-0000-0000-0000000000c1'), 'vi', 'Profil übernimmt Sprache');

set local role service_role;
select is((select count(*)::int from public.find_open_invitation((select code from invite_codes where label = 'second'))), 0, 'eingelöster Code ist nicht wiederverwendbar');
select ok(
  not public.complete_invitation(
    (select id from public.invitations where student_id = '00000000-0000-0000-0000-0000000000d1' and redeemed_at is not null),
    '00000000-0000-0000-0000-0000000000c1'),
  'doppeltes Einlösen liefert false');

-- Abgelaufener Code
reset role;
update public.invitations set expires_at = now() - interval '1 minute', redeemed_at = null, redeemed_by = null
 where student_id = '00000000-0000-0000-0000-0000000000d1' and redeemed_at is not null;
update public.students set profile_id = null where id = '00000000-0000-0000-0000-0000000000d1';
set local role service_role;
select is((select count(*)::int from public.find_open_invitation((select code from invite_codes where label = 'second'))), 0, 'abgelaufener Code ist ungültig');

-- Admin lädt Lehrer ein
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok($$select * from public.create_teacher_invitation()$$, 'Admin kann Lehrer einladen');
insert into invite_codes select 'teacher', code from public.create_teacher_invitation();

-- Wie GoTrue: User wird zunächst OHNE Rolle in app_metadata angelegt
reset role;
insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-0000000000b9', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'neu@test.local', '{"provider":"email"}', now(), now());
set local role service_role;
select ok(
  public.complete_invitation(
    (select invitation_id from public.find_open_invitation((select code from invite_codes where label = 'teacher'))),
    '00000000-0000-0000-0000-0000000000b9'),
  'Lehrer-Einladung wird eingelöst');
reset role;
select is((select role::text from public.profiles where id = '00000000-0000-0000-0000-0000000000b9'), 'teacher',
  'Rolle kommt aus der Einladung, nicht aus app_metadata beim Insert');
select is((select count(*)::int from public.tags where teacher_id = '00000000-0000-0000-0000-0000000000b9'), 5,
  'neuer Lehrer bekommt Einstellungen und Standard-Themen');

select * from finish();
rollback;
