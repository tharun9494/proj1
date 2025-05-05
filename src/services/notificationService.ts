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

let notificationSound: HTMLAudioElement;

// Initialize notification sound
if (typeof window !== 'undefined') {
  notificationSound = new Audio('/notification.mp3');
  notificationSound.load(); // Preload the sound
}

// Function to request notification permission and get FCM token
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'BCgCRt5u3_sJUQtBDh29MZmXuR9igNB4wiifQWcIy3PF-GM6UlQjFUNJO0eXpOcb8L1zPk7vcV0YzlHpacfrqrI'
      });
      if (token) {
        console.log('FCM Token:', token);
        await saveFCMToken('admin', token); // Save token for admin
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

// Function to save FCM token to Firestore
export const saveFCMToken = async (userId: string, token: string) => {
  try {
    // Check if token already exists
    const tokensRef = collection(db, 'fcmTokens');
    const tokenDoc = {
      userId,
      token,
      createdAt: serverTimestamp(),
      platform: 'web',
      lastUpdated: serverTimestamp()
    };

    await addDoc(tokensRef, tokenDoc);
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
      
      // Play notification sound
      if (notificationSound) {
        notificationSound.play().catch(console.error);
      }

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
    // Play notification sound
    if (notificationSound) {
      notificationSound.play().catch(console.error);
    }

    const notification = new Notification(payload.title, {
      body: payload.body,
      icon: '/logo192.png',
      tag: payload.data?.orderId || 'new-order',
      renotify: true,
      requireInteraction: true,
      data: payload.data
    });

    notification.onclick = function() {
      if (payload.data?.action === 'view_order' && payload.data.orderId) {
        window.open(`/admin/orders/${payload.data.orderId}`, '_blank');
      } else if (payload.data?.action === 'call_customer' && payload.data.phoneNumber) {
        window.open(`tel:${payload.data.phoneNumber}`, '_blank');
      } else if (payload.data?.url) {
        window.open(payload.data.url, '_blank');
      }
      notification.close();
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
          click_action: window.location.origin + '/admin/dashboard'
        },
        data: {
          ...payload.data,
          url: window.location.origin + '/admin/dashboard'
        },
        priority: 'high',
        content_available: true
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