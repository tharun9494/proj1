import { db } from '../config/firebase';
import { collection, addDoc, doc, updateDoc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { ADMIN_CONFIG } from '../config/adminConfig';
import { freeNotificationService } from './freeNotificationService';

class NotificationService {
  private audio: HTMLAudioElement;
  private notificationTimeout: NodeJS.Timeout | null = null;
  private retryCount = 0;
  private maxRetries = ADMIN_CONFIG.maxRetries;

  constructor() {
    this.audio = new Audio(ADMIN_CONFIG.notificationSound);
    this.audio.load();
  }

  // Initialize notification listeners
  public async initializeNotifications() {
    // Request notification permission
    if (Notification.permission !== 'granted') {
      await Notification.requestPermission();
    }

    // Listen for new orders
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('notificationStatus', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const order = { id: change.doc.id, ...change.doc.data() };
          this.handleNewOrder(order);
        }
      });
    });
  }

  // Handle new order notification
  private async handleNewOrder(order: any) {
    try {
      // Play sound alert repeatedly
      this.startRepeatingSound();

      // Show browser notification
      if (Notification.permission === 'granted') {
        const notification = new Notification('🔴 URGENT: New Order!', {
          body: `Order #${order.id}\nAmount: ₹${order.totalAmount}\nCustomer: ${order.userName}\nPhone: ${order.userPhone}`,
          icon: '/logo192.png',
          tag: order.id,
          requireInteraction: true // Notification will persist until user interacts
        });

        // Open order details when notification is clicked
        notification.onclick = () => {
          window.focus();
          window.location.href = `/admin/orders/${order.id}`;
          this.stopRepeatingSound();
        };
      }

      // Show confirmation dialog with phone numbers
      const message = `New order received!\n\nOrder Details:\nOrder #: ${order.id}\nAmount: ₹${order.totalAmount}\nCustomer: ${order.userName}\n\nWould you like to call the customer at ${order.userPhone}?`;
      
      const shouldCall = window.confirm(message);
      
      if (shouldCall) {
        // Try primary phone first
        window.location.href = `tel:${order.userPhone}`;
      }

      // Update order notification status
      await updateDoc(doc(db, 'orders', order.id), {
        notificationStatus: 'sent',
        notificationTimestamp: new Date(),
        adminPhone: ADMIN_CONFIG.primaryPhone
      });

      // Store notification record
      await addDoc(collection(db, 'notifications'), {
        orderId: order.id,
        customerPhone: order.userPhone,
        adminPhone: ADMIN_CONFIG.primaryPhone,
        createdAt: new Date(),
        type: 'new_order',
        status: 'sent'
      });

    } catch (error) {
      console.error('Error handling order notification:', error);
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        setTimeout(() => this.handleNewOrder(order), 5000); // Retry after 5 seconds
      }
    }
  }

  // Start repeating sound alert
  private startRepeatingSound() {
    this.stopRepeatingSound(); // Clear any existing timeout
    
    const playSound = () => {
      this.audio.currentTime = 0;
      this.audio.play().catch(console.error);
      this.notificationTimeout = setTimeout(playSound, ADMIN_CONFIG.repeatInterval);
    };

    playSound();
  }

  // Stop repeating sound alert
  private stopRepeatingSound() {
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
      this.notificationTimeout = null;
    }
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  // Make a phone call notification for a new order
  public async makeOrderNotificationCall(order: any) {
    try {
      console.log('Starting notification process...');
      console.log('Order details:', {
        id: order.id,
        amount: order.totalAmount,
        customerName: order.userName,
        customerPhone: order.userPhone
      });

      // Validate phone number
      if (!ADMIN_CONFIG.primaryPhone) {
        throw new Error('Admin phone number not configured');
      }

      // Send free notifications
      console.log('Sending free notifications...');
      await freeNotificationService.sendNotifications(order);
      console.log('Free notifications sent successfully');

      // Update order notification status
      console.log('Updating order notification status...');
      await updateDoc(doc(db, 'orders', order.id), {
        notificationStatus: 'sent',
        notificationTimestamp: new Date(),
        adminPhone: ADMIN_CONFIG.primaryPhone,
        notificationType: 'free_notification',
        notificationAttempts: this.retryCount + 1,
        notificationMethods: ['sound', 'browser', 'whatsapp', 'alert']
      });

      // Store notification record
      console.log('Storing notification record...');
      await addDoc(collection(db, 'notifications'), {
        orderId: order.id,
        customerPhone: order.userPhone,
        adminPhone: ADMIN_CONFIG.primaryPhone,
        createdAt: new Date(),
        type: 'free_notification',
        status: 'sent',
        details: {
          orderAmount: order.totalAmount,
          customerName: order.userName,
          notificationAttempt: this.retryCount + 1,
          notificationMethods: ['sound', 'browser', 'whatsapp', 'alert']
        }
      });

      console.log('Notification process completed successfully');

    } catch (error) {
      console.error('Error in makeOrderNotificationCall:', error);
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`Retrying notification (attempt ${this.retryCount})`);
        setTimeout(() => this.makeOrderNotificationCall(order), 5000);
      } else {
        console.error('Max retries reached for notification');
        // Update order with failure status
        try {
          await updateDoc(doc(db, 'orders', order.id), {
            notificationStatus: 'failed',
            notificationError: error instanceof Error ? error.message : 'Unknown error occurred',
            lastNotificationAttempt: new Date()
          });
        } catch (updateError) {
          console.error('Error updating order with notification failure:', updateError);
        }
      }
    }
  }
}

export const notificationService = new NotificationService();

// Function to initialize notifications
export const initializeOrderNotifications = () => {
  return notificationService.initializeNotifications();
};

// Export the makeOrderNotificationCall function directly
export const makeOrderNotificationCall = (order: any) => {
  return notificationService.makeOrderNotificationCall(order);
}; 