import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';

const PaymentCallback = () => {
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [status, setStatus] = useState<'success' | 'failure' | 'processing'>('processing');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code === '0') {
      setStatus('success');
      clearCart();
      toast.success('Payment successful! Your order has been placed.');
    } else {
      setStatus('failure');
      toast.error('Payment failed. Please try again.');
    }

    // Redirect after a delay
    const timer = setTimeout(() => {
      navigate(status === 'success' ? '/orders' : '/cart');
    }, 3000);

    return () => clearTimeout(timer);
  }, [status, navigate, clearCart]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center"
      >
        {status === 'processing' ? (
          <div className="animate-pulse">
            <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-gray-200"></div>
            <div className="h-6 w-3/4 mx-auto mb-2 bg-gray-200 rounded"></div>
            <div className="h-4 w-1/2 mx-auto bg-gray-200 rounded"></div>
          </div>
        ) : status === 'success' ? (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600">Your order has been placed successfully.</p>
          </>
        ) : (
          <>
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
            <p className="text-gray-600">Something went wrong. Please try again.</p>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default PaymentCallback;