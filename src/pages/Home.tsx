import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Star, Clock, MapPin, Search, ArrowRight, Award, Users, ThumbsUp, XCircle } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  image: string;
  isAvailable?: boolean;
  orderCount?: number;
}

interface RestaurantStatus {
  isOpen: boolean;
  lastUpdated: any;
}

const Home = () => {
  const [location] = useState('Madanapalle, Andhra Pradesh');
  const [popularItems, setPopularItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantStatus, setRestaurantStatus] = useState<RestaurantStatus>({ isOpen: false, lastUpdated: null });
  
  useEffect(() => {
    fetchRestaurantStatus();
    fetchPopularItems();
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

  const fetchPopularItems = async () => {
    try {
      const menuRef = collection(db, 'menuItems');
      const q = query(menuRef, orderBy('orderCount', 'desc'), limit(6));
      const snapshot = await getDocs(q);
      const items = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as MenuItem))
        .filter(item => item.isAvailable !== false);
      setPopularItems(items);
    } catch (error) {
      console.error('Error fetching popular items:', error);
      toast.error('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const featuredCategories = [
    {
      id: 1,
      title: "Signature Biryanis",
      description: "Our most loved biryanis",
      image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=800"
    },
    {
      id: 2,
      title: "Andhra Specials",
      description: "Authentic Andhra cuisine",
      image: "https://www.chefkunalkapur.com/wp-content/uploads/2021/03/Gosht-Biryani-1300x868.jpeg?v=1625193165"
    },
    {
      id: 3,
      title: "Tandoor Selection",
      description: "Fresh from the tandoor",
      image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=800"
    }
  ];

  const achievements = [
    {
      icon: Award,
      title: "14+ Years Experience",
      description: "Mastering authentic Andhra cuisine"
    },
    {
      icon: Users,
      title: "50,000+ Happy Customers",
      description: "Serving with love and dedication"
    },
    {
      icon: ThumbsUp,
      title: "4.8/5 Rating",
      description: "Consistently high customer satisfaction"
    }
  ];

  // Updated hero images with reliable URLs
  const heroImages = [
    {
      url: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=1920",
      title: "Signature Biryani"
    },
    {
      url: "https://media-cdn2.greatbritishchefs.com/media/x3ykkboh/img16453.whqc_768x512q80fpt472fpl481.jpg",
      title: "Spicy Andhra Chicken"
    },
    {
      url: "https://bfoodale.com/uploads/2021/12/Mutton-Biryani.jpg",
      title: "Mutton Special"
    },
    {
      url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1920",
      title: "Tandoori Platter"
    },
    {
      url: "https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=1920",
      title: "Veg Starters"
    }
  ];

  // Temporary fallback image
  const fallbackImage = "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=1920";

  // Add state for current image
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageLoadError, setImageLoadError] = useState(false);

  // Add automatic image swap effect
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === heroImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Hero Section with Image Carousel */}
      <section className="relative h-[60vh] md:h-[70vh]">
        {/* Background Image Carousel */}
        <div className="absolute inset-0 bg-black">
          <img
            src={imageLoadError ? fallbackImage : heroImages[currentImageIndex].url}
            alt={heroImages[currentImageIndex].title}
            className="w-full h-full object-cover opacity-80"
            onError={() => setImageLoadError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 to-black/50" />
        </div>
        {/* Navigation Dots */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-3 z-20">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentImageIndex === index 
                  ? 'w-8 bg-red-500' 
                  : 'w-2 bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Show image ${index + 1}`}
            />
          ))}
        </div>
        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 h-full flex items-center z-10">
          <div className="w-full max-w-2xl">
            <motion.h1 
              key={currentImageIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl sm:text-4xl md:text-6xl font-bold text-white leading-tight"
            >
              {heroImages[currentImageIndex].title}
            </motion.h1>
            <motion.p
              key={`desc-${currentImageIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-base sm:text-lg md:text-xl text-gray-200 mt-2"
            >
              Authentic Andhra Cuisine in Madanapalle
            </motion.p>
            {/* Restaurant Status Banner */}
            {!restaurantStatus.isOpen && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 max-w-xl">
                <div className="flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-500 mr-2" />
                  <p className="text-red-600">
                    Restaurant is currently closed. Timing: 11:00 AM - 10:00 PM
                  </p>
                </div>
              </div>
            )}
            <div className="mt-8 flex flex-col sm:flex-row gap-3 md:gap-4">
              <Link
                to="/menu"
                className="inline-flex items-center justify-center px-4 py-2 md:px-6 md:py-3 border border-transparent text-sm md:text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors duration-300"
              >
                Explore Menu
                <ChevronRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-6 md:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-4 md:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Our Specialties</h2>
            <p className="mt-1 md:mt-4 text-sm md:text-lg text-gray-600">Discover our most loved dishes and categories</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-8">
            {featuredCategories.map((category) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative rounded-lg md:rounded-xl overflow-hidden group cursor-pointer"
              >
                <div className="aspect-w-4 aspect-h-3">
                  <img
                    src={category.image}
                    alt={category.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-70" />
                  <div className="absolute bottom-0 left-0 p-2 sm:p-4 md:p-6 text-white">
                    <h3 className="text-sm sm:text-lg md:text-2xl font-bold mb-0.5 md:mb-2">{category.title}</h3>
                    <p className="text-xs sm:text-sm md:text-base text-gray-200">{category.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Items */}
      {restaurantStatus.isOpen ? (
        <section className="py-8 md:py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-12">
              <div className="mb-3 sm:mb-0">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Most Popular</h2>
                <p className="mt-1 sm:mt-2 text-sm sm:text-base md:text-lg text-gray-600">Our customers' favorite dishes</p>
              </div>
              <Link
                to="/menu"
                className="inline-flex items-center text-sm md:text-base text-red-600 hover:text-red-700 font-medium"
              >
                View Full Menu <ArrowRight className="ml-1 h-4 w-4 md:h-5 md:w-5" />
              </Link>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-b-2 border-red-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8">
                {popularItems.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="bg-white rounded-lg md:rounded-xl shadow-sm md:shadow-lg overflow-hidden hover:shadow-md md:hover:shadow-xl transition-shadow"
                  >
                    <Link to={`/menu/${item.id}`}>
                      <div className="relative h-28 sm:h-40 md:h-56">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-1 right-1 md:top-4 md:right-4 bg-white px-1.5 py-0.5 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-semibold text-gray-900">
                          ₹{item.price}
                        </div>
                      </div>
                      <div className="p-2 sm:p-3">
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-0.5 sm:mb-1">{item.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-500 line-clamp-2">{item.description}</p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="py-8 md:py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <div className="bg-red-50 p-6 rounded-lg max-w-md mx-auto">
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-red-600 mb-2">Restaurant is Currently Closed</h2>
                <p className="text-gray-600">Please check back later when we are open. Timing: 11:00 AM - 10:00 PM</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Achievements Section */}
      <section className="py-8 md:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {achievements.map((achievement, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="bg-white rounded-lg p-6 text-center shadow-sm hover:shadow-md transition-shadow"
              >
                <achievement.icon className="h-8 w-8 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{achievement.title}</h3>
                <p className="text-gray-600">{achievement.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;