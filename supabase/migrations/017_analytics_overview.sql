-- Aggregate in PostgreSQL so API row limits do not truncate audience totals.
-- Requires migrations 006 and 016. Keeps the caller's RLS restrictions.
begin;
create or replace function public.analytics_overview(p_days integer default 30, p_timezone text default 'UTC')
returns jsonb language sql stable security invoker set search_path = '' as $$
  with bounds as (
    select (now() at time zone 'UTC')::date as today,
      case when p_days in (7,30,90) then p_days else 30 end as days,
      coalesce((select name from pg_catalog.pg_timezone_names where name = p_timezone limit 1), 'UTC') as zone
  ), events as materialized (
    select e.* from public.analytics_events e cross join bounds b
    where e.event_type = 'page_view'
      and e.occurred_at >= ((b.today - (b.days - 1))::timestamp at time zone 'UTC')
      and e.occurred_at <= now()
  ), rankings as (
    select 'pages' as kind, path as label, count(*) as total from events group by path
    union all select 'locations', coalesce(nullif(concat_ws(', ',city,country_name),''),'Unknown'), count(*) from events group by 2
    union all select 'devices', device_type, count(*) from events group by device_type
    union all select 'browsers', coalesce(browser,'Unknown'), count(*) from events group by browser
    union all select 'referrals', case when referrer ~ '^https?://' then split_part(split_part(referrer,'://',2),'/',1) else 'Direct' end, count(*) from events group by 2
  ), ranked as (
    select *, row_number() over (partition by kind order by total desc, label) as position from rankings
  ), days as (
    select b.today - offset_day as day from bounds b cross join lateral generate_series(0,b.days-1) offset_day
  ), trend as (
    select d.day, count(e.id) as views from days d left join events e
      on (e.occurred_at at time zone 'UTC')::date = d.day group by d.day
  ), recent as (
    select distinct on (visitor_id, session_id)
      visitor_id, session_id, path, referrer, country_name, city, device_type, browser, timezone, occurred_at
    from events order by visitor_id, session_id, occurred_at desc, id desc
  ), history as (select * from recent order by occurred_at desc limit 100)
  select jsonb_build_object(
    'page_views', (select count(*) from events),
    'visitors', (select count(distinct visitor_id) from events),
    'sessions', (select count(distinct session_id) from events),
    'rankings', coalesce((select jsonb_object_agg(kind, items) from (
      select kind, jsonb_agg(jsonb_build_array(label,total) order by total desc,label) as items from ranked where position <= 20 group by kind
    ) r), '{}'::jsonb),
    'trend', (select jsonb_agg(jsonb_build_object('day',day,'views',views) order by day) from trend),
    'busiest_hour', (select extract(hour from occurred_at at time zone (select zone from bounds))::integer from events group by 1 order by count(*) desc, 1 limit 1),
    'history', coalesce((select jsonb_agg(to_jsonb(h) order by occurred_at desc) from history h),'[]'::jsonb)
  );
$$;
revoke all on function public.analytics_overview(integer,text) from public, anon;
grant execute on function public.analytics_overview(integer,text) to authenticated;
commit;
notify pgrst, 'reload schema';
