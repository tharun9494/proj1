import React, { useEffect, useState } from 'react';
import { requestNotificationPermission, onMessageListener, showNotification } from '../services/pushNotificationService';
import { useAuth } from '../contexts/AuthContext'; // Assuming you have an auth context

interface NotificationHandlerProps {
  onNewOrder?: (orderId: string) => void;
}

const NotificationHandler: React.FC<NotificationHandlerProps> = ({ onNewOrder }) => {
  const [isTokenFound, setTokenFound] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    let unsubscribePromise: Promise<any> | null = null;

    const setupNotifications = async () => {
      if (user?.uid) {
        try {
          // Request permission and get token
          const token = await requestNotificationPermission(user.uid);
          if (token) {
            setTokenFound(true);
            console.log('Notification permission granted');
          }

          // Listen for foreground messages
          unsubscribePromise = onMessageListener();
          const payload = await unsubscribePromise;
          
          if (payload) {
            const { title, body } = payload.notification;
            const orderId = payload.data?.orderId;

            // Show notification
            showNotification(title, {
              body,
              icon: '/logo192.png',
              badge: '/logo192.png',
              requireInteraction: true,
              data: payload.data
            });

            // Call the callback if provided
            if (orderId && onNewOrder) {
              onNewOrder(orderId);
            }
          }
        } catch (error) {
          console.error('Error setting up notifications:', error);
        }
      }
    };

    setupNotifications();

    return () => {
      // Cleanup is handled by Firebase automatically
      unsubscribePromise = null;
    };
  }, [user, onNewOrder]);

  return null; // This component doesn't render anything
};

export default NotificationHandler; 