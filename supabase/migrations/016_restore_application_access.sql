-- Restore API privileges without widening existing row-level policies.
-- Apply after the existing migrations through 015. Safe to rerun.
begin;

grant usage on schema public to anon, authenticated, service_role;

do $$
declare entry record; operation text; api_role text;
begin
  -- Only application tables that already have RLS and policies are eligible.
  -- Private tables such as api_secrets and giving_requests have no client policies.
  for entry in
    select c.relname, p.polcmd, p.polroles
    from pg_policy p join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relrowsecurity
  loop
    operation := case entry.polcmd
      when 'r' then 'select' when 'a' then 'insert'
      when 'w' then 'update' when 'd' then 'delete'
      when '*' then 'select, insert, update, delete' end;
    foreach api_role in array array['anon', 'authenticated'] loop
      if (select oid from pg_roles where rolname = api_role) = any(entry.polroles)
         or 0::oid = any(entry.polroles) then
        execute format('grant %s on table public.%I to %I', operation, entry.relname, api_role);
      end if;
    end loop;
  end loop;
end $$;

-- Service access is explicit too; client roles still cannot read secrets.
grant select, insert, update, delete on public.api_secrets to service_role;

-- Existing analytics readers can receive changes, with polling as fallback.
do $$
declare table_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array array['analytics_events', 'analytics_daily', 'active_sessions'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
        and schemaname = 'public' and tablename = table_name) then
        execute format('alter publication supabase_realtime add table public.%I', table_name);
      end if;
    end loop;
  end if;
end $$;
commit;
notify pgrst, 'reload schema';
