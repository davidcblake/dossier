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

// Daily digest notifications.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "Dossier";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/today" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/today";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((wins) => {
      for (const w of wins) {
        if (w.url.includes("/today") && "focus" in w) return w.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
