const CACHE_NAME = 'jarvis-pwa-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Aqui listamos os arquivos básicos para o app funcionar offline
      return cache.addAll([
        './',
        './index.html',
        './manifest.json'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
