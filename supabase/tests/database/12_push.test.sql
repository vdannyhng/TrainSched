-- Push: Tokens (RLS, Gerätewechsel), Erinnerungsfenster, Dedupe, Event-Trigger, Batch-Claim
begin;
create extension if not exists pgtap with schema extensions;
delete from auth.users;
select plan(19);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 't1@test.local', '{"role":"teacher"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 's1@test.local', '{"role":"student"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 's2@test.local', '{"role":"student"}', now(), now());

update public.profiles set locale = 'vi', reminder_offsets_min = '{60}' where id = '00000000-0000-0000-0000-0000000000c1';
update public.profiles set display_name = 'Lehrer' where id = '00000000-0000-0000-0000-0000000000b1';
update public.profiles set reminder_offsets_min = '{1440,60}' where id in ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c2');

insert into public.students (id, teacher_id, profile_id, first_name) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'Hương'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c2', 'Jonas');

insert into public.lessons (id, teacher_id, start_at, end_at, timezone) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b1', '2030-01-10 10:00+00', '2030-01-10 11:00+00', 'Europe/Zurich');
insert into public.lesson_participants (lesson_id, student_id, attendance) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1', 'pending'),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d2', 'excused');

-- ---------------------------------------------------------------- Tokens
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select lives_ok($$select public.register_push_token('ExponentPushToken[abcdefgh1234]', 'ios')$$, 'Token registrieren');
select throws_ok($$select public.register_push_token('nicht-gültig', 'ios')$$, '23514', null, 'Ungültiges Token-Format');
select is((select count(*)::int from public.push_tokens), 1, 'Eigenes Token sichtbar');
select throws_ok($$delete from public.push_tokens$$, '42501', null, 'Kein direktes Löschen');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
select is_empty($$select 1 from public.push_tokens$$, 'Fremde Tokens unsichtbar');
select public.register_push_token('ExponentPushToken[abcdefgh1234]', 'android');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select is_empty($$select 1 from public.push_tokens$$, 'Gerätewechsel: Token gehört jetzt dem neuen Nutzer');
select public.register_push_token('ExponentPushToken[abcdefgh1234]', 'ios');
select public.unregister_push_token('ExponentPushToken[abcdefgh1234]');
select is_empty($$select 1 from public.push_tokens$$, 'Abmelden entfernt das Token');
select public.register_push_token('ExponentPushToken[abcdefgh1234]', 'ios');

-- ---------------------------------------------------------------- Erinnerungsfenster
reset role;
select is_empty($$select * from private.due_reminders('2030-01-10 08:49+00')$$, '71 min vorher: nichts fällig');
select results_eq(
  $$select user_id, offset_min from private.due_reminders('2030-01-10 09:00+00') order by user_id$$,
  $$values ('00000000-0000-0000-0000-0000000000b1'::uuid, 60), ('00000000-0000-0000-0000-0000000000c1'::uuid, 60)$$,
  '60 min vorher: Lehrer + Schülerin, nicht der entschuldigte Schüler');
select is((select count(*)::int from private.due_reminders('2030-01-10 09:09+00')), 2, 'Noch im 10-Minuten-Fenster');
select is_empty($$select * from private.due_reminders('2030-01-10 09:10:01+00')$$, 'Fenster vorbei');
select results_eq(
  $$select user_id, offset_min from private.due_reminders('2030-01-09 10:05+00')$$,
  $$values ('00000000-0000-0000-0000-0000000000b1'::uuid, 1440)$$,
  '24 h vorher: nur wer 24 h eingestellt hat');

select is(private.enqueue_reminders('2030-01-10 09:00+00'), 2, 'Erinnerungen in die Outbox');
select is(private.enqueue_reminders('2030-01-10 09:05+00'), 0, 'Zweiter Lauf erzeugt keine Doppelten');

update public.profiles set access_paused_at = now() where id = '00000000-0000-0000-0000-0000000000c1';
select is((select count(*)::int from private.due_reminders('2030-01-10 09:00+00')), 1, 'Pausierte Konten bekommen keine Erinnerung');
update public.profiles set access_paused_at = null where id = '00000000-0000-0000-0000-0000000000c1';

-- ---------------------------------------------------------------- Event-Trigger
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select public.reschedule_lesson('00000000-0000-0000-0000-0000000000e1', '2030-01-11 10:00+00', '2030-01-11 11:00+00');
reset role;
select results_eq(
  $$select user_id, payload->>'old_start' is not null from public.notification_outbox where kind = 'lesson_moved'$$,
  $$values ('00000000-0000-0000-0000-0000000000c1'::uuid, true)$$,
  'Verschieben benachrichtigt Teilnehmende, nicht den Handelnden und nicht Entschuldigte');

-- ---------------------------------------------------------------- Claim (nur service_role)
set local role authenticated;
select throws_ok($$select * from public.claim_push_batch(10)$$, '42501', null, 'Nutzer können die Outbox nicht abholen');
reset role;
select results_eq(
  $$select kind, locale::text, tokens, lesson_label from public.claim_push_batch(10)
     where kind = 'lesson_moved'$$,
  $$values ('lesson_moved', 'vi', array['ExponentPushToken[abcdefgh1234]'], 'Lehrer')$$,
  'Claim liefert Sprache, Tokens und Bezeichnung für den Empfänger');
select is_empty($$select * from public.claim_push_batch(10)$$, 'Reservierte Einträge werden nicht doppelt abgeholt');

select * from finish();
rollback;
