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
    <nav className="bg-gradient-to-r from-white via-red-50 to-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        {/* Main Navbar Content */}
        <div className="flex justify-between h-14 sm:h-16">
          {/* Logo and Location Section */}
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center group">
              <div className="relative">
                <img src={logo} alt="Pitta's Bawarchi Logo" 
                     className="h-8 w-auto sm:h-12 transition-transform duration-300 " />
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-green-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <span className="text-lg sm:text-2xl italic ml-1 sm:ml-2 font-semibold">
                <span className="text-red-600 hover:text-red-700 transition-colors duration-300">Pitta's Bawarchi</span> 
                <span className="text-green-600 hover:text-green-700 transition-colors duration-300 hidden xs:inline"> Bawarchi</span>
              </span>
            </Link>
            <div className="hidden md:flex items-center ml-4 lg:ml-8 bg-white/50 px-3 py-1 rounded-full shadow-sm">
              <MapPin className="text-red-500" size={18} />
              <span className="ml-1 text-gray-700 text-sm font-medium">Madanapalle</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-4">
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

          {/* Mobile Controls */}
          <div className="md:hidden flex items-center space-x-2">
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
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-full text-gray-700 hover:text-red-500 hover:bg-red-50 transition-colors duration-300 focus:outline-none"
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-gradient-to-b from-white to-red-50 border-t border-red-100"
          >
            <div className="px-2 pt-1 pb-2 space-y-1">
              <div className="flex items-center px-3 py-2 text-sm bg-white/50 rounded-full shadow-sm mb-2">
                <MapPin className="text-red-500" size={16} />
                <span className="ml-2 text-gray-700 font-medium">Madanapalle</span>
              </div>
              
              {/* Mobile Navigation Links */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { to: "/menu", label: "Menu" },
                  { to: "/orders", label: "Orders" },
                  { to: "/about", label: "About" },
                  { to: "/contact", label: "Contact" }
                ].map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="text-gray-700 hover:text-red-600 px-4 py-2.5 rounded-xl text-sm font-medium text-center bg-white/70 hover:bg-red-50 transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* User Actions */}
              {user ? (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="text-gray-700 hover:text-red-600 px-4 py-2.5 rounded-xl text-sm font-medium text-center bg-white/70 hover:bg-red-50 transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                      onClick={() => setIsOpen(false)}
                    >
                      Admin
                    </Link>
                  )}
                  <Link
                    to="/profile"
                    className="text-gray-700 hover:text-red-600 px-4 py-2.5 rounded-xl text-sm font-medium text-center bg-white/70 hover:bg-red-50 transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                    onClick={() => setIsOpen(false)}
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsOpen(false);
                    }}
                    className="col-span-2 text-gray-700 hover:text-red-600 px-4 py-2.5 rounded-xl text-sm font-medium text-center bg-white/70 hover:bg-red-50 transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="block text-gray-700 hover:text-red-600 px-4 py-2.5 rounded-xl text-sm font-medium text-center bg-white/70 hover:bg-red-50 transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                  onClick={() => setIsOpen(false)}
                >
                  Login
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;