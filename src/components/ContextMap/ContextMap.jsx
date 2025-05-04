// src/components/ContextMap/ContextMap.jsx
import React, { useState, useEffect } from 'react'; // React is needed for React.memo
import styles from './ContextMap.module.css';
import { db } from '../../firebaseConfig';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    limit,
} from "firebase/firestore";

// --- Helper Functions ---
function getWeekId(date = new Date()) {
    const d = new Date(date.valueOf());
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// <<< Helper function to find the next upcoming milestone (copied from DailyView) >>>
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

// Renamed component slightly for memo export
function ContextMapInternal({ axisName }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    // Updated state to include nextMilestone (will store the text)
    const [contextData, setContextData] = useState({
        stretchGoal: null,
        yearlyGoal: null,
        monthlyTheme: null,
        nextMilestone: null, // Will store the *text* of the next milestone
        weeklyGoal: null,
        steps: []
    });

    // Effect to fetch data when axisName prop changes
    useEffect(() => {
        const fetchContextData = async () => {
            if (!axisName) {
                setContextData({ stretchGoal: null, yearlyGoal: null, monthlyTheme: null, nextMilestone: null, weeklyGoal: null, steps: [] });
                setIsLoading(false); setError(null);
                console.log("ContextMap: No axisName provided, clearing data.");
                return;
            }

            setIsLoading(true); setError(null);

            const today = new Date();
            const lastWeekDate = new Date(today);
            lastWeekDate.setDate(today.getDate() - 7);
            const previousWeekId = getWeekId(lastWeekDate);

            const currentYear = today.getFullYear();
            const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
            const currentMonthId = `${currentYear}-${currentMonth}`;

            console.log(`ContextMap: Fetching data for Axis=${axisName}, PreviousWeek=${previousWeekId}, Month=${currentMonthId}`);

            try {
                // Prepare promises
                const monthlyPlanPromise = getDoc(doc(db, "monthlyPlans", currentMonthId));
                const axisQuery = query(collection(db, "axes"), where("axisName", "==", axisName), limit(1));
                const axisDataPromise = getDocs(axisQuery);
                const weeklyPlanPromise = getDoc(doc(db, "weeklyPlan", previousWeekId));
                const weeklyStepsQuery = query(collection(db, "weeklySteps"),
                    where("weekId", "==", previousWeekId),
                    where("axisTheme", "==", axisName),
                    where("taskType", "==", "planned")
                );
                const weeklyStepsPromise = getDocs(weeklyStepsQuery);

                const results = await Promise.allSettled([
                    monthlyPlanPromise, axisDataPromise, weeklyPlanPromise, weeklyStepsPromise
                ]);

                // Initialize variables
                let fetchedMonthlyTheme = "Month Focus Not Set";
                let fetchedAxisData = null;
                let fetchedNextMilestoneText = null; // <<< Variable for milestone TEXT
                let fetchedWeeklyGoal = "";
                let fetchedSteps = [];

                // Process Monthly Plan (Index 0)
                const monthlyPlanResult = results[0];
                if (monthlyPlanResult.status === 'fulfilled' && monthlyPlanResult.value.exists()) {
                    fetchedMonthlyTheme = monthlyPlanResult.value.data().monthFocus || "Month Focus Not Set";
                } else if (monthlyPlanResult.status === 'rejected') {
                    console.error("Error fetching monthlyPlan:", monthlyPlanResult.reason);
                    fetchedMonthlyTheme = "Error Loading Month";
                } else { console.log(`No monthlyPlan document found for ${currentMonthId}`); }

                // Process Axis Data (Index 1) - Contains Stretch, Yearly, and the milestones array
                const axisResult = results[1];
                if (axisResult.status === 'fulfilled' && !axisResult.value.empty) {
                    fetchedAxisData = axisResult.value.docs[0].data();
                    // <<< Use findUpcomingMilestone helper function >>>
                    const upcomingMilestoneObject = findUpcomingMilestone(fetchedAxisData?.milestones);
                    // Store only the text of the found milestone
                    fetchedNextMilestoneText = upcomingMilestoneObject ? upcomingMilestoneObject.text : null;
                    console.log("ContextMap: Found upcoming milestone:", upcomingMilestoneObject);
                } else if (axisResult.status === 'rejected') {
                     console.error("Error fetching axes data:", axisResult.reason);
                } else { console.warn(`Axis data not found for: ${axisName}`); }

                // Process Weekly Plan (Index 2)
                const weeklyPlanResult = results[2];
                if (weeklyPlanResult.status === 'fulfilled' && weeklyPlanResult.value.exists()) {
                    fetchedWeeklyGoal = weeklyPlanResult.value.data().axisGoals?.[axisName] || "";
                    console.log(`ContextMap: Found weeklyPlan/${previousWeekId}. Goal for ${axisName}:`, fetchedWeeklyGoal || '(Not set in map)');
                } else if (weeklyPlanResult.status === 'rejected') {
                    console.error("Error fetching weeklyPlan:", weeklyPlanResult.reason);
                } else {
                    console.log(`ContextMap: No weeklyPlan document found for ${previousWeekId}`);
                }

                // Process Weekly Steps (Index 3)
                const weeklyStepsResult = results[3];
                if (weeklyStepsResult.status === 'fulfilled') {
                    weeklyStepsResult.value.forEach(doc => { fetchedSteps.push({ id: doc.id, ...doc.data() }); });
                    console.log(`ContextMap: Found ${fetchedSteps.length} planned steps for ${axisName} in week ${previousWeekId}`);
                } else if (weeklyStepsResult.status === 'rejected') {
                    console.error("Error fetching weeklySteps:", weeklyStepsResult.reason);
                }

                // Update state
                setContextData({
                    stretchGoal: fetchedAxisData?.paretoGoal || fetchedAxisData?.stretchGoal || null,
                    yearlyGoal: fetchedAxisData?.yearlyGoal || null,
                    monthlyTheme: fetchedMonthlyTheme,
                    nextMilestone: fetchedNextMilestoneText, // <<< Set milestone text state
                    weeklyGoal: fetchedWeeklyGoal,
                    steps: fetchedSteps
                });

            } catch (err) {
                console.error("Unexpected error fetching context data: ", err);
                setError("Failed to load context map data.");
                setContextData({ stretchGoal: null, yearlyGoal: null, monthlyTheme: "Error", nextMilestone: "Error", weeklyGoal: "Error", steps: [] });
            } finally {
                setIsLoading(false);
            }
        };

        fetchContextData();
    }, [axisName]); // Re-run effect ONLY when axisName prop changes

    // Render Loading/Error states
    if (isLoading) { return <div className={styles.loading}>Loading Context...</div>; }
    if (error) { return <div className={styles.error}>{error}</div>; }

    // Render the context map
    return (
        <div className={styles.contextMapContainer}>
            <p className={styles.contextStretch}>
                Stretch: {contextData.stretchGoal || <i className={styles.notSet}>Not Set</i>}
            </p>
            <p className={styles.contextYear}>
                Year: {contextData.yearlyGoal || <i className={styles.notSet}>Not Set</i>}
            </p>
            <p className={styles.contextMonth}>
                Month: {contextData.monthlyTheme || <i className={styles.notSet}>Not Set</i>}
            </p>
            {/* <<< Display Next Milestone Text >>> */}
            <p className={styles.contextMilestone}>
                Milestone: {contextData.nextMilestone || <i className={styles.notSet}>Not Set</i>}
            </p>
            <p className={styles.contextWeek}>
                Week: {contextData.weeklyGoal || <i className={styles.notSet}>Not Set</i>}
            </p>
            <div className={styles.stepsSection}>
                <h4 className={styles.stepsTitle}>Next Steps Planned:</h4>
                {contextData.steps.length > 0 ? (
                    <ul className={styles.stepsList}>
                        {contextData.steps.map(step => (
                            <li key={step.id}>{step.plannedSteps}</li>
                        ))}
                    </ul>
                ) : (
                    <p className={styles.noSteps}><i>None for this axis this week.</i></p>
                )}
            </div>
        </div>
    );
}

// Wrap component export in React.memo
export default React.memo(ContextMapInternal);
