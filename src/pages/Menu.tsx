import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Search, Filter, Star, XCircle, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  image: string;
  isAvailable?: boolean;
  createdAt?: any;
  isVeg: boolean;
}
  
interface RestaurantStatus {
  isOpen: boolean;
  lastUpdated: any;
}

interface OfferItem extends MenuItem {
  offerType: 'discount' | 'buy_one_get_one';
  discountPercentage?: number;
  originalPrice: number;
  offerPrice: number;
  validUntil: Date;
}

const Menu = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [offerItems, setOfferItems] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [offersLoading, setOffersLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [restaurantStatus, setRestaurantStatus] = useState<RestaurantStatus>({ isOpen: false, lastUpdated: null });

  useEffect(() => {
    fetchRestaurantStatus();
    fetchMenuItems();
    fetchOffers();
  }, []);

  const fetchRestaurantStatus = async () => {
    try {
      const statusDoc = await getDoc(doc(db, 'restaurant', 'status'));
      if (statusDoc.exists()) {
        setRestaurantStatus(statusDoc.data() as RestaurantStatus);
      }
    } catch (error) {
      console.error('Error fetching restaurant status:', error);
    }
  };

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
      // Sort categories in a specific order
      const categoryOrder = ['Biryani', 'Starters', 'Soups', 'Main Course', 'Desserts', 'Beverages'];
      const sortedCategories = uniqueCategories.sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
      setCategories(sortedCategories);
      setMenuItems(items);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      toast.error('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const fetchOffers = async () => {
    try {
      setOffersLoading(true);
      const now = new Date();
      
      const offersQuery = query(
        collection(db, 'offers'),
        where('isActive', '==', true)
      );

      const offersSnapshot = await getDocs(offersQuery);
      const offersList = offersSnapshot.docs.map(doc => {
        const data = doc.data();
        const validUntil = data.validUntil ? data.validUntil.toDate() : new Date();
        
        if (validUntil > now) {
          return {
            id: doc.id,
            title: data.title || 'Special Offer',
            description: data.description || '',
            type: data.type || 'discount',
            discountPercentage: data.discountPercentage || 0,
            offerPrice: data.offerPrice || 0,
            isActive: data.isActive || false,
            image: data.image || '',
            validUntil: validUntil
          };
        }
        return null;
      }).filter(offer => offer !== null);

      // Fetch menu items for each offer
      const offerItemsList: OfferItem[] = [];
      for (const offer of offersList) {
        const menuItemsQuery = query(
          collection(db, 'menuItems'),
          where('isAvailable', '==', true)
        );
        const menuSnapshot = await getDocs(menuItemsQuery);
        
        menuSnapshot.docs.forEach(doc => {
          const menuItem = { id: doc.id, ...doc.data() } as MenuItem;
          const offerPrice = offer.type === 'discount' 
            ? menuItem.price * (1 - offer.discountPercentage / 100)
            : menuItem.price;
            
          offerItemsList.push({
            ...menuItem,
            offerType: offer.type,
            discountPercentage: offer.discountPercentage,
            originalPrice: menuItem.price,
            offerPrice: Math.round(offerPrice),
            validUntil: offer.validUntil
          });
        });
      }
      
      setOfferItems(offerItemsList);
    } catch (error) {
      console.error('Error fetching offers:', error);
      toast.error('Failed to load offers. Please try again later.');
      setOfferItems([]);
    } finally {
      setOffersLoading(false);
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group items by category
  const groupedItems = categories.reduce((acc, category) => {
    const categoryItems = filteredItems.filter(item => item.category === category);
    if (categoryItems.length > 0) {
      acc[category] = categoryItems;
    }
    return acc;
  }, {} as Record<string, MenuItem[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (!restaurantStatus) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Restaurant Status Banner */}
        {!restaurantStatus.isOpen && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-600">
                Restaurant is currently closed. Timing: 11:00 AM - 10:00 PM
              </p>
            </div>
          </div>
        )}

        {/* Special Offers Section */}
        {restaurantStatus.isOpen && !offersLoading && offerItems.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Tag className="h-6 w-6 text-red-500 mr-2" />
              Special Offers
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-8">
              {offerItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden relative"
                >
                  <Link to={`/menu/${item.id}`} className="block">
                    <div className="relative h-32 sm:h-40 md:h-48">
                      <img
                        src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      {/* Offer Badge */}
                      <div className="absolute top-1 right-1 sm:top-2 sm:right-2 md:top-4 md:right-4 flex flex-col items-end gap-1">
                        <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs md:text-sm font-semibold">
                          {item.offerType === 'discount' 
                            ? `${item.discountPercentage}% OFF` 
                            : 'Buy 1 Get 1'
                          }
                        </div>
                        <div className="bg-white px-2 py-1 rounded-full text-xs md:text-sm font-semibold flex items-center gap-1">
                          <span className="text-gray-500 line-through">₹{item.originalPrice}</span>
                          <span className="text-red-500">₹{item.offerPrice}</span>
                        </div>
                      </div>
                      {/* Veg/Non-Veg Badge */}
                      <div className="absolute top-1 left-1 sm:top-2 sm:left-2 md:top-4 md:left-4">
                        <span className={`${
                          item.isVeg ? 'bg-green-500' : 'bg-red-500'
                        } text-white px-1.5 py-0.5 rounded-full text-xs`}>
                          {item.isVeg ? 'Veg' : 'Non-Veg'}
                        </span>
                      </div>
                    </div>
                    <div className="p-2 sm:p-3">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-0.5 sm:mb-1">
                        {item.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500 line-clamp-2">
                        {item.description}
                      </p>
                      {/* Offer Validity */}
                      <p className="text-xs text-red-500 mt-1">
                        Valid until: {item.validUntil.toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-3 sm:mb-4 md:mb-12">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl sm:text-2xl md:text-4xl font-bold text-gray-900 mb-1 sm:mb-2 md:mb-4"
          >
            Our Menu
          </motion.h1>
          <p className="text-xs sm:text-sm md:text-lg text-gray-600">Discover our delicious offerings</p>
        </div>

        {!restaurantStatus.isOpen ? (
          <div className="text-center py-12">
            <div className="bg-red-50 p-6 rounded-lg max-w-md mx-auto">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-red-600 mb-2">Restaurant is Currently Closed</h2>
              <p className="text-gray-600">Please check back later when we are open. timing 11am to 10pm evary day</p>
            </div>
          </div>
        ) : (
          <>
            {/* Search and Filters */}
            <div className="mb-3 sm:mb-4 md:mb-8 space-y-3 sm:space-y-4">
              {/* Search Bar */}
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

              {/* Category Filters */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`px-3 py-1.5 rounded-full text-xs md:text-sm font-medium ${
                    selectedCategory === ''
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1.5 rounded-full text-xs md:text-sm font-medium ${
                      selectedCategory === category
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Menu Items by Category */}
            {loading ? (
              <div className="flex justify-center items-center h-32 sm:h-48">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 md:h-12 md:w-12 border-b-2 border-red-500"></div>
              </div>
            ) : (
              <div className="space-y-8 sm:space-y-12">
                {Object.entries(groupedItems).map(([category, items]) => (
                  <div key={category} className="space-y-3 sm:space-y-4">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 border-b-2 border-red-500 pb-1 sm:pb-2">
                      {category}
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-8">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className={`bg-white rounded-lg shadow-md overflow-hidden relative ${
                            !item.isAvailable ? 'opacity-60' : ''
                          }`}
                        >
                          {/* Unavailable Overlay */}
                          {!item.isAvailable && (
                            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center z-10">
                              <span className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                                Currently Unavailable
                              </span>
                            </div>
                          )}

                          <Link to={`/menu/${item.id}`} className="block">
                            <div className="relative h-32 sm:h-40 md:h-48">
                              <img
                                src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-1 right-1 sm:top-2 sm:right-2 md:top-4 md:right-4 bg-white px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-xs md:text-sm font-semibold text-gray-900">
                                ₹{item.price}
                              </div>
                              {/* Veg/Non-Veg Badge */}
                              <div className="absolute top-1 left-1 sm:top-2 sm:left-2 md:top-4 md:left-4">
                                <span className={`${
                                  item.isVeg ? 'bg-green-500' : 'bg-red-500'
                                } text-white px-1.5 py-0.5 rounded-full text-xs`}>
                                  {item.isVeg ? 'Veg' : 'Non-Veg'}
                                </span>
                              </div>
                            </div>
                            <div className="p-2 sm:p-3">
                              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-0.5 sm:mb-1">{item.name}</h3>
                              <p className="text-xs sm:text-sm text-gray-500 line-clamp-2">{item.description}</p>
                            </div>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No Results */}
            {!loading && filteredItems.length === 0 && (
              <div className="text-center py-8 sm:py-12">
                <p className="text-gray-600 text-base sm:text-lg">No menu items found</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Menu;