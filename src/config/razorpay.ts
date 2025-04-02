const isProduction = import.meta.env.VITE_APP_ENV === 'production';

export const RAZORPAY_CONFIG = {
  key_id: import.meta.env.VITE_APP_RAZORPAY_KEY_ID,
  key_secret: import.meta.env.VITE_APP_RAZORPAY_KEY_SECRET,
  currency: 'INR',
  name: "Pitta's Bawarchi",
  description: 'Food Order Payment',
  environment: isProduction ? 'production' : 'development'
};

// Add helper function to check environment
export const isTestMode = () => !isProduction; 