// src/firebaseConfig.js

import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: "AIzaSyC83ZohFJ9gRd9pWNJbJlTKNzg94O0381E",
  authDomain: "dashboard-bb237.firebaseapp.com",
  projectId: "dashboard-bb237",
  storageBucket: "dashboard-bb237.firebasestorage.app",
  messagingSenderId: "913925574800",
  appId: "1:913925574800:web:1487a2148c228202578815"
};

const app = initializeApp(firebaseConfig);

// App Check — blocks any Firestore access not coming from this app.
// In local dev, a debug token is printed to the console. Register it in
// Firebase Console → App Check → Apps → [your app] → Debug tokens.
if (import.meta.env.DEV) {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || true;
}

initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
  isTokenAutoRefreshEnabled: true,
});

const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

const auth = getAuth(app);
const storage = getStorage(app);


// Export the instances for use elsewhere in the app
export { db, storage, auth };