-- RLS-Tests für profiles, students, teacher_settings (M1)
begin;
create extension if not exists pgtap with schema extensions;
-- Unabhängig von Seed-Daten testen (wird am Ende zurückgerollt).
delete from auth.users;
select plan(25);

-- ---------------------------------------------------------------------------
-- Fixtures (als postgres, RLS greift hier nicht)
--   Admin A · Lehrer T1, T2 · Schüler-Logins S1 (bei T1), S2 (bei T2)
--   Schülerdatensätze: d1 = S1, d2 = S2, d3 = T1 unverknüpft
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.local',   '{"role":"admin"}',   '{"display_name":"Admin"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher1@test.local','{"role":"teacher"}', '{"display_name":"Lan"}',   now(), now()),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher2@test.local','{"role":"teacher"}', '{"display_name":"Mai"}',   now(), now()),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student1@test.local','{"role":"student"}', '{"display_name":"Hương","timezone":"Asia/Ho_Chi_Minh","locale":"vi"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student2@test.local','{"role":"student"}', '{"display_name":"Jonas","timezone":"Mars/Olympus"}', now(), now());

insert into public.students (id, teacher_id, profile_id, first_name)
values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'Hương'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c2', 'Jonas'),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000b1', null,                                   'Minh');

-- Trigger handle_new_user
select is((select role::text from public.profiles where id = '00000000-0000-0000-0000-0000000000b1'), 'teacher', 'Rolle stammt aus app_metadata');
select is((select count(*)::int from public.teacher_settings), 3, 'teacher_settings für Admin + 2 Lehrer angelegt');
select is((select timezone from public.profiles where id = '00000000-0000-0000-0000-0000000000c1'), 'Asia/Ho_Chi_Minh', 'Zeitzone aus user_metadata übernommen');
select is((select timezone from public.profiles where id = '00000000-0000-0000-0000-0000000000c2'), 'Europe/Zurich', 'ungültige Zeitzone fällt auf Europe/Zurich zurück');

-- ---------------------------------------------------------------------------
-- Schüler S1
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);

select results_eq('select id from public.students', $$values ('00000000-0000-0000-0000-0000000000d1'::uuid)$$, 'S1 sieht nur den eigenen Schülerdatensatz');
select is((select count(*)::int from public.profiles), 2, 'S1 sieht sich selbst und die eigene Lehrerin');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000b2'), 0, 'S1 sieht fremde Lehrer nicht');
select is((select count(*)::int from public.teacher_settings), 0, 'S1 sieht keine Lehrer-Einstellungen');

select is_empty(
  $$update public.students set goal = 'hack' where id = '00000000-0000-0000-0000-0000000000d1' returning 1$$,
  'S1 kann den eigenen Schülerdatensatz nicht ändern');
select throws_ok($$update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000c1'$$, '42501', null, 'S1 kann die eigene Rolle nicht ändern');
select lives_ok($$update public.profiles set display_name = 'Hương N.' where id = '00000000-0000-0000-0000-0000000000c1'$$, 'S1 darf den Anzeigenamen ändern');
select throws_ok(
  $$insert into public.students (teacher_id, first_name) values ('00000000-0000-0000-0000-0000000000c1', 'Fake')$$,
  '42501', null, 'S1 kann keine Schüler anlegen');
select throws_ok($$select * from public.create_student_invitation('00000000-0000-0000-0000-0000000000d3')$$, '42501', null, 'S1 kann keine Einladung erzeugen');
select throws_ok($$select * from public.create_teacher_invitation()$$, '42501', null, 'S1 kann keine Lehrer einladen');

-- ---------------------------------------------------------------------------
-- Lehrer T1
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);

select is((select count(*)::int from public.students), 2, 'T1 sieht genau die eigenen 2 Schüler');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000c1'), 1, 'T1 sieht das Profil des eigenen Schülers');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000c2'), 0, 'T1 sieht das Profil fremder Schüler nicht');
select throws_ok(
  $$insert into public.students (teacher_id, first_name) values ('00000000-0000-0000-0000-0000000000b2', 'Fremd')$$,
  '42501', null, 'T1 kann keinen Schüler für T2 anlegen');
select lives_ok(
  $$insert into public.students (teacher_id, first_name, timezone) values ('00000000-0000-0000-0000-0000000000b1', 'Lena', 'Europe/Berlin')$$,
  'T1 kann eigenen Schüler anlegen');
select throws_ok(
  $$update public.students set profile_id = '00000000-0000-0000-0000-0000000000c2' where id = '00000000-0000-0000-0000-0000000000d3'$$,
  '42501', null, 'T1 kann profile_id nicht selbst setzen');
select is_empty(
  $$update public.students set goal = 'x' where id = '00000000-0000-0000-0000-0000000000d2' returning 1$$,
  'T1 kann Schüler von T2 nicht ändern');
select is_empty(
  $$delete from public.students where id = '00000000-0000-0000-0000-0000000000d2' returning 1$$,
  'T1 kann Schüler von T2 nicht löschen');

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((select count(*)::int from public.students), 4, 'Admin sieht alle Schüler');
select is((select count(*)::int from public.profiles), 5, 'Admin sieht alle Profile');

-- ---------------------------------------------------------------------------
-- Anonym
-- ---------------------------------------------------------------------------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok('select count(*) from public.students', '42501', null, 'anon hat keinen Zugriff auf students');

select * from finish();
rollback;
