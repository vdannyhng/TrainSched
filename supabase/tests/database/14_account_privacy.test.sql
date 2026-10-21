-- Konto löschen (Plan + Rechte), verwaiste Dateien, Benachrichtigung, Datenexport
begin;
create extension if not exists pgtap with schema extensions;
delete from auth.users;
select plan(17);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.local', '{"role":"admin"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 't1@test.local', '{"role":"teacher"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 't2@test.local', '{"role":"teacher"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 's1@test.local', '{"role":"student"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 's2@test.local', '{"role":"student"}', now(), now());

insert into public.students (id, teacher_id, profile_id, first_name) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'Hương'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b1', null, 'Jonas'),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c2', 'Mai');

insert into public.lessons (id, teacher_id, start_at, end_at, timezone) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b1', now() + interval '1 day', now() + interval '1 day 1 hour', 'Europe/Zurich');
insert into public.lesson_participants (lesson_id, student_id) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1');
insert into public.notes (teacher_id, lesson_id, body, visibility) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000e1', 'Für Hương', 'student'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000e1', 'Nur Lehrer', 'teacher');

-- Dateien: eine mit Metadaten, eine verwaiste
insert into storage.objects (bucket_id, name) values
  ('attachments', '00000000-0000-0000-0000-0000000000b1/keep.pdf'),
  ('attachments', '00000000-0000-0000-0000-0000000000b1/orphan.pdf'),
  ('attachments', '00000000-0000-0000-0000-0000000000b2/other.pdf');
insert into public.attachments (teacher_id, student_id, storage_path, original_name, mime_type, size_bytes) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1',
   '00000000-0000-0000-0000-0000000000b1/keep.pdf', 'keep.pdf', 'application/pdf', 10);

-- ---------------------------------------------------------------- Plan
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select is(public.account_deletion_plan(),
  '{"mode": "student_self", "user_ids": ["00000000-0000-0000-0000-0000000000c1"], "student_ids": [], "teacher_folder": null}'::jsonb,
  'Schülerin: nur das eigene Login');
select throws_ok($$select public.account_deletion_plan('00000000-0000-0000-0000-0000000000d2')$$,
  'P0002', 'not_found', 'Schülerin kann keine anderen Schüler löschen');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select is(public.account_deletion_plan('00000000-0000-0000-0000-0000000000d1')->'user_ids',
  '["00000000-0000-0000-0000-0000000000c1"]'::jsonb, 'Lehrkraft löscht Schülerin samt Login');
select is(public.account_deletion_plan('00000000-0000-0000-0000-0000000000d2')->'user_ids',
  '[]'::jsonb, 'Schüler ohne App-Zugang: kein Login zu löschen');
select throws_ok($$select public.account_deletion_plan('00000000-0000-0000-0000-0000000000d3')$$,
  'P0002', 'not_found', 'Fremde Schüler sind tabu');
select results_eq(
  $$select p->>'mode', p->'user_ids', jsonb_array_length(p->'student_ids'), p->>'teacher_folder'
      from (select public.account_deletion_plan() as p) x$$,
  $$values ('teacher_self', '["00000000-0000-0000-0000-0000000000c1", "00000000-0000-0000-0000-0000000000b1"]'::jsonb, 2,
            '00000000-0000-0000-0000-0000000000b1')$$,
  'Lehrkraft selbst: alle eigenen Schüler, deren Logins und zuletzt das eigene');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select throws_ok($$select public.account_deletion_plan()$$, 'P0001', 'admin_cannot_delete', 'Admin kann sich nicht selbst löschen');
select is(public.account_deletion_plan('00000000-0000-0000-0000-0000000000d3')->>'mode', 'student',
  'Admin darf Schüler aller Lehrkräfte löschen');

select set_config('request.jwt.claims', '{}', true);
select throws_ok($$select public.account_deletion_plan()$$, '42501', 'forbidden', 'Ohne Login nichts');

-- ---------------------------------------------------------------- Dateien
select throws_ok($$select public.attachment_objects('00000000-0000-0000-0000-0000000000b1', true)$$,
  '42501', null, 'Dateiliste nur für den Server');
reset role;
select results_eq($$select public.attachment_objects('00000000-0000-0000-0000-0000000000b1', true)$$,
  $$values ('00000000-0000-0000-0000-0000000000b1/orphan.pdf'::text)$$, 'Nur verwaiste Dateien im eigenen Ordner');
select is((select count(*)::int from public.attachment_objects('00000000-0000-0000-0000-0000000000b1', false)),
  2, 'Alle Dateien im Ordner (für die Konto-Löschung der Lehrkraft)');

-- ---------------------------------------------------------------- Benachrichtigung
delete from auth.users where id = '00000000-0000-0000-0000-0000000000c1';
select is((select profile_id from public.students where id = '00000000-0000-0000-0000-0000000000d1'), null,
  'Schülerdatensatz bleibt, nur ohne App-Zugang');
select results_eq(
  $$select user_id, payload->>'student_name' from public.notification_outbox where kind = 'account_deleted'$$,
  $$values ('00000000-0000-0000-0000-0000000000b1'::uuid, 'Hương')$$,
  'Lehrkraft wird über das gelöschte Konto informiert');

-- ---------------------------------------------------------------- Export
update public.students set profile_id = null where id = '00000000-0000-0000-0000-0000000000d3';
update public.students set profile_id = '00000000-0000-0000-0000-0000000000c2' where id = '00000000-0000-0000-0000-0000000000d1';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
create temp table ex as select public.export_my_data() as j;
select results_eq(
  $$select j->'profile'->>'email', jsonb_array_length(j->'students'), jsonb_array_length(j->'lessons'),
           jsonb_array_length(j->'notes'), j->'notes'->0->>'body' from ex$$,
  $$values ('s2@test.local', 1, 1, 1, 'Für Hương')$$,
  'Export enthält nur, was die Schülerin sehen darf (keine Lehrernotiz)');
select is((select jsonb_array_length(j->'teacher_settings') + jsonb_array_length(j->'blockers') from ex), 0,
  'Keine Lehrer-Einstellungen oder Blocker im Schüler-Export');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select is((select jsonb_array_length(public.export_my_data()->'students')), 1, 'Lehrkraft exportiert nur eigene Schüler');

select * from finish();
rollback;
