import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Search, ShoppingBag, User, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import logo from './images/logo.png'

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const { totalItems } = useCart();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        {/* Main Navbar Content */}
        <div className="flex justify-between h-16">
          {/* Logo and Hotel Name Section */}
          <div className="flex items-center flex-1">
            <Link to="/" className="flex items-center">
              <img 
                src={logo} 
                alt="Logo" 
                className="h-10 w-10 rounded-full"
              />
              <div className="ml-2 flex flex-col">
                <span className="text-lg sm:text-xl font-bold text-red-600">
                  Pitta's
                </span>
                <span className="text-sm sm:text-base font-semibold text-green-600 -mt-1">
                  Bawarchi
                </span>
              </div>
            </Link>
            
            {/* Location - Hidden on mobile */}
            <div className="hidden md:flex items-center ml-4 bg-gray-50 px-3 py-1 rounded-full">
              <MapPin className="h-4 w-4 text-red-500" />
              <span className="ml-1 text-sm text-gray-600">Madanapalle</span>
            </div>
          </div>

          {/* Desktop Navigation - Hidden on Mobile */}
          <div className="hidden md:flex items-center space-x-4">
            {[
              { to: "/menu", label: "Menu" },
              { to: "/orders", label: "Orders" },
              { to: "/about", label: "About" },
              { to: "/contact", label: "Contact" }
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="relative text-gray-700 hover:text-red-500 px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-300 hover:bg-red-50 group"
              >
                {link.label}
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
              </Link>
            ))}
            
            <Link to="/cart" className="relative text-gray-700 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors duration-300">
              <ShoppingBag size={20} />
              {totalItems > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-md"
                >
                  {totalItems}
                </motion.span>
              )}
            </Link>

            {user ? (
              <div className="relative group">
                <button className="text-gray-700 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors duration-300">
                  <User size={20} />
                </button>
                <div className="absolute right-0 w-48 mt-2 py-2 bg-white rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-red-100">
                  {isAdmin && (
                    <Link to="/admin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-transparent hover:text-red-600 transition-colors duration-200">
                      Admin Dashboard
                    </Link>
                  )}
                  <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-transparent hover:text-red-600 transition-colors duration-200">
                    Profile
                  </Link>
                  <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-transparent hover:text-red-600 transition-colors duration-200">
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/login" className="text-gray-700 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors duration-300">
                <User size={20} />
              </Link>
            )}
          </div>

          {/* Mobile Right Section */}
          <div className="flex items-center space-x-4 md:hidden">
            <Link to="/cart" className="relative">
              <ShoppingBag className="h-6 w-6 text-gray-700" />
              {totalItems > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold"
                >
                  {totalItems}
                </motion.span>
              )}
            </Link>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 top-16 bg-white z-50"
          >
            <div className="p-4 space-y-4">
              {/* Hotel Name and Location for Mobile */}
              <div className="text-center pb-4 border-b border-gray-200">
                <h1 className="text-xl font-bold text-red-600">Pitta's Bawarchi</h1>
                <div className="flex items-center justify-center mt-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 text-red-500" />
                  <span className="ml-1">Madanapalle</span>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="space-y-2">
                {[
                  { to: "/menu", label: "Menu", icon: "🍽️" },
                  { to: "/orders", label: "Orders", icon: "📋" },
                  { to: "/about", label: "About", icon: "ℹ️" },
                  { to: "/contact", label: "Contact", icon: "📞" }
                ].map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center w-full p-3 rounded-lg bg-gray-50 hover:bg-red-50 transition-colors"
                  >
                    <span className="mr-3">{link.icon}</span>
                    <span className="text-gray-700 font-medium">{link.label}</span>
                  </Link>
                ))}
              </div>

              {/* User Section */}
              <div className="pt-4 border-t border-gray-200">
                {user ? (
                  <div className="space-y-2">
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center w-full p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                      >
                        <span className="mr-3">👑</span>
                        <span className="text-red-600 font-medium">Admin Dashboard</span>
                      </Link>
                    )}
                    <Link
                      to="/profile"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center w-full p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <span className="mr-3">👤</span>
                      <span className="text-gray-700 font-medium">Profile</span>
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsOpen(false);
                      }}
                      className="flex items-center w-full p-3 rounded-lg bg-gray-50 hover:bg-red-50 transition-colors"
                    >
                      <span className="mr-3">🚪</span>
                      <span className="text-gray-700 font-medium">Logout</span>
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center w-full p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    <span className="mr-3">🔐</span>
                    <span className="text-red-600 font-medium">Login</span>
                  </Link>
                )}
              </div>

              {/* Cart Link */}
              <Link
                to="/cart"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between w-full p-3 rounded-lg bg-gray-50 hover:bg-red-50 transition-colors"
              >
                <div className="flex items-center">
                  <span className="mr-3">🛒</span>
                  <span className="text-gray-700 font-medium">Cart</span>
                </div>
                {totalItems > 0 && (
                  <span className="bg-red-500 text-white px-2 py-1 rounded-full text-sm">
                    {totalItems}
                  </span>
                )}
              </Link>
            </div>

            {/* Bottom Branding */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-50">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">
                  Pitta's Bawarchi
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Authentic Indian Cuisine
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;