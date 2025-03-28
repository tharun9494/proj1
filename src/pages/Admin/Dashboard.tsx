import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Users, CheckCircle, Package, Plus, Trash2, Edit, Database, TrendingUp, Calendar, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { populateMenu } from '../../scripts/populateMenu';
import { getOrderStats } from '../../services/orderService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  image: string;
  createdAt?: Date;
}

interface Order {
  id: string;
  status: 'pending' | 'completed';
  totalAmount: number;
  items: MenuItem[];
  createdAt: any;
  userName: string;
  userPhone: string;
  address: {
    street: string;
    city: string;
    pincode: string;
    landmark?: string;
  };
  paymentStatus: 'success' | 'pending' | 'failed';
}

interface Message {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'read' | 'unread';
  createdAt: any;
}

const Dashboard = () => {
  const { isAdmin } = useAuth();
  const [totalItems, setTotalItems] = useState(0);
  const [todayOrders, setTodayOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [pastOrders, setPastOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [showTodayOrders, setShowTodayOrders] = useState(false);
  const [showCompletedOrders, setShowCompletedOrders] = useState(false);
  const [orderStats, setOrderStats] = useState<any>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [newItem, setNewItem] = useState<Partial<MenuItem>>({
    name: '',
    price: 0,
    description: '',
    category: '',
    image: ''
  });
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showMessages, setShowMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllItems, setShowAllItems] = useState(false);
  const ITEMS_PER_PAGE = 5; // Number of items to show initially

  useEffect(() => {
    if (isAdmin) {
      fetchDashboardData();
      setupOrdersListener();
      fetchOrderStats();
      
      // Set up the messages listener and store the unsubscribe function
      const unsubscribeMessages = fetchMessages();
      
      // Clean up listeners when component unmounts
      return () => {
        if (unsubscribeMessages) unsubscribeMessages();
      };
    }
  }, [isAdmin]);

  const handlePopulateMenu = async () => {
    if (!isAdmin) {
      toast.error('Admin access required');
      return;
    }

    try {
      setIsLoading(true);
      await populateMenu();
      toast.success('Menu populated successfully');
      await fetchDashboardData();
    } catch (error) {
      console.error('Error populating menu:', error);
      toast.error('Failed to populate menu');
    } finally {
      setIsLoading(false);
    }
  };

  const setupOrdersListener = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Listen for all orders and filter in memory
    const ordersQuery = query(collection(db, 'orders'));

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const allOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];

      // Filter today's orders
      const todayOrdersList = allOrders.filter(order => {
        const orderDate = order.createdAt?.toDate();
        return orderDate >= today && order.paymentStatus === 'success';
      });
      setTodayOrders(todayOrdersList);

      // Filter completed orders
      const completedOrdersList = allOrders.filter(order => 
        order.status === 'completed'
      );
      setCompletedOrders(completedOrdersList);

      // Filter past orders
      const pastOrdersList = allOrders.filter(order => {
        const orderDate = order.createdAt?.toDate();
        return orderDate < today;
      });
      setPastOrders(pastOrdersList);
    }, (error) => {
      console.error('Error setting up orders listener:', error);
      toast.error('Failed to load orders');
    });

    return unsubscribe;
  };

  const fetchOrderStats = async () => {
    try {
      const stats = await getOrderStats();
      setOrderStats(stats);
    } catch (error) {
      console.error('Error fetching order stats:', error);
      toast.error('Failed to load order statistics');
    }
  };

  const fetchDashboardData = async () => {
    if (!isAdmin) {
      toast.error('Admin access required');
      return;
    }

    try {
      setIsLoading(true);
      const menuSnapshot = await getDocs(collection(db, 'menuItems'));
      const uniqueItems = new Map();
      
      menuSnapshot.docs.forEach(doc => {
        const item = { id: doc.id, ...doc.data() } as MenuItem;
        const lowerCaseName = item.name.toLowerCase();
        
        if (!uniqueItems.has(lowerCaseName) || 
            (item.createdAt && uniqueItems.get(lowerCaseName).createdAt && 
             item.createdAt > uniqueItems.get(lowerCaseName).createdAt)) {
          uniqueItems.set(lowerCaseName, item);
        }
      });

      const items = Array.from(uniqueItems.values());
      setMenuItems(items);
      setTotalItems(items.length);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = async () => {
    try {
      await addDoc(collection(db, 'menuItems'), {
        ...newItem,
        createdAt: serverTimestamp()
      });
      setIsAddingItem(false);
      setNewItem({
        name: '',
        price: 0,
        description: '',
        category: '',
        image: ''
      });
      toast.success('Item added successfully');
      fetchDashboardData();
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;

    try {
      const itemRef = doc(db, 'menuItems', editingItem.id);
      await updateDoc(itemRef, {
        ...editingItem,
        updatedAt: serverTimestamp()
      });
      setEditingItem(null);
      toast.success('Item updated successfully');
      fetchDashboardData();
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteDoc(doc(db, 'menuItems', itemId));
      toast.success('Item deleted successfully');
      fetchDashboardData();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: 'completed' | 'pending') => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status,
        updatedAt: serverTimestamp()
      });
      toast.success(`Order marked as ${status}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const fetchMessages = () => {
    const messagesQuery = query(
      collection(db, 'messages'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      
      setMessages(messagesList);
    }, (error) => {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    });

    return unsubscribe;
  };

  const handleMarkMessageAsRead = async (messageId: string) => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        status: 'read',
        updatedAt: serverTimestamp()
      });
      toast.success('Message marked as read');
    } catch (error) {
      console.error('Error updating message status:', error);
      toast.error('Failed to update message status');
    }
  };

  const renderOrdersList = (orders: Order[], title: string) => (
    <div className="bg-white rounded-lg shadow-md p-6 mt-8">
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      {orders.length === 0 ? (
        <p className="text-gray-500">No orders found</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold">{order.userName}</h4>
                  <p className="text-sm text-gray-600">{order.userPhone}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">₹{order.totalAmount}</p>
                  <p className={`text-sm ${order.paymentStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {order.paymentStatus}
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-600 mb-2">
                {order.address.street}, {order.address.city}, {order.address.pincode}
              </div>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.name} x {item.quantity}</span>
                    <span>₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
              {order.status !== 'completed' && (
                <button
                  onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                  className="mt-4 w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600"
                >
                  Mark as Completed
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const filteredMenuItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Access Denied</h1>
          <p className="text-gray-600">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">Manage your restaurant's menu and orders</p>
        </div>

        {/* Stats Cards - Grid layout with 3 items per row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-6 mb-6">
          {/* Total Items */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-3 md:p-6 rounded-lg shadow-md"
          >
            <div className="flex items-center">
              <Package className="h-6 w-6 md:h-10 md:w-10 text-red-500" />
              <div className="ml-2 md:ml-4">
                <h2 className="text-sm md:text-lg font-semibold text-gray-900">Total Items</h2>
                <p className="text-xl md:text-3xl font-bold text-gray-700">{totalItems}</p>
              </div>
            </div>
          </motion.div>

          {/* Today's Orders */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => setShowTodayOrders(!showTodayOrders)}
            className="bg-white p-3 md:p-6 rounded-lg shadow-md cursor-pointer hover:bg-gray-50"
          >
            <div className="flex items-center">
              <ShoppingBag className="h-6 w-6 md:h-10 md:w-10 text-blue-500" />
              <div className="ml-2 md:ml-4">
                <h2 className="text-sm md:text-lg font-semibold text-gray-900">Today's Orders</h2>
                <p className="text-xl md:text-3xl font-bold text-gray-700">{todayOrders.length}</p>
              </div>
            </div>
          </motion.div>

          {/* Completed Orders */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => setShowCompletedOrders(!showCompletedOrders)}
            className="bg-white p-3 md:p-6 rounded-lg shadow-md cursor-pointer hover:bg-gray-50"
          >
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 md:h-10 md:w-10 text-green-500" />
              <div className="ml-2 md:ml-4">
                <h2 className="text-sm md:text-lg font-semibold text-gray-900">Completed</h2>
                <p className="text-xl md:text-3xl font-bold text-gray-700">{completedOrders.length}</p>
              </div>
            </div>
          </motion.div>

          {/* Past Orders */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-3 md:p-6 rounded-lg shadow-md"
          >
            <div className="flex items-center">
              <Calendar className="h-6 w-6 md:h-10 md:w-10 text-purple-500" />
              <div className="ml-2 md:ml-4">
                <h2 className="text-sm md:text-lg font-semibold text-gray-900">Past Orders</h2>
                <p className="text-xl md:text-3xl font-bold text-gray-700">{pastOrders.length}</p>
              </div>
            </div>
          </motion.div>

          {/* Messages */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={() => setShowMessages(!showMessages)}
            className="bg-white p-3 md:p-6 rounded-lg shadow-md cursor-pointer hover:bg-gray-50 relative"
          >
            <div className="flex items-center">
              <MessageCircle className="h-6 w-6 md:h-10 md:w-10 text-yellow-500" />
              <div className="ml-2 md:ml-4">
                <h2 className="text-sm md:text-lg font-semibold text-gray-900">Messages</h2>
                <p className="text-xl md:text-3xl font-bold text-gray-700">{messages.length}</p>
                <span className="text-xs md:text-sm text-red-500">
                  {messages.filter(m => m.status === 'unread').length} unread
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Analytics Stats - Grid layout */}
        {orderStats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-6 mb-6">
            {[
              { title: 'Total Orders', value: orderStats[selectedTimeframe].total },
              { title: 'Completed Orders', value: orderStats[selectedTimeframe].completed },
              { title: 'Revenue', value: `₹${orderStats[selectedTimeframe].revenue}` }
            ].map((stat, index) => (
              <div key={index} className="bg-gray-50 p-3 md:p-4 rounded-lg">
                <h3 className="text-sm md:text-lg font-medium mb-1 md:mb-2">{stat.title}</h3>
                <p className="text-lg md:text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Orders Lists */}
        {showTodayOrders && renderOrdersList(todayOrders, "Today's Orders")}
        {showCompletedOrders && renderOrdersList(completedOrders, "Completed Orders")}

        {/* Menu Management Section - Simplified and Compact */}
        <div className="bg-white rounded-lg shadow-md p-3 mt-4">
          {/* Header with Search */}
          <div className="flex flex-col gap-2 mb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Menu Items ({filteredMenuItems.length})</h2>
              <button
                onClick={() => setIsAddingItem(true)}
                className="p-1.5 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2 py-1 text-sm border rounded-md"
            />
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredMenuItems
              .slice(0, showAllItems ? undefined : ITEMS_PER_PAGE)
              .map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 border rounded-md hover:bg-gray-50">
                  <div className="flex items-center space-x-2">
                    <img
                      className="h-8 w-8 rounded-full object-cover"
                      src={item.image}
                      alt={item.name}
                    />
                    <div>
                      <div className="text-sm font-medium line-clamp-1">{item.name}</div>
                      <div className="text-xs text-gray-500">₹{item.price} • {item.category}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {/* Show More/Less Button */}
          {filteredMenuItems.length > ITEMS_PER_PAGE && (
            <button
              onClick={() => setShowAllItems(!showAllItems)}
              className="mt-3 w-full py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-md"
            >
              {showAllItems ? (
                <span className="flex items-center justify-center">
                  Show Less <ChevronUp className="ml-1 h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  Show More ({filteredMenuItems.length - ITEMS_PER_PAGE} items) <ChevronDown className="ml-1 h-3 w-3" />
                </span>
              )}
            </button>
          )}

          {/* Add/Edit Item Modal */}
          {(isAddingItem || editingItem) && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white rounded-lg p-4 w-full max-w-md mx-4">
                <h3 className="text-lg font-semibold mb-4">
                  {editingItem ? 'Edit Item' : 'Add New Item'}
                </h3>
                
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Item name"
                    value={editingItem ? editingItem.name : newItem.name}
                    onChange={(e) => editingItem 
                      ? setEditingItem({ ...editingItem, name: e.target.value })
                      : setNewItem({ ...newItem, name: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-sm border rounded-md"
                  />
                  
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Price"
                      value={editingItem ? editingItem.price : newItem.price}
                      onChange={(e) => editingItem
                        ? setEditingItem({ ...editingItem, price: Number(e.target.value) })
                        : setNewItem({ ...newItem, price: Number(e.target.value) })
                      }
                      className="w-1/2 px-3 py-1.5 text-sm border rounded-md"
                    />
                    
                    <input
                      type="text"
                      placeholder="Category"
                      value={editingItem ? editingItem.category : newItem.category}
                      onChange={(e) => editingItem
                        ? setEditingItem({ ...editingItem, category: e.target.value })
                        : setNewItem({ ...newItem, category: e.target.value })
                      }
                      className="w-1/2 px-3 py-1.5 text-sm border rounded-md"
                    />
                  </div>
                  
                  <input
                    type="text"
                    placeholder="Image URL"
                    value={editingItem ? editingItem.image : newItem.image}
                    onChange={(e) => editingItem
                      ? setEditingItem({ ...editingItem, image: e.target.value })
                      : setNewItem({ ...newItem, image: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-sm border rounded-md"
                  />
                  
                  <textarea
                    placeholder="Description"
                    value={editingItem ? editingItem.description : newItem.description}
                    onChange={(e) => editingItem
                      ? setEditingItem({ ...editingItem, description: e.target.value })
                      : setNewItem({ ...newItem, description: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-sm border rounded-md h-20"
                  />
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => {
                      setIsAddingItem(false);
                      setEditingItem(null);
                    }}
                    className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingItem ? handleUpdateItem : handleAddItem}
                    className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-md hover:bg-red-600"
                  >
                    {editingItem ? 'Update' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Messages Section - Better mobile layout */}
        {showMessages && (
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mt-6 md:mt-8">
            <h3 className="text-lg md:text-xl font-semibold mb-4">Contact Messages</h3>
            {messages.length === 0 ? (
              <p className="text-gray-500 text-sm md:text-base">No messages found</p>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {messages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`border rounded-lg p-3 md:p-4 ${
                      message.status === 'unread' ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 md:gap-0 mb-2">
                      <div>
                        <h4 className="font-semibold text-sm md:text-base">{message.name}</h4>
                        <p className="text-xs md:text-sm text-gray-600">{message.email}</p>
                        <p className="text-xs md:text-sm text-gray-600">{message.phone}</p>
                      </div>
                      <div className="text-left md:text-right">
                        <p className="font-semibold text-sm md:text-base">{message.subject}</p>
                        <p className="text-xs text-gray-500">
                          {message.createdAt?.toDate().toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs md:text-sm text-gray-600 mb-2 p-2 md:p-3 bg-gray-50 rounded">
                      {message.message}
                    </div>
                    {message.status === 'unread' && (
                      <button
                        onClick={() => handleMarkMessageAsRead(message.id)}
                        className="text-xs md:text-sm bg-yellow-500 text-white py-1 px-2 md:px-3 rounded-md hover:bg-yellow-600"
                      >
                        Mark as Read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;