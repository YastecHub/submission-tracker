// Network-first fetch handler (required for PWA installability)
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

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
