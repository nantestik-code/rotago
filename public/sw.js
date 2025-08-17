// Service Worker para RotaFacil Turbo
// Sistema de cache e atualização forçada

const CACHE_NAME = 'rotafacil-turbo-v1.0.3';
const CACHE_VERSION = '1.0.3';

// Recursos essenciais para cache
const ESSENTIAL_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// Recursos dinâmicos que devem ser sempre atualizados
const DYNAMIC_RESOURCES = [
  '/api/',
  '/auth/',
  '/app'
];

// Função para verificar se um request pode ser cacheado
function shouldCacheRequest(request) {
  // Não cachear requests POST, PUT, DELETE, PATCH
  if (request.method !== 'GET') {
    return false;
  }
  
  // Não cachear URLs com schemes não suportados
  const url = new URL(request.url);
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
    return false;
  }
  
  // Não cachear requests com parâmetros de autenticação
  if (url.searchParams.has('token') || url.searchParams.has('access_token')) {
    return false;
  }
  
  // Não cachear APIs dinâmicas
  if (DYNAMIC_RESOURCES.some(resource => url.pathname.includes(resource))) {
    return false;
  }
  
  return true;
}

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 [SW] Instalando Service Worker v' + CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 [SW] Cache aberto:', CACHE_NAME);
        return cache.addAll(ESSENTIAL_RESOURCES);
      })
      .then(() => {
        console.log('✅ [SW] Recursos essenciais cacheados');
        // Força a ativação imediata do novo SW
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ [SW] Erro ao instalar:', error);
      })
  );
});

// Ativar Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 [SW] Ativando Service Worker v' + CACHE_VERSION);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Remove caches antigos
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ [SW] Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ [SW] Service Worker ativado');
        // Força o controle de todas as abas abertas
        return self.clients.claim();
      })
      .then(() => {
        // Notifica todas as abas sobre a atualização
        return self.clients.matchAll();
      })
      .then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: CACHE_VERSION,
            message: 'Nova versão disponível!'
          });
        });
      })
  );
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // FORÇA ATUALIZAÇÃO para HTML principal (resolve problema de cache)
  if (url.pathname === '/' || url.pathname === '/index.html') {
    console.log('🔄 [SW] Forçando atualização do HTML:', url.pathname);
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          console.log('⚠️ [SW] Rede falhou, usando cache para HTML');
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Estratégia para recursos dinâmicos (sempre da rede)
  if (DYNAMIC_RESOURCES.some(resource => url.pathname.startsWith(resource))) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache apenas se a resposta for válida e request for cacheável
          if (response.status === 200 && shouldCacheRequest(event.request)) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseClone);
              })
              .catch((error) => {
                console.warn('Erro ao cachear request:', error);
              });
          }
          return response;
        })
        .catch(() => {
          // Fallback para cache se offline
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Estratégia Cache First para recursos estáticos
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Verifica se precisa atualizar em background
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse.status === 200) {
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                  });
              }
            })
            .catch(() => {
              // Ignora erros de rede em background
            });
          
          return cachedResponse;
        }
        
        // Se não está no cache, busca da rede
        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200 && shouldCacheRequest(event.request)) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                })
                .catch((error) => {
                  console.warn('Erro ao cachear request:', error);
                });
            }
            return networkResponse;
          });
      })
  );
});

// Escutar mensagens do cliente
self.addEventListener('message', (event) => {
  console.log('📨 [SW] Mensagem recebida:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⏭️ [SW] Pulando espera - ativando imediatamente');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      type: 'VERSION_INFO',
      version: CACHE_VERSION,
      cacheName: CACHE_NAME
    });
  }
  
  if (event.data && event.data.type === 'FORCE_UPDATE') {
    console.log('🔄 [SW] Forçando atualização de cache');
    
    // Limpa todos os caches
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            return caches.delete(cacheName);
          })
        );
      })
      .then(() => {
        console.log('✅ [SW] Cache limpo - recarregando página');
        
        // Notifica o cliente para recarregar
        self.clients.matchAll()
          .then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: 'FORCE_RELOAD',
                message: 'Cache limpo - recarregando...'
              });
            });
          });
      });
  }
});

// Sincronização em background
self.addEventListener('sync', (event) => {
  console.log('🔄 [SW] Sincronização em background:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Aqui você pode implementar sincronização de dados offline
      console.log('📡 [SW] Executando sincronização...')
    );
  }
});

// Notificações push (futuro)
self.addEventListener('push', (event) => {
  console.log('📬 [SW] Push recebido:', event.data?.text());
  
  const options = {
    body: event.data?.text() || 'Nova atualização disponível!',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'rotafacil-update',
    requireInteraction: true,
    actions: [
      {
        action: 'update',
        title: 'Atualizar Agora'
      },
      {
        action: 'dismiss',
        title: 'Depois'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('RotaFacil Turbo', options)
  );
});

// Clique em notificação
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 [SW] Notificação clicada:', event.action);
  
  event.notification.close();
  
  if (event.action === 'update') {
    // Força atualização
    event.waitUntil(
      self.clients.matchAll()
        .then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'FORCE_UPDATE_REQUESTED',
              message: 'Usuário solicitou atualização'
            });
          });
        })
    );
  }
});

console.log('🎯 [SW] Service Worker RotaFacil Turbo v' + CACHE_VERSION + ' carregado');
