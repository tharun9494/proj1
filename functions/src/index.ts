import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Twilio } from 'twilio';

// Initialize Firebase Admin
initializeApp();

// Initialize Twilio client with environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const adminPhoneNumber = process.env.ADMIN_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhoneNumber || !adminPhoneNumber) {
  throw new Error('Missing required environment variables for Twilio configuration');
}

const twilioClient = new Twilio(accountSid, authToken);

// Listen for new orders
export const makeOrderCall = onDocumentCreated('orders/{orderId}', async (event) => {
  const orderData = event.data?.data();
  
  if (!orderData) {
    console.error('No data associated with the order');
    return;
  }

  try {
    // Make the call using Twilio
    await twilioClient.calls.create({
      to: adminPhoneNumber,
      from: twilioPhoneNumber,
      twiml: `
        <Response>
          <Say>New order received! Order ID: ${orderData.orderId}. 
          Amount: ${orderData.finalAmount} rupees.
          Payment method: ${orderData.paymentMethod}.</Say>
          <Pause length="2"/>
          <Say>Please check your dashboard for order details.</Say>
        </Response>
      `
    });

    // Update the order with call status
    await event.data?.ref.update({
      callStatus: 'completed',
      callCompletedAt: new Date()
    });

    console.log('Call made successfully for order:', orderData.orderId);
  } catch (error) {
    console.error('Error making call:', error);
    await event.data?.ref.update({
      callStatus: 'failed',
      callError: error instanceof Error ? error.message : 'Unknown error',
      callCompletedAt: new Date()
    });
  }
}); 