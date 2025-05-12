import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { DocumentSnapshot } from 'firebase-admin/firestore';

admin.initializeApp();

interface OrderData {
  totalAmount: number;
  items: Array<{
    name: string;
    quantity: number;
  }>;
  customerName?: string;
  customerPhone?: string;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
}

// Send notification when new order is created
export const sendOrderNotification = onDocumentCreated('orders/{orderId}', async (event) => {
  const snapshot = event.data as DocumentSnapshot;
  if (!snapshot) {
    console.log('No data associated with the event');
    return;
  }

  const orderData = snapshot.data() as OrderData;
  const orderId = snapshot.id;

  // Create a detailed message for the notification
  const itemsSummary = orderData.items
    .map(item => `${item.quantity}x ${item.name}`)
    .join(', ');

  // Notification payload for mobile
  const payload = {
    notification: {
      title: 'New Order Received! 🔔',
      body: `Order #${orderId} - ${orderData.customerName || 'New customer'}\nTotal: $${orderData.totalAmount.toFixed(2)}`,
    },
    data: {
      orderId: orderId,
      type: 'new_order',
      totalAmount: orderData.totalAmount.toString(),
      items: itemsSummary,
      customerPhone: orderData.customerPhone || '',
      timestamp: admin.firestore.Timestamp.now().toMillis().toString(),
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
    },
    android: {
      priority: 'high' as const,
      notification: {
        sound: 'default',
        default_sound: true,
        default_vibrate_timings: true,
        default_light_settings: true,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
  };

  try {
    // Get all admin tokens
    const tokensSnapshot = await admin.firestore()
      .collection('fcmTokens')
      .where('userId', '==', 'admin')
      .get();

    const tokens: string[] = [];
    tokensSnapshot.forEach(doc => {
      const token = doc.data().token;
      if (token) tokens.push(token);
    });

    if (tokens.length === 0) {
      console.warn('No admin tokens found for notification delivery');
      return;
    }

    // Send notifications to all admin devices
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      ...payload,
    });

    // Handle responses and clean up invalid tokens
    const failedTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        console.error('Error sending message:', resp.error);
        failedTokens.push(tokens[idx]);

        // Clean up invalid tokens
        if (resp.error?.code === 'messaging/invalid-registration-token' ||
            resp.error?.code === 'messaging/registration-token-not-registered') {
          admin.firestore()
            .collection('fcmTokens')
            .where('token', '==', tokens[idx])
            .get()
            .then(snapshot => {
              snapshot.forEach(doc => doc.ref.delete());
            })
            .catch(error => {
              console.error('Error removing invalid token:', error);
            });
        }
      }
    });

    // Log results
    console.info('Notification sending results:', {
      success: response.successCount,
      failure: response.failureCount,
      tokens: tokens.length,
      failedTokens,
    });

    // Update order with notification status
    await snapshot.ref.update({
      notificationSent: true,
      notificationTimestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

  } catch (error) {
    console.error('Error sending notifications:', error);
    throw new Error('Failed to send notifications');
  }
});

// Function to handle token updates
export const updateFCMToken = onRequest(async (req, res) => {
  try {
    const { token, userId, platform } = req.body;

    if (!token || !userId) {
      res.status(400).json({ error: 'Token and userId are required' });
      return;
    }

    const tokenData = {
      userId,
      token,
      platform: platform || 'web',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Check if token already exists
    const existingToken = await admin.firestore()
      .collection('fcmTokens')
      .where('token', '==', token)
      .get();

    if (existingToken.empty) {
      await admin.firestore().collection('fcmTokens').add(tokenData);
    } else {
      await existingToken.docs[0].ref.set(tokenData, { merge: true });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating FCM token:', error);
    res.status(500).json({ error: 'Failed to update FCM token' });
  }
});

// Test notification endpoint
export const sendTestNotification = onRequest(async (req, res) => {
  const token = 'BCgCRt5u3_sJUQtBDh29MZmXuR9igNB4wiifQWcIy3PF-GM6UlQjFUNJO0eXpOcb8L1zPk7vcV0YzlHpacfrqrI';

  const message = {
    notification: {
      title: 'Test Notification',
      body: 'This is a test notification from Firebase!',
    },
    data: {
      type: 'test',
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
      timestamp: Date.now().toString(),
    },
    token: token,
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Successfully sent notification:', response);
    res.json({ success: true, message: 'Notification sent successfully' });
  } catch (error: any) {
    console.error('Error sending notification:', error);
    res.status(500).json({ success: false, error: error?.message || 'Unknown error' });
  }
}); 