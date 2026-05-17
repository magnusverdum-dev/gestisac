const CACHE_NAME = 'gestisac-pwa-v6-audit';
const APP_SHELL = [
  '/',
  '/dashboard',
  '/tickets',
  '/tecnico/avarias',
  '/condomino/avarias',
  '/administracao',
  '/manutencao',
  '/documentos',
  '/contabilidade',
  '/relatorios',
  '/assembleias',
  '/fornecedores',
  '/definicoes',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/gestisac-192.png',
  '/icons/gestisac-512.png',
  '/icons/gestisac-maskable-512.png',
  '/icons/gestisac-icon.svg',
  '/icons/gestisac-maskable.svg'
];

const cacheAppShell = async () => {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(APP_SHELL.map((url) => cache.add(url).catch(() => undefined)));
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    cacheAppShell().then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname === '/manifest.webmanifest' || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/offline.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'gestisac-avarias-sync') {
    event.waitUntil(self.clients.matchAll());
  }
});
