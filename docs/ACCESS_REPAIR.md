# Access and feature repair

The database has two separate access checks: table grants and row-level policies.
Earlier migrations installed policies without consistently granting access to the
API roles. On databases without permissive default grants this causes `permission
denied for table`, including when a giving view reads its underlying tables.

Apply `supabase/migrations/016_restore_application_access.sql` and then
`supabase/migrations/017_analytics_overview.sql` in the SQL editor of
the **shared Supabase project used by both apps**, after the existing migrations
through 015. Both are safe to rerun. Migration 016 grants only operations already covered by
existing RLS policies, keeps those policies intact, leaves secrets inaccessible
to clients, and enables analytics change delivery. Migration 017 aggregates traffic without the
API row limit, fills days without visits and keeps the caller’s RLS restrictions. It does not recreate missing
features from 006, 011 or 015; those migrations must already be installed. Do not
rerun the whole migration folder blindly: it contains alternate repair versions.

Deploy both applications after applying the SQL. Verify:

- Signed-out contact submission reaches the admin inbox.
- Footer newsletter signup creates an active subscriber; repeated signup is safe.
- A signed-in member can like and unlike an approved community post.
- A content manager can add/edit content; a member cannot.
- A super admin can save general settings and manage administrator access.
- A finance manager can read donations; members cannot see donor records.
- Open the website and check analytics within 15 seconds. Heartbeats run every
  30 seconds and live sessions expire after two minutes.
- Support contact, social links, default SEO and feature switches reflect settings.
- Default currency initializes new gifts; a selected campaign still uses its own currency.
- Impact metrics appear on the About page once at least one value is positive.
- Access settings resolve administrator profiles without relying on a particular foreign key.
- Community engagement reads use the session client and do not require a service-role key.

API credential storage additionally requires the service-role key and the shared
`GGC_SETTINGS_ENCRYPTION_KEY` described in the deployment guide. The repair explicitly
grants the service role access to the encrypted secrets table. Never put these
keys in public environment variables.

Newsletter signup stores subscriptions only. Campaign composition, delivery and
an unsubscribe workflow are not implemented by this change. An address that
previously unsubscribed is not silently reactivated by repeat signup.

Local validation: `npm run lint`, `npm run test:access`, `npm run test:public`, `npm run test:giving`.
The access regression test uses PostgreSQL via PGlite, reproduces missing grants,
and checks both successful operations and continued RLS restrictions. It does
not prove that the production database has received the migration.
