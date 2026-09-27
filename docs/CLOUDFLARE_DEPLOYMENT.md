# Deploy GGChrist on Cloudflare Workers

Both repositories use OpenNext to run their existing Next.js server features on Cloudflare Workers. Supabase remains the database and authentication service; Stripe remains the payment provider.

## Account setup

1. Sign in locally with `npx wrangler login` in either repository, or configure a scoped Cloudflare API token in your deployment environment. Do not commit tokens.
2. Enable Workers and R2 on the chosen account. Create separate buckets with `npx wrangler r2 bucket create ggchrist-next-cache` and `npx wrangler r2 bucket create ggchrist-admin-next-cache`.
3. The configured Worker names are `ggchrist` and `ggchrist-admin`. If changing them, also update each `WORKER_SELF_REFERENCE` service binding. Configure your chosen custom domains in Cloudflare after deployment.

## Configuration

Use each repository's `.env.example` as the inventory. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL` at build time and runtime. The site URL must be that app's actual HTTPS domain. Configure the public Stripe publishable key if using its environment override.

Store `SUPABASE_SERVICE_ROLE_KEY`, `GGC_SETTINGS_ENCRYPTION_KEY`, and any Stripe/Resend secret overrides as encrypted Worker secrets. Both apps must share the same existing encryption key and Supabase project. Public values needed during compilation must also exist in the build environment. Server credentials must never have a NEXT_PUBLIC prefix. Existing encrypted Admin Settings remain supported.

For a local Worker preview, copy `.dev.vars.example` to the ignored `.dev.vars` and fill in test configuration; also provide the public build variables in an ignored `.env.local`. Never deploy synthetic example settings.

## Build and deploy

In each repository:

```sh
npm ci
npm run build:cloudflare
npm run deploy
```

`deploy` rebuilds and publishes, preserving dashboard runtime variables. For Cloudflare Workers Builds connected to GitHub, set the build command to `npm run build:cloudflare` and the deploy command to `npx opennextjs-cloudflare deploy -- --keep-vars`. Set the corresponding repository root and supply build variables separately from runtime secrets.

Use `npm run preview` for a local Workers runtime preview. The R2 binding stores the Next.js cache; the IMAGES binding handles image optimization. Check the account's feature availability and limits before launch.

## Staging acceptance and launch

Apply migration 015 once to the shared staging database, following GIVING_SETUP.md. Set Supabase authentication site/redirect URLs for both chosen domains. Point the Stripe test webhook at the public site's `/api/stripe/webhook`, configure its signing secret, and subscribe to the events listed in GIVING_SETUP.md. Register the donation domain with Stripe for supported wallets. Configure a verified Resend sender and receipt email settings.

Complete one-time and monthly test payments, declined payments, duplicate webhook delivery, renewals, full/partial refunds, receipt emails, and portal access before switching to live credentials. Keep the staging and production databases, Stripe modes and webhook secrets aligned.

## Verification status

Cloudflare account login, domains and staging configuration are still required. No Worker has been published by this task.

References: https://opennext.js.org/cloudflare/get-started and https://opennext.js.org/cloudflare/howtos/env-vars

Both Worker builds and deployment dry runs passed with synthetic settings. OpenNext flags Node middleware as experimental; validate authentication and session renewal on staging.
