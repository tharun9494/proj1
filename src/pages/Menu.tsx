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
        <div className="text-center mb-4 md:mb-12">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 md:mb-4"
          >
            Our Menu
          </motion.h1>
          <p className="text-sm md:text-lg text-gray-600">Discover our delicious offerings</p>
        </div>

        {/* Search and Filter - Horizontal layout */}
        <div className="mb-4 md:mb-8">
          <div className="flex flex-row gap-2 md:gap-4">
            {/* Search Bar - Takes 2/3 width on mobile */}
            <div className="flex-[2] relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-xs md:text-base border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
              />
            </div>

            {/* Category Filter - Takes 1/3 width on mobile */}
            <div className="flex-1 relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-2 pr-6 py-1.5 text-xs md:text-base border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 appearance-none bg-white"
              >
                <option value="">Category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3 md:h-4 md:w-4 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Menu Items Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-b-2 border-red-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8">
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg md:rounded-xl shadow-sm md:shadow-md overflow-hidden hover:shadow-md md:hover:shadow-lg transition-shadow"
              >
                <Link to={`/menu/${item.id}`} className="block">
                  <div className="relative h-28 sm:h-40 md:h-48">
                    <img
                      src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 right-1 md:top-4 md:right-4 bg-white px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-xs md:text-sm font-semibold text-gray-900">
                      ₹{item.price}
                    </div>
                  </div>
                  <div className="p-2 sm:p-3 md:p-6">
                    <div className="flex flex-col gap-1 md:gap-2 mb-1 md:mb-2">
                      <h3 className="text-sm sm:text-base md:text-xl font-semibold text-gray-900 line-clamp-1">
                        {item.name}
                      </h3>
                      <span className="inline-block px-1.5 py-0.5 bg-red-50 text-red-700 text-[10px] md:text-xs font-medium rounded-full">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-xs md:text-sm text-gray-600 mb-1 md:mb-4 line-clamp-1 md:line-clamp-2">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Star className="h-3 w-3 md:h-5 md:w-5 text-yellow-400 fill-current" />
                        <span className="ml-0.5 text-[10px] md:text-sm text-gray-600">4.5</span>
                      </div>
                      <span className="text-xs md:text-sm text-red-500 font-medium">
                        View Details
                      </span>
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