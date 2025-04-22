import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, 
  Users, 
  CheckCircle, 
  Package, 
  Plus, 
  Trash2, 
  Edit, 
  Database, 
  TrendingUp, 
  Calendar, 
  MessageCircle, 
  ChevronDown, 
  ChevronUp, 
  Phone,
  Clock,
  XCircle
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  serverTimestamp, 
  onSnapshot, 
  Timestamp, 
  orderBy,
  writeBatch,
  getDoc,
  setDoc,
  limit
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { populateMenu } from '../../scripts/populateMenu';
import { getOrderStats } from '../../services/orderService';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import toast from 'react-hot-toast';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  image: string;
  createdAt?: Date;
  isAvailable?: boolean;
}

interface Order {
  id: string;
  status: 'pending' | 'completed';
  totalAmount: number;
  items: MenuItem[];
  createdAt: any;
  userName: string;
  userPhone: string;
  alternativePhone?: string;
  address: {
    street: string;
    city: string;
    pincode: string;
    landmark?: string;
  };
  paymentStatus: 'success' | 'pending' | 'failed';
  paymentMethod: 'ONLINE' | 'COD';
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

interface RestaurantStatus {
  isOpen: boolean;
  lastUpdated: any;
}

interface Offer {
  id: string;
  title: string;
  description: string;
  type: 'discount' | 'buy_one_get_one';
  discountPercentage: number;
  offerPrice: number;
  validUntil: Date;
  isActive: boolean;
  image: string;
  createdAt: Date;
  menuItemId: string;
  menuItemName: string;
  originalPrice: number;
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
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [restaurantStatus, setRestaurantStatus] = useState<{
    isOpen: boolean;
    lastUpdated: Timestamp;
  }>({
    isOpen: true,
    lastUpdated: Timestamp.now(),
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryAvailability, setCategoryAvailability] = useState<Record<string, boolean>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousOrdersCountRef = useRef(0);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isAddingOffer, setIsAddingOffer] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [newOffer, setNewOffer] = useState<Omit<Offer, 'id' | 'createdAt'>>({
    title: '',
    description: '',
    type: 'discount',
    discountPercentage: 0,
    offerPrice: 0,
    validUntil: new Date(),
    isActive: true,
    image: '',
    menuItemId: '',
    menuItemName: '',
    originalPrice: 0
  });
  const [newOrderNotification, setNewOrderNotification] = useState<{
    show: boolean;
    order: any;
  }>({ show: false, order: null });

  useEffect(() => {
    if (!isAdmin) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        await fetchDashboardData();
        await fetchRestaurantStatus();
        const unsubscribe = setupOrdersListener();
        return () => {
          if (unsubscribe) unsubscribe();
        };
      } catch (error) {
        console.error('Error loading dashboard:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAdmin]);

  useEffect(() => {
    const statusRef = doc(db, 'restaurant', 'status');
    
    // Set initial status if it doesn't exist
    getDoc(statusRef).then((doc) => {
      if (!doc.exists()) {
        setDoc(statusRef, {
          isOpen: true,
          lastUpdated: Timestamp.now(),
        }).catch((error) => {
          console.error('Error setting initial restaurant status:', error);
          toast.error('Failed to initialize restaurant status');
        });
      }
    }).catch((error) => {
      console.error('Error checking restaurant status:', error);
      toast.error('Failed to load restaurant status');
    });

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
        toast.error('Failed to load restaurant status');
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Update categories when menu items change
    const uniqueCategories = Array.from(new Set(menuItems.map(item => item.category)));
    setCategories(uniqueCategories);
    
    // Initialize category availability
    const availability: Record<string, boolean> = {};
    uniqueCategories.forEach(category => {
      const categoryItems = menuItems.filter(item => item.category === category);
      availability[category] = categoryItems.every(item => item.isAvailable !== false);
    });
    setCategoryAvailability(availability);
  }, [menuItems]);

  useEffect(() => {
    // Initialize audio immediately when component mounts
    audioRef.current = new Audio('/notification.mp3');
    audioRef.current.load(); // Preload the audio file
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Update orders listener to play sound immediately
    if (todayOrders.length > previousOrdersCountRef.current) {
      // Play sound immediately
      if (audioRef.current) {
        audioRef.current.currentTime = 0; // Reset to start
        audioRef.current.play().catch(error => {
          console.error('Error playing notification sound:', error);
        });
      }
      
      // Show toast notification
      toast.success('New order received!', {
        duration: 2000,
        position: 'top-center',
        icon: '🔔'
      });
    }
    previousOrdersCountRef.current = todayOrders.length;
  }, [todayOrders.length]);

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

    const ordersQuery = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(ordersQuery, (snapshot) => {
      try {
        const allOrders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Order[];

        // Filter today's orders - only include successful online payments and COD orders
        const todayOrdersList = allOrders.filter(order => {
          const orderDate = order.createdAt?.toDate();
          if (!orderDate || orderDate < today) return false;

          // Include only if:
          // 1. Online payment with success status
          // 2. COD orders (regardless of payment status)
          return (
            (order.paymentMethod === 'ONLINE' && order.paymentStatus === 'success') ||
            order.paymentMethod === 'COD'
          );
        }).sort((a, b) => {
          // Sort by createdAt in descending order (newest first)
          const dateA = a.createdAt?.toDate() || new Date();
          const dateB = b.createdAt?.toDate() || new Date();
          return dateB.getTime() - dateA.getTime();
        });

        // Set today's orders
        setTodayOrders(todayOrdersList);

        // Calculate revenue with updated logic
        const calculateRevenue = (orders: Order[]) => {
          return orders.reduce((total, order) => {
            // Calculate total item cost
            const itemCost = order.items.reduce((sum, item) => {
              const quantity = (item as any).quantity || 1;
              return sum + (item.price * quantity);
            }, 0);

            // Add delivery charge if order is under ₹500
            const deliveryCharge = itemCost < 500 ? 40 : 0;

            // Return total including items cost and delivery charge
            return total + itemCost + deliveryCharge;
          }, 0);
        };

        // Calculate today's stats with updated filtering
        const todayStats = {
          total: todayOrdersList.length,
          completed: todayOrdersList.filter(o => o.status === 'completed').length,
          codOrders: todayOrdersList.filter(o => o.paymentMethod === 'COD').length,
          onlineOrders: todayOrdersList.filter(o => 
            o.paymentMethod === 'ONLINE' && o.paymentStatus === 'success'
          ).length,
          revenue: calculateRevenue(todayOrdersList),
          codRevenue: calculateRevenue(todayOrdersList.filter(o => o.paymentMethod === 'COD')),
          onlineRevenue: calculateRevenue(todayOrdersList.filter(o => 
            o.paymentMethod === 'ONLINE' && o.paymentStatus === 'success'
          ))
        };

        // Debug log for today's calculations
        console.log('Today\'s Stats:', {
          totalOrders: todayStats.total,
          codOrders: todayStats.codOrders,
          onlineOrders: todayStats.onlineOrders,
          totalRevenue: todayStats.revenue,
          codRevenue: todayStats.codRevenue,
          onlineRevenue: todayStats.onlineRevenue
        });

        // Filter completed orders
        const completedOrdersList = allOrders.filter(order => 
          order.status === 'completed'
        );
        setCompletedOrders(completedOrdersList);

        // Filter past orders (excluding pending online payments)
        const pastOrdersList = allOrders.filter(order => {
          const orderDate = order.createdAt?.toDate();
          if (!orderDate || orderDate >= today) return false;

          return (
            (order.paymentMethod === 'ONLINE' && order.paymentStatus === 'success') ||
            order.paymentMethod === 'COD'
          );
        }).sort((a, b) => {
          const dateA = a.createdAt?.toDate() || new Date();
          const dateB = b.createdAt?.toDate() || new Date();
          return dateB.getTime() - dateA.getTime();
        });
        setPastOrders(pastOrdersList);

        // Calculate weekly and monthly periods
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);

        // Filter orders for different time periods (excluding pending online payments)
        const weeklyOrders = allOrders.filter(order => {
          const orderDate = order.createdAt?.toDate();
          if (!orderDate || orderDate < weekAgo) return false;

          return (
            (order.paymentMethod === 'ONLINE' && order.paymentStatus === 'success') ||
            order.paymentMethod === 'COD'
          );
        });

        const monthlyOrders = allOrders.filter(order => {
          const orderDate = order.createdAt?.toDate();
          if (!orderDate || orderDate < monthAgo) return false;

          return (
            (order.paymentMethod === 'ONLINE' && order.paymentStatus === 'success') ||
            order.paymentMethod === 'COD'
          );
        });

        // Update order stats
        const newStats = {
          daily: todayStats,
          weekly: {
            total: weeklyOrders.length,
            completed: weeklyOrders.filter(o => o.status === 'completed').length,
            codOrders: weeklyOrders.filter(o => o.paymentMethod === 'COD').length,
            onlineOrders: weeklyOrders.filter(o => 
              o.paymentMethod === 'ONLINE' && o.paymentStatus === 'success'
            ).length,
            revenue: calculateRevenue(weeklyOrders),
            codRevenue: calculateRevenue(weeklyOrders.filter(o => o.paymentMethod === 'COD')),
            onlineRevenue: calculateRevenue(weeklyOrders.filter(o => 
              o.paymentMethod === 'ONLINE' && o.paymentStatus === 'success'
            ))
          },
          monthly: {
            total: monthlyOrders.length,
            completed: monthlyOrders.filter(o => o.status === 'completed').length,
            codOrders: monthlyOrders.filter(o => o.paymentMethod === 'COD').length,
            onlineOrders: monthlyOrders.filter(o => 
              o.paymentMethod === 'ONLINE' && o.paymentStatus === 'success'
            ).length,
            revenue: calculateRevenue(monthlyOrders),
            codRevenue: calculateRevenue(monthlyOrders.filter(o => o.paymentMethod === 'COD')),
            onlineRevenue: calculateRevenue(monthlyOrders.filter(o => 
              o.paymentMethod === 'ONLINE' && o.paymentStatus === 'success'
            ))
          }
        };

        console.log('Final Stats:', newStats);
        setOrderStats(newStats);

      } catch (error) {
        console.error('Error processing orders:', error);
        toast.error('Failed to process orders data');
      }
    });
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
        isAvailable: true,
        createdAt: serverTimestamp()
      });
      setIsAddingItem(false);
      setNewItem({
        name: '',
        price: 0,
        description: '',
        category: '',
        image: '',
        isAvailable: true
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

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return {
      date: date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      const itemRef = doc(db, 'menuItems', item.id);
      await updateDoc(itemRef, {
        isAvailable: !item.isAvailable,
        updatedAt: serverTimestamp()
      });
      toast.success(`Item ${!item.isAvailable ? 'made available' : 'marked as unavailable'}`);
      fetchDashboardData();
    } catch (error) {
      console.error('Error toggling availability:', error);
      toast.error('Failed to update item availability');
    }
  };

  const handleResetAllAvailability = async () => {
    try {
      setIsLoading(true);
      const batch = writeBatch(db);
      const menuSnapshot = await getDocs(collection(db, 'menuItems'));
      
      menuSnapshot.docs.forEach(doc => {
        const itemRef = doc.ref;
        batch.update(itemRef, {
          isAvailable: true,
          updatedAt: serverTimestamp()
        });
      });
      
      await batch.commit();
      toast.success('All items reset to available for next day');
      fetchDashboardData();
    } catch (error) {
      console.error('Error resetting availability:', error);
      toast.error('Failed to reset item availability');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRestaurantStatus = async () => {
    try {
      const statusDoc = await getDoc(doc(db, 'restaurant', 'status'));
      if (statusDoc.exists()) {
        setRestaurantStatus(statusDoc.data() as {
          isOpen: boolean;
          lastUpdated: Timestamp;
        });
      } else {
        // Initialize status if it doesn't exist
        await updateDoc(doc(db, 'restaurant', 'status'), {
          isOpen: true,
          lastUpdated: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error('Error fetching restaurant status:', error);
      toast.error('Failed to load restaurant status');
    }
  };

  const handleToggleRestaurantStatus = async () => {
    try {
      const statusRef = doc(db, 'restaurant', 'status');
      const newStatus = !restaurantStatus.isOpen;
      
      await updateDoc(statusRef, {
        isOpen: newStatus,
        lastUpdated: Timestamp.now(),
      });
      
      toast.success(`Restaurant is now ${newStatus ? 'open' : 'closed'}`);
    } catch (error) {
      console.error('Error toggling restaurant status:', error);
      toast.error('Failed to update restaurant status. Please try again.');
    }
  };

  const toggleCategoryAvailability = async (category: string) => {
    try {
      const newAvailability = !categoryAvailability[category];
      setCategoryAvailability(prev => ({
        ...prev,
        [category]: newAvailability
      }));

      // Update all items in the category
      const categoryItems = menuItems.filter(item => item.category === category);
      const batch = writeBatch(db);
      
      categoryItems.forEach(item => {
        const itemRef = doc(db, 'menuItems', item.id);
        batch.update(itemRef, { isAvailable: newAvailability });
      });

      await batch.commit();
      toast.success(`All ${category} items are now ${newAvailability ? 'available' : 'unavailable'}`);
    } catch (error) {
      console.error('Error updating category availability:', error);
      toast.error('Failed to update category availability');
      // Revert the UI state on error
      setCategoryAvailability(prev => ({
        ...prev,
        [category]: !prev[category]
      }));
    }
  };

  const renderOrdersList = (orders: Order[], title: string) => (
    <div className="bg-white rounded-lg shadow-md p-4 mt-6">
      <div className="flex items-center justify-between mb-4 sticky top-0 bg-white z-10">
        <h3 className="text-xl font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Total: {orders.length}
          </span>
          <div className="flex items-center text-xs text-gray-500">
            <Clock className="h-3 w-3 mr-1" />
            <span>Newest first</span>
          </div>
        </div>
      </div>
      {orders.length === 0 ? (
        <p className="text-gray-500">No orders found</p>
      ) : (
        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            {orders.map((order, index) => (
              <div key={order.id} className="border rounded-lg hover:bg-gray-50 transition-colors">
                {/* Collapsed View - Always visible */}
                <div 
                  className="p-3 cursor-pointer relative"
                  onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                >
                  {/* Serial Number Badge - Using reverse numbering */}
                  <div className="absolute -left-2 -top-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-medium shadow-sm">
                    {orders.length - index} {/* This will give reverse numbering */}
                  </div>

                  <div className="flex items-center justify-between ml-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        order.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{order.userName}</h4>
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                            #{order.id.slice(-6)}
                          </span>
                          <span className="text-xs text-gray-500">
                            (Order #{orders.length - index}) {/* Adding order number in text */}
                          </span>
                        </div>
                        <div className="flex flex-col text-xs space-y-0.5 mt-1">
                          <div className="flex items-center text-gray-500">
                            <Clock className="h-3 w-3 mr-1" />
                            <span className="font-medium text-blue-600">
                              {formatDateTime(order.createdAt).time}
                            </span>
                            <span className="mx-1">•</span>
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>{formatDateTime(order.createdAt).date}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>{order.items.length} items</span>
                            <span>•</span>
                            <span className="font-medium">₹{order.totalAmount}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        order.paymentMethod === 'COD' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {order.paymentMethod}
                      </span>
                      <span className="text-xs text-gray-500">
                        {order.status === 'completed' ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded View */}
                {expandedOrderId === order.id && (
                  <div className="border-t p-3 bg-gray-50">
                    {/* Order Time and Status */}
                    <div className="mb-3 p-2 bg-white rounded-md">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs font-medium text-gray-500">Order Number</p>
                          <p className="text-blue-600 font-medium">#{orders.length - index}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Order Time</p>
                          <p className="text-green-600">{formatDateTime(order.createdAt).time}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Order Date</p>
                          <p className="text-blue-600">{formatDateTime(order.createdAt).date}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Status</p>
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            order.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Customer Details */}
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <h5 className="text-xs font-medium text-gray-500 mb-1">Customer</h5>
                        <p className="text-sm font-medium">{order.userName}</p>
                        {/* Primary Phone */}
                        <div className="flex items-center space-x-2 mt-1">
                          <p className="text-sm">Primary: {order.userPhone}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`tel:${order.userPhone}`);
                            }}
                            className="text-blue-500 hover:text-blue-600"
                          >
                            <Phone className="h-4 w-4" />
                          </button>
                        </div>
                        {/* Alternative Phone */}
                        {order.alternativePhone && (
                          <div className="flex items-center space-x-2 mt-1">
                            <p className="text-sm">Alt: {order.alternativePhone}</p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`tel:${order.alternativePhone}`);
                              }}
                              className="text-blue-500 hover:text-blue-600"
                            >
                              <Phone className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div>
                        <h5 className="text-xs font-medium text-gray-500 mb-1">Delivery Address</h5>
                        <p className="text-sm">{order.address.street}</p>
                        <p className="text-sm">{order.address.city}, {order.address.pincode}</p>
                        {order.address.landmark && (
                          <p className="text-sm text-gray-500 mt-1">
                            Landmark: {order.address.landmark}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="mb-3">
                      <h5 className="text-xs font-medium text-gray-500 mb-1">Items</h5>
                      <div className="bg-white rounded-md p-2 space-y-1">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>{item.name} × {item.quantity}</span>
                            <span>₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      {order.status !== 'completed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateOrderStatus(order.id, 'completed');
                          }}
                          className="flex-1 bg-green-500 text-white py-1.5 px-3 rounded text-sm font-medium hover:bg-green-600"
                        >
                          Mark as Completed
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`tel:${order.userPhone}`);
                        }}
                        className="flex-1 bg-blue-500 text-white py-1.5 px-3 rounded text-sm font-medium hover:bg-blue-600"
                      >
                        Call Customer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const filteredMenuItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fetch offers
  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const offersRef = collection(db, 'offers');
        const q = query(offersRef, orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const offersList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            validUntil: doc.data().validUntil.toDate(),
            createdAt: doc.data().createdAt.toDate()
          })) as Offer[];
          setOffers(offersList);
        });
        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching offers:', error);
        toast.error('Failed to load offers');
      }
    };

    fetchOffers();
  }, []);

  const handleAddOffer = async () => {
    try {
      if (!newOffer.title.trim()) {
        toast.error('Please enter an offer title');
        return;
      }
      if (!newOffer.description.trim()) {
        toast.error('Please enter an offer description');
        return;
      }
      if (!newOffer.validUntil) {
        toast.error('Please select a valid date');
        return;
      }
      if (newOffer.type === 'discount' && (!newOffer.discountPercentage || newOffer.discountPercentage <= 0)) {
        toast.error('Please enter a valid discount percentage');
        return;
      }

      const offerData = {
        ...newOffer,
        createdAt: serverTimestamp(),
        validUntil: Timestamp.fromDate(newOffer.validUntil)
      };

      const docRef = await addDoc(collection(db, 'offers'), offerData);
      if (!docRef.id) {
        throw new Error('Failed to create offer');
      }

      setIsAddingOffer(false);
      setNewOffer({
        title: '',
        description: '',
        type: 'discount',
        discountPercentage: 0,
        offerPrice: 0,
        validUntil: new Date(),
        isActive: true,
        image: '',
        menuItemId: '',
        menuItemName: '',
        originalPrice: 0
      });
      toast.success('Offer added successfully');
    } catch (error) {
      console.error('Error adding offer:', error);
      toast.error('Failed to add offer');
    }
  };

  const handleUpdateOffer = async () => {
    if (!editingOffer) return;

    try {
      const offerRef = doc(db, 'offers', editingOffer.id);
      await updateDoc(offerRef, {
        title: editingOffer.title,
        description: editingOffer.description,
        type: editingOffer.type,
        discountPercentage: editingOffer.discountPercentage,
        offerPrice: editingOffer.offerPrice,
        validUntil: Timestamp.fromDate(editingOffer.validUntil),
        isActive: editingOffer.isActive,
        image: editingOffer.image,
        menuItemId: editingOffer.menuItemId,
        menuItemName: editingOffer.menuItemName,
        originalPrice: editingOffer.originalPrice
      });
      setEditingOffer(null);
      toast.success('Offer updated successfully');
    } catch (error) {
      console.error('Error updating offer:', error);
      toast.error('Failed to update offer');
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    try {
      await deleteDoc(doc(db, 'offers', offerId));
      toast.success('Offer deleted successfully');
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast.error('Failed to delete offer');
    }
  };

  const handleToggleOfferStatus = async (offerId: string, currentStatus: boolean) => {
    try {
      const offerRef = doc(db, 'offers', offerId);
      await updateDoc(offerRef, {
        isActive: !currentStatus
      });
      toast.success(`Offer ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling offer status:', error);
      toast.error('Failed to update offer status');
    }
  };

  // Add new order listener
  useEffect(() => {
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const newOrder = change.doc.data();
          setNewOrderNotification({
            show: true,
            order: newOrder
          });

          // Play notification sound
          const audio = new Audio('/notification.mp3');
          audio.play().catch(err => console.error('Error playing sound:', err));
        }
      });
    });

    return () => unsubscribe();
  }, []);

  // Function to handle call button click
  const handleCall = (phoneNumber: string) => {
    window.location.href = `tel:${phoneNumber}`;
  };

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Manage your restaurant's menu and orders</p>
            </div>
            <button
              onClick={handleToggleRestaurantStatus}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                restaurantStatus.isOpen
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              {restaurantStatus.isOpen ? (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Restaurant is Open
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5" />
                  Restaurant is Closed
                </>
              )}
            </button>
          </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mb-6">
            {/* Total Revenue Card */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">
                  {selectedTimeframe.charAt(0).toUpperCase() + selectedTimeframe.slice(1)} Revenue
                </h3>
                <TrendingUp className="h-5 w-5 text-red-500" />
              </div>
              <p className="text-xl font-bold text-gray-900">
                ₹{(orderStats[selectedTimeframe]?.revenue || 0).toLocaleString()}
              </p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">COD Revenue:</span>
                  <span className="font-medium">
                    ₹{(orderStats[selectedTimeframe]?.codRevenue || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Online Revenue:</span>
                  <span className="font-medium">
                    ₹{(orderStats[selectedTimeframe]?.onlineRevenue || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Orders Summary Card */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">
                  {selectedTimeframe.charAt(0).toUpperCase() + selectedTimeframe.slice(1)} Orders
                </h3>
                <ShoppingBag className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-xl font-bold text-gray-900">
                {orderStats[selectedTimeframe]?.total || 0} Orders
              </p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">COD Orders:</span>
                  <span className="font-medium">
                    {orderStats[selectedTimeframe]?.codOrders || 0}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Online Orders:</span>
                  <span className="font-medium">
                    {orderStats[selectedTimeframe]?.onlineOrders || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Completion Rate Card */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Completion Rate</h3>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-xl font-bold text-gray-900">
                {orderStats[selectedTimeframe]?.completed || 0} Completed
              </p>
              <div className="mt-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Success Rate:</span>
                  <span className="font-medium">
                    {orderStats[selectedTimeframe]?.total
                      ? Math.round(
                          (orderStats[selectedTimeframe].completed /
                            orderStats[selectedTimeframe].total) *
                            100
                        )
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add timeframe selector */}
        <div className="flex justify-end mb-4">
          <div className="inline-flex rounded-md shadow-sm">
            {['daily', 'weekly', 'monthly'].map((timeframe) => (
              <button
                key={timeframe}
                onClick={() => setSelectedTimeframe(timeframe as 'daily' | 'weekly' | 'monthly')}
                className={`px-4 py-2 text-sm font-medium ${
                  selectedTimeframe === timeframe
                    ? 'bg-red-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } ${
                  timeframe === 'daily' ? 'rounded-l-md' : 
                  timeframe === 'monthly' ? 'rounded-r-md' : ''
                } border border-gray-300`}
              >
                {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Lists */}
        {showTodayOrders && renderOrdersList(todayOrders, "Today's Orders")}
        {showCompletedOrders && renderOrdersList(completedOrders, "Completed Orders")}

        {/* Menu Management Section - Simplified and Compact */}
        <div className="bg-white rounded-lg shadow-md p-3 mt-4">
          {/* Header with Search */}
          <div className="flex flex-col gap-2 mb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Menu Items ({filteredMenuItems.length})</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetAllAvailability}
                  disabled={isLoading}
                  className="p-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
                >
                  Reset All to Available
                </button>
                <button
                  onClick={() => setIsAddingItem(true)}
                  className="p-1.5 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
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
                      <div className="text-xs">
                        {item.isAvailable ? (
                          <span className="text-green-600">Available</span>
                        ) : (
                          <span className="text-red-600">Unavailable</span>
                        )}
                      </div>
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
                    <button
                      onClick={() => handleToggleAvailability(item)}
                      className={`p-1 rounded ${
                        item.isAvailable 
                          ? 'text-green-600 hover:bg-green-50' 
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                    >
                      {item.isAvailable ? (
                        <CheckCircle className="h-3.5 w-3.5" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
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

        {/* Category Availability Controls */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Category Availability</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {categories.map(category => (
              <div key={category} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">{category}</span>
                <button
                  onClick={() => toggleCategoryAvailability(category)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                    categoryAvailability[category] ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      categoryAvailability[category] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
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

        {/* Offers Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-xl font-semibold">Manage Offers</h2>
            <button
              onClick={() => setIsAddingOffer(true)}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add New Offer
            </button>
          </div>

          {/* Offers List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {offers.map((offer) => (
              <div key={offer.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Offer Image */}
                <div className="relative h-48 w-full">
                  {offer.image ? (
                    <img
                      src={offer.image}
                      alt={offer.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <Package className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={() => handleToggleOfferStatus(offer.id, offer.isActive)}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        offer.isActive ? 'bg-green-500' : 'bg-gray-500'
                      } text-white`}
                    >
                      {offer.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>

                {/* Offer Content */}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{offer.title}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingOffer(offer)}
                        className="text-blue-500 hover:text-blue-600"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteOffer(offer.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-3">{offer.description}</p>
                  
                  <div className="flex items-center gap-2 mb-2">
                    {offer.type === 'discount' && (
                      <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs font-medium">
                        {offer.discountPercentage}% OFF
                      </span>
                    )}
                    {offer.type === 'buy_one_get_one' && (
                      <span className="bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs font-medium">
                        Buy One Get One
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>Valid until: {offer.validUntil.toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add/Edit Offer Modal */}
          {(isAddingOffer || editingOffer) && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">
                    {editingOffer ? 'Edit Offer' : 'Add New Offer'}
                  </h3>
                  <button
                    onClick={() => {
                      setIsAddingOffer(false);
                      setEditingOffer(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Menu Item Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Menu Item</label>
                    <select
                      value={editingOffer ? editingOffer.menuItemId : newOffer.menuItemId}
                      onChange={(e) => {
                        const selectedItem = menuItems.find(item => item.id === e.target.value);
                        if (selectedItem) {
                          const updatedOffer = {
                            ...(editingOffer || newOffer),
                            menuItemId: selectedItem.id,
                            menuItemName: selectedItem.name,
                            originalPrice: selectedItem.price,
                            image: selectedItem.image,
                            title: `${selectedItem.name} Offer`, // Auto-generate offer title
                          };
                          editingOffer 
                            ? setEditingOffer(updatedOffer as Offer)
                            : setNewOffer(updatedOffer);
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="">Select a menu item</option>
                      {menuItems.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} - ₹{item.price}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={editingOffer ? editingOffer.title : newOffer.title}
                      onChange={(e) => editingOffer
                        ? setEditingOffer({ ...editingOffer, title: e.target.value })
                        : setNewOffer({ ...newOffer, title: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="Enter offer title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={editingOffer ? editingOffer.description : newOffer.description}
                      onChange={(e) => editingOffer
                        ? setEditingOffer({ ...editingOffer, description: e.target.value })
                        : setNewOffer({ ...newOffer, description: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      rows={3}
                      placeholder="Enter offer description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Offer Type</label>
                    <select
                      value={editingOffer ? editingOffer.type : newOffer.type}
                      onChange={(e) => {
                        const type = e.target.value as 'discount' | 'buy_one_get_one';
                        const currentOffer = editingOffer || newOffer;
                        const updatedOffer = {
                          ...currentOffer,
                          type,
                          offerPrice: type === 'discount' 
                            ? currentOffer.originalPrice * (1 - (currentOffer.discountPercentage / 100))
                            : currentOffer.originalPrice
                        };
                        editingOffer 
                          ? setEditingOffer(updatedOffer as Offer)
                          : setNewOffer(updatedOffer);
                      }}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="discount">Discount</option>
                      <option value="buy_one_get_one">Buy One Get One</option>
                    </select>
                  </div>

                  {(editingOffer ? editingOffer.type : newOffer.type) === 'discount' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Discount Percentage</label>
                      <div className="flex items-center gap-4">
                        <input
                          type="number"
                          value={editingOffer ? editingOffer.discountPercentage : newOffer.discountPercentage}
                          onChange={(e) => {
                            const percentage = Number(e.target.value);
                            const currentOffer = editingOffer || newOffer;
                            const updatedOffer = {
                              ...currentOffer,
                              discountPercentage: percentage,
                              offerPrice: currentOffer.originalPrice * (1 - (percentage / 100))
                            };
                            editingOffer 
                              ? setEditingOffer(updatedOffer as Offer)
                              : setNewOffer(updatedOffer);
                          }}
                          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="Enter discount percentage"
                          min="0"
                          max="100"
                        />
                        <div className="text-sm text-gray-500">
                          <p>Original: ₹{editingOffer ? editingOffer.originalPrice : newOffer.originalPrice}</p>
                          <p>Offer: ₹{editingOffer ? editingOffer.offerPrice : newOffer.offerPrice}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                    <input
                      type="datetime-local"
                      value={(editingOffer ? editingOffer.validUntil : newOffer.validUntil)
                        .toISOString()
                        .slice(0, 16)}
                      onChange={(e) => editingOffer
                        ? setEditingOffer({ ...editingOffer, validUntil: new Date(e.target.value) })
                        : setNewOffer({ ...newOffer, validUntil: new Date(e.target.value) })
                      }
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  {/* Preview Section */}
                  {(editingOffer?.menuItemId || newOffer.menuItemId) && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h4 className="font-medium mb-2">Preview</h4>
                      <div className="flex items-center gap-4">
                        <img
                          src={editingOffer?.image || newOffer.image}
                          alt="Menu item"
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <div>
                          <p className="font-medium">{editingOffer?.menuItemName || newOffer.menuItemName}</p>
                          <p className="text-sm text-gray-500">Original Price: ₹{editingOffer?.originalPrice || newOffer.originalPrice}</p>
                          <p className="text-sm text-green-600">Offer Price: ₹{editingOffer?.offerPrice || newOffer.offerPrice}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={() => {
                        setIsAddingOffer(false);
                        setEditingOffer(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={editingOffer ? handleUpdateOffer : handleAddOffer}
                      disabled={!(editingOffer?.menuItemId || newOffer.menuItemId)}
                      className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {editingOffer ? 'Update' : 'Add'} Offer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* New Order Notification */}
        {newOrderNotification.show && newOrderNotification.order && (
          <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-red-200 animate-bounce">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-red-600">New Order Received!</h3>
                <p className="text-sm text-gray-600">
                  Order ID: {newOrderNotification.order.id}
                </p>
                <p className="text-sm text-gray-600">
                  Amount: ₹{newOrderNotification.order.totalAmount}
                </p>
                <p className="text-sm text-gray-600">
                  Payment: {newOrderNotification.order.paymentMethod}
                </p>
              </div>
              <div className="flex flex-col items-center ml-4">
                <button
                  onClick={() => handleCall(newOrderNotification.order.userPhone)}
                  className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600"
                  title="Call Customer"
                >
                  <Phone size={20} />
                </button>
                <span className="text-xs text-gray-500 mt-1">Call</span>
              </div>
            </div>
            <button
              onClick={() => setNewOrderNotification({ show: false, order: null })}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;