/* eslint-env serviceworker */
// Minimal service worker — FAQAT bildirishnoma ko'rsatish uchun.
// Mobil Chromium'da (Android Chrome/Edge) sahifadan `new Notification()` ishlamaydi
// ("Illegal constructor") — bildirishnoma registration.showNotification orqali
// chiqarilishi SHART. Bu SW hech narsani keshlashtirmaydi va fetch'ga aralashmaydi.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Bildirishnoma bosilganda: ochiq oynani fokuslaymiz, bo'lmasa yangisini ochamiz.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) return client.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow('/');
        return undefined;
      })
  );
});
