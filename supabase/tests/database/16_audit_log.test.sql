-- Admin-Protokoll: Trigger schreiben mit Auslöser, nur Admins lesen, niemand schreibt direkt
begin;
create extension if not exists pgtap with schema extensions;
delete from auth.users;
select plan(9);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.local', '{"role":"admin"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 't1@test.local', '{"role":"teacher"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 's1@test.local', '{"role":"student"}', now(), now());
insert into public.students (id, teacher_id, profile_id, first_name) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'Hương'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b1', null, 'Jonas');
delete from public.audit_log;

set local role authenticated;

-- Lehrkraft: Schülerin pausieren, Einladung erstellen und widerrufen, Schüler löschen
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select public.set_access_paused('00000000-0000-0000-0000-0000000000c1', true);
select public.set_access_paused('00000000-0000-0000-0000-0000000000c1', false);
select public.create_student_invitation('00000000-0000-0000-0000-0000000000d2');
select public.revoke_invitation((select id from public.invitations where student_id = '00000000-0000-0000-0000-0000000000d2'));
delete from public.students where id = '00000000-0000-0000-0000-0000000000d2';

select is_empty($$select 1 from public.audit_log$$, 'Lehrkraft sieht das Protokoll nicht');
select throws_ok(
  $$insert into public.audit_log (action, target_type) values ('access_paused', 'profile')$$,
  '42501', null, 'Niemand schreibt direkt ins Protokoll');

-- Admin liest
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select results_eq(
  $$select action, target_type, actor_id from public.audit_log order by id$$,
  $$values ('access_paused', 'profile', '00000000-0000-0000-0000-0000000000b1'::uuid),
           ('access_resumed', 'profile', '00000000-0000-0000-0000-0000000000b1'::uuid),
           ('invitation_created', 'invitation', '00000000-0000-0000-0000-0000000000b1'::uuid),
           ('invitation_revoked', 'invitation', '00000000-0000-0000-0000-0000000000b1'::uuid),
           ('student_deleted', 'student', '00000000-0000-0000-0000-0000000000b1'::uuid)$$,
  'Admin sieht alle Verwaltungsaktionen mit Auslöser');
select is((select details->>'had_login' from public.audit_log where action = 'student_deleted'), 'false',
  'Löschung vermerkt, ob ein App-Zugang bestand');
select is((select details ? 'first_name' from public.audit_log where action = 'student_deleted'), false,
  'Keine Namen im Protokoll (nur IDs)');
select throws_ok($$delete from public.audit_log$$, '42501', null, 'Auch der Admin kann nichts löschen');
select throws_ok($$update public.audit_log set action = 'x'$$, '42501', null, 'Auch der Admin kann nichts ändern');

-- Rollenwechsel (z. B. bootstrap_admin) und eingelöste Einladung
reset role;
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000b1';
select results_eq(
  $$select details->>'from', details->>'to' from public.audit_log where action = 'role_changed'$$,
  $$values ('teacher', 'admin')$$, 'Rollenwechsel wird protokolliert');
select is((select count(*)::int from cron.job where jobname = 'trainsched-audit-retention'), 1, 'Aufbewahrung 12 Monate per Cron');

select * from finish();
rollback;
