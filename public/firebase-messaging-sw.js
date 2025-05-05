importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCRKNc4sMLeQjh1p3QcXw5dgTWBBoLL6xc",
  projectId: "pittas-fb2a8",
  messagingSenderId: "215585759764",
  appId: "1:215585759764:android:d1cef04e916bf7e1b27d01",
  vapidKey: "BCgCRt5u3_sJUQtBDh29MZmXuR9igNB4wiifQWcIy3PF-GM6UlQjFUNJO0eXpOcb8L1zPk7vcV0YzlHpacfrqrI"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: payload.data?.orderId || 'new-order',
    renotify: true,
    requireInteraction: true,
    data: payload.data,
    actions: [
      {
        action: 'view_order',
        title: 'View Order'
      },
      {
        action: 'call_customer',
        title: 'Call Customer'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.orderId 
    ? `/admin/orders/${event.notification.data.orderId}`
    : '/admin/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(urlToOpen);
    })
  );
}); 