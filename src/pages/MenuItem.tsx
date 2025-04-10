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
  isAvailable?: boolean;
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
    if (!item?.isAvailable) {
      toast.error('This item is currently unavailable');
      return;
    }
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: quantity,
      image: item.image
    });
    toast.success('Added to cart');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Item not found</h2>
        <p className="text-gray-600 mt-2">The requested item could not be found.</p>
      </div>
    );
  }

  const averageRating = reviews.length
    ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
    : 0;

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/menu')}
          className="flex items-center text-gray-600 hover:text-red-500 mb-4 md:mb-8 text-sm md:text-base"
        >
          <ArrowLeft className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
          Back to Menu
        </button>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="relative h-64 md:h-full">
              <img
                src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'}
                alt={item.name}
                className="w-full h-full object-cover"
              />
              {!item.isAvailable && (
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">Unavailable</span>
                </div>
              )}
            </div>
            <div className="p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{item.name}</h1>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl font-semibold text-red-500">₹{item.price}</span>
                <span className="px-2 py-1 bg-red-50 text-red-700 text-sm font-medium rounded-full">
                  {item.category}
                </span>
                {!item.isAvailable && (
                  <span className="px-2 py-1 bg-gray-50 text-gray-700 text-sm font-medium rounded-full">
                    Unavailable
                  </span>
                )}
              </div>
              <p className="text-gray-600 mb-6">{item.description}</p>
              
              {item.isAvailable && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center border rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-2 text-gray-600 hover:bg-gray-100"
                    >
                      -
                    </button>
                    <span className="px-3 py-2">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-3 py-2 text-gray-600 hover:bg-gray-100"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Add to Cart
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 md:mt-12">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-8">Customer Reviews</h2>

          {user && (
            <form onSubmit={handleAddReview} className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6 md:mb-8">
              <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Write a Review</h3>
              <div className="mb-3 md:mb-4">
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                  Rating
                </label>
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewReview({ ...newReview, rating: star })}
                      className="p-0.5 md:p-1"
                    >
                      <Star
                        className={`h-5 w-5 md:h-6 md:w-6 ${
                          star <= newReview.rating
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-3 md:mb-4">
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                  Your Review
                </label>
                <textarea
                  value={newReview.comment}
                  onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                  rows={3}
                  className="w-full text-sm md:text-base rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  placeholder="Share your thoughts..."
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 disabled:opacity-50 text-sm md:text-base"
              >
                {submitting ? 'Posting...' : 'Post Review'}
              </button>
            </form>
          )}

          <div className="space-y-4 md:space-y-6">
            {reviews.map((review) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-md p-4 md:p-6"
              >
                <div className="flex items-start md:items-center justify-between mb-2 md:mb-4">
                  <div>
                    <h4 className="text-sm md:text-lg font-semibold">{review.userName}</h4>
                    <div className="flex items-center mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3 w-3 md:h-4 md:w-4 ${
                            star <= review.rating
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs md:text-sm text-gray-500">
                    {review.createdAt?.toDate().toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm md:text-base text-gray-600">{review.comment}</p>
              </motion.div>
            ))}

            {reviews.length === 0 && (
              <p className="text-center text-sm md:text-base text-gray-500">No reviews yet. Be the first to review!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuItem;