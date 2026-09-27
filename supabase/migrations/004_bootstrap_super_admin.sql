-- GGC Supabase migration 004: bootstrap the first super administrator
-- The auth user must already exist in Supabase Authentication.

begin;

do $$
declare
  target_user_id uuid;
begin
  select id
  into target_user_id
  from auth.users
  where lower(email) = lower('sanleyapi@gmail.com')
  limit 1;

  if target_user_id is null then
    raise exception 'No Supabase Auth user exists for sanleyapi@gmail.com. Create and confirm the user first.';
  end if;

  insert into public.profiles (
    id,
    email,
    display_name,
    status,
    created_at,
    updated_at
  )
  values (
    target_user_id,
    'sanleyapi@gmail.com',
    'Sanle',
    'active',
    now(),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = case
      when public.profiles.display_name = '' then excluded.display_name
      else public.profiles.display_name
    end,
    status = 'active',
    updated_at = now();

  insert into public.admin_users (
    user_id,
    role,
    permissions,
    is_active,
    created_at,
    updated_at
  )
  values (
    target_user_id,
    'super_admin'::public.admin_role,
    '{"all": true}'::jsonb,
    true,
    now(),
    now()
  )
  on conflict (user_id) do update set
    role = 'super_admin'::public.admin_role,
    permissions = '{"all": true}'::jsonb,
    is_active = true,
    updated_at = now();
end;
$$;

commit;
