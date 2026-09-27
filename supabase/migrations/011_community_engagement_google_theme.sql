-- GGChrist Migration 011 FIXED v2: moderated community engagement and content metrics
-- Requires migrations 001 through 010.

begin;

alter table public.articles
  add column if not exists deleted_at timestamptz,
  add column if not exists like_count bigint not null default 0 check (like_count >= 0),
  add column if not exists comment_count bigint not null default 0 check (comment_count >= 0),
  add column if not exists share_count bigint not null default 0 check (share_count >= 0);

create index if not exists articles_public_active_idx
  on public.articles (status, published_at desc)
  where deleted_at is null;

alter table public.devotions
  add column if not exists like_count bigint not null default 0 check (like_count >= 0),
  add column if not exists comment_count bigint not null default 0 check (comment_count >= 0),
  add column if not exists share_count bigint not null default 0 check (share_count >= 0);

alter table public.daily_features
  add column if not exists like_count bigint not null default 0 check (like_count >= 0),
  add column if not exists comment_count bigint not null default 0 check (comment_count >= 0),
  add column if not exists share_count bigint not null default 0 check (share_count >= 0);

alter table public.bible_teachings
  add column if not exists like_count bigint not null default 0 check (like_count >= 0),
  add column if not exists comment_count bigint not null default 0 check (comment_count >= 0),
  add column if not exists share_count bigint not null default 0 check (share_count >= 0);

alter table public.forum_posts
  add column if not exists share_count bigint not null default 0 check (share_count >= 0);

alter table public.testimonies
  add column if not exists share_count bigint not null default 0 check (share_count >= 0);

alter table public.prayer_requests
  add column if not exists like_count bigint not null default 0 check (like_count >= 0),
  add column if not exists share_count bigint not null default 0 check (share_count >= 0);

alter table public.comments drop constraint if exists comments_content_type_check;
alter table public.comments add constraint comments_content_type_check
  check (content_type in ('article', 'devotion', 'daily_feature', 'teaching', 'post', 'testimony', 'prayer'));

alter table public.content_reactions drop constraint if exists content_reactions_content_type_check;
alter table public.content_reactions add constraint content_reactions_content_type_check
  check (content_type in ('comment', 'article', 'devotion', 'daily_feature', 'teaching', 'post', 'testimony', 'prayer'));

create table if not exists public.content_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  content_type text not null check (content_type in ('article', 'devotion', 'daily_feature', 'teaching', 'post', 'testimony', 'prayer')),
  content_id uuid not null,
  channel text not null default 'web' check (channel in ('web', 'native', 'copy', 'facebook', 'whatsapp', 'email')),
  created_at timestamptz not null default now()
);

create index if not exists content_shares_target_idx on public.content_shares (content_type, content_id, created_at desc);
create index if not exists content_reactions_target_idx on public.content_reactions (content_type, content_id, created_at desc);

alter table public.content_shares enable row level security;
drop policy if exists content_shares_admin_read on public.content_shares;
create policy content_shares_admin_read on public.content_shares for select to authenticated using (public.is_admin());

create or replace function public.is_public_engagement_target(p_content_type text, p_content_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case p_content_type
    when 'article' then exists (select 1 from public.articles where id = p_content_id and status = 'published' and coalesce(published_at, now()) <= now())
    when 'devotion' then exists (select 1 from public.devotions where id = p_content_id and status = 'published' and deleted_at is null and coalesce(published_at, now()) <= now())
    when 'daily_feature' then exists (select 1 from public.daily_features where id = p_content_id and status = 'published' and feature_date <= current_date)
    when 'teaching' then exists (select 1 from public.bible_teachings where id = p_content_id and status = 'published' and coalesce(published_at, now()) <= now())
    when 'post' then exists (select 1 from public.forum_posts where id = p_content_id and status = 'approved' and deleted_at is null)
    when 'testimony' then exists (select 1 from public.testimonies where id = p_content_id and status = 'approved' and deleted_at is null)
    when 'prayer' then exists (select 1 from public.prayer_requests where id = p_content_id and status in ('approved', 'answered') and is_private = false and deleted_at is null)
    else false
  end;
$$;

revoke all on function public.is_public_engagement_target(text,uuid) from public;
grant execute on function public.is_public_engagement_target(text,uuid) to anon, authenticated, service_role;

drop policy if exists reactions_owner_create on public.content_reactions;
create policy reactions_owner_create on public.content_reactions for insert to authenticated
  with check (user_id = auth.uid() and reaction = 'like' and public.is_public_engagement_target(content_type, content_id));

drop policy if exists comments_authenticated_create on public.comments;
create policy comments_authenticated_create on public.comments for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending' and public.is_public_engagement_target(content_type, content_id));

create or replace function public.refresh_content_engagement(p_content_type text, p_content_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  likes bigint;
  approved_comments bigint;
  shares bigint;
begin
  select count(*) into likes from public.content_reactions where content_type = p_content_type and content_id = p_content_id and reaction = 'like';
  select count(*) into approved_comments from public.comments where content_type = p_content_type and content_id = p_content_id and status = 'approved' and deleted_at is null;
  select count(*) into shares from public.content_shares where content_type = p_content_type and content_id = p_content_id;

  case p_content_type
    when 'article' then update public.articles set like_count = likes, comment_count = approved_comments, share_count = shares where id = p_content_id;
    when 'devotion' then update public.devotions set like_count = likes, comment_count = approved_comments, share_count = shares where id = p_content_id;
    when 'daily_feature' then update public.daily_features set like_count = likes, comment_count = approved_comments, share_count = shares where id = p_content_id;
    when 'teaching' then update public.bible_teachings set like_count = likes, comment_count = approved_comments, share_count = shares where id = p_content_id;
    when 'post' then update public.forum_posts set like_count = likes, comment_count = approved_comments, share_count = shares where id = p_content_id;
    when 'testimony' then update public.testimonies set like_count = likes, comment_count = approved_comments, share_count = shares where id = p_content_id;
    when 'prayer' then update public.prayer_requests set like_count = likes, comment_count = approved_comments, share_count = shares where id = p_content_id;
    else null;
  end case;
end;
$$;

revoke all on function public.refresh_content_engagement(text,uuid) from public, anon, authenticated;
grant execute on function public.refresh_content_engagement(text,uuid) to service_role;

create or replace function public.engagement_reaction_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_content_engagement(old.content_type, old.content_id);
  else
    perform public.refresh_content_engagement(new.content_type, new.content_id);
  end if;
  return null;
end;
$$;

drop trigger if exists content_reactions_refresh_counts on public.content_reactions;
create trigger content_reactions_refresh_counts after insert or delete on public.content_reactions
  for each row execute function public.engagement_reaction_changed();

create or replace function public.engagement_comment_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'INSERT' then perform public.refresh_content_engagement(old.content_type, old.content_id); end if;
  if tg_op <> 'DELETE' then perform public.refresh_content_engagement(new.content_type, new.content_id); end if;
  return null;
end;
$$;

drop trigger if exists comments_refresh_counts on public.comments;
drop trigger if exists comments_refresh_counts_update on public.comments;
create trigger comments_refresh_counts after insert or delete on public.comments
  for each row execute function public.engagement_comment_changed();
create trigger comments_refresh_counts_update after update of status, deleted_at, content_type, content_id on public.comments
  for each row execute function public.engagement_comment_changed();

drop trigger if exists notify_admin_comment on public.comments;
create trigger notify_admin_comment after insert on public.comments
  for each row execute function public.notify_active_admins(
    'Comment pending',
    'A new public comment is ready for moderation.',
    'moderation',
    '/community?tab=comments'
  );

create or replace function public.engagement_share_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_content_engagement(old.content_type, old.content_id);
  else
    perform public.refresh_content_engagement(new.content_type, new.content_id);
  end if;
  return null;
end;
$$;

drop trigger if exists content_shares_refresh_counts on public.content_shares;
create trigger content_shares_refresh_counts after insert or delete on public.content_shares
  for each row execute function public.engagement_share_changed();

create or replace function public.record_content_share(p_content_type text, p_content_id uuid, p_channel text default 'web')
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count bigint;
begin
  if p_channel not in ('web', 'native', 'copy', 'facebook', 'whatsapp', 'email') then raise exception 'Unsupported share channel'; end if;
  if not public.is_public_engagement_target(p_content_type, p_content_id) then raise exception 'Content is unavailable'; end if;
  insert into public.content_shares (user_id, content_type, content_id, channel) values (auth.uid(), p_content_type, p_content_id, p_channel);
  select count(*) into next_count from public.content_shares where content_type = p_content_type and content_id = p_content_id;
  return next_count;
end;
$$;

revoke all on function public.record_content_share(text,uuid,text) from public;
grant execute on function public.record_content_share(text,uuid,text) to anon, authenticated;

-- Google OAuth profiles use provider-standard name and picture metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url, last_login_at)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = case when public.profiles.display_name = '' then excluded.display_name else public.profiles.display_name end,
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    last_login_at = now(),
    updated_at = now();
  return new;
end;
$$;

do $$
declare
  target record;
begin
  for target in
    select distinct content_type, content_id from (
      select content_type, content_id from public.content_reactions
      union
      select content_type, content_id from public.comments
      union
      select content_type, content_id from public.content_shares
    ) existing_targets
  loop
    perform public.refresh_content_engagement(target.content_type, target.content_id);
  end loop;
end;
$$;

do $$
declare
  realtime_table text;
begin
  foreach realtime_table in array array['comments', 'content_reactions', 'content_shares'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = realtime_table) then
      execute format('alter publication supabase_realtime add table public.%I', realtime_table);
    end if;
  end loop;
end;
$$;

commit;
