// importMonthlyPlans.js
// Script to read 'Dashboard - Time Based Themes.csv' and populate/update
// Firestore 'monthlyPlans' collection.
/*
How to Run This Import Script:
1. Prerequisites:
   - Ensure your CSV file ('Dashboard - Time Based Themes.csv') is in the correct location
     (e.g., your Downloads folder as specified in CSV_FILE_PATH).
   - The CSV needs columns matching the headers defined in the Configuration section below.
     *** Verify the exact header names in the Configuration section below. ***
   - Ensure 'csv-parse' is installed (run 'npm install csv-parse' in terminal if needed).
   - Ensure you have Node.js installed.
   - Ensure your firebaseConfig.js is correctly set up.
   - Ensure your Service Account Key file is in the correct location specified below.
2. Open WSL/Ubuntu Terminal (or your standard Node.js terminal).
3. Navigate to the project directory where this script and firebaseConfig.js are located:
   cd ~/gearshift-dashboard
   (Adjust path if necessary)
4. Run the script:
   node importMonthlyPlans.js
5. Check terminal output for success/errors and verify data in Firestore 'monthlyPlans' collection.
*/

import { readFileSync } from 'fs'; // To read the file
import { parse } from 'csv-parse/sync'; // To parse CSV data
import { db } from './src/firebaseConfig.js'; // Import your Firestore db instance
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'; // Import Firestore functions
import sys from 'process'; // For exiting on error

// --- Configuration ---
// !!! IMPORTANT: Please verify these paths and header names before running !!!

// Path to your Service Account Key JSON file located in your WINDOWS Downloads folder,
// accessed from within WSL Ubuntu.
// *** Replace 'aharr' with your ACTUAL WINDOWS username if different. ***
// *** Make sure the filename matches exactly what you downloaded. ***
const SERVICE_ACCOUNT_KEY_PATH = '/mnt/c/Users/aharr/Downloads/dashboard-bb237-firebase-adminsdk-fbsvc-76972dbf6d.json';

// Path to your CSV file in your WINDOWS Downloads folder
const CSV_FILE_PATH = '/mnt/c/Users/aharr/Downloads/Dashboard - Time Based Themes.csv'; // Using the specific filename

// --- CSV Header Names ---
// !!! UPDATE these constants if your CSV headers are different !!!
const MONTH_HEADER = 'Month';
const MONTH_FOCUS_HEADER = 'Month Focus';
const MONTH_OBJECTIVE_HEADER = 'Month Objective';
const WEEK_1_FOCUS_HEADER = 'Week 1 Focus';
const WEEK_1_OBJECTIVE_HEADER = 'Week 1 Objective';
const WEEK_2_FOCUS_HEADER = 'Week 2 Focus';
const WEEK_2_OBJECTIVE_HEADER = 'Week 2 Objective';
const WEEK_3_FOCUS_HEADER = 'Week 3 Focus';
const WEEK_3_OBJECTIVE_HEADER = 'Week 3 Objective';
const WEEK_4_FOCUS_HEADER = 'Week 4 Focus';
const WEEK_4_OBJECTIVE_HEADER = 'Week 4 Objective';
const REWARD_HEADER = 'Reward';
// --- End Configuration ---


const FIRESTORE_COLLECTION_NAME = 'monthlyPlans'; // Target collection

// Helper function to parse month string (e.g., "April 2025") to "YYYY-MM" format
function parseMonthToId(monthString) {
    if (!monthString || typeof monthString !== 'string') return null;
    try {
        // Attempt to parse the string. Handles formats like "April 2025", "Apr 2025" etc.
        const date = new Date(monthString.trim() + " 1"); // Add day 1 to help parser
        if (isNaN(date.getTime())) {
            console.warn(`Could not parse month: "${monthString}".`);
            return null;
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
        return `${year}-${month}`;
    } catch (e) {
        console.warn(`Error parsing month "${monthString}":`, e);
        return null;
    }
}


async function importMonthlyData() {
  console.log(`Reading Monthly Themes CSV file from: ${CSV_FILE_PATH}`);

  try {
    const fileContent = readFileSync(CSV_FILE_PATH, { encoding: 'utf8' });

    // Parse the CSV - assumes first row is headers
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    console.log(`Found ${records.length} records in CSV. Processing...`);

    let updatedCount = 0;
    let skippedCount = 0;

    // Process each row (each row represents a month)
    for (const record of records) {
      const monthName = record[MONTH_HEADER];
      const monthFocus = record[MONTH_FOCUS_HEADER];
      const monthObjective = record[MONTH_OBJECTIVE_HEADER];
      const reward = record[REWARD_HEADER];

      if (!monthName) {
        console.warn(`Skipping row because '${MONTH_HEADER}' column is missing or empty:`, record);
        skippedCount++;
        continue;
      }

      // Generate document ID (YYYY-MM) from the Month string
      const docId = parseMonthToId(monthName);
      if (!docId) {
          console.warn(`Skipping row because month could not be parsed to YYYY-MM format: "${monthName}"`);
          skippedCount++;
          continue;
      }

      console.log(`Processing Month: ${monthName} (ID: ${docId})`);

      // Prepare weekly data map
      const weeklyDataMap = {};
      for (let i = 1; i <= 4; i++) {
          const focus = record[`Week ${i} Focus`];
          const objective = record[`Week ${i} Objective`];
          // Only add week if focus or objective exists
          if ((focus && focus.trim()) || (objective && objective.trim())) {
              weeklyDataMap[String(i)] = {
                  focus: focus ? focus.trim() : null,
                  objective: objective ? objective.trim() : null
              };
          }
      }

      // Data object to save to Firestore
      const monthData = {
        monthId: docId,
        monthName: monthName.trim(),
        monthFocus: monthFocus ? monthFocus.trim() : null,
        monthObjective: monthObjective ? monthObjective.trim() : null,
        weeklyData: weeklyDataMap, // The map of weekly data
        reward: reward ? reward.trim() : null,
        createdAt: serverTimestamp() // Add timestamp for when it was imported/updated
      };

       // Remove null fields before saving for cleaner data
       const finalData = {};
       Object.keys(monthData).forEach(key => {
         if (monthData[key] !== null && monthData[key] !== '') {
            // Keep empty maps/objects if needed, check specifically for null/empty strings
            if (typeof monthData[key] === 'object' && Object.keys(monthData[key]).length === 0 && key === 'weeklyData'){
                // Skip empty weeklyData map if desired, or keep it
                // delete finalData[key];
                finalData[key] = monthData[key]; // Keep empty map for now
            } else if (monthData[key] !== null && monthData[key] !== '') {
               finalData[key] = monthData[key];
            }
         }
       });
       // Ensure essential fields always exist even if empty in CSV
       finalData.monthId = monthData.monthId;
       finalData.monthName = monthData.monthName;
       if (!finalData.weeklyData) finalData.weeklyData = {};


      // Get Firestore document reference using the generated ID
      const docRef = doc(db, FIRESTORE_COLLECTION_NAME, docId);

      // Save data using setDoc (creates or overwrites the document for that month)
      await setDoc(docRef, finalData); // Not using merge, assuming CSV is source of truth per month
      console.log(` -> Successfully saved/updated data for month: ${docId}`);
      updatedCount++;

    } // End loop through records

    console.log("----------------------------------------");
    console.log("Firestore Monthly Plan import completed!");
    console.log(`Documents processed/updated: ${updatedCount}`);
    console.log(`Rows skipped: ${skippedCount}`);
    console.log("----------------------------------------");

  } catch (error) {
    console.error("----------------------------------------");
    console.error("Error during Firestore data import:", error);
    console.error("----------------------------------------");
    if (error.code === 'ENOENT') {
        console.error(`\n!!! Make sure the file "${CSV_FILE_PATH}" exists !!!\n`);
    } else if (error.message.includes('Invalid CSV') || error.message.includes('header')) {
         console.error(`\n!!! There might be an issue with the CSV format or headers. Please check your CSV file, especially the header names defined in the script's Configuration section. !!!\n`);
    } else {
         console.error(`\n!!! Check Firestore connection, permissions, and paths. !!!\n`);
    }
  }
}

// Run the import function
importMonthlyData();
