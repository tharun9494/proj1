import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Upload, Save, Edit2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserData, updateUserProfile, uploadProfilePhoto, UserData } from '../services/userService';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<Partial<UserData>>({
    name: '',
    phone: '',
    alternativePhone: '',
    photoURL: '',
    address: {
      street: '',
      city: '',
      pincode: '',
      landmark: ''
    }
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.id) {
        try {
          const userData = await getUserData(user.id);
          if (userData) {
            // Ensure address object exists
            setProfileData({
              ...userData,
              address: {
                street: '',
                city: '',
                pincode: '',
                landmark: '',
                ...userData.address
              }
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          toast.error('Failed to load profile data');
        }
      }
    };
    fetchUserData();
  }, [user]);

  if (!user) {
    return <Navigate to="/login" />;
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const photoURL = await uploadProfilePhoto(user.id, file);
      await updateUserProfile(user.id, { photoURL });
      setProfileData(prev => ({ ...prev, photoURL }));
      toast.success('Profile photo updated successfully');
    } catch (error) {
      toast.error('Failed to upload profile photo');
      console.error('Photo upload error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      setLoading(true);
      // Ensure we're not sending undefined values
      const updateData = {
        name: profileData.name || '',
        phone: profileData.phone || '',
        alternativePhone: profileData.alternativePhone || '',
        photoURL: profileData.photoURL || '',
        address: {
          street: profileData.address?.street || '',
          city: profileData.address?.city || '',
          pincode: profileData.address?.pincode || '',
          landmark: profileData.address?.landmark || ''
        }
      };

      await updateUserProfile(user.id, updateData);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setProfileData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setProfileData(prev => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg overflow-hidden"
        >
          <div className="bg-red-500 px-6 py-4 flex justify-between items-center">
            <h3 className="text-lg font-medium text-white">Profile</h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-white hover:text-red-100 transition-colors"
            >
              <Edit2 size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="divide-y divide-gray-200">
            {/* Profile Photo Section */}
            <div className="px-6 py-6">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100">
                    {profileData.photoURL ? (
                      <img
                        src={profileData.photoURL}
                        alt={profileData.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User size={40} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                  {isEditing && (
                    <label className="absolute bottom-0 right-0 bg-red-500 rounded-full p-2 cursor-pointer hover:bg-red-600 transition-colors">
                      <Upload size={16} className="text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </label>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-medium text-gray-900">{profileData.name || user.name}</h3>
                  <p className="text-gray-500">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="px-6 py-6 space-y-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h4>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={profileData.name || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 disabled:bg-gray-100"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                      <input
                        type="tel"
                        name="phone"
                        value={profileData.phone || ''}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 disabled:bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Alternative Phone</label>
                      <input
                        type="tel"
                        name="alternativePhone"
                        value={profileData.alternativePhone || ''}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 disabled:bg-gray-100"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="px-6 py-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Address Information</h4>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Street Address</label>
                  <input
                    type="text"
                    name="address.street"
                    value={profileData.address?.street || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 disabled:bg-gray-100"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">City</label>
                    <input
                      type="text"
                      name="address.city"
                      value={profileData.address?.city || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Pincode</label>
                    <input
                      type="text"
                      name="address.pincode"
                      value={profileData.address?.pincode || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 disabled:bg-gray-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Landmark</label>
                  <input
                    type="text"
                    name="address.landmark"
                    value={profileData.address?.landmark || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-4">
              {isEditing && (
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    'Saving...'
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;