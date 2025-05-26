// src/components/ContextMap/ContextMap.jsx
import React, { useState, useEffect } from 'react';
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
    onSnapshot
} from "firebase/firestore";

// --- Helper Functions ---
function getWeekId(date = new Date()) { // ISO Week ID (Week starts Monday)
    const d = new Date(date.valueOf()); // Use valueOf to clone
    const dayNum = d.getUTCDay() || 7; // getUTCDay() is 0 for Sunday
    d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Adjust to Thursday of that week
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function findUpcomingMilestone(milestones) {
    if (!Array.isArray(milestones)) {
        console.warn("findUpcomingMilestone: Input is not an array.", milestones);
        return null;
    }
    return milestones.find(m => m.completionDate === null || m.completionDate === undefined) || null;
}
// --- End Helper Functions ---

function ContextMapInternal({ axisName }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [contextData, setContextData] = useState({
        stretchGoal: null,
        yearlyGoal: null,
        monthlyTheme: null,
        nextMilestone: null,
        weeklyGoal: null,
        steps: []
    });

    useEffect(() => {
        setContextData({ stretchGoal: null, yearlyGoal: null, monthlyTheme: null, nextMilestone: null, weeklyGoal: null, steps: [] });
        setError(null);
        setIsLoading(true);
        console.log("ContextMap: useEffect triggered for axis:", axisName);

        if (!axisName) {
            setIsLoading(false);
            console.log("ContextMap: No axisName provided, clearing data.");
            return;
        }

        const today = new Date();
        // *** MODIFIED: Calculate currentWeekId for fetching current week's data ***
        const currentWeekId = getWeekId(today);
        // *** END MODIFICATION ***
        const currentYear = today.getFullYear();
        const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
        const currentMonthId = `${currentYear}-${currentMonth}`;

        let unsubscribeMonthly = () => {};

        try {
            const monthlyPlanRef = doc(db, "monthlyPlans", currentMonthId);
            unsubscribeMonthly = onSnapshot(monthlyPlanRef, (docSnap) => {
                let fetchedMonthlyTheme = "Month Focus Not Set";
                if (docSnap.exists()) {
                    fetchedMonthlyTheme = docSnap.data().monthFocus || "Month Focus Not Set";
                    // console.log("ContextMap (onSnapshot): Updated monthly theme:", fetchedMonthlyTheme);
                } else {
                    // console.log(`ContextMap (onSnapshot): No monthlyPlan document found for ${currentMonthId}`);
                }
                setContextData(prevData => ({
                    ...prevData,
                    monthlyTheme: fetchedMonthlyTheme
                }));
            }, (err) => {
                console.error("Error listening to monthlyPlan:", err);
                setError(prevError => prevError || "Failed to listen to monthly plan updates.");
                setContextData(prevData => ({ ...prevData, monthlyTheme: "Error" }));
            });
        } catch (err) {
            console.error("Error setting up monthlyPlan listener:", err);
            setError(prevError => prevError || "Failed to set up listener.");
            setContextData(prevData => ({ ...prevData, monthlyTheme: "Error" }));
        }

        const fetchOtherData = async () => {
            try {
                const axisQueryRef = query(collection(db, "axes"), where("axisName", "==", axisName), limit(1));
                // *** MODIFIED: Use currentWeekId for weeklyPlan and weeklySteps ***
                const weeklyPlanRef = doc(db, "weeklyPlan", currentWeekId);
                const weeklyStepsQueryRef = query(collection(db, "weeklySteps"),
                    where("weekId", "==", currentWeekId),
                    where("axisTheme", "==", axisName),
                    where("taskType", "==", "planned")
                );
                // *** END MODIFICATION ***

                const [axisSnap, weeklyPlanSnap, weeklyStepsSnap] = await Promise.all([
                    getDocs(axisQueryRef),
                    getDoc(weeklyPlanRef),
                    getDocs(weeklyStepsQueryRef)
                ]);

                let fetchedAxisData = null;
                let fetchedNextMilestoneText = null;
                let fetchedWeeklyGoal = "";
                let fetchedSteps = [];

                if (!axisSnap.empty) {
                    fetchedAxisData = axisSnap.docs[0].data();
                    const upcomingMilestoneObject = findUpcomingMilestone(fetchedAxisData?.milestones);
                    fetchedNextMilestoneText = upcomingMilestoneObject ? upcomingMilestoneObject.text : null;
                    // console.log("ContextMap (fetchOther): Found axis data & milestone:", fetchedNextMilestoneText || "None");
                } else { console.warn(`ContextMap (fetchOther): Axis data not found for: ${axisName}`); }

                if (weeklyPlanSnap.exists()) {
                    fetchedWeeklyGoal = weeklyPlanSnap.data().axisGoals?.[axisName] || "";
                    console.log(`ContextMap (fetchOther): Found weeklyPlan goal for ${currentWeekId}:`, fetchedWeeklyGoal || '(Not set)');
                } else { console.log(`ContextMap (fetchOther): No weeklyPlan document found for ${currentWeekId}`); }

                weeklyStepsSnap.forEach(doc => { fetchedSteps.push({ id: doc.id, ...doc.data() }); });
                console.log(`ContextMap (fetchOther): Found ${fetchedSteps.length} planned steps for ${axisName} in ${currentWeekId}.`);

                setContextData(prevData => ({
                    ...prevData,
                    stretchGoal: fetchedAxisData?.paretoGoal || fetchedAxisData?.stretchGoal || null,
                    yearlyGoal: fetchedAxisData?.yearlyGoal || null,
                    nextMilestone: fetchedNextMilestoneText,
                    weeklyGoal: fetchedWeeklyGoal,
                    steps: fetchedSteps
                }));

            } catch (err) {
                console.error("Error fetching other context data: ", err);
                setError(prevError => prevError || "Failed to load some context map data.");
                setContextData(prevData => ({
                    ...prevData,
                    stretchGoal: "Error",
                    yearlyGoal: "Error",
                    nextMilestone: "Error",
                    weeklyGoal: "Error",
                    steps: []
                }));
            } finally {
                setIsLoading(false);
            }
        };

        fetchOtherData();

        return () => {
            console.log("ContextMap: Cleaning up listener for axis:", axisName);
            unsubscribeMonthly();
        };

    }, [axisName]);

    if (isLoading && !contextData.monthlyTheme) { 
        return <div className={styles.loading}>Loading Context...</div>;
    }
    
    return (
        <div className={styles.contextMapContainer}>
            {error && <p className={styles.errorTextSmall}>Error loading some data. Displaying what's available.</p>}
            <p className={styles.contextStretch}>Stretch: {contextData.stretchGoal || <i className={styles.notSet}>Not Set</i>}</p>
            <p className={styles.contextYear}>Year: {contextData.yearlyGoal || <i className={styles.notSet}>Not Set</i>}</p>
            <p className={styles.contextMonth}>Month: {contextData.monthlyTheme || (isLoading ? <i className={styles.notSet}>Loading...</i> : <i className={styles.notSet}>Not Set</i>)}</p>
            <p className={styles.contextMilestone}>Milestone: {contextData.nextMilestone || <i className={styles.notSet}>Not Set</i>}</p>
            <p className={styles.contextWeek}>Week: {contextData.weeklyGoal || <i className={styles.notSet}>Not Set</i>}</p>
            <div className={styles.stepsSection}>
                <h4 className={styles.stepsTitle}>Next Steps Planned:</h4>
                {contextData.steps.length > 0 ? (
                    <ul className={styles.stepsList}>
                        {contextData.steps.map(step => (
                            <li key={step.id}>{step.plannedSteps}</li>
                        ))}
                    </ul>
                )
                : (<p className={styles.noSteps}><i>None for this axis this week.</i></p>)}
            </div>
        </div>
    );
}

export default React.memo(ContextMapInternal);