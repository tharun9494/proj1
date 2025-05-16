import axios from 'axios';

const API_BASE_URL = 'http://172.16.117.93:5001/api/orders';

// Create a new order
export const placeOrder = async (orderData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/place`, orderData);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Get all orders
export const getAllOrders = async () => {
    try {
        const response = await axios.get(API_BASE_URL);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Get order by ID
export const getOrderById = async (orderId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/${orderId}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Update order status
export const updateOrderStatus = async (orderId, status) => {
    try {
        const response = await axios.patch(`${API_BASE_URL}/${orderId}/status`, { status });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// Delete order
export const deleteOrder = async (orderId) => {
    try {
        const response = await axios.delete(`${API_BASE_URL}/${orderId}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
}; 