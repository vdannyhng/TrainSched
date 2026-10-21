-- M8 Security-Härtung: Brute-Force-Schutz für Einladungscodes, Link-Schema für Online-Räume.
-- accept-invite meldet jeden Versuch mit gehashter Client-Adresse. Mehr als 10 Versuche in 15 Minuten
-- von derselben Adresse (oder > 300 insgesamt) → abgelehnt. Gespeichert wird nur ein Hash, max. 1 Tag.

create table private.invite_attempts (
  id bigint generated always as identity primary key,
  client_hash text not null,
  created_at timestamptz not null default now()
);

create index invite_attempts_client_idx on private.invite_attempts (client_hash, created_at);
create index invite_attempts_created_idx on private.invite_attempts (created_at);

revoke all on private.invite_attempts from public, anon, authenticated;

create function public.register_invite_attempt(p_client text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text := encode(extensions.digest('trainsched-invite:' || coalesce(p_client, 'unknown'), 'sha256'), 'hex');
begin
  delete from private.invite_attempts where created_at < now() - interval '1 day';
  insert into private.invite_attempts (client_hash) values (v_hash);
  return (select count(*) from private.invite_attempts
           where client_hash = v_hash and created_at > now() - interval '15 minutes') <= 10
     and (select count(*) from private.invite_attempts
           where created_at > now() - interval '15 minutes') <= 300;
end;
$$;

revoke all on function public.register_invite_attempt(text) from public, anon, authenticated;
grant execute on function public.register_invite_attempt(text) to service_role;

-- Defense in Depth: Online-Raum-Links nur http(s) – die App öffnet sie direkt (Web: kein javascript:-XSS).
alter table public.lessons
  add constraint lessons_meeting_url_scheme check (meeting_url is null or meeting_url ~* '^https?://');
alter table public.lesson_series
  add constraint lesson_series_meeting_url_scheme check (meeting_url is null or meeting_url ~* '^https?://');
