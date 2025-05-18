import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCRKNc4sMLeQjh1p3QcXw5dgTWBBoLL6xc",
  projectId: "pittas-fb2a8",
  storageBucket: "pittas-fb2a8.firebasestorage.app",
  appId: "1:215585759764:android:d1cef04e916bf7e1b27d01"
};

// Initialize Firebase with better error handling
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Enable offline persistence
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('The current browser does not support persistence.');
    }
  });
}

// Initialize Storage
export const storage = getStorage(app);

// Initialize Analytics
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Export the Firebase app instance
export default app;