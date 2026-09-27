begin;

-- Ebook commerce and fulfillment. Payment records remain server/webhook controlled.
alter table public.ebooks
  add column if not exists shipping_amount_minor bigint not null default 0
    check (shipping_amount_minor >= 0);

alter table public.ebook_purchases
  add column if not exists provider text not null default 'stripe',
  add column if not exists payment_intent_id text,
  add column if not exists fulfillment_type text not null default 'digital'
    check (fulfillment_type in ('digital', 'physical')),
  add column if not exists fulfillment_status text not null default 'pending'
    check (fulfillment_status in ('pending', 'ready', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  add column if not exists shipping_address jsonb,
  add column if not exists download_count integer not null default 0
    check (download_count >= 0),
  add column if not exists last_downloaded_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists ebook_purchases_payment_intent_idx
  on public.ebook_purchases (payment_intent_id)
  where payment_intent_id is not null;

create index if not exists ebook_purchases_fulfillment_idx
  on public.ebook_purchases (fulfillment_status, created_at desc);

drop policy if exists ebook_purchases_content_staff_read on public.ebook_purchases;
create policy ebook_purchases_content_staff_read
  on public.ebook_purchases for select to authenticated
  using (public.is_content_staff() or public.is_finance_staff());

drop policy if exists ebook_purchases_staff_update on public.ebook_purchases;
create policy ebook_purchases_staff_update
  on public.ebook_purchases for update to authenticated
  using (public.is_content_staff() or public.is_finance_staff())
  with check (public.is_content_staff() or public.is_finance_staff());

-- Atomically transitions a Stripe-confirmed purchase and increments sales once.
create or replace function public.confirm_ebook_purchase(
  p_provider_reference text,
  p_payment_intent_id text,
  p_amount_minor bigint,
  p_currency text,
  p_shipping_address jsonb,
  p_download_token_hash text,
  p_download_expires_at timestamptz
)
returns table (purchase_id uuid, ebook_id uuid, buyer_email text, buyer_name text, fulfillment_type text)
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.ebook_purchases%rowtype;
  was_successful boolean;
begin
  select * into target
  from public.ebook_purchases
  where provider_reference = p_provider_reference
  for update;

  if target.id is null then
    raise exception 'Ebook purchase was not initialized';
  end if;

  if target.amount_minor <> p_amount_minor or upper(target.currency) <> upper(p_currency) then
    raise exception 'Stripe amount does not match the ebook order';
  end if;

  was_successful := target.status = 'successful';

  update public.ebook_purchases
  set status = 'successful',
      provider = 'stripe',
      payment_intent_id = p_payment_intent_id,
      shipping_address = coalesce(p_shipping_address, shipping_address),
      fulfillment_status = case when target.fulfillment_type = 'digital' then 'ready' else 'processing' end,
      download_token_hash = case when target.fulfillment_type = 'digital' then p_download_token_hash else null end,
      download_expires_at = case when target.fulfillment_type = 'digital' then p_download_expires_at else null end,
      paid_at = coalesce(paid_at, now()),
      updated_at = now()
  where id = target.id;

  if not was_successful then
    update public.ebooks
    set sales_count = sales_count + 1, updated_at = now()
    where id = target.ebook_id;
  end if;

  return query
    select target.id, target.ebook_id, target.buyer_email, target.buyer_name, target.fulfillment_type;
end;
$$;

revoke all on function public.confirm_ebook_purchase(text,text,bigint,text,jsonb,text,timestamptz) from public, anon, authenticated;
grant execute on function public.confirm_ebook_purchase(text,text,bigint,text,jsonb,text,timestamptz) to service_role;

-- Keep the five-row visitor history query fast as analytics grows.
create index if not exists analytics_events_recent_visitors_idx
  on public.analytics_events (occurred_at desc, visitor_id, session_id)
  where event_type = 'page_view';

-- Campaign progress always reflects webhook-confirmed successful donations.
create or replace function public.refresh_campaign_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  target_ids uuid[];
begin
  if tg_op = 'INSERT' then
    target_ids := array[new.campaign_id];
  elsif tg_op = 'DELETE' then
    target_ids := array[old.campaign_id];
  else
    target_ids := array[old.campaign_id, new.campaign_id];
  end if;

  foreach target_id in array target_ids
  loop
    if target_id is not null then
      update public.campaigns c
      set raised_amount_minor = coalesce(summary.raised, 0),
          donation_count = coalesce(summary.gifts, 0),
          donor_count = coalesce(summary.donors, 0),
          updated_at = now()
      from (
        select
          coalesce(sum(amount_minor), 0)::bigint as raised,
          count(*)::bigint as gifts,
          count(distinct lower(donor_email))::bigint as donors
        from public.donations
        where campaign_id = target_id and status = 'successful'
      ) summary
      where c.id = target_id;
    end if;
  end loop;
  return null;
end;
$$;

drop trigger if exists donations_refresh_campaign_progress_insert_delete on public.donations;
create trigger donations_refresh_campaign_progress_insert_delete
  after insert or delete
  on public.donations
  for each row execute function public.refresh_campaign_progress();

drop trigger if exists donations_refresh_campaign_progress_update on public.donations;
create trigger donations_refresh_campaign_progress_update
  after update of status, amount_minor, donor_email, campaign_id
  on public.donations
  for each row execute function public.refresh_campaign_progress();

commit;
