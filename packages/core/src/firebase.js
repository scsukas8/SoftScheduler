import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Extracted references. Using 'let' allows ES6 live binding updates for module clients
let app, auth, db, googleProvider;

/**
 * Bootstraps Firebase securely decoupled from platform-specific environment bundlers.
 * @param {Object} firebaseConfig - The Firebase config object.
 * @param {Object} [customAuth] - Optional pre-initialized auth instance (e.g. for React Native).
 */
export const initFirebaseCore = (firebaseConfig, customAuth = null) => {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  
  // React Native requires initializeAuth() at boot for persistence. 
  // If provided, we use the custom instance; otherwise, fallback to default getAuth().
  auth = customAuth || getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();

  // Handle generic web persistence. 
  // Note: mobile implementations provide their own persistence via customAuth
  if (typeof window !== "undefined" && !customAuth) {
    setPersistence(auth, browserLocalPersistence)
      .catch((error) => console.error("Auth Persistence Error:", error));
  }
  
  return { app, auth, db, googleProvider };
};

// Export live-bound instantiated refs for dataService bindings
export { app, auth, db, googleProvider };
