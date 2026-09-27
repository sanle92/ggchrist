-- GGChrist Migration 009
-- Secure API settings, Stripe donations, deterministic scheduling and realtime delivery.
-- Requires migrations 001 through 008.

begin;

-- API credentials are encrypted by the application before they reach this table.
-- No RLS policy is intentionally created: only the server-side service role can access it.
create table if not exists public.api_secrets (
  key text primary key check (key in (
    'stripe_publishable_key',
    'stripe_secret_key',
    'stripe_webhook_secret',
    'resend_api_key'
  )),
  encrypted_value text not null,
  masked_hint text not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.api_secrets enable row level security;
revoke all on public.api_secrets from anon, authenticated;

alter table public.donation_subscriptions
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

create unique index if not exists donation_subscriptions_stripe_subscription_idx
  on public.donation_subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

alter table public.site_settings
  alter column timezone set default 'Africa/Kampala';

update public.site_settings
set timezone = 'Africa/Kampala'
where timezone is null or btrim(timezone) = '';

-- Audio is uploaded directly from the authenticated browser to Supabase Storage,
-- avoiding the 1 MB Server Action body limit and common reverse-proxy limits.
update storage.buckets
set file_size_limit = 104857600,
    allowed_mime_types = array[
      'audio/mpeg',
      'audio/mp3',
      'audio/x-mpeg',
      'audio/mpeg3',
      'audio/x-mp3'
    ]::text[]
where id = 'devotion-audio';

-- Ensure tables used by the shared realtime channel are published exactly once.
do $$
declare table_name text;
begin
  foreach table_name in array array['notifications', 'contact_messages', 'active_sessions']
  loop
    if to_regclass('public.' || table_name) is not null
       and not exists (
         select 1
         from pg_publication_tables
         where pubname = 'supabase_realtime'
           and schemaname = 'public'
           and tablename = table_name
       ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;

-- PostgreSQL timestamptz values are UTC instants. The application converts the
-- administrator's wall-clock selection to UTC before saving; this job compares UTC.
create or replace function public.publish_due_content()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.articles set status = 'published', published_at = coalesce(published_at, now()), updated_at = now() where status = 'scheduled' and scheduled_for <= now();
  update public.devotions set status = 'published', published_at = coalesce(published_at, now()), updated_at = now() where status = 'scheduled' and scheduled_for <= now();
  update public.bible_teachings set status = 'published', published_at = coalesce(published_at, now()), updated_at = now() where status = 'scheduled' and scheduled_for <= now();
  update public.kids_lessons set status = 'published', published_at = coalesce(published_at, now()), updated_at = now() where status = 'scheduled' and scheduled_for <= now();
  update public.daily_features set status = 'published', published_at = coalesce(published_at, now()), updated_at = now() where status = 'scheduled' and scheduled_for <= now();
  update public.ebooks set status = 'published', published_at = coalesce(published_at, now()), updated_at = now() where status = 'scheduled' and scheduled_for <= now();
end;
$$;

revoke all on function public.publish_due_content() from public;

commit;

-- Supabase SQL Editor runs as a role that can enable pg_cron. Keep the schedule
-- outside the transaction because cron manages its own metadata.
create extension if not exists pg_cron with schema pg_catalog;

do $$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'ggchrist-publish-due-content' limit 1;
  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;
  perform cron.schedule(
    'ggchrist-publish-due-content',
    '* * * * *',
    'select public.publish_due_content()'
  );
end $$;
