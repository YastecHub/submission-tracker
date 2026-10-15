// NEXIUM service worker: offline app shell, offline student data and queued actions.
//
// Registered as /sw.js?v=<buildId>&api=<api origin>. A new build id per deploy
// makes browsers install the new worker, and the API origin lets this worker
// cache student reads from the API (which lives on a different origin).
const params = new URL(self.location.href).searchParams;
const BUILD_ID = params.get('v') || 'dev';
const API_ORIGIN = params.get('api') || '';

const SHELL_CACHE = `nexium-shell-${BUILD_ID}`;
const API_CACHE = 'nexium-api-v1';
const SHELL_URL = '/';
const PUBLIC_FILES = ['/', '/icon.svg', '/icon-192.png', '/icon-512.png', '/manifest.webmanifest'];

// Student reads that stay available offline (network first, cached copy when offline).
const CACHEABLE_API = [
  /^\/api\/student-auth\/me$/,
  /^\/api\/bulletin\/feed(\/.*)?$/,
  /^\/api\/payment-receipts\/my-tickets$/,
  /^\/api\/payment-receipts\/status\/[^/]+$/,
  /^\/api\/transparency\/ledger$/,
  /^\/api\/gpa$/,
  /^\/api\/gpa\/catalog$/,
];

// ---------------------------------------------------------------------------
// Install: cache the app shell and every built asset (including lazy pages).
// ---------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    let assets = [];
    try {
      const response = await fetch('/sw-precache.json', { cache: 'no-store' });
      if (response.ok) assets = (await response.json()).assets || [];
    } catch {
      // Precache list unavailable; the shell is still cached and assets are cached on use.
    }
    await cache.addAll(PUBLIC_FILES);
    await Promise.all(assets.map((asset) => cache.add(asset).catch(() => undefined)));
  })());
  self.skipWaiting();
});

// Activate: drop caches from older builds and tell open windows an update is ready.
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key !== SHELL_CACHE && key !== API_CACHE)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
    const windows = await self.clients.matchAll({ type: 'window' });
    windows.forEach((client) => client.postMessage({ type: 'sw:updated', version: BUILD_ID }));
    await flushQueue();
  })());
});

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (API_ORIGIN && url.origin === API_ORIGIN) {
    if (CACHEABLE_API.some((pattern) => pattern.test(url.pathname))) {
      event.respondWith(networkFirstApi(request));
    }
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Page loads: newest version when online, the cached app shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (url.pathname === '/sw-precache.json') return;

  // Built assets are content-hashed, so cache-first is safe.
  event.respondWith(cacheFirst(request));
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && new URL(request.url).pathname === SHELL_URL) {
      await cache.put(SHELL_URL, response.clone());
    }
    return response;
  } catch {
    const cached = (await cache.match(SHELL_URL)) || (await cache.match(request));
    if (cached) return cached;
    return new Response('Offline - please check your internet connection.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
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

async function networkFirstApi(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    // A request the page itself cancelled is not "offline".
    if (error && error.name === 'AbortError') throw error;
    const cached = await cache.match(request, { ignoreVary: true });
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'You are offline and this has not been saved for offline use yet.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ---------------------------------------------------------------------------
// Offline action queue (acknowledgements made while offline)
// ---------------------------------------------------------------------------
function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('nexium-offline-db', 2);
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

function storeRequest(db, mode, run) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('actions', mode);
    const result = run(tx.objectStore('actions'));
    tx.oncomplete = () => resolve(result && 'result' in result ? result.result : undefined);
    tx.onerror = () => reject(tx.error);
  });
}

async function queueAction(action) {
  const db = await openOfflineDB();
  // One pending acknowledgement per announcement is enough.
  const existing = await storeRequest(db, 'readonly', (store) => store.getAll());
  if ((existing || []).some((item) => item.url === action.url)) return;
  await storeRequest(db, 'readwrite', (store) => store.add(action));
}

let flushing = null;
function flushQueue() {
  flushing ??= doFlush().finally(() => { flushing = null; });
  return flushing;
}

async function doFlush() {
  let db;
  try {
    db = await openOfflineDB();
  } catch {
    return;
  }
  const actions = (await storeRequest(db, 'readonly', (store) => store.getAll())) || [];
  for (const item of actions) {
    let response;
    try {
      response = await fetch(item.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${item.token}` },
        body: '{}',
      });
    } catch {
      return; // Still offline; try again on the next sync / online event.
    }
    // 5xx: keep for a later retry. Anything else is final (sent, or can never succeed).
    if (response.status >= 500) continue;
    await storeRequest(db, 'readwrite', (store) => store.delete(item.id));
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    windows.forEach((client) => client.postMessage({
      type: response.ok ? 'bulletin:acknowledged' : 'bulletin:acknowledge-failed',
      announcementId: item.announcementId,
    }));
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'nexium-offline-queue') event.waitUntil(flushQueue());
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'queue-acknowledge' && data.url && data.token) {
    event.waitUntil((async () => {
      await queueAction({ url: data.url, token: data.token, announcementId: data.announcementId, timestamp: Date.now() });
      if ('sync' in self.registration) {
        await self.registration.sync.register('nexium-offline-queue').catch(() => undefined);
      }
      await flushQueue();
    })());
  }
  if (data.type === 'flush-queue') event.waitUntil(flushQueue());
  if (data.type === 'clear-student-cache') {
    event.waitUntil((async () => {
      await caches.delete(API_CACHE);
      try {
        const db = await openOfflineDB();
        await storeRequest(db, 'readwrite', (store) => store.clear());
      } catch {
        // Nothing queued.
      }
    })());
  }
});

// ---------------------------------------------------------------------------
// Push notifications
// ---------------------------------------------------------------------------
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
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: data.tag || 'nexium-bulletin',
        data: { url: data.url || '/student/news' },
        requireInteraction: data.priority === 'urgent',
      }),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Open NEXIUM tabs also show it inside the app.
        clientList.forEach((client) => client.postMessage({ type: 'bulletin:notification', title: data.title, body: data.body, url: data.url }));
      }),
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      const requested = event.notification.data?.url || '/student/news';
      const target = new URL(requested, self.location.origin);
      const url = target.origin === self.location.origin ? target.href : `${self.location.origin}/student/news`;
      for (const client of clientList) {
        if ('navigate' in client && client.url !== url) await client.navigate(url);
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
