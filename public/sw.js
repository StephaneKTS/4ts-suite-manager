// public/sw.js

self.addEventListener('push', function (event) {
  if (!(self.Notification && self.Notification.permission === 'granted')) {
    return;
  }

  let data = {
    title: 'Nouvelle commande 🍽️',
    body: 'Une nouvelle commande vient d\'arriver.',
    tag: 'commande-qr',
    url: '/'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const title = data.title || 'Nouvelle commande 🍽️';
  const options = {
    body: data.body || 'Veuillez consulter l\'application.',
    icon: '/icon.png',
    badge: '/badge.png',
    vibrate: [500, 200, 500, 200, 800], // Vibration forte et rythmée en arrière-plan
    tag: data.tag || 'commande-urgente',
    renotify: true,
    requireInteraction: true, // Garde la notification active jusqu'à interaction
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Gérer le clic sur la notification pour ouvrir l'application directement
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});