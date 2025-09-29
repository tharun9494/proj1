import axios, { AxiosError } from 'axios';

// Use environment variable for API URL, fallback to default
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV 
  ? '/api/orders'
  : 'https://pittas-backend.vercel.app/api/orders');

// Create axios instance with default config
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true // Enable sending cookies
});

// Add request interceptor for authentication
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Handle unauthorized access
            localStorage.removeItem('authToken');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export interface Order {
    id: string;
    status: string;
    [key: string]: any;
}

// Create a new order
export const placeOrder = async (orderData: Partial<Order>): Promise<{ success: boolean; message?: string; data?: any }> => {
    try {
        const response = await api.post('/place', orderData);
        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        console.error('Order placement error:', error);
        
        if (error instanceof AxiosError) {
            // Handle specific error cases
            if (error.code === 'ECONNREFUSED') {
                return {
                    success: false,
                    message: 'Unable to connect to the server. Please check if the backend server is running.'
                };
            }
            
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                return {
                    success: false,
                    message: error.response.data?.message || `Server error: ${error.response.status}`
                };
            } else if (error.request) {
                // The request was made but no response was received
                return {
                    success: false,
                    message: 'No response from server. Please check your internet connection.'
                };
            }
        }
        
        return {
            success: false,
            message: 'An unexpected error occurred while placing the order.'
        };
    }
};

// Get all orders
export const getAllOrders = async (): Promise<Order[]> => {
    try {
        const response = await api.get('/');
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            throw error.response?.data || error.message;
        }
        throw new Error('An unexpected error occurred');
    }
};

// Get order by ID
export const getOrderById = async (orderId: string): Promise<Order> => {
    try {
        const response = await api.get(`/${orderId}`);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            throw error.response?.data || error.message;
        }
        throw new Error('An unexpected error occurred');
    }
};

// Update order status
export const updateOrderStatus = async (orderId: string, status: string): Promise<Order> => {
    try {
        const response = await api.patch(`/${orderId}/status`, { status });
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            throw error.response?.data || error.message;
        }
        throw new Error('An unexpected error occurred');
    }
};

// Delete order
export const deleteOrder = async (orderId: string): Promise<void> => {
    try {
        await api.delete(`/${orderId}`);
    } catch (error) {
        if (error instanceof AxiosError) {
            throw error.response?.data || error.message;
        }
        throw new Error('An unexpected error occurred');
    }
};