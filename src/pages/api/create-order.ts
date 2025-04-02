import { NextApiRequest, NextApiResponse } from 'next';
import Razorpay from 'razorpay';
import { RAZORPAY_CONFIG } from '../../config/razorpay';

const razorpay = new Razorpay({
  key_id: 'rzp_live_qW9ZO5m1A4GhnN',
  key_secret: '3INogn4mZQj0PhbSVkhLPitI',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { amount, currency } = req.body;

    const options = {
      amount: amount,
      currency: currency,
      receipt: 'order_' + Date.now()
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json(order);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Error creating order' });
  }
} 