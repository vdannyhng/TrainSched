-- Security-Baseline (SDLC Gate G2): strukturelle Regeln, die für JEDE neue Tabelle/Funktion gelten.
-- Schlägt fehl, sobald jemand RLS vergisst, anon Rechte gibt oder Schreibrechte unbemerkt erweitert.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

select is_empty(
  $$select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity$$,
  'Jede Tabelle in public hat Row Level Security');

select is_empty(
  $$select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and c.relname <> 'notification_outbox'
       and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)$$,
  'Jede Tabelle hat mindestens eine Policy (Ausnahme: Outbox, nur Server)');

select is_empty(
  $$select table_name from information_schema.role_table_grants
     where grantee = 'anon' and table_schema = 'public'$$,
  'anon hat keinerlei Tabellenrechte');

select is_empty(
  $$select n.nspname || '.' || p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private') and has_function_privilege('anon', p.oid, 'EXECUTE')$$,
  'anon darf keine Funktion ausführen');

select is_empty(
  $$select n.nspname || '.' || p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private') and p.prosecdef
       and not coalesce(array_to_string(p.proconfig, ',') like '%search_path=%', false)$$,
  'Jede security-definer-Funktion hat einen festen search_path');

select is(
  array(select p.proname::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and not has_function_privilege('authenticated', p.oid, 'EXECUTE')
         order by 1),
  array['attachment_objects', 'claim_push_batch', 'complete_invitation', 'find_open_invitation',
        'register_invite_attempt'],
  'Server-Funktionen sind für angemeldete Nutzer gesperrt');

-- Schreibrechte von authenticated: Änderungen an dieser Liste sind eine bewusste Security-Entscheidung
select is(
  array(select c.relname::text || ':' || string_agg(pr, ',' order by pr)
          from pg_class c join pg_namespace n on n.oid = c.relnamespace
          cross join lateral unnest(array['DELETE', 'INSERT', 'UPDATE']) as pr
         where n.nspname = 'public' and c.relkind = 'r'
           and (has_table_privilege('authenticated', c.oid, pr)
                or (pr <> 'DELETE' and has_any_column_privilege('authenticated', c.oid, pr)))
         group by c.relname order by 1),
  array['attachments:DELETE,INSERT,UPDATE', 'blockers:DELETE,INSERT,UPDATE', 'homework:DELETE,INSERT,UPDATE',
        'lesson_participants:DELETE,INSERT,UPDATE', 'lesson_series:DELETE,INSERT,UPDATE', 'lesson_tags:DELETE,INSERT',
        'lessons:DELETE,INSERT,UPDATE', 'notes:DELETE,INSERT,UPDATE', 'profiles:UPDATE',
        'series_participants:DELETE,INSERT', 'series_tags:DELETE,INSERT', 'student_tags:DELETE,INSERT',
        'students:DELETE,INSERT,UPDATE', 'tags:DELETE,INSERT,UPDATE', 'teacher_settings:UPDATE'],
  'Schreibrechte entsprechen der freigegebenen Liste (Anfragen, Tokens, Outbox, Verlauf nur über RPC/Server)');

select is((select public from storage.buckets where id = 'attachments'), false, 'Datei-Bucket ist privat');

select is_empty(
  $$select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'v'
       and not coalesce(array_to_string(c.reloptions, ',') like '%security_invoker=true%', false)$$,
  'Views laufen mit den Rechten des Aufrufers (security_invoker)');

select * from finish();
rollback;
