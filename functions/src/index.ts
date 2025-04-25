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

<<<<<<< HEAD
    // Function to make a call attempt
    const makeCallAttempt = async (attemptNumber: number) => {
      try {
        // Make the call
        const call = await twilioClient.calls.create({
      to: adminPhoneNumber,
      from: twilioPhoneNumber,
      twiml: `
        <Response>
              <Say>Urgent! New order received! Order ID: ${orderId}. 
              Amount: ${formattedAmount}.
              Payment method: ${orderData.paymentMethod}.
              Customer name: ${orderData.userName}.
              Customer phone: ${orderData.userPhone}.</Say>
              <Pause length="1"/>
              <Say>Press 1 to confirm you received this message.</Say>
              <Gather numDigits="1" timeout="10"/>
              <Say>No input received. The message will be repeated.</Say>
              <Redirect/>
        </Response>
          `,
          statusCallback: `${process.env.FUNCTION_URL}/callStatus?requestId=${callRequestRef.id}&attempt=${attemptNumber}`,
          statusCallbackEvent: ['completed'],
          machineDetection: 'Enable'
    });

        // Update call request document
        await callRequestRef.update({
          [`callStatus.${attemptNumber}`]: {
            sid: call.sid,
            timestamp: new Date(),
            status: 'initiated'
          },
          attempts: attemptNumber + 1,
          lastAttempt: new Date()
        });

        return call;
      } catch (error) {
        console.error(`Call attempt ${attemptNumber + 1} failed:`, error);
        // If call fails, send SMS immediately
        await sendSMS(orderData, attemptNumber);
        return null;
      }
    };

    // Function to send SMS
    const sendSMS = async (orderData: any, attemptNumber: number) => {
      try {
        // Send SMS to primary number
        const message = await twilioClient.messages.create({
          body: `URGENT: New order #${orderId}! Amount: ${formattedAmount}, Customer: ${orderData.userName}, Phone: ${orderData.userPhone}. Please check your dashboard or call back the customer.`,
          to: adminPhoneNumber,
          from: twilioPhoneNumber
        });

        // Send to backup number if exists
        if (backupPhoneNumber) {
          await twilioClient.messages.create({
            body: `URGENT: New order #${orderId}! Amount: ${formattedAmount}, Customer: ${orderData.userName}, Phone: ${orderData.userPhone}. Please check your dashboard or call back the customer.`,
            to: backupPhoneNumber,
            from: twilioPhoneNumber
          });
        }

        await callRequestRef.update({
          [`smsStatus.${attemptNumber}`]: {
            sid: message.sid,
            timestamp: new Date(),
            status: 'sent'
          }
        });
      } catch (error) {
        console.error('Error sending SMS:', error);
      }
    };

    // Start the first call attempt
    let callSuccess = false;
    for (let attempt = 0; attempt < MAX_CALL_ATTEMPTS && !callSuccess; attempt++) {
      if (attempt > 0) {
        // Wait before retrying
        await setTimeout(RETRY_DELAY);
      }

      const call = await makeCallAttempt(attempt);
      if (call && call.status !== 'failed') {
        // Wait for call to complete and check if it was successful
        await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
        const callStatus = (await callRequestRef.get()).data()?.callStatus[attempt]?.status;
        callSuccess = callStatus === 'completed';
      }

      // If call failed or wasn't answered, send SMS
      if (!callSuccess) {
        await sendSMS(orderData, attempt);
      }
    }

    // Update the order with notification status
=======
    // Update the order with call status
>>>>>>> parent of 81d0989 (update)
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