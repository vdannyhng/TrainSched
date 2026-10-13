-- Terminlogik (M3): Serien über DST, Konflikte, Ausnahmen, RLS
begin;
create extension if not exists pgtap with schema extensions;
delete from auth.users;
select plan(29);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 't1@test.local', '{"role":"teacher"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 't2@test.local', '{"role":"teacher"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 's1@test.local', '{"role":"student"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 's2@test.local', '{"role":"student"}', now(), now());

insert into public.students (id, teacher_id, profile_id, first_name, timezone) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'Hương', 'Asia/Ho_Chi_Minh'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c2', 'Jonas', 'Europe/Berlin'),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000b2', null, 'Fremd', 'Europe/Zurich');

create temporary table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);

-- ---------------------------------------------------------------------------
-- Serien & Sommerzeit
-- ---------------------------------------------------------------------------
-- Dienstags 18:00 Zürich, über die Umstellung am 29.03.2026
insert into ids select 'march', series_id from public.create_lesson_series(
  '00000000-0000-0000-0000-0000000000b1', 'weekly', '2026-03-17', '2026-04-07', '18:00', 60, 'Europe/Zurich',
  null, 'online', null, 'https://meet.example/abc', 'A2',
  array['00000000-0000-0000-0000-0000000000d1']::uuid[], '{}');

select results_eq(
  $$select start_at from public.lessons where series_id = (select id from ids where name = 'march') order by start_at$$,
  $$values ('2026-03-17 17:00+00'::timestamptz), ('2026-03-24 17:00+00'), ('2026-03-31 16:00+00'), ('2026-04-07 16:00+00')$$,
  'Wöchentliche Serie: UTC verschiebt sich mit der Sommerzeit (März)');
select is(
  (select count(*)::int from public.lessons
    where series_id = (select id from ids where name = 'march')
      and (start_at at time zone 'Europe/Zurich')::time = '18:00'),
  4, 'Wanduhrzeit in Zürich bleibt immer 18:00');
select is(
  (select count(*)::int from public.lesson_participants lp join public.lessons l on l.id = lp.lesson_id
    where l.series_id = (select id from ids where name = 'march')),
  4, 'Teilnehmer werden auf jedes Vorkommen übertragen');

insert into ids select 'october', series_id from public.create_lesson_series(
  '00000000-0000-0000-0000-0000000000b1', 'weekly', '2026-10-20', '2026-10-27', '10:00', 60, 'Europe/Zurich',
  null, 'in_person', 'Bahnhofstrasse 1', null, null, array['00000000-0000-0000-0000-0000000000d1']::uuid[], '{}');
select results_eq(
  $$select start_at from public.lessons where series_id = (select id from ids where name = 'october') order by start_at$$,
  $$values ('2026-10-20 08:00+00'::timestamptz), ('2026-10-27 09:00+00')$$,
  'Wöchentliche Serie über die Umstellung im Oktober');

insert into ids select 'biweekly', series_id from public.create_lesson_series(
  '00000000-0000-0000-0000-0000000000b1', 'biweekly', '2026-11-02', '2026-11-30', '16:00', 45, 'Europe/Zurich',
  'Gruppe', 'online', null, null, null,
  array['00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2']::uuid[], '{}');
select is(
  (select count(*)::int from public.lessons where series_id = (select id from ids where name = 'biweekly')),
  3, 'Zweiwöchentlich: 02.11., 16.11., 30.11.');
select is(
  (select end_at - start_at from public.lessons where series_id = (select id from ids where name = 'biweekly') limit 1),
  interval '45 minutes', 'Dauer wird übernommen');

select is(
  (select created from private.materialize_series((select id from ids where name = 'march'), '2026-12-31')),
  0, 'Materialisierung ist idempotent');

select is(
  (select count(*)::int from public.preview_series('2026-03-17', '2026-04-07', 'weekly', '18:00', 60, 'Europe/Zurich')),
  4, 'preview_series liefert dieselben Vorkommen wie die Materialisierung');

-- ---------------------------------------------------------------------------
-- Konflikte
-- ---------------------------------------------------------------------------
select throws_ok(
  $$select public.create_lesson('00000000-0000-0000-0000-0000000000b1', '2026-03-17 17:30+00', '2026-03-17 18:30+00',
     'Europe/Zurich', null, 'online', null, null, null, array['00000000-0000-0000-0000-0000000000d2']::uuid[], '{}')$$,
  '23P01', null, 'Überlappender Einzeltermin wird hart abgelehnt');

insert into ids select 'single', public.create_lesson('00000000-0000-0000-0000-0000000000b1',
  '2026-12-08 17:00+00', '2026-12-08 18:00+00', 'Europe/Zurich', null, 'in_person', null, null, null,
  array['00000000-0000-0000-0000-0000000000d2']::uuid[], '{}');
select is(
  (select skipped from public.create_lesson_series(
     '00000000-0000-0000-0000-0000000000b1', 'weekly', '2026-12-01', '2026-12-15', '18:00', 60, 'Europe/Zurich',
     null, 'online', null, null, null, array['00000000-0000-0000-0000-0000000000d1']::uuid[], '{}')),
  1, 'Serie überspringt das belegte Vorkommen (08.12.) und meldet es');

select results_eq(
  $$select kind from public.check_conflicts('00000000-0000-0000-0000-0000000000b1',
      array['2026-12-08 17:30+00', '2026-12-08 15:50+00', '2026-12-08 15:30+00']::timestamptz[],
      array['2026-12-08 18:30+00', '2026-12-08 16:50+00', '2026-12-08 16:30+00']::timestamptz[])
    order by range_index$$,
  $$values ('overlap'), ('buffer')$$,
  'check_conflicts: Überschneidung, Puffer (10 < 15 min), 30 min Abstand ist frei');

select lives_ok(
  $$select public.cancel_lesson((select id from ids where name = 'single'), 'Krank')$$,
  'Absagen mit Grund');
select is(
  (select status::text || '|' || cancel_reason from public.lessons where id = (select id from ids where name = 'single')),
  'cancelled|Krank', 'Absage wird mit Grund gespeichert');
insert into ids select 'replacement', public.create_lesson('00000000-0000-0000-0000-0000000000b1',
  '2026-12-08 17:00+00', '2026-12-08 18:00+00', 'Europe/Zurich', 'Ersatz', 'online', null, null, null,
  array['00000000-0000-0000-0000-0000000000d1']::uuid[], '{}');
select ok((select id from ids where name = 'replacement') is not null, 'Abgesagter Termin gibt den Slot frei');
select throws_ok(
  $$select public.restore_lesson((select id from ids where name = 'single'))$$,
  '23P01', null, 'Absage zurücknehmen scheitert, wenn der Slot inzwischen belegt ist');

-- ---------------------------------------------------------------------------
-- Ausnahmen & Serien ändern
-- ---------------------------------------------------------------------------
select lives_ok(
  $$select public.reschedule_lesson(
      (select id from public.lessons where series_id = (select id from ids where name = 'march') and start_at = '2026-03-24 17:00+00'),
      '2026-03-26 17:00+00', '2026-03-26 18:00+00')$$,
  'Einzelnes Vorkommen verschieben');
select is(
  (select is_exception from public.lessons where start_at = '2026-03-26 17:00+00'),
  true, 'Verschobenes Vorkommen ist eine Ausnahme');

select is(
  public.end_series((select id from public.lessons where series_id = (select id from ids where name = 'march') and start_at = '2026-03-31 16:00+00')),
  2, 'Serie beenden löscht die zwei künftigen Vorkommen');
select is(
  (select end_date from public.lesson_series where id = (select id from ids where name = 'march')),
  '2026-03-30'::date, 'Serienende ist der Tag vor dem gewählten Termin');
select is(
  (select count(*)::int from public.lessons where series_id = (select id from ids where name = 'march')),
  2, 'Frühere Vorkommen (inkl. Ausnahme) bleiben');

insert into ids select 'october_new', series_id from public.update_series_from(
  (select id from public.lessons where series_id = (select id from ids where name = 'october') and start_at = '2026-10-27 09:00+00'),
  '2026-10-27', '11:30', 60, 'weekly', null, 'in_person', 'Neuer Ort', null, null,
  array['00000000-0000-0000-0000-0000000000d1']::uuid[], '{}');
select results_eq(
  $$select start_at from public.lessons where series_id in (select id from ids where name like 'october%') order by start_at$$,
  $$values ('2026-10-20 08:00+00'::timestamptz), ('2026-10-27 10:30+00')$$,
  '„Diesen und folgende“: alter Termin bleibt, ab 27.10. neue Uhrzeit 11:30');

select lives_ok(
  $$select public.mark_lesson_held(
      (select id from public.lessons where series_id = (select id from ids where name = 'biweekly') order by start_at limit 1),
      '{"00000000-0000-0000-0000-0000000000d2":"excused"}')$$,
  'Als gehalten markieren');
select results_eq(
  $$select attendance::text from public.lesson_participants
     where lesson_id = (select id from public.lessons where series_id = (select id from ids where name = 'biweekly') order by start_at limit 1)
     order by student_id$$,
  $$values ('present'), ('excused')$$,
  'Anwesenheit: Standard „anwesend“, Ausnahmen übernommen');

select throws_ok(
  $$select public.create_lesson('00000000-0000-0000-0000-0000000000b1', '2027-01-05 10:00+00', '2027-01-05 11:00+00',
     'Europe/Zurich', null, 'online', null, null, null, array['00000000-0000-0000-0000-0000000000d3']::uuid[], '{}')$$,
  'P0001', 'participants_other_teacher', 'Schüler eines anderen Lehrers kann nicht teilnehmen');

-- ---------------------------------------------------------------------------
-- Schüler S1
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);

select is(
  (select count(*)::int from public.lessons l
    where not exists (select 1 from public.lesson_participants lp where lp.lesson_id = l.id and lp.student_id = '00000000-0000-0000-0000-0000000000d1')),
  0, 'S1 sieht nur Termine, an denen sie teilnimmt');
select is(
  (select count(*)::int from public.lesson_participants
    where lesson_id = (select id from public.lessons where title = 'Gruppe' order by start_at limit 1)),
  1, 'In Gruppenterminen sieht S1 nur den eigenen Teilnehmer-Eintrag');
select is((select count(*)::int from public.lesson_series), 0, 'S1 sieht keine Serien');
select throws_ok(
  $$select public.cancel_lesson((select id from public.lessons order by start_at desc limit 1), 'keine Lust')$$,
  'P0002', null, 'S1 kann keine Termine absagen');

-- ---------------------------------------------------------------------------
-- Lehrer T2
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select is((select count(*)::int from public.lessons), 0, 'T2 sieht keine Termine von T1');

select * from finish();
rollback;
