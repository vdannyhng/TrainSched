-- Brute-Force-Schutz für Einladungscodes
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

set local role authenticated;
select throws_ok($$select public.register_invite_attempt('1.2.3.4')$$, '42501', null, 'Nur der Server darf zählen');

reset role;
select is((select bool_and(public.register_invite_attempt('1.2.3.4')) from generate_series(1, 10)), true,
  '10 Versuche in 15 Minuten sind erlaubt');
select is(public.register_invite_attempt('1.2.3.4'), false, 'Der 11. Versuch wird abgelehnt');
select is(public.register_invite_attempt('5.6.7.8'), true, 'Andere Adressen sind nicht betroffen');
select is((select count(*)::int from private.invite_attempts where client_hash like '%1.2.3.4%'), 0,
  'Adressen werden nur gehasht gespeichert');

select throws_ok(
  $$insert into public.lessons (teacher_id, start_at, end_at, timezone, meeting_url)
    values (gen_random_uuid(), now(), now() + interval '1 hour', 'Europe/Zurich', 'javascript:alert(1)')$$,
  '23514', null, 'Online-Raum-Links nur http(s)');

select * from finish();
rollback;
