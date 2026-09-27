# GGChrist Public Website

The public Glorious Gospel of Christ website, built with Next.js 16, React 19, TypeScript, Tailwind CSS, and Supabase.

## Included

- Server-rendered, SEO-friendly articles, devotions, Bible teachings, Bible Kids, ebooks, About, and Contact pages
- Supabase authentication and moderated community posts, prayer requests, and testimonies
- Stripe Checkout for one-time and recurring donations and ebook purchases
- Webhook-confirmed ebook orders, private signed downloads, optional Resend delivery email, and physical fulfillment records
- Signed Stripe webhook verification, amount validation, idempotent events, and webhook-only payment writes
- Supabase Storage for public media, avatars, devotion audio, private receipts, and private ebooks
- Sitemap, robots.txt, canonical metadata, responsive navigation, and a real 404 page
- Fully rebuilt premium responsive interface with custom editorial typography, ministry-specific visual language, and optimized original hero photography

## Local setup

1. Use Node.js 20.9 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in the server-only values locally.
4. Run `npm run dev` and open `http://localhost:3000`.

The Supabase publishable key is safe for browser use because access is controlled by Row Level Security. Never expose or commit the Supabase service-role key or `GGC_SETTINGS_ENCRYPTION_KEY`.

## Database

Apply migrations in numerical order. For an existing GGChrist installation that already has `001`–`010`, run `011_community_engagement_google_theme.sql`. It adds moderated likes, comments and shares for public content and Community posts, counter synchronization, Admin comment notifications, and Google-profile metadata support.

## Google community login

1. In Supabase, open **Authentication → Providers → Google** and enable Google.
2. In Google Cloud Console, create OAuth web credentials and add the Supabase callback shown by the provider screen (normally `https://YOUR-PROJECT.supabase.co/auth/v1/callback`).
3. Copy the Google Client ID and Client Secret into the Supabase Google provider settings.
4. In **Authentication → URL Configuration**, set the production site URL and add `https://YOUR-PUBLIC-DOMAIN/auth/callback` plus `http://localhost:3000/auth/callback` as redirect URLs.

Google secrets remain in Supabase and are never included in either website bundle.

## Stripe test configuration

Set the same `GGC_SETTINGS_ENCRYPTION_KEY` (at least 32 random characters) and Supabase service-role key in both deployments. Add Stripe test credentials in **Admin → Settings → API**, then configure Stripe to send `checkout.session.completed`, `invoice.paid`, `invoice.payment_succeeded`, and `customer.subscription.deleted` to:

`https://YOUR-PUBLIC-DOMAIN/api/stripe/webhook`

The public browser never marks payment records successful. Stripe redirects back to the site for user feedback, but only a verified webhook confirms donations and paid ebook orders in Supabase. Ebook checkout uses the trusted database price; card inputs are hosted by Stripe.

For ebook delivery email, add a Resend API key under **Admin → Settings → API**, verify the sending domain in Resend, and set `RESEND_FROM_EMAIL` on the Public deployment. Successful digital purchases also receive an immediate protected download on `/checkout/success`, so payment fulfillment does not depend on email delivery.

## Verification

- `npm run lint` performs the TypeScript check.
- `npm run build` creates the production Next.js build.
