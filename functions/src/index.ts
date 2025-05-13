import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { DocumentSnapshot } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';

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
  userId?: string;
}

interface TokenData {
  id: string;
  token: string;
  userId: string;
  platform: string;
  updatedAt: admin.firestore.Timestamp | null;
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
  const userId = orderData.userId; // Get the userId from the order

  if (!userId) {
    console.error('No userId found in order data');
    return;
  }

  // Create a detailed message for the notification
  const itemsSummary = orderData.items
    .map(item => `${item.quantity}x ${item.name}`)
    .join(', ');

  // Notification payload for mobile
  const payload = {
    notification: {
      title: 'Order Confirmed! 🎉',
      body: `Your order #${orderId} has been received!\nTotal: $${orderData.totalAmount.toFixed(2)}`,
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
    // Get tokens for the user who placed the order
    const tokensSnapshot = await admin.firestore()
      .collection('fcmTokens')
      .where('userId', '==', userId)
      .get();

    const tokens: string[] = [];
    tokensSnapshot.forEach(doc => {
      const token = doc.data().token;
      if (token) tokens.push(token);
    });

    if (tokens.length === 0) {
      console.warn(`No tokens found for user ${userId}`);
      return;
    }

    console.log(`Sending notification to user ${userId} with ${tokens.length} tokens`);

    // Send notifications to all user devices
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
      userId,
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

// Function to clean up duplicate tokens
export const cleanupDuplicateTokens = functions.https.onRequest(async (req, res) => {
  try {
    const tokensSnapshot = await admin.firestore().collection('fcmTokens').get();
    const tokens = tokensSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TokenData[];

    // Group tokens by userId
    const tokensByUser: Record<string, TokenData[]> = tokens.reduce((acc, token) => {
      if (!acc[token.userId]) {
        acc[token.userId] = [];
      }
      acc[token.userId].push(token);
      return acc;
    }, {} as Record<string, TokenData[]>);

    // Keep only the most recent token for each user
    for (const [userId, userTokens] of Object.entries(tokensByUser)) {
      if (userTokens.length > 1) {
        // Sort by updatedAt (most recent first)
        const sortedTokens = userTokens.sort((a, b) => {
          const dateA = a.updatedAt?.toDate() || new Date(0);
          const dateB = b.updatedAt?.toDate() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });

        // Keep the most recent token, delete others
        const [keepToken, ...deleteTokens] = sortedTokens;
        for (const token of deleteTokens) {
          await admin.firestore().collection('fcmTokens').doc(token.id).delete();
        }
      }
    }

    res.json({ success: true, message: 'Duplicate tokens cleaned up successfully' });
  } catch (error) {
    console.error('Error cleaning up tokens:', error);
    res.status(500).json({ success: false, error: 'Failed to clean up tokens' });
  }
});

// Update the updateFCMToken function
export const updateFCMToken = functions.https.onRequest(async (req, res) => {
  try {
    const { token, userId, platform = 'web' } = req.body;

    if (!token || !userId) {
      res.status(400).json({ error: 'Token and userId are required' });
      return;
    }

    console.log(`Updating FCM token for user ${userId}`);

    // Add the new token
    const tokenRef = await admin.firestore().collection('fcmTokens').add({
      token,
      userId,
      platform,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Token saved with ID: ${tokenRef.id}`);

    // Clean up old tokens
    const oldTokens = await admin.firestore()
      .collection('fcmTokens')
      .where('userId', '==', userId)
      .where('token', '!=', token)
      .get();

    console.log(`Found ${oldTokens.size} old tokens to clean up`);

    const deletePromises = oldTokens.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);

    console.log('Old tokens cleaned up successfully');

    res.status(200).json({ 
      success: true, 
      message: 'Token updated successfully',
      tokenId: tokenRef.id
    });
  } catch (error) {
    console.error('Error updating token:', error);
    res.status(500).json({ success: false, error: 'Failed to update token' });
  }
});

// Test notification endpoint
export const sendTestNotification = onRequest(async (req, res) => {
  try {
    // Get the latest admin token from Firestore
    const tokensSnapshot = await admin.firestore()
      .collection('fcmTokens')
      .where('userId', '==', 'admin')
      .get();

    console.log('Tokens query result:', tokensSnapshot.empty ? 'No tokens found' : `${tokensSnapshot.size} tokens found`);

    if (tokensSnapshot.empty) {
      res.status(400).json({ error: 'No admin tokens found' });
      return;
    }

    // Get the first token (we'll sort in memory)
    const tokens = tokensSnapshot.docs.map(doc => ({
      token: doc.data().token,
      updatedAt: doc.data().updatedAt
    }));

    // Sort by updatedAt in memory
    tokens.sort((a, b) => {
      if (!a.updatedAt || !b.updatedAt) return 0;
      return b.updatedAt.toMillis() - a.updatedAt.toMillis();
    });

    const token = tokens[0].token;

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

    const response = await admin.messaging().send(message);
    console.log('Successfully sent notification:', response);
    res.json({ success: true, message: 'Notification sent successfully' });
  } catch (error: any) {
    console.error('Error sending notification:', error);
    res.status(500).json({ success: false, error: error?.message || 'Unknown error' });
  }
});

// Function to check saved FCM tokens
export const checkFCMTokens = onRequest(async (req, res) => {
  try {
    const tokensSnapshot = await admin.firestore()
      .collection('fcmTokens')
      .get();

    const tokens = tokensSnapshot.docs.map(doc => ({
      id: doc.id,
      token: doc.data().token,
      userId: doc.data().userId,
      platform: doc.data().platform,
      updatedAt: doc.data().updatedAt ? doc.data().updatedAt.toDate() : null
    }));

    res.json({ 
      success: true, 
      count: tokens.length,
      tokens 
    });
  } catch (error) {
    console.error('Error checking FCM tokens:', error);
    res.status(500).json({ success: false, error: 'Failed to check tokens' });
  }
}); 