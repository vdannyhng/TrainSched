-- Lernfortschritt: Zählungen, Quoten, Zeitraum, Themen, Level-Verlauf, Zugriff
begin;
create extension if not exists pgtap with schema extensions;
delete from auth.users;
select plan(12);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 't1@test.local', '{"role":"teacher"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 't2@test.local', '{"role":"teacher"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 's1@test.local', '{"role":"student"}', now(), now());

insert into public.students (id, teacher_id, profile_id, first_name, start_level, current_level) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'Hương', 'A1', 'A1'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b1', null, 'Jonas', null, null);
update public.students set current_level = 'A2' where id = '00000000-0000-0000-0000-0000000000d1';

insert into public.tags (id, teacher_id, label, color) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000b1', 'T-Grammatik', '#1F5F8B'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000b1', 'T-Hören', '#1E7A45');

-- L1 gehalten/anwesend (60 min, Grammatik)   L2 gehalten/abwesend (Grammatik+Hören)
-- L3 Gruppe gehalten/entschuldigt            L4 abgesagt per Anfrage (kurzfristig)
-- L5 vom Lehrer abgesagt                      L6 vergangen, nicht markiert
-- L7 Zukunft (zählt nicht)                    L8 vor 200 Tagen gehalten/anwesend (90 min)
insert into public.lessons (id, teacher_id, start_at, end_at, timezone, status) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b1', now() - interval '10 days', now() - interval '10 days' + interval '60 minutes', 'Europe/Zurich', 'held'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000b1', now() - interval '9 days',  now() - interval '9 days' + interval '60 minutes',  'Europe/Zurich', 'held'),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000b1', now() - interval '8 days',  now() - interval '8 days' + interval '60 minutes',  'Europe/Zurich', 'held'),
  ('00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000b1', now() - interval '7 days',  now() - interval '7 days' + interval '60 minutes',  'Europe/Zurich', 'cancelled'),
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000b1', now() - interval '6 days',  now() - interval '6 days' + interval '60 minutes',  'Europe/Zurich', 'cancelled'),
  ('00000000-0000-0000-0000-0000000000e6', '00000000-0000-0000-0000-0000000000b1', now() - interval '5 days',  now() - interval '5 days' + interval '60 minutes',  'Europe/Zurich', 'scheduled'),
  ('00000000-0000-0000-0000-0000000000e7', '00000000-0000-0000-0000-0000000000b1', now() + interval '5 days',  now() + interval '5 days' + interval '60 minutes',  'Europe/Zurich', 'scheduled'),
  ('00000000-0000-0000-0000-0000000000e8', '00000000-0000-0000-0000-0000000000b1', now() - interval '200 days', now() - interval '200 days' + interval '90 minutes', 'Europe/Zurich', 'held');
insert into public.lesson_participants (lesson_id, student_id, attendance) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1', 'present'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000d1', 'absent'),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000d1', 'excused'),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000d2', 'present'),
  ('00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000d1', 'pending'),
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000d1', 'pending'),
  ('00000000-0000-0000-0000-0000000000e6', '00000000-0000-0000-0000-0000000000d1', 'pending'),
  ('00000000-0000-0000-0000-0000000000e7', '00000000-0000-0000-0000-0000000000d1', 'pending'),
  ('00000000-0000-0000-0000-0000000000e8', '00000000-0000-0000-0000-0000000000d1', 'present');
insert into public.lesson_tags (lesson_id, tag_id) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000f1'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000f1'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000f2'),
  ('00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000f2');
insert into public.lesson_requests (lesson_id, student_id, teacher_id, kind, is_late, status) values
  ('00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'cancel', true, 'accepted');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);

create temp table p as select public.student_progress('00000000-0000-0000-0000-0000000000d1') as j;
select results_eq(
  $$select (j->>'held')::int, (j->>'present')::int, (j->>'absent')::int, (j->>'excused')::int, (j->>'unmarked')::int from p$$,
  $$values (4, 2, 1, 1, 0)$$,
  'Gehaltene Termine mit Anwesenheit (Zukunft zählt nicht)');
select results_eq(
  $$select (j->>'cancelled')::int, (j->>'cancelled_by_student')::int, (j->>'cancelled_late')::int, (j->>'open_past')::int from p$$,
  $$values (2, 1, 1, 1)$$,
  'Absagen (davon durch Schülerin, kurzfristig) und unmarkierte Termine');
select results_eq(
  $$select (j->>'attendance_rate')::numeric, (j->>'cancel_rate')::numeric, (j->>'minutes_present')::int from p$$,
  $$values (0.5::numeric, 0.333::numeric, 150)$$,
  'Quoten und Unterrichtszeit');
select results_eq(
  $$select x->>'label', (x->>'lessons')::int from p, jsonb_array_elements(j->'topics') x$$,
  $$values ('T-Grammatik', 2), ('T-Hören', 1)$$,
  'Themen nur aus gehaltenen Terminen, häufigste zuerst');
select results_eq(
  $$select x->>'level' from p, jsonb_array_elements(j->'levels') x$$,
  $$values ('A1'), ('A2')$$,
  'Level-Verlauf chronologisch');

drop table p;
create temp table p as select public.student_progress('00000000-0000-0000-0000-0000000000d1', now() - interval '90 days') as j;
select results_eq(
  $$select (j->>'held')::int, (j->>'present')::int, (j->>'minutes_present')::int from p$$,
  $$values (3, 1, 60)$$,
  'Zeitraum filtert alte Termine heraus');
select is((select jsonb_array_length(j->'levels') from p), 2, 'Level-Verlauf bleibt vollständig');

select is((public.student_progress('00000000-0000-0000-0000-0000000000d2')->>'attendance_rate')::numeric, 1.0,
  'Gruppentermin zählt für jeden Teilnehmer einzeln');

-- Zugriff
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select is((public.student_progress('00000000-0000-0000-0000-0000000000d1')->>'held')::int, 4, 'Schülerin sieht den eigenen Fortschritt');
select throws_ok($$select public.student_progress('00000000-0000-0000-0000-0000000000d2')$$,
  'P0002', 'not_found', 'Schülerin sieht keinen fremden Fortschritt');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select throws_ok($$select public.student_progress('00000000-0000-0000-0000-0000000000d1')$$,
  'P0002', 'not_found', 'Fremder Lehrer sieht nichts');

reset role;
update public.profiles set access_paused_at = now() where id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select throws_ok($$select public.student_progress('00000000-0000-0000-0000-0000000000d1')$$,
  'P0002', 'not_found', 'Pausiertes Konto sieht nichts');

select * from finish();
rollback;
