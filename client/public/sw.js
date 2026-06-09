const CACHE_VERSION = 'study-hub-v3';
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL_URLS = [
  '/',
  '/app',
  '/app/catalog',
  '/app/search',
  '/app/ask',
  '/app/library',
  '/app/profile',
  '/offline.html',
  '/manifest.json',
  '/opensearch.xml',
  '/favicon.svg',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/maskable-icon-512x512.png',
];

const cacheShellUrls = async (cache) => {
  await Promise.all(
    APP_SHELL_URLS.map(async (url) => {
      try {
        await cache.add(url);
      } catch {
        // Keep SW install resilient if a non-critical asset is missing.
      }
    }),
  );
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => cacheShellUrls(cache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.registration.navigationPreload ? self.registration.navigationPreload.enable() : undefined,
      caches
        .keys()
        .then((cacheNames) =>
          Promise.all(
            cacheNames
              .filter((cacheName) => cacheName.startsWith('study-hub-') && !cacheName.startsWith(CACHE_VERSION))
              .map((cacheName) => caches.delete(cacheName))
          )
        ),
    ]).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

const staleWhileRevalidate = async (request) => {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);

  const networkPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse && networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);

  return cachedResponse || networkPromise;
};

const networkFirstDocument = async (event) => {
  const { request } = event;

  try {
    const preloadResponse = await event.preloadResponse;
    const networkResponse = preloadResponse || await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch {
    const cache = await caches.open(APP_SHELL_CACHE);
    return (
      (await caches.match(request)) ||
      (await cache.match('/app')) ||
      (await cache.match('/')) ||
      (await cache.match('/offline.html'))
    );
  }
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstDocument(event));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const cache = caches.open(RUNTIME_CACHE).then((runtimeCache) => runtimeCache.put(request, networkResponse.clone()));
            event.waitUntil(cache);
          }
          return networkResponse;
        })
        .catch(async () => {
          const cache = await caches.open(RUNTIME_CACHE);
          return cache.match(request) || cache.match('/offline.html');
        })
    );
    return;
  }

  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'manifest'
  ) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
