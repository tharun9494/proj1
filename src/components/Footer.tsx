import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
import logo from './images/logo.png'

const Footer = () => {
  return (
    // Hidden on mobile (< 640px), visible on sm and above (tablet/desktop)
    <footer className="hidden sm:block bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Pitta's Bawarchi</h3>
            <p className="text-base text-gray-400">
              Experience authentic Indian cuisine at its finest. Our traditional recipes and warm hospitality make every meal special.
            </p>
            <img src={logo} alt="Pitta's Bawarchi Logo" className="h-20 w-auto" />
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-base">
              <li>
                <Link to="/about" className="text-gray-400 hover:text-white">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-400 hover:text-white">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-gray-400 hover:text-white">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray-400 hover:text-white">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Info</h4>
            <ul className="space-y-2 text-base text-gray-400">
              <li>Email: pittasbawarchi@gmail.com</li>
              <li>Phone: +91 95154 88888</li>
              <li>Address: NTR circle Madanapalle</li>
              <li>Hours: Mon-Sun 11:00 AM - 10:00 PM</li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Follow Us</h4>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Facebook className="w-8 h-8" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Twitter className="w-8 h-8" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Instagram className="w-8 h-8" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Youtube className="w-8 h-8" />
              </a>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-800 text-center">
          <p className="text-base text-gray-400">&copy; {new Date().getFullYear()} Pitta's Bawarchi. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;