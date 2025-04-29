importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCRKNc4sMLeQjh1p3QcXw5dgTWBBoLL6xc",
  projectId: "pittas-fb2a8",
  messagingSenderId: "215585759764",
  appId: "1:215585759764:android:d1cef04e916bf7e1b27d01"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png',
    badge: '/logo192.png',
    sound: '/notification.mp3',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    data: payload.data,
    android: {
      sound: 'notification',
      priority: 'high',
      channelId: 'orders',
      notification: {
        sound: 'notification.mp3',
        defaultSound: true,
        defaultVibrateTimings: true,
        priority: 'high'
      }
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
}); 