// Service Worker para RotaFacil Turbo
const CACHE_NAME = 'rotafacil-turbo-v1.0.4';
const CACHE_VERSION = '1.0.4';

// Recursos estáticos para pré-cachear
const ESSENTIAL_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// Instalar
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando v' + CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ESSENTIAL_RESOURCES))
      .then(() => self.skipWaiting())
      .catch(err => console.error('[SW] Erro ao instalar:', err))
  );
});

// Ativar — limpar caches antigos
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando v' + CACHE_VERSION);
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch — estratégia clara por tipo de request
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Requisições externas (Supabase, Mapbox, APIs) — sempre da rede, nunca cachear
  if (url.origin !== self.location.origin) {
    return; // Deixar o browser lidar normalmente
  }

  // 2. Recursos de assets (JS, CSS, imagens) — Cache First
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // 3. Rotas da SPA (/, /app, /subscription, /auth/*, etc.)
  //    Sempre buscar index.html da rede; fallback para cache se offline
  if (event.request.method === 'GET' && event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch('/index.html')
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put('/index.html', clone));
          }
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // 4. Outros recursos GET — network first, fallback cache
  if (event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
  // Métodos não-GET (POST, PUT, etc.) — browser lida normalmente (não interceptar)
});

// Mensagens do cliente
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ type: 'VERSION_INFO', version: CACHE_VERSION, cacheName: CACHE_NAME });
  }
  if (event.data?.type === 'FORCE_UPDATE') {
    caches.keys()
      .then(names => Promise.all(names.map(n => caches.delete(n))))
      .then(() => self.clients.matchAll())
      .then(clients => clients.forEach(c => c.postMessage({ type: 'FORCE_RELOAD' })));
  }
});

console.log('[SW] RotaFacil Turbo v' + CACHE_VERSION + ' carregado');
