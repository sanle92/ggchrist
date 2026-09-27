-- GGChrist Migration 014 FIXED
-- Self-healing content tables, complete SEO fields, and reliable unique views.
-- Safe to run more than once. This replaces the earlier Migration 014.

begin;

create extension if not exists pgcrypto;

-- Create the enum only when the core migration has not already created it.
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'content_status'
  ) then
    create type public.content_status as enum ('draft', 'scheduled', 'published', 'archived');
  end if;
end
$$;

-- These CREATE TABLE statements deliberately have no dependencies on profiles,
-- article_series, or other optional tables. They create an empty compatible
-- content foundation only when a table is genuinely missing.
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  excerpt text not null default '',
  content text not null default '',
  cover_image_url text,
  author_name text not null default 'Glorious Gospel of Christ',
  author_avatar_url text,
  category text not null default 'General',
  tags text[] not null default '{}',
  scriptures jsonb not null default '[]'::jsonb,
  status public.content_status not null default 'draft',
  is_featured boolean not null default false,
  featured_order integer,
  series_id uuid,
  series_order integer,
  read_time_minutes integer not null default 1,
  view_count bigint not null default 0,
  seo_title text,
  seo_description text,
  canonical_url text,
  focus_keyword text,
  no_index boolean not null default false,
  published_at timestamptz,
  scheduled_for timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.devotions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  reference text,
  scripture text,
  reflection text not null default '',
  prayer text,
  audio_url text,
  audio_title text,
  cover_image_url text,
  status public.content_status not null default 'draft',
  devotion_date date not null default current_date,
  published_at timestamptz,
  scheduled_for timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  like_count bigint not null default 0,
  comment_count bigint not null default 0,
  share_count bigint not null default 0,
  seo_title text,
  seo_description text,
  canonical_url text,
  focus_keyword text,
  no_index boolean not null default false
);

create table if not exists public.bible_teachings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  body text not null default '',
  content_blocks jsonb not null default '[]'::jsonb,
  cover_image_url text,
  status public.content_status not null default 'draft',
  read_time_minutes integer not null default 1,
  view_count bigint not null default 0,
  like_count bigint not null default 0,
  comment_count bigint not null default 0,
  share_count bigint not null default 0,
  seo_title text,
  seo_description text,
  canonical_url text,
  focus_keyword text,
  no_index boolean not null default false,
  published_at timestamptz,
  scheduled_for timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.kids_lessons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  week_label text,
  title text not null,
  theme text,
  bible_book text,
  characters text,
  content text not null default '',
  quiz jsonb not null default '[]'::jsonb,
  cover_image_url text,
  status public.content_status not null default 'draft',
  seo_title text,
  seo_description text,
  canonical_url text,
  focus_keyword text,
  no_index boolean not null default false,
  published_at timestamptz,
  scheduled_for timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.daily_features (
  id uuid primary key default gen_random_uuid(),
  verse_book text not null default '',
  verse_chapter text not null default '',
  featured_verse text not null default '',
  background_image_url text,
  status public.content_status not null default 'draft',
  feature_date date not null default current_date,
  like_count bigint not null default 0,
  comment_count bigint not null default 0,
  share_count bigint not null default 0,
  seo_title text,
  seo_description text,
  canonical_url text,
  focus_keyword text,
  no_index boolean not null default false,
  published_at timestamptz,
  scheduled_for timestamptz,
  published_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ebooks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text not null default '',
  author text not null default 'Glorious Gospel of Christ',
  author_avatar_url text,
  author_bio text,
  author_country text,
  cover_image_url text,
  price_minor bigint not null default 0,
  original_price_minor bigint,
  shipping_price_minor bigint not null default 0,
  currency text not null default 'USD',
  format text not null default 'PDF',
  category text not null default 'General',
  tags text[] not null default '{}',
  pages integer,
  language text not null default 'English',
  status public.content_status not null default 'draft',
  is_featured boolean not null default false,
  file_path text,
  preview_url text,
  sales_count bigint not null default 0,
  rating numeric(3,2) not null default 0,
  review_count integer not null default 0,
  seo_title text,
  seo_description text,
  canonical_url text,
  focus_keyword text,
  no_index boolean not null default false,
  published_at timestamptz,
  scheduled_for timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Repair SEO/view columns on installations where the tables already existed.
alter table public.articles
  add column if not exists view_count bigint not null default 0,
  add column if not exists read_time_minutes integer not null default 1,
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists canonical_url text,
  add column if not exists focus_keyword text,
  add column if not exists no_index boolean not null default false,
  add column if not exists scheduled_for timestamptz,
  add column if not exists deleted_at timestamptz;

alter table public.devotions
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists canonical_url text,
  add column if not exists focus_keyword text,
  add column if not exists no_index boolean not null default false,
  add column if not exists scheduled_for timestamptz;

alter table public.bible_teachings
  add column if not exists view_count bigint not null default 0,
  add column if not exists read_time_minutes integer not null default 1,
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists canonical_url text,
  add column if not exists focus_keyword text,
  add column if not exists no_index boolean not null default false,
  add column if not exists scheduled_for timestamptz,
  add column if not exists deleted_at timestamptz;

alter table public.kids_lessons
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists canonical_url text,
  add column if not exists focus_keyword text,
  add column if not exists no_index boolean not null default false,
  add column if not exists scheduled_for timestamptz;

alter table public.daily_features
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists canonical_url text,
  add column if not exists focus_keyword text,
  add column if not exists no_index boolean not null default false,
  add column if not exists scheduled_for timestamptz;

alter table public.ebooks
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists canonical_url text,
  add column if not exists focus_keyword text,
  add column if not exists no_index boolean not null default false,
  add column if not exists scheduled_for timestamptz,
  add column if not exists deleted_at timestamptz;

create index if not exists articles_public_014_idx
  on public.articles (status, published_at desc);
create index if not exists bible_teachings_public_014_idx
  on public.bible_teachings (status, published_at desc);

-- Public read access for newly created tables. Existing policies remain intact.
alter table public.articles enable row level security;
alter table public.devotions enable row level security;
alter table public.bible_teachings enable row level security;
alter table public.kids_lessons enable row level security;
alter table public.daily_features enable row level security;
alter table public.ebooks enable row level security;

grant select on table public.articles, public.devotions, public.bible_teachings,
  public.kids_lessons, public.daily_features, public.ebooks to anon, authenticated;

drop policy if exists articles_public_read_014 on public.articles;
create policy articles_public_read_014 on public.articles for select to anon, authenticated
  using (status::text = 'published' and deleted_at is null and coalesce(published_at, now()) <= now());

drop policy if exists devotions_public_read_014 on public.devotions;
create policy devotions_public_read_014 on public.devotions for select to anon, authenticated
  using (status::text = 'published' and deleted_at is null and coalesce(published_at, now()) <= now());

drop policy if exists bible_teachings_public_read_014 on public.bible_teachings;
create policy bible_teachings_public_read_014 on public.bible_teachings for select to anon, authenticated
  using (status::text = 'published' and deleted_at is null and coalesce(published_at, now()) <= now());

drop policy if exists kids_lessons_public_read_014 on public.kids_lessons;
create policy kids_lessons_public_read_014 on public.kids_lessons for select to anon, authenticated
  using (status::text = 'published' and deleted_at is null and coalesce(published_at, now()) <= now());

drop policy if exists daily_features_public_read_014 on public.daily_features;
create policy daily_features_public_read_014 on public.daily_features for select to anon, authenticated
  using (status::text = 'published' and coalesce(published_at, now()) <= now());

drop policy if exists ebooks_public_read_014 on public.ebooks;
create policy ebooks_public_read_014 on public.ebooks for select to anon, authenticated
  using (status::text = 'published' and deleted_at is null and coalesce(published_at, now()) <= now());

-- One counted view per anonymous/browser key, content item, and UTC day.
create table if not exists public.content_view_events (
  id bigint generated by default as identity primary key,
  content_type text not null check (content_type in ('article', 'teaching')),
  content_id uuid not null,
  viewer_key uuid not null,
  viewed_on date not null default (timezone('utc', now())::date),
  created_at timestamptz not null default now(),
  unique (content_type, content_id, viewer_key, viewed_on)
);

create index if not exists content_view_events_target_idx
  on public.content_view_events (content_type, content_id, created_at desc);

alter table public.content_view_events enable row level security;
revoke all on table public.content_view_events from anon, authenticated;

create or replace function public.record_content_view(
  p_content_type text,
  p_content_id uuid,
  p_viewer_key uuid
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_rows integer := 0;
  current_views bigint := 0;
begin
  if p_content_type not in ('article', 'teaching') then
    raise exception 'Unsupported content type';
  end if;

  if p_content_type = 'article' and not exists (
    select 1 from public.articles
    where id = p_content_id
      and status::text = 'published'
      and deleted_at is null
      and coalesce(published_at, now()) <= now()
  ) then
    raise exception 'Article is not publicly available';
  end if;

  if p_content_type = 'teaching' and not exists (
    select 1 from public.bible_teachings
    where id = p_content_id
      and status::text = 'published'
      and deleted_at is null
      and coalesce(published_at, now()) <= now()
  ) then
    raise exception 'Teaching is not publicly available';
  end if;

  insert into public.content_view_events (content_type, content_id, viewer_key)
  values (p_content_type, p_content_id, p_viewer_key)
  on conflict (content_type, content_id, viewer_key, viewed_on) do nothing;
  get diagnostics inserted_rows = row_count;

  if p_content_type = 'article' then
    if inserted_rows = 1 then
      update public.articles
      set view_count = coalesce(view_count, 0) + 1
      where id = p_content_id
      returning view_count into current_views;
    else
      select coalesce(view_count, 0) into current_views
      from public.articles where id = p_content_id;
    end if;
  else
    if inserted_rows = 1 then
      update public.bible_teachings
      set view_count = coalesce(view_count, 0) + 1
      where id = p_content_id
      returning view_count into current_views;
    else
      select coalesce(view_count, 0) into current_views
      from public.bible_teachings where id = p_content_id;
    end if;
  end if;

  return coalesce(current_views, 0);
end;
$$;

revoke all on function public.record_content_view(text, uuid, uuid) from public;
grant execute on function public.record_content_view(text, uuid, uuid) to anon, authenticated;

commit;

notify pgrst, 'reload schema';
