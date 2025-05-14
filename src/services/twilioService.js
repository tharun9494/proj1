require('dotenv').config();
const twilio = require('twilio');

// Initialize Twilio client
const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

/**
 * Trigger a call to admin when an order is placed
 * @param {Object} orderDetails - Details of the order
 * @returns {Promise} - Twilio execution promise
 */
async function notifyAdminOnOrder(orderDetails) {
    try {
        const execution = await client.studio.v2.flows(process.env.TWILIO_FLOW_SID)
            .executions
            .create({
                to: process.env.ADMIN_PHONE_NUMBER,
                from: process.env.TWILIO_PHONE_NUMBER,
                parameters: {
                    orderId: orderDetails.orderId,
                    customerName: orderDetails.customerName,
                    orderAmount: orderDetails.orderAmount,
                    // Add any other order details you want to pass to the flow
                }
            });

        console.log('Order notification call initiated:', execution.sid);
        return execution;
    } catch (error) {
        console.error('Error initiating order notification call:', error);
        throw error;
    }
}

module.exports = {
    notifyAdminOnOrder
}; 