import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface Order {
  id: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'completed';
  createdAt: any;
  paymentStatus: string;
  paymentMethod: 'ONLINE' | 'COD';
  userPhone: string;
  alternativePhone?: string;
  userName: string;
  address: {
    street: string;
    city: string;
    pincode: string;
    landmark?: string;
  };
}

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Create query for user's orders
    const ordersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', user.id)
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      ordersQuery, 
      (snapshot) => {
        const userOrders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Order[];
        
        // Sort orders by createdAt in memory
        const sortedOrders = userOrders.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        
        setOrders(sortedOrders);
        setLoading(false);
        setError(null);
      },
      (error) => {
        console.error('Error fetching orders:', error);
        setError('Failed to load orders. Please try again later.');
        setLoading(false);
        toast.error('Failed to load orders');
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading your orders...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-red-500 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load orders</h3>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-500 hover:bg-red-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Login</h2>
          <p className="text-gray-600 mb-6">Login to view your orders</p>
          <Link
            to="/login"
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-red-500 hover:bg-red-600"
          >
            Login Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="text-2xl font-bold text-gray-900 mt-4">No orders yet</h2>
          <p className="text-gray-600 mt-2 mb-6">Start ordering your favorite dishes!</p>
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Orders</h1>
        <div className="space-y-4">
          {orders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm overflow-hidden"
            >
              <div className="p-4 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500">
                      Order #{order.id.slice(-6)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {order.createdAt?.toDate().toLocaleDateString()}
                    </p>
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">
                        Phone: {order.userPhone || 'N/A'}
                      </p>
                      {order.alternativePhone && (
                        <p className="text-sm text-gray-600">
                          Alt. Phone: {order.alternativePhone}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                      order.status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                    <span className={`ml-2 inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                      order.paymentMethod === 'COD' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {order.paymentMethod}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-12 w-12 rounded-md object-cover"
                        />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        ₹{item.price * item.quantity}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t">
                  {/* Calculate totals */}
                  {(() => {
                    const itemTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    const deliveryCharges = itemTotal < 500 ? 40 : 0;
                    const finalTotal = itemTotal + deliveryCharges;

                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <p className="text-sm text-gray-600">Items Total</p>
                          <p className="text-sm text-gray-600">₹{itemTotal}</p>
                        </div>
                        {deliveryCharges > 0 && (
                          <div className="flex justify-between">
                            <p className="text-sm text-gray-600">Delivery Charges</p>
                            <p className="text-sm text-gray-600">₹{deliveryCharges}</p>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t">
                          <p className="text-sm font-medium text-gray-900">Total Amount</p>
                          <p className="text-sm font-medium text-gray-900">₹{finalTotal}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Orders;