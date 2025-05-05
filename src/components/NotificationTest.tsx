import React from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

const NotificationTest: React.FC = () => {
  const { user } = useAuth();

  const createTestOrder = async () => {
    try {
      const testOrder = {
        totalAmount: 29.99,
        items: [
          {
            name: "Test Pizza",
            quantity: 2,
            price: 14.99
          }
        ],
        customerName: "Test Customer",
        customerPhone: "+1234567890",
        status: "pending",
        createdAt: new Date(),
        userId: user?.uid || 'test-user'
      };

      const orderRef = await addDoc(collection(db, 'orders'), testOrder);
      console.log('Test order created with ID:', orderRef.id);
    } catch (error) {
      console.error('Error creating test order:', error);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Notification Test Panel</h2>
      <button
        onClick={createTestOrder}
        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
      >
        Create Test Order
      </button>
      <p className="mt-2 text-sm text-gray-600">
        Click the button above to create a test order and trigger a notification.
      </p>
    </div>
  );
};

export default NotificationTest; 