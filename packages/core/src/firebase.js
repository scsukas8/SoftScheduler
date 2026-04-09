import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Extracted references. Using 'let' allows ES6 live binding updates for module clients
let app, auth, db, googleProvider;

/**
 * Bootstraps Firebase securely decoupled from platform-specific environment bundlers
 */
export const initFirebaseCore = (firebaseConfig) => {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();

  // Handle generic web persistence. 
  // Note: mobile implementations over-ride this in their own contexts natively
  if (typeof window !== "undefined") {
    setPersistence(auth, browserLocalPersistence)
      .catch((error) => console.error("Auth Persistence Error:", error));
  }
  
  return { app, auth, db, googleProvider };
};

// Export live-bound instantiated refs for dataService bindings
export { app, auth, db, googleProvider };
