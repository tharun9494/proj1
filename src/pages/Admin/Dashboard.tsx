import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  XCircle,
  DollarSign,
  ArrowUp,
  ArrowDown
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
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, subDays, subWeeks, subMonths } from 'date-fns';
import {
  requestNotificationPermission,
  onMessageListener,
  showNotification,
  saveFCMToken
} from '../../services/notificationService';
import { auth } from '../../config/firebase';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  image: string;
  createdAt?: Date;
  isAvailable?: boolean;
  quantity?: number;
}

interface OrderItem extends MenuItem {
  quantity: number;
}

interface Order {
  id: string;
  status: 'pending' | 'completed';
  totalAmount: number;
  items: OrderItem[];
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

interface RevenueStats {
  daily: {
    amount: number;
    change: number;
  };
  weekly: {
    amount: number;
    change: number;
  };
  monthly: {
    amount: number;
    change: number;
  };
}

type Unsubscribe = () => void;

const Dashboard = () => {
  const { isAdmin } = useAuth();
  const [totalItems, setTotalItems] = useState(0);
  const [orders, setOrders] = useState<{
    today: Order[];
    completed: Order[];
    past: Order[];
  }>({
    today: [],
    completed: [],
    past: []
  });
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [showTodayOrders, setShowTodayOrders] = useState(false);
  const [showCompletedOrders, setShowCompletedOrders] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
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
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [restaurantStatus, setRestaurantStatus] = useState<boolean>(false);
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
    order: Order | null;
  }>({ show: false, order: null });
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [revenueStats, setRevenueStats] = useState<RevenueStats>({
    daily: { amount: 0, change: 0 },
    weekly: { amount: 0, change: 0 },
    monthly: { amount: 0, change: 0 }
  });
  const [totalOrders, setTotalOrders] = useState(0);
  const [selectedRevenuePeriod, setSelectedRevenuePeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [filteredMenuItems, setFilteredMenuItems] = useState<MenuItem[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const ITEMS_PER_PAGE = 5;
  const ITEMS_PER_CATEGORY = 5;

  const initialOfferState = {
    title: '',
    description: '',
    type: 'discount' as const,
    discountPercentage: 0,
    offerPrice: 0,
    validUntil: new Date(),
    isActive: true,
    image: '',
    menuItemId: '',
    menuItemName: '',
    originalPrice: 0
  };

  // Add predefined categories
  const predefinedCategories = [
    'Biryani',
    'Soups',
    'Chicken Starters',
    'PRAWNS DRY',
    'Fried Rice',
    'CHICKEN GRAVY',
    'Tandoori',
    'DRY VEGETARIAN',
    'VEG. GRAVY',
    'TANDOORI ROTI',
    'Noodles',
    'Pulao',
    'FISH DRY',
    'MUTTON DRY',
    'Curd Rice',
    'EGG STARTERS & GRAVY',
    'Drinks'
  ];

  // Initialize dashboard data
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setIsLoading(true);
        if (!isAdmin) return;

        // Setup listeners
        const unsubOrders = setupOrdersListener();
        const unsubMessages = fetchMessages();
        
        return () => {
          if (unsubOrders) unsubOrders();
          if (unsubMessages) unsubMessages();
        };
      } catch (error) {
        console.error('Error initializing dashboard:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    const cleanup = initializeDashboard();
    return () => {
      if (cleanup) cleanup.then(unsub => unsub && unsub());
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    const menuRef = collection(db, 'menuItems');
    console.log('Setting up menu items listener...'); // Debug log

    const unsubscribe = onSnapshot(menuRef, (snapshot) => {
      console.log('Received snapshot with', snapshot.size, 'items'); // Debug log
      
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        // Ensure category matches one of the predefined categories
        const category = predefinedCategories.includes(data.category) 
          ? data.category 
          : 'Uncategorized';
        
        return {
          id: doc.id,
          ...data,
          category,
          isAvailable: data.isAvailable !== false // default to true if not specified
        } as MenuItem;
      });

      console.log('Processed items:', items.length); // Debug log
      
      // Sort items by category
      items.sort((a, b) => {
        const catA = predefinedCategories.indexOf(a.category);
        const catB = predefinedCategories.indexOf(b.category);
        return catA - catB;
      });

      setMenuItems(items);
      setFilteredMenuItems(items);
      setTotalItems(items.length);
      setCategories(predefinedCategories);
      
      // Initialize category availability
      const availability: Record<string, boolean> = {};
      predefinedCategories.forEach(category => {
        const categoryItems = items.filter(item => item.category === category);
        availability[category] = categoryItems.length > 0 && 
          categoryItems.every(item => item.isAvailable !== false);
      });
      setCategoryAvailability(availability);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    // Initialize audio immediately when component mounts
    audioRef.current = new Audio('/notification.mp3');
    audioRef.current.load(); // Preload the audio file

    // Request notification permission when admin dashboard loads
    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
    
    return () => {
      // Cleanup function
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
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
    if (orders.today.length > previousOrdersCountRef.current) {
      // Show toast notification
      toast.success('New order received!', {
        duration: 2000,
        position: 'top-center',
        icon: '🔔'
      });
    }
    previousOrdersCountRef.current = orders.today.length;
  }, [orders.today.length]);

  // Fix restaurant status listener
  useEffect(() => {
    const statusRef = doc(db, 'restaurant', 'status');
    
    // Set initial status if it doesn't exist
    getDoc(statusRef).then((docSnapshot) => {
      if (!docSnapshot.exists()) {
        setDoc(statusRef, {
          isOpen: true,
          lastUpdated: serverTimestamp(),
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
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setRestaurantStatus(data.isOpen);
        }
      },
      (error) => {
        console.error('Error listening to restaurant status:', error);
        toast.error('Failed to load restaurant status');
      }
    );

    return () => unsubscribe();
  }, []);

  // Fix orders listener and stats calculation
  const setupOrdersListener = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ordersQuery = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(ordersQuery, (snapshot) => {
      try {
        const allOrders = snapshot.docs.map(doc => {
          const data = doc.data();
          // Calculate total amount from items
          const items = data.items || [];
          const totalAmount = items.reduce((sum: number, item: any) => {
            const price = Number(item.price) || 0;
            const quantity = Number(item.quantity) || 0;
            return sum + (price * quantity);
          }, 0);

          console.log('Order calculation:', {
            id: doc.id,
            items: items,
            calculatedTotal: totalAmount
          });

          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt || serverTimestamp(),
            totalAmount: totalAmount,
            status: data.status || 'pending',
            items: items
          };
        }) as Order[];

        console.log('Processing orders:', allOrders.length);

        // Update total orders count
        setTotalOrders(allOrders.length);

        // Filter today's orders
        const todayOrdersList = allOrders.filter(order => {
          if (!order.createdAt) return false;
          const orderDate = order.createdAt.toDate();
          return orderDate >= today && order.status !== 'completed';
        });

        // Filter completed orders
        const completedOrdersList = allOrders.filter(order => 
          order.status === 'completed'
        );

        // Filter past orders
        const pastOrdersList = allOrders.filter(order => {
          if (!order.createdAt) return false;
          const orderDate = order.createdAt.toDate();
          return orderDate < today && order.status !== 'completed';
        });

        console.log('Order counts:', {
          today: todayOrdersList.length,
          completed: completedOrdersList.length,
          past: pastOrdersList.length
        });

        // Update orders state
        setOrders({
          today: todayOrdersList,
          completed: completedOrdersList,
          past: pastOrdersList
        });

      } catch (error) {
        console.error('Error processing orders:', error);
        toast.error('Failed to process orders data');
      }
    });
  };

  const calculateRevenue = useCallback((orders: Order[]) => {
    console.log('Calculating revenue for orders:', orders.length);
    
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    let daily = 0;
    let weekly = 0;
    let monthly = 0;

    orders.forEach(order => {
      if (!order.createdAt) {
        console.log('Skipping order due to missing createdAt:', order.id);
        return;
      }
      
      const orderDate = order.createdAt.toDate();
      const amount = Number(order.totalAmount) || 0;

      console.log('Processing order:', {
        id: order.id,
        date: orderDate,
        amount: amount,
        status: order.status
      });

      if (orderDate >= today) {
        daily += amount;
        console.log('Added to daily revenue:', amount);
      }
      if (orderDate >= weekAgo) {
        weekly += amount;
        console.log('Added to weekly revenue:', amount);
      }
      if (orderDate >= monthAgo) {
        monthly += amount;
        console.log('Added to monthly revenue:', amount);
      }
    });

    console.log('Final revenue calculations:', {
      daily,
      weekly,
      monthly
    });

    setRevenueStats({
      daily: { amount: daily, change: 0 },
      weekly: { amount: weekly, change: 0 },
      monthly: { amount: monthly, change: 0 }
    });
  }, []);

  useEffect(() => {
    console.log('Orders changed, recalculating revenue');
    const allOrders = [...orders.today, ...orders.completed, ...orders.past];
    console.log('Total orders to process:', allOrders.length);
    calculateRevenue(allOrders);
  }, [orders.today, orders.completed, orders.past, calculateRevenue]);

  const RevenueCard = ({ title, amount }: { title: string; amount: number }) => {
    console.log('Rendering RevenueCard:', { title, amount });
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <p className="text-2xl font-bold text-gray-700">₹{amount.toLocaleString()}</p>
          </div>
          <DollarSign className="h-8 w-8 text-green-500" />
        </div>
      </div>
    );
  };

  const renderRevenueCards = () => {
    console.log('Current revenue stats:', revenueStats);
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <RevenueCard title="Today's Revenue" amount={revenueStats.daily.amount} />
        <RevenueCard title="This Week" amount={revenueStats.weekly.amount} />
        <RevenueCard title="This Month" amount={revenueStats.monthly.amount} />
      </div>
    );
  };

  const fetchMessages = () => {
    const messagesRef = collection(db, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'));
    
    return onSnapshot(q, (querySnapshot) => {
      const messages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(messages);
    });
  };

  const handleAddItem = async (itemData: Omit<MenuItem, 'id'>) => {
    try {
      const menuRef = collection(db, 'menuItems');
      await addDoc(menuRef, {
        ...itemData,
        isAvailable: true,
        createdAt: serverTimestamp()
      });
      toast.success('Item added successfully');
      setIsAddingItem(false);
      setNewItem({
        name: '',
        price: 0,
        description: '',
        category: '',
        image: ''
      });
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    }
  };

  const handleToggleRestaurantStatus = async () => {
    try {
      const restaurantRef = doc(db, 'restaurant', 'status');
      await updateDoc(restaurantRef, {
        isOpen: !restaurantStatus
      });
      setRestaurantStatus(!restaurantStatus);
      toast.success(`Restaurant is now ${!restaurantStatus ? 'open' : 'closed'}`);
    } catch (error) {
      console.error('Error toggling restaurant status:', error);
      toast.error('Failed to update restaurant status');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: 'completed' | 'pending') => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      // Update local state to reflect the change immediately
      setOrders(prevOrders => {
        const updatedToday = prevOrders.today.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        );
        const updatedCompleted = prevOrders.completed.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        );

        // Move order to appropriate list
        if (newStatus === 'completed') {
          const orderToMove = updatedToday.find(order => order.id === orderId);
          if (orderToMove) {
            return {
              today: updatedToday.filter(order => order.id !== orderId),
              completed: [...updatedCompleted, { ...orderToMove, status: newStatus }],
              past: prevOrders.past
            };
          }
        } else {
          const orderToMove = updatedCompleted.find(order => order.id === orderId);
          if (orderToMove) {
            return {
              today: [...updatedToday, { ...orderToMove, status: newStatus }],
              completed: updatedCompleted.filter(order => order.id !== orderId),
              past: prevOrders.past
            };
          }
        }

        return {
          today: updatedToday,
          completed: updatedCompleted,
          past: prevOrders.past
        };
      });

      toast.success('Order status updated successfully');
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const handleResetAllAvailability = async () => {
    try {
      const menuRef = collection(db, 'menuItems');
      const querySnapshot = await getDocs(menuRef);
      
      const batch = writeBatch(db);
      querySnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { isAvailable: true });
      });
      
      await batch.commit();
      toast.success('All items are now available');
    } catch (error) {
      console.error('Error resetting availability:', error);
      toast.error('Failed to reset availability');
    }
  };

  const handleToggleAvailability = async (itemId: string, currentStatus: boolean | undefined) => {
    try {
      const itemRef = doc(db, 'menuItems', itemId);
      // If currentStatus is undefined, default to false (making it available)
      const newStatus = currentStatus === undefined ? true : !currentStatus;
      await updateDoc(itemRef, {
        isAvailable: newStatus
      });
      toast.success(`Item ${newStatus ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      console.error('Error toggling availability:', error);
      toast.error('Failed to toggle availability');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteDoc(doc(db, 'menuItems', itemId));
      toast.success('Item deleted successfully');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const handleUpdateItem = async (
    itemIdOrEvent: string | React.MouseEvent<HTMLButtonElement>,
    updatedData?: Partial<MenuItem>
  ) => {
    try {
      if (typeof itemIdOrEvent === 'object') {
        // Called from edit modal
        if (!editingItem) return;
        const itemRef = doc(db, 'menuItems', editingItem.id);
        await updateDoc(itemRef, {
          ...editingItem,
          updatedAt: serverTimestamp()
        });
        setEditingItem(null);
      } else {
        // Called directly with ID and data
        const itemRef = doc(db, 'menuItems', itemIdOrEvent);
        await updateDoc(itemRef, {
          ...(updatedData || {}),
          updatedAt: serverTimestamp()
        });
      }
      toast.success('Item updated successfully');
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    }
  };

  const toggleCategoryAvailability = async (category: string) => {
    try {
      const currentStatus = categoryAvailability[category] || false;
      const menuRef = collection(db, 'menuItems');
      const querySnapshot = await getDocs(query(menuRef, where('category', '==', category)));
      
      const batch = writeBatch(db);
      querySnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { isAvailable: !currentStatus });
      });

      await batch.commit();
      setCategoryAvailability(prev => ({
        ...prev,
        [category]: !currentStatus
      }));
      toast.success(`${category} items ${!currentStatus ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      console.error('Error toggling category availability:', error);
      toast.error('Failed to toggle category availability');
    }
  };

  const handleMarkMessageAsRead = async (messageId: string) => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        read: true,
        updatedAt: serverTimestamp()
      });
      toast.success('Message marked as read');
      } catch (error) {
      console.error('Error marking message as read:', error);
      toast.error('Failed to mark message as read');
    }
  };

  const handleToggleOfferStatus = async (offerId: string, currentStatus: boolean) => {
    try {
      const offerRef = doc(db, 'offers', offerId);
      await updateDoc(offerRef, {
        isActive: !currentStatus,
        updatedAt: serverTimestamp()
      });
      toast.success(`Offer ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling offer status:', error);
      toast.error('Failed to toggle offer status');
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

  const handleAddOffer = async (offerData: Omit<Offer, 'id'>) => {
    try {
      const offerRef = collection(db, 'offers');
      await addDoc(offerRef, {
        ...offerData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast.success('Offer added successfully');
    } catch (error) {
      console.error('Error adding offer:', error);
      toast.error('Failed to add offer');
    }
  };

  const handleUpdateOffer = async (
    offerIdOrEvent: string | React.MouseEvent<HTMLButtonElement>,
    updatedData?: Partial<Offer>
  ) => {
    try {
      // If called as an event handler
      if (typeof offerIdOrEvent !== 'string' && updatedData === undefined) {
        return;
      }
      
      const offerId = typeof offerIdOrEvent === 'string' ? offerIdOrEvent : '';
      const offerRef = doc(db, 'offers', offerId);
      await updateDoc(offerRef, {
        ...(updatedData || {}),
        updatedAt: serverTimestamp()
      });
      toast.success('Offer updated successfully');
    } catch (error) {
      console.error('Error updating offer:', error);
      toast.error('Failed to update offer');
    }
  };

  // Update search filtering logic
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredMenuItems(menuItems);
    } else {
      const query = searchQuery.toLowerCase().trim();
      const filtered = menuItems.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
      setFilteredMenuItems(filtered);
    }
  }, [searchQuery, menuItems]);

  // Add event handler for item submission
  const handleItemSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (editingItem) {
      handleUpdateItem(editingItem.id, editingItem);
    } else {
      handleAddItem(newItem as Omit<MenuItem, 'id'>);
    }
  };

  // Update the offer submit handler with proper typing
  const handleOfferSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      if (editingOffer) {
        await handleUpdateOffer(editingOffer.id, newOffer);
        setEditingOffer(null);
      } else {
        const newOfferWithDate = {
          ...newOffer,
          createdAt: new Date()
        };
        await handleAddOffer(newOfferWithDate);
      }
      setNewOffer(initialOfferState);
      setIsAddingOffer(false);
    } catch (error) {
      console.error('Error submitting offer:', error);
      toast.error('Failed to submit offer');
    }
  };

  // Update the button onClick handler in the JSX
  <button
    onClick={handleOfferSubmit}
    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
  >
    {editingOffer ? 'Update Offer' : 'Add Offer'}
  </button>

  // Update the JSX where we render menu items
  const renderMenuItems = () => {
    if (!filteredMenuItems.length) {
      return (
        <div className="text-center py-4 text-gray-500">
          <p>No menu items found</p>
          <button
            onClick={() => setIsAddingItem(true)}
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Add Your First Item
          </button>
        </div>
      );
    }

    // Group items by category
    const groupedItems = filteredMenuItems.reduce((acc, item: MenuItem) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);

    return (
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
        {predefinedCategories.map(category => {
          const items = groupedItems[category] || [];
          if (items.length === 0) return null;

          const isExpanded = expandedCategories[category];
          const displayedItems = isExpanded ? items : items.slice(0, ITEMS_PER_CATEGORY);

          return (
            <div key={category} className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
                  <p className="text-sm text-gray-500">{items.length} items</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleCategoryAvailability(category)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      categoryAvailability[category]
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {categoryAvailability[category] ? 'Available' : 'Unavailable'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {displayedItems.map((item: MenuItem) => (
                  <div 
                    key={item.id} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-3 border rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                      <img
                        className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg object-cover"
                        src={item.image || 'default-food-image.jpg'}
                        alt={item.name}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'default-food-image.jpg';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm sm:text-base truncate">{item.name}</div>
                        <div className="text-xs sm:text-sm text-gray-500">₹{item.price}</div>
                        <div className="text-xs sm:text-sm mt-0.5">
                          {item.isAvailable ? (
                            <span className="text-green-600">Available</span>
                          ) : (
                            <span className="text-red-600">Unavailable</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-end gap-1 sm:gap-2 mt-2 sm:mt-0">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleAvailability(item.id, item.isAvailable)}
                        className={`p-1.5 sm:p-2 rounded ${
                          item.isAvailable 
                            ? 'text-green-600 hover:bg-green-50' 
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                      >
                        {item.isAvailable ? (
                          <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}

                {items.length > ITEMS_PER_CATEGORY && (
                  <button
                    onClick={() => setExpandedCategories(prev => ({
                      ...prev,
                      [category]: !prev[category]
                    }))}
                    className="w-full mt-2 py-2 text-sm text-red-500 hover:bg-red-50 rounded-md flex items-center justify-center gap-1"
                  >
                    {isExpanded ? (
                      <>Show Less <ChevronUp className="h-4 w-4" /></>
                    ) : (
                      <>Show More ({items.length - ITEMS_PER_CATEGORY} items) <ChevronDown className="h-4 w-4" /></>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        }).filter(Boolean)}
      </div>
    );
  };

  // Add the renderPhoneNumbers function
  const renderPhoneNumbers = (order: Order) => (
    <div className="flex items-center gap-2">
      <div className="flex flex-col">
        <div className="flex items-center gap-1">
          <Phone className="h-3 w-3 text-blue-500" />
          <a href={`tel:${order.userPhone}`} className="text-xs text-blue-600 hover:underline">
            {order.userPhone}
          </a>
        </div>
        {order.alternativePhone && (
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3 text-green-500" />
            <a href={`tel:${order.alternativePhone}`} className="text-xs text-green-600 hover:underline">
              {order.alternativePhone}
            </a>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.open(`tel:${order.userPhone}`);
          }}
          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
        >
          <Phone className="h-4 w-4" />
        </button>
        {order.alternativePhone && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(`tel:${order.alternativePhone}`);
            }}
            className="p-1 text-green-600 hover:bg-green-50 rounded"
          >
            <Phone className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  // Update the renderTodayOrders function
  const renderTodayOrders = () => {
    const sortedOrders = [...orders.today].sort((a, b) => 
      b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
    );

    return (
      <div className="mt-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Today's Orders</h2>
          <button
            onClick={() => setShowTodayOrders(!showTodayOrders)}
            className="text-blue-600 hover:text-blue-800"
          >
            {showTodayOrders ? 'Hide' : 'Show'}
          </button>
        </div>
        {showTodayOrders && (
          <div className="space-y-4">
            {sortedOrders.map((order, index) => (
              <div key={order.id} 
                className="border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 sm:p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-500">#{sortedOrders.length - index}</span>
                      <div className={`w-2 h-2 rounded-full ${
                        order.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm sm:text-base">{order.userName}</span>
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                            #{order.id.slice(-6)}
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 mt-1">
                          {order.items.length} items • ₹{order.totalAmount}
                        </div>
                      </div>
                    </div>
                    {renderPhoneNumbers(order)}
                  </div>
                </div>
                {/* Expanded View - Better mobile layout */}
                {expandedOrderId === order.id && (
                  <div className="border-t p-2 sm:p-3 bg-gray-50">
                    <div className="space-y-3">
                      {/* Customer Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <h5 className="text-xs font-medium text-gray-500 mb-1">Customer Details</h5>
                          <div className="bg-white p-2 rounded text-sm">
                            <p>{order.userName}</p>
                            <p className="text-gray-500">{order.userPhone}</p>
                          </div>
                        </div>
                        <div>
                          <h5 className="text-xs font-medium text-gray-500 mb-1">Delivery Address</h5>
                          <div className="bg-white p-2 rounded text-sm">
                            <p>{order.address.street}</p>
                            <p>{order.address.city}, {order.address.pincode}</p>
                            {order.address.landmark && (
                              <p className="text-gray-500 mt-1">
                                Landmark: {order.address.landmark}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div>
                        <h5 className="text-xs font-medium text-gray-500 mb-1">Order Items</h5>
                        <div className="bg-white rounded p-2 space-y-1.5">
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
                            onClick={async () => {
                              try {
                                await handleUpdateOrderStatus(order.id, 'completed');
                                toast.success('Order marked as completed');
                              } catch (error) {
                                console.error('Error completing order:', error);
                                toast.error('Failed to complete order');
                              }
                            }}
                            className="flex-1 bg-green-500 text-white py-2 px-3 rounded text-sm font-medium hover:bg-green-600 flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Mark as Completed
                          </button>
                        )}
                        {order.status === 'completed' && (
                          <div className="flex-1 bg-green-100 text-green-800 py-2 px-3 rounded text-sm font-medium flex items-center justify-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Completed
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {/* Order Status and Expand Button */}
                <div className="border-t p-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      order.status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {order.status === 'completed' ? 'Completed' : 'Pending'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {order.paymentMethod} • {order.paymentStatus}
                    </span>
                  </div>
                  <button
                    onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                  >
                    {expandedOrderId === order.id ? 'Hide Details' : 'Show Details'}
                    {expandedOrderId === order.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Update the renderCompletedOrders function to add scrolling
  const renderCompletedOrders = () => {
    const sortedOrders = [...orders.completed].sort((a, b) => 
      b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
    );

    return (
      <div className="mt-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Completed Orders</h2>
          <button
            onClick={() => setShowCompletedOrders(!showCompletedOrders)}
            className="text-blue-600 hover:text-blue-800"
          >
            {showCompletedOrders ? 'Hide' : 'Show'}
          </button>
        </div>
        {showCompletedOrders && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {sortedOrders.map((order, index) => (
              <div key={order.id} 
                className="border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-sm font-semibold text-gray-500">#{sortedOrders.length - index}</span>
                    <div className="w-2 h-2 rounded-full bg-green-500" />
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
                  {renderPhoneNumbers(order)}
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
                          <p className="text-sm text-gray-500">{order.userPhone}</p>
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
                  </div>
                )}
                {/* Order Status and Expand Button */}
                <div className="border-t p-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                      Completed
                    </span>
                    <span className="text-xs text-gray-500">
                      {order.paymentMethod} • {order.paymentStatus}
                    </span>
                  </div>
                  <button
                    onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                  >
                    {expandedOrderId === order.id ? 'Hide Details' : 'Show Details'}
                    {expandedOrderId === order.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Initialize FCM
  useEffect(() => {
    const initializeFCM = async () => {
      try {
        const token = await requestNotificationPermission();
        if (token && isAdmin) {
          await saveFCMToken(auth.currentUser?.uid || '', token);
        }
      } catch (error) {
        console.error('Error initializing FCM:', error);
      }
    };

    if (isAdmin) {
      initializeFCM();
    }
  }, [isAdmin]);

  // Listen for foreground messages
  useEffect(() => {
    if (!isAdmin) return;

    const messageListener = onMessageListener();
    messageListener.then((payload) => {
      showNotification(payload);
      // Play notification sound if enabled
      if (isSoundEnabled && audioRef.current) {
        audioRef.current.play().catch(console.error);
      }
      // Show in-app notification
      if (payload.data?.orderId) {
        const order = [...orders.today, ...orders.completed, ...orders.past]
          .find(o => o.id === payload.data?.orderId);
        if (order) {
          setNewOrderNotification({ show: true, order });
        }
      }
    }).catch((err) => console.error('Error receiving message:', err));

    return () => {
      // Cleanup if needed
    };
  }, [isAdmin, orders.today, orders.completed, orders.past, isSoundEnabled]);

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
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Main Dashboard Content */}
        <div className="py-2 sm:py-4">
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
            {/* Header Section - More compact on mobile */}
            <div className="mb-3 sm:mb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                <div>
                  <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                  <p className="text-xs sm:text-base text-gray-600">Manage your restaurant's menu and orders</p>
                </div>
                <button
                  onClick={handleToggleRestaurantStatus}
                  className={`w-full sm:w-auto px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base font-medium flex items-center justify-center gap-2 ${
                    restaurantStatus
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  {restaurantStatus ? (
                    <>
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                      Restaurant is Open
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                      Restaurant is Closed
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Stats Cards - Responsive grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-3 sm:mb-6">
              {/* Total Items */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-3 sm:p-4 rounded-lg shadow-md"
              >
                <div className="flex items-center">
                  <Package className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
                  <div className="ml-2 sm:ml-3">
                    <h2 className="text-sm sm:text-base font-semibold text-gray-900">Total Items</h2>
                    <p className="text-lg sm:text-2xl font-bold text-gray-700">{totalItems}</p>
                  </div>
                </div>
              </motion.div>

              {/* Total Orders */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-3 sm:p-4 rounded-lg shadow-md"
              >
                <div className="flex items-center">
                  <ShoppingBag className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                  <div className="ml-2 sm:ml-3">
                    <h2 className="text-sm sm:text-base font-semibold text-gray-900">Total Orders</h2>
                    <p className="text-lg sm:text-2xl font-bold text-gray-700">{totalOrders}</p>
                  </div>
                </div>
              </motion.div>

              {/* Today's Orders */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setShowTodayOrders(!showTodayOrders)}
                className="bg-white p-3 sm:p-4 rounded-lg shadow-md cursor-pointer hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ShoppingBag className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                    <div className="ml-2 sm:ml-3">
                      <h2 className="text-sm sm:text-base font-semibold text-gray-900">Today's Orders</h2>
                      <p className="text-lg sm:text-2xl font-bold text-gray-700">{orders.today.length}</p>
                    </div>
                  </div>
                  <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 text-gray-400 transform transition-transform ${showTodayOrders ? 'rotate-180' : ''}`} />
                </div>
              </motion.div>

              {/* Completed Orders */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setShowCompletedOrders(!showCompletedOrders)}
                className="bg-white p-3 sm:p-4 rounded-lg shadow-md cursor-pointer hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
                    <div className="ml-2 sm:ml-3">
                      <h2 className="text-sm sm:text-base font-semibold text-gray-900">Completed</h2>
                      <p className="text-lg sm:text-2xl font-bold text-gray-700">{orders.completed.length}</p>
                    </div>
                  </div>
                  <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 text-gray-400 transform transition-transform ${showCompletedOrders ? 'rotate-180' : ''}`} />
                </div>
              </motion.div>
            </div>

            {/* Revenue Stats - Single view with period selector */}
            <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 mb-3 sm:mb-6">
              <div className="flex flex-col space-y-3">
                {/* Period Selector */}
                <div className="flex justify-center p-1 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-3 gap-1 w-full max-w-md">
                    <button
                      onClick={() => setSelectedRevenuePeriod('daily')}
                      className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                        selectedRevenuePeriod === 'daily'
                          ? 'bg-red-500 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Daily
                    </button>
                    <button
                      onClick={() => setSelectedRevenuePeriod('weekly')}
                      className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                        selectedRevenuePeriod === 'weekly'
                          ? 'bg-red-500 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Weekly
                    </button>
                    <button
                      onClick={() => setSelectedRevenuePeriod('monthly')}
                      className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                        selectedRevenuePeriod === 'monthly'
                          ? 'bg-red-500 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Monthly
                    </button>
                  </div>
                </div>

                {/* Revenue Display */}
                <motion.div
                  key={selectedRevenuePeriod}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white p-4 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                        {selectedRevenuePeriod.charAt(0).toUpperCase() + selectedRevenuePeriod.slice(1)} Revenue
                      </h2>
                      <p className="text-2xl sm:text-3xl font-bold text-gray-700 mt-1">
                        ₹{revenueStats[selectedRevenuePeriod].amount.toLocaleString()}
                      </p>
                      <div className="flex items-center mt-2">
                        <span className={`text-sm ${
                          revenueStats[selectedRevenuePeriod].change > 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {revenueStats[selectedRevenuePeriod].change > 0 
                            ? <ArrowUp className="h-4 w-4 inline mr-1" /> 
                            : <ArrowDown className="h-4 w-4 inline mr-1" />
                          }
                          {revenueStats[selectedRevenuePeriod].change.toFixed(1)}%
                        </span>
                        <span className="text-xs sm:text-sm text-gray-500 ml-2">
                          vs {selectedRevenuePeriod === 'daily' ? 'yesterday' : 
                              selectedRevenuePeriod === 'weekly' ? 'last week' : 'last month'}
                        </span>
                      </div>
                    </div>
                    <div className={`p-3 rounded-full ${
                      selectedRevenuePeriod === 'daily' ? 'bg-green-100' :
                      selectedRevenuePeriod === 'weekly' ? 'bg-blue-100' : 'bg-purple-100'
                    }`}>
                      <DollarSign className={`h-6 w-6 sm:h-8 sm:w-8 ${
                        selectedRevenuePeriod === 'daily' ? 'text-green-500' :
                        selectedRevenuePeriod === 'weekly' ? 'text-blue-500' : 'text-purple-500'
                      }`} />
                    </div>
                  </div>

                  {/* Additional Stats */}
                  <div className="mt-4 grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">Orders</p>
                      <p className="text-lg sm:text-xl font-semibold mt-1">
                        {selectedRevenuePeriod === 'daily' 
                          ? orders.today.length
                          : selectedRevenuePeriod === 'weekly'
                          ? orders.completed.filter(order => {
                              const orderDate = order.createdAt.toDate();
                              const weekAgo = new Date();
                              weekAgo.setDate(weekAgo.getDate() - 7);
                              return orderDate >= weekAgo;
                            }).length
                          : orders.completed.filter(order => {
                              const orderDate = order.createdAt.toDate();
                              const monthAgo = new Date();
                              monthAgo.setMonth(monthAgo.getMonth() - 1);
                              return orderDate >= monthAgo;
                            }).length
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">Avg. Order Value</p>
                      <p className="text-lg sm:text-xl font-semibold mt-1">
                        ₹{(revenueStats[selectedRevenuePeriod].amount / (
                          selectedRevenuePeriod === 'daily' 
                            ? Math.max(orders.today.length, 1)
                            : selectedRevenuePeriod === 'weekly'
                            ? Math.max(orders.completed.filter(order => {
                                const orderDate = order.createdAt.toDate();
                                const weekAgo = new Date();
                                weekAgo.setDate(weekAgo.getDate() - 7);
                                return orderDate >= weekAgo;
                              }).length, 1)
                            : Math.max(orders.completed.filter(order => {
                                const orderDate = order.createdAt.toDate();
                                const monthAgo = new Date();
                                monthAgo.setMonth(monthAgo.getMonth() - 1);
                                return orderDate >= monthAgo;
                              }).length, 1)
                        )).toFixed(0)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Orders Lists - Better mobile spacing */}
            {showTodayOrders && renderTodayOrders()}
            {showCompletedOrders && renderCompletedOrders()}

            {/* Menu Management Section */}
            <div className="bg-white rounded-lg shadow-md p-2 sm:p-4">
              <div className="flex flex-col gap-2 sm:gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h2 className="text-base sm:text-lg font-semibold">Menu Items ({filteredMenuItems.length})</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleResetAllAvailability}
                      disabled={isLoading}
                      className="flex-1 sm:flex-none px-3 py-1.5 bg-green-500 text-white text-xs sm:text-sm rounded-md hover:bg-green-600 disabled:opacity-50"
                    >
                      Reset All
                    </button>
                    <button
                      onClick={() => setIsAddingItem(true)}
                      className="flex-1 sm:flex-none px-3 py-1.5 bg-red-500 text-white text-xs sm:text-sm rounded-md hover:bg-red-600"
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
                  className="w-full px-3 py-2 text-xs sm:text-sm border rounded-md"
                />
              </div>
            </div>

            <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
              {renderMenuItems()}
            </div>

            {filteredMenuItems.length > ITEMS_PER_PAGE && (
              <button
                onClick={() => setShowAllItems(!showAllItems)}
                className="mt-3 sm:mt-4 w-full py-2 text-xs sm:text-sm text-red-500 hover:bg-red-50 rounded-md"
              >
                {showAllItems ? (
                  <span className="flex items-center justify-center">
                    Show Less <ChevronUp className="ml-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    Show More ({filteredMenuItems.length - ITEMS_PER_PAGE} items) <ChevronDown className="ml-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </span>
                )}
              </button>
            )}

            {/* Add/Edit Item Modal */}
            {(isAddingItem || editingItem) && (
              <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg p-3 sm:p-4 w-full max-w-md mx-2 sm:mx-4">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
                    {editingItem ? 'Edit Item' : 'Add New Item'}
                  </h3>
                  
                  <div className="space-y-2 sm:space-y-3">
                    <input
                      type="text"
                      placeholder="Item name"
                      value={editingItem ? editingItem.name : newItem.name}
                      onChange={(e) => editingItem 
                        ? setEditingItem({ ...editingItem, name: e.target.value })
                        : setNewItem({ ...newItem, name: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-xs sm:text-sm border rounded-md"
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
                        className="w-1/2 px-3 py-1.5 text-xs sm:text-sm border rounded-md"
                      />
                      
                      <input
                        type="text"
                        placeholder="Category"
                        value={editingItem ? editingItem.category : newItem.category}
                        onChange={(e) => editingItem
                          ? setEditingItem({ ...editingItem, category: e.target.value })
                          : setNewItem({ ...newItem, category: e.target.value })
                        }
                        className="w-1/2 px-3 py-1.5 text-xs sm:text-sm border rounded-md"
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
                      className="w-full px-3 py-1.5 text-xs sm:text-sm border rounded-md"
                    />
                    
                    <textarea
                      placeholder="Description"
                      value={editingItem ? editingItem.description : newItem.description}
                      onChange={(e) => editingItem
                        ? setEditingItem({ ...editingItem, description: e.target.value })
                        : setNewItem({ ...newItem, description: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-xs sm:text-sm border rounded-md h-16 sm:h-20"
                    />
                  </div>

                  <div className="flex justify-end gap-2 mt-3 sm:mt-4">
                    <button
                      onClick={() => {
                        setIsAddingItem(false);
                        setEditingItem(null);
                      }}
                      className="px-3 py-1.5 text-xs sm:text-sm border rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleItemSubmit}
                      className="px-3 py-1.5 text-xs sm:text-sm bg-red-500 text-white rounded-md hover:bg-red-600"
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
                  <a
                    href={`tel:${newOrderNotification.order.userPhone}`}
                    className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600"
                    title="Call Customer"
                  >
                    <Phone size={20} />
                  </a>
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
    </div>
  );
};

export default Dashboard;

  