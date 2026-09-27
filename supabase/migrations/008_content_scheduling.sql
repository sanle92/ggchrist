-- GGChrist Migration 008
-- Adds date/time scheduling to every publishable Admin content module.

alter table public.devotions add column if not exists scheduled_for timestamptz;
alter table public.bible_teachings add column if not exists scheduled_for timestamptz;
alter table public.kids_lessons add column if not exists scheduled_for timestamptz;
alter table public.daily_features add column if not exists scheduled_for timestamptz;
alter table public.ebooks add column if not exists scheduled_for timestamptz;

create index if not exists articles_schedule_idx on public.articles (scheduled_for) where status = 'scheduled';
create index if not exists devotions_schedule_idx on public.devotions (scheduled_for) where status = 'scheduled';
create index if not exists teachings_schedule_idx on public.bible_teachings (scheduled_for) where status = 'scheduled';
create index if not exists kids_schedule_idx on public.kids_lessons (scheduled_for) where status = 'scheduled';
create index if not exists daily_features_schedule_idx on public.daily_features (scheduled_for) where status = 'scheduled';
create index if not exists ebooks_schedule_idx on public.ebooks (scheduled_for) where status = 'scheduled';

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

-- Supabase projects normally include pg_cron. If available, publish due content every minute.
do $$
declare existing_job bigint;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute 'select jobid from cron.job where jobname = ''ggchrist-publish-due-content'' limit 1' into existing_job;
    if existing_job is null then
      perform cron.schedule('ggchrist-publish-due-content', '* * * * *', 'select public.publish_due_content()');
    end if;
  else
    raise notice 'pg_cron is not enabled. Date/time values are saved, but automatic publishing requires enabling the Cron extension and scheduling public.publish_due_content().';
  end if;
end $$;
