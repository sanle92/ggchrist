-- GGC Supabase migration 006: complete analytics, settings, messages and finance operations.
-- Requires migrations 001 through 005.

begin;

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  session_id uuid not null,
  visitor_id uuid not null,
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null default 'page_view' check (event_type in ('page_view', 'heartbeat', 'donation_start', 'download')),
  path text not null,
  referrer text,
  country_code text,
  country_name text,
  region text,
  city text,
  timezone text,
  device_type text not null default 'desktop' check (device_type in ('desktop', 'mobile', 'tablet', 'bot', 'unknown')),
  browser text,
  operating_system text,
  screen_width integer,
  occurred_at timestamptz not null default now()
);

create index if not exists analytics_events_occurred_idx on public.analytics_events (occurred_at desc);
create index if not exists analytics_events_path_idx on public.analytics_events (path, occurred_at desc);
create index if not exists analytics_events_visitor_idx on public.analytics_events (visitor_id, occurred_at desc);

create table if not exists public.active_sessions (
  session_id uuid primary key,
  visitor_id uuid not null,
  user_id uuid references public.profiles(id) on delete set null,
  current_path text not null,
  country_code text,
  country_name text,
  region text,
  city text,
  timezone text,
  device_type text not null default 'desktop',
  browser text,
  operating_system text,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists active_sessions_seen_idx on public.active_sessions (last_seen_at desc);

create table if not exists public.site_settings (
  id boolean primary key default true check (id),
  ministry_name text not null default 'Glorious Gospel of Christ',
  support_email text,
  contact_phone text,
  default_currency text not null default 'USD' check (char_length(default_currency) = 3),
  timezone text not null default 'Africa/Kampala',
  donations_enabled boolean not null default true,
  community_enabled boolean not null default true,
  maintenance_mode boolean not null default false,
  social_links jsonb not null default '{}'::jsonb,
  seo_defaults jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id) values (true) on conflict (id) do nothing;

alter table public.contact_messages
  add column if not exists priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null,
  add column if not exists admin_notes text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.expenses
  add column if not exists status text not null default 'approved' check (status in ('pending', 'approved', 'rejected', 'void')),
  add column if not exists expense_date date not null default current_date,
  add column if not exists vendor text,
  add column if not exists payment_method text,
  add column if not exists reference text,
  add column if not exists notes text;

create or replace function public.track_analytics(
  p_session_id uuid,
  p_visitor_id uuid,
  p_event_type text,
  p_path text,
  p_referrer text default null,
  p_country_code text default null,
  p_country_name text default null,
  p_region text default null,
  p_city text default null,
  p_timezone text default null,
  p_device_type text default 'unknown',
  p_browser text default null,
  p_operating_system text default null,
  p_screen_width integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  analytics_day date := (now() at time zone 'UTC')::date;
begin
  if p_event_type not in ('page_view', 'heartbeat', 'donation_start', 'download')
     or char_length(p_path) > 500 then
    return;
  end if;

  insert into public.active_sessions (
    session_id, visitor_id, user_id, current_path, country_code, country_name,
    region, city, timezone, device_type, browser, operating_system, last_seen_at
  ) values (
    p_session_id, p_visitor_id, auth.uid(), p_path, upper(left(p_country_code, 3)),
    left(p_country_name, 100), left(p_region, 100), left(p_city, 100), left(p_timezone, 100),
    coalesce(p_device_type, 'unknown'), left(p_browser, 80), left(p_operating_system, 80), now()
  )
  on conflict (session_id) do update set
    user_id = coalesce(auth.uid(), public.active_sessions.user_id),
    current_path = excluded.current_path,
    country_code = coalesce(excluded.country_code, public.active_sessions.country_code),
    country_name = coalesce(excluded.country_name, public.active_sessions.country_name),
    region = coalesce(excluded.region, public.active_sessions.region),
    city = coalesce(excluded.city, public.active_sessions.city),
    timezone = coalesce(excluded.timezone, public.active_sessions.timezone),
    device_type = excluded.device_type,
    browser = excluded.browser,
    operating_system = excluded.operating_system,
    last_seen_at = now();

  if p_event_type <> 'heartbeat' then
    insert into public.analytics_events (
      session_id, visitor_id, user_id, event_type, path, referrer, country_code,
      country_name, region, city, timezone, device_type, browser, operating_system, screen_width
    ) values (
      p_session_id, p_visitor_id, auth.uid(), p_event_type, p_path, left(p_referrer, 1000),
      upper(left(p_country_code, 3)), left(p_country_name, 100), left(p_region, 100),
      left(p_city, 100), left(p_timezone, 100), coalesce(p_device_type, 'unknown'),
      left(p_browser, 80), left(p_operating_system, 80), p_screen_width
    );
  end if;

  if p_event_type = 'page_view' then
    insert into public.analytics_daily (analytics_date, page_views, unique_visitors)
    values (analytics_day, 1, 1)
    on conflict (analytics_date) do update set
      page_views = public.analytics_daily.page_views + 1,
      unique_visitors = (
        select count(distinct visitor_id)
        from public.analytics_events
        where occurred_at >= analytics_day::timestamptz
          and occurred_at < (analytics_day + 1)::timestamptz
      ),
      updated_at = now();

    if p_country_code is not null and p_country_code <> '' then
      insert into public.visitor_locations (country_code, country_name, visit_count)
      values (upper(left(p_country_code, 3)), coalesce(nullif(left(p_country_name, 100), ''), upper(left(p_country_code, 3))), 1)
      on conflict (country_code) do update set
        country_name = excluded.country_name,
        visit_count = public.visitor_locations.visit_count + 1,
        updated_at = now();
    end if;
  end if;
end;
$$;

revoke all on function public.track_analytics(uuid, uuid, text, text, text, text, text, text, text, text, text, text, text, integer) from public;
grant execute on function public.track_analytics(uuid, uuid, text, text, text, text, text, text, text, text, text, text, text, integer) to anon, authenticated;

alter table public.analytics_events enable row level security;
alter table public.active_sessions enable row level security;
alter table public.site_settings enable row level security;

create policy analytics_events_admin_read on public.analytics_events for select to authenticated using (public.is_admin());
create policy active_sessions_admin_read on public.active_sessions for select to authenticated using (public.is_admin());
create policy site_settings_public_read on public.site_settings for select to anon, authenticated using (true);
create policy site_settings_super_admin_manage on public.site_settings for all to authenticated
  using (public.has_admin_role(array['super_admin'::public.admin_role]))
  with check (public.has_admin_role(array['super_admin'::public.admin_role]));

create or replace view public.admin_dashboard_metrics_v2
with (security_invoker = true)
as
select
  (select count(*) from public.profiles where status = 'active') as active_users,
  (select count(*) from public.active_sessions where last_seen_at >= now() - interval '2 minutes') as live_users,
  (select count(*) from public.articles where status = 'published') as published_articles,
  (select count(*) from public.devotions where status = 'published' and deleted_at is null) as published_devotions,
  (select count(*) from public.contact_messages where status = 'new') as unread_messages,
  (select count(*) from public.donations where status = 'successful') as successful_donations,
  (select coalesce(sum(amount_minor), 0) from public.donations where status = 'successful') as donated_amount_minor,
  (select coalesce(sum(amount_minor), 0) from public.expenses where status = 'approved') as expense_amount_minor,
  (select count(*) from public.testimonies where status = 'pending') as pending_testimonies,
  (select count(*) from public.prayer_requests where status = 'pending') as pending_prayer_requests,
  (select count(*) from public.forum_posts where status = 'pending') as pending_posts,
  (select count(*) from public.analytics_events where occurred_at >= current_date) as page_views_today;

revoke all on public.admin_dashboard_metrics_v2 from anon;
grant select on public.admin_dashboard_metrics_v2 to authenticated;

commit;
