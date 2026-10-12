# Graphite19Stores

A responsive React storefront built with Vite. The catalog reads from a server-side Printify endpoint, with curated fallback products if Printify is unavailable. Supabase Auth supports email/password registration and sign-in, Google OAuth, password reset, and customer profiles.

The site also includes an early multi-vendor marketplace for independent seller applications, reviewed listings (clothes, cars, PCs, watches and other categories), buyer-seller messages, and listing reports. Marketplace database setup and moderation are documented in [supabase/README.md](supabase/README.md). The Graphite19 label remains a separate catalog.

## Local setup

1. Copy `.env.example` to `.env` (already ignored by Git).
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from your Supabase project. In Supabase Authentication, enable Google and add the local and production `/account` and `/reset-password` URLs to the redirect URL allow list.
3. Set `PRINTIFY_API_KEY` and `PRINTIFY_SHOP_ID` in the server environment. Keep these server-only values out of any `VITE_` variable and out of source control.
4. For delivery address suggestions, enable Google Maps Platform's Places API (New) and set the server-only `GOOGLE_MAPS_API_KEY`.
5. Apply both marketplace migrations described in [supabase/README.md](supabase/README.md) before using seller or marketplace pages.
6. Run `npm run dev`.

## Production hosting

Build with `npm run build` and publish the generated `dist/` directory from the project root. Vite bundles the imported CSS into `/assets/`; keep those generated files alongside `dist/index.html` when deploying. The included `public/_redirects` and `vercel.json` configure Netlify and Vercel to serve the React app for direct visits and refreshes on routes such as `/shop` and `/login`. Deployments should serve the site at the domain root.

Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as build-time environment variables on the hosting provider. Configure `PRINTIFY_API_KEY` and `PRINTIFY_SHOP_ID` as server-side environment variables. The API routes share one Vercel function at `api/[...path].js`, which keeps the deployment within the Hobby function limit.

Configure `GOOGLE_MAPS_API_KEY`, `FLW_SECRET_KEY`, `FLW_SECRET_HASH`, `SUPABASE_SECRET_KEY` and `APP_BASE_URL` as server-only environment variables in local `.env` and Vercel. The admin page and marketplace moderation API require `SUPABASE_SECRET_KEY`; keep it server-side and never prefix it with `VITE_`. Only the authenticated `graphite19stores@gmail.com` account can use `/admin`. Set `MARKETPLACE_PAYMENTS_ENABLED=true` only after Flutterwave sandbox verification and written seller settlement terms are in place; it defaults to `false`. Marketplace checkout is NGN-only, is collected into the platform Flutterwave account, and has no automatic seller split. Checkout is enabled seller by seller after approval and settlement terms are agreed. Delivery fees are agreed separately with the seller and are not collected through marketplace checkout.

The live sitemap is served at `/sitemap.xml`; it lists public pages and visible products from the connected Printify catalog. `public/robots.txt` references the sitemap. After deploying, submit `https://graphite19-stores.vercel.app/sitemap.xml` in Google Search Console to help Google discover the store URLs.

Vercel Web Analytics is included for traffic reporting. Enable it from the project's **Analytics** section in the Vercel dashboard. For database page-view records and visitor-session counts, apply the analytics migration and use the SQL query in [supabase/README.md](supabase/README.md).

The Vite development server exposes the same API paths locally; production dispatches those paths through the single Vercel catch-all handler. Keep the Printify API key and shop ID on the server and configure them in the production host environment.

Supabase Auth stores registered accounts in its managed `auth.users` table. The account page saves display name and phone in the signed-in user's Auth metadata, so profile editing does not depend on a separate table migration. See [supabase/README.md](supabase/README.md) for Google provider and optional database setup.

The Graphite19 “Continue to checkout” action is a presentation placeholder. Marketplace Flutterwave checkout is implemented but stays disabled by default and is shown only for approved sellers whose `checkout_enabled` flag has been enabled by an administrator. Seller payouts are manual under a separate agreement; no automatic split or seller bank transfer is implemented. Test the Flutterwave flow in sandbox and document seller payout, delivery, refund and tax handling before enabling production payments.
