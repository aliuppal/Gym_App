# Gymlo

A small, installable web app for tracking the days you go to the gym. It works in any
desktop browser and installs to your phone's home screen, where it runs full screen and offline.

## Features

- **One-tap logging:** the big button logs today's workout.
- **Calendar:** tap any past day to log it, choose one or more workout types (Strength, Cardio, HIIT,
  Mobility, Sports, Other), add a note, or remove it.
- **Stats:** current streak, longest streak, days this week/month/year, and a weekly goal
  with a progress bar and a count of goal weeks in a row.
- **Heatmap:** the last 6 months at a glance, with a breakdown by workout type.
- **Works offline:** it's a PWA with a service worker, so it opens without a connection.
- **Cloud sync with Google sign-in:** when a Supabase project is configured (see below), you sign
  in with Google and your workouts are saved to a Supabase Postgres database, so they follow you
  across phone and computer. Workouts already saved on the device are moved into your account on
  first sign-in.
- **Profile:** tap your Google photo in the header to see your name, email, member-since date and
  workout totals, and to **Log out**.
- **Progress photos:** add a photo, pick which stats to print along the bottom (day streak, this
  week, days this month/year, longest streak, goal weeks in a row, total workouts), then save it to
  your device and/or your gallery. Gallery photos are stored as base64 JPEGs in Supabase, together
  with the stats shown on them, and can be viewed, saved again or deleted later on any device.
- **Use without an account:** choose it on the sign-in screen to keep workouts on the device only.
  A **Sign in** button stays in the header, and signing in later adds those workouts to your account.
- **On-device mode:** with no Supabase project configured, workouts are saved in IndexedDB on the
  device, work fully offline, and never leave it. Export and import a JSON backup from Settings.
- Light and dark themes follow your system setting.

## Run locally

No build step and no dependencies.

```sh
npm start      # serves on http://localhost:8080
npm test       # runs unit tests for the streak/stats logic (Node 18+)
```

## Set up Supabase and Google sign-in

1. **Create a Supabase project** at https://supabase.com/dashboard.
2. **Create the tables:** open *SQL Editor*, then paste and run each file in `supabase/migrations/`
   in order: `20260926000000_gym_days.sql`, then `20260927000000_progress_photos.sql`. (Or, with the Supabase CLI:
   `supabase link --project-ref <ref>` then `supabase db push`.)
3. **Connect the app:** copy *Project URL* and the *anon / publishable* key from
   *Project Settings → API* into `js/config.js`. The anon key is meant to be public; row-level
   security keeps each user's data private. Never put the `service_role` key in the app.
4. **Create a Google OAuth client** in https://console.cloud.google.com → *APIs & Services*:
   - *OAuth consent screen*: choose External, fill in the app name and your email.
   - *Credentials → Create credentials → OAuth client ID → Web application*.
   - *Authorized JavaScript origins*: `https://aliuppal.github.io` and `http://localhost:8080`.
   - *Authorized redirect URIs*: `https://<your-project-ref>.supabase.co/auth/v1/callback`.
5. **Enable Google in Supabase:** *Authentication → Sign In / Providers → Google*, turn it on and
   paste the Google *Client ID* and *Client secret*.
6. **Allow the app's URLs:** *Authentication → URL Configuration*: set *Site URL* to
   `https://aliuppal.github.io/Gym_App/` and add `https://aliuppal.github.io/Gym_App/` and
   `http://localhost:8080/` to *Redirect URLs*.

Run `npm start`, open http://localhost:8080 and choose **Continue with Google**.

## Deploy (web + mobile)

The app is published to GitHub Pages at https://aliuppal.github.io/Gym_App/ by
`.github/workflows/jekyll-gh-pages.yml` on every push to the repository's default branch.
`.github/workflows/ci.yml` runs the unit tests on every push and pull request.

Any static host (Netlify, Vercel, Cloudflare Pages) also works: upload the repository root.

## Install on your phone

- **iPhone (Safari):** open the site → Share → **Add to Home Screen**.
- **Android (Chrome):** open the site → ⋮ menu → **Install app** / **Add to Home screen**.

## Project layout

```
index.html            App markup
styles.css            Styles (mobile-first, light/dark)
js/app.js             UI and event wiring
js/stats.js           Pure date/streak calculations (unit tested)
js/db.js              On-device database (IndexedDB, localStorage fallback)
js/cloud.js           Supabase database + Google sign-in
js/photos.js          Progress photos: stats overlay, save to device, gallery
js/config.js          Supabase project URL and anon key
supabase/migrations/  Database schema and row-level security policies
js/storage.js         Data model and import validation
sw.js                 Service worker for offline support
manifest.webmanifest  PWA manifest
icons/                App icons, logo (logo.svg) and wordmark (wordmark.svg)
js/brand.js           Gymlo mark and wordmark for drawing on photos
tests/                Node test runner tests
```

When you change app files, bump `CACHE_VERSION` in `sw.js` so installed copies pick up the update.

## Brand

The Gymlo wordmark is set in [Kanit](https://fonts.google.com/specimen/Kanit) ExtraBold Italic
(SIL Open Font License) and stored as outlines, so it looks the same on every device and no font
file is downloaded.
