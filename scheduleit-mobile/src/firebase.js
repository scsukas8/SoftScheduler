import { initFirebaseCore } from '@scheduleit/core';
import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mobile App Firebase config sourced via Expo Native environmental injection
const firebaseConfig = {
  apiKey: "AIzaSyD7G_hBlH61YB0H3ggcUcdYofClfJhcucc",
  authDomain: "scheduleapp-491917.firebaseapp.com",
  projectId: "scheduleapp-491917",
  storageBucket: "scheduleapp-491917.firebasestorage.app",
  messagingSenderId: "1073857724039",
  appId: "1:1073857724039:android:264b646c73132223b6c222"
};

// React Native requires explicit app initialization to pass to initializeAuth
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Mandatory for React Native persistence to survive app restarts
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize the shared core with the pre-configured native auth instance
const { db, googleProvider } = initFirebaseCore(firebaseConfig, auth);

export { auth, db, googleProvider };
export default app;
