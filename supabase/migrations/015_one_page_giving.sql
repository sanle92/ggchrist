-- Additive donation upgrade; apply once to the shared public/admin database.
begin;
create sequence if not exists public.giving_reference_seq;
alter table public.donations
 add column if not exists reference text unique default ('GGC-DON-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.giving_reference_seq')::text, 8, '0')),
 add column if not exists purpose text not null default 'Where Needed Most',
 add column if not exists processing_contribution bigint not null default 0 check (processing_contribution >= 0),
 add column if not exists processing_fee bigint,
 add column if not exists net_amount bigint,
 add column if not exists fee_currency text,
 add column if not exists refunded_amount bigint not null default 0 check (refunded_amount >= 0),
 add column if not exists refunded_at timestamptz,
 add column if not exists dedication_type text check (dedication_type in ('honor','memory')),
 add column if not exists dedication_name text,
 add column if not exists dedication_message text,
 add column if not exists prayer_request text,
 add column if not exists prayer_team_requested boolean not null default false,
 add column if not exists access_token_hash text unique,
 add column if not exists country text,
 add column if not exists request_hash text,
 add column if not exists stripe_customer_id text,
 add column if not exists stripe_subscription_id text,
 add column if not exists stripe_invoice_id text unique,
 add column if not exists email_sent_at timestamptz,
 add column if not exists email_attempted_at timestamptz;
create index if not exists donations_payment_intent_idx on public.donations(provider_transaction_id);
create index if not exists donations_giving_filter_idx on public.donations(currency,status,created_at desc);
alter table public.donation_subscriptions add column if not exists purpose text not null default 'Where Needed Most', add column if not exists stripe_event_created bigint not null default 0;
alter table public.donation_subscriptions drop constraint if exists donation_subscriptions_status_check;
alter table public.donation_subscriptions add constraint donation_subscriptions_status_check check (status in ('pending','active','paused','cancelled','completed','failed','trialing','past_due','unpaid','incomplete','incomplete_expired'));
alter table public.campaigns drop constraint if exists campaigns_status_check;
alter table public.campaigns add constraint campaigns_status_check check(status in ('draft','active','paused','completed','archived'));
create table public.donation_purposes (name text primary key, active boolean not null default true, sort_order integer not null default 0);
insert into public.donation_purposes(name,sort_order) values ('Where Needed Most',0),('General Ministry',1),('Gospel Outreach',2),('Missions',3),('Media & Online Ministry',4),('Bible Teaching & Devotions',5),('Community Support',6),('Ministry Projects',7);
alter table public.donation_purposes enable row level security;
create policy giving_purposes_read on public.donation_purposes for select to anon,authenticated using(active);
create policy giving_purposes_manage on public.donation_purposes for all to authenticated using(public.is_finance_staff()) with check(public.is_finance_staff());
create table public.donation_receipts (donation_id uuid primary key references public.donations(id), receipt_number text not null unique, issued_at timestamptz not null default now());
alter table public.donation_receipts enable row level security;
create policy giving_receipts_finance on public.donation_receipts for select to authenticated using(public.is_finance_staff());
create table public.giving_requests (key text primary key, bucket timestamptz not null, attempts integer not null);
alter table public.giving_requests enable row level security;
revoke all on public.giving_requests from anon,authenticated;
create function public.giving_rate_limit(p_key text,p_limit integer) returns boolean language plpgsql security definer set search_path=public as $$
declare count_now integer;
begin
 insert into giving_requests values(p_key,date_trunc('hour',now()),1)
 on conflict(key) do update set bucket=excluded.bucket,attempts=case when giving_requests.bucket=excluded.bucket then giving_requests.attempts+1 else 1 end returning attempts into count_now;
 return count_now<=p_limit;
end; $$;
revoke all on function public.giving_rate_limit(text,integer) from public,anon,authenticated;
grant execute on function public.giving_rate_limit(text,integer) to service_role;
-- Only verified server events may mutate financial state. Existing admin SELECT policies remain.
drop policy if exists donations_finance_update on public.donations;
drop policy if exists donation_subscriptions_finance_update on public.donation_subscriptions;
create function public.apply_giving_event(p_event_id text,p_type text,p_object_id text,p_donation jsonb,p_subscription jsonb) returns void language plpgsql security definer set search_path=public as $$
declare d donations; s donation_subscriptions;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_object_id,0));
 if exists(select 1 from payment_events where event_fingerprint=p_event_id and processed) then return; end if;
 if p_subscription is not null then
  s:=jsonb_populate_record(null::donation_subscriptions,p_subscription);
  insert into donation_subscriptions(id,donor_name,donor_email,donor_phone,campaign_id,amount_minor,currency,frequency,status,stripe_customer_id,stripe_subscription_id,purpose,next_payment_at,cancelled_at,stripe_event_created)
  values(s.id,s.donor_name,s.donor_email,s.donor_phone,s.campaign_id,s.amount_minor,s.currency,s.frequency,s.status,s.stripe_customer_id,s.stripe_subscription_id,s.purpose,s.next_payment_at,s.cancelled_at,s.stripe_event_created)
  on conflict(id) do update set amount_minor=excluded.amount_minor,currency=excluded.currency,status=excluded.status,next_payment_at=excluded.next_payment_at,cancelled_at=excluded.cancelled_at,stripe_event_created=excluded.stripe_event_created,updated_at=now() where donation_subscriptions.stripe_event_created<=excluded.stripe_event_created;
 end if;
 if p_donation is not null then
  d:=jsonb_populate_record(null::donations,p_donation);
  insert into donations(id,donor_name,donor_email,donor_phone,country,amount_minor,currency,frequency,provider_reference,provider_transaction_id,provider,payment_method,status,campaign_id,subscription_id,purpose,processing_contribution,is_anonymous,stripe_customer_id,stripe_subscription_id,stripe_invoice_id,access_token_hash,paid_at,processing_fee,net_amount,fee_currency,refunded_amount,refunded_at)
  values(d.id,d.donor_name,d.donor_email,d.donor_phone,d.country,d.amount_minor,d.currency,d.frequency,d.provider_reference,d.provider_transaction_id,'stripe','stripe_payment_element',d.status,d.campaign_id,d.subscription_id,d.purpose,d.processing_contribution,coalesce(d.is_anonymous,false),d.stripe_customer_id,d.stripe_subscription_id,d.stripe_invoice_id,d.access_token_hash,d.paid_at,d.processing_fee,d.net_amount,d.fee_currency,coalesce(d.refunded_amount,0),d.refunded_at)
  on conflict(id) do update set
   status=case when donations.status='refunded' then donations.status when excluded.status in ('pending','processing','failed') and donations.status='successful' then donations.status else excluded.status end,
   provider_transaction_id=coalesce(excluded.provider_transaction_id,donations.provider_transaction_id),
   stripe_invoice_id=coalesce(excluded.stripe_invoice_id,donations.stripe_invoice_id),
   subscription_id=coalesce(excluded.subscription_id,donations.subscription_id),
   paid_at=coalesce(donations.paid_at,excluded.paid_at),
   refunded_amount=greatest(donations.refunded_amount,coalesce(d.refunded_amount,0)),
   refunded_at=coalesce(d.refunded_at,donations.refunded_at),
   processing_fee=coalesce(d.processing_fee,donations.processing_fee), net_amount=coalesce(d.net_amount,donations.net_amount),fee_currency=coalesce(d.fee_currency,donations.fee_currency),updated_at=now();
  if d.status='successful' then
   insert into donation_receipts(donation_id,receipt_number) select id,reference from donations where id=d.id on conflict do nothing;
  end if;
 end if;
 insert into payment_events(provider,event_type,provider_reference,event_fingerprint,payload,processed,processed_at)
 values('stripe',p_type,p_object_id,p_event_id,'{}',true,now())
 on conflict(event_fingerprint) do update set processed=true,processed_at=now(),processing_error=null;
end; $$;
revoke all on function public.apply_giving_event(text,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.apply_giving_event(text,text,text,jsonb,jsonb) to service_role;
-- Invoker views preserve the existing finance-only row policies.
create or replace view public.giving_daily with (security_invoker=true) as
 select (paid_at at time zone 'Africa/Kampala')::date as day,currency,sum(amount_minor-refunded_amount) as amount_minor,count(*) as gifts from public.donations where paid_at is not null group by 1,2;
create or replace view public.giving_donors with (security_invoker=true) as
 select lower(donor_email) as email,currency,max(donor_name) as name,count(*) as donation_count,min(paid_at) as first_gift,max(paid_at) as latest_gift,sum(amount_minor-refunded_amount) as total_minor,bool_or(frequency='monthly') as monthly,min(id::text) as profile_id from public.donations where paid_at is not null group by 1,2;
create or replace function public.giving_summary(p_currency text,p_start timestamptz,p_end timestamptz) returns jsonb language sql stable security invoker set search_path=public as $$
 select jsonb_build_object(
 'total',coalesce(sum(amount_minor-refunded_amount),0),
 'count',count(*),
 'average',coalesce(avg(amount_minor-refunded_amount),0),
 'gross',coalesce(sum(amount_minor),0),
 'refunded',coalesce(sum(refunded_amount),0),
 'fees',sum(processing_fee) filter(where fee_currency=p_currency),
 'net',sum(net_amount) filter(where fee_currency=p_currency),
 'fees_count',count(processing_fee) filter(where fee_currency=p_currency),
 'today',coalesce(sum(amount_minor-refunded_amount) filter(where (paid_at at time zone 'Africa/Kampala')::date=(now() at time zone 'Africa/Kampala')::date),0),
 'month',coalesce(sum(amount_minor-refunded_amount) filter(where date_trunc('month',paid_at at time zone 'Africa/Kampala')=date_trunc('month',now() at time zone 'Africa/Kampala')),0))
 from donations where currency=p_currency and paid_at>=p_start and paid_at<p_end;
$$;
create or replace view public.giving_breakdown with (security_invoker=true) as
 select currency,purpose,frequency,count(*) as gifts,sum(amount_minor-refunded_amount) as amount_minor from public.donations where paid_at is not null group by 1,2,3;
grant select on public.giving_daily,public.giving_donors,public.giving_breakdown to authenticated;
revoke all on function public.giving_summary(text,timestamptz,timestamptz) from public,anon;
grant execute on function public.giving_summary(text,timestamptz,timestamptz) to authenticated;

create or replace function public.refresh_campaign_progress() returns trigger language plpgsql security definer set search_path=public as $$
declare target_id uuid; ids uuid[];
begin
 if tg_op='INSERT' then ids:=array[new.campaign_id]; elsif tg_op='DELETE' then ids:=array[old.campaign_id]; else ids:=array[old.campaign_id,new.campaign_id]; end if;
 foreach target_id in array ids loop
  if target_id is not null then
   perform pg_advisory_xact_lock(hashtextextended(target_id::text,1));
   update campaigns c set raised_amount_minor=x.raised,donation_count=x.gifts,donor_count=x.donors,updated_at=now()
   from (select coalesce(sum(greatest(0,d.amount_minor-d.processing_contribution-d.refunded_amount)),0) as raised,count(*) as gifts,count(distinct lower(d.donor_email)) as donors from donations d join campaigns c2 on c2.id=d.campaign_id where d.campaign_id=target_id and d.currency=c2.currency and d.status='successful') x where c.id=target_id;
  end if;
 end loop;
 return null;
end; $$;
drop trigger if exists donations_refresh_campaign_progress_update on public.donations;
create trigger donations_refresh_campaign_progress_update after update of status,amount_minor,processing_contribution,refunded_amount,donor_email,campaign_id on public.donations for each row execute function public.refresh_campaign_progress();

grant select on public.donation_purposes to anon,authenticated;
grant insert,update,delete on public.donation_purposes to authenticated;
grant select on public.donation_receipts to authenticated;
grant all on public.donation_purposes,public.donation_receipts,public.giving_requests to service_role;
create function public.begin_giving_email(p_id uuid) returns timestamptz language sql security definer set search_path=public as $$
 update donations set email_attempted_at=coalesce(email_attempted_at,now()) where id=p_id and email_sent_at is null returning email_attempted_at;
$$;
revoke all on function public.begin_giving_email(uuid) from public,anon,authenticated;
grant execute on function public.begin_giving_email(uuid) to service_role;

alter table public.campaigns add column if not exists short_description text not null default '',add column if not exists featured boolean not null default false;

create or replace view public.giving_currencies with (security_invoker=true) as select currency,count(*) as gifts,sum(amount_minor-refunded_amount) as amount_minor from public.donations where paid_at is not null group by currency;
grant select on public.giving_currencies to authenticated;

grant usage,select on sequence public.giving_reference_seq to service_role;

alter table public.donations enable row level security;
alter table public.donation_subscriptions enable row level security;
alter table public.payment_events enable row level security;
alter table public.donations add constraint giving_contribution_within_total check(processing_contribution<=amount_minor),add constraint giving_refund_within_total check(refunded_amount<=amount_minor);
create function public.protect_campaign_currency() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.currency is distinct from old.currency and exists(select 1 from donations where campaign_id=old.id) then raise exception 'A campaign with gifts must retain its currency'; end if;
 return new;
end; $$;
create trigger campaigns_protect_currency before update of currency on public.campaigns for each row execute function public.protect_campaign_currency();
revoke all on function public.protect_campaign_currency() from public,anon,authenticated;
create or replace view public.giving_partner_totals with (security_invoker=true) as select subscription_id,currency,sum(amount_minor-refunded_amount) as amount_minor from public.donations where paid_at is not null and subscription_id is not null group by subscription_id,currency;
grant select on public.giving_partner_totals to authenticated;
commit;
