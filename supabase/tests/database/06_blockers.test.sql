-- Blocker (private Zeiten der Lehrkraft)
begin;
create extension if not exists pgtap with schema extensions;
delete from auth.users;
select plan(9);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 't1@test.local', '{"role":"teacher"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 't2@test.local', '{"role":"teacher"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 's1@test.local', '{"role":"student"}', now(), now());
insert into public.students (id, teacher_id, profile_id, first_name) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'Hương');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);

-- „Arbeit“ Mo–Fr 08:00–16:00 ab 19.10.2026 (über die Umstellung am 25.10.)
select lives_ok($$
  insert into public.blockers (teacher_id, title, start_date, weekdays, local_start, local_end, timezone)
  values ('00000000-0000-0000-0000-0000000000b1', 'Arbeit', '2026-10-19', '{1,2,3,4,5}', '08:00', '16:00', 'Europe/Zurich')
$$, 'Wiederkehrenden Blocker anlegen');

select is(
  (select count(*)::int from public.blocker_occurrences('00000000-0000-0000-0000-0000000000b1', '2026-10-19 00:00+02', '2026-11-02 00:00+01')),
  10, 'Zwei Wochen Mo–Fr = 10 Vorkommen, Wochenende frei');
select results_eq(
  $$select start_at from public.blocker_occurrences('00000000-0000-0000-0000-0000000000b1', '2026-10-23 00:00+02', '2026-10-27 00:00+01')$$,
  $$values ('2026-10-23 06:00+00'::timestamptz), ('2026-10-26 07:00+00')$$,
  'Wanduhrzeit 08:00 bleibt über die Zeitumstellung');
select is(
  (select count(*)::int from public.blocker_occurrences('00000000-0000-0000-0000-0000000000b1', '2026-10-18 00:00+02', '2026-10-19 00:00+02')),
  0, 'Vor dem Startdatum keine Vorkommen');

select throws_ok($$
  insert into public.blockers (teacher_id, title, start_date, weekdays, local_start, local_end, timezone)
  values ('00000000-0000-0000-0000-0000000000b1', 'Falsch', '2026-10-19', '{1}', '16:00', '08:00', 'Europe/Zurich')
$$, '23514', null, 'Ende muss nach Beginn liegen');

select results_eq(
  $$select kind, label from public.check_conflicts('00000000-0000-0000-0000-0000000000b1',
      array['2026-10-20 13:00+00']::timestamptz[], array['2026-10-20 14:30+00']::timestamptz[])$$,
  $$values ('blocker'::text, 'Arbeit'::text)$$,
  'Termin im Blocker → Warnung „blocker“ mit Titel');
select is_empty(
  $$select * from public.check_conflicts('00000000-0000-0000-0000-0000000000b1',
      array['2026-10-20 16:00+00']::timestamptz[], array['2026-10-20 17:00+00']::timestamptz[])$$,
  'Nach Feierabend (18:00 Zürich) kein Konflikt');

-- Schülerin sieht keine Blocker
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select is((select count(*)::int from public.blockers), 0, 'Schüler sehen keine Blocker');

-- Andere Lehrkraft auch nicht
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select is((select count(*)::int from public.blocker_occurrences('00000000-0000-0000-0000-0000000000b1', '2026-10-19 00:00+02', '2026-11-02 00:00+01')),
  0, 'Fremde Lehrkräfte sehen keine Blocker');

select * from finish();
rollback;
