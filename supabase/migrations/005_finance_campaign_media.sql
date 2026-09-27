-- GGC Supabase migration 005: allow finance staff to manage campaign images.
-- Requires migrations 001 through 004.

begin;

drop policy if exists public_media_content_staff_insert on storage.objects;
drop policy if exists public_media_content_staff_update on storage.objects;
drop policy if exists public_media_content_staff_delete on storage.objects;

create policy public_media_admin_staff_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'public-media'
    and (public.is_content_staff() or public.is_finance_staff())
  );

create policy public_media_admin_staff_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'public-media'
    and (public.is_content_staff() or public.is_finance_staff())
  )
  with check (
    bucket_id = 'public-media'
    and (public.is_content_staff() or public.is_finance_staff())
  );

create policy public_media_admin_staff_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'public-media'
    and (public.is_content_staff() or public.is_finance_staff())
  );

commit;
