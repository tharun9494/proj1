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
import { initializeOrderNotifications } from '../../services/phoneService';
import { ADMIN_CONFIG } from '../../config/adminConfig';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  quantity: number;
  isAvailable?: boolean;
  createdAt?: Date;
}

interface DeliveryTime {
  date: string;
  time: string;
}

interface Order {
  id: string;
  items: MenuItem[];
  total: number;
  totalAmount: number;
  status: 'pending' | 'completed';
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  userName: string;
  userPhone: string;
  alternativePhone?: string;
  address: {
    street: string;
    city: string;
    pincode: string;
    landmark?: string;
  };
  deliveryTime: DeliveryTime | "N/A";
  createdAt: any;
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

interface DeliveryTimeObject {
  time: string;
  date: string;
}

function isDeliveryTimeObject(value: any): value is DeliveryTimeObject {
  return value !== "N/A" && typeof value === "object" && "time" in value && "date" in value;
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
  const [isLoading, setIsLoading] = useState(true);
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
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setIsLoading(true);
        if (!isAdmin) return;

        await fetchDashboardData();
        await fetchRestaurantStatus();
        const unsubscribe = setupOrdersListener();
        
        return () => {
          if (unsubscribe) unsubscribe();
        };
      } catch (error) {
        console.error('Error initializing dashboard:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    initializeDashboard();
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
    if (!isAdmin) return;

    // Initialize audio immediately when component mounts
    audioRef.current = new Audio('/notification.mp3');
    audioRef.current.load(); // Preload the audio file

    // Request notification permission when admin dashboard loads
    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    // Initialize notifications
    const unsubscribePromise = initializeOrderNotifications();
    
    return () => {
      // Cleanup function
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      unsubscribePromise.then(unsubscribe => {
        if (unsubscribe) {
          unsubscribe();
        }
      });
    };
  }, [isAdmin]);

  // Handle user interaction to enable sound
  useEffect(() => {
    const handleUserInteraction = () => {
      setIsSoundEnabled(true);
      // Try to play a silent sound to ensure audio context is initialized
      if (audioRef.current) {
        audioRef.current.volume = 0;
        audioRef.current.play().catch(() => {});
        audioRef.current.volume = 1;
      }
      // Remove the event listeners after first interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };

    // Add event listeners for user interaction
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);

  useEffect(() => {
    // Update orders listener to play sound only after user interaction
    if (todayOrders.length > previousOrdersCountRef.current) {
      // Show toast notification
      toast.success('New order received!', {
        duration: 2000,
        position: 'top-center',
        icon: '🔔'
      });

      // Only play sound if tab is visible, has focus, and sound is enabled
      if (document.visibilityState === 'visible' && document.hasFocus() && isSoundEnabled) {
        if (audioRef.current) {
          audioRef.current.currentTime = 0; // Reset to start
          audioRef.current.play().catch(error => {
            console.error('Error playing notification sound:', error);
            // If the error is due to user interaction, show a message
            if (error.name === 'NotAllowedError') {
              toast('Please interact with the page to enable sound notifications', {
                duration: 3000,
                position: 'top-center',
                icon: '🔊'
              });
            }
          });
        }
      }
    }
    previousOrdersCountRef.current = todayOrders.length;
  }, [todayOrders.length, isSoundEnabled]);

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

    // Simple query without index requirements
    const ordersQuery = query(
      collection(db, 'orders')
    );

    return onSnapshot(ordersQuery, (snapshot) => {
      try {
        const allOrders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Order[];

        // Client-side filtering and sorting
        const todayOrdersList = allOrders
          .filter(order => {
            const orderDate = order.createdAt?.toDate();
            if (!orderDate || orderDate < today) return false;

            return (
              (order.paymentMethod === 'ONLINE' && order.paymentStatus === 'success') ||
              order.paymentMethod === 'COD'
            );
          })
          .sort((a, b) => {
            const dateA = a.createdAt?.toDate() || new Date();
            const dateB = b.createdAt?.toDate() || new Date();
            return dateB.getTime() - dateA.getTime();
          });

        setTodayOrders(todayOrdersList);

        // Filter completed orders
        const completedOrdersList = allOrders
          .filter(order => order.status === 'completed')
          .sort((a, b) => {
            const dateA = a.createdAt?.toDate() || new Date();
            const dateB = b.createdAt?.toDate() || new Date();
            return dateB.getTime() - dateA.getTime();
          });
        setCompletedOrders(completedOrdersList);

        // Calculate revenue with updated logic
        const calculateRevenue = (orders: Order[]) => {
          return orders.reduce((total, order) => {
            const itemCost = order.items.reduce((sum, item) => {
              const quantity = (item as any).quantity || 1;
              return sum + (item.price * quantity);
            }, 0);
            const deliveryCharge = itemCost < 500 ? 40 : 0;
            return total + itemCost + deliveryCharge;
          }, 0);
        };

        // Calculate today's stats
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

        // Calculate time periods
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);

        // Filter orders for different time periods
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
      collection(db, 'messages')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Message[];
      
      // Sort messages by createdAt in descending order
      messagesList.sort((a, b) => {
        const dateA = a.createdAt?.toDate() || new Date();
        const dateB = b.createdAt?.toDate() || new Date();
        return dateB.getTime() - dateA.getTime();
      });
      
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
    if (!timestamp || !timestamp.toDate) return { date: 'N/A', time: 'N/A' };
    try {
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
    } catch (error) {
      console.error('Error formatting date:', error);
      return { date: 'N/A', time: 'N/A' };
    }
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

                    {isDeliveryTimeObject(order.deliveryTime) ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-sm text-gray-500">Delivery Time</p>
                        <p className="text-sm">{order.deliveryTime.time}</p>
                      </div>
                    ) : null}
                    {isDeliveryTimeObject(order.deliveryTime) ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-sm text-gray-500">Delivery Date</p>
                        <p className="text-sm">{order.deliveryTime.date}</p>
                      </div>
                    ) : null}
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-sm w-full">
          <h1 className="text-xl font-bold text-red-500 mb-2">Access Denied</h1>
          <p className="text-gray-600">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-4 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm sm:text-base text-gray-600">Manage your restaurant's menu and orders</p>
            </div>
            <button
              onClick={handleToggleRestaurantStatus}
              className={`w-full sm:w-auto px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 ${
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

        {/* Stats Cards - Grid layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mb-6">
          {/* Total Items */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-4 rounded-lg shadow-md"
          >
            <div className="flex items-center">
              <Package className="h-8 w-8 text-red-500" />
              <div className="ml-3">
                <h2 className="text-base font-semibold text-gray-900">Total Items</h2>
                <p className="text-2xl font-bold text-gray-700">{totalItems}</p>
              </div>
            </div>
          </motion.div>

          {/* Today's Orders */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => setShowTodayOrders(!showTodayOrders)}
            className="bg-white p-4 rounded-lg shadow-md cursor-pointer hover:bg-gray-50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ShoppingBag className="h-8 w-8 text-blue-500" />
                <div className="ml-3">
                  <h2 className="text-base font-semibold text-gray-900">Today's Orders</h2>
                  <p className="text-2xl font-bold text-gray-700">{todayOrders.length}</p>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 text-gray-400 transform transition-transform ${showTodayOrders ? 'rotate-180' : ''}`} />
            </div>
          </motion.div>

          {/* Completed Orders */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => setShowCompletedOrders(!showCompletedOrders)}
            className="bg-white p-4 rounded-lg shadow-md cursor-pointer hover:bg-gray-50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div className="ml-3">
                  <h2 className="text-base font-semibold text-gray-900">Completed</h2>
                  <p className="text-2xl font-bold text-gray-700">{completedOrders.length}</p>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 text-gray-400 transform transition-transform ${showCompletedOrders ? 'rotate-180' : ''}`} />
            </div>
          </motion.div>
        </div>

        {/* Orders Lists - Mobile Optimized */}
        {showTodayOrders && (
          <div className="bg-white rounded-lg shadow-md p-3 mt-4 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Today's Orders</h3>
              <span className="text-sm text-gray-600">Total: {todayOrders.length}</span>
            </div>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto">
              {todayOrders.map((order, index) => (
                <div key={order.id} 
                  className="border rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                >
                  {/* Order Summary - Always Visible */}
                  <div className="p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className={`w-2 h-2 rounded-full ${
                        order.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{order.userName}</span>
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                            #{order.id.slice(-6)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {order.items.length} items • ₹{order.totalAmount}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        order.paymentMethod === 'COD' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {order.paymentMethod}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`tel:${order.userPhone}`);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                      >
                        <Phone className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded View */}
                  {expandedOrderId === order.id && (
                    <div className="border-t p-3 bg-gray-50 space-y-4">
                      {/* Customer Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <h5 className="text-xs font-medium text-gray-500 mb-1">Customer Details</h5>
                          <div className="bg-white p-2 rounded">
                            <p className="text-sm">{order.userName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-sm">Phone: {order.userPhone}</p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`tel:${order.userPhone}`);
                                }}
                                className="text-blue-500"
                              >
                                <Phone className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h5 className="text-xs font-medium text-gray-500 mb-1">Delivery Address</h5>
                          <div className="bg-white p-2 rounded">
                            <p className="text-sm">{order.address.street}</p>
                            <p className="text-sm">{order.address.city}, {order.address.pincode}</p>
                            {order.address.landmark && (
                              <p className="text-sm text-gray-500 mt-1">
                                Landmark: {order.address.landmark}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div>
                        <h5 className="text-xs font-medium text-gray-500 mb-1">Order Items</h5>
                        <div className="bg-white rounded p-2 space-y-2">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span>{item.name} × {item.quantity}</span>
                              <span>₹{item.price * item.quantity}</span>
                            </div>
                          ))}
                          <div className="border-t pt-2 mt-2">
                            <div className="flex justify-between text-sm font-medium">
                              <span>Total Amount</span>
                              <span>₹{order.totalAmount}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {order.status !== 'completed' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateOrderStatus(order.id, 'completed');
                            }}
                            className="flex-1 bg-green-500 text-white py-2 px-4 rounded text-sm font-medium hover:bg-green-600"
                          >
                            Mark as Completed
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`tel:${order.userPhone}`);
                          }}
                          className="flex-1 bg-blue-500 text-white py-2 px-4 rounded text-sm font-medium hover:bg-blue-600"
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

        {/* Menu Management Section - Mobile Optimized */}
        <div className="bg-white rounded-lg shadow-md p-3 mt-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Menu Items ({filteredMenuItems.length})</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetAllAvailability}
                  disabled={isLoading}
                  className="p-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 text-sm"
                >
                  Reset All
                </button>
                <button
                  onClick={() => setIsAddingItem(true)}
                  className="p-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                >
                  Add Item
                </button>
              </div>
            </div>
            
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md"
            />
          </div>

          <div className="mt-4 space-y-2">
            {filteredMenuItems
              .slice(0, showAllItems ? undefined : ITEMS_PER_PAGE)
              .map((item) => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-md hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <img
                      className="h-12 w-12 rounded-lg object-cover"
                      src={item.image}
                      alt={item.name}
                    />
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-500">₹{item.price} • {item.category}</div>
                      <div className="text-sm">
                        {item.isAvailable ? (
                          <span className="text-green-600">Available</span>
                        ) : (
                          <span className="text-red-600">Unavailable</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleToggleAvailability(item)}
                      className={`p-2 rounded ${
                        item.isAvailable 
                          ? 'text-green-600 hover:bg-green-50' 
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                    >
                      {item.isAvailable ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {filteredMenuItems.length > ITEMS_PER_PAGE && (
            <button
              onClick={() => setShowAllItems(!showAllItems)}
              className="mt-4 w-full py-2 text-sm text-red-500 hover:bg-red-50 rounded-md"
            >
              {showAllItems ? (
                <span className="flex items-center justify-center">
                  Show Less <ChevronUp className="ml-1 h-4 w-4" />
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  Show More ({filteredMenuItems.length - ITEMS_PER_PAGE} items) <ChevronDown className="ml-1 h-4 w-4" />
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;