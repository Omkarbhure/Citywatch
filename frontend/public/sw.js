// Service Worker for CityWatch Web Push Notifications

self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  let data = {};
  try {
    data = event.data.json();
  } catch (err) {
    data = { title: 'CityWatch Notification', body: event.data.text() };
  }

  const title = data.title || 'CityWatch Incident Update';
  const options = {
    body: data.body || 'An update occurred on an incident you are following.',
    icon: '/vite.svg',
    badge: '/vite.svg',
    data: {
      incidentId: data.incidentId,
      url: data.incidentId ? `/incidents` : '/'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/incidents';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
