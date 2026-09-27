-- GGChrist Migration 013c: restore missing Admin foundation and Forum
-- Use this standalone repair when admin_users, is_admin(), or forum_posts is missing.
-- Safe to run more than once.

begin;

create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'admin_role'
  ) then
    create type public.admin_role as enum (
      'super_admin', 'content_manager', 'moderator', 'finance_manager', 'viewer'
    );
  end if;
end $$;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.admin_role not null default 'viewer',
  permissions jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_users
  add column if not exists role public.admin_role not null default 'viewer',
  add column if not exists permissions jsonb not null default '{}'::jsonb,
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

insert into public.admin_users (user_id, role, permissions, is_active)
select id, 'super_admin'::public.admin_role, '{"all":true}'::jsonb, true
from auth.users
where lower(email) = lower('sanleyapi@gmail.com')
on conflict (user_id) do update
set role = 'super_admin', permissions = excluded.permissions,
    is_active = true, updated_at = now();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid() and is_active = true
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.admin_users enable row level security;
grant select on table public.admin_users to authenticated;
drop policy if exists admin_users_read_self on public.admin_users;
create policy admin_users_read_self on public.admin_users for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  author_avatar_url text,
  title text not null default 'Community discussion',
  content text not null,
  category text not null default 'General',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  is_pinned boolean not null default false,
  is_flagged boolean not null default false,
  report_count integer not null default 0 check (report_count >= 0),
  like_count bigint not null default 0 check (like_count >= 0),
  comment_count bigint not null default 0 check (comment_count >= 0),
  share_count bigint not null default 0 check (share_count >= 0),
  view_count bigint not null default 0 check (view_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.forum_posts
  add column if not exists author_avatar_url text,
  add column if not exists title text,
  add column if not exists category text not null default 'General',
  add column if not exists is_pinned boolean not null default false,
  add column if not exists is_flagged boolean not null default false,
  add column if not exists report_count integer not null default 0,
  add column if not exists like_count bigint not null default 0,
  add column if not exists comment_count bigint not null default 0,
  add column if not exists share_count bigint not null default 0,
  add column if not exists view_count bigint not null default 0,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

update public.forum_posts set title = 'Community discussion'
where title is null or btrim(title) = '';
alter table public.forum_posts alter column title set not null;
alter table public.forum_posts enable row level security;

grant select on table public.forum_posts to anon;
grant select, insert, update, delete on table public.forum_posts to authenticated;

drop policy if exists forum_posts_public_read on public.forum_posts;
create policy forum_posts_public_read on public.forum_posts for select to anon, authenticated
  using (status = 'approved' and deleted_at is null);
drop policy if exists forum_posts_owner_read on public.forum_posts;
create policy forum_posts_owner_read on public.forum_posts for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists forum_posts_authenticated_create on public.forum_posts;
create policy forum_posts_authenticated_create on public.forum_posts for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
drop policy if exists forum_posts_owner_update_pending on public.forum_posts;
create policy forum_posts_owner_update_pending on public.forum_posts for update to authenticated
  using (user_id = auth.uid() and status = 'pending' and deleted_at is null)
  with check (user_id = auth.uid() and status = 'pending');
drop policy if exists forum_posts_admin_manage on public.forum_posts;
create policy forum_posts_admin_manage on public.forum_posts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create index if not exists forum_posts_admin_queue_idx
  on public.forum_posts (status, created_at desc);

do $$
begin
  if to_regprocedure('public.notify_active_admins()') is not null then
    execute 'drop trigger if exists notify_admin_community_post on public.forum_posts';
    execute $trigger$
      create trigger notify_admin_community_post after insert on public.forum_posts
      for each row execute function public.notify_active_admins(
        'Community post pending',
        'A new community post is ready for moderation.',
        'moderation',
        '/community?tab=forum'
      )
    $trigger$;
  end if;
end $$;

commit;
notify pgrst, 'reload schema';
