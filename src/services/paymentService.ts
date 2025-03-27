interface PaymentRequest {
  amount: number;
  orderId: string;
  userId: string;
  userEmail: string;
  userName: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const loadRazorpayScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      // Check if Razorpay is loaded
      const checkRazorpay = () => {
        if (window.Razorpay) {
          resolve();
        } else {
          setTimeout(checkRazorpay, 100);
        }
      };
      checkRazorpay();
    };
    script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
    document.body.appendChild(script);
  });
};

export const initiatePayment = async ({
  amount,
  orderId,
  userId,
  userEmail,
  userName
}: PaymentRequest) => {
  try {
    // Load Razorpay script first
    await loadRazorpayScript();

    return new Promise((resolve, reject) => {
      const options = {
        key: 'rzp_test_pw808F7o7C9qJy',
        amount: amount * 100, // Amount in paise
        currency: 'INR',
        name: "Pitta's Bawarchi",
        description: 'Food Order Payment',
        order_id: orderId,
        handler: function (response: any) {
          // Payment successful
          resolve({
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            signature: response.razorpay_signature
          });
        },
        prefill: {
          name: userName,
          email: userEmail,
          contact: "" // Add phone number if available
        },
        notes: {
          userId: userId
        },
        theme: {
          color: '#EF4444' // Red color matching your theme
        },
        modal: {
          ondismiss: function() {
            reject(new Error('Payment cancelled by user'));
          }
        }
      };

      try {
        const razorpay = new window.Razorpay(options);
        razorpay.on('payment.failed', function (response: any) {
          reject(new Error('Payment failed'));
        });
        razorpay.open();
      } catch (error) {
        reject(new Error('Failed to initialize Razorpay'));
      }
    });
  } catch (error) {
    throw error;
  }
};