// Service Worker para PWA
const CACHE_NAME = 'npm-start-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/app.html',
  '/login.html',
  '/register.html',
  '/developer.html',
  '/admin.html',
  '/payment-return.html'
];

// Instalar o service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto');
        // Adicionar URLs ao cache, mas continuar mesmo se algumas falharem
        const cachePromises = urlsToCache.map(url => {
          return fetch(url)
            .then(response => {
              if (response.ok) {
                return cache.put(url, response);
              }
              throw new Error(`Failed to fetch ${url}`);
            })
            .catch(error => {
              console.warn(`Failed to cache ${url}:`, error);
              // Continuar mesmo se falhar
              return Promise.resolve();
            });
        });
        return Promise.all(cachePromises);
      })
  );
});

// Intercepta as requisições e serve do cache quando possível
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retorna do cache se encontrado, senão faz a requisição
        return response || fetch(event.request);
      })
  );
});

// Atualiza o service worker
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});