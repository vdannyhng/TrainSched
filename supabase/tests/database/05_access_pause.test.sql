-- Konten pausieren (M3-Zusatz)
begin;
create extension if not exists pgtap with schema extensions;
delete from auth.users;
select plan(14);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.local', '{"role":"admin"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 't1@test.local', '{"role":"teacher"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 't2@test.local', '{"role":"teacher"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 's1@test.local', '{"role":"student"}', now(), now());

insert into public.students (id, teacher_id, profile_id, first_name) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'Hương');
insert into public.notes (teacher_id, student_id, body, visibility) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', 'Sichtbar', 'student');

set local role authenticated;

-- T2 darf fremde Schüler nicht pausieren
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select throws_ok($$select public.set_access_paused('00000000-0000-0000-0000-0000000000c1', true)$$, '42501', null, 'T2 kann Schüler von T1 nicht pausieren');
select throws_ok($$select public.set_access_paused('00000000-0000-0000-0000-0000000000b1', true)$$, '42501', null, 'Lehrer können keine Lehrer pausieren');

-- S1 sieht vor der Pause ihre Daten
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select is((select count(*)::int from public.students), 1, 'S1 sieht ihren Schülerdatensatz (aktiv)');
select throws_ok($$select public.set_access_paused('00000000-0000-0000-0000-0000000000b1', true)$$, '42501', null, 'Schüler können niemanden pausieren');

-- T1 pausiert S1
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select lives_ok($$select public.set_access_paused('00000000-0000-0000-0000-0000000000c1', true)$$, 'T1 pausiert eigene Schülerin');
select isnt((select access_paused_at from public.profiles where id = '00000000-0000-0000-0000-0000000000c1'), null, 'T1 sieht den Pausenstatus');
select throws_ok($$select public.set_access_paused('00000000-0000-0000-0000-0000000000b1', true)$$, 'P0001', 'cannot_pause_self', 'Man kann sich nicht selbst pausieren');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000c1'), 1, 'Pausierte sieht ihr eigenes Profil (für den Hinweis)');
select is((select count(*)::int from public.students), 0, 'Pausierte sieht keinen Schülerdatensatz');
select is((select count(*)::int from public.notes), 0, 'Pausierte sieht keine Notizen');

-- Admin pausiert T1 → T1 sieht nichts mehr
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok($$select public.set_access_paused('00000000-0000-0000-0000-0000000000b1', true)$$, 'Admin pausiert Lehrer');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select is((select count(*)::int from public.students), 0, 'Pausierter Lehrer sieht keine Schüler');

-- Reaktivieren
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok($$select public.set_access_paused('00000000-0000-0000-0000-0000000000c1', false)$$, 'Admin reaktiviert Schülerin');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select is((select count(*)::int from public.notes), 1, 'Nach Reaktivierung sind die Daten wieder sichtbar');

select * from finish();
rollback;
