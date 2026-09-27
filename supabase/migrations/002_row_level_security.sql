-- GGC Supabase migration 002: roles and Row Level Security
-- Requires 001_core_schema.sql.

begin;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
      and is_active = true
  );
$$;

create or replace function public.has_admin_role(allowed_roles public.admin_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
      and is_active = true
      and role = any(allowed_roles)
  );
$$;

create or replace function public.is_content_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_admin_role(array[
    'super_admin'::public.admin_role,
    'content_manager'::public.admin_role
  ]);
$$;

create or replace function public.is_moderation_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_admin_role(array[
    'super_admin'::public.admin_role,
    'moderator'::public.admin_role
  ]);
$$;

create or replace function public.is_finance_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_admin_role(array[
    'super_admin'::public.admin_role,
    'finance_manager'::public.admin_role
  ]);
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.has_admin_role(public.admin_role[]) from public;
revoke all on function public.is_content_staff() from public;
revoke all on function public.is_moderation_staff() from public;
revoke all on function public.is_finance_staff() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.has_admin_role(public.admin_role[]) to authenticated;
grant execute on function public.is_content_staff() to authenticated;
grant execute on function public.is_moderation_staff() to authenticated;
grant execute on function public.is_finance_staff() to authenticated;

create or replace function public.protect_profile_security_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() = old.id and not public.is_admin() then
    new.email := old.email;
    new.status := old.status;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_security_fields
  before update on public.profiles
  for each row execute function public.protect_profile_security_fields();

create or replace view public.public_profiles
with (security_barrier = true)
as
select
  id,
  display_name,
  avatar_url,
  bio,
  country,
  church,
  favorite_verse,
  open_to_prayer,
  created_at
from public.profiles
where status = 'active';

revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'admin_users', 'article_series', 'articles', 'devotions',
    'daily_features', 'daily_feature_history', 'kids_lessons', 'bible_teachings',
    'testimonies', 'prayer_requests', 'forum_posts', 'comments', 'content_reactions',
    'live_chat_messages', 'events', 'contact_messages', 'subscribers', 'campaigns',
    'donation_subscriptions', 'donations', 'payment_events', 'expenses',
    'impact_metrics', 'ebooks', 'ebook_purchases', 'ebook_reviews', 'notifications',
    'audit_logs', 'analytics_daily', 'visitor_locations'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
  end loop;
end;
$$;

-- Profiles and administrators
create policy profiles_select_self_or_admin
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update_self_or_admin
  on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy admin_users_select_self_or_admin
  on public.admin_users for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy admin_users_manage_super_admin
  on public.admin_users for all to authenticated
  using (public.has_admin_role(array['super_admin'::public.admin_role]))
  with check (public.has_admin_role(array['super_admin'::public.admin_role]));

-- Public editorial content
create policy article_series_public_read
  on public.article_series for select to anon, authenticated
  using (true);

create policy article_series_content_staff_manage
  on public.article_series for all to authenticated
  using (public.is_content_staff())
  with check (public.is_content_staff());

create policy articles_public_read
  on public.articles for select to anon, authenticated
  using (status = 'published' and coalesce(published_at, now()) <= now());

create policy articles_admin_read
  on public.articles for select to authenticated
  using (public.is_admin());

create policy articles_content_staff_manage
  on public.articles for all to authenticated
  using (public.is_content_staff())
  with check (public.is_content_staff());

create policy devotions_public_read
  on public.devotions for select to anon, authenticated
  using (status = 'published' and deleted_at is null and coalesce(published_at, now()) <= now());

create policy devotions_admin_read
  on public.devotions for select to authenticated
  using (public.is_admin());

create policy devotions_content_staff_manage
  on public.devotions for all to authenticated
  using (public.is_content_staff())
  with check (public.is_content_staff());

create policy daily_features_public_read
  on public.daily_features for select to anon, authenticated
  using (status = 'published' and feature_date <= current_date);

create policy daily_features_admin_read
  on public.daily_features for select to authenticated
  using (public.is_admin());

create policy daily_features_content_staff_manage
  on public.daily_features for all to authenticated
  using (public.is_content_staff())
  with check (public.is_content_staff());

create policy daily_feature_history_admin_read
  on public.daily_feature_history for select to authenticated
  using (public.is_admin());

create policy daily_feature_history_content_staff_insert
  on public.daily_feature_history for insert to authenticated
  with check (public.is_content_staff());

create policy kids_lessons_public_read
  on public.kids_lessons for select to anon, authenticated
  using (status = 'published' and deleted_at is null and coalesce(published_at, now()) <= now());

create policy kids_lessons_admin_read
  on public.kids_lessons for select to authenticated
  using (public.is_admin());

create policy kids_lessons_content_staff_manage
  on public.kids_lessons for all to authenticated
  using (public.is_content_staff())
  with check (public.is_content_staff());

create policy bible_teachings_public_read
  on public.bible_teachings for select to anon, authenticated
  using (status = 'published' and coalesce(published_at, now()) <= now());

create policy bible_teachings_admin_read
  on public.bible_teachings for select to authenticated
  using (public.is_admin());

create policy bible_teachings_content_staff_manage
  on public.bible_teachings for all to authenticated
  using (public.is_content_staff())
  with check (public.is_content_staff());

-- Community content
create policy testimonies_public_read
  on public.testimonies for select to anon, authenticated
  using (status = 'approved' and deleted_at is null);

create policy testimonies_owner_read
  on public.testimonies for select to authenticated
  using (user_id = auth.uid() or public.is_moderation_staff());

create policy testimonies_authenticated_create
  on public.testimonies for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

create policy testimonies_owner_update_pending
  on public.testimonies for update to authenticated
  using (user_id = auth.uid() and status = 'pending' and deleted_at is null)
  with check (user_id = auth.uid() and status = 'pending');

create policy testimonies_moderator_manage
  on public.testimonies for all to authenticated
  using (public.is_moderation_staff())
  with check (public.is_moderation_staff());

create policy prayer_requests_public_read
  on public.prayer_requests for select to anon, authenticated
  using (status in ('approved', 'answered') and is_private = false and deleted_at is null);

create policy prayer_requests_owner_read
  on public.prayer_requests for select to authenticated
  using (user_id = auth.uid() or public.is_moderation_staff());

create policy prayer_requests_authenticated_create
  on public.prayer_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

create policy prayer_requests_owner_update_pending
  on public.prayer_requests for update to authenticated
  using (user_id = auth.uid() and status = 'pending' and deleted_at is null)
  with check (user_id = auth.uid() and status = 'pending');

create policy prayer_requests_moderator_manage
  on public.prayer_requests for all to authenticated
  using (public.is_moderation_staff())
  with check (public.is_moderation_staff());

create policy forum_posts_public_read
  on public.forum_posts for select to anon, authenticated
  using (status = 'approved' and deleted_at is null);

create policy forum_posts_owner_read
  on public.forum_posts for select to authenticated
  using (user_id = auth.uid() or public.is_moderation_staff());

create policy forum_posts_authenticated_create
  on public.forum_posts for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

create policy forum_posts_owner_update_pending
  on public.forum_posts for update to authenticated
  using (user_id = auth.uid() and status = 'pending' and deleted_at is null)
  with check (user_id = auth.uid() and status = 'pending');

create policy forum_posts_moderator_manage
  on public.forum_posts for all to authenticated
  using (public.is_moderation_staff())
  with check (public.is_moderation_staff());

create policy comments_public_read
  on public.comments for select to anon, authenticated
  using (status = 'approved' and deleted_at is null);

create policy comments_owner_read
  on public.comments for select to authenticated
  using (user_id = auth.uid() or public.is_moderation_staff());

create policy comments_authenticated_create
  on public.comments for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

create policy comments_owner_update_pending
  on public.comments for update to authenticated
  using (user_id = auth.uid() and status = 'pending' and deleted_at is null)
  with check (user_id = auth.uid() and status = 'pending');

create policy comments_moderator_manage
  on public.comments for all to authenticated
  using (public.is_moderation_staff())
  with check (public.is_moderation_staff());

create policy reactions_public_read
  on public.content_reactions for select to anon, authenticated
  using (true);

create policy reactions_owner_create
  on public.content_reactions for insert to authenticated
  with check (user_id = auth.uid());

create policy reactions_owner_delete
  on public.content_reactions for delete to authenticated
  using (user_id = auth.uid() or public.is_moderation_staff());

create policy chat_authenticated_read
  on public.live_chat_messages for select to authenticated
  using (deleted_at is null);

create policy chat_owner_create
  on public.live_chat_messages for insert to authenticated
  with check (user_id = auth.uid() and is_flagged = false and is_muted = false);

create policy chat_owner_soft_delete
  on public.live_chat_messages for update to authenticated
  using (user_id = auth.uid() or public.is_moderation_staff())
  with check (user_id = auth.uid() or public.is_moderation_staff());

create policy chat_moderator_delete
  on public.live_chat_messages for delete to authenticated
  using (public.is_moderation_staff());

create policy events_public_read
  on public.events for select to anon, authenticated
  using (status in ('published', 'completed'));

create policy events_admin_read
  on public.events for select to authenticated
  using (public.is_admin());

create policy events_content_staff_manage
  on public.events for all to authenticated
  using (public.is_content_staff())
  with check (public.is_content_staff());

-- Public forms
create policy contact_messages_public_create
  on public.contact_messages for insert to anon, authenticated
  with check (
    char_length(first_name) between 1 and 100
    and char_length(email) between 3 and 320
    and char_length(subject) between 1 and 200
    and char_length(message) between 1 and 5000
    and status = 'new'
  );

create policy contact_messages_admin_manage
  on public.contact_messages for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy subscribers_public_create
  on public.subscribers for insert to anon, authenticated
  with check (
    char_length(email) between 3 and 320
    and status = 'active'
  );

create policy subscribers_admin_manage
  on public.subscribers for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Campaigns, payments, finance, and impact
create policy campaigns_public_read
  on public.campaigns for select to anon, authenticated
  using (status in ('active', 'completed'));

create policy campaigns_admin_read
  on public.campaigns for select to authenticated
  using (public.is_admin());

create policy campaigns_finance_manage
  on public.campaigns for all to authenticated
  using (public.is_finance_staff())
  with check (public.is_finance_staff());

create policy donation_subscriptions_finance_read
  on public.donation_subscriptions for select to authenticated
  using (public.is_finance_staff());

create policy donation_subscriptions_finance_update
  on public.donation_subscriptions for update to authenticated
  using (public.is_finance_staff())
  with check (public.is_finance_staff());

create policy donations_finance_read
  on public.donations for select to authenticated
  using (public.is_finance_staff());

create policy donations_finance_update
  on public.donations for update to authenticated
  using (public.is_finance_staff())
  with check (public.is_finance_staff());

create policy payment_events_finance_read
  on public.payment_events for select to authenticated
  using (public.is_finance_staff());

create policy expenses_finance_manage
  on public.expenses for all to authenticated
  using (public.is_finance_staff())
  with check (public.is_finance_staff());

create policy impact_metrics_public_read
  on public.impact_metrics for select to anon, authenticated
  using (true);

create policy impact_metrics_admin_update
  on public.impact_metrics for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Ebooks
create policy ebooks_public_read
  on public.ebooks for select to anon, authenticated
  using (status = 'published' and coalesce(published_at, now()) <= now());

create policy ebooks_admin_read
  on public.ebooks for select to authenticated
  using (public.is_admin());

create policy ebooks_content_staff_manage
  on public.ebooks for all to authenticated
  using (public.is_content_staff())
  with check (public.is_content_staff());

create policy ebook_purchases_buyer_read
  on public.ebook_purchases for select to authenticated
  using (buyer_user_id = auth.uid() or public.is_finance_staff());

create policy ebook_reviews_public_read
  on public.ebook_reviews for select to anon, authenticated
  using (status = 'approved');

create policy ebook_reviews_authenticated_create
  on public.ebook_reviews for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

create policy ebook_reviews_owner_read
  on public.ebook_reviews for select to authenticated
  using (user_id = auth.uid() or public.is_moderation_staff());

create policy ebook_reviews_moderator_manage
  on public.ebook_reviews for all to authenticated
  using (public.is_moderation_staff())
  with check (public.is_moderation_staff());

-- Private operational data
create policy notifications_owner_read
  on public.notifications for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy notifications_owner_update
  on public.notifications for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy notifications_admin_manage
  on public.notifications for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy audit_logs_admin_read
  on public.audit_logs for select to authenticated
  using (public.is_admin());

create policy audit_logs_admin_insert
  on public.audit_logs for insert to authenticated
  with check (public.is_admin() and actor_id = auth.uid());

create policy analytics_admin_read
  on public.analytics_daily for select to authenticated
  using (public.is_admin());

create policy visitor_locations_admin_read
  on public.visitor_locations for select to authenticated
  using (public.is_admin());

commit;
