export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface OrderAddress {
  street: string;
  city: string;
  pincode: string;
  landmark?: string;
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  items: OrderItem[];
  totalAmount: number;
  address: OrderAddress;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'success' | 'failed';
  paymentId?: string;
  createdAt: any;
  updatedAt: any;
}

interface OrderStatsData {
  total: number;
  completed: number;
  revenue: number;
  orders: Array<{
    date: Date;
    amount: number;
    total: number;
  }>;
}

export interface OrderStats {
  daily: OrderStatsData;
  weekly: OrderStatsData;
  monthly: OrderStatsData;
}