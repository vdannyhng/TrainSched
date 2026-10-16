-- Anfragen: RLS, Validierung, Statusübergänge, Wirkung auf Termine, Outbox-Einträge
begin;
create extension if not exists pgtap with schema extensions;
delete from auth.users;
select plan(32);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 't1@test.local', '{"role":"teacher"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 't2@test.local', '{"role":"teacher"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 's1@test.local', '{"role":"student"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 's2@test.local', '{"role":"student"}', now(), now());

insert into public.students (id, teacher_id, profile_id, first_name) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'Hương'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c2', 'Jonas');

-- L1: Einzel in 3 Tagen, L2: Gruppe in 5 Tagen, L3: Einzel in 2 Stunden (Absagefrist 24 h unterschritten)
insert into public.lessons (id, teacher_id, start_at, end_at, timezone) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b1', now() + interval '3 days', now() + interval '3 days 90 minutes', 'Europe/Zurich'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000b1', now() + interval '5 days', now() + interval '5 days 1 hour', 'Europe/Zurich'),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000b1', now() + interval '2 hours', now() + interval '3 hours', 'Europe/Zurich');
insert into public.lesson_participants (lesson_id, student_id) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000d2'),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000d1');

set local role authenticated;

-- ---------------------------------------------------------------- Schüler stellt Anfragen
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);

select lives_ok(
  $$select public.create_lesson_request('00000000-0000-0000-0000-0000000000e1', 'reschedule', ' Bin krank ',
      array[date_trunc('minute', now()) + interval '6 days', date_trunc('minute', now()) + interval '4 days'])$$,
  'Schülerin fragt Verschieben mit 2 Slots an');
select results_eq(
  $$select message, is_late, cardinality(proposed_starts), proposed_starts[1] < proposed_starts[2]
      from public.lesson_requests where lesson_id = '00000000-0000-0000-0000-0000000000e1'$$,
  $$values ('Bin krank', false, 2, true)$$,
  'Nachricht getrimmt, nicht verspätet, Slots sortiert');
select throws_ok(
  $$select public.create_lesson_request('00000000-0000-0000-0000-0000000000e1', 'cancel', null, null)$$,
  'P0001', 'request_pending', 'Nur eine offene Anfrage pro Termin');
select throws_ok(
  $$select public.create_lesson_request('00000000-0000-0000-0000-0000000000e2', 'reschedule', null, '{}')$$,
  'P0001', 'invalid_slots', 'Verschieben braucht mindestens einen Slot');
select throws_ok(
  $$select public.create_lesson_request('00000000-0000-0000-0000-0000000000e2', 'reschedule', null,
      array[now() + interval '1 day', now() + interval '2 days', now() + interval '3 days', now() + interval '4 days'])$$,
  'P0001', 'invalid_slots', 'Höchstens 3 Slots');
select throws_ok(
  $$select public.create_lesson_request('00000000-0000-0000-0000-0000000000e2', 'reschedule', null, array[now() - interval '1 hour'])$$,
  'P0001', 'invalid_slots', 'Keine Slots in der Vergangenheit');
select throws_ok(
  $$select public.create_lesson_request('00000000-0000-0000-0000-0000000000e2', 'cancel', null, array[now() + interval '1 day'])$$,
  'P0001', 'invalid_slots', 'Absage ohne Slots');
select lives_ok(
  $$select public.create_lesson_request('00000000-0000-0000-0000-0000000000e3', 'cancel', 'Zug fällt aus', null)$$,
  'Kurzfristige Absage-Anfrage ist möglich');
select is((select is_late from public.lesson_requests where lesson_id = '00000000-0000-0000-0000-0000000000e3'),
  true, 'Unterschrittene Absagefrist wird markiert');
select throws_ok(
  $$insert into public.lesson_requests (lesson_id, student_id, teacher_id, kind)
    values ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'cancel')$$,
  '42501', null, 'Kein direktes Einfügen');
select throws_ok(
  $$select public.decide_lesson_request((select id from public.lesson_requests where lesson_id = '00000000-0000-0000-0000-0000000000e1'), true, null, null)$$,
  'P0002', 'not_found', 'Schülerin kann nicht entscheiden');

select is(public.lesson_cancel_deadline('00000000-0000-0000-0000-0000000000e2'), now() + interval '4 days',
  'Teilnehmende sehen die Absagefrist (Standard 24 h)');

-- ---------------------------------------------------------------- Sichtbarkeit
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
select is(public.lesson_cancel_deadline('00000000-0000-0000-0000-0000000000e1'), null, 'Fremde Termine: keine Frist');
select is_empty($$select 1 from public.lesson_requests$$, 'Anderer Schüler sieht fremde Anfragen nicht');
select throws_ok(
  $$select public.create_lesson_request('00000000-0000-0000-0000-0000000000e1', 'cancel', null, null)$$,
  'P0002', 'not_found', 'Nur Teilnehmende können anfragen');
select throws_ok(
  $$select public.withdraw_lesson_request((select id from public.lesson_requests limit 1))$$,
  'P0002', 'not_found', 'Fremde Anfrage kann nicht zurückgezogen werden');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select is_empty($$select 1 from public.lesson_requests$$, 'Fremder Lehrer sieht nichts');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select is((select count(*)::int from public.lesson_requests where status = 'pending'), 2, 'Lehrer sieht offene Anfragen');

-- ---------------------------------------------------------------- Lehrer entscheidet: Verschieben
select throws_ok(
  $$select public.decide_lesson_request((select id from public.lesson_requests where lesson_id = '00000000-0000-0000-0000-0000000000e1'),
      true, now() + interval '10 days', null)$$,
  'P0001', 'invalid_slots', 'Nur vorgeschlagene Slots wählbar');
select lives_ok(
  $$select public.decide_lesson_request((select id from public.lesson_requests where lesson_id = '00000000-0000-0000-0000-0000000000e1'),
      true, date_trunc('minute', now()) + interval '4 days', 'Passt!')$$,
  'Lehrer nimmt Slot an');
select results_eq(
  $$select start_at = date_trunc('minute', now()) + interval '4 days', end_at - start_at from public.lessons where id = '00000000-0000-0000-0000-0000000000e1'$$,
  $$values (true, interval '90 minutes')$$,
  'Termin verschoben, Dauer bleibt');
select results_eq(
  $$select status::text, response, chosen_start = date_trunc('minute', now()) + interval '4 days' from public.lesson_requests where lesson_id = '00000000-0000-0000-0000-0000000000e1'$$,
  $$values ('accepted', 'Passt!', true)$$,
  'Anfrage angenommen mit Antwort');
select throws_ok(
  $$select public.decide_lesson_request((select id from public.lesson_requests where lesson_id = '00000000-0000-0000-0000-0000000000e1'), false, null, null)$$,
  'P0001', 'request_closed', 'Entschiedene Anfrage ist abgeschlossen');

-- ---------------------------------------------------------------- Absagen: Einzel vs. Gruppe
select lives_ok(
  $$select public.decide_lesson_request((select id from public.lesson_requests where lesson_id = '00000000-0000-0000-0000-0000000000e3'), true, null, null)$$,
  'Lehrer nimmt Einzel-Absage an');
select results_eq(
  $$select status::text, cancelled_by, cancel_reason from public.lessons where id = '00000000-0000-0000-0000-0000000000e3'$$,
  $$values ('cancelled', '00000000-0000-0000-0000-0000000000c1'::uuid, 'Zug fällt aus')$$,
  'Einzeltermin abgesagt, Grund aus der Anfrage');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
select public.create_lesson_request('00000000-0000-0000-0000-0000000000e2', 'cancel', null, null);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select public.decide_lesson_request((select id from public.lesson_requests where lesson_id = '00000000-0000-0000-0000-0000000000e2'), true, null, null);
select results_eq(
  $$select l.status::text, lp.attendance::text from public.lessons l
      join public.lesson_participants lp on lp.lesson_id = l.id and lp.student_id = '00000000-0000-0000-0000-0000000000d2'
     where l.id = '00000000-0000-0000-0000-0000000000e2'$$,
  $$values ('scheduled', 'excused')$$,
  'Gruppentermin bleibt, nur der Schüler ist entschuldigt');

-- ---------------------------------------------------------------- Zurückziehen und Ablehnen
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select public.create_lesson_request('00000000-0000-0000-0000-0000000000e2', 'cancel', null, null);
select lives_ok(
  $$select public.withdraw_lesson_request((select id from public.lesson_requests where lesson_id = '00000000-0000-0000-0000-0000000000e2' and status = 'pending'))$$,
  'Schülerin zieht eigene Anfrage zurück');
select public.create_lesson_request('00000000-0000-0000-0000-0000000000e2', 'reschedule', null, array[now() + interval '8 days']);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select lives_ok(
  $$select public.decide_lesson_request((select id from public.lesson_requests where lesson_id = '00000000-0000-0000-0000-0000000000e2' and status = 'pending'),
      false, null, 'Leider nicht möglich')$$,
  'Lehrer lehnt ab');
select is((select start_at > now() + interval '4 days 23 hours' from public.lessons where id = '00000000-0000-0000-0000-0000000000e2'),
  true, 'Ablehnen lässt den Termin unverändert');

-- ---------------------------------------------------------------- Outbox
reset role;
select is((select count(*)::int from public.notification_outbox where kind = 'request_new' and user_id = '00000000-0000-0000-0000-0000000000b1'),
  5, 'Lehrer bekommt pro neuer Anfrage eine Nachricht');
select results_eq(
  $$select (payload->>'accepted')::boolean from public.notification_outbox
     where kind = 'request_decided' and user_id = '00000000-0000-0000-0000-0000000000c1' order by id$$,
  $$values (true), (true), (false)$$,
  'Schülerin bekommt Entscheidungen (angenommen, angenommen, abgelehnt), nicht fürs Zurückziehen');
select is_empty(
  $$select 1 from public.notification_outbox where kind in ('lesson_moved', 'lesson_cancelled') and user_id = '00000000-0000-0000-0000-0000000000c1'$$,
  'Keine doppelte „verschoben/abgesagt“-Nachricht an die anfragende Person');

select * from finish();
rollback;
