/* Der große Preis – Service Worker
   Macht die App offline-fähig und lädt Updates automatisch.
   WICHTIG: Bei jedem Update VERSION hochzählen (gleiche Nummer wie APP_VERSION in index.html). */
const VERSION = '1.7.0';
const CACHE = 'grosser-preis-' + VERSION;
const FONT_CACHE = 'grosser-preis-fonts';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.all(FILES.map(f =>
        fetch(new Request(f, { cache: 'reload' })).then(r => { if (r.ok) return cache.put(f, r); })
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(k => k.startsWith('grosser-preis-') && k !== CACHE && k !== FONT_CACHE)
        .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: aus dem Cache, im Hintergrund auffrischen
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(caches.open(FONT_CACHE).then(cache =>
      cache.match(req).then(hit => {
        const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) cache.put(req, r.clone()); return r; }).catch(() => hit);
        return hit || net;
      })
    ));
    return;
  }

  if (url.origin !== location.origin) return;

  // App-Dateien: zuerst aus dem Cache (funktioniert offline), sonst Netz
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html', { cacheName: CACHE })
        .then(hit => hit || fetch(req))
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return r;
    }))
  );
});
