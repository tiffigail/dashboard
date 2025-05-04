// src/firebaseConfig.js
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// UPDATED: Import enableIndexedDbPersistence along with getFirestore
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration that you copied
const firebaseConfig = {
  apiKey: "AIzaSyC83ZohFJ9gRd9pWNJbJlTKNzg94O0381E", // Use the key you provided
  authDomain: "dashboard-bb237.firebaseapp.com",   // Use the domain you provided
  projectId: "dashboard-bb237",                   // Use the project ID you provided
  storageBucket: "dashboard-bb237.appspot.com", // Corrected storage bucket format
  messagingSenderId: "913925574800",               // Use the sender ID you provided
  appId: "1:913925574800:web:1487a2148c228202578815" // Use the app ID you provided
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
// We export this 'db' instance to use it in other components for database operations
const db = getFirestore(app);

// <<< Enable Offline Persistence >>>
enableIndexedDbPersistence(db)
  .then(() => {
    console.log("Firestore offline persistence enabled");
  })
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time.
      console.warn("Firestore persistence failed: Multiple tabs open? Offline features might not work reliably.");
    } else if (err.code == 'unimplemented') {
      // The current browser does not support all of the features required to enable persistence
      console.error("Firestore persistence failed: Browser not supported.");
    } else {
        console.error("Firestore persistence failed:", err);
    }
  });
// <<< End Enable Offline Persistence >>>


// Export the database instance for use elsewhere in the app
export { db };

// Later, if you use other services like Authentication, you would initialize and export them here too
// e.g., import { getAuth } from "firebase/auth"; export const auth = getAuth(app);
