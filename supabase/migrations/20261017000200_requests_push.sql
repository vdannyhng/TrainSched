-- M5: Anfragen-Workflow (Schüler fragt Verschieben/Absagen an, Lehrer entscheidet)
-- und Push-Benachrichtigungen (Tokens, Outbox, Erinnerungen, Versand per Edge Function).
--
-- Ablauf Push: Trigger/Cron schreiben in notification_outbox → private.dispatch_push() stößt per
-- pg_net die Edge Function `send-push` an → diese holt Einträge mit claim_push_batch(), rendert
-- den Text in der Sprache des Empfängers und schickt ihn an den Expo Push Service.

create extension if not exists pg_net;

-- ---------------------------------------------------------------------------
-- Erinnerungs-Einstellungen (Minuten vor Termin, max. 7 Tage)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add constraint profiles_reminder_offsets_range
  check (5 <= all (reminder_offsets_min) and 10080 >= all (reminder_offsets_min));

-- ---------------------------------------------------------------------------
-- Anfragen
-- ---------------------------------------------------------------------------
create type public.request_kind as enum ('reschedule', 'cancel');
create type public.request_status as enum ('pending', 'accepted', 'declined', 'withdrawn');

create table public.lesson_requests (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  kind public.request_kind not null,
  message text check (char_length(message) <= 1000),
  proposed_starts timestamptz[] not null default '{}',
  is_late boolean not null default false,
  status public.request_status not null default 'pending',
  response text check (char_length(response) <= 1000),
  chosen_start timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  check (cardinality(proposed_starts) <= 3),
  check ((kind = 'reschedule') = (cardinality(proposed_starts) > 0))
);

-- Höchstens eine offene Anfrage pro Schüler und Termin
create unique index lesson_requests_one_pending_idx
  on public.lesson_requests (lesson_id, student_id) where status = 'pending';
create index lesson_requests_teacher_status_idx on public.lesson_requests (teacher_id, status, created_at desc);
create index lesson_requests_student_idx on public.lesson_requests (student_id, created_at desc);

alter table public.lesson_requests enable row level security;
revoke all on public.lesson_requests from anon, authenticated;
grant select on public.lesson_requests to authenticated;

-- Schreiben nur über die RPCs unten
create policy lesson_requests_select on public.lesson_requests
for select to authenticated
using (
  private.can_manage_teacher_data(teacher_id)
  or student_id in (select private.my_student_ids())
);

-- Schüler: Anfrage stellen
create function public.create_lesson_request(
  p_lesson_id uuid,
  p_kind public.request_kind,
  p_message text,
  p_proposed_starts timestamptz[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid;
  v_lesson public.lessons;
  v_deadline integer;
  v_slots timestamptz[] := coalesce(p_proposed_starts, '{}');
  v_id uuid;
begin
  if not private.is_active_user() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select lp.student_id into v_student_id
    from public.lesson_participants lp
    join public.students s on s.id = lp.student_id
   where lp.lesson_id = p_lesson_id and s.profile_id = (select auth.uid());
  if v_student_id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  select * into v_lesson from public.lessons where id = p_lesson_id;
  if v_lesson.status <> 'scheduled' or v_lesson.start_at <= now() then
    raise exception 'lesson_not_open' using errcode = 'P0001';
  end if;

  if p_kind = 'reschedule' then
    if cardinality(v_slots) not between 1 and 3
       or exists (select 1 from unnest(v_slots) s where s <= now())
       or (select count(distinct s) from unnest(v_slots) s) <> cardinality(v_slots) then
      raise exception 'invalid_slots' using errcode = 'P0001';
    end if;
  elsif cardinality(v_slots) > 0 then
    raise exception 'invalid_slots' using errcode = 'P0001';
  end if;

  select cancel_deadline_hours into v_deadline from public.teacher_settings where teacher_id = v_lesson.teacher_id;

  begin
    insert into public.lesson_requests (lesson_id, student_id, teacher_id, kind, message, proposed_starts,
                                        is_late, created_by)
    values (p_lesson_id, v_student_id, v_lesson.teacher_id, p_kind, nullif(btrim(p_message), ''),
            (select coalesce(array_agg(s order by s), '{}') from unnest(v_slots) s),
            v_lesson.start_at - now() < make_interval(hours => coalesce(v_deadline, 24)),
            (select auth.uid()))
    returning id into v_id;
  exception when unique_violation then
    raise exception 'request_pending' using errcode = 'P0001';
  end;
  return v_id;
end;
$$;

-- Schüler: eigene offene Anfrage zurückziehen
create function public.withdraw_lesson_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.lesson_requests
     set status = 'withdrawn', decided_at = now(), decided_by = (select auth.uid())
   where id = p_request_id
     and status = 'pending'
     and student_id in (select private.my_student_ids());
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
end;
$$;

-- Lehrer: annehmen (bei Verschieben mit gewähltem Slot) oder ablehnen.
-- Absage im Gruppentermin entschuldigt nur diese Person, der Termin bleibt.
create function public.decide_lesson_request(
  p_request_id uuid,
  p_accept boolean,
  p_chosen_start timestamptz,
  p_response text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.lesson_requests;
  v_lesson public.lessons;
  v_requester uuid;
begin
  select * into v_req from public.lesson_requests where id = p_request_id for update;
  if v_req.id is null or not private.can_manage_teacher_data(v_req.teacher_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'request_closed' using errcode = 'P0001';
  end if;

  if p_accept then
    select * into v_lesson from public.lessons where id = v_req.lesson_id for update;
    if v_lesson.status <> 'scheduled' then
      raise exception 'lesson_not_open' using errcode = 'P0001';
    end if;

    -- Die anfragende Person bekommt „Anfrage angenommen“ statt zusätzlich „Termin verschoben“
    select profile_id into v_requester from public.students where id = v_req.student_id;
    perform set_config('trainsched.skip_push_user', coalesce(v_requester::text, ''), true);

    if v_req.kind = 'reschedule' then
      if p_chosen_start is null or not (p_chosen_start = any (v_req.proposed_starts)) then
        raise exception 'invalid_slots' using errcode = 'P0001';
      end if;
      update public.lessons
         set start_at = p_chosen_start,
             end_at = p_chosen_start + (v_lesson.end_at - v_lesson.start_at),
             is_exception = series_id is not null
       where id = v_lesson.id;
    elsif (select count(*) from public.lesson_participants where lesson_id = v_lesson.id) > 1 then
      update public.lesson_participants set attendance = 'excused'
       where lesson_id = v_lesson.id and student_id = v_req.student_id;
    else
      update public.lessons
         set status = 'cancelled',
             cancel_reason = coalesce(v_req.message, cancel_reason),
             cancelled_at = now(),
             cancelled_by = v_requester,
             is_exception = series_id is not null
       where id = v_lesson.id;
    end if;

    perform set_config('trainsched.skip_push_user', '', true);
  end if;

  update public.lesson_requests
     set status = case when p_accept then 'accepted'::public.request_status else 'declined' end,
         chosen_start = case when p_accept and kind = 'reschedule' then p_chosen_start end,
         response = nullif(btrim(p_response), ''),
         decided_at = now(),
         decided_by = (select auth.uid())
   where id = p_request_id;
end;
$$;

revoke all on function
  public.create_lesson_request(uuid, public.request_kind, text, timestamptz[]),
  public.withdraw_lesson_request(uuid),
  public.decide_lesson_request(uuid, boolean, timestamptz, text)
from public, anon;
grant execute on function
  public.create_lesson_request(uuid, public.request_kind, text, timestamptz[]),
  public.withdraw_lesson_request(uuid),
  public.decide_lesson_request(uuid, boolean, timestamptz, text)
to authenticated;

-- Absagefrist eines Termins (für den Hinweis im Anfrageformular; Schüler dürfen teacher_settings nicht lesen)
create function public.lesson_cancel_deadline(p_lesson_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select l.start_at - make_interval(hours => coalesce(ts.cancel_deadline_hours, 24))
    from public.lessons l
    left join public.teacher_settings ts on ts.teacher_id = l.teacher_id
   where l.id = p_lesson_id
     and (private.can_manage_teacher_data(l.teacher_id) or private.is_lesson_participant(l.id));
$$;

revoke all on function public.lesson_cancel_deadline(uuid) from public, anon;
grant execute on function public.lesson_cancel_deadline(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Push-Tokens (ein Gerät = ein Token; wechselt beim Login auf den neuen Nutzer)
-- ---------------------------------------------------------------------------
create table public.push_tokens (
  token text primary key check (token ~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]{8,200}\]$'),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);

create index push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;
revoke all on public.push_tokens from anon, authenticated;
grant select on public.push_tokens to authenticated;

create policy push_tokens_select_own on public.push_tokens
for select to authenticated
using (user_id = (select auth.uid()));

create function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into public.push_tokens (token, user_id, platform)
  values (p_token, (select auth.uid()), p_platform)
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end;
$$;

create function public.unregister_push_token(p_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_tokens where token = p_token and user_id = (select auth.uid());
$$;

revoke all on function public.register_push_token(text, text), public.unregister_push_token(text)
from public, anon;
grant execute on function public.register_push_token(text, text), public.unregister_push_token(text)
to authenticated;

-- ---------------------------------------------------------------------------
-- Outbox
-- ---------------------------------------------------------------------------
create table public.notification_outbox (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('reminder', 'lesson_moved', 'lesson_cancelled', 'request_new', 'request_decided')),
  lesson_id uuid references public.lessons (id) on delete cascade,
  request_id uuid references public.lesson_requests (id) on delete cascade,
  payload jsonb not null default '{}',
  dedupe_key text unique,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  attempts integer not null default 0,
  sent_at timestamptz,
  last_error text
);

create index notification_outbox_open_idx on public.notification_outbox (created_at) where sent_at is null;

-- Nur Server (Trigger, Cron, Edge Function mit service_role)
alter table public.notification_outbox enable row level security;
revoke all on public.notification_outbox from anon, authenticated;

create function private.enqueue_push(
  p_user_id uuid,
  p_kind text,
  p_lesson_id uuid,
  p_request_id uuid,
  p_payload jsonb,
  p_dedupe_key text
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notification_outbox (user_id, kind, lesson_id, request_id, payload, dedupe_key)
  select p_user_id, p_kind, p_lesson_id, p_request_id, coalesce(p_payload, '{}'), p_dedupe_key
   where p_user_id is not null
     and p_user_id is distinct from (select auth.uid())
     and p_user_id::text is distinct from nullif(current_setting('trainsched.skip_push_user', true), '')
  on conflict (dedupe_key) do nothing;
$$;

-- Termin verschoben/abgesagt → Teilnehmende (außer Entschuldigte) und ggf. Lehrkraft.
-- Serienänderungen erzeugen pro Person und Transaktion nur eine Nachricht.
create function private.on_lesson_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind text;
  v_recipient uuid;
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    v_kind := 'lesson_cancelled';
  elsif new.status = 'scheduled' and (new.start_at, new.end_at) is distinct from (old.start_at, old.end_at) then
    v_kind := 'lesson_moved';
  else
    return new;
  end if;
  if greatest(new.start_at, old.start_at) <= now() then
    return new;
  end if;

  for v_recipient in
    select s.profile_id
      from public.lesson_participants lp
      join public.students s on s.id = lp.student_id
     where lp.lesson_id = new.id and lp.attendance <> 'excused' and s.profile_id is not null
    union
    select new.teacher_id
  loop
    perform private.enqueue_push(
      v_recipient, v_kind, new.id, null,
      jsonb_build_object('old_start', old.start_at),
      v_kind || ':' || v_recipient || ':' || coalesce(new.series_id, new.id) || ':' || txid_current()
    );
  end loop;
  return new;
end;
$$;

create trigger lessons_push_events
after update of start_at, end_at, status on public.lessons
for each row execute function private.on_lesson_event();

create function private.on_request_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.enqueue_push(new.teacher_id, 'request_new', new.lesson_id, new.id, '{}', 'request_new:' || new.id);
  elsif old.status = 'pending' and new.status in ('accepted', 'declined') then
    perform private.enqueue_push(
      (select profile_id from public.students where id = new.student_id),
      'request_decided', new.lesson_id, new.id,
      jsonb_build_object('accepted', new.status = 'accepted'),
      'request_decided:' || new.id
    );
  end if;
  return new;
end;
$$;

create trigger lesson_requests_push_events
after insert or update of status on public.lesson_requests
for each row execute function private.on_request_event();

-- ---------------------------------------------------------------------------
-- Erinnerungen: fällig, wenn (Beginn − Vorlauf) in (p_now − 10 min, p_now] liegt.
-- Cron läuft alle 5 min; der Dedupe-Key verhindert Doppelte. Wird ein Termin
-- verschoben, ändert sich der Key → neue Erinnerung für die neue Zeit.
-- ---------------------------------------------------------------------------
create index lessons_scheduled_start_idx on public.lessons (start_at) where status = 'scheduled';

create function private.due_reminders(p_now timestamptz)
returns table (lesson_id uuid, user_id uuid, offset_min integer, start_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with recipients as (
    select l.id as lesson_id, l.start_at, l.teacher_id as user_id
      from public.lessons l
     where l.status = 'scheduled'
       and l.start_at > p_now
       and l.start_at <= p_now + interval '7 days 10 minutes'
    union
    select l.id, l.start_at, s.profile_id
      from public.lessons l
      join public.lesson_participants lp on lp.lesson_id = l.id and lp.attendance <> 'excused'
      join public.students s on s.id = lp.student_id and s.profile_id is not null
     where l.status = 'scheduled'
       and l.start_at > p_now
       and l.start_at <= p_now + interval '7 days 10 minutes'
  )
  select r.lesson_id, r.user_id, o.offset_min, r.start_at
    from recipients r
    join public.profiles p on p.id = r.user_id and p.access_paused_at is null
    cross join lateral unnest(p.reminder_offsets_min) as o(offset_min)
   where r.start_at - make_interval(mins => o.offset_min) > p_now - interval '10 minutes'
     and r.start_at - make_interval(mins => o.offset_min) <= p_now;
$$;

create function private.enqueue_reminders(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.notification_outbox (user_id, kind, lesson_id, payload, dedupe_key)
  select d.user_id, 'reminder', d.lesson_id, jsonb_build_object('offset_min', d.offset_min),
         'reminder:' || d.lesson_id || ':' || d.user_id || ':' || d.offset_min || ':' || extract(epoch from d.start_at)::bigint
    from private.due_reminders(p_now) d
  on conflict (dedupe_key) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Versand anstoßen (URL + Secret liegen im Vault; ohne Konfiguration passiert nichts)
-- ---------------------------------------------------------------------------
create function private.dispatch_push()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  if not exists (
    select 1 from public.notification_outbox
     where sent_at is null and attempts < 5
       and (claimed_at is null or claimed_at < now() - interval '2 minutes')
  ) then
    return;
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_dispatch_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_dispatch_secret';
  if v_url is null or v_secret is null then
    return;
  end if;
  perform net.http_post(
    url := v_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-dispatch-secret', v_secret)
  );
end;
$$;

create function private.kick_push_dispatch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.dispatch_push();
  return null;
end;
$$;

create trigger notification_outbox_kick
after insert on public.notification_outbox
for each statement execute function private.kick_push_dispatch();

-- Edge Function: Einträge reservieren und alles fürs Rendern mitliefern
create function public.claim_push_batch(p_limit integer default 100)
returns table (
  id bigint,
  kind text,
  locale public.app_locale,
  timezone text,
  recipient_role public.app_role,
  tokens text[],
  payload jsonb,
  lesson_id uuid,
  request_id uuid,
  lesson_start timestamptz,
  lesson_end timestamptz,
  lesson_label text,
  request_kind public.request_kind,
  student_name text
)
language sql
security definer
set search_path = ''
as $$
  with claimed as (
    update public.notification_outbox o
       set claimed_at = now(), attempts = o.attempts + 1
     where o.id in (
       select x.id from public.notification_outbox x
        where x.sent_at is null and x.attempts < 5
          and (x.claimed_at is null or x.claimed_at < now() - interval '2 minutes')
        order by x.created_at
        limit p_limit
        for update skip locked
     )
    returning o.*
  )
  select c.id, c.kind, p.locale, p.timezone, p.role,
         coalesce((select array_agg(t.token) from public.push_tokens t where t.user_id = c.user_id), '{}'),
         c.payload, c.lesson_id, c.request_id,
         l.start_at, l.end_at,
         coalesce(
           l.title,
           case when p.role = 'student'
             then (select tp.display_name from public.profiles tp where tp.id = l.teacher_id)
             else (select string_agg(st.first_name, ', ' order by st.first_name)
                     from public.lesson_participants lp join public.students st on st.id = lp.student_id
                    where lp.lesson_id = l.id)
           end
         ),
         r.kind,
         (select st.first_name from public.students st where st.id = r.student_id)
    from claimed c
    join public.profiles p on p.id = c.user_id
    left join public.lessons l on l.id = c.lesson_id
    left join public.lesson_requests r on r.id = c.request_id
   where p.access_paused_at is null;
$$;

revoke all on function public.claim_push_batch(integer) from public, anon, authenticated;
grant execute on function public.claim_push_batch(integer) to service_role;

revoke all on function
  private.enqueue_push(uuid, text, uuid, uuid, jsonb, text),
  private.on_lesson_event(), private.on_request_event(),
  private.due_reminders(timestamptz), private.enqueue_reminders(timestamptz),
  private.dispatch_push(), private.kick_push_dispatch()
from public, anon, authenticated;

select cron.schedule('trainsched-reminders', '*/5 * * * *', $$select private.enqueue_reminders(now())$$);
select cron.schedule('trainsched-push-dispatch', '* * * * *', $$select private.dispatch_push()$$);
