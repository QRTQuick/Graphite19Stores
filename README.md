# Graphite19Stores

A responsive React storefront built with Vite. The catalog reads from a server-side Printify endpoint, with curated fallback products if Printify is unavailable. Supabase Auth supports email/password registration and sign-in, Google OAuth, password reset, and customer profiles.

## Local setup

1. Copy `.env.example` to `.env` (already ignored by Git).
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from your Supabase project. In Supabase Authentication, enable Google and add your local and production account URLs to the redirect URL allow list.
3. Set `PRINTIFY_API_KEY` and `PRINTIFY_SHOP_ID` in the server environment. Keep these server-only values out of any `VITE_` variable and out of source control.
4. Run `npm run dev`.

## Production hosting

Build with `npm run build` and publish the generated `dist/` directory from the project root. Vite bundles the imported CSS into `/assets/`; keep those generated files alongside `dist/index.html` when deploying. The included `public/_redirects` and `vercel.json` configure Netlify and Vercel to serve the React app for direct visits and refreshes on routes such as `/shop` and `/login`. Deployments should serve the site at the domain root.

Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as build-time environment variables on the hosting provider. Configure `PRINTIFY_API_KEY` and `PRINTIFY_SHOP_ID` as server-side environment variables. The Printify API route requires a host that supports the included Vercel function (`api/products.js`).

The live sitemap is served at `/sitemap.xml`; it lists public pages and visible products from the connected Printify catalog. `public/robots.txt` references the sitemap. After deploying, submit `https://graphite19-stores.vercel.app/sitemap.xml` in Google Search Console to help Google discover the store URLs.

The Vite development server exposes the same Printify catalog through `/api/products`; production uses the Vercel-style `api/products.js` handler. Keep the Printify API key and shop ID on the server and configure them in the production host environment.

Supabase Auth stores registered accounts in its managed `auth.users` table. Apply the profile SQL in `supabase/migrations` before using the profile details page. See [supabase/README.md](supabase/README.md) for Google provider and database setup.

The “Continue to checkout” action is a presentation placeholder; connect a checkout provider before accepting orders. Product purchase options, shipping rates, and tax calculations should come from your Printify and checkout configuration.
