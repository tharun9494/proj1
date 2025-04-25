import { ADMIN_CONFIG } from '../config/adminConfig';

// MSG91 configuration
const MSG91_CONFIG = {
  authKey: process.env.REACT_APP_MSG91_AUTH_KEY,
  senderId: process.env.REACT_APP_MSG91_SENDER_ID,
  route: '4' // 4 for voice calls
};

class Msg91Service {
  private static instance: Msg91Service;

  private constructor() {}

  public static getInstance(): Msg91Service {
    if (!Msg91Service.instance) {
      Msg91Service.instance = new Msg91Service();
    }
    return Msg91Service.instance;
  }

  public async makeCall(toNumber: string, orderDetails: any) {
    try {
      console.log('Initiating MSG91 call...');
      
      // Format the message
      const message = `New order received! Order ID: ${orderDetails.id}, Amount: ₹${orderDetails.totalAmount}, Customer: ${orderDetails.userName}`;
      
      const response = await fetch('https://api.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: {
          'authkey': MSG91_CONFIG.authKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flow_id: process.env.REACT_APP_MSG91_FLOW_ID,
          sender: MSG91_CONFIG.senderId,
          mobiles: toNumber,
          order_id: orderDetails.id,
          amount: orderDetails.totalAmount,
          customer_name: orderDetails.userName
        })
      });

      if (!response.ok) {
        throw new Error(`MSG91 API error: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('MSG91 call initiated:', data);
      return data;
    } catch (error) {
      console.error('Error making MSG91 call:', error);
      throw error;
    }
  }
}

export const msg91Service = Msg91Service.getInstance(); 