-- GGChrist Migration 007 — corrected version
-- This version uses public.forum_posts, the table created by Migration 001.

alter table public.site_settings alter column default_currency set default 'USD';
update public.site_settings set default_currency = 'USD', updated_at = now();
update public.campaigns set currency = 'USD' where currency = 'NGN';
update public.ebooks set currency = 'USD' where currency = 'NGN';

create or replace function public.notify_active_admins()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, title, message, notification_type, link, source_id, source_type)
  select au.user_id, tg_argv[0], tg_argv[1], tg_argv[2], tg_argv[3], new.id::text, tg_table_name
  from public.admin_users au
  where au.is_active = true;
  return new;
end;
$$;

drop trigger if exists notify_admin_contact_message on public.contact_messages;
create trigger notify_admin_contact_message after insert on public.contact_messages
for each row execute function public.notify_active_admins('New message', 'A new contact message needs attention.', 'message', '/messages');

drop trigger if exists notify_admin_community_post on public.forum_posts;
create trigger notify_admin_community_post after insert on public.forum_posts
for each row execute function public.notify_active_admins('Community post pending', 'A new community post is ready for moderation.', 'moderation', '/community?tab=posts');

drop trigger if exists notify_admin_testimony on public.testimonies;
create trigger notify_admin_testimony after insert on public.testimonies
for each row execute function public.notify_active_admins('Testimony submitted', 'A new testimony is ready for moderation.', 'moderation', '/community?tab=testimonies');

drop trigger if exists notify_admin_prayer on public.prayer_requests;
create trigger notify_admin_prayer after insert on public.prayer_requests
for each row execute function public.notify_active_admins('Prayer request submitted', 'A new prayer request is ready for review.', 'prayer', '/community?tab=prayers');

drop trigger if exists notify_admin_donation on public.donations;
create trigger notify_admin_donation after insert on public.donations
for each row execute function public.notify_active_admins('Donation initiated', 'A new donation transaction was created.', 'finance', '/finance?tab=donations');

do $$
declare realtime_table text;
begin
  foreach realtime_table in array array['notifications', 'articles', 'devotions', 'bible_teachings', 'kids_lessons', 'ebooks', 'contact_messages'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = realtime_table) then
      execute format('alter publication supabase_realtime add table public.%I', realtime_table);
    end if;
  end loop;
end $$;

comment on function public.notify_active_admins is 'Creates one notification for every active administrator when important public activity occurs.';
