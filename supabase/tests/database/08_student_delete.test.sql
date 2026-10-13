-- Schüler löschen räumt eigene Termine/Serien auf, Gruppentermine bleiben
begin;
create extension if not exists pgtap with schema extensions;
delete from auth.users;
select plan(6);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 't1@test.local', '{"role":"teacher"}', now(), now());
insert into public.students (id, teacher_id, first_name) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'Hương'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b1', 'Jonas');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);

select public.create_lesson('00000000-0000-0000-0000-0000000000b1', '2026-11-02 09:00+00', '2026-11-02 10:00+00',
  'Europe/Zurich', 'Einzel', 'online', null, null, null, array['00000000-0000-0000-0000-0000000000d1']::uuid[], '{}');
select public.create_lesson('00000000-0000-0000-0000-0000000000b1', '2026-11-02 11:00+00', '2026-11-02 12:00+00',
  'Europe/Zurich', 'Gruppe', 'online', null, null, null,
  array['00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2']::uuid[], '{}');
select * from public.create_lesson_series('00000000-0000-0000-0000-0000000000b1', 'weekly', '2026-11-03', '2026-11-24',
  '18:00', 60, 'Europe/Zurich', null, 'online', null, null, null, array['00000000-0000-0000-0000-0000000000d1']::uuid[], '{}');

select is((select count(*)::int from public.lessons), 6, 'Vorher: Einzel + Gruppe + 4 Serientermine');

select lives_ok($$delete from public.students where id = '00000000-0000-0000-0000-0000000000d1'$$, 'Lehrer löscht Schülerin');

select is((select count(*)::int from public.lessons where title = 'Einzel'), 0, 'Einzeltermin der Schülerin ist weg');
select is((select count(*)::int from public.lesson_series), 0, 'Ihre Serie ist weg (keine leeren Verlängerungen mehr)');
select results_eq(
  $$select lp.student_id from public.lessons l join public.lesson_participants lp on lp.lesson_id = l.id where l.title = 'Gruppe'$$,
  $$values ('00000000-0000-0000-0000-0000000000d2'::uuid)$$,
  'Gruppentermin bleibt mit dem anderen Teilnehmer');
select is((select count(*)::int from public.lessons l
            where not exists (select 1 from public.lesson_participants lp where lp.lesson_id = l.id)),
  0, 'Keine Termine ohne Teilnehmende');

select * from finish();
rollback;
