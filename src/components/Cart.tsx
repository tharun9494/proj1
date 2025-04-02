import { RAZORPAY_CONFIG, isTestMode } from '../config/razorpay';

const handlePayment = async (amount: number) => {
  try {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    document.body.appendChild(script);

    script.onload = () => {
      const options = {
        key: RAZORPAY_CONFIG.key_id,
        amount: amount * 100, // amount in paisa
        currency: RAZORPAY_CONFIG.currency,
        name: RAZORPAY_CONFIG.name,
        description: RAZORPAY_CONFIG.description,
        handler: async (response: any) => {
          try {
            // Handle successful payment
            const paymentId = response.razorpay_payment_id;
            
            // Add additional verification for production
            if (!isTestMode()) {
              // Verify payment signature
              const verified = await verifyPaymentSignature(
                response.razorpay_order_id,
                response.razorpay_payment_id,
                response.razorpay_signature
              );
              
              if (!verified) {
                throw new Error('Payment verification failed');
              }
            }

            // Update order status
            await updateOrderStatus(orderId, 'success', paymentId);
            toast.success('Payment successful!');
            clearCart();
            navigate('/orders');
          } catch (error) {
            console.error('Payment verification error:', error);
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: user?.displayName || '',
          email: user?.email || '',
          contact: userPhone || ''
        },
        theme: {
          color: '#EF4444'
        },
        modal: {
          ondismiss: function() {
            toast.error('Payment cancelled');
          }
        }
      };

      const razorpayInstance = new (window as any).Razorpay(options);
      
      // Add test mode warning
      if (isTestMode()) {
        console.warn('Razorpay is running in TEST mode');
        toast.info('Test Mode: Use test card details');
      }

      razorpayInstance.open();
    };

    script.onerror = () => {
      toast.error('Failed to load payment gateway');
    };
  } catch (error) {
    console.error('Payment error:', error);
    toast.error('Payment failed. Please try again.');
  }
}; 