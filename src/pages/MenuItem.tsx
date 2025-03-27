import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, ArrowLeft, ShoppingCart, Plus, Minus } from 'lucide-react';
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Unsubscribe } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';

interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: any;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  image: string;
}

const MenuItem = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [item, setItem] = useState<MenuItem | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchItem = useCallback(async () => {
    if (!id) return;

    try {
      const itemDoc = await getDoc(doc(db, 'menuItems', id));
      if (itemDoc.exists()) {
        setItem({ id: itemDoc.id, ...itemDoc.data() } as MenuItem);
      } else {
        toast.error('Item not found');
        navigate('/menu');
      }
    } catch (error) {
      console.error('Error fetching item:', error);
      toast.error('Failed to load item details');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;

    const setupReviewsListener = async () => {
      if (!id) return;

      try {
        await fetchItem();

        const reviewsQuery = query(
          collection(db, 'menuItems', id, 'reviews'),
          orderBy('createdAt', 'desc')
        );

        unsubscribe = onSnapshot(
          reviewsQuery,
          (snapshot) => {
            const reviewsData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as Review[];
            setReviews(reviewsData);
          },
          (error) => {
            console.error('Error fetching reviews:', error);
            toast.error('Failed to load reviews');
          }
        );
      } catch (error) {
        console.error('Error setting up reviews listener:', error);
      }
    };

    setupReviewsListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [id, fetchItem]);

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to post a review');
      return;
    }

    if (!newReview.comment.trim()) {
      toast.error('Please enter a review comment');
      return;
    }

    setSubmitting(true);
    try {
      const reviewData = {
        userId: user.id,
        userName: user.name,
        rating: newReview.rating,
        comment: newReview.comment.trim(),
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'menuItems', id!, 'reviews'), reviewData);
      setNewReview({ rating: 5, comment: '' });
      toast.success('Review posted successfully');
    } catch (error) {
      console.error('Error posting review:', error);
      toast.error('Failed to post review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddToCart = () => {
    if (!item) return;

    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: quantity,
      image: item.image
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (!item) {
    return null;
  }

  const averageRating = reviews.length
    ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/menu')}
          className="flex items-center text-gray-600 hover:text-red-500 mb-8"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Menu
        </button>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="md:flex">
            <div className="md:w-1/2">
              <img
                src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'}
                alt={item.name}
                className="w-full h-96 object-cover"
              />
            </div>
            <div className="md:w-1/2 p-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex justify-between items-start">
                  <h1 className="text-3xl font-bold text-gray-900">{item.name}</h1>
                  <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded-full">
                    {item.category}
                  </span>
                </div>
                <div className="mt-4 flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= averageRating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-gray-600">
                    ({reviews.length} reviews)
                  </span>
                </div>
                <p className="mt-4 text-gray-600">{item.description}</p>
                <div className="mt-6">
                  <span className="text-3xl font-bold text-gray-900">₹{item.price}</span>
                </div>
                
                {/* Quantity Selector */}
                <div className="mt-6 flex items-center space-x-4">
                  <span className="text-gray-700">Quantity:</span>
                  <div className="flex items-center border rounded-lg">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="p-2 hover:bg-gray-100"
                    >
                      <Minus size={20} />
                    </button>
                    <span className="px-4 py-2 text-lg font-medium">{quantity}</span>
                    <button
                      onClick={() => setQuantity(q => q + 1)}
                      className="p-2 hover:bg-gray-100"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleAddToCart}
                  className="mt-8 w-full flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-red-500 hover:bg-red-600"
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Add to Cart - ₹{item.price * quantity}
                </button>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Customer Reviews</h2>

          {/* Add Review Form */}
          {user && (
            <form onSubmit={handleAddReview} className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h3 className="text-lg font-semibold mb-4">Write a Review</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating
                </label>
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewReview({ ...newReview, rating: star })}
                      className="p-1"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= newReview.rating
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Review
                </label>
                <textarea
                  value={newReview.comment}
                  onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                  rows={4}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  placeholder="Share your thoughts about this item..."
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 disabled:opacity-50"
              >
                {submitting ? 'Posting...' : 'Post Review'}
              </button>
            </form>
          )}

          {/* Reviews List */}
          <div className="space-y-6">
            {reviews.map((review) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold">{review.userName}</h4>
                    <div className="flex items-center mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= review.rating
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">
                    {review.createdAt?.toDate().toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-600">{review.comment}</p>
              </motion.div>
            ))}

            {reviews.length === 0 && (
              <p className="text-center text-gray-500">No reviews yet. Be the first to review!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuItem;