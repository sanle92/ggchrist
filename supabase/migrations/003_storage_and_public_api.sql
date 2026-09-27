-- GGC Supabase migration 003: storage buckets and safe public API helpers
-- Requires migrations 001 and 002.

begin;

alter table public.campaigns
  add column raised_amount_minor bigint not null default 0 check (raised_amount_minor >= 0),
  add column donation_count bigint not null default 0 check (donation_count >= 0),
  add column donor_count bigint not null default 0 check (donor_count >= 0);

create or replace function public.increment_article_view(article_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.articles
  set view_count = view_count + 1
  where id = article_id
    and status = 'published'
    and coalesce(published_at, now()) <= now();
end;
$$;

create or replace function public.increment_teaching_view(teaching_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.bible_teachings
  set view_count = view_count + 1
  where id = teaching_id
    and status = 'published'
    and coalesce(published_at, now()) <= now();
end;
$$;

revoke all on function public.increment_article_view(uuid) from public;
revoke all on function public.increment_teaching_view(uuid) from public;
grant execute on function public.increment_article_view(uuid) to anon, authenticated;
grant execute on function public.increment_teaching_view(uuid) to anon, authenticated;

create or replace view public.admin_dashboard_metrics
with (security_invoker = true)
as
select
  (select count(*) from public.profiles where status = 'active') as active_users,
  (select count(*) from public.articles where status = 'published') as published_articles,
  (select count(*) from public.devotions where status = 'published' and deleted_at is null) as published_devotions,
  (select count(*) from public.contact_messages where status = 'new') as unread_messages,
  (select count(*) from public.donations where status = 'successful') as successful_donations,
  (select coalesce(sum(amount_minor), 0) from public.donations where status = 'successful') as donated_amount_minor,
  (select count(*) from public.testimonies where status = 'pending') as pending_testimonies,
  (select count(*) from public.prayer_requests where status = 'pending') as pending_prayer_requests;

revoke all on public.admin_dashboard_metrics from anon;
grant select on public.admin_dashboard_metrics to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'public-media',
    'public-media',
    true,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
  ),
  (
    'avatars',
    'avatars',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'devotion-audio',
    'devotion-audio',
    true,
    52428800,
    array['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg']
  ),
  (
    'receipts',
    'receipts',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  ),
  (
    'ebooks',
    'ebooks',
    false,
    104857600,
    array['application/pdf', 'application/epub+zip', 'application/x-mobipocket-ebook']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public files are readable by everyone but writable only by content staff.
create policy public_media_read
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'public-media');

create policy public_media_content_staff_insert
  on storage.objects for insert to authenticated
  with check (bucket_id = 'public-media' and public.is_content_staff());

create policy public_media_content_staff_update
  on storage.objects for update to authenticated
  using (bucket_id = 'public-media' and public.is_content_staff())
  with check (bucket_id = 'public-media' and public.is_content_staff());

create policy public_media_content_staff_delete
  on storage.objects for delete to authenticated
  using (bucket_id = 'public-media' and public.is_content_staff());

-- Users own the folder avatars/<user-id>/..., while admins may moderate it.
create policy avatars_read
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars');

create policy avatars_owner_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_owner_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  )
  with check (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy avatars_owner_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- Devotion audio is public after upload and managed only by content staff.
create policy devotion_audio_read
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'devotion-audio');

create policy devotion_audio_content_staff_insert
  on storage.objects for insert to authenticated
  with check (bucket_id = 'devotion-audio' and public.is_content_staff());

create policy devotion_audio_content_staff_update
  on storage.objects for update to authenticated
  using (bucket_id = 'devotion-audio' and public.is_content_staff())
  with check (bucket_id = 'devotion-audio' and public.is_content_staff());

create policy devotion_audio_content_staff_delete
  on storage.objects for delete to authenticated
  using (bucket_id = 'devotion-audio' and public.is_content_staff());

-- Receipts contain financial evidence and are private to finance staff.
create policy receipts_finance_read
  on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and public.is_finance_staff());

create policy receipts_finance_insert
  on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and public.is_finance_staff());

create policy receipts_finance_update
  on storage.objects for update to authenticated
  using (bucket_id = 'receipts' and public.is_finance_staff())
  with check (bucket_id = 'receipts' and public.is_finance_staff());

create policy receipts_finance_delete
  on storage.objects for delete to authenticated
  using (bucket_id = 'receipts' and public.is_finance_staff());

-- Ebook files are private. Purchaser downloads are issued server-side as signed URLs.
create policy ebooks_content_staff_read
  on storage.objects for select to authenticated
  using (bucket_id = 'ebooks' and public.is_content_staff());

create policy ebooks_content_staff_insert
  on storage.objects for insert to authenticated
  with check (bucket_id = 'ebooks' and public.is_content_staff());

create policy ebooks_content_staff_update
  on storage.objects for update to authenticated
  using (bucket_id = 'ebooks' and public.is_content_staff())
  with check (bucket_id = 'ebooks' and public.is_content_staff());

create policy ebooks_content_staff_delete
  on storage.objects for delete to authenticated
  using (bucket_id = 'ebooks' and public.is_content_staff());

commit;
