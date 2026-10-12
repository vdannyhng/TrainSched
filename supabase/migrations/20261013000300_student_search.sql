-- =============================================================================
-- M2 · Diakritik-tolerante Schülersuche („Huong“ findet „Hương“)
-- =============================================================================
create extension if not exists unaccent with schema extensions;

-- unaccent() ist nur STABLE; für eine generierte Spalte braucht es eine IMMUTABLE-Hülle
-- mit fest verdrahtetem Wörterbuch.
create function private.immutable_unaccent(p_text text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, p_text);
$$;

grant execute on function private.immutable_unaccent(text) to authenticated;

alter table public.students
  add column search_text text generated always as (
    lower(private.immutable_unaccent(
      first_name || ' ' || coalesce(last_name, '') || ' ' || coalesce(email, '')
    ))
  ) stored;

create extension if not exists pg_trgm with schema extensions;
create index students_search_text_idx on public.students using gin (search_text extensions.gin_trgm_ops);
