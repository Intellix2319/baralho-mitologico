// Service worker seguro: SEMPRE tenta a internet primeiro (versão nova do jogo) e só usa o cache se estiver offline.
const CACHE = 'baralho-v3';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // PeerJS/CDN: não mexe

  e.respondWith(
    fetch(req)
      .then((res) => {
        const type = res.headers.get('content-type') || '';
        // só guarda respostas boas, e nunca uma página HTML no lugar de um arquivo de código
        const ok = res.ok && (req.mode === 'navigate' || !type.includes('text/html'));
        if (ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req.mode === 'navigate' ? '/' : req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req.mode === 'navigate' ? '/' : req).then((hit) => hit || Response.error()))
  );
});
