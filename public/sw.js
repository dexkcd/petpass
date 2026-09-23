/* PetPass service worker: network-first for pages and API, cache-first for
 * static assets, offline fallback page. Bump CACHE_VERSION to invalidate. */
const CACHE_VERSION = "petpass-v2";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || /\.(png|jpg|jpeg|webp|svg|ico|woff2?)$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never touch Google Maps, auth providers, etc.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/data/")) return; // always live

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok && !url.pathname.startsWith("/api/auth")) {
            const cache = await caches.open(PAGE_CACHE);
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          const cache = await caches.open(PAGE_CACHE);
          const cached = await cache.match(request);
          if (cached) return cached;
          // Serve the offline page at its own URL so the client router hydrates
          // the right route instead of showing a 404 for the requested path.
          if (url.pathname !== OFFLINE_URL) return Response.redirect(new URL(OFFLINE_URL, self.location.origin).href, 302);
          const offline = await caches.match(OFFLINE_URL);
          return offline ?? new Response("You are offline.", { status: 503, headers: { "Content-Type": "text/plain" } });
        }
      })(),
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
