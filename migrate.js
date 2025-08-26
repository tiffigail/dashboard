// Example Node.js Script Logic for Data Migration
//
// To run this script:
// 1. Make sure you have Node.js installed.
// 2. Install the Firebase Admin SDK: npm install firebase-admin
// 3. Place your Firebase service account key JSON file (e.g., 'serviceAccountKey.json')
//    in the same directory as this script.
// 4. Update the 'serviceAccount' path below if your JSON file has a different name.
// 5. Run the script from your terminal: node migrate_weekly_plans.js
//
// IMPORTANT: BACK UP YOUR FIRESTORE DATA BEFORE RUNNING THIS SCRIPT!
// TEST ON A DEVELOPMENT DATABASE FIRST!

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Adjust path if needed

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// --- Helper function to get Monday and Sunday of a given ISO week ---
// Equivalent to Python's get_dates_from_week_id
function getDatesFromWeekId(weekId) {
    try {
        const [yearStr, weekNumStr] = weekId.split('-W');
        const year = parseInt(yearStr);
        const weekNum = parseInt(weekNumStr);

        // ISO week date: YYYY-Www-D (D=1 for Monday, 7 for Sunday)
        // We want the Monday of week 1 of the year
        const jan1 = new Date(year, 0, 1);
        let firstMondayOfYear;

        // Find the first Monday of the year (ISO week 1 starts on Monday)
        // If Jan 1 is Thu, Fri, Sat, Sun, first Monday is next Monday
        if (jan1.getDay() > 4 || jan1.getDay() === 0) { // getDay() returns 0 for Sunday, 1 for Monday...6 for Saturday
            firstMondayOfYear = new Date(year, 0, 1 + (8 - jan1.getDay()) % 7);
        } else { // If Jan 1 is Mon, Tue, Wed
            firstMondayOfYear = new Date(year, 0, 1 - jan1.getDay() + 1);
        }

        // Calculate the start date of the target week
        const startDateOfWeek = new Date(firstMondayOfYear);
        startDateOfWeek.setDate(firstMondayOfYear.getDate() + (weekNum - 1) * 7);

        // Calculate the end date of the target week (Sunday)
        const endDateOfWeek = new Date(startDateOfWeek);
        endDateOfWeek.setDate(startDateOfWeek.getDate() + 6);

        return { startDate: startDateOfWeek, endDate: endDateOfWeek };

    } catch (e) {
        console.error(`Error parsing week_id ${weekId}:`, e);
        return { startDate: null, endDate: null };
    }
}


// --- Main Migration Function ---
async function migrateWeeklyPlans() {
    console.log("Starting migration for new_weeklyPlans...");
    
    const weeklyPlansRef = db.collection('new_weeklyPlans');
    const snapshot = await weeklyPlansRef.get();

    const batch = db.batch();
    let updateCount = 0;

    // Define the cutoff week for setting completionDate
    // All weeks <= this will have completionDate set to week_end_date
    // All weeks > this will have completionDate set to null
    const CUTOFF_WEEK_NUM = 27; // As per user request: "W27 and before"

    for (const docSnapshot of snapshot.docs) {
        const docData = docSnapshot.data();
        const docId = docSnapshot.id; // This is the weekId, e.g., "2025-W16"

        console.log(`Processing weeklyPlan: ${docId}`);

        // Extract week number from docId for comparison
        let currentWeekNum;
        try {
            const parts = docId.split('-W');
            if (parts.length === 2) {
                currentWeekNum = parseInt(parts[1]);
            } else {
                throw new Error("Invalid week ID format");
            }
        } catch (e) {
            console.log(`Skipping ${docId} due to invalid week ID format: ${e.message}`);
            continue;
        }

        // Calculate week start and end dates from weekId
        const { startDate: weekStartDate, endDate: weekEndDate } = getDatesFromWeekId(docId);
        if (!weekStartDate || !weekEndDate) {
            console.log(`Skipping ${docId} due to invalid date calculation error.`);
            continue;
        }

        let updatedWeeklyGoals = {};
        let needsUpdate = false;

        if (docData.weeklyGoals && typeof docData.weeklyGoals === 'object') {
            for (const axisId in docData.weeklyGoals) {
                if (Object.prototype.hasOwnProperty.call(docData.weeklyGoals, axisId)) {
                    const goalObj = { ...docData.weeklyGoals[axisId] }; // Create a shallow copy to modify

                    // Check if dueDate or completionDate are missing
                    if (goalObj.dueDate === undefined || goalObj.completionDate === undefined) {
                        needsUpdate = true;
                        
                        // Set dueDate to the end of the week (Sunday)
                        goalObj.dueDate = admin.firestore.Timestamp.fromDate(weekEndDate); 
                        
                        // Set completionDate based on whether it's a past week (W27 and before)
                        if (currentWeekNum <= CUTOFF_WEEK_NUM) {
                            goalObj.completionDate = admin.firestore.Timestamp.fromDate(weekEndDate);
                            // Optionally, set status to 'completed' if completionDate is set
                            if (goalObj.status && goalObj.status !== 'completed') {
                                goalObj.status = 'completed'; // Ensure status reflects completion
                            }
                        } else {
                            goalObj.completionDate = null; // For current/future weeks
                            // Ensure status is not 'completed' if completionDate is null
                            if (goalObj.status && goalObj.status === 'completed') {
                                goalObj.status = 'todo'; // Or 'in-progress' if you have that state
                            }
                        }
                    }
                    updatedWeeklyGoals[axisId] = goalObj;
                }
            }

            if (needsUpdate) {
                batch.update(docSnapshot.ref, { weeklyGoals: updatedWeeklyGoals });
                updateCount++;
                console.log(`  - Marked ${docId} for update (added dates and status to weeklyGoals).`);
            } else {
                console.log(`  - ${docId} already has due/completion dates. No update needed.`);
            }
        } else {
            console.log(`  - ${docId} has no 'weeklyGoals' map or it's not an object. No update needed for goals.`);
        }

        // Commit batch periodically (Firestore batch limit is 500 operations)
        if (updateCount % 499 === 0 && updateCount > 0) { // Commit just before hitting 500
            console.log(`Committing batch of ${updateCount} updates...`);
            await batch.commit();
            batch = db.batch(); // Start a new batch
            console.log("Batch committed. Continuing...");
        }
    }

    // Commit any remaining updates
    if (updateCount > 0) {
        console.log(`Committing final batch of ${updateCount} updates...`);
        await batch.commit();
        console.log("Final batch committed.");
    } else {
        console.log("No documents needed updates.");
    }

    console.log("Migration finished.");
}

// Run the migration
migrateWeeklyPlans().catch(console.error);
