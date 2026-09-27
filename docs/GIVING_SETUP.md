# GGChrist donation rebuild

## Status

The public and admin source changes are implemented locally. They have **not been pushed, deployed, or connected to staging**. Real Stripe payments, recurring invoices, email delivery, refunds and portal access still require staging verification before this can be called production-ready.

The user confirmed that staging exists, but its name and configuration-file location have not yet been supplied. No secret keys were requested in chat, used from an unrelated project, or included in the delivery.

## Completed in the code

### Public experience

- Rebuilt `/donate` within the existing header, footer, theme, Next.js App Router and Supabase architecture.
- Compact ministry introduction with the requested mission, scripture and Give Now link; form alongside the introduction on desktop and below it on phones.
- One-time and monthly giving; requested preset amounts, custom amounts and USD, UGX, EUR and GBP.
- Changing currency clears the amount and explains that no conversion occurred. Campaign currencies are fixed.
- Configurable giving purposes and valid campaign selection by slug; existing campaign-ID links remain accepted.
- Campaign image, description, goal, amount raised, donor count and remaining amount.
- Donor name, email, optional phone/country, anonymous giving, optional dedication and private prayer request.
- Optional, initially unchecked **4% processing contribution**, calculated on the server and disclosed in the live total. This contribution is not represented as Stripe's actual fee.
- Stripe Payment Element; supported card wallets appear through Stripe, subject to account, domain, browser and device availability. No unconfigured mobile-money or bank-transfer buttons.
- Dynamic donation button, immediate duplicate-click guard, reserved payment attempts and a persisted private status token for reloads during confirmation.
- Server-confirmed gratitude state, reference, downloadable HTML receipt, sharing, prayer-contact link and monthly giving management.
- FAQs, metadata, keyboard focus, 16px form inputs, private return pages excluded from analytics, and reduced-motion styling.

### Payments and records

- One-time gifts use Payment Intents. Monthly gifts use incomplete Stripe subscriptions and the first invoice's confirmation secret.
- All secret-key operations run on the server. The existing encrypted Admin Settings remain supported; optional environment overrides are documented.
- Server validates amounts, currency, purpose, active campaign, donor details and optional field lengths.
- Amounts are stored as integer hundredths. UGX amounts must be whole shillings, represented multiplied by 100 for Stripe compatibility.
- Each initialized gift reserves one database ID and request fingerprint. Stripe operations use stable idempotency keys. Uncertain attempts cannot be recreated after the provider's idempotency window.
- Webhook signatures validate the exact request body and timestamp. Browser redirects do not finalize payment status.
- Verified events apply donation, subscription, receipt and event-log changes in a database transaction. Invoice IDs map to deterministic donation IDs; repeats do not create another gift.
- Late failed-payment events cannot downgrade a paid gift. Late success cannot undo a refund. Older subscription events cannot reactivate a cancelled record.
- Full and partial refunds use Stripe first. Database status and refund amounts follow verified webhook events.
- Receipts use private bearer links whose hashes are stored in the database. Their signing key is the existing stable `GGC_SETTINGS_ENCRYPTION_KEY`, so normal Stripe-key rotation does not invalidate links.
- Confirmation emails reuse Resend. Failed delivery causes webhook retry after the payment record has safely committed. A stable provider idempotency key and first-attempt timestamp prevent blind resending beyond the provider's retry window.
- Shared database rate limits: 20 initialization requests per email per hour, 300 total per hour, and 10 portal requests per authenticated user per hour. Limits should be reviewed against expected launch traffic.

### Admin

- New Donations navigation and dashboard with per-currency totals, date ranges, trend chart, purpose/frequency breakdowns and currency totals.
- Search by name, email, donation reference or Stripe Payment Intent; status, currency, purpose, campaign, frequency and date filters; paginated donation results.
- Donation details, private donor information, dedication/prayer details, transaction/fee/net information, receipts, timeline and refund request form.
- Donor summaries and profiles derived from existing donation records, grouped by email and currency; historical gifts and subscriptions remain in the existing schema.
- Monthly partners, billing status, next billing date, campaign and lifetime giving. Stripe remains the authority for subscription state.
- Campaign performance and editing, including stable editable slugs, cover image, descriptions, goal, currency, dates, featured state, publication, pause, completion and archive.
- Configurable giving purposes with activation/deactivation.
- Existing `requireRole` and `is_finance_staff` authorization reused. Ordinary users cannot read financial records; finance staff cannot directly change payment or subscription status through table updates.

## Database

Apply **`supabase/migrations/015_one_page_giving.sql` from the public repository once** to the shared database, after confirming the existing migration history. Do not replay all historical migrations: the repository contains historical alternate migration filenames.

The migration runs in one transaction and preserves the existing donation/campaign/subscription tables and records.

### Extended tables

- `donations`: human reference, purpose, processing contribution, fee/net/settlement currency, refund amount/date, dedication, private prayer request and consent, country, token/request hashes, Stripe customer/subscription/invoice references, receipt-email timestamps.
- `donation_subscriptions`: purpose and event-order marker; expanded compatible status constraint.
- `campaigns`: short description, featured flag and paused state.

### New tables

- `donation_purposes`: configurable active purposes.
- `donation_receipts`: one receipt record per confirmed new-flow gift.
- `giving_requests`: private rate-limit counters.

### Existing tables reused

- `payment_events` remains the webhook event ledger.
- `donations` remains the source for donor history; no duplicate donor database is introduced.
- `audit_logs`, `admin_users`, `site_settings` and `api_secrets` remain the existing shared infrastructure.

### Functions, indexes and policies

- Reference sequence and unique donation references; unique invoice and token hashes; Payment Intent and currency/status/date indexes.
- `giving_rate_limit`, `apply_giving_event`, `begin_giving_email`, `giving_summary` and `protect_campaign_currency`.
- Updated `refresh_campaign_progress` excludes processing contributions, deducts refunds and respects campaign currency.
- Finance-only reporting views: `giving_daily`, `giving_donors`, `giving_breakdown`, `giving_currencies`, `giving_partner_totals`.
- RLS on all private tables; active purpose names are the only newly public table data.
- Privileged mutation functions are granted only to `service_role`.
- Existing admin financial SELECT policies remain. Direct admin payment/subscription UPDATE policies are removed.
- A database trigger prevents changing a campaign's currency after it has gifts.

## Stripe and public routes

| Route | Purpose |
| --- | --- |
| `/donate` | One-page giving and campaign selection |
| `/donate/success` | Confirmation from stored verified status |
| `/giving/manage` | Authenticated donor's monthly giving |
| `/api/giving/intent` | Validated, idempotent payment/subscription initialization |
| `/api/giving/status` | Private token-protected status |
| `/api/giving/receipt` | Private downloadable receipt |
| `/api/giving/portal` | Authenticated Stripe Customer Portal session |
| `/api/stripe/webhook` | Existing endpoint, extended for new giving |

Configure these webhook events:

- `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.processing`
- `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- `invoice.paid`, `invoice.payment_failed`; `invoice.payment_succeeded` is also safely accepted for existing configurations
- `charge.refunded`, `charge.updated`
- Keep `checkout.session.completed` for legacy sessions and the existing ebook checkout

Subscription and invoice retrieval use Stripe API version `2025-06-30.basil`. The new flow supports fixed monthly card-funded gifts, not trials, coupons, split invoice payments or invoices marked paid outside Stripe. Configure the portal for payment-method/billing updates and cancellation; do not enable arbitrary price switching before testing the desired donation-change policy.

The old `/api/stripe/checkout` endpoint returns a refresh instruction for new requests. Already-created hosted sessions still settle through the existing webhook. Ebook checkout is preserved.

## Admin routes

- `/donations`
- `/donations/[id]`
- `/donations/donors`
- `/donations/donors/[id]`
- `/donations/monthly-partners`
- `/donations/campaigns`
- `/donations/purposes`
- `/api/donations/[id]/receipt`
- Existing `/finance?tab=campaigns` continues to provide campaign editing. Campaign date inputs are explicitly labelled UTC.

## Manual setup required

1. Supply the staging environment name or the absolute path to its local configuration file. Do not paste secrets into chat.
2. Verify that public and admin staging point to the same intended Supabase database. Inspect deployed migrations and apply migration 015 once, before deploying the updated apps. Take the usual database backup first.
3. Reuse `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` and the shared stable `GGC_SETTINGS_ENCRYPTION_KEY` (at least 32 characters).
4. Configure matching Stripe test publishable, secret and webhook signing keys in existing Admin Settings, or use `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` environment overrides. Never set a secret key in a public variable.
5. Set the public site's actual HTTPS origin in `NEXT_PUBLIC_SITE_URL`. Register the webhook route and the events above. Register payment domains for eligible wallets and confirm the account accepts the intended currencies.
6. Configure the Stripe Customer Portal for payment details, billing details and cancellation. Test account ownership using two different donor logins.
7. Reuse the existing Resend credential and set `RESEND_FROM_EMAIL` to a verified sender. Confirm ministry contact details in site settings. Use a controlled recipient for staging email tests.
8. Keep the settings encryption key stable. Rotating it requires coordinated re-encryption of stored credentials and a private-link migration; do not replace it as part of a routine deployment.
9. Deploy the public and admin updates together after staging acceptance. No production deployment or GitHub push was performed during this task.

## Testing completed

- TypeScript checks passed for both applications.
- Production builds passed for both applications using placeholder build-time public configuration, without connecting to a real payment account.
- Four executable validation/signature tests passed: decimal/UGX rules, contribution rounding, donor/optional-field validation and invalid/replayed/tampered signature rejection.
- Isolated PostgreSQL migration tests passed for migration application, duplicate payment events, one receipt per gift, out-of-order failures/refunds, subscription event ordering, anonymous access denial, privileged function denial, rate limiting, the project's actual finance-role helper policies and the stable receipt-email retry timestamp.
- Browser checks with synthetic settings passed at 320, 375, 390, 430, 768 and 1440px with no horizontal scrolling. Monthly selection, currency reset, UGX presets, optional fee contribution and dynamic totals passed.
- Dependency audits reported zero vulnerabilities in both applications after compatible patch updates.

Run `npm ci`, `npm run lint`, `npm run build -- --webpack` in each repository. Run `npm run test:giving` in the public repository using Node 24 (the application itself retains the existing Node >=20.9 requirement).

### Still required before launch

- Real test-mode one-time card success, decline, authentication challenge, duplicate click and reload during payment.
- First subscription invoice, subsequent invoice, failed renewal, cancellation and subscription updates using Stripe test clocks where appropriate.
- Live delivery/replay of signed webhooks to staging, including missing-record recovery and account/API-version compatibility.
- Real receipt email delivery, downloadable receipt contents and authenticated portal ownership checks.
- Admin login-role checks, search/filter results against staging data, full/partial Stripe refunds and end-to-end campaign totals.
- Apple Pay/Google Pay on eligible devices and domains, plus final visual/accessibility checks after the last refinements.

Automatic approval review blocked the final browser recheck because of a usage-limit error. It was not bypassed. Included screenshots are earlier synthetic-data layout previews: they do not demonstrate a configured Payment Element or a successful payment.

## Operational notes

- A successful payment is not rolled back when email delivery fails. Stripe retries the webhook; the database payment stays confirmed. If email delivery remains uncertain beyond 23 hours from its first attempt, inspect Resend delivery records before reconciling or resending manually.
- Donor profiles group records by email and currency. Guest signups do not reuse another customer's Stripe account solely because an unverified email matches. Authenticated portal access requires a verified matching email.
- Financial settlement fees can use a different currency from the gift. They are labelled separately rather than added across currencies. Campaign totals exclude optional processing support and deduct refunds conservatively from the gift first.
- Existing historical hosted-checkout records retain their established data model. Admin receipts are available for paid history; automatic private-link receipts and confirmation emails are implemented for the new giving flow.
- The receipt is a downloadable, branded HTML document that can be printed or saved as PDF in a browser. No tax-deductibility claim is made.
- Optional donor wall, leaderboards, mobile sticky bar, mobile money and bank transfer were not added.

## Primary implementation references

- [Stripe Payment Element and deferred subscriptions](https://docs.stripe.com/payments/accept-a-payment-deferred?platform=web&type=subscription)
- [Stripe currency rules, including UGX](https://docs.stripe.com/currencies)
- [Stripe invoice payment mapping](https://docs.stripe.com/api/invoice-payment)

## Important files changed

### ggchrist

- `.env.example`
- `.gitignore`
- `app/api/giving/intent/route.ts`
- `app/api/giving/portal/route.ts`
- `app/api/giving/receipt/route.ts`
- `app/api/giving/status/route.ts`
- `app/api/stripe/checkout/route.ts`
- `app/api/stripe/session/route.ts`
- `app/api/stripe/webhook/route.ts`
- `app/donate/page.tsx`
- `app/donate/success/page.tsx`
- `app/giving/manage/page.tsx`
- `app/globals.css`
- `components/analytics-tracker.tsx`
- `components/donation-form.tsx`
- `components/giving-status.tsx`
- `lib/giving/server.ts`
- `lib/giving/shared.ts`
- `lib/giving/signature.ts`
- `lib/giving/webhook.ts`
- `lib/server-secrets.ts`
- `lib/stripe.ts`
- `package-lock.json`
- `package.json`
- `supabase/migrations/015_one_page_giving.sql`
- `tests/giving-database.test.mjs`
- `tests/giving.test.mjs`

Base commit: `7666b04c4b96ed225e558686e514d4536dc1bcc4`.

### ggchrist-admin

- `.env.example`
- `.gitignore`
- `app/(dashboard)/donations/[id]/page.tsx`
- `app/(dashboard)/donations/actions.ts`
- `app/(dashboard)/donations/campaigns/page.tsx`
- `app/(dashboard)/donations/donors/[id]/page.tsx`
- `app/(dashboard)/donations/donors/page.tsx`
- `app/(dashboard)/donations/monthly-partners/page.tsx`
- `app/(dashboard)/donations/page.tsx`
- `app/(dashboard)/donations/purposes/page.tsx`
- `app/(dashboard)/finance/actions.ts`
- `app/(dashboard)/finance/page.tsx`
- `app/api/donations/[id]/receipt/route.ts`
- `components/admin-sidebar.tsx`
- `lib/server-secrets.ts`
- `package-lock.json`

Base commit: `5b1ad655794c3020395cd65c3d7838dc925c7329`.

## Cloudflare deployment update

Both apps now include OpenNext/Wrangler dependencies, Worker configuration, separate R2 cache bindings, image bindings, immutable static-asset headers, and build/preview/deploy scripts. Receipt logos are embedded in the bundle so private receipts do not read a runtime filesystem.

Validation: both OpenNext production builds and Wrangler deployment dry runs passed using synthetic public configuration. Donation validation/signature tests and all eight isolated database scenarios passed again. Dependency installation reported zero vulnerabilities. These checks do not verify external services or publish any resources.

OpenNext warns that Next.js Node middleware support is experimental; verify Supabase login, logout, session renewal and admin authorization on staging. Cloudflare is not authenticated locally, and target domains and staging configuration have not been supplied. See `Cloudflare-Deployment.md` (or `docs/CLOUDFLARE_DEPLOYMENT.md` in each repository) for setup and launch steps.
