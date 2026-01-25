// src/firebaseConfig.js

import { initializeApp } from "firebase/app";
// VVVV 1. IMPORT THE NEW, MODERN FUNCTIONS VVVV
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration (no changes here)
const firebaseConfig = {
  apiKey: "AIzaSyC83ZohFJ9gRd9pWNJbJlTKNzg94O0381E",
  authDomain: "dashboard-bb237.firebaseapp.com",
  projectId: "dashboard-bb237",
  storageBucket: "dashboard-bb237.firebasestorage.app",
  messagingSenderId: "913925574800",
  appId: "1:913925574800:web:1487a2148c228202578815"
};

// Initialize Firebase App (no changes here)
const app = initializeApp(firebaseConfig);

// VVVV 2. THIS IS THE MAJOR CHANGE VVVV
// Initialize Firestore using the new method that allows for settings
// This enables persistence and multi-tab support AT THE SAME TIME the db is created.
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
console.log("Firestore initialized with offline persistence enabled.");

const auth = getAuth(app); // This line creates the auth service


// Initialize Cloud Storage (no changes here)
const storage = getStorage(app);

// VVVV 3. THE OLD, PROBLEMATIC CODE IS REMOVED VVVV
/*
  // This old block is what caused the error and has been replaced by the new initializeFirestore call above.
  const db_old = getFirestore(app);
  enableIndexedDbPersistence(db_old)
    .then(() => { ... })
    .catch((err) => { ... });
*/


// Export the instances for use elsewhere in the app
export { db, storage, auth };