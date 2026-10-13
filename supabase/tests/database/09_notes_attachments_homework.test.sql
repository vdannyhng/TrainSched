-- M4: Termin-Notizen, Anhänge (inkl. Storage), Hausaufgaben, vorherige Stunde, Suche
begin;
create extension if not exists pgtap with schema extensions;
delete from auth.users;
select plan(25);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 't1@test.local', '{"role":"teacher"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 't2@test.local', '{"role":"teacher"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 's1@test.local', '{"role":"student"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 's2@test.local', '{"role":"student"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 's3@test.local', '{"role":"student"}', now(), now());

insert into public.students (id, teacher_id, profile_id, first_name) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'Hương'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c2', 'Jonas'),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c3', 'Mai');

create temporary table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);

insert into ids select 'first', public.create_lesson('00000000-0000-0000-0000-0000000000b1', '2026-11-02 09:00+00', '2026-11-02 10:00+00',
  'Europe/Zurich', null, 'online', null, null, null, array['00000000-0000-0000-0000-0000000000d1']::uuid[], '{}');
insert into ids select 'group', public.create_lesson('00000000-0000-0000-0000-0000000000b1', '2026-11-09 09:00+00', '2026-11-09 10:00+00',
  'Europe/Zurich', 'Gruppe', 'online', null, null, null,
  array['00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2']::uuid[], '{}');

-- Notizen am Termin
select lives_ok($$insert into public.notes (teacher_id, lesson_id, body, visibility) values
  ('00000000-0000-0000-0000-0000000000b1', (select id from ids where name = 'group'), 'Hausaufgabe: Artikel üben mit Hương', 'student'),
  ('00000000-0000-0000-0000-0000000000b1', (select id from ids where name = 'group'), 'Nur für mich: Jonas war unkonzentriert', 'teacher'),
  ('00000000-0000-0000-0000-0000000000b1', (select id from ids where name = 'first'), 'Erste Stunde: Alphabet', 'student')$$,
  'Lehrer schreibt Notizen am Termin');
select throws_ok($$insert into public.notes (teacher_id, body) values ('00000000-0000-0000-0000-0000000000b1', 'ohne Ziel')$$,
  '23514', null, 'Notiz braucht Termin oder Schüler');
select is(public.previous_lesson_id((select id from ids where name = 'group')), (select id from ids where name = 'first'),
  'Vorherige Stunde mit gemeinsamer Teilnehmerin wird gefunden');
select results_eq($$select body from public.search_notes('huong')$$, $$values ('Hausaufgabe: Artikel üben mit Hương')$$,
  'Suche ohne Diakritika findet „Hương“');
select is((select count(*)::int from public.search_notes('', '00000000-0000-0000-0000-0000000000d1')), 3,
  'Filter nach Schülerin: alle Notizen ihrer Termine');
select is((select count(*)::int from public.search_notes('art')), 1, 'Teilwort-Suche');

-- Hausaufgaben
select lives_ok($$insert into public.homework (teacher_id, lesson_id, student_id, title, due_date) values
  ('00000000-0000-0000-0000-0000000000b1', (select id from ids where name = 'group'), '00000000-0000-0000-0000-0000000000d1', 'Artikel-Übung', '2026-11-15'),
  ('00000000-0000-0000-0000-0000000000b1', (select id from ids where name = 'group'), '00000000-0000-0000-0000-0000000000d2', 'Artikel-Übung', '2026-11-15')$$,
  'Hausaufgaben für zwei Teilnehmende');

-- Anhänge + Storage
select lives_ok($$insert into storage.objects (bucket_id, name) values ('attachments', '00000000-0000-0000-0000-0000000000b1/tafel.jpg')$$,
  'Lehrer lädt in eigenen Ordner hoch');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('attachments', '00000000-0000-0000-0000-0000000000b2/fremd.jpg')$$,
  '42501', null, 'Lehrer kann nicht in fremden Ordner hochladen');
select lives_ok($$insert into public.attachments (teacher_id, lesson_id, visibility, storage_path, original_name, mime_type, size_bytes) values
  ('00000000-0000-0000-0000-0000000000b1', (select id from ids where name = 'group'), 'student', '00000000-0000-0000-0000-0000000000b1/tafel.jpg', 'Tafel.jpg', 'image/jpeg', 1200),
  ('00000000-0000-0000-0000-0000000000b1', (select id from ids where name = 'group'), 'teacher', '00000000-0000-0000-0000-0000000000b1/intern.pdf', 'intern.pdf', 'application/pdf', 900)$$,
  'Anhänge am Termin');
select throws_ok($$insert into public.attachments (teacher_id, lesson_id, storage_path, original_name, mime_type, size_bytes) values
  ('00000000-0000-0000-0000-0000000000b1', (select id from ids where name = 'group'), '00000000-0000-0000-0000-0000000000b2/x.jpg', 'x.jpg', 'image/jpeg', 1)$$,
  '23514', null, 'Pfad muss im eigenen Lehrer-Ordner liegen');

insert into storage.objects (bucket_id, name) values ('attachments', '00000000-0000-0000-0000-0000000000b1/verwaist.jpg');
select is((select count(*)::int from storage.objects where bucket_id = 'attachments'), 2,
  'Lehrer sieht auch Dateien ohne Metadaten im eigenen Ordner (sonst nicht löschbar)');

-- Schülerin Hương (Teilnehmerin)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select is((select count(*)::int from public.notes where lesson_id = (select id from ids where name = 'group')), 1,
  'Teilnehmerin sieht nur die freigegebene Termin-Notiz');
select is((select count(*)::int from public.attachments), 1, 'Teilnehmerin sieht nur freigegebene Anhänge');
select is((select count(*)::int from storage.objects where bucket_id = 'attachments'), 1,
  'Storage: nur Datei des sichtbaren Anhangs lesbar');
select is((select count(*)::int from public.homework), 1, 'Schülerin sieht nur eigene Hausaufgabe');
select lives_ok($$select public.set_homework_status((select id from public.homework limit 1), true)$$, 'Schülerin hakt ab');
select is((select status::text from public.homework limit 1), 'done', 'Status ist „erledigt“');
select is_empty($$update public.homework set title = 'geändert' returning 1$$, 'Schülerin kann Aufgabe nicht umschreiben');
select throws_ok($$insert into public.notes (teacher_id, lesson_id, body) values
  ('00000000-0000-0000-0000-0000000000b1', (select id from ids where name = 'group'), 'x')$$,
  '42501', null, 'Schülerin kann keine Notizen schreiben');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('attachments', '00000000-0000-0000-0000-0000000000b1/hack.jpg')$$,
  '42501', null, 'Schülerin kann nichts hochladen');

-- Jonas darf Hương's Aufgabe nicht abhaken
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
select throws_ok($$select public.set_homework_status(
    (select id from ids where name = 'group'), true)$$,
  'P0002', null, 'Fremde Hausaufgabe nicht abhakbar');

-- Mai (nicht im Gruppentermin) sieht nichts davon
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true);
select is((select count(*)::int from public.notes), 0, 'Nicht-Teilnehmerin sieht keine Termin-Notizen');
select is((select count(*)::int from public.attachments), 0, 'Nicht-Teilnehmerin sieht keine Anhänge');

-- Andere Lehrkraft
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select is((select count(*)::int from public.search_notes('')), 0, 'Fremde Lehrkraft findet keine Notizen');

select * from finish();
rollback;
