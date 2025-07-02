import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { createUserDocument } from '../services/userService';
import toast from 'react-hot-toast';

interface User {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  alternativePhone?: string;
  address?: {
    street: string;
    city: string;
    pincode: string;
    landmark?: string;
  };
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    phone: string,
    password: string,
    alternativePhone?: string,
    address?: { street: string; city: string; pincode: string; landmark?: string }
  ) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const ADMIN_EMAIL = 'ontimittatharun2002@gmail.com';
const ADMIN_EMAILS = [ADMIN_EMAIL, 'pittasbawarchi@gmail.com'];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get the ID token to check for admin claim
        const idTokenResult = await firebaseUser.getIdTokenResult();
        const isUserAdmin = ADMIN_EMAILS.includes(firebaseUser.email || '') || idTokenResult.claims.admin === true;
        
        setUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || '',
          email: firebaseUser.email,
          phone: firebaseUser.phoneNumber || '',
          isAdmin: isUserAdmin
        });
        setIsAdmin(isUserAdmin);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      toast.success('Login successful!');
      if (ADMIN_EMAILS.includes(email)) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (error) {
      toast.error('Login failed. Please check your credentials.');
      throw error;
    }
  };

  const register = async (
    name: string,
    email: string,
    phone: string,
    password: string,
    alternativePhone?: string,
    address?: { street: string; city: string; pincode: string; landmark?: string }
  ) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      await createUserDocument({
        id: userCredential.user.uid,
        name,
        email,
        phone,
        alternativePhone,
        address,
        isAdmin: ADMIN_EMAILS.includes(email)
      });
      toast.success('Registration successful!');
      navigate('/');
    } catch (error) {
      toast.error('Registration failed. Please try again.');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Logout failed');
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};