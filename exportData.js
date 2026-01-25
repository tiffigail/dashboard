// exportData.js
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";

// Your firebaseConfig object
const firebaseConfig = {
    apiKey: "AIzaSyC83ZohFJ9gRd9pWNJbJlTKNzg94O0381E",
    authDomain: "dashboard-bb237.firebaseapp.com",
    projectId: "dashboard-bb237",
    storageBucket: "dashboard-bb237.appspot.com",
    messagingSenderId: "913925574800",
    appId: "1:913925574800:web:1487a2148c228202578815"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper function to format dates as YYYY-MM-DD strings
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function exportCollections() {
  console.log("Starting data export...");
  // Updated list of collections to export
  const collectionsToExport = ['new_axes', 'new_goals', 'new_milestones', 'monthlyPlans', 'dailyMetrics'];
  const exportedData = {};

  for (const collectionName of collectionsToExport) {
    
    // Special logic ONLY for the 'dailyMetrics' collection
    if (collectionName === 'dailyMetrics') {
      const todayString = formatDate(new Date());
      console.log(`Fetching today's daily metric: ${todayString}...`);
      const docRef = doc(db, 'dailyMetrics', todayString);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        exportedData[collectionName] = [{ id: docSnap.id, ...docSnap.data() }];
        console.log(`Successfully read 1 document from ${collectionName}`);
      } else {
        exportedData[collectionName] = [];
        console.log(`No document found for today in ${collectionName}`);
      }
    } else {
      // For all other collections, get all documents
      console.log(`Fetching all documents from ${collectionName}...`);
      const querySnapshot = await getDocs(collection(db, collectionName));
      exportedData[collectionName] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`Successfully read ${querySnapshot.size} documents from ${collectionName}`);
    }
  }

  console.log("\n--- COPY THE JSON BELOW ---");
  console.log(JSON.stringify(exportedData, null, 2));
  console.log("--- END OF JSON ---");
  console.log("\nExport complete! Now, create your .json files.");
  process.exit(0);
}

exportCollections().catch(error => {
    console.error("Export failed:", error);
    process.exit(1);
});