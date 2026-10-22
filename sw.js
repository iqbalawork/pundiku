const VERSION = '2.0.0';
const CACHE = 'pundiku-' + VERSION;
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/app.css?v=' + VERSION,
  './assets/js/config.js?v=' + VERSION,
  './assets/js/api.js?v=' + VERSION,
  './assets/js/ui.js?v=' + VERSION,
  './assets/js/core.js?v=' + VERSION,
  './assets/js/data.js?v=' + VERSION,
  './assets/js/render.js?v=' + VERSION,
  './assets/js/forms.js?v=' + VERSION,
  './assets/js/app.js?v=' + VERSION,
  './assets/img/icon.svg',
  './assets/img/icon-192.png',
  './assets/img/favicon-32.png',
  './assets/img/apple-touch-icon.png'
];
const CACHEABLE_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('pundiku-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && CACHEABLE_HOSTS.indexOf(url.hostname) === -1) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
