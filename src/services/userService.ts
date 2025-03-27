import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';

export interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  alternativePhone?: string;
  photoURL?: string;
  address?: {
    street: string;
    city: string;
    pincode: string;
    landmark?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export const createUserDocument = async (userData: Omit<UserData, 'createdAt' | 'updatedAt'>) => {
  const userRef = doc(db, 'users', userData.id);
  const timestamp = new Date();
  
  await setDoc(userRef, {
    ...userData,
    createdAt: timestamp,
    updatedAt: timestamp
  });
};

export const getUserData = async (userId: string): Promise<UserData | null> => {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  
  if (userDoc.exists()) {
    return userDoc.data() as UserData;
  }
  
  return null;
};

export const updateUserProfile = async (userId: string, data: Partial<UserData>) => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    ...data,
    updatedAt: new Date()
  });
};

export const uploadProfilePhoto = async (userId: string, file: File): Promise<string> => {
  const fileRef = ref(storage, `profile-images/${userId}/${file.name}`);
  await uploadBytes(fileRef, file);
  const photoURL = await getDownloadURL(fileRef);
  return photoURL;
};