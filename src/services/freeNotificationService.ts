import { ADMIN_CONFIG } from '../config/adminConfig';

class FreeNotificationService {
  private static instance: FreeNotificationService;
  private audio: HTMLAudioElement;
  private notificationTimeout: NodeJS.Timeout | null = null;
  private maxSoundDuration = 30000; // 30 seconds max sound duration
  private soundStartTime: number | null = null;

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
    this.soundStartTime = Date.now();
    
    const playSound = () => {
      // Check if we've exceeded max duration
      if (this.soundStartTime && (Date.now() - this.soundStartTime) > this.maxSoundDuration) {
        this.stopRepeatingSound();
        return;
      }

      // Check if user has interacted with the page
      if (document.visibilityState === 'visible') {
        this.audio.currentTime = 0;
        this.audio.play().catch(error => {
          console.error('Error playing sound:', error);
          this.stopRepeatingSound();
        });
      }
      
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
    this.soundStartTime = null;
  }

  private async requestNotificationPermission(): Promise<boolean> {
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  public async sendNotifications(order: any) {
    try {
      console.log('Starting free notification process...');
      
      // 1. Play sound alert with auto-stop after max duration
      this.startRepeatingSound();
      console.log('Playing notification sound...');

      // 2. Show browser notification if permission is granted
      const hasPermission = await this.requestNotificationPermission();
      if (hasPermission) {
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

        // Auto-close notification after 30 seconds if not clicked
        setTimeout(() => {
          notification.close();
          this.stopRepeatingSound();
        }, 30000);
      }

      // 3. Open WhatsApp with pre-filled message
      try {
        const whatsappMessage = `New Order Alert!%0AOrder ID: ${order.id}%0AAmount: ₹${order.totalAmount}%0ACustomer: ${order.userName}%0APhone: ${order.userPhone}`;
        const whatsappUrl = `https://wa.me/${ADMIN_CONFIG.primaryPhone.replace('+', '')}?text=${whatsappMessage}`;
        window.open(whatsappUrl, '_blank');
      } catch (error) {
        console.error('Error opening WhatsApp:', error);
      }

      // 4. Show alert with order details
      const alertMessage = `🔴 NEW ORDER ALERT!\n\nOrder #${order.id}\nAmount: ₹${order.totalAmount}\nCustomer: ${order.userName}\nPhone: ${order.userPhone}\n\nClick OK to view order details`;
      alert(alertMessage);

      console.log('Free notifications sent successfully');
      return true;
    } catch (error) {
      console.error('Error sending free notifications:', error);
      this.stopRepeatingSound();
      throw error;
    }
  }
}

export const freeNotificationService = FreeNotificationService.getInstance(); 