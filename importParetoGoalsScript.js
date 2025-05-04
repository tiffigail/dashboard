// importParetoGoals.js
// Script to read a CSV and UPDATE Firestore 'axes' documents
// with Stretch Goals AND Yearly Goals.
/*
How to Run This Import Script:
1. Prerequisites:
   - Ensure your CSV file ('Dashboard - ParetoAxes.csv') is in the correct location
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
   node importParetoGoals.js
5. Check terminal output for success/errors and verify 'stretchGoal' and 'yearlyGoal' fields
   and document IDs (like 'on-track-n+1') in Firestore 'axes' docs.
*/

import { readFileSync } from 'fs'; // To read the file
import { parse } from 'csv-parse/sync'; // To parse CSV data
import { db } from './src/firebaseConfig.js'; // Import your Firestore db instance
import { doc, setDoc } from 'firebase/firestore'; // Import Firestore functions
import sys from 'process'; // For exiting on error

// --- Configuration ---
// !!! IMPORTANT: Please verify these paths and header names before running !!!

// Path to your Service Account Key JSON file located in your WINDOWS Downloads folder,
// accessed from within WSL Ubuntu.
// *** Replace 'aharr' with your ACTUAL WINDOWS username if different. ***
// *** Make sure the filename matches exactly what you downloaded. ***
const SERVICE_ACCOUNT_KEY_PATH = '/mnt/c/Users/aharr/Downloads/dashboard-bb237-firebase-adminsdk-fbsvc-76972dbf6d.json';

// Path to your CSV file in your WINDOWS Downloads folder
const CSV_FILE_PATH = '/mnt/c/Users/aharr/Downloads/Dashboard - ParetoAxes.csv'; // Using the specific filename

// --- CSV Header Names ---
// !!! UPDATE these constants if your CSV headers are different !!!
const AXIS_NAME_HEADER = 'Axes';
const PARETO_GOAL_HEADER = 'Pareto Stretch Goals'; // Header in CSV for the stretch goal
const YEARLY_GOAL_HEADER = '2025'; // Header in CSV for the yearly goal

// *** Instructions for Future Years ***
// To import goals for a different year (e.g., 2026):
// 1. Make sure your CSV file has a column named '2026' (or the relevant year).
// 2. Change the value of the YEARLY_GOAL_HEADER constant below from '2025' to '2026'.
// 3. Save this script and run it again.
// --- End Configuration ---


const FIRESTORE_COLLECTION_NAME = 'axes'; // Target collection

async function importGoals() {
  console.log(`Reading Goals CSV file from: ${CSV_FILE_PATH}`);

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

    // Process each row (each row represents an axis/theme)
    for (const record of records) {
      // Use the updated header constants
      const axisTheme = record[AXIS_NAME_HEADER];
      const paretoGoalValue = record[PARETO_GOAL_HEADER]; // Read value from CSV
      const yearlyGoalValue = record[YEARLY_GOAL_HEADER]; // Read value from CSV


      if (!axisTheme) {
        console.warn(`Skipping row because '${AXIS_NAME_HEADER}' column is missing or empty:`, record);
        skippedCount++;
        continue; // Skip rows without an axis name
      }

      // Generate lowercase document ID from the theme/axis name
      // MODIFIED: Allow '+' sign in the document ID
       const axisId = axisTheme.trim().toLowerCase()
                        .replace(/\s+/g, '-') // Replace spaces with hyphens
                        .replace(/[^a-z0-9-+]/g, ''); // Allow letters, numbers, hyphen, PLUS sign
      if (!axisId) {
          console.warn("Skipping row because generated axis ID is empty:", record);
          skippedCount++;
          continue;
      }

      console.log(`Processing Axis: ${axisTheme} (ID: ${axisId})`);

      // Data object containing only the fields to update/add
      // MODIFIED: Use 'stretchGoal' as the Firestore field key
      const dataToMerge = {
        stretchGoal: paretoGoalValue ? paretoGoalValue.trim() : null, // Use stretchGoal key
        yearlyGoal: yearlyGoalValue ? yearlyGoalValue.trim() : null
      };

      // Remove null fields before saving for cleaner data
      const finalData = {};
      if (dataToMerge.stretchGoal !== null && dataToMerge.stretchGoal !== '') { // Check stretchGoal
        finalData.stretchGoal = dataToMerge.stretchGoal; // Assign to stretchGoal
      }
       if (dataToMerge.yearlyGoal !== null && dataToMerge.yearlyGoal !== '') {
        finalData.yearlyGoal = dataToMerge.yearlyGoal;
      }


      if (Object.keys(finalData).length === 0) {
          console.log(` -> No Stretch or Yearly goal found for axis: ${axisId}. Skipping Firestore update.`);
          skippedCount++;
          continue;
      }


      // Get Firestore document reference using the generated ID
      const docRef = doc(db, FIRESTORE_COLLECTION_NAME, axisId);

      // Update data using setDoc with merge:true (updates only specified fields)
      await setDoc(docRef, finalData, { merge: true });
      console.log(` -> Successfully updated goal(s) for axis: ${axisId}`);
      updatedCount++;

    } // End loop through records

    console.log("----------------------------------------");
    console.log("Firestore Goal import completed!");
    console.log(`Documents processed/updated: ${updatedCount}`);
    console.log(`Rows skipped: ${skippedCount}`);
    console.log("----------------------------------------");

  } catch (error) {
    console.error("----------------------------------------");
    console.error("Error during Firestore data import:", error);
    console.error("----------------------------------------");
    if (error.code === 'ENOENT') {
        console.error(`\n!!! Make sure the file "${CSV_FILE_PATH}" exists !!!\n`);
    } else if (error.message.includes('Invalid CSV') || error.message.includes('header')) { // Catch header errors
         console.error(`\n!!! There might be an issue with the CSV format or headers. Expected: '${AXIS_NAME_HEADER}', '${PARETO_GOAL_HEADER}', '${YEARLY_GOAL_HEADER}'. Please check your CSV file. !!!\n`);
    } else {
         console.error(`\n!!! Check Firestore connection, permissions, and paths. !!!\n`);
    }
  }
}

// Run the import function
importGoals();
