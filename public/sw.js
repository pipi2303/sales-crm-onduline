// Cache name is bumped whenever the caching strategy changes, so browsers
// that already installed an older service worker purge their stale cache
// on activate instead of keeping it forever.
const CACHE_NAME = 'sales-monitoring-v3';
const PRECACHE_URLS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  // Activate the new service worker immediately instead of waiting for
  // all open tabs to close, so a fresh deploy takes effect right away.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Network-first strategy: every request goes to the network first, and the
// cache is only used as an offline fallback. This prevents the "stale
// shell" bug where an old cached index.html keeps referencing JS/CSS
// bundle filenames (Vite content hashes) that no longer exist on the
// server after a new deploy, causing 404s for returning visitors.
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle same-origin GET requests; let everything else (POST,
  // browser extensions, cross-origin calls) pass through untouched.
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return;
  }

  // Bab 52 (26 Sep 2026): /api/* responses are always dynamic data straight
  // from Postgres -- they must never be served from this SW's Cache Storage,
  // and a non-2xx response (e.g. the 304 Not Modified found in Bab 51, from
  // a missing Cache-Control header) must never be silently swallowed either.
  // Previously this handler cached and returned ANY resolved response,
  // including a bare 304 with no body, which the app's apiFetch() then read
  // as "no data" with no thrown error -- exactly the empty-menu symptom
  // reported ("tetap kosong dan tidak ada error"). Now /api/* requests are
  // pure network pass-through: no cache write, no cache fallback, so a
  // caching regression on the server surfaces as a visible fetch error
  // instead of a silently stale/empty screen.
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
