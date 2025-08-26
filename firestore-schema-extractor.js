// firestore-schema-extractor.js
// A read-only script to inspect a Firestore database structure with top-level collections.
// This version uses the Firebase Admin SDK and a service account key.

// 1. SETUP:
// a. Place your `serviceAccountKey.json` file in the SAME FOLDER as this script.
// b. Open your terminal in this folder and run:
//    npm install firebase-admin

import admin from 'firebase-admin';

// 2. CONFIGURATION:
// a. Update the path if your service account key file has a different name.
import serviceAccount from './serviceAccountKey.json' with { type: 'json' };

// =================================================================================
// SCRIPT LOGIC (No need to edit below this line)
// =================================================================================

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * Analyzes a value and returns a string representation of its type.
 * Handles Firestore-specific types and nested objects/arrays.
 * @param {*} value - The value to analyze.
 * @returns {string} - A string describing the data type.
 */
function getFieldType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) {
        if (value.length > 0) {
            // Check if it's an array of objects
            if (typeof value[0] === 'object' && value[0] !== null && !(value[0] instanceof admin.firestore.Timestamp)) {
                 return `array of objects`;
            }
            return `array of ${typeof value[0]}s`;
        }
        return 'array (empty)';
    }
    // Check for Firestore Timestamps
    if (value instanceof admin.firestore.Timestamp) {
        return 'timestamp';
    }
    if (typeof value === 'object') {
        return 'object (map)';
    }
    return typeof value;
}


/**
 * Main function to extract and print the schema.
 */
async function extractSchema() {
    console.log(`\nInspecting top-level Firestore schema...`);
    console.log("====================================================\n");

    try {
        // Get all top-level collections from the database root
        const collections = await db.listCollections();

        if (collections.length === 0) {
            console.log("No top-level collections found in this database.");
            return;
        }

        let output = "### My Current Firestore Structure\n\n";

        for (const colRef of collections) {
            output += `**Collection:** \`${colRef.id}\`\n`;
            
            const fieldTypes = new Map();
            
            // Create a query to sample the first 3 documents for structure analysis
            const snapshot = await colRef.limit(3).get();

            if (snapshot.empty) {
                output += `* (This collection appears to be empty)\n\n`;
                continue;
            }

            // Analyze the fields of the sample documents
            snapshot.forEach(doc => {
                const data = doc.data();
                for (const key in data) {
                    if (!fieldTypes.has(key)) {
                        fieldTypes.set(key, getFieldType(data[key]));
                    }
                }
            });

            output += `* **Document Fields:**\n`;
            for (const [field, type] of fieldTypes.entries()) {
                output += `    * \`${field}\`: (${type})\n`;
            }
            output += `\n`;
        }

        console.log("--- SCHEMA START ---");
        console.log(output);
        console.log("--- SCHEMA END ---");
        console.log("\n✅ Success! Copy the text between 'SCHEMA START' and 'SCHEMA END' and paste it back in our chat.");

    } catch (error) {
        console.error("❌ An error occurred:", error.message);
        console.error("Please check that your service account key is correct.");
    }
}

extractSchema();
