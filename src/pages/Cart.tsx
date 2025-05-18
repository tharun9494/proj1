import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, Plus, Minus, ArrowRight, Loader, MapPin, CreditCard, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { placeOrder } from '../services/orderService';
import { getUserData } from '../services/userService';
import toast from 'react-hot-toast';
import { RAZORPAY_CONFIG } from '../config/razorpay';
import { collection, addDoc, serverTimestamp, writeBatch, increment, query, where, getDocs, runTransaction } from 'firebase/firestore';
import { db } from '../config/firebase';
import { doc, updateDoc, onSnapshot, getDoc } from 'firebase/firestore';

interface RestaurantStatus {
  isOpen: boolean;
  lastUpdated: any; // You can use a more specific type if needed
}

interface User {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  isVeg?: boolean;
  image?: string;
}

const DELIVERY_FEE = {
  ONLINE: 0,
  COD: 40
};

const GST_RATES = {
  CGST: 2.50,
  SGST: 2.50
};

const DISCOUNT_PERCENTAGE = 5;  

const TOTAL_GST_PERCENTAGE = 5; // Total GST percentage (2.5% CGST + 2.5% SGST)

// Update delivery fee logic
const calculateDeliveryFee = (subtotal: number, paymentMethod: 'ONLINE' | 'COD') => {
  if (subtotal >= 500) {
    return 0; // Free delivery for orders above ₹500
  }
  return 40; // ₹40 delivery fee for orders below ₹500
};

// Calculate GST amounts separately
const calculateGST = (amount: number) => {
  return {
    CGST: Math.round((amount * GST_RATES.CGST) / 100),
    SGST: Math.round((amount * GST_RATES.SGST) / 100)
  };
};

// Calculate discount amount  x
const calculateDiscount = (amount: number) => {
  return Math.round((amount * DISCOUNT_PERCENTAGE) / 100);
};

const Cart = () => {
  const { items, updateQuantity, removeFromCart, totalAmount, totalItems, clearCart } = useCart();
  const { user } = useAuth() as { user: User | null };
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
    let retryCount = 0;
    const maxRetries = 3;
    
    const setupListener = () => {
      try {
        const unsubscribe = onSnapshot(
          statusRef,
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
            // Only retry if it's not a QUIC protocol error
            if (!error.message?.includes('QUIC_PROTOCOL_ERROR') && retryCount < maxRetries) {
              retryCount++;
              console.log(`Retrying connection (${retryCount}/${maxRetries})...`);
              setTimeout(setupListener, 2000); // Retry after 2 seconds
            }
          }
        );

        return unsubscribe;
      } catch (error) {
        console.error('Error setting up listener:', error);
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(setupListener, 2000);
        }
        return () => {};
      }
    };

    const unsubscribe = setupListener();
    return () => {
      unsubscribe();
    };
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
      // Check if script is already loaded
      if (window.Razorpay) {
        resolve(window.Razorpay);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        if (window.Razorpay) {
          resolve(window.Razorpay);
        } else {
          reject(new Error('Razorpay failed to load'));
        }
      };
      script.onerror = () => {
        reject(new Error('Failed to load Razorpay script'));
      };
      document.body.appendChild(script);
    });
  };

  let checkoutInProgress = false;

  const handleCheckout = async () => {
    if (checkoutInProgress) {
      console.log('Checkout already in progress');
      return;
    }
    checkoutInProgress = true;

    try {
      setIsProcessing(true);

      // Validate cart and user data
      if (!user) {
        toast.error('Please login to place an order');
        return;
      }

      if (!address) {
        toast.error('Please add a delivery address');
        return;
      }

      if (items.length === 0) {
        toast.error('Your cart is empty');
        return;
      }

      // Check if restaurant is open
      const restaurantRef = doc(db, 'restaurant', 'status');
      const restaurantDoc = await getDoc(restaurantRef);
      const restaurantStatus = restaurantDoc.data()?.isOpen;

      if (!restaurantStatus) {
        toast.error('Restaurant is currently closed');
        return;
      }

      // Calculate final amount
      const itemTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const deliveryCharges = itemTotal < 500 ? 40 : 0;
      const finalAmount = itemTotal + deliveryCharges;

      // Prepare order data
      const apiOrderData = {
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image
        })),
        amount: itemTotal,
        deliveryCharges: deliveryCharges,
        finalAmount: finalAmount,
        paymentMethod: paymentMethod,
        address: {
          street: address.street,
          city: address.city,
          pincode: address.pincode,
          landmark: address.landmark
        },
        customerName: user.name,
        customerEmail: user.email,
        phone: address.phone,
        alternativePhone: address.alternativePhone
      };

      // Check for existing pending orders
      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('userId', '==', user.id),
        where('status', 'in', ['pending', 'processing']),
        where('createdAt', '>=', new Date(Date.now() - 2 * 60 * 1000)) // Last 2 minutes
      );
      
      const existingOrders = await getDocs(q);
      
      if (!existingOrders.empty) {
        const existingOrder = existingOrders.docs[0].data();
        const orderTime = existingOrder.createdAt?.toDate?.() || new Date();
        const timeDiff = Date.now() - orderTime.getTime();
        
        if (timeDiff <= 2 * 60 * 1000) {
          toast.error('You have a recent pending order. Please wait 2 minutes before placing another order.');
          return;
        }
      }

      if (paymentMethod === 'COD') {
        try {
          // Call admin API first
          const adminResponse = await placeOrder(apiOrderData);
          
          if (adminResponse.success) {
            // Only create order in Firebase after successful admin API response
            const orderDocRef = doc(collection(db, 'orders'));
            const orderId = orderDocRef.id;

            const firestoreOrderData = {
              ...apiOrderData,
              orderId: orderId,
              userId: user.id,
              status: 'pending',
              createdAt: serverTimestamp(),
              paymentStatus: 'pending',
              updatedAt: serverTimestamp(),
              customerPhone: address.phone,
              customerAlternativePhone: address.alternativePhone || ''
            };

            // Use a transaction to ensure atomicity
            await runTransaction(db, async (transaction) => {
              // Set the order document
              transaction.set(orderDocRef, firestoreOrderData);

              // Update orderCount for each item
              for (const item of items) {
                const itemRef = doc(db, 'menuItems', item.id);
                transaction.update(itemRef, {
                  orderCount: increment(1)
                });
              }
            });

            await clearCart();
            toast.success('Order placed successfully!');
            navigate('/orders');
          } else {
            toast.error(adminResponse.message || 'Failed to place order. Please try again.');
          }
        } catch (error) {
          console.error('Error placing order:', error);
          if (error instanceof Error) {
            toast.error(error.message);
          } else {
            toast.error('Failed to place order. Please try again.');
          }
        }
      } else {
        // For online payment, proceed with payment
        await handlePayment(finalAmount, apiOrderData);
      }
    } catch (error) {
      console.error('Error in checkout:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to process checkout. Please try again.');
      }
    } finally {
      setIsProcessing(false);
      checkoutInProgress = false;
    }
  };

  const handlePayment = async (amount: number, orderData: any) => {
    try {
      // Load Razorpay script first
      await loadRazorpayScript();

      if (!window.Razorpay) {
        throw new Error('Razorpay not initialized');
      }

      const options = {
        key: RAZORPAY_CONFIG.key_id,
        amount: amount * 100, // Razorpay expects amount in paise
        currency: "INR",
        name: "Pittas",
        description: "Food Order Payment",
        handler: async function (response: any) {
          try {
            // Call admin API with payment details
            const adminResponse = await placeOrder({
              ...orderData,
              paymentId: response.razorpay_payment_id,
              paymentStatus: 'success'
            });

            if (adminResponse.success) {
              // Only create order in Firebase after successful payment and admin API response
              const orderDocRef = doc(collection(db, 'orders'));
              const orderId = orderDocRef.id;

              const firestoreOrderData = {
                ...orderData,
                orderId: orderId,
                userId: user?.id,
                status: 'confirmed',
                createdAt: serverTimestamp(),
                paymentStatus: 'success',
                paymentId: response.razorpay_payment_id,
                updatedAt: serverTimestamp(),
                customerPhone: orderData.phone,
                customerAlternativePhone: orderData.alternativePhone || ''
              };

              // Use a transaction to ensure atomicity
              await runTransaction(db, async (transaction) => {
                // Set the order document
                transaction.set(orderDocRef, firestoreOrderData);

                // Update orderCount for each item
                for (const item of orderData.items) {
                  const itemRef = doc(db, 'menuItems', item.id);
                  transaction.update(itemRef, {
                    orderCount: increment(1)
                  });
                }
              });

              // Clear cart and redirect
              await clearCart();
              toast.success('Payment successful! Order placed.');
              navigate(`/orders/${orderId}`);
            } else {
              throw new Error(adminResponse.message || 'Failed to update order with admin');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            toast.error('Payment successful but order update failed. Please contact support.');
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: orderData.phone
        },
        theme: {
          color: "#EF4444"
        },
        modal: {
          ondismiss: function() {
            toast.error('Payment cancelled');
          }
        }
      };

      try {
        const razorpay = new window.Razorpay(options);
        razorpay.on('payment.failed', function (response: any) {
          toast.error('Payment failed. Please try again.');
          console.error('Payment failed:', response.error);
        });
        razorpay.open();
      } catch (error) {
        console.error('Razorpay initialization error:', error);
        throw new Error('Failed to initialize payment gateway');
      }
    } catch (error) {
      console.error('Payment initialization error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to initialize payment. Please try again.');
    }
  };

  // Calculate all amounts including GST and discount
  const subtotal = totalAmount;
  const gstAmounts = calculateGST(subtotal);
  const totalGST = gstAmounts.CGST + gstAmounts.SGST;
  const discountAmount = calculateDiscount(subtotal);
  const deliveryFee = calculateDeliveryFee(subtotal, paymentMethod);
  const finalAmount = subtotal + totalGST - discountAmount + deliveryFee;

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

  // Add error boundary for image loading
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://via.placeholder.com/150?text=Food+Image';
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
                        src={item.image || 'https://via.placeholder.com/150?text=Food+Image'}
                        alt={item.name}
                        className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-lg"
                        onError={handleImageError}
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
                  
                  {/* CGST Section */}
                  <div className="py-2 md:py-4 flex items-center justify-between">
                    <dt className="text-xs md:text-sm text-gray-600">CGST ({GST_RATES.CGST}%)</dt>
                    <dd className="text-xs md:text-sm font-medium text-gray-900">₹{gstAmounts.CGST}</dd>
                  </div>

                  {/* SGST Section */}
                  <div className="py-2 md:py-4 flex items-center justify-between">
                    <dt className="text-xs md:text-sm text-gray-600">SGST ({GST_RATES.SGST}%)</dt>
                    <dd className="text-xs md:text-sm font-medium text-gray-900">₹{gstAmounts.SGST}</dd>
                  </div>

                  {/* Discount Section */}
                  <div className="py-2 md:py-4 flex items-center justify-between">
                    <dt className="text-xs md:text-sm text-green-600">Discount ({DISCOUNT_PERCENTAGE}%)</dt>
                    <dd className="text-xs md:text-sm font-medium text-green-600">-₹{discountAmount}</dd>
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