-- GGC Supabase migration 001: core relational schema
-- Run this once in a new Supabase project before 002 and 003.

begin;

create extension if not exists pgcrypto;

create type public.admin_role as enum (
  'super_admin',
  'content_manager',
  'moderator',
  'finance_manager',
  'viewer'
);

create type public.content_status as enum ('draft', 'scheduled', 'published', 'archived');
create type public.moderation_status as enum ('pending', 'approved', 'rejected');
create type public.payment_status as enum ('pending', 'processing', 'successful', 'failed', 'abandoned', 'refunded');
create type public.donation_frequency as enum ('one_time', 'weekly', 'monthly', 'yearly');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  avatar_url text,
  bio text,
  country text,
  city text,
  church text,
  favorite_verse text,
  open_to_prayer boolean not null default false,
  prayer_preferences text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'inactive', 'banned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create unique index profiles_email_lower_idx on public.profiles (lower(email));

create table public.admin_users (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role public.admin_role not null default 'viewer',
  permissions jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.article_series (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null default '',
  cover_image_url text,
  total_parts integer not null default 0 check (total_parts >= 0),
  published_parts integer not null default 0 check (published_parts >= 0),
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  excerpt text not null default '',
  content text not null,
  cover_image_url text,
  author_name text not null,
  author_avatar_url text,
  category text not null default 'General',
  tags text[] not null default '{}',
  scriptures jsonb not null default '[]'::jsonb,
  status public.content_status not null default 'draft',
  is_featured boolean not null default false,
  featured_order integer,
  series_id uuid references public.article_series(id) on delete set null,
  series_order integer,
  read_time_minutes integer not null default 1 check (read_time_minutes > 0),
  view_count bigint not null default 0 check (view_count >= 0),
  seo_title text,
  seo_description text,
  canonical_url text,
  published_at timestamptz,
  scheduled_for timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index articles_public_idx on public.articles (status, published_at desc);
create index articles_category_idx on public.articles (category, published_at desc);
create index articles_series_idx on public.articles (series_id, series_order);

create table public.devotions (
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
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index devotions_public_idx on public.devotions (status, devotion_date desc) where deleted_at is null;

create table public.daily_features (
  id uuid primary key default gen_random_uuid(),
  verse_book text not null,
  verse_chapter text not null,
  featured_verse text not null,
  background_image_url text,
  status public.content_status not null default 'draft',
  feature_date date not null unique,
  published_at timestamptz,
  published_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.daily_feature_history (
  id uuid primary key default gen_random_uuid(),
  daily_feature_id uuid references public.daily_features(id) on delete set null,
  snapshot jsonb not null,
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.kids_lessons (
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
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.bible_teachings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  body text not null default '',
  content_blocks jsonb not null default '[]'::jsonb,
  cover_image_url text,
  status public.content_status not null default 'draft',
  view_count bigint not null default 0 check (view_count >= 0),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.testimonies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  author_avatar_url text,
  title text not null,
  category text not null default 'General',
  summary text not null default '',
  content text not null,
  is_anonymous boolean not null default false,
  status public.moderation_status not null default 'pending',
  is_featured boolean not null default false,
  like_count integer not null default 0 check (like_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  author_avatar_url text,
  request text not null,
  category text not null default 'General',
  is_anonymous boolean not null default false,
  is_private boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'answered', 'rejected')),
  prayer_count integer not null default 0 check (prayer_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  author_avatar_url text,
  title text,
  content text not null,
  category text not null default 'General',
  status public.moderation_status not null default 'pending',
  is_pinned boolean not null default false,
  is_flagged boolean not null default false,
  report_count integer not null default 0 check (report_count >= 0),
  like_count integer not null default 0 check (like_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  content_type text not null check (content_type in ('article', 'devotion', 'teaching', 'post', 'testimony', 'prayer')),
  content_id uuid not null,
  author_name text not null,
  author_avatar_url text,
  body text not null,
  status public.moderation_status not null default 'pending',
  like_count integer not null default 0 check (like_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index comments_content_idx on public.comments (content_type, content_id, created_at);

create table public.content_reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content_type text not null check (content_type in ('comment', 'post', 'testimony', 'prayer')),
  content_id uuid not null,
  reaction text not null default 'like',
  created_at timestamptz not null default now(),
  unique (user_id, content_type, content_id, reaction)
);

create table public.live_chat_messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid,
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  author_avatar_url text,
  message text not null,
  reactions jsonb not null default '{}'::jsonb,
  is_flagged boolean not null default false,
  is_muted boolean not null default false,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  event_type text not null default 'general',
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  external_url text,
  attendee_count integer not null default 0 check (attendee_count >= 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.live_chat_messages
  add constraint live_chat_messages_event_fk
  foreign key (event_id) references public.events(id) on delete set null;

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text,
  email text not null,
  phone text,
  subject text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'read', 'replied', 'archived')),
  created_at timestamptz not null default now(),
  replied_at timestamptz
);

create table public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  status text not null default 'active' check (status in ('active', 'unsubscribed')),
  source text not null default 'website',
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create unique index subscribers_email_lower_idx on public.subscribers (lower(email));

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  target_amount_minor bigint not null check (target_amount_minor > 0),
  currency text not null default 'KES' check (char_length(currency) = 3),
  cover_image_url text,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.donation_subscriptions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete set null,
  donor_name text not null,
  donor_email text not null,
  donor_phone text,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (char_length(currency) = 3),
  frequency public.donation_frequency not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'paused', 'cancelled', 'completed', 'failed')),
  paystack_customer_code text,
  paystack_authorization_code text,
  paystack_subscription_code text unique,
  paystack_email_token text,
  next_payment_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.donations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete set null,
  subscription_id uuid references public.donation_subscriptions(id) on delete set null,
  donor_name text not null,
  donor_email text not null,
  donor_phone text,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (char_length(currency) = 3),
  frequency public.donation_frequency not null default 'one_time',
  payment_method text,
  status public.payment_status not null default 'pending',
  provider text not null default 'paystack',
  provider_reference text not null unique,
  provider_transaction_id text,
  is_anonymous boolean not null default false,
  message text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index donations_campaign_idx on public.donations (campaign_id, status, paid_at desc);
create index donations_email_idx on public.donations (lower(donor_email), created_at desc);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'paystack',
  event_type text not null,
  provider_reference text,
  event_fingerprint text not null unique,
  payload jsonb not null,
  processed boolean not null default false,
  processing_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete set null,
  title text not null,
  category text not null default 'other',
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (char_length(currency) = 3),
  lives_touched integer not null default 0 check (lives_touched >= 0),
  receipt_url text,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.impact_metrics (
  id boolean primary key default true check (id),
  meals bigint not null default 0,
  school_days bigint not null default 0,
  business_count bigint not null default 0,
  medical_helps bigint not null default 0,
  clothing_items bigint not null default 0,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.ebooks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text not null,
  author text not null,
  author_avatar_url text,
  author_bio text,
  author_country text,
  cover_image_url text not null,
  price_minor bigint not null default 0 check (price_minor >= 0),
  original_price_minor bigint check (original_price_minor is null or original_price_minor >= 0),
  currency text not null default 'USD' check (char_length(currency) = 3),
  format text not null default 'PDF' check (format in ('PDF', 'EPUB', 'MOBI', 'Paperback', 'Hardcover')),
  category text not null default 'General',
  tags text[] not null default '{}',
  pages integer check (pages is null or pages > 0),
  language text not null default 'English',
  status public.content_status not null default 'draft',
  is_featured boolean not null default false,
  file_path text,
  preview_url text,
  sales_count bigint not null default 0,
  rating numeric(3,2) not null default 0 check (rating between 0 and 5),
  review_count integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ebook_purchases (
  id uuid primary key default gen_random_uuid(),
  ebook_id uuid not null references public.ebooks(id) on delete restrict,
  buyer_user_id uuid references public.profiles(id) on delete set null,
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text,
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null check (char_length(currency) = 3),
  status public.payment_status not null default 'pending',
  provider_reference text unique,
  download_token_hash text,
  download_expires_at timestamptz,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table public.ebook_reviews (
  id uuid primary key default gen_random_uuid(),
  ebook_id uuid not null references public.ebooks(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  reviewer_name text not null,
  reviewer_avatar_url text,
  rating smallint not null check (rating between 1 and 5),
  title text,
  comment text not null,
  verified_purchase boolean not null default false,
  helpful_count integer not null default 0,
  status public.moderation_status not null default 'pending',
  admin_reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  notification_type text not null default 'system',
  link text,
  source_id text,
  source_type text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

create table public.analytics_daily (
  analytics_date date primary key,
  page_views bigint not null default 0,
  unique_visitors bigint not null default 0,
  donations_count bigint not null default 0,
  donations_amount_minor bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table public.visitor_locations (
  country_code text primary key,
  country_name text not null,
  visit_count bigint not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'admin_users', 'article_series', 'articles', 'devotions',
    'daily_features', 'kids_lessons', 'bible_teachings', 'testimonies',
    'prayer_requests', 'forum_posts', 'comments', 'events', 'campaigns',
    'donation_subscriptions', 'donations', 'expenses', 'ebooks', 'ebook_reviews'
  ]
  loop
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end;
$$;

insert into public.impact_metrics (id) values (true) on conflict (id) do nothing;

commit;
