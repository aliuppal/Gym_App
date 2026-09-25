# Gym Days

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
- **Private:** data is stored only on your device (`localStorage`). Export and import a JSON
  backup from Settings to move it between devices.
- Light and dark themes follow your system setting.

## Run locally

No build step and no dependencies.

```sh
npm start      # serves on http://localhost:8080
npm test       # runs unit tests for the streak/stats logic (Node 18+)
```

## Deploy (web + mobile)

The workflow in `.github/workflows/pages.yml` runs the tests and publishes the app to
GitHub Pages on every push to `main`. Turn it on once under **Settings → Pages → Build and
deployment → Source: GitHub Actions**. The app will then be at
`https://<user>.github.io/<repo>/`.

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
js/storage.js         localStorage persistence and import validation
sw.js                 Service worker for offline support
manifest.webmanifest  PWA manifest
icons/                App icons
tests/                Node test runner tests
```

When you change app files, bump `CACHE_VERSION` in `sw.js` so installed copies pick up the update.
