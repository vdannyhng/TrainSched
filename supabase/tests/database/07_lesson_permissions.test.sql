-- Wer darf Termine anlegen? Admin, Lehrer, Schüler (Regressionstest)
begin;
create extension if not exists pgtap with schema extensions;
delete from auth.users;
select plan(8);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.local', '{"role":"admin"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 't1@test.local', '{"role":"teacher"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 's1@test.local', '{"role":"student"}', now(), now());

insert into public.students (id, teacher_id, profile_id, first_name) values
  ('00000000-0000-0000-0000-0000000000da', '00000000-0000-0000-0000-0000000000a1', null, 'Eigener Admin-Schüler'),
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'Hương');

set local role authenticated;

-- Admin
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok($$select public.create_lesson('00000000-0000-0000-0000-0000000000a1', '2026-11-02 09:00+00', '2026-11-02 10:00+00',
  'Europe/Zurich', null, 'online', null, null, null, array['00000000-0000-0000-0000-0000000000da']::uuid[], '{}')$$,
  'Admin legt Termin für eigenen Schüler an');
select lives_ok($$select public.create_lesson('00000000-0000-0000-0000-0000000000b1', '2026-11-02 11:00+00', '2026-11-02 12:00+00',
  'Europe/Zurich', null, 'online', null, null, null, array['00000000-0000-0000-0000-0000000000d1']::uuid[], '{}')$$,
  'Admin plant für Schülerin eines anderen Lehrers (Termin gehört diesem Lehrer)');
select throws_ok($$select public.create_lesson('00000000-0000-0000-0000-0000000000a1', '2026-11-02 13:00+00', '2026-11-02 14:00+00',
  'Europe/Zurich', null, 'online', null, null, null, array['00000000-0000-0000-0000-0000000000d1']::uuid[], '{}')$$,
  'P0001', 'participants_other_teacher', 'Termin-Lehrer ≠ Lehrer der Schülerin → klare Meldung');
select throws_ok($$select public.create_lesson('00000000-0000-0000-0000-0000000000a1', '2026-11-02 15:00+00', '2026-11-02 16:00+00',
  'Europe/Zurich', null, 'online', null, null, null,
  array['00000000-0000-0000-0000-0000000000da', '00000000-0000-0000-0000-0000000000d1']::uuid[], '{}')$$,
  'P0001', 'participants_other_teacher', 'Schüler verschiedener Lehrer nicht mischbar');
select lives_ok($$select * from public.create_lesson_series('00000000-0000-0000-0000-0000000000b1', 'weekly', '2026-11-03', '2026-11-17',
  '18:00', 60, 'Europe/Zurich', null, 'online', null, null, null, array['00000000-0000-0000-0000-0000000000d1']::uuid[], '{}')$$,
  'Admin legt Serie für Lehrer T1 an');

-- Lehrer
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select lives_ok($$select public.create_lesson('00000000-0000-0000-0000-0000000000b1', '2026-11-04 09:00+00', '2026-11-04 10:00+00',
  'Europe/Zurich', null, 'in_person', 'Raum 1', null, 'A2', array['00000000-0000-0000-0000-0000000000d1']::uuid[], '{}')$$,
  'Lehrer legt Termin für eigene Schülerin an');

-- Schüler
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select throws_ok($$select public.create_lesson('00000000-0000-0000-0000-0000000000b1', '2026-11-05 09:00+00', '2026-11-05 10:00+00',
  'Europe/Zurich', null, 'online', null, null, null, array['00000000-0000-0000-0000-0000000000d1']::uuid[], '{}')$$,
  '42501', null, 'Schüler können keine Termine anlegen');
select throws_ok($$select * from public.create_lesson_series('00000000-0000-0000-0000-0000000000b1', 'weekly', '2026-11-05', null,
  '09:00', 60, 'Europe/Zurich', null, 'online', null, null, null, array['00000000-0000-0000-0000-0000000000d1']::uuid[], '{}')$$,
  '42501', null, 'Schüler können keine Serien anlegen');

select * from finish();
rollback;
