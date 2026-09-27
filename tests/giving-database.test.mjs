import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
const core = fs.readFileSync(
  new URL("../supabase/migrations/001_core_schema.sql", import.meta.url),
  "utf8",
);
const types = core
  .split("\n")
  .filter(
    (l) =>
      l.startsWith("create type public.donation_frequency") ||
      l.startsWith("create type public.payment_status"),
  )
  .join("\n");
const security = fs.readFileSync(
  new URL("../supabase/migrations/002_row_level_security.sql", import.meta.url),
  "utf8",
);
const authHelpers = security.slice(
  security.indexOf("create or replace function public.is_admin()"),
  security.indexOf(
    "create or replace function public.protect_profile_security_fields()",
  ),
);
const adminEnum = core.slice(
  core.indexOf("create type public.admin_role"),
  core.indexOf("create type public.content_status"),
);
const tables = core.slice(
  core.indexOf("create table public.campaigns ("),
  core.indexOf("create table public.expenses ("),
);
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;${types}\n${tables}
${adminEnum}
create schema auth;
create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table admin_users(user_id uuid,role public.admin_role,is_active boolean);
${authHelpers}
alter table donations enable row level security;alter table donation_subscriptions enable row level security;alter table payment_events enable row level security;
create policy donations_finance_read on donations for select to authenticated using(is_finance_staff());
create policy donation_subscriptions_finance_read on donation_subscriptions for select to authenticated using(is_finance_staff());
grant select on donations,donation_subscriptions,payment_events to authenticated,anon;
alter table donation_subscriptions add column stripe_customer_id text,add column stripe_subscription_id text;
alter table campaigns add column raised_amount_minor bigint not null default 0,add column donation_count bigint not null default 0,add column donor_count bigint not null default 0;
`);
await db.exec(
  fs.readFileSync(
    new URL("../supabase/migrations/015_one_page_giving.sql", import.meta.url),
    "utf8",
  ),
);
console.log("PASS migration applies to existing donation schema");
const id = "12345678-1234-4234-a234-123456789012";
const d = {
  id,
  donor_name: "Test Donor",
  donor_email: "test@example.test",
  amount_minor: 5200,
  currency: "USD",
  frequency: "one_time",
  provider_reference: "giving_test",
  provider_transaction_id: "pi_test",
  status: "successful",
  purpose: "Gospel Outreach",
  processing_contribution: 200,
  paid_at: new Date().toISOString(),
  is_anonymous: true,
  access_token_hash: "test",
};
const apply = async (event, record, sub = null) =>
  db.query("select apply_giving_event($1,$2,$3,$4::jsonb,$5::jsonb)", [
    event,
    "payment_intent.succeeded",
    "pi_test",
    record ? JSON.stringify(record) : null,
    sub ? JSON.stringify(sub) : null,
  ]);
await apply("evt_1", d);
await apply("evt_1", d);
await apply("evt_2", d);
assert.equal(
  (await db.query("select count(*)::int n from donations")).rows[0].n,
  1,
);
assert.equal(
  (await db.query("select count(*)::int n from donation_receipts")).rows[0].n,
  1,
);
console.log(
  "PASS duplicate events and same-payment events produce one gift and receipt",
);
await apply("evt_failed_late", { ...d, status: "failed", paid_at: null });
assert.equal(
  (await db.query("select status from donations")).rows[0].status,
  "successful",
);
await apply("evt_partial", { ...d, refunded_amount: 1000 });
assert.equal(
  (await db.query("select refunded_amount::int n from donations")).rows[0].n,
  1000,
);
await apply("evt_refund", { ...d, status: "refunded", refunded_amount: 5200 });
await apply("evt_stale_paid", d);
const saved = (
  await db.query(
    "select status,refunded_amount::int amount,reference from donations",
  )
).rows[0];
assert.equal(saved.status, "refunded");
assert.equal(saved.amount, 5200);
assert.match(saved.reference, /^GGC-DON-\d{4}-\d{8}$/);
console.log(
  "PASS out-of-order failures, partial refunds and late success cannot undo refund",
);
const s = {
  id,
  donor_name: "Test Donor",
  donor_email: "test@example.test",
  amount_minor: 2500,
  currency: "USD",
  frequency: "monthly",
  purpose: "Missions",
  stripe_subscription_id: "sub_test",
  stripe_customer_id: "cus_test",
  status: "cancelled",
  stripe_event_created: 200,
};
await apply("evt_sub_new", null, s);
await apply("evt_sub_old", null, {
  ...s,
  status: "active",
  stripe_event_created: 100,
});
assert.equal(
  (await db.query("select status from donation_subscriptions")).rows[0].status,
  "cancelled",
);
console.log(
  "PASS older subscription event cannot reactivate cancelled partnership",
);
await db.exec("set role anon");
assert.equal((await db.query("select * from donations")).rows.length, 0);
await assert.rejects(db.query("select giving_rate_limit('x',20)"));
await assert.rejects(
  db.query("select apply_giving_event('x','x','x',null,null)"),
);
await db.exec("reset role");
console.log(
  "PASS public cannot read donor data or call privileged payment functions",
);
for (let i = 0; i < 3; i++)
  assert.equal(
    (await db.query("select giving_rate_limit('rate_test',3) allowed")).rows[0]
      .allowed,
    true,
  );
assert.equal(
  (await db.query("select giving_rate_limit('rate_test',3) allowed")).rows[0]
    .allowed,
  false,
);
console.log("PASS database-backed rate limit");
await db.exec("set role authenticated");
assert.equal((await db.query("select * from donations")).rows.length, 0);
await db.exec(
  "reset role;insert into admin_users values('99999999-9999-4999-a999-999999999999','finance_manager',true);set role authenticated;set request.jwt.claim.sub='99999999-9999-4999-a999-999999999999'",
);
assert.equal((await db.query("select * from donations")).rows.length, 1);
await assert.rejects(db.query("update donations set status='successful'"));
await db.exec("reset role");
console.log(
  "PASS actual existing finance authorization helpers deny ordinary users and permit finance reads only",
);
const first = (await db.query("select begin_giving_email($1) started", [id]))
  .rows[0].started;
const second = (await db.query("select begin_giving_email($1) started", [id]))
  .rows[0].started;
assert.equal(String(first), String(second));
console.log(
  "PASS receipt email retry window retains its first-attempt timestamp",
);
await db.close();
