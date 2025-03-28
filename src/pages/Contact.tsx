import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';
import Map from '../components/Map';
import toast from 'react-hot-toast';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate the form data before submission
      if (!formData.name || !formData.email || !formData.subject || !formData.message) {
        throw new Error('Please fill all required fields');
      }

      // Store the message in Firebase
      const docRef = await addDoc(collection(db, 'messages'), {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || '',
        subject: formData.subject,
        message: formData.message,
        status: 'unread',
        createdAt: serverTimestamp()
      });
      
      console.log("Document written with ID: ", docRef.id);
      toast.success('Message sent successfully!');
      
      // Reset the form
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 md:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header - Compact for mobile */}
        <div className="text-center mb-8 md:mb-16">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-4xl font-bold text-gray-900 mb-2 md:mb-4"
          >
            Contact Us
          </motion.h1>
          <p className="text-sm md:text-lg text-gray-600 max-w-3xl mx-auto px-2">
            Have questions or feedback? We'd love to hear from you.
          </p>
        </div>

        {/* Contact Information Cards - Horizontal scroll for mobile */}
        <div className="mb-8 md:mb-0">
          <div className="flex overflow-x-auto pb-4 md:hidden hide-scrollbar">
            <div className="flex-shrink-0 w-[280px] mx-2 first:ml-4 last:mr-4 bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center">
                <MapPin className="h-5 w-5 text-red-500" />
                <div className="ml-3">
                  <h3 className="text-sm font-semibold text-gray-900">Location</h3>
                  <p className="text-xs text-gray-600">NTR Circle, Madanapalle</p>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 w-[280px] mx-2 bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-red-500" />
                <div className="ml-3">
                  <h3 className="text-sm font-semibold text-gray-900">Phone</h3>
                  <p className="text-xs text-gray-600">+91 95154 88888</p>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 w-[280px] mx-2 bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-red-500" />
                <div className="ml-3">
                  <h3 className="text-sm font-semibold text-gray-900">Email</h3>
                  <p className="text-xs text-gray-600">pittasbawarchi@gmail.com</p>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 w-[280px] mx-2 last:mr-4 bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-red-500" />
                <div className="ml-3">
                  <h3 className="text-sm font-semibold text-gray-900">Hours</h3>
                  <p className="text-xs text-gray-600">11:00 AM - 10:00 PM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Contact Info */}
          <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Get in Touch</h2>
              <div className="space-y-6">
                <div className="flex items-start">
                  <MapPin className="h-6 w-6 text-red-500 mt-1" />
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">Location</h3>
                    <p className="text-gray-600">
                     NTR Circle<br />
                      Madanapalle, Andhra Pradesh<br />
                      India - 517325
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Phone className="h-6 w-6 text-red-500 mt-1" />
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">Phone</h3>
                    <p className="text-gray-600">
                    +91 95154 88888<br />
                      
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Mail className="h-6 w-6 text-red-500 mt-1" />
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">Email</h3>
                    <p className="text-gray-600">
                      
                    pittasbawarchi@gmail.com

                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Clock className="h-6 w-6 text-red-500 mt-1" />
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">Business Hours</h3>
                    <p className="text-gray-600">
                      Monday - Sunday: 11:00 AM - 10:00 PM
                    </p>
                  </div>
                </div>
              </div>

              {/* Map */}
              <div className="mt-8 h-64 rounded-lg overflow-hidden">
                <Map />
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form - Simplified for mobile */}
        <div className="bg-white rounded-lg shadow-md md:shadow-lg p-4 md:p-8">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-8">Send us a Message</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-sm md:text-base"
                placeholder="Enter your name"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-sm md:text-base"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-sm md:text-base"
                  placeholder="Your phone number"
                />
              </div>
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-sm md:text-base"
                placeholder="What's this about?"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={3}
                value={formData.message}
                onChange={handleChange}
                required
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-sm md:text-base"
                placeholder="Your message here..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center px-4 py-2.5 md:py-3 border border-transparent rounded-md shadow-sm text-sm md:text-base font-medium text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {loading ? (
                'Sending...'
              ) : (
                <>
                  Send Message
                  <Send className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Map - Adjusted height for mobile */}
        <div className="mt-6 md:mt-8 h-48 md:h-64 rounded-lg overflow-hidden shadow-md">
          <Map />
        </div>
      </div>
    </div>
  );
};

export default Contact;