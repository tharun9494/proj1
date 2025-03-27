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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-lg shadow-md"
          >
            <div className="flex items-center">
              <Package className="h-10 w-10 text-red-500" />
              <div className="ml-4">
                <h2 className="text-lg font-semibold text-gray-900">Total Items</h2>
                <p className="text-3xl font-bold text-gray-700">{totalItems}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => setShowTodayOrders(!showTodayOrders)}
            className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:bg-gray-50"
          >
            <div className="flex items-center">
              <ShoppingBag className="h-10 w-10 text-blue-500" />
              <div className="ml-4">
                <h2 className="text-lg font-semibold text-gray-900">Today's Orders</h2>
                <p className="text-3xl font-bold text-gray-700">{todayOrders.length}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => setShowCompletedOrders(!showCompletedOrders)}
            className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:bg-gray-50"
          >
            <div className="flex items-center">
              <CheckCircle className="h-10 w-10 text-green-500" />
              <div className="ml-4">
                <h2 className="text-lg font-semibold text-gray-900">Completed Orders</h2>
                <p className="text-3xl font-bold text-gray-700">{completedOrders.length}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-lg shadow-md"
          >
            <div className="flex items-center">
              <Calendar className="h-10 w-10 text-purple-500" />
              <div className="ml-4">
                <h2 className="text-lg font-semibold text-gray-900">Past Orders</h2>
                <p className="text-3xl font-bold text-gray-700">{pastOrders.length}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={() => setShowMessages(!showMessages)}
            className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:bg-gray-50 relative overflow-hidden"
          >
            <div className="flex items-center">
              <MessageCircle className="h-10 w-10 text-yellow-500" />
              <div className="ml-4">
                <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
                <p className="text-3xl font-bold text-gray-700">{messages.length}</p>
                <span className="text-sm text-red-500">
                  {messages.filter(m => m.status === 'unread').length} unread
                </span>
              </div>
            </div>
            
            {/* Add an indicator to show it's clickable */}
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
              {showMessages ? (
                <span className="flex items-center">Hide <ChevronUp className="ml-1 h-5 w-5" /></span>
              ) : (
                <span className="flex items-center">View All <ChevronDown className="ml-1 h-5 w-5" /></span>
              )}
            </div>
          </motion.div>
        </div>

        {/* Analytics Section */}
        {orderStats && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Order Analytics</h2>
              <div className="flex space-x-4">
                <button
                  onClick={() => setSelectedTimeframe('daily')}
                  className={`px-4 py-2 rounded-md ${
                    selectedTimeframe === 'daily'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setSelectedTimeframe('weekly')}
                  className={`px-4 py-2 rounded-md ${
                    selectedTimeframe === 'weekly'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setSelectedTimeframe('monthly')}
                  className={`px-4 py-2 rounded-md ${
                    selectedTimeframe === 'monthly'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-2">Total Orders</h3>
                <p className="text-3xl font-bold text-gray-900">
                  {orderStats[selectedTimeframe].total}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-2">Completed Orders</h3>
                <p className="text-3xl font-bold text-gray-900">
                  {orderStats[selectedTimeframe].completed}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-2">Revenue</h3>
                <p className="text-3xl font-bold text-gray-900">
                  ₹{orderStats[selectedTimeframe].revenue}
                </p>
              </div>
            </div>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={orderStats[selectedTimeframe].orders}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    formatter={(value) => [`₹${value}`, 'Revenue']}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#EF4444"
                    name="Revenue"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Orders Lists */}
        {showTodayOrders && renderOrdersList(todayOrders, "Today's Orders")}
        {showCompletedOrders && renderOrdersList(completedOrders, "Completed Orders")}

        {/* Menu Management Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Menu Items</h2>
            <div className="flex space-x-4">
              <button
                onClick={handlePopulateMenu}
                className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                <Database className="h-5 w-5 mr-2" />
                Populate Menu
              </button>
              <button
                onClick={() => setIsAddingItem(true)}
                className="flex items-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add New Item
              </button>
            </div>
          </div>

          {/* Add/Edit Item Form */}
          {(isAddingItem || editingItem) && (
            <div className="mb-6 p-6 border rounded-lg">
              <h3 className="text-lg font-semibold mb-4">
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={editingItem ? editingItem.name : newItem.name}
                    onChange={(e) => editingItem 
                      ? setEditingItem({ ...editingItem, name: e.target.value })
                      : setNewItem({ ...newItem, name: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price</label>
                  <input
                    type="number"
                    value={editingItem ? editingItem.price : newItem.price}
                    onChange={(e) => editingItem
                      ? setEditingItem({ ...editingItem, price: Number(e.target.value) })
                      : setNewItem({ ...newItem, price: Number(e.target.value) })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <input
                    type="text"
                    value={editingItem ? editingItem.description : newItem.description}
                    onChange={(e) => editingItem
                      ? setEditingItem({ ...editingItem, description: e.target.value })
                      : setNewItem({ ...newItem, description: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <input
                    type="text"
                    value={editingItem ? editingItem.category : newItem.category}
                    onChange={(e) => editingItem
                      ? setEditingItem({ ...editingItem, category: e.target.value })
                      : setNewItem({ ...newItem, category: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Image URL</label>
                  <input
                    type="text"
                    value={editingItem ? editingItem.image : newItem.image}
                    onChange={(e) => editingItem
                      ? setEditingItem({ ...editingItem, image: e.target.value })
                      : setNewItem({ ...newItem, image: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setIsAddingItem(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={editingItem ? handleUpdateItem : handleAddItem}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  {editingItem ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </div>
          )}

          {/* Menu Items List */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {menuItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <img
                            className="h-10 w-10 rounded-full object-cover"
                            src={item.image}
                            alt={item.name}
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-500">{item.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹{item.price}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Messages Section */}
        {showMessages && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-8">
            <h3 className="text-xl font-semibold mb-4">Contact Messages</h3>
            {messages.length === 0 ? (
              <p className="text-gray-500">No messages found</p>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`border rounded-lg p-4 ${message.status === 'unread' ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold">{message.name}</h4>
                        <p className="text-sm text-gray-600">{message.email} • {message.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{message.subject}</p>
                        <p className="text-sm text-gray-500">
                          {message.createdAt?.toDate().toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mb-2 p-3 bg-gray-50 rounded">
                      {message.message}
                    </div>
                    {message.status === 'unread' && (
                      <button
                        onClick={() => handleMarkMessageAsRead(message.id)}
                        className="mt-2 text-sm bg-yellow-500 text-white py-1 px-3 rounded-md hover:bg-yellow-600"
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