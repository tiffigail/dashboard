const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parser'); // Library to help read CSV files

// --- START: Script Configuration ---

// 1. IMPORTANT: Update this path to your Firebase service account key JSON file.
//    Ensure this file is in the same directory as this script, or provide the correct path.
const SERVICE_ACCOUNT_KEY_PATH = './serviceAccountKey.json';

// 2. Firestore collection name that contains the document to update.
const FIRESTORE_COLLECTION_NAME = 'study';

// 3. IMPORTANT: ID of the specific document within the 'study' collection
//    that contains the 'flashcards' map field you want to update.
//    You'll need to get this ID from your Firestore console.
const TARGET_DOCUMENT_ID = 'flashcards'; // <<<< CHANGE THIS

// 4. IMPORTANT: For each CSV file you want to upload:
//    a) Update CSV_FILE_PATH to the correct path of your CSV file.
//    b) Update TOPIC_NAME for the 'topic' field of the flashcards.
const CSV_FILE_PATH = 'gear_learning_20250512125835.csv'; // <<<< CHANGE THIS (e.g., './excel_flashcards.csv')
const TOPIC_NAME = 'Learning to Learn';             // <<<< CHANGE THIS (e.g., 'Excel')

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
let newFlashcardsMap = {}; // To store new flashcards from the CSV
let processedRowCount = 0;
let flashcardsAddedCount = 0;

console.log(`\nStarting CSV processing for:`);
console.log(`  File: "${CSV_FILE_PATH}"`);
console.log(`  Topic: "${TOPIC_NAME}"`);
console.log(`  Target Collection: "${FIRESTORE_COLLECTION_NAME}"`);
console.log(`  Target Document ID: "${TARGET_DOCUMENT_ID}"`);

if (TARGET_DOCUMENT_ID === 'YOUR_TARGET_DOCUMENT_ID_HERE' || !TARGET_DOCUMENT_ID) {
    console.error("ERROR: TARGET_DOCUMENT_ID is not set. Please update it in the script.");
    process.exit(1);
}

fs.createReadStream(CSV_FILE_PATH)
  .pipe(csv({
    mapHeaders: ({ header }) => header.trim() // Trim spaces from headers
  }))
  .on('data', (row) => {
    processedRowCount++;
    const question = row.Question ? row.Question.trim() : ''; // This will become the 'title'
    const answer = row.Answer ? row.Answer.trim() : '';

    // Skip rows that are likely repeated headers or empty
    if (!question || (question.toLowerCase() === 'question' && answer.toLowerCase() === 'answer')) {
      // console.log(`Skipping header or empty row: Q: "${question}", A: "${answer}" (Row ${processedRowCount})`);
      return;
    }

    // Generate a new unique ID for this flashcard entry within the map
    // This uses Firestore's ability to generate IDs for new documents,
    // even though we're not creating a new top-level document here.
    const flashcardEntryId = db.collection(FIRESTORE_COLLECTION_NAME).doc().id;

    // Prepare the data for the new flashcard entry
    const flashcardData = {
      title: question, // CSV "Question" maps to Firestore "title"
      answer: answer,  // CSV "Answer" maps to Firestore "answer"
      topic: TOPIC_NAME,
      addedAt: admin.firestore.FieldValue.serverTimestamp() // Timestamp of upload
    };

    newFlashcardsMap[flashcardEntryId] = flashcardData;
    flashcardsAddedCount++;
    // console.log(`Prepared to add flashcard: ID: ${flashcardEntryId}, Title: ${question.substring(0, 30)}... (Row ${processedRowCount})`);
  })
  .on('end', async () => {
    console.log(`\nFinished reading CSV file. Processed ${processedRowCount} rows.`);

    if (flashcardsAddedCount > 0) {
      console.log(`Attempting to add ${flashcardsAddedCount} flashcards to document "${TARGET_DOCUMENT_ID}" in collection "${FIRESTORE_COLLECTION_NAME}"...`);

      const targetDocRef = db.collection(FIRESTORE_COLLECTION_NAME).doc(TARGET_DOCUMENT_ID);

      try {
        // To safely add to a map, we should merge with existing data.
        // We construct the update object with dot notation for each new flashcard.
        const updateData = {};
        for (const entryId in newFlashcardsMap) {
            updateData[`flashcards.${entryId}`] = newFlashcardsMap[entryId];
        }

        await targetDocRef.update(updateData);

        console.log(`SUCCESS: Successfully added/updated ${flashcardsAddedCount} flashcards in the 'flashcards' field of document "${TARGET_DOCUMENT_ID}".`);
      } catch (error) {
        console.error(`ERROR: Failed to update document "${TARGET_DOCUMENT_ID}".`, error);
        console.log("Make sure the document exists and the 'flashcards' field is intended to be a map (object).");
        console.log("If the 'flashcards' field doesn't exist, this operation will create it as a map.");
      }
    } else {
      console.log('No valid data rows found in the CSV to add as flashcards.');
    }
    // Optional: Close the app if you want the script to terminate fully
    // admin.app().delete().catch(err => console.error("Error shutting down app:", err));
  })
  .on('error', (error) => {
    console.error('ERROR reading or parsing CSV file:', error);
  });
