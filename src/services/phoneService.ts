import { db } from '../config/firebase';
import { collection, addDoc } from 'firebase/firestore';

// This function will be called when a new order is placed
export const makeOrderNotificationCall = async (orderData: any) => {
  try {
    // Store the call request in Firestore
    await addDoc(collection(db, 'callRequests'), {
      orderId: orderData.id,
      customerPhone: orderData.userPhone,
      orderAmount: orderData.finalAmount,
      paymentMethod: orderData.paymentMethod,
      status: 'pending',
      createdAt: new Date()
    });

    // The actual call will be handled by a Cloud Function
    // This is just to trigger the call process
    console.log('Call request created for order:', orderData.id);
  } catch (error) {
    console.error('Error creating call request:', error);
  }
}; 