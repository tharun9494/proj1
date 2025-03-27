import React from 'react';
import { motion } from 'framer-motion';
import { Award, Users, ThumbsUp, MapPin, Phone, Mail, Clock } from 'lucide-react';

const About = () => {
  const achievements = [
    {
      icon: Award,
      title: "14+ Years Experience",
      description: "Mastering authentic Andhra cuisine since 2011"
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
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-gray-900 mb-4"
          >
            About Pitta's Bawarchi
          </motion.h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Discover the story behind Madanapalle's favorite destination for authentic Andhra cuisine
          </p>
        </div>

        {/* Our Story */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-16">
          <div className="md:flex">
            <div className="md:w-1/2">
              <img
                src="https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=800"
                alt="Restaurant Interior"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="md:w-1/2 p-8 md:p-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
              <div className="space-y-4 text-gray-600">
                <p>
                  Founded in 2011 by Chef Pitta Ramesh, Pitta's Bawarchi began as a small family-run establishment with a big dream: to bring the authentic flavors of Andhra Pradesh to every food lover's plate.
                </p>
                <p>
                  What started as a modest eatery has grown into one of Madanapalle's most beloved restaurants, serving thousands of satisfied customers with our signature biryanis and traditional delicacies.
                </p>
                <p>
                  Our commitment to quality, authenticity, and customer satisfaction has remained unchanged over the years, making us a trusted name in Andhra cuisine.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {achievements.map((achievement, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="bg-white rounded-lg shadow-lg p-8 text-center"
            >
              <achievement.icon className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{achievement.title}</h3>
              <p className="text-gray-600">{achievement.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Our Values */}
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Quality</h3>
              <p className="text-gray-600">
                We use only the finest ingredients and maintain strict quality standards in our kitchen.
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Authenticity</h3>
              <p className="text-gray-600">
                Every dish is prepared following traditional Andhra recipes and cooking methods.
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Customer Service</h3>
              <p className="text-gray-600">
                We believe in creating memorable dining experiences through exceptional service.
              </p>
            </div>
          </div>
        </div>

        {/* Location and Hours */}
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Visit Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Location</h3>
              <div className="space-y-2 text-gray-600">
                <p className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-red-500" />
                 NTR circle, Madanapalle
                </p>
                <p className="flex items-center">
                  <Phone className="h-5 w-5 mr-2 text-red-500" />
                  +91 95154 88888
                </p>
                <p className="flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-red-500" />
                  pittasbawarchi@gmail.com
                </p>
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Hours</h3>
              <div className="space-y-2 text-gray-600">
                <p className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-red-500" />
                  Monday - Sunday: 11:00 AM - 10:00 PM
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;