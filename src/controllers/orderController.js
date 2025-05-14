const { notifyAdminOnOrder } = require('../services/twilioService');

/**
 * Handle new order placement
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function placeOrder(req, res) {
    try {
        const { orderId, customerName, orderAmount, /* other order details */ } = req.body;

        // Your existing order processing logic here
        // ...

        // Notify admin about the new order
        await notifyAdminOnOrder({
            orderId,
            customerName,
            orderAmount,
            // Add any other order details you want to pass
        });

        res.status(200).json({
            success: true,
            message: 'Order placed successfully and admin notified',
            orderId
        });
    } catch (error) {
        console.error('Error processing order:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing order',
            error: error.message
        });
    }
}

module.exports = {
    placeOrder
}; 