import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Star, Clock, MapPin, Search, ArrowRight, Award, Users, ThumbsUp } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  image: string;
}

const Home = () => {
  const [location] = useState('Madanapalle, Andhra Pradesh');
  const [popularItems, setPopularItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchPopularItems();
  }, []);

  const fetchPopularItems = async () => {
    try {
      const menuRef = collection(db, 'menuItems');
      const q = query(menuRef, orderBy('createdAt'), limit(6));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MenuItem[];
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
      image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800"
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

  return (
    <div className="min-h-screen">
      {/* Hero Section - Improved mobile responsiveness */}
      <section className="relative h-[60vh] md:h-[70vh] bg-gradient-to-b from-black to-transparent">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=1920"
            alt="Pitta's Bawarchi Signature Biryani"
            className="w-full h-full object-cover opacity-60"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 h-full flex items-center">
          <div className="w-full max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 md:space-y-6"
            >
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-white leading-tight">
                Experience the Authentic Taste of Andhra
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-gray-200">
                Discover our signature biryanis and traditional delicacies
              </p>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <Link
                  to="/menu"
                  className="inline-flex items-center justify-center px-4 py-2 md:px-6 md:py-3 border border-transparent text-sm md:text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                >
                  View Menu
                  <ChevronRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Categories - Better mobile spacing */}
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

      {/* Popular Items - 2 columns on mobile */}
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
                    <div className="p-2 sm:p-3 md:p-6">
                      <div className="flex justify-between items-start mb-1 md:mb-2">
                        <h3 className="text-sm sm:text-base md:text-xl font-semibold text-gray-900 line-clamp-1">{item.name}</h3>
                        <div className="flex items-center">
                          <Star className="h-3 w-3 md:h-5 md:w-5 text-yellow-400 fill-current" />
                          <span className="ml-0.5 text-xs md:text-sm text-gray-600">4.5</span>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2 md:mb-4 line-clamp-1 sm:line-clamp-2">{item.description}</p>
                      <div className="flex items-center text-xs md:text-sm text-gray-500">
                        <Clock className="h-2.5 w-2.5 md:h-4 md:w-4 mr-1" />
                        <span>30-40 min</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* About the Owner Section - Better stacking on mobile */}
      <section className="py-10 md:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:flex lg:items-center lg:gap-12">
            <div className="lg:w-1/2">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative"
              >
                <img
                  src="https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=800"
                  alt="Chef Pitta Ramesh"
                  className="rounded-lg shadow-xl w-full"
                />
                <div className="absolute -bottom-4 -right-4 md:-bottom-6 md:-right-6 bg-red-500 text-white py-2 px-4 md:py-4 md:px-8 rounded-lg shadow-lg">
                  <p className="text-xl md:text-2xl font-bold">14+</p>
                  <p className="text-xs md:text-sm">Years of Excellence</p>
                </div>
              </motion.div>
            </div>
            <div className="lg:w-1/2 mt-10 lg:mt-0">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                <h2 className="text-3xl font-bold text-gray-900">Meet Chef Pitta Ramesh</h2>
                <p className="text-lg text-gray-600">
                  With over two decades of culinary expertise, Chef Pitta Ramesh has been the driving force behind Pitta's Bawarchi's success. His passion for authentic Andhra cuisine and commitment to quality has made our restaurant a landmark destination for food lovers.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {achievements.map((achievement, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.2 }}
                      className="text-center"
                    >
                      <achievement.icon className="h-8 w-8 mx-auto text-red-500 mb-2" />
                      <h3 className="font-semibold text-gray-900">{achievement.title}</h3>
                      <p className="text-sm text-gray-600">{achievement.description}</p>
                    </motion.div>
                  ))}
                </div>
                <p className="text-gray-600 italic">
                  "My goal has always been to bring the authentic flavors of Andhra Pradesh to every plate, ensuring that each dish tells a story of tradition and taste."
                </p>
                <div className="pt-4">
                  <Link
                    to="/about"
                    className="inline-flex items-center text-red-600 hover:text-red-700 font-medium"
                  >
                    Learn More About Us <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action - Improved mobile padding */}
      <section className="py-10 md:py-16 bg-red-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 md:mb-4">
              Ready to Experience Our Flavors?
            </h2>
            <p className="text-base md:text-lg text-red-100 mb-6 md:mb-8">
              Order now and get your favorite dishes delivered to your doorstep
            </p>
            <Link
              to="/menu"
              className="inline-flex items-center justify-center px-6 py-2 md:px-8 md:py-3 border border-transparent text-sm md:text-base font-medium rounded-md text-red-600 bg-white hover:bg-red-50"
            >
              Order Now
              <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;