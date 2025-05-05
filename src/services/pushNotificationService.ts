import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../config/firebase';
import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Request permission and get FCM token
export const requestNotificationPermission = async (userId: string): Promise<string | null> => {
  try {
    if (!messaging) {
      console.error('Messaging is not initialized');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'BCgCRt5u3_sJUQtBDh29MZmXuR9igNB4wiifQWcIy3PF-GM6UlQjFUNJO0eXpOcb8L1zPk7vcV0YzlHpacfrqrI'
      });

      if (token) {
        // Save the token to your backend
        await updateTokenOnServer(token, userId);
        return token;
      }
    }
    console.log('Notification permission denied');
    return null;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
};

// Update token on server
const updateTokenOnServer = async (token: string, userId: string) => {
  try {
    const tokenDoc = {
      userId,
      token,
      platform: 'web',
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp()
    };

    // Add to Firestore directly
    await addDoc(collection(db, 'fcmTokens'), tokenDoc);
    console.log('FCM token saved successfully');
  } catch (error) {
    console.error('Error saving FCM token:', error);
    throw error;
  }
};

// Handle foreground messages
export const onMessageListener = () =>
  new Promise<any>((resolve) => {
    if (!messaging) {
      console.error('Messaging is not initialized');
      return;
    }

    onMessage(messaging, (payload) => {
      console.log('Received foreground message:', payload);
      
      // Play notification sound if available
      const audio = new Audio('/notification.mp3');
      audio.play().catch(console.error);

      // Show notification using the browser API
      if (payload.notification) {
        showNotification(
          payload.notification.title || 'New Order',
          {
            body: payload.notification.body,
            icon: '/logo192.png',
            badge: '/logo192.png',
            tag: payload.data?.orderId || 'new-order',
            renotify: true,
            requireInteraction: true,
            data: payload.data
          }
        );
      }

      resolve(payload);
    });
  });

// Show notification
export const showNotification = (title: string, options: NotificationOptions) => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return;
  }

  if (Notification.permission === 'granted') {
    const notification = new Notification(title, options);

    notification.onclick = function() {
      window.focus();
      if (options.data?.orderId) {
        window.location.href = `/admin/orders/${options.data.orderId}`;
      }
      notification.close();
    };
  }
}; 