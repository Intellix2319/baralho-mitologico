// Service worker simples: deixa o app instalável e abrir offline (após a 1ª visita).
const VERSION = 'v2';
const SHELL = `shell-${VERSION}`;
const RUNTIME = `runtime-${VERSION}`;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icons/icon-192.png'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => ![SHELL, RUNTIME].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // PeerJS/CDN: não mexe

  // Páginas: tenta a rede, cai para o cache se estiver offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => { caches.open(SHELL).then((c) => c.put('/', res.clone())); return res; })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Resto (JS, CSS, imagens das cartas/fichas): cache primeiro, guarda ao usar
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) caches.open(RUNTIME).then((c) => c.put(req, res.clone()));
      return res;
    }))
  );
});
