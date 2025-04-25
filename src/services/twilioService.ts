import { ADMIN_CONFIG } from '../config/adminConfig';

// Twilio configuration
const TWILIO_CONFIG = {
  accountSid: process.env.REACT_APP_TWILIO_ACCOUNT_SID,
  authToken: process.env.REACT_APP_TWILIO_AUTH_TOKEN,
  fromNumber: process.env.REACT_APP_TWILIO_PHONE_NUMBER
};

class TwilioService {
  private static instance: TwilioService;

  private constructor() {}

  public static getInstance(): TwilioService {
    if (!TwilioService.instance) {
      TwilioService.instance = new TwilioService();
    }
    return TwilioService.instance;
  }

  public async makeCall(toNumber: string, orderDetails: any) {
    try {
      console.log('Initiating Twilio call...');
      
      const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + TWILIO_CONFIG.accountSid + '/Calls.json', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(TWILIO_CONFIG.accountSid + ':' + TWILIO_CONFIG.authToken),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'To': toNumber,
          'From': TWILIO_CONFIG.fromNumber,
          'Url': `${window.location.origin}/twilio/call-handler?orderId=${orderDetails.id}`,
          'StatusCallback': `${window.location.origin}/twilio/call-status`,
          'StatusCallbackEvent': 'initiated ringing answered completed',
          'StatusCallbackMethod': 'POST'
        })
      });

      if (!response.ok) {
        throw new Error(`Twilio API error: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Twilio call initiated:', data);
      return data;
    } catch (error) {
      console.error('Error making Twilio call:', error);
      throw error;
    }
  }
}

export const twilioService = TwilioService.getInstance(); 