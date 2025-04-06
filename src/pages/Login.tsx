import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Download, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';

const Login = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [appDownloadUrl, setAppDownloadUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchAppDownloadUrl = async () => {
      try {
        const storage = getStorage();
        const appRef = ref(storage, 'app/app-release.apk');
        const url = await getDownloadURL(appRef);
        setAppDownloadUrl(url);
      } catch (error) {
        console.error('Error fetching app download URL:', error);
        toast.error('Could not fetch app download link');
      }
    };

    fetchAppDownloadUrl();
  }, []);

  const handleAppDownload = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (!appDownloadUrl) {
      toast.error('Download link not available');
      return;
    }

    setIsDownloading(true);
    try {
      const link = document.createElement('a');
      link.href = appDownloadUrl;
      link.download = 'app-release.apk';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download started!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = { email: '', password: '' };

    if (!formData.email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await login(formData.email, formData.password);
    } catch (error: any) {
      let errorMessage = 'Login failed. Please check your credentials.';
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sm:mx-auto sm:w-full sm:max-w-md"
      >
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Welcome back
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-red-500 hover:text-red-600">
            Sign up
          </Link>
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`appearance-none block w-full pl-10 pr-3 py-2 border ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500`}
                  placeholder="Enter your email"
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`appearance-none block w-full pl-10 pr-3 py-2 border ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500`}
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div className="flex flex-col space-y-4">
              <div className="flex items-center">
                <input
                  id="remember_me"
                  name="remember_me"
                  type="checkbox"
                  className="h-4 w-4 text-red-500 focus:ring-red-500 border-gray-300 rounded"
                  disabled={isLoading}
                />
                <label htmlFor="remember_me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="flex items-center space-x-4 text-sm">
                <Link 
                  to="/forgot-password" 
                  className="font-medium text-red-500 hover:text-red-600"
                >
                  Forgot your password?
                </Link>
                <div className="h-4 w-px bg-gray-300" />
                <button
                  onClick={handleAppDownload}
                  disabled={!appDownloadUrl || isDownloading}
                  className={`flex items-center font-medium text-red-500 hover:text-red-600 group transition-all duration-200 ${
                    !appDownloadUrl || isDownloading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <span>{isDownloading ? 'Downloading...' : 'Download App'}</span>
                    {!isDownloading && (
                      <Download className="ml-1 h-4 w-4 group-hover:scale-110 transition-transform" />
                    )}
                    {isDownloading && (
                      <svg 
                        className="ml-1 h-4 w-4 animate-spin" 
                        viewBox="0 0 24 24"
                      >
                        <circle 
                          className="opacity-25" 
                          cx="12" 
                          cy="12" 
                          r="10" 
                          stroke="currentColor" 
                          strokeWidth="4"
                          fill="none"
                        />
                        <path 
                          className="opacity-75" 
                          fill="currentColor" 
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="h-5 w-5 text-red-500" />
                    <span className="text-sm font-medium text-gray-900">
                      Get Our Mobile App
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 w-full text-center text-xs text-gray-500">
                    <div className="p-3 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors">
                      <p className="font-medium text-gray-900">Fast Delivery</p>
                      <p>Track your orders live</p>
                    </div>
                    <div className="p-3 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors">
                      <p className="font-medium text-gray-900">Easy Ordering</p>
                      <p>Order in few taps</p>
                    </div>
                  </div>

                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-center"
                  >
                    <p className="text-xs text-gray-500">
                      Download our app for the best experience
                    </p>
                    <p className="text-xs text-red-500 mt-1">
                      ✨ Exclusive app-only offers ✨
                    </p>
                  </motion.div>
                </div>
              </div>

            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent rounded-lg text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                  isLoading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                <span className="absolute right-3 inset-y-0 flex items-center">
                  <ArrowRight className={`h-5 w-5 ${isLoading ? '' : 'group-hover:translate-x-1 transition-transform'}`} />
                </span>
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;