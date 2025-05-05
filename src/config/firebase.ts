import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCRKNc4sMLeQjh1p3QcXw5dgTWBBoLL6xc",
  projectId: "pittas-fb2a8",
  messagingSenderId: "215585759764",
  appId: "1:215585759764:android:d1cef04e916bf7e1b27d01",
  vapidKey: "BCgCRt5u3_sJUQtBDh29MZmXuR9igNB4wiifQWcIy3PF-GM6UlQjFUNJO0eXpOcb8L1zPk7vcV0YzlHpacfrqrI"
};

// Initialize Firebase with better error handling
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with persistent cache
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(
    { tabManager: persistentMultipleTabManager() }
  )
});

// Initialize Storage
export const storage = getStorage(app);

// Initialize Analytics only in browser environment
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Initialize Messaging only in browser environment
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

// Export the Firebase app instance
export default app;