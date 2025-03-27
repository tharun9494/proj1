import { collection, addDoc, query, where, getDocs, updateDoc, doc, orderBy, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Order, OrderStats } from '../types/order';

export const createOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
  const ordersRef = collection(db, 'orders');
  const docRef = await addDoc(ordersRef, {
    ...orderData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
};

export const updateOrderStatus = async (orderId: string, status: Order['status']) => {
  const orderRef = doc(db, 'orders', orderId);
  await updateDoc(orderRef, {
    status,
    updatedAt: serverTimestamp()
  });
};

export const getTodayOrders = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const ordersRef = collection(db, 'orders');
  const q = query(
    ordersRef,
    where('createdAt', '>=', today),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    .filter(order => order.paymentStatus === 'success') as Order[];
};

export const getCompletedOrders = async () => {
  const ordersRef = collection(db, 'orders');
  const q = query(
    ordersRef,
    where('status', '==', 'completed'),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Order[];
};

export const getPastOrders = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const ordersRef = collection(db, 'orders');
  const q = query(
    ordersRef,
    where('createdAt', '<', today),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Order[];
};

export const getOrderStats = async (): Promise<OrderStats> => {
  const now = new Date();
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const ordersRef = collection(db, 'orders');
  
  // Get all orders and filter in memory for accurate stats
  const q = query(ordersRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  const allOrders = snapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    .filter(order => order.paymentStatus === 'success') as Order[];

  const filterOrdersByDate = (orders: Order[], startDate: Date) => {
    return orders.filter(order => {
      const orderDate = order.createdAt.toDate();
      return orderDate >= startDate;
    });
  };

  const dailyOrders = filterOrdersByDate(allOrders, startOfDay);
  const weeklyOrders = filterOrdersByDate(allOrders, startOfWeek);
  const monthlyOrders = filterOrdersByDate(allOrders, startOfMonth);

  const calculateStats = (orders: Order[]) => {
    // Group orders by date for the chart
    const ordersByDate = orders.reduce((acc, order) => {
      const date = order.createdAt.toDate().toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          total: 0,
          amount: 0
        };
      }
      acc[date].total += 1;
      acc[date].amount += order.totalAmount;
      return acc;
    }, {} as Record<string, { total: number; amount: number }>);

    // Convert to array format for the chart
    const chartData = Object.entries(ordersByDate).map(([date, data]) => ({
      date: new Date(date),
      amount: data.amount,
      total: data.total
    }));

    return {
      total: orders.length,
      completed: orders.filter(order => order.status === 'completed').length,
      revenue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
      orders: chartData.sort((a, b) => a.date.getTime() - b.date.getTime())
    };
  };

  return {
    daily: calculateStats(dailyOrders),
    weekly: calculateStats(weeklyOrders),
    monthly: calculateStats(monthlyOrders)
  };
};

export const getUserOrders = async (userId: string): Promise<Order[]> => {
  const ordersRef = collection(db, 'orders');
  const q = query(
    ordersRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Order[];
};