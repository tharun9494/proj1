import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, Plus, Minus, ArrowRight, Loader, MapPin, CreditCard, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createOrder } from '../services/orderService';
import { getUserData } from '../services/userService';
import toast from 'react-hot-toast';
import { RAZORPAY_CONFIG } from '../config/razorpay';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const DELIVERY_FEE = {
  ONLINE: 0,
  COD: 40
};

const Cart = () => {
  const { items, updateQuantity, removeFromCart, totalAmount, totalItems, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'COD'>('ONLINE');
  const [address, setAddress] = useState({
    street: '',
    city: '',
    pincode: '',
    landmark: ''
  });
  const [useProfileAddress, setUseProfileAddress] = useState(true);

  React.useEffect(() => {
    const loadUserAddress = async () => {
      if (user?.id) {
        try {
          const userData = await getUserData(user.id);
          if (userData?.address) {
            setAddress(userData.address);
          }
        } catch (error) {
          console.error('Error loading user address:', error);
        }
      }
    };

    if (useProfileAddress) {
      loadUserAddress();
    }
  }, [user, useProfileAddress]);

  const loadRazorpayScript = () => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  };

  const handlePayment = async (amount: number, orderId: string) => {
    try {
      setIsProcessing(true);

      // Load Razorpay SDK first
      await loadRazorpayScript();

      // Only proceed if Razorpay is loaded
      if (!(window as any).Razorpay) {
        throw new Error('Razorpay SDK failed to load');
      }

      const options = {
        key: RAZORPAY_CONFIG.key_id,
        amount: Math.round(amount * 100),
        currency: RAZORPAY_CONFIG.currency,
        name: RAZORPAY_CONFIG.name,
        description: `Order #${orderId}`,
        prefill: {
          name: user?.displayName || '',
          email: user?.email || '',
          contact: user?.phone || ''
        },
        handler: async function (response: any) {
          try {
            // Update order status
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, {
              paymentId: response.razorpay_payment_id,
              paymentStatus: 'success',
              status: 'confirmed',
              updatedAt: serverTimestamp()
            });

            // Only clear cart after successful payment
            await clearCart();
            toast.success('Order placed successfully!');
            navigate(`/orders/${orderId}`);
          } catch (error) {
            console.error('Payment verification error:', error);
            toast.error('Payment successful but order update failed. Please contact support.');
          }
        },
        modal: {
          ondismiss: async function() {
            try {
              const orderRef = doc(db, 'orders', orderId);
              await updateDoc(orderRef, {
                paymentStatus: 'cancelled',
                status: 'cancelled',
                updatedAt: serverTimestamp()
              });
              toast.error('Payment cancelled');
            } catch (error) {
              console.error('Error updating cancelled order:', error);
            } finally {
              setIsProcessing(false);
            }
          }
        },
        theme: {
          color: '#EF4444'
        }
      };

      const razorpayInstance = new (window as any).Razorpay(options);
      razorpayInstance.open();
    } catch (error) {
      console.error('Payment initialization error:', error);
      toast.error('Failed to initialize payment. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Please login to continue');
      return;
    }

    if (!address.street || !address.city || !address.pincode) {
      toast.error('Please provide a complete delivery address');
      return;
    }

    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    try {
      setIsProcessing(true);

      // Create order first
      const orderRef = await addDoc(collection(db, 'orders'), {
        userId: user.id,
        items: items,
        totalAmount: totalAmount + (paymentMethod === 'COD' ? DELIVERY_FEE.COD : DELIVERY_FEE.ONLINE),
        address: address,
        status: 'pending',
        paymentStatus: 'pending',
        createdAt: serverTimestamp(),
        userName: user.name,
        userEmail: user.email || '',
        userPhone: user.phone || '',
        orderId: `ORDER_${Date.now()}_${user.id}`
      });

      // Initialize payment after order creation
      await handlePayment(totalAmount + (paymentMethod === 'COD' ? DELIVERY_FEE.COD : DELIVERY_FEE.ONLINE), orderRef.id);
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Checkout failed. Please try again.');
      setIsProcessing(false);
    }
  };

  // Calculate expected delivery time (30-45 minutes from now)
  const calculateExpectedDelivery = () => {
    const now = new Date();
    const minDeliveryTime = new Date(now.getTime() + 30 * 60000); // 30 minutes
    const maxDeliveryTime = new Date(now.getTime() + 45 * 60000); // 45 minutes
    return {
      min: minDeliveryTime,
      max: maxDeliveryTime
    };
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
          <p className="text-gray-600 mb-8">Add some delicious items to your cart!</p>
          <Link
            to="/menu"
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-red-500 hover:bg-red-600"
          >
            Browse Menu
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 md:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-4 md:mb-8">Shopping Cart</h1>

        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-8">
            <div className="bg-white rounded-lg shadow-sm md:shadow">
              <ul className="divide-y divide-gray-200">
                {items.map((item) => (
                  <motion.li
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 md:p-6"
                  >
                    <div className="flex items-center">
                      <img
                        src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'}
                        alt={item.name}
                        className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-lg"
                      />
                      <div className="ml-3 md:ml-6 flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm md:text-lg font-medium text-gray-900 line-clamp-1">
                            <Link to={`/menu/${item.id}`} className="hover:text-red-500">
                              {item.name}
                            </Link>
                          </h3>
                          <p className="text-sm md:text-lg font-medium text-gray-900">
                            ₹{item.price * item.quantity}
                          </p>
                        </div>
                        <div className="mt-2 md:mt-4 flex items-center justify-between">
                          <div className="flex items-center border rounded-lg">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="p-1.5 md:p-2 hover:bg-gray-100"
                              disabled={isProcessing}
                            >
                              <Minus size={14} className="md:w-4 md:h-4" />
                            </button>
                            <span className="px-2 md:px-4 py-1 md:py-2 text-sm md:text-base text-gray-700">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-1.5 md:p-2 hover:bg-gray-100"
                              disabled={isProcessing}
                            >
                              <Plus size={14} className="md:w-4 md:h-4" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-500 hover:text-red-600 p-1"
                            disabled={isProcessing}
                          >
                            <Trash2 size={16} className="md:w-5 md:h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Delivery Address Section - Compact for mobile */}
            <div className="mt-4 md:mt-8 bg-white rounded-lg shadow-sm md:shadow p-4 md:p-6">
              <h2 className="text-base md:text-lg font-medium text-gray-900 mb-3 md:mb-4">Delivery Address</h2>
              
              {user && (
                <div className="mb-3 md:mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={useProfileAddress}
                      onChange={(e) => setUseProfileAddress(e.target.checked)}
                      className="rounded border-gray-300 text-red-500 focus:ring-red-500"
                    />
                    <span className="ml-2 text-xs md:text-sm text-gray-600">
                      Use address from profile
                    </span>
                  </label>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:gap-6">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    disabled={useProfileAddress}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-6">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      disabled={useProfileAddress}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={address.pincode}
                      onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                      disabled={useProfileAddress}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                    Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    value={address.landmark}
                    onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
                    disabled={useProfileAddress}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Section - Compact for mobile */}
            <div className="mt-4 md:mt-8 bg-white rounded-lg shadow-sm md:shadow p-4 md:p-6">
              <h2 className="text-base md:text-lg font-medium text-gray-900 mb-3 md:mb-4">Payment Method</h2>
              <div className="space-y-3 md:space-y-4">
                <label className="flex items-center p-3 md:p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="ONLINE"
                    checked={paymentMethod === 'ONLINE'}
                    onChange={(e) => setPaymentMethod('ONLINE')}
                    className="h-4 w-4 text-red-500 focus:ring-red-500 border-gray-300"
                  />
                  <div className="ml-3 flex items-center">
                    <CreditCard className="h-5 w-5 md:h-6 md:w-6 text-gray-400 mr-2" />
                    <div>
                      <p className="text-xs md:text-sm font-medium text-gray-900">Online Payment</p>
                      <p className="text-xs text-gray-500">Free delivery</p>
                    </div>
                  </div>
                </label>

                <label className="flex items-center p-3 md:p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="COD"
                    checked={paymentMethod === 'COD'}
                    onChange={(e) => setPaymentMethod('COD')}
                    className="h-4 w-4 text-red-500 focus:ring-red-500 border-gray-300"
                  />
                  <div className="ml-3 flex items-center">
                    <Truck className="h-5 w-5 md:h-6 md:w-6 text-gray-400 mr-2" />
                    <div>
                      <p className="text-xs md:text-sm font-medium text-gray-900">Cash on Delivery</p>
                      <p className="text-xs text-gray-500">₹40 delivery fee</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Order Summary Section - Sticky on mobile */}
          <div className="lg:col-span-4 mt-4 md:mt-0 sticky bottom-0 lg:relative bg-white lg:bg-transparent p-4 lg:p-0 shadow-top lg:shadow-none">
            <div className="bg-white rounded-lg shadow-sm md:shadow p-4 md:p-6">
              <h2 className="text-base md:text-lg font-medium text-gray-900 mb-3 md:mb-4">Order Summary</h2>
              <div className="flow-root">
                <dl className="-my-2 md:-my-4 text-sm divide-y divide-gray-200">
                  <div className="py-2 md:py-4 flex items-center justify-between">
                    <dt className="text-xs md:text-sm text-gray-600">Subtotal ({totalItems} items)</dt>
                    <dd className="text-xs md:text-sm font-medium text-gray-900">₹{totalAmount}</dd>
                  </div>
                  <div className="py-2 md:py-4 flex items-center justify-between">
                    <dt className="text-xs md:text-sm text-gray-600">Delivery Fee</dt>
                    <dd className="text-xs md:text-sm font-medium text-gray-900">
                      ₹{paymentMethod === 'COD' ? DELIVERY_FEE.COD : DELIVERY_FEE.ONLINE}
                    </dd>
                  </div>
                  <div className="py-2 md:py-4 flex items-center justify-between">
                    <dt className="text-sm md:text-base font-medium text-gray-900">Order Total</dt>
                    <dd className="text-sm md:text-base font-medium text-gray-900">
                      ₹{totalAmount + (paymentMethod === 'COD' ? DELIVERY_FEE.COD : DELIVERY_FEE.ONLINE)}
                    </dd>
                  </div>
                </dl>
              </div>
              <button
                onClick={handleCheckout}
                disabled={isProcessing || !user}
                className="mt-4 md:mt-6 w-full flex items-center justify-center px-4 md:px-6 py-2 md:py-3 border border-transparent rounded-md shadow-sm text-sm md:text-base font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader className="animate-spin -ml-1 mr-2 h-4 w-4 md:h-5 md:w-5" />
                    Processing...
                  </>
                ) : (
                  <>
                    {user ? (
                      paymentMethod === 'ONLINE' ? 'Proceed to Pay' : 'Place Order'
                    ) : 'Login to Checkout'}
                    <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                  </>
                )}
              </button>
              {!user && (
                <p className="mt-2 text-xs md:text-sm text-gray-500 text-center">
                  Please{' '}
                  <Link to="/login" className="text-red-500 hover:text-red-600">
                    login
                  </Link>{' '}
                  to proceed with checkout
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;