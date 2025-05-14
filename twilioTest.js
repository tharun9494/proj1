import dotenv from 'dotenv';
dotenv.config();
import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

client.studio.v2.flows(process.env.TWILIO_FLOW_SID)
  .executions
  .create({
    to: process.env.ADMIN_PHONE_NUMBER,
    from: process.env.TWILIO_PHONE_NUMBER,
  })
  .then(execution => console.log('Success! Call SID:', execution.sid))
  .catch(err => console.error('Twilio Error:', err.message)); 