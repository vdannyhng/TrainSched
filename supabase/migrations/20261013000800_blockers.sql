-- =============================================================================
-- Blocker: private Zeiten der Lehrkraft (z. B. andere Arbeit)
-- =============================================================================
-- Einmalig (start_date = end_date) oder wöchentlich an ausgewählten Wochentagen.
-- Nicht materialisiert: Vorkommen werden pro Zeitraum berechnet (DST-sicher,
-- Wanduhrzeit in der Zeitzone des Blockers). Nur für Lehrkräfte sichtbar.

create table public.blockers (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  start_date date not null,
  end_date date,
  weekdays smallint[] not null check (
    cardinality(weekdays) between 1 and 7 and weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
  ),
  local_start time not null,
  local_end time not null,
  timezone text not null check (private.is_valid_timezone(timezone)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (local_end > local_start),
  check (end_date is null or end_date >= start_date)
);

create index blockers_teacher_idx on public.blockers (teacher_id);

create trigger blockers_updated_at before update on public.blockers
for each row execute function private.set_updated_at();

alter table public.blockers enable row level security;
revoke all on public.blockers from anon, authenticated;
grant select, delete on public.blockers to authenticated;
grant insert (teacher_id, title, start_date, end_date, weekdays, local_start, local_end, timezone),
      update (title, start_date, end_date, weekdays, local_start, local_end, timezone)
  on public.blockers to authenticated;

create policy blockers_all on public.blockers
for all to authenticated
using (private.can_manage_teacher_data(teacher_id))
with check (private.can_manage_teacher_data(teacher_id));

-- Vorkommen im Zeitraum [p_from, p_to) (security invoker → RLS: nur eigene Blocker)
create function public.blocker_occurrences(p_teacher_id uuid, p_from timestamptz, p_to timestamptz)
returns table (blocker_id uuid, title text, start_at timestamptz, end_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select o.blocker_id, o.title, o.start_at, o.end_at
    from (
      select b.id as blocker_id,
             b.title,
             (d::date + b.local_start) at time zone b.timezone as start_at,
             (d::date + b.local_end) at time zone b.timezone as end_at
        from public.blockers b
        cross join lateral generate_series(
          greatest(b.start_date, (p_from at time zone b.timezone)::date - 1)::timestamp,
          least(coalesce(b.end_date, (p_to at time zone b.timezone)::date + 1),
                (p_to at time zone b.timezone)::date + 1)::timestamp,
          interval '1 day'
        ) as d
       where b.teacher_id = p_teacher_id
         and extract(isodow from d)::smallint = any (b.weekdays)
    ) o
   where tstzrange(o.start_at, o.end_at) && tstzrange(p_from, p_to)
   order by o.start_at;
$$;

revoke all on function public.blocker_occurrences(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.blocker_occurrences(uuid, timestamptz, timestamptz) to authenticated;

-- Konfliktprüfung um Blocker erweitern (Art 'blocker' = Warnung, kein hartes Verbot)
create or replace function public.check_conflicts(
  p_teacher_id uuid,
  p_starts timestamptz[],
  p_ends timestamptz[],
  p_ignore_lesson_ids uuid[] default '{}'
)
returns table (
  range_index integer,
  kind text,
  lesson_id uuid,
  start_at timestamptz,
  end_at timestamptz,
  label text
)
language sql
stable
security invoker
set search_path = ''
as $$
  with settings as (
    select coalesce((select buffer_minutes from public.teacher_settings where teacher_id = p_teacher_id), 0) as buffer
  ),
  ranges as (
    select u.idx::integer as idx, tstzrange(u.s, u.e) as rng
      from unnest(p_starts, p_ends) with ordinality as u(s, e, idx)
  ),
  window_bounds as (
    select min(lower(rng)) as lo, max(upper(rng)) as hi from ranges
  ),
  lesson_hits as (
    select r.idx,
           case when tstzrange(l.start_at, l.end_at) && r.rng then 'overlap' else 'buffer' end as kind,
           l.id, l.start_at, l.end_at,
           coalesce(l.title, (
             select string_agg(st.first_name, ', ' order by st.first_name)
               from public.lesson_participants lp join public.students st on st.id = lp.student_id
              where lp.lesson_id = l.id
           )) as label
      from ranges r
      cross join settings
      join public.lessons l
        on l.teacher_id = p_teacher_id
       and l.status <> 'cancelled'
       and not (l.id = any (coalesce(p_ignore_lesson_ids, '{}')))
       and tstzrange(l.start_at - make_interval(mins => settings.buffer),
                     l.end_at + make_interval(mins => settings.buffer)) && r.rng
  ),
  blocker_hits as (
    select r.idx, 'blocker' as kind, null::uuid as id, b.start_at, b.end_at, b.title as label
      from ranges r
      cross join window_bounds w
      join public.blocker_occurrences(p_teacher_id, w.lo, w.hi) b
        on tstzrange(b.start_at, b.end_at) && r.rng
  )
  select * from lesson_hits
  union all
  select * from blocker_hits
  order by 1, 4;
$$;
