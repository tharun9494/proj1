import React, { useState, useEffect } from 'react';
import { 
    placeOrder, 
    getAllOrders, 
    getOrderById, 
    updateOrderStatus, 
    deleteOrder 
} from '../services/orderService';
import { toast } from 'react-hot-toast';

const OrderManagement = () => {
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loading, setLoading] = useState(false);

    // Fetch all orders on component mount
    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const data = await getAllOrders();
            setOrders(data);
        } catch (error) {
            toast.error('Failed to fetch orders');
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePlaceOrder = async (orderData) => {
        try {
            setLoading(true);
            const newOrder = await placeOrder(orderData);
            setOrders(prev => [...prev, newOrder]);
            toast.success('Order placed successfully!');
        } catch (error) {
            toast.error('Failed to place order');
            console.error('Error placing order:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGetOrder = async (orderId) => {
        try {
            setLoading(true);
            const order = await getOrderById(orderId);
            setSelectedOrder(order);
        } catch (error) {
            toast.error('Failed to fetch order details');
            console.error('Error fetching order:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            setLoading(true);
            await updateOrderStatus(orderId, newStatus);
            // Refresh orders list
            await fetchOrders();
            toast.success('Order status updated successfully!');
        } catch (error) {
            toast.error('Failed to update order status');
            console.error('Error updating order status:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteOrder = async (orderId) => {
        try {
            setLoading(true);
            await deleteOrder(orderId);
            setOrders(prev => prev.filter(order => order.id !== orderId));
            toast.success('Order deleted successfully!');
        } catch (error) {
            toast.error('Failed to delete order');
            console.error('Error deleting order:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Order Management</h1>
            
            {/* Loading indicator */}
            {loading && (
                <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
            )}

            {/* Orders List */}
            <div className="grid gap-4">
                {orders.map(order => (
                    <div key={order.id} className="border p-4 rounded-lg shadow">
                        <h3 className="font-semibold">Order #{order.id}</h3>
                        <p>Status: {order.status}</p>
                        <div className="mt-2 space-x-2">
                            <button
                                onClick={() => handleGetOrder(order.id)}
                                className="bg-blue-500 text-white px-3 py-1 rounded"
                            >
                                View Details
                            </button>
                            <button
                                onClick={() => handleUpdateStatus(order.id, 'PROCESSING')}
                                className="bg-yellow-500 text-white px-3 py-1 rounded"
                            >
                                Update Status
                            </button>
                            <button
                                onClick={() => handleDeleteOrder(order.id)}
                                className="bg-red-500 text-white px-3 py-1 rounded"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Selected Order Details */}
            {selectedOrder && (
                <div className="mt-4 border p-4 rounded-lg shadow">
                    <h2 className="text-xl font-bold mb-2">Order Details</h2>
                    <pre className="bg-gray-100 p-2 rounded">
                        {JSON.stringify(selectedOrder, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default OrderManagement; 