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
    <div className="min-h-screen bg-gray-50 py-6 md:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section - Compact for mobile */}
        <div className="text-center mb-8 md:mb-16">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-4xl font-bold text-gray-900 mb-2 md:mb-4"
          >
            About Pitta's Bawarchi
          </motion.h1>
          <p className="text-sm md:text-lg text-gray-600 max-w-3xl mx-auto px-2">
            Discover the story behind Madanapalle's favorite destination for authentic Andhra cuisine
          </p>
        </div>

        {/* Our Story - Better mobile layout */}
        <div className="bg-white rounded-lg shadow-md md:shadow-lg overflow-hidden mb-8 md:mb-16">
          <div className="flex flex-col md:flex-row">
            <div className="w-full md:w-1/2 h-48 md:h-auto">
              <img
                src="https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=800"
                alt="Restaurant Interior"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="w-full md:w-1/2 p-4 md:p-8 lg:p-12">
              <h2 className="text-xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-6">Our Story</h2>
              <div className="space-y-2 md:space-y-4 text-sm md:text-base text-gray-600">
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

        {/* Achievements - Horizontal scroll for mobile */}
        <div className="mb-8 md:mb-16">
          <div className="flex overflow-x-auto pb-4 md:grid md:grid-cols-3 md:gap-8 hide-scrollbar">
            {achievements.map((achievement, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="flex-shrink-0 w-[280px] mx-2 first:ml-4 last:mr-4 md:w-auto md:mx-0 bg-white rounded-lg shadow-md p-4 md:p-8"
              >
                <div className="flex items-center">
                  <achievement.icon className="h-8 w-8 text-red-500 mr-3" />
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-gray-900">{achievement.title}</h3>
                    <p className="text-sm text-gray-600">{achievement.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Our Values - Horizontal scroll for mobile */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-8 mb-8 md:mb-16">
          <h2 className="text-xl md:text-3xl font-bold text-gray-900 mb-4 px-4">Our Values</h2>
          <div className="flex overflow-x-auto pb-4 md:grid md:grid-cols-3 md:gap-8 hide-scrollbar">
            {[
              {
                title: "Quality",
                description: "We use only the finest ingredients and maintain strict quality standards."
              },
              {
                title: "Authenticity",
                description: "Every dish follows traditional Andhra recipes and cooking methods."
              },
              {
                title: "Customer Service",
                description: "Creating memorable dining experiences through exceptional service."
              }
            ].map((value, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-[280px] mx-2 first:ml-4 last:mr-4 md:w-auto md:mx-0 bg-red-50 rounded-lg p-4"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-sm text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Location and Hours - Side by side cards for mobile */}
        <div className="px-4 mb-8">
          <h2 className="text-xl md:text-3xl font-bold text-gray-900 mb-4">Visit Us</h2>
          <div className="flex overflow-x-auto pb-4 md:grid md:grid-cols-2 md:gap-8 hide-scrollbar">
            <div className="flex-shrink-0 w-[280px] mx-2 first:ml-0 last:mr-4 md:w-auto md:mx-0 bg-white rounded-lg shadow-md p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Location</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-red-500 mr-2" />
                  <span className="text-sm">NTR circle, Madanapalle</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-red-500 mr-2" />
                  <span className="text-sm">+91 95154 88888</span>
                </div>
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-red-500 mr-2" />
                  <span className="text-sm break-all">pittasbawarchi2x@gmail.com</span>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 w-[280px] mx-2 last:mr-0 md:w-auto md:mx-0 bg-white rounded-lg shadow-md p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Hours</h3>
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-sm">
                  Monday - Sunday: 11:00 AM - 10:00 PM
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;