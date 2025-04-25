import { ADMIN_CONFIG } from '../config/adminConfig';

class FreeNotificationService {
  private static instance: FreeNotificationService;
  private audio: HTMLAudioElement;
  private notificationTimeout: NodeJS.Timeout | null = null;

  private constructor() {
    this.audio = new Audio(ADMIN_CONFIG.notificationSound);
    this.audio.load();
  }

  public static getInstance(): FreeNotificationService {
    if (!FreeNotificationService.instance) {
      FreeNotificationService.instance = new FreeNotificationService();
    }
    return FreeNotificationService.instance;
  }

  private startRepeatingSound() {
    this.stopRepeatingSound();
    const playSound = () => {
      this.audio.currentTime = 0;
      this.audio.play().catch(console.error);
      this.notificationTimeout = setTimeout(playSound, ADMIN_CONFIG.repeatInterval);
    };
    playSound();
  }

  private stopRepeatingSound() {
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
      this.notificationTimeout = null;
    }
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  public async sendNotifications(order: any) {
    try {
      console.log('Starting free notification process...');
      
      // 1. Play sound alert
      this.startRepeatingSound();
      console.log('Playing notification sound...');

      // 2. Show browser notification
      if (Notification.permission === 'granted') {
        console.log('Showing browser notification...');
        const notification = new Notification('🔴 URGENT: New Order!', {
          body: `Order #${order.id}\nAmount: ₹${order.totalAmount}\nCustomer: ${order.userName}\nPhone: ${order.userPhone}`,
          icon: '/logo192.png',
          tag: order.id,
          requireInteraction: true
        });

        notification.onclick = () => {
          window.focus();
          window.location.href = `/admin/orders/${order.id}`;
          this.stopRepeatingSound();
        };
      }

      // 3. Open WhatsApp with pre-filled message
      const whatsappMessage = `New Order Alert!%0AOrder ID: ${order.id}%0AAmount: ₹${order.totalAmount}%0ACustomer: ${order.userName}%0APhone: ${order.userPhone}`;
      const whatsappUrl = `https://wa.me/${ADMIN_CONFIG.primaryPhone.replace('+', '')}?text=${whatsappMessage}`;
      window.open(whatsappUrl, '_blank');

      // 4. Show alert with order details
      const alertMessage = `🔴 NEW ORDER ALERT!\n\nOrder #${order.id}\nAmount: ₹${order.totalAmount}\nCustomer: ${order.userName}\nPhone: ${order.userPhone}\n\nClick OK to view order details`;
      alert(alertMessage);

      console.log('Free notifications sent successfully');
      return true;
    } catch (error) {
      console.error('Error sending free notifications:', error);
      throw error;
    }
  }
}

export const freeNotificationService = FreeNotificationService.getInstance(); 