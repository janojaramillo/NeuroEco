/* NeuroEco prematuro — service worker (offline-first) */
const VERSION = 'neuroeco-v1.0.0';
const CORE = ['./', './index.html', './sw.js'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Página: red primero (para recibir actualizaciones), caché si no hay conexión
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put('./index.html', cp)); return r; })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Fuentes de Google: caché primero, se guardan en el primer uso
  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(r => {
        const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); return r;
      }).catch(() => new Response('', { status: 408 })))
    );
    return;
  }

  // Resto del mismo origen: caché primero
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(r => {
        const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); return r;
      }))
    );
  }
});
