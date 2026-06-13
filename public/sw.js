// Dossier service worker — deliberately update-safe.
// We do NOT cache HTML/app responses, so every launch (when online) loads the
// latest deployed version. We only precache a tiny offline fallback page.
const OFFLINE_URL = "/offline.html";
const CACHE = "dossier-offline-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Network-first for page navigations; fall back to offline page only when down.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL))
    );
  }
  // Everything else (Next's hashed static assets, API calls) goes to network
  // and is handled by the browser's normal HTTP cache.
});
