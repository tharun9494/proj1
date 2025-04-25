import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, Plus, Minus, ArrowRight, Loader, MapPin, CreditCard, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createOrder } from '../services/orderService';
import { getUserData } from '../services/userService';
import toast from 'react-hot-toast';
import { RAZORPAY_CONFIG } from '../config/razorpay';
import { collection, addDoc, serverTimestamp, writeBatch, increment } from 'firebase/firestore';
import { db } from '../config/firebase';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { makeOrderNotificationCall } from '../services/phoneService';

interface RestaurantStatus {
  isOpen: boolean;
  lastUpdated: Date;
}

const DELIVERY_FEE = {
  ONLINE: 0,
  COD: 40
};

const GST_PERCENTAGE = {
  CGST: 2.50,
  SGST: 2.50
};

const DISCOUNT_PERCENTAGE = 5; // 5% discount

// Update delivery fee logic
const calculateDeliveryFee = (subtotal: number, paymentMethod: 'ONLINE' | 'COD') => {
  if (subtotal >= 500) {
    return 0; // Free delivery for orders above ₹500
  }
  return 40; // ₹40 delivery fee for orders below ₹500
};

// Update GST calculation
const calculateGST = (amount: number) => {
  const cgst = Math.round((amount * GST_PERCENTAGE.CGST) / 100);
  const sgst = Math.round((amount * GST_PERCENTAGE.SGST) / 100);
  return { cgst, sgst, total: cgst + sgst };
};

const calculateDiscount = (amount: number) => {
  return Math.round((amount * DISCOUNT_PERCENTAGE) / 100);
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
    landmark: '',
    phone: '',
    alternativePhone: ''
  });
  const [useProfileAddress, setUseProfileAddress] = useState(true);
  const [restaurantStatus, setRestaurantStatus] = useState<RestaurantStatus | null>(null);

  useEffect(() => {
    const statusRef = doc(db, 'restaurant', 'status');
    
    // Listen for status changes
    const unsubscribe = onSnapshot(statusRef, 
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setRestaurantStatus({
            isOpen: data.isOpen,
            lastUpdated: data.lastUpdated
          });
        }
      },
      (error) => {
        console.error('Error listening to restaurant status:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    const loadUserAddress = async () => {
      if (user?.id) {
        try {
          const userData = await getUserData(user.id);
          console.log('Fetched user data:', userData); // Debug log
          if (userData) {
            setAddress(prev => ({
              ...prev,
              street: userData.address?.street || '',
              city: userData.address?.city || '',
              pincode: userData.address?.pincode || '',
              landmark: userData.address?.landmark || '',
              phone: userData.phone || '', // Set phone from user data
              alternativePhone: userData.alternativePhone || '' // Set alternative phone from user data
            }));
          }
        } catch (error) {
          console.error('Error loading user address:', error);
          toast.error('Failed to load your saved address');
        }
      }
    };

    if (useProfileAddress) {
      loadUserAddress();
    } else {
      // Reset phone numbers when not using profile address
      setAddress(prev => ({
        ...prev,
        phone: '',
        alternativePhone: ''
      }));
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
          name: user?.name || '',
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

  // Update the calculations in the Cart component
  const subtotal = totalAmount;
  const discount = calculateDiscount(subtotal);
  const gst = calculateGST(subtotal - discount); // Calculate GST after discount
  const deliveryFee = calculateDeliveryFee(subtotal - discount, paymentMethod);
  const finalAmount = subtotal - discount + gst.total + deliveryFee;

  // Modify handleCheckout function
  const handleCheckout = async () => {
    if (!user) {
      toast.error('Please login to continue');
      return;
    }

    if (!restaurantStatus?.isOpen) {
      toast.error('Restaurant is currently closed. Please try again during business hours (11:00 AM - 10:00 PM)');
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

      // Fetch complete user data to get both phone numbers
      const userData = await getUserData(user.id);

      // Create order first
      const orderRef = await addDoc(collection(db, 'orders'), {
        userId: user.id,
        items: items,
        subtotal: subtotal,
        discount: discount,
        discountPercentage: DISCOUNT_PERCENTAGE,
        cgst: gst.cgst,
        sgst: gst.sgst,
        totalGst: gst.total,
        cgstPercentage: GST_PERCENTAGE.CGST,
        sgstPercentage: GST_PERCENTAGE.SGST,
        deliveryFee: deliveryFee,
        finalAmount: finalAmount,
        address: address,
        status: paymentMethod === 'COD' ? 'confirmed' : 'pending',
        paymentStatus: paymentMethod === 'COD' ? 'pending' : 'pending',
        paymentMethod: paymentMethod,
        createdAt: serverTimestamp(),
        userName: user.name,
        userEmail: user.email || '',
        userPhone: userData?.phone || user.phone || '',
        alternativePhone: userData?.alternativePhone || '',
        orderId: `ORDER_${Date.now()}_${user.id}`
      });

      if (paymentMethod === 'COD') {
        // For COD, directly process the order without payment
        await clearCart();
        toast.success('Order placed successfully!');
        navigate('/'); // Redirect to home page
      } else {
        // For online payment, proceed with Razorpay
        await handlePayment(finalAmount, orderRef.id);
      }
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

  const handlePlaceOrder = async () => {
    if (!user) {
      toast.error('Please login to place an order');
      return;
    }

    try {
      console.log('Starting order placement process...');
      setIsProcessing(true);
      const orderRef = collection(db, 'orders');
      const batch = writeBatch(db);

      // Create order document
      const orderData = {
        userId: user.id,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        totalAmount: totalAmount,
        status: 'pending',
        createdAt: serverTimestamp(),
        userName: user.name || 'Guest',
        userPhone: user.phone || '',
        address: {
          street: '',
          city: '',
          pincode: '',
        },
        paymentStatus: 'pending',
        paymentMethod: 'COD'
      };

      console.log('Creating order with data:', orderData);

      const orderDocRef = doc(orderRef);
      batch.set(orderDocRef, orderData);

      // Update orderCount for each item
      items.forEach(item => {
        const itemRef = doc(db, 'menuItems', item.id);
        batch.update(itemRef, {
          orderCount: increment(1)
        });
      });

      console.log('Committing batch write...');
      await batch.commit();
      console.log('Order created successfully with ID:', orderDocRef.id);
      
      // Trigger call notification
      try {
        console.log('Attempting to trigger phone call notification...');
        const notificationData = {
          ...orderData,
          id: orderDocRef.id
        };
        console.log('Notification data:', notificationData);
        await makeOrderNotificationCall(notificationData);
        console.log('Phone call notification triggered successfully');
      } catch (error) {
        console.error('Error in phone call notification:', error);
        // Don't fail the order if call notification fails
      }

      clearCart();
      toast.success('Order placed successfully!');
      navigate('/orders');
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
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
                {/* Phone Numbers Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={address.phone}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setAddress(prev => ({ ...prev, phone: value }));
                        }}
                        disabled={useProfileAddress}
                        className={`mt-1 block w-full rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 text-sm
                          ${useProfileAddress ? 'bg-gray-50 border-gray-300' : 'border-gray-300'}
                          ${!address.phone && 'border-red-300'}`}
                        placeholder="Enter delivery phone number"
                        maxLength={10}
                      />
                      {address.phone && (
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                          {address.phone.length}/10
                        </span>
                      )}
                    </div>
                    {!address.phone && (
                      <p className="mt-1 text-xs text-red-500">Phone number is required</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                      Alternative Phone
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={address.alternativePhone}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setAddress(prev => ({ ...prev, alternativePhone: value }));
                        }}
                        disabled={useProfileAddress}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm 
                          focus:ring-red-500 focus:border-red-500 text-sm
                          ${useProfileAddress ? 'bg-gray-50' : ''}`}
                        placeholder="Enter alternative number"
                        maxLength={10}
                      />
                      {address.alternativePhone && (
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                          {address.alternativePhone.length}/10
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Existing Address Fields */}
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                    Street Address *
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
                      City *
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
                      Pincode *
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

            
          </div>

          {/* Order Summary Section - Sticky on mobile */}
          <div className="lg:col-span-4 mt-4 md:mt-0 sticky bottom-0 lg:relative bg-white lg:bg-transparent p-4 lg:p-0 shadow-top lg:shadow-none">
            <div className="bg-white rounded-lg shadow-sm md:shadow p-4 md:p-6">
              <h2 className="text-base md:text-lg font-medium text-gray-900 mb-3 md:mb-4">Order Summary</h2>
              <div className="flow-root">
                <dl className="-my-2 md:-my-4 text-sm divide-y divide-gray-200">
                  <div className="py-2 md:py-4 flex items-center justify-between">
                    <dt className="text-xs md:text-sm text-gray-600">Subtotal ({totalItems} items)</dt>
                    <dd className="text-xs md:text-sm font-medium text-gray-900">₹{subtotal}</dd>
                  </div>
                  
                  {/* Discount Section */}
                  <div className="py-2 md:py-4 flex items-center justify-between">
                    <dt className="text-xs md:text-sm text-gray-600">Discount ({DISCOUNT_PERCENTAGE}%)</dt>
                    <dd className="text-xs md:text-sm font-medium text-green-600">-₹{discount}</dd>
                  </div>

                  {/* CGST Section */}
                  <div className="py-2 md:py-4 flex items-center justify-between">
                    <dt className="text-xs md:text-sm text-gray-600">CGST ({GST_PERCENTAGE.CGST}%)</dt>
                    <dd className="text-xs md:text-sm font-medium text-gray-900">₹{gst.cgst}</dd>
                  </div>

                  {/* SGST Section */}
                  <div className="py-2 md:py-4 flex items-center justify-between">
                    <dt className="text-xs md:text-sm text-gray-600">SGST ({GST_PERCENTAGE.SGST}%)</dt>
                    <dd className="text-xs md:text-sm font-medium text-gray-900">₹{gst.sgst}</dd>
                  </div>
                  
                  {/* Delivery Fee Section with Info */}
                  <div className="py-2 md:py-4">
                    <div className="flex items-center justify-between">
                      <dt className="text-xs md:text-sm text-gray-600">Delivery Fee</dt>
                      <dd className="text-xs md:text-sm font-medium text-gray-900">
                        {deliveryFee === 0 ? (
                          <span className="text-green-600">FREE</span>
                        ) : (
                          `₹${deliveryFee}`
                        )}
                      </dd>
                    </div>
                    {subtotal < 500 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Add items worth ₹{500 - subtotal} more for free delivery
                      </p>
                    )}
                  </div>

                  <div className="py-2 md:py-4 flex items-center justify-between">
                    <dt className="text-sm md:text-base font-medium text-gray-900">Order Total</dt>
                    <dd className="text-sm md:text-base font-medium text-gray-900">
                      ₹{finalAmount}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Payment Method Section */}
              <div className="mt-4 space-y-3 md:space-y-4">
                <label className="flex items-center p-3 md:p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="ONLINE"
                    checked={paymentMethod === 'ONLINE'}
                    onChange={(e) => setPaymentMethod('ONLINE')}
                    className="h-4 w-4 text-red-500 focus:ring-red-500 border-gray-300"
                  />
                  <div className="ml-3">
                    <p className="text-xs md:text-sm font-medium text-gray-900">Online Payment</p>
                    <p className="text-xs text-gray-500">Pay now and get instant confirmation</p>
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
                  <div className="ml-3">
                    <p className="text-xs md:text-sm font-medium text-gray-900">Cash on Delivery</p>
                    <p className="text-xs text-gray-500">Pay when your order arrives</p>
                  </div>
                </label>
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
                      paymentMethod === 'ONLINE' ? 'Pay ₹' + finalAmount : 'Place Order'
                    ) : 'Login to Checkout'}
                    <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                  </>
                )}
              </button>

              {/* Free Delivery Progress Bar */}
              {subtotal < 500 && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${(subtotal / 500) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-center mt-2 text-gray-600">
                    {subtotal < 500 ? (
                      `Add ₹${500 - subtotal} more for free delivery`
                    ) : (
                      'Yay! You get free delivery'
                    )}
                  </p>
                </div>
              )}

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