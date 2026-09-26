// Bump CACHE_VERSION whenever app files change so installed copies update.
const CACHE_VERSION = "gym-days-v12";
const APP_SHELL = [
  "./",
  "index.html",
  "styles.css",
  "js/app.js",
  "js/stats.js",
  "js/storage.js",
  "js/db.js",
  "js/cloud.js",
  "js/photos.js",
  "js/config.js",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/logo.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  // cache: "reload" skips the browser's HTTP cache (GitHub Pages allows 10 minutes),
  // so a new version never gets installed with stale files.
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: "reload" })))),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Network-first so updates show up when online; fall back to cache offline.
// cache: "no-cache" revalidates with the server (a cheap 304 when unchanged)
// instead of reusing a possibly stale HTTP-cached copy.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(request, { cache: "no-cache" })
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(request, { ignoreSearch: true }).then(
          (cached) => cached || (request.mode === "navigate" ? caches.match("index.html") : Response.error()),
        ),
      ),
  );
});
