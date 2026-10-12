# Supabase account setup

Supabase Auth stores registrations in its managed `auth.users` table. This project supports email/password registration, email/password sign-in, password reset, and Google OAuth.

## Create the profile table

Apply `migrations/20261012091621_create_profiles.sql` to the Supabase project before using the account profile page. In the Supabase Dashboard, open **SQL Editor**, paste the migration contents, and run it. The table has row-level security; signed-in users can only read, create, and update the profile row whose ID matches their own Auth user ID.

This repository is not linked to a Supabase project yet, and the browser publishable key cannot apply database migrations. The SQL file is ready, but it has not been applied to the hosted project.

## Enable Google sign-in

In **Authentication → Sign-in providers**, enable Google and enter the Google OAuth web client ID and client secret. Add `http://localhost:5173/account` and your production account URL to Supabase's redirect URL allow list. In Google Cloud, add your site origin as an authorized JavaScript origin and the Supabase Auth callback shown in the Google provider settings as an authorized redirect URI.

Email/password registration uses Supabase Auth. If email confirmation is enabled in the project, new users must confirm their email before they can sign in. Set the Auth Site URL and redirect allow list to the site URLs you use.
