-- RLS für Themen-Tags, Schüler-Tags und Notizen (M2)
begin;
create extension if not exists pgtap with schema extensions;
-- Unabhängig von Seed-Daten testen (wird am Ende zurückgerollt).
delete from auth.users;
select plan(21);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher1@test.local', '{"role":"teacher"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher2@test.local', '{"role":"teacher"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student1@test.local', '{"role":"student"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student2@test.local', '{"role":"student"}', now(), now());

insert into public.students (id, teacher_id, profile_id, first_name)
values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'Hương'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c2', 'Jonas'),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000b2', null, 'Fremd');

select is((select count(*)::int from public.tags where teacher_id = '00000000-0000-0000-0000-0000000000b1'), 5, 'neue Lehrer bekommen 5 Standard-Themen');

-- IDs der Fixture-Tags merken
create temporary table t (name text primary key, id uuid) on commit drop;
grant all on t to authenticated;
insert into t values
  ('t1_grammatik', (select id from public.tags where teacher_id = '00000000-0000-0000-0000-0000000000b1' and label = 'Grammatik')),
  ('t1_alltag',    (select id from public.tags where teacher_id = '00000000-0000-0000-0000-0000000000b1' and label = 'Alltag')),
  ('t2_grammatik', (select id from public.tags where teacher_id = '00000000-0000-0000-0000-0000000000b2' and label = 'Grammatik'));

insert into public.student_tags values ('00000000-0000-0000-0000-0000000000d1', (select id from t where name = 't1_grammatik'));
insert into public.notes (teacher_id, author_id, student_id, body, visibility) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', 'Für Hương sichtbar', 'student'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', 'Nur Lehrerin: Prüfungsangst', 'teacher'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d2', 'Für Jonas sichtbar', 'student');

-- ---------------------------------------------------------------------------
-- Lehrer T1
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);

select is((select count(*)::int from public.tags), 5, 'T1 sieht nur eigene Themen');
select lives_ok(
  $$insert into public.tags (teacher_id, label, color) values ('00000000-0000-0000-0000-0000000000b1', 'Lesen', '#123ABC')$$,
  'T1 legt ein Thema an');
select throws_ok(
  $$insert into public.tags (teacher_id, label, color) values ('00000000-0000-0000-0000-0000000000b1', ' grammatik ', '#123ABC')$$,
  '23505', null, 'Themen-Namen sind pro Lehrer eindeutig (ohne Gross/Klein, Leerzeichen)');
select throws_ok(
  $$insert into public.tags (teacher_id, label, color) values ('00000000-0000-0000-0000-0000000000b1', 'Farbe', 'red')$$,
  '23514', null, 'Farbe muss #RRGGBB sein');
select throws_ok(
  $$insert into public.tags (teacher_id, label, color) values ('00000000-0000-0000-0000-0000000000b2', 'Fremd', '#123ABC')$$,
  '42501', null, 'T1 kann keine Themen für T2 anlegen');
select lives_ok(
  $$insert into public.student_tags values ('00000000-0000-0000-0000-0000000000d1', (select id from t where name = 't1_alltag'))$$,
  'T1 ordnet eigenem Schüler ein eigenes Thema zu');
select throws_ok(
  $$insert into public.student_tags values ('00000000-0000-0000-0000-0000000000d1', (select id from t where name = 't2_grammatik'))$$,
  '42501', null, 'Thema von T2 kann nicht an Schüler von T1 hängen');
select throws_ok(
  $$insert into public.student_tags values ('00000000-0000-0000-0000-0000000000d3', (select id from t where name = 't1_alltag'))$$,
  '42501', null, 'T1 kann Schülern von T2 keine Themen zuordnen');
select is((select count(*)::int from public.notes), 3, 'T1 sieht alle Notizen eigener Schüler');
select throws_ok(
  $$insert into public.notes (teacher_id, student_id, body) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d3', 'x')$$,
  '42501', null, 'T1 kann keine Notiz an Schüler von T2 hängen');
insert into public.notes (teacher_id, student_id, body)
values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d2', 'Neue Notiz');
select is(
  (select author_id from public.notes where body = 'Neue Notiz'),
  '00000000-0000-0000-0000-0000000000b1'::uuid, 'author_id wird serverseitig gesetzt');

-- ---------------------------------------------------------------------------
-- Schüler S1 (Hương)
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);

select results_eq('select body from public.notes', $$values ('Für Hương sichtbar')$$, 'S1 sieht nur eigene, freigegebene Notizen');
select is((select count(*)::int from public.student_tags), 2, 'S1 sieht die eigenen Themen-Zuordnungen');
select is((select count(*)::int from public.tags), 2, 'S1 sieht nur ihr zugeordnete Themen');
select throws_ok(
  $$insert into public.student_tags values ('00000000-0000-0000-0000-0000000000d1', (select id from t where name = 't1_grammatik'))$$,
  '42501', null, 'S1 kann sich keine Themen zuordnen');
select throws_ok(
  $$insert into public.notes (teacher_id, student_id, body) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', 'x')$$,
  '42501', null, 'S1 kann keine Notizen schreiben');
select is_empty(
  $$update public.notes set visibility = 'student' returning 1$$,
  'S1 kann Sichtbarkeit von Notizen nicht ändern');
select is_empty(
  $$select * from public.student_invitation_status('00000000-0000-0000-0000-0000000000d1')$$,
  'S1 sieht keinen Einladungsstatus');

-- ---------------------------------------------------------------------------
-- Lehrer T2
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select is((select count(*)::int from public.notes), 0, 'T2 sieht keine Notizen von T1');
select is_empty(
  $$delete from public.tags where id = (select id from t where name = 't1_grammatik') returning 1$$,
  'T2 kann Themen von T1 nicht löschen');

select * from finish();
rollback;
