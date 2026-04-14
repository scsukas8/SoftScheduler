import { initFirebaseCore } from '@scheduleit/core';

// Web App Firebase config sourced via Vite
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Diagnostic check for missing environment variables in deployed app
Object.entries(firebaseConfig).forEach(([key, value]) => {
  if (!value) {
    console.error(`Firebase Config Error: ${key} is missing. Check your GitHub Secrets and deploy.yml.`);
  }
});

// Initialize the shared core with the web environment payload
const { app, auth, db, googleProvider } = initFirebaseCore(firebaseConfig);

export { auth, db, googleProvider };
export default app;
