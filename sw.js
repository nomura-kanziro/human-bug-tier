/* 휴버대 티어표 — Service Worker (셸 캐시, API는 네트워크 우선) */
const CACHE_VERSION = 'hbu-pwa-v1';
const SHELL_URLS = [
  './',
  './index.html',
  './common.css',
  './common.js',
  './Header_Footer.css',
  './header.html',
  './footer.html',
  './manifest.webmanifest',
  './tier-image/pwa/icon-192.png',
  './tier-image/pwa/icon-512.png',
  './tier-image/logo.webp'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(SHELL_URLS).catch((err) => {
        console.warn('[sw] precache partial fail', err);
      })
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  return url.pathname.includes('/api/');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // API: network only (fallback offline message not JSON)
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(req).catch(() =>
        new Response(JSON.stringify({ message: '오프라인 상태입니다. 네트워크를 확인해 주세요.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Navigations & static: network-first, cache fallback
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        if (res.ok && (req.mode === 'navigate' || req.destination === 'style' || req.destination === 'script' || req.destination === 'image' || req.destination === 'document')) {
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => {
          if (cached) return cached;
          if (req.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        })
      )
  );
});
