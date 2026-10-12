# Supabase account setup

Supabase Auth stores registrations in its managed `auth.users` table. This project supports email/password registration, email/password sign-in, password reset, and Google OAuth.

## Profile details

The account page stores the customer's display name, phone number, country, country code, and state/province/region in their Supabase Auth user metadata. Customers enter and save these details after signing in; location is not inferred from their device or IP address. This keeps profile editing available without a separate table migration. These values are for display/contact purposes only and are not used for authorization.

## Optional profile table

Apply `migrations/20261012091621_create_profiles.sql` only if you choose to move profile details into a separate relational table. In the Supabase Dashboard, open **SQL Editor**, paste the migration contents, and run it. The table has row-level security; signed-in users can only read, create, and update the profile row whose ID matches their own Auth user ID.

This repository is not linked to a Supabase project yet, and the browser publishable key cannot apply database migrations. The SQL file is ready, but it has not been applied to the hosted project.

## Marketplace database

Before using the marketplace, apply `migrations/20261012170000_create_marketplace.sql` in the Supabase Dashboard SQL Editor. This repository does not have the Supabase CLI or a linked project configured in this workspace, so the migration has not been applied to the hosted database. The migration creates seller stores, listings, private buyer/seller messages, listing reports, and server-only order and payout tables. It enables RLS and explicit grants; public visitors can only read active listings and approved seller profiles. Orders, reports and payout references are server-only.

New seller applications and product listings start as `pending`. Review a seller from the SQL Editor after verifying their business and payment onboarding:

```sql
update public.marketplace_sellers
set status = 'approved', updated_at = now()
where user_id = '<seller-auth-user-uuid>';
```

Review listing accuracy and legal eligibility before publishing it:

```sql
update public.marketplace_listings
set status = 'active', updated_at = now()
where id = '<listing-uuid>' and status = 'pending';
```

Buyer checkout is separately disabled for each seller by default. Only after verifying the seller's Flutterwave/identity onboarding and signing a written settlement agreement, enable that seller's NGN checkout:

```sql
update public.marketplace_sellers
set checkout_enabled = true, updated_at = now()
where user_id = '<seller-auth-user-uuid>'
  and status = 'approved';
```

Set it back to `false` to pause checkout. Buyer funds go to the Graphite19Stores Flutterwave merchant account. Seller payouts are manual under separate written terms; there is no automatic split-payment or payout integration.

Only trusted project administrators should run these moderation statements. The client cannot set seller or listing approval status. Reports can be submitted by signed-in users; their records are available only to trusted server-side/admin access.

Seller settlement information is intentionally not exposed to the browser. Flutterwave secret keys, webhook hash, orders and payment state remain server-side. Checkout stays disabled unless both `MARKETPLACE_PAYMENTS_ENABLED=true` and the seller's `checkout_enabled` database flag are set.

## Site analytics

Enable **Analytics** for the project in the Vercel dashboard to see Vercel's visitor and page-view reports. The app also records route views in `public.site_page_views` after you apply `migrations/20261012150542_create_site_visit_analytics.sql` to Supabase. It stores the page path, timestamp, and a random per-tab session ID; it does not store names, emails, or IP addresses. The public app can insert records but cannot read or edit them through the Data API.

To review counts in Supabase SQL Editor:

```sql
select
  count(*) as page_views,
  count(distinct session_id) as visitor_sessions
from public.site_page_views;
```

`visitor_sessions` is an estimate of browser-tab sessions, not a count of distinct people. Vercel Analytics provides the visitor reports in its dashboard.

## Enable Google sign-in

In **Authentication → Sign-in providers**, enable Google and enter the Google OAuth web client ID and client secret. Add your local and production `/account` and `/reset-password` URLs to Supabase's redirect URL allow list. Password recovery sends the user to `/reset-password`, where the site checks the recovery session before accepting a new password. In Google Cloud, add your site origin as an authorized JavaScript origin and the Supabase Auth callback shown in the Google provider settings as an authorized redirect URI.

Email/password registration uses Supabase Auth. If email confirmation is enabled in the project, new users must confirm their email before they can sign in. Set the Auth Site URL and redirect allow list to the site URLs you use.
