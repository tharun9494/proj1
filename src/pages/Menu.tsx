import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Search, Filter, Star } from 'lucide-react';
import toast from 'react-hot-toast';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  image: string;
}

const Menu = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const menuSnapshot = await getDocs(collection(db, 'menuItems'));
      const uniqueItems = new Map();
      
      menuSnapshot.docs.forEach(doc => {
        const item = { id: doc.id, ...doc.data() } as MenuItem;
        const lowerCaseName = item.name.toLowerCase();
        
        if (!uniqueItems.has(lowerCaseName) || 
            (item.createdAt && uniqueItems.get(lowerCaseName).createdAt && 
             item.createdAt > uniqueItems.get(lowerCaseName).createdAt)) {
          uniqueItems.set(lowerCaseName, item);
        }
      });

      const items = Array.from(uniqueItems.values());
      const uniqueCategories = Array.from(new Set(items.map(item => item.category)));
      setCategories(uniqueCategories);
      setMenuItems(items);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      toast.error('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4"
          >
            Our Menu
          </motion.h1>
          <p className="text-base sm:text-lg text-gray-600">Discover our delicious offerings</p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 appearance-none bg-white w-full sm:w-auto"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Menu Items Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <Link to={`/menu/${item.id}`} className="block">
                  <div className="relative h-48 sm:h-56">
                    <img
                      src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 right-4 bg-white px-2 py-1 rounded-full text-sm font-semibold text-gray-900">
                      ₹{item.price}
                    </div>
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 group-hover:text-red-500 transition-colors">
                        {item.name}
                      </h3>
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-sm sm:text-base text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Star className="h-5 w-5 text-yellow-400 fill-current" />
                        <span className="ml-1 text-sm text-gray-600">4.5 (24 reviews)</span>
                      </div>
                      <button className="text-red-500 text-sm font-medium hover:text-red-600 transition-colors">
                        View Details
                      </button>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No menu items found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Menu;