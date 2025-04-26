import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, 
  CheckCircle, 
  Package, 
  Plus, 
  Trash2, 
  Edit, 
  ChevronDown, 
  ChevronUp, 
  Phone,
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
  setDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  isWithinInterval, 
  subDays, 
  subWeeks, 
  subMonths 
} from 'date-fns';

// Types
interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  image: string;
  isAvailable?: boolean;
}

interface OrderItem extends MenuItem {
  quantity: number;
}

interface Order {
  id: string;
  status: 'pending' | 'completed';
  totalAmount: number;
  items: OrderItem[];
  createdAt: Timestamp;
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

const Dashboard = () => {
  const { isAdmin } = useAuth();
  const [totalItems, setTotalItems] = useState(0);
  const [todayOrders, setTodayOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [showTodayOrders, setShowTodayOrders] = useState(false);
  const [showCompletedOrders, setShowCompletedOrders] = useState(false);
  const [newItem, setNewItem] = useState<Partial<MenuItem>>({
    name: '',
    price: 0,
    description: '',
    category: '',
    image: ''
  });
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllItems, setShowAllItems] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [restaurantStatus, setRestaurantStatus] = useState<boolean>(false);
  const [categories] = useState<string[]>([
    'Biryani', 'Soups', 'Chicken Starters', 'Fried Rice', 'Tandoori',
    'Noodles', 'Pulao', 'Drinks'
  ]);
  const [categoryAvailability, setCategoryAvailability] = useState<Record<string, boolean>>({});
  const [revenueStats, setRevenueStats] = useState<RevenueStats>({
    daily: { amount: 0, change: 0 },
    weekly: { amount: 0, change: 0 },
    monthly: { amount: 0, change: 0 }
  });
  const [totalOrders, setTotalOrders] = useState(0);
  const [selectedRevenuePeriod, setSelectedRevenuePeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [filteredMenuItems, setFilteredMenuItems] = useState<MenuItem[]>([]);
  const ITEMS_PER_PAGE = 5;

  // Initialize dashboard data
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setIsLoading(true);
        if (!isAdmin) return;

        const unsubOrders = setupOrdersListener();
        
        return () => {
          if (unsubOrders) unsubOrders();
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

  // Menu items listener
  useEffect(() => {
    if (!isAdmin) return;

    const menuRef = collection(db, 'menuItems');
    
    const unsubscribe = onSnapshot(menuRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isAvailable: doc.data().isAvailable !== false
      })) as MenuItem[];
      
      setMenuItems(items);
      setFilteredMenuItems(items);
      setTotalItems(items.length);
      
      // Initialize category availability
      const availability: Record<string, boolean> = {};
      categories.forEach(category => {
        const categoryItems = items.filter(item => item.category === category);
        availability[category] = categoryItems.length > 0 && 
          categoryItems.every(item => item.isAvailable !== false);
      });
      setCategoryAvailability(availability);
    });

    return () => unsubscribe();
  }, [isAdmin, categories]);

  // Restaurant status listener
  useEffect(() => {
    const statusRef = doc(db, 'restaurant', 'status');
    
    getDoc(statusRef).then((docSnapshot) => {
      if (!docSnapshot.exists()) {
        setDoc(statusRef, {
          isOpen: true,
          lastUpdated: serverTimestamp(),
        });
      }
    });

    const unsubscribe = onSnapshot(statusRef, 
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setRestaurantStatus(data.isOpen);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // Search filter effect
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

  // Event Handlers
  const handleToggleRestaurantStatus = async () => {
    try {
      const restaurantRef = doc(db, 'restaurant', 'status');
      await updateDoc(restaurantRef, {
        isOpen: !restaurantStatus
      });
      toast.success(`Restaurant is now ${!restaurantStatus ? 'open' : 'closed'}`);
    } catch (error) {
      console.error('Error toggling restaurant status:', error);
      toast.error('Failed to update restaurant status');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast.success('Order status updated successfully');
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const handleToggleAvailability = async (itemId: string, currentStatus: boolean | undefined) => {
    try {
      const itemRef = doc(db, 'menuItems', itemId);
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

  const handleUpdateItem = async (itemId: string, updatedData: Partial<MenuItem>) => {
    try {
      const itemRef = doc(db, 'menuItems', itemId);
      await updateDoc(itemRef, {
        ...updatedData,
        updatedAt: serverTimestamp()
      });
      toast.success('Item updated successfully');
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    }
  };

  // Setup orders listener
  const setupOrdersListener = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const ordersQuery = query(
      collection(db, 'orders'),
      where('createdAt', '>=', lastMonth),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(ordersQuery, (snapshot) => {
      const allOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];

      // Filter today's orders
      const todayOrdersList = allOrders.filter(order => {
        const orderDate = order.createdAt.toDate();
        return orderDate >= today && 
          order.status !== 'completed' && 
          ((order.paymentMethod === 'ONLINE' && order.paymentStatus === 'success') ||
           order.paymentMethod === 'COD');
      });

      // Filter completed orders
      const completedOrdersList = allOrders.filter(order => 
        order.status === 'completed' &&
        ((order.paymentMethod === 'ONLINE' && order.paymentStatus === 'success') ||
         order.paymentMethod === 'COD')
      );

      setTodayOrders(todayOrdersList);
      setCompletedOrders(completedOrdersList);
      setTotalOrders(todayOrdersList.length + completedOrdersList.length);

      // Calculate revenue stats
      const calculateRevenueStats = () => {
        const now = new Date();
        const todayStart = startOfDay(now);
        const yesterdayStart = startOfDay(subDays(now, 1));
        const weekStart = startOfWeek(now);
        const lastWeekStart = startOfWeek(subWeeks(now, 1));
        const monthStart = startOfMonth(now);
        const lastMonthStart = startOfMonth(subMonths(now, 1));

        let dailyRevenue = 0;
        let yesterdayRevenue = 0;
        let weeklyRevenue = 0;
        let lastWeekRevenue = 0;
        let monthlyRevenue = 0;
        let lastMonthRevenue = 0;

        allOrders.forEach(order => {
          if (!order.createdAt || !order.totalAmount) return;
          
          const orderDate = order.createdAt.toDate();
          const amount = Number(order.totalAmount);

          if (orderDate >= todayStart) {
            dailyRevenue += amount;
          } else if (orderDate >= yesterdayStart) {
            yesterdayRevenue += amount;
          }

          if (orderDate >= weekStart) {
            weeklyRevenue += amount;
          } else if (orderDate >= lastWeekStart) {
            lastWeekRevenue += amount;
          }

          if (orderDate >= monthStart) {
            monthlyRevenue += amount;
          } else if (orderDate >= lastMonthStart) {
            lastMonthRevenue += amount;
          }
        });

        const calculateChange = (current: number, previous: number) => {
          if (previous === 0) return current === 0 ? 0 : 100;
          return ((current - previous) / previous) * 100;
        };

        setRevenueStats({
          daily: {
            amount: dailyRevenue,
            change: calculateChange(dailyRevenue, yesterdayRevenue)
          },
          weekly: {
            amount: weeklyRevenue,
            change: calculateChange(weeklyRevenue, lastWeekRevenue)
          },
          monthly: {
            amount: monthlyRevenue,
            change: calculateChange(monthlyRevenue, lastMonthRevenue)
          }
        });
      };

      calculateRevenueStats();
    });
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
    <div className="min-h-screen bg-gray-100">
      <div className="py-2 sm:py-4">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          {/* Header */}
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

          {/* Stats Overview */}
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
                    <p className="text-lg sm:text-2xl font-bold text-gray-700">{todayOrders.length}</p>
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
                    <p className="text-lg sm:text-2xl font-bold text-gray-700">{completedOrders.length}</p>
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 text-gray-400 transform transition-transform ${showCompletedOrders ? 'rotate-180' : ''}`} />
              </div>
            </motion.div>
          </div>

          {/* Revenue Stats */}
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 mb-3 sm:mb-6">
            <div className="flex flex-col space-y-3">
              {/* Period Selector */}
              <div className="flex justify-center p-1 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-3 gap-1 w-full max-w-md">
                  {['daily', 'weekly', 'monthly'].map((period) => (
                    <button
                      key={period}
                      onClick={() => setSelectedRevenuePeriod(period as 'daily' | 'weekly' | 'monthly')}
                      className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                        selectedRevenuePeriod === period
                          ? 'bg-red-500 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </button>
                  ))}
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
              </motion.div>
            </div>
          </div>

          {/* Menu Management */}
          <div className="bg-white rounded-lg shadow-md p-2 sm:p-4">
            <div className="flex flex-col gap-2 sm:gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="text-base sm:text-lg font-semibold">Menu Items ({filteredMenuItems.length})</h2>
                <div className="flex items-center gap-2">
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

            <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
              {filteredMenuItems.map((item) => (
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 