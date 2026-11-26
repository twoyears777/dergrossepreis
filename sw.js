/* Manna – Service Worker
   Macht die App offline-fähig und lädt Updates automatisch.
   WICHTIG: Bei jedem Update VERSION hochzählen (gleiche Nummer wie APP_VERSION in js/data.js).
   Die Spiele (spiele/alle.json) brauchen kein Update: Sie werden immer zuerst frisch geladen. */
const VERSION = '1.29.0';
const CACHE = 'grosser-preis-' + VERSION;
const GAMES_CACHE = 'manna-spiele';
const GAMES_FILE = './spiele/alle.json';
const FILES = [
  './',
  './index.html',
  './rechtliches.html',
  './css/app.css',
  './js/spielformat.js',
  './js/artikel.js',
  './js/data.js',
  './js/kern.js',
  './js/preis.js',
  './js/system.js',
  './js/menues.js',
  './js/zuschauer.js',
  './js/sammlung.js',
  './js/supabase.js',
  './js/einreichen.js',
  './js/countdown.js',
  './js/eigenes-spiel.js',
  './js/konto.js',
  './js/sync.js',
  './js/konto-seite.js',
  './js/zaehler.js',
  './img/manna-mark.svg',
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
      .then(() => caches.open(GAMES_CACHE).then(c => fetch(new Request(GAMES_FILE, { cache: 'no-cache' }))
        .then(r => { if (r.ok) return c.put(GAMES_FILE, r); }).catch(() => {})))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(k => k.startsWith('grosser-preis-') && k !== CACHE)
        .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin !== location.origin) return;

  // Der Editor (editor/) läuft ohne Service Worker, immer direkt aus dem Netz
  const scope = new URL(self.registration.scope);
  if (url.pathname.startsWith(scope.pathname + 'editor/') || url.pathname === scope.pathname + 'editor') return;
  // Auch alles, was die Editor-Seite nachlädt (z. B. js/spielformat.js), kommt frisch aus dem Netz,
  // damit der Editor nie mit einer älteren Fassung aus dem Offline-Speicher speichert.
  try { if (req.referrer && new URL(req.referrer).pathname.startsWith(scope.pathname + 'editor')) return; } catch (e) {}

  // Spiele: zuerst frisch aus dem Netz, offline die zuletzt geladene Fassung
  if (url.pathname === scope.pathname + 'spiele/alle.json') {
    event.respondWith(caches.open(GAMES_CACHE).then(cache =>
      fetch(new Request(GAMES_FILE, { cache: 'no-cache' })).then(r => {
        if (r.ok) cache.put(GAMES_FILE, r.clone());
        return r.ok ? r : cache.match(GAMES_FILE).then(hit => hit || r);
      }).catch(() => cache.match(GAMES_FILE).then(hit => hit || Response.error()))
    ));
    return;
  }

  // App-Dateien: zuerst aus dem Cache (funktioniert offline), sonst Netz
  // Nur die App selbst (Startadresse, index.html) kommt aus dem gespeicherten index.html,
  // andere Seiten wie rechtliches.html werden als sie selbst ausgeliefert.
  const isApp = url.pathname === scope.pathname || url.pathname === scope.pathname + 'index.html';
  if (req.mode === 'navigate' && isApp) {
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
