import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import app from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

const messaging = getMessaging(app);

export interface NotificationPayload {
  title: string;
  body: string;
  data?: {
    orderId?: string;
    phoneNumber?: string;
    action?: 'view_order' | 'call_customer';
    url?: string;
  };
}

// Function to request notification permission and get FCM token
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'BCgCRt5u3_sJUQtBDh29MZmXuR9igNB4wiifQWcIy3PF-GM6UlQjFUNJO0eXpOcb8L1zPk7vcV0YzlHpacfrqrI'
      });
      console.log('FCM Token:', token);
      return token;
    }
    console.log('Notification permission denied');
    return null;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
};

// Function to save FCM token to Firestore
export const saveFCMToken = async (userId: string, token: string) => {
  try {
    const tokensRef = collection(db, 'fcmTokens');
    await addDoc(tokensRef, {
      userId,
      token,
      createdAt: serverTimestamp(),
      platform: 'web'
    });
    console.log('FCM token saved successfully');
  } catch (error) {
    console.error('Error saving FCM token:', error);
  }
};

// Function to handle foreground messages
export const onMessageListener = () =>
  new Promise<NotificationPayload>((resolve) => {
    onMessage(messaging, (payload) => {
      console.log('Received foreground message:', payload);
      resolve({
        title: payload.notification?.title || '',
        body: payload.notification?.body || '',
        data: payload.data
      });
    });
  });

// Function to show notification
export const showNotification = (payload: NotificationPayload) => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return;
  }

  if (Notification.permission === 'granted') {
    const notification = new Notification(payload.title, {
      body: payload.body,
      icon: '/logo192.png',
      data: payload.data,
      silent: false, // Enable sound
      requireInteraction: true // Keep notification until user interacts
    });

    // Play sound manually for web notifications
    const audio = new Audio('/notification.mp3');
    audio.play().catch(console.error);

    notification.onclick = function() {
      if (payload.data?.action === 'view_order' && payload.data.orderId) {
        window.open(`/admin/orders/${payload.data.orderId}`, '_blank');
      } else if (payload.data?.action === 'call_customer' && payload.data.phoneNumber) {
        window.open(`tel:${payload.data.phoneNumber}`, '_blank');
      } else if (payload.data?.url) {
        window.open(payload.data.url, '_blank');
      }
    };
  }
};

// Function to send notification to admin
export const sendNotificationToAdmin = async (payload: NotificationPayload) => {
  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${process.env.REACT_APP_FIREBASE_SERVER_KEY}`
      },
      body: JSON.stringify({
        to: '/topics/admin',
        notification: {
          title: payload.title,
          body: payload.body,
          icon: '/logo192.png',
          click_action: 'https://your-domain.com/admin/dashboard',
          sound: 'notification.mp3', // Add sound file name
          android_channel_id: 'orders', // Specify Android channel
          priority: 'high'
        },
        data: {
          ...payload.data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK', // For Flutter/mobile apps
          sound: 'notification.mp3',
          android_channel_id: 'orders'
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'notification.mp3',
            channel_id: 'orders',
            priority: 'high',
            default_sound: true,
            default_vibrate_timings: true
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'notification.mp3',
              category: 'NEW_ORDER'
            }
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send notification');
    }

    const data = await response.json();
    console.log('Notification sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}; 