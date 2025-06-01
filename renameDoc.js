const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parser'); // Library to help read CSV files

// --- START: Script Configuration ---

// 1. IMPORTANT: Update this path to your Firebase service account key JSON file.
const SERVICE_ACCOUNT_KEY_PATH = './serviceAccountKey.json';

// 2. IMPORTANT: For each CSV file you want to upload, you will need to:
//    a) Update CSV_FILE_PATH to the correct path of your CSV file.
//    b) Update TOPIC_NAME to the topic of the current CSV (e.g., "excel").
const CSV_FILE_PATH = './your_csv_file_goes_here.csv'; // <<<< CHANGE THIS
const TOPIC_NAME = 'Your Topic Name Here';             // <<<< CHANGE THIS

// 3. Firestore collection name
const FIRESTORE_COLLECTION_NAME = 'study';

// 4. Default values for new documents (based on your input)
const DOCUMENT_TYPE = 'brainScape';
const DURATION_MINUTES = 0; // You mentioned 0 or 1, defaulting to 0. Change to 1 if preferred.

// --- END: Script Configuration ---

// Initialize Firebase Admin
try {
  const serviceAccount = require(SERVICE_ACCOUNT_KEY_PATH);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('Firebase Admin SDK initialized successfully.');
} catch (error) {
  if (admin.apps.length === 0) { // Check if it's a genuine new error
    console.error('Firebase Admin SDK initialization error:', error);
    process.exit(1); // Exit if critical initialization error
  } else {
    console.log('Firebase Admin SDK already initialized (or re-running script).');
  }
}

const db = admin.firestore();
const batch = db.batch(); // Create a new batch for this run
let documentsToUploadCount = 0;
let processedRowCount = 0;

console.log(`\nStarting CSV processing for:`);
console.log(`  File: "${CSV_FILE_PATH}"`);
console.log(`  Topic: "${TOPIC_NAME}"`);
console.log(`  Target Collection: "${FIRESTORE_COLLECTION_NAME}"`);

fs.createReadStream(CSV_FILE_PATH)
  .pipe(csv({
    mapHeaders: ({ header }) => header.trim() // Trim spaces from headers
  }))
  .on('data', (row) => {
    processedRowCount++;
    const question = row.Question ? row.Question.trim() : '';
    const answer = row.Answer ? row.Answer.trim() : '';

    // Skip rows that are likely repeated headers or empty
    if (!question || (question.toLowerCase() === 'question' && answer.toLowerCase() === 'answer')) {
      // console.log(`Skipping header or empty row: Q: "<span class="math-inline">\{question\}", A\: "</span>{answer}" (Row ${processedRowCount})`);
      return;
    }

    const newDocRef = db.collection(FIRESTORE_COLLECTION_NAME).doc(); // Firestore auto-generates the ID

    const docData = {
      axisQuestion: question,
      axisAnswer: answer,
      topic: TOPIC_NAME,
      type: DOCUMENT_TYPE,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),   // Timestamp of upload
      completedAt: admin.firestore.FieldValue.serverTimestamp(), // Timestamp of upload
      durationMinutes: DURATION_MINUTES
    };

    batch.set(newDocRef, docData);
    documentsToUploadCount++;
    // console.log(`Prepared to add: Q: ${question.substring(0, 30)}... (Row ${processedRowCount})`);
  })
  .on('end', async () => {
    console.log(`\nFinished reading CSV file. Processed ${processedRowCount} rows.`);
    if (documentsToUploadCount > 0) {
      console.log(`Attempting to upload <span class="math-inline">\{documentsToUploadCount\} documents for topic "</span>{TOPIC_NAME}"...`);
      try {
        await batch.commit();
        console.log(`SUCCESS: Successfully uploaded <span class="math-inline">\{documentsToUploadCount\} documents to the "</span>{FIRESTORE_COLLECTION_NAME}" collection.`);
      } catch (error) {
        console.error('ERROR: Failed to commit batch to Firestore.', error);
      }
    } else {
      console.log('No valid data rows found in the CSV to upload.');
    }
    // Optional: Close the app if you want the script to terminate fully
    // admin.app().delete().catch(err => console.error("Error shutting down app:", err));
  })
  .on('error', (error) => {
    console.error('ERROR reading or parsing CSV file:', error);
  });