import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Profile from '../pages/Profile';
import Menu from '../pages/Menu';
import MenuItem from '../pages/MenuItem';
import Cart from '../pages/Cart';
import PaymentCallback from '../pages/PaymentCallback';
import Dashboard from '../pages/Admin/Dashboard';
import AdminRoute from '../components/AdminRoute';
import About from '../pages/About';
import Contact from '../pages/Contact';
import Terms from '../pages/Terms';
import Privacy from '../pages/Privacy';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/menu" element={<Menu />} />
      <Route path="/menu/:id" element={<MenuItem />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/payment/callback" element={<PaymentCallback />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <Dashboard />
          </AdminRoute>
        }
      />
    </Routes>
  );
};

export default AppRoutes;