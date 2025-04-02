import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  status: string;
  paymentStatus: string;
  createdAt: any;
  address: {
    street: string;
    city: string;
    pincode: string;
    landmark?: string;
  };
  userId: string;
  userName: string;
  userPhone: string;
}

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        // Create reference to orders collection
        const ordersRef = collection(db, 'orders');

        // Create query
        const q = query(
          ordersRef,
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

        // Get the documents
        const querySnapshot = await getDocs(q);

        // Process the data
        const ordersData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            items: data.items || [],
            totalAmount: data.totalAmount || 0,
            status: data.status || 'pending',
            paymentStatus: data.paymentStatus || 'pending',
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
            address: {
              street: data.address?.street || '',
              city: data.address?.city || '',
              pincode: data.address?.pincode || '',
              landmark: data.address?.landmark || ''
            },
            userId: data.userId,
            userName: data.userName || '',
            userPhone: data.userPhone || ''
          };
        });

        console.log('Fetched orders:', ordersData); // Debug log
        setOrders(ordersData);
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast.error('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    // Call the fetch function
    fetchOrders();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-semibold mb-4">Please login to view your orders</h2>
          <button
            onClick={() => navigate('/login')}
            className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Orders</h1>

        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-500 mb-6">Start ordering your favorite dishes!</p>
            <button
              onClick={() => navigate('/menu')}
              className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">
                        Order #{order.id.slice(-6)}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {order.createdAt?.toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      order.status === 'completed' ? 'bg-green-100 text-green-800' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {order.items?.map((item, index) => (
                      <div key={index} className="flex items-center space-x-4">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-16 w-16 object-cover rounded-lg"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder-food.png';
                          }}
                        />
                        <div>
                          <h4 className="font-medium">{item.name}</h4>
                          <p className="text-sm text-gray-500">
                            Quantity: {item.quantity} × ₹{item.price}
                          </p>
                        </div>
                        <div className="ml-auto">
                          <p className="font-medium">₹{item.price * item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">Total Amount</p>
                        <p className="text-xl font-bold">₹{order.totalAmount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Payment Status</p>
                        <p className={`font-medium ${
                          order.paymentStatus === 'success' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {order.paymentStatus}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;