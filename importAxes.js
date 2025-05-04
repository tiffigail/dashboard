// importAxes.js
// Script to read 'Dashboard - Daily Themes.csv' and populate Firestore 'axes' collection
/*
How to Run This Import Script:
1. Prerequisites:
   - Ensure 'Dashboard - Daily Themes.csv' is in the same directory as this script and is updated.
   - Ensure 'csv-parse' is installed (run 'npm install csv-parse' in terminal if you get errors).
2. Open WSL/Ubuntu Terminal.
3. Navigate to the project directory:
   cd ~/gearshift-dashboard
   OR
   cd ~/projects/gearshift-dashboard
4. Run the script:
   node importAxes.js
5. Check terminal output for success/errors and verify data in Firestore.
*/

import { readFileSync } from 'fs'; // To read the file
import { parse } from 'csv-parse/sync'; // To parse CSV data
import { db } from './src/firebaseConfig.js'; // Import your Firestore db instance
import { doc, setDoc, Timestamp } from 'firebase/firestore'; // Import Firestore functions

// --- Configuration ---
const CSV_FILE_PATH = './Dashboard - Daily Themes.csv'; // Path relative to script location
// --- End Configuration ---

// Helper function to parse dates (accepts MM/DD or MM/DD/YYYY, returns Timestamp or null)
function parseDateToTimestamp(dateString) {
  if (!dateString || typeof dateString !== 'string' || dateString.trim() === '') {
    return null;
  }
  try {
    // Attempt to parse common formats, adjust if your CSV uses something else
    // Adding time avoids timezone issues during parsing
    const date = new Date(dateString.trim() + ' 00:00:00');
    // Check if the date is valid after parsing
    if (isNaN(date.getTime())) {
        console.warn(`Could not parse date: "${dateString}". Setting to null.`);
        return null;
    }
    return Timestamp.fromDate(date);
  } catch (e) {
    console.warn(`Error parsing date "${dateString}":`, e, ". Setting to null.");
    return null;
  }
}

async function importAxesData() {
  console.log(`Reading CSV file from: ${CSV_FILE_PATH}`);

  try {
    const fileContent = readFileSync(CSV_FILE_PATH, { encoding: 'utf8' });

    // Parse the CSV - assumes first row is headers
    const records = parse(fileContent, {
      columns: true, // Use header row to determine object keys
      skip_empty_lines: true,
      trim: true, // Trim whitespace from values
    });

    console.log(`Found ${records.length} records in CSV. Processing...`);

    // Process each row (each row represents an axis/theme)
    for (const record of records) {
      // Extract data using header names from your CSV
      // !! Adjust these header names if they are different in your CSV file !!
      const axisTheme = record['Day Theme'] || record['Axis'] || record['Theme']; // Try common names
      const yearlyGoal = record['2025 Goal'] || record['Yearly Goal'];
      const question = record['Question'] || record['To Ponder'];

      if (!axisTheme) {
        console.warn("Skipping row because 'Day Theme'/'Axis'/'Theme' column is missing or empty:", record);
        continue; // Skip rows without an axis name
      }

      // Generate lowercase document ID from the theme/axis name
      const axisId = axisTheme.trim().toLowerCase().replace(/\s+/g, '-'); // e.g., "Rest and preparation" -> "rest-and-preparation"
      if (!axisId) {
         console.warn("Skipping row because generated axis ID is empty:", record);
         continue;
      }

      console.log(`Processing Axis: ${axisTheme} (ID: ${axisId})`);

      // Prepare milestones array
      const milestones = [];
      // Loop through potential milestone columns (adjust range if needed)
      for (let i = 1; i <= 4; i++) { // Assuming up to Milestone 4 based on screenshots
        const milestoneText = record[`Milestone ${i}`];
        const dueDateStr = record[`Due Date ${i}`] || record[`Date ${i}`]; // Try common variations
        const completionDateStr = record[`Completion Date ${i}`];

        // Only add milestone if text exists
        if (milestoneText && milestoneText.trim() !== '') {
          milestones.push({
            text: milestoneText.trim(),
            dueDate: parseDateToTimestamp(dueDateStr), // Parse due date
            completionDate: parseDateToTimestamp(completionDateStr) // Parse completion date (will be null if empty/invalid)
          });
        }
      }

      // Data object to save to Firestore
      const axisData = {
        axisName: axisTheme.trim(), // Store the original theme name
        yearlyGoal: yearlyGoal ? yearlyGoal.trim() : '',
        question: question ? question.trim() : '',
        milestones: milestones // The array of milestone objects
      };

      // Get Firestore document reference
      const docRef = doc(db, "axes", axisId);

      // Save data using setDoc (creates or overwrites)
      await setDoc(docRef, axisData);
      console.log(` -> Successfully saved data for axis: ${axisId}`);

    } // End loop through records

    console.log("----------------------------------------");
    console.log("Firestore data import completed successfully!");
    console.log("----------------------------------------");

  } catch (error) {
    console.error("----------------------------------------");
    console.error("Error during Firestore data import:", error);
    console.error("----------------------------------------");
    if (error.code === 'ENOENT') {
        console.error(`\n!!! Make sure the file "${CSV_FILE_PATH}" exists in the same directory as the script !!!\n`);
    } else if (error.message.includes('Invalid CSV')) {
         console.error(`\n!!! There might be an issue with the CSV format. Ensure it's a valid CSV file. !!!\n`);
    } else {
        console.error(`\n!!! Check Firestore connection and permissions. !!!\n`);
    }
  }
}

// Run the import function
importAxesData();

