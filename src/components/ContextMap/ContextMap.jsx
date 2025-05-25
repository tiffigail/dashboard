import React, { useState, useEffect } from 'react';
import styles from './ContextMap.module.css';
import { db } from '../../firebaseConfig';
import {
    collection,
    doc,
    getDoc, // Keep for other reads if needed
    getDocs, // Keep for other reads if needed
    query,
    where,
    limit,
    onSnapshot // <-- Import onSnapshot
} from "firebase/firestore";

// --- Helper Functions (Keep as they are) ---
// ... (getWeekId, findUpcomingMilestone) ...
// --- End Helper Functions ---
function getWeekId(date = new Date()) {
    const d = new Date(date.valueOf());
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function findUpcomingMilestone(milestones) {
    // Check if milestones is a valid array
    if (!Array.isArray(milestones)) {
        console.warn("findUpcomingMilestone: Input is not an array.", milestones);
        return null;
    }
    // Find the first milestone where completionDate is null or undefined
    return milestones.find(m => m.completionDate === null || m.completionDate === undefined) || null;
}
// --- End Helper Functions ---
function ContextMapInternal({ axisName }) {
    const [isLoading, setIsLoading] = useState(false); // Keep loading for initial fetch
    const [error, setError] = useState(null);
    const [contextData, setContextData] = useState({
        stretchGoal: null,
        yearlyGoal: null,
        monthlyTheme: null,
        nextMilestone: null,
        weeklyGoal: null,
        steps: []
    });

    // Effect to fetch data and set up listener
    useEffect(() => {
        // Clear previous data and reset states when axisName changes
        setContextData({ stretchGoal: null, yearlyGoal: null, monthlyTheme: null, nextMilestone: null, weeklyGoal: null, steps: [] });
        setError(null);
        setIsLoading(true); // Start loading for the new axis
        console.log("ContextMap: useEffect triggered for axis:", axisName);


        if (!axisName) {
            setIsLoading(false);
            console.log("ContextMap: No axisName provided, clearing data.");
            return; // Exit early if no axisName
        }

        const today = new Date();
        const lastWeekDate = new Date(today);
        lastWeekDate.setDate(today.getDate() - 7);
        const previousWeekId = getWeekId(lastWeekDate);
        const currentYear = today.getFullYear();
        const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
        const currentMonthId = `${currentYear}-${currentMonth}`;

        let unsubscribeMonthly = () => {}; // Function to detach listener

        // --- Set up Real-time Listener for Monthly Plan ---
        try {
            const monthlyPlanRef = doc(db, "monthlyPlans", currentMonthId);
            // onSnapshot returns an unsubscribe function
            unsubscribeMonthly = onSnapshot(monthlyPlanRef, (docSnap) => {
                let fetchedMonthlyTheme = "Month Focus Not Set";
                if (docSnap.exists()) {
                    fetchedMonthlyTheme = docSnap.data().monthFocus || "Month Focus Not Set";
                    console.log("ContextMap (onSnapshot): Updated monthly theme:", fetchedMonthlyTheme);
                } else {
                    console.log(`ContextMap (onSnapshot): No monthlyPlan document found for ${currentMonthId}`);
                }
                // Update *only* the monthly theme part of the state
                // Use functional update to safely merge with potentially ongoing fetches
                setContextData(prevData => ({
                    ...prevData,
                    monthlyTheme: fetchedMonthlyTheme
                }));
                // Consider setting loading false *here* if this is the last piece of data,
                // or manage loading state more granularly.
            }, (err) => { // Handle errors for the listener itself
                 console.error("Error listening to monthlyPlan:", err);
                 setError("Failed to listen to monthly plan updates.");
                 setContextData(prevData => ({ ...prevData, monthlyTheme: "Error" }));
            });

        } catch (err) {
             console.error("Error setting up monthlyPlan listener:", err);
             setError("Failed to set up listener.");
             setContextData(prevData => ({ ...prevData, monthlyTheme: "Error" }));
        }


        // --- Perform One-Time Fetches for Other Data ---
        // (You *could* convert these to listeners too if needed, but let's keep them simple for now)
        const fetchOtherData = async () => {
            try {
                const axisQueryRef = query(collection(db, "axes"), where("axisName", "==", axisName), limit(1));
                const weeklyPlanRef = doc(db, "weeklyPlan", previousWeekId);
                const weeklyStepsQueryRef = query(collection(db, "weeklySteps"),
                    where("weekId", "==", previousWeekId),
                    where("axisTheme", "==", axisName),
                    where("taskType", "==", "planned")
                );

                // Use Promise.all for concurrency, but fetch individually for clarity here
                const axisSnap = await getDocs(axisQueryRef);
                const weeklyPlanSnap = await getDoc(weeklyPlanRef);
                const weeklyStepsSnap = await getDocs(weeklyStepsQueryRef);

                let fetchedAxisData = null;
                let fetchedNextMilestoneText = null;
                let fetchedWeeklyGoal = "";
                let fetchedSteps = [];

                // Process Axis Data
                if (!axisSnap.empty) {
                    fetchedAxisData = axisSnap.docs[0].data();
                    const upcomingMilestoneObject = findUpcomingMilestone(fetchedAxisData?.milestones);
                    fetchedNextMilestoneText = upcomingMilestoneObject ? upcomingMilestoneObject.text : null;
                    console.log("ContextMap (fetchOther): Found axis data & milestone:", fetchedNextMilestoneText);
                } else { console.warn(`ContextMap (fetchOther): Axis data not found for: ${axisName}`); }

                // Process Weekly Plan
                if (weeklyPlanSnap.exists()) {
                    fetchedWeeklyGoal = weeklyPlanSnap.data().axisGoals?.[axisName] || "";
                    console.log(`ContextMap (fetchOther): Found weeklyPlan goal:`, fetchedWeeklyGoal || '(Not set)');
                } else { console.log(`ContextMap (fetchOther): No weeklyPlan document found for ${previousWeekId}`); }

                // Process Weekly Steps
                weeklyStepsSnap.forEach(doc => { fetchedSteps.push({ id: doc.id, ...doc.data() }); });
                console.log(`ContextMap (fetchOther): Found ${fetchedSteps.length} planned steps.`);

                // Update relevant parts of the state (excluding monthlyTheme, handled by listener)
                setContextData(prevData => ({
                    ...prevData, // Keep existing data (like monthlyTheme from listener)
                    stretchGoal: fetchedAxisData?.paretoGoal || fetchedAxisData?.stretchGoal || null,
                    yearlyGoal: fetchedAxisData?.yearlyGoal || null,
                    nextMilestone: fetchedNextMilestoneText,
                    weeklyGoal: fetchedWeeklyGoal,
                    steps: fetchedSteps
                }));

            } catch (err) {
                console.error("Error fetching other context data: ", err);
                setError("Failed to load some context map data.");
                // Update state with errors for non-realtime parts
                 setContextData(prevData => ({
                     ...prevData,
                     stretchGoal: "Error",
                     yearlyGoal: "Error",
                     nextMilestone: "Error",
                     weeklyGoal: "Error",
                     steps: []
                 }));
            } finally {
                setIsLoading(false); // Set loading false after non-realtime fetches complete
            }
        };

        fetchOtherData(); // Call the async function to fetch non-realtime data

        // --- Cleanup Function ---
        // This runs when the component unmounts OR when useEffect re-runs (before setting up the new listener)
        return () => {
            console.log("ContextMap: Cleaning up listener for axis:", axisName);
            unsubscribeMonthly(); // Detach the listener to prevent memory leaks
        };

    }, [axisName]); // Re-run effect ONLY when axisName prop changes

    // Render Loading/Error states (keep as they are)
    if (isLoading) { return <div className={styles.loading}>Loading Context...</div>; }
    if (error) { return <div className={styles.error}>{error}</div>; }

    // Render the context map (keep as it is)
    return (
        <div className={styles.contextMapContainer}>
            {/* ... keep all the <p> and <ul> elements ... */}
            <p className={styles.contextStretch}>Stretch: {contextData.stretchGoal || <i className={styles.notSet}>Not Set</i>}</p>
            <p className={styles.contextYear}>Year: {contextData.yearlyGoal || <i className={styles.notSet}>Not Set</i>}</p>
            <p className={styles.contextMonth}>Month: {contextData.monthlyTheme || <i className={styles.notSet}>Not Set</i>}</p>
            <p className={styles.contextMilestone}>Milestone: {contextData.nextMilestone || <i className={styles.notSet}>Not Set</i>}</p>
            <p className={styles.contextWeek}>Week: {contextData.weeklyGoal || <i className={styles.notSet}>Not Set</i>}</p>
            <div className={styles.stepsSection}>
                <h4 className={styles.stepsTitle}>Next Steps Planned:</h4>
                {contextData.steps.length > 0 ? (<ul className={styles.stepsList}>{contextData.steps.map(step => (<li key={step.id}>{step.plannedSteps}</li>))}</ul>)
                 : (<p className={styles.noSteps}><i>None for this axis this week.</i></p>)}
            </div>
        </div>
    );
}

export default React.memo(ContextMapInternal); // Keep memoization