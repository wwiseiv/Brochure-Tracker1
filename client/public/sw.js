const CACHE_VERSION = 'v2';
const STATIC_CACHE = `brochuredrop-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `brochuredrop-dynamic-${CACHE_VERSION}`;
const API_CACHE = `brochuredrop-api-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
];

const API_CACHE_PATTERNS = [
  '/api/drops',
  '/api/me',
  '/api/me/role',
  '/api/me/preferences',
  '/api/inventory',
  '/api/reminders',
  '/api/merchants',
];

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing v2...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[Service Worker] Failed to cache some static assets:', err);
      });
    }).then(() => {
      self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating v2...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE && 
              cacheName !== API_CACHE &&
              cacheName.startsWith('brochuredrop-')) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    }).then(() => {
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            version: CACHE_VERSION,
          });
        });
      });
    })
  );
});

function shouldCacheApiResponse(url) {
  return API_CACHE_PATTERNS.some(pattern => url.pathname.startsWith(pattern));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== location.origin) {
    return;
  }

  if (request.method !== 'GET') {
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200 && shouldCacheApiResponse(url)) {
            const responseToCache = response.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[Service Worker] Serving API response from cache:', request.url);
              const offlineResponse = cachedResponse.clone();
              return new Response(offlineResponse.body, {
                status: cachedResponse.status,
                statusText: cachedResponse.statusText,
                headers: new Headers({
                  ...Object.fromEntries(cachedResponse.headers.entries()),
                  'X-Offline-Cache': 'true',
                }),
              });
            }
            return new Response(
              JSON.stringify({ 
                error: 'Offline - API not available',
                offline: true 
              }),
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 
                  'Content-Type': 'application/json',
                  'X-Offline-Cache': 'true',
                },
              }
            );
          });
        })
    );
    return;
  }

  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot|ico)$/) ||
    url.pathname.startsWith('/assets/') ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          fetch(request)
            .then((response) => {
              if (response.status === 200) {
                caches.open(DYNAMIC_CACHE).then((cache) => {
                  cache.put(request, response);
                });
              }
            })
            .catch(() => {});
          return cachedResponse;
        }
        
        return fetch(request)
          .then((response) => {
            if (response.status === 200) {
              const responseToCache = response.clone();
              caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return response;
          })
          .catch(() => {
            if (request.destination === 'image') {
              return new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#f0f0f0" width="200" height="200"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999" font-family="sans-serif" font-size="14">Offline</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            }
            return new Response('Offline', { status: 503 });
          });
      })
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200 && response.headers.get('content-type')?.includes('text/html')) {
          const responseToCache = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[Service Worker] Serving HTML from cache:', request.url);
            return cachedResponse;
          }
          return caches.match('/').then((indexResponse) => {
            if (indexResponse) {
              return indexResponse;
            }
            return new Response(
              '<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>You are offline</h1><p>Please check your connection and try again.</p></body></html>',
              { 
                status: 503,
                headers: { 'Content-Type': 'text/html' }
              }
            );
          });
        });
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('brochuredrop-'))
          .map(name => caches.delete(name))
      );
    }).then(() => {
      event.ports[0]?.postMessage({ success: true });
    });
  }
});

self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-offline-drops') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'TRIGGER_SYNC',
          });
        });
      })
    );
  }
});

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  
  try {
    const data = event.data?.json() || {};
    const title = data.title || 'BrochureTracker';
    
    // Build notification options based on type
    const options = {
      body: data.body || 'You have a new notification',
      icon: data.icon || '/favicon.png',
      badge: data.badge || '/favicon.png',
      data: data.data || {},
      vibrate: [100, 50, 100],
      requireInteraction: data.data?.type === 'prospect_search_complete',
      tag: data.data?.jobId ? `prospect-job-${data.data.jobId}` : 'general',
      renotify: true,
    };

    // Add actions for prospect search notifications
    if (data.data?.type === 'prospect_search_complete' || data.data?.type === 'prospect_search_failed') {
      options.actions = [
        { action: 'view', title: 'View Results' },
        { action: 'dismiss', title: 'Dismiss' }
      ];
    }

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('[Service Worker] Error showing notification:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Handle dismiss action
  if (event.action === 'dismiss') return;

  // Determine URL based on notification type
  let urlToOpen = '/';
  if (event.notification.data?.url) {
    urlToOpen = event.notification.data.url;
  } else if (event.notification.data?.type === 'prospect_search_complete') {
    urlToOpen = '/prospect-finder';
  } else if (event.notification.data?.jobId) {
    urlToOpen = `/prospect-finder`;
  }
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if app is already open
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            if (urlToOpen !== '/') {
              client.navigate(urlToOpen);
            }
            return;
          }
        }
        // Open new window if not
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
