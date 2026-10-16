-- Level-Verlauf: Trigger protokolliert Änderungen, RLS wie bei students, kein direktes Schreiben
begin;
create extension if not exists pgtap with schema extensions;
delete from auth.users;
select plan(9);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 't1@test.local', '{"role":"teacher"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 't2@test.local', '{"role":"teacher"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 's1@test.local', '{"role":"student"}', now(), now());

-- Anlegen als Superuser (feste IDs), auth.uid() kommt trotzdem aus den Claims
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);

insert into public.students (id, teacher_id, first_name, current_level) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'Hương', 'A1');
insert into public.students (id, teacher_id, first_name) values
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b1', 'Jonas');
set local role authenticated;

select results_eq(
  $$select level::text, changed_by from public.student_level_changes where student_id = '00000000-0000-0000-0000-0000000000d1'$$,
  $$values ('A1', '00000000-0000-0000-0000-0000000000b1'::uuid)$$,
  'Anlegen mit Level wird protokolliert (mit Urheber)');
select is_empty(
  $$select 1 from public.student_level_changes where student_id = '00000000-0000-0000-0000-0000000000d2'$$,
  'Anlegen ohne Level erzeugt keinen Eintrag');

update public.students set goal = 'Prüfung' where id = '00000000-0000-0000-0000-0000000000d1';
update public.students set current_level = 'A1' where id = '00000000-0000-0000-0000-0000000000d1';
select is((select count(*)::int from public.student_level_changes where student_id = '00000000-0000-0000-0000-0000000000d1'),
  1, 'Andere Felder oder gleiches Level erzeugen keinen Eintrag');

update public.students set current_level = 'A2' where id = '00000000-0000-0000-0000-0000000000d1';
select results_eq(
  $$select level::text from public.student_level_changes where student_id = '00000000-0000-0000-0000-0000000000d1' order by changed_at, level$$,
  $$values ('A1'), ('A2')$$,
  'Levelwechsel wird protokolliert');

select throws_ok(
  $$insert into public.student_level_changes (student_id, level) values ('00000000-0000-0000-0000-0000000000d1', 'B2')$$,
  '42501', null, 'Kein direktes Einfügen');
select throws_ok(
  $$update public.student_level_changes set level = 'B2'$$,
  '42501', null, 'Kein direktes Ändern');

-- Schüler sieht nur den eigenen Verlauf
reset role;
update public.students set profile_id = '00000000-0000-0000-0000-0000000000c1' where id = '00000000-0000-0000-0000-0000000000d1';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select is((select count(*)::int from public.student_level_changes), 2, 'Schülerin sieht ihren eigenen Verlauf');

-- Fremder Lehrer sieht nichts
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select is_empty($$select 1 from public.student_level_changes$$, 'Fremder Lehrer sieht keinen Verlauf');

-- Löschen des Schülers räumt den Verlauf mit ab
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
delete from public.students where id = '00000000-0000-0000-0000-0000000000d1';
reset role;
select is_empty($$select 1 from public.student_level_changes where student_id = '00000000-0000-0000-0000-0000000000d1'$$,
  'Verlauf wird mit dem Schüler gelöscht');

select * from finish();
rollback;
