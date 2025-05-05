import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import AppRoutes from './routes';
import Footer from './components/Footer';
import NotificationHandler from './components/NotificationHandler';
import Dashboard from './pages/Admin/Dashboard';

const App: React.FC = () => {
  const handleNewOrder = (orderId: string) => {
    // Handle new order notification
    console.log('New order received:', orderId);
    // You can update your UI or fetch new data here
  };

  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <NotificationHandler onNewOrder={handleNewOrder} />
          <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />
            <main className="flex-grow">
              <AppRoutes />
            </main>
            <Footer />
            <Toaster position="bottom-center" />
          </div>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;