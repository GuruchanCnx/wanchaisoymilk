// WanJai Soy Milk - Workbox Service Worker
// Strategies for caching product images, menu data, and web fonts for low-connectivity areas

try {
  importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');
} catch (e) {
  console.warn('[SW] Offline or failed to load Workbox CDN script:', e);
}

if (self.workbox) {
  workbox.core.skipWaiting();
  workbox.core.clientsClaim();

  // 1. Product Images: Cache-First strategy
  // Keeps high-res product photos, icons, and hero visuals stored locally for instant render in low-connectivity areas
  workbox.routing.registerRoute(
    ({ request, url }) =>
      request.destination === 'image' ||
      url.pathname.startsWith('/images/') ||
      /\.(?:png|jpg|jpeg|svg|webp|gif|ico)$/i.test(url.pathname),
    new workbox.strategies.CacheFirst({
      cacheName: 'wanchai-product-images-v1',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
          purgeOnQuotaError: true,
        }),
      ],
    })
  );

  // 2. Menu Data & Store Settings API: Network-First with Stale Cache Fallback
  // If the customer has weak or intermittent mobile signal, the app gracefully loads the cached menu items and prices
  workbox.routing.registerRoute(
    ({ url }) =>
      url.pathname === '/api/products' ||
      url.pathname === '/api/settings',
    new workbox.strategies.NetworkFirst({
      cacheName: 'wanchai-menu-data-v1',
      networkTimeoutSeconds: 2.0,
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 40,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 Days
        }),
      ],
    })
  );

  // 3. Web Fonts (IBM Plex Sans Thai, Fraunces, IBM Plex Mono)
  workbox.routing.registerRoute(
    ({ url }) =>
      url.origin === 'https://fonts.googleapis.com' ||
      url.origin === 'https://fonts.gstatic.com',
    new workbox.strategies.CacheFirst({
      cacheName: 'wanchai-fonts-v1',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 30,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 Year
        }),
      ],
    })
  );
} else {
  // Resilient native cache fallback
  const SHELL_CACHE = 'wanchai-fallback-v1';
  self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(['/favicon.svg', '/manifest.json'])).catch(() => {}));
    self.skipWaiting();
  });
  self.addEventListener('activate', (e) => {
    e.waitUntil(self.clients.claim());
  });
  self.addEventListener('fetch', (e) => {
    const req = e.request;
    const url = new URL(req.url);
    if (req.method !== 'GET') return;
    if (url.pathname.startsWith('/api/products') || url.pathname.startsWith('/api/settings')) {
      e.respondWith(
        fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(req, copy)).catch(() => {});
            return res;
          })
          .catch(() => caches.match(req))
      );
      return;
    }
    if (url.pathname.startsWith('/images/')) {
      e.respondWith(
        caches.match(req).then((cached) => cached || fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        }))
      );
    }
  });
}
