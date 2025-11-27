/**
 * Service Worker para Progressive Web App (PWA) - npm-start
 * 
 * Este service worker permite que o app funcione offline, cacheie recursos
 * e forneça uma experiência semelhante a um aplicativo nativo.
 */

const CACHE_NAME = 'npm-start-pwa-v1.0.0';
const urlsToCache = [
  '/',
  '/css/style.css',
  '/js/app.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker instalado');
  
  // Realiza o pré-cache dos recursos essenciais
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Retorna o recurso do cache se existir
        if (response) {
          return response;
        }
        
        // Clona a requisição porque ela é um Stream e só pode ser consumida uma vez
        const fetchRequest = event.request.clone();
        
        // Faz a requisição para a rede
        return fetch(fetchRequest).then(response => {
          // Verifica se a resposta é válida
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clona a resposta porque ela também é um Stream
          const responseToCache = response.clone();
          
          // Armazena a resposta no cache
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
            
          return response;
        });
      })
    );
});

// Atualização do Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker ativado');
  
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Deleta caches antigos que não estão na whitelist
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Manipulação de notificações push (opcional)
self.addEventListener('push', event => {
  console.log('Notificação push recebida:', event);
  
  const title = 'npm-start App';
  const options = {
    body: 'Você tem uma nova atualização!',
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/icon-192x192.svg'
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

console.log('Service Worker carregado - npm-start PWA');