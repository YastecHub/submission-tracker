// NEXIUM Bulletin Service Worker — offline-first for student articles
// Version: increment when cache strategy changes
const CACHE_VERSION = 'v7';
const STATIC_CACHE = `nexium-static-${CACHE_VERSION}`;
const ARTICLE_CACHE = `nexium-articles-${CACHE_VERSION}`;
const FEED_CACHE = `nexium-feed-${CACHE_VERSION}`;

// Assets to precache on install
const PRECACHE_URLS = [
  '/',
  '/student',
  '/student/news',
  '/student/login',
  '/icon.svg',
  '/manifest.webmanifest',
];

// Install: precache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean old caches and notify client windows of update
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !key.startsWith(STATIC_CACHE) && !key.startsWith(ARTICLE_CACHE) && !key.startsWith(FEED_CACHE))
          .map((key) => caches.delete(key))
      )
    ).then(() => {
      return self.clients.claim();
    }).then(() => {
      return self.clients.matchAll({ type: 'window' });
    }).then((clientList) => {
      clientList.forEach((client) => {
        client.postMessage({ type: 'sw:updated', version: CACHE_VERSION });
      });
    })
  );
});

// Network-first for navigation & API, cache-first for articles/feeds with network fallback
self.addEventListener('fetch', (event) => {
  // Service worker cache strategies only apply to GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  const isArticlePage = url.pathname.startsWith('/student/news/') && url.pathname !== '/student/news';
  const isFeedPage = url.pathname === '/student/news' || url.pathname.startsWith('/student/news?');
  const isApi = url.pathname.startsWith('/api/');

  if (isApi) {
    // Network-first for API — never cache auth/mutations
    if (event.request.method !== 'GET') return;
    event.respondWith(networkFirstApi(event.request));
    return;
  }

  // Navigation requests (HTML document loads) — Network-First with cache fallback
  // Ensures PWA users always get the freshest deployment when online
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }

  if (isArticlePage) {
    // Cache-first for article pages (HTML), network fallback
    event.respondWith(cacheFirstThenNetwork(event.request, ARTICLE_CACHE));
    return;
  }

  if (isFeedPage) {
    // Stale-while-revalidate for feed page
    event.respondWith(staleWhileRevalidate(event.request, FEED_CACHE));
    return;
  }

  // Static assets (hashed JS, CSS, icons): cache-first
  event.respondWith(cacheFirst(event.request, STATIC_CACHE));
});

// Network-first for HTML navigation with offline fallback
async function networkFirstNavigation(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cache = await caches.open(STATIC_CACHE);
    const cached =
      (await cache.match(request)) ||
      (await cache.match('/student')) ||
      (await cache.match('/'));
    if (cached) return cached;
    return new Response('Offline — please check your internet connection.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

// Cache-first strategy
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

// Cache-first then network (for HTML pages)
async function cacheFirstThenNetwork(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || fetchPromise;
}

// Stale-while-revalidate
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || fetchPromise;
}

// Network-first for API GET
async function networkFirstApi(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Background sync for offline acknowledgements
self.addEventListener('sync', (event) => {
  if (event.tag === 'acknowledge-sync') {
    event.waitUntil(syncAcknowledgements());
  }
});

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('nexium-offline-db', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('actions')) {
        db.createObjectStore('actions', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function queueOfflineAction(action) {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction('actions', 'readwrite');
    tx.objectStore('actions').add(action);
    await new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
    });
  } catch {
    // Ignore storage failure
  }
}

async function syncAcknowledgements() {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction('actions', 'readwrite');
    const store = tx.objectStore('actions');
    const getAllReq = store.getAll();
    const actions = await new Promise((res, rej) => {
      getAllReq.onsuccess = () => res(getAllReq.result || []);
      getAllReq.onerror = () => rej(getAllReq.error);
    });

    for (const item of actions) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (item.token) {
          headers['Authorization'] = `Bearer ${item.token}`;
        }
        const res = await fetch(item.url, {
          method: 'POST',
          headers,
          body: JSON.stringify({}),
        });
        if (res.ok || res.status === 400 || res.status === 409) {
          const deleteTx = db.transaction('actions', 'readwrite');
          deleteTx.objectStore('actions').delete(item.id);
        }
      } catch {
        // Leave in queue for next sync
      }
    }
  } catch {
    // IndexedDB or network error
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || 'NEXIUM Bulletin', {
        body: data.body || 'A new announcement is available.',
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: data.tag || 'nexium-bulletin',
        data: { url: data.url || '/student/news' },
        requireInteraction: data.priority === 'urgent',
      }),
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        clientList.forEach((client) => client.postMessage({ type: 'bulletin:notification' }));
      }),
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      const requested = event.notification.data?.url || '/student/news';
      const target = new URL(requested, self.location.origin);
      const url = target.origin === self.location.origin ? target.href : `${self.location.origin}/student/news`;
      for (const client of clientList) {
        if ('navigate' in client && client.url !== url) await client.navigate(url);
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Message from clients (e.g., cache current article)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'cache-article') {
    const url = event.data.url;
    fetch(url).then((res) => {
      if (res.ok) caches.open(ARTICLE_CACHE).then((c) => c.put(url, res));
    });
  }
  if (event.data?.type === 'queue-acknowledge') {
    queueOfflineAction({
      url: event.data.url,
      token: event.data.token,
      timestamp: Date.now(),
    }).then(() => {
      if ('sync' in self.registration) {
        return self.registration.sync.register('acknowledge-sync');
      }
    }).catch(() => {});
  }
});