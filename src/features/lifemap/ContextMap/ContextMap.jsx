// src/components/ContextMap/ContextMap.jsx
import React, { useState, useEffect } from 'react';
import styles from '@/features/lifemap/ContextMap/ContextMap.module.css';
import { db } from '@/firebaseConfig';
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

import { getWeekId } from '@/utils/dateUtils';

function ContextMapInternal({ axisName }) {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [contextData, setContextData] = useState({
        stretchGoal: null,
        yearlyGoal: null,
        monthlyTheme: null,
        nextMilestone: null,
        weeklyAxisGoal: null,
        steps: []
    });

    useEffect(() => {
        // Reset state when axisName changes
        setContextData({ stretchGoal: null, yearlyGoal: null, monthlyTheme: null, nextMilestone: null, weeklyAxisGoal: null, steps: [] });
        setError(null);
        setIsLoading(true);

        if (!axisName) {
            setIsLoading(false);
            return;
        }

        const fetchAllContextData = async () => {
            try {
                // --- 1. Get Axis ID ---
                const axisQuery = query(collection(db, "new_axes"), where("axisName", "==", axisName), limit(1));
                const axisSnap = await getDocs(axisQuery);
                if (axisSnap.empty) {
                    throw new Error(`Axis '${axisName}' not found.`);
                }
                const axisId = axisSnap.docs[0].id;

                // --- 2. Get all Goals for this Axis ---
                const goalsQuery = query(collection(db, "new_goals"), where("axisId", "==", axisId));
                const goalsSnap = await getDocs(goalsQuery);
                let stretchGoal = null;
                let yearlyGoal = null;
                let yearlyGoalId = null;
                goalsSnap.forEach(doc => {
                    const goal = doc.data();
                    if (goal.type === 'stretch' || goal.type === 'pareto') {
                        stretchGoal = goal.title;
                    }
                    if (goal.type === 'yearly' && goal.year === new Date().getFullYear()) {
                        yearlyGoal = goal.title;
                        yearlyGoalId = goal.goalId;
                    }
                });

                // --- 3. Get all Milestones for this Axis and find the next one ---
                let nextMilestone = null;
                if (yearlyGoalId) {
                    const milestonesQuery = query(collection(db, "new_milestones"), where("goalId", "==", yearlyGoalId));
                    const milestonesSnap = await getDocs(milestonesQuery);
                    const incompleteMilestones = milestonesSnap.docs
                        .map(doc => doc.data())
                        .filter(m => m.status !== 'completed')
                        .sort((a, b) => a.dueDate.toDate() - b.dueDate.toDate());
                    if (incompleteMilestones.length > 0) {
                        nextMilestone = incompleteMilestones[0].title;
                    }
                }

                // --- 4. Get the current Weekly Plan and the goal for this axis ---
                const currentWeekId = getWeekId(new Date());
                const weeklyPlanRef = doc(db, "new_weeklyPlans", currentWeekId);
                const weeklyPlanSnap = await getDoc(weeklyPlanRef);
                let weeklyAxisGoal = null;
                if (weeklyPlanSnap.exists()) {
                    const planData = weeklyPlanSnap.data();
                    if (planData.weeklyGoals && planData.weeklyGoals[axisName]) {
                        weeklyAxisGoal = planData.weeklyGoals[axisName];
                    }
                }

                // --- 5. Get the planned steps for this week and axis ---
                const stepsQuery = query(collection(db, "new_tasks"),
                    where("parentId", "==", currentWeekId),
                    where("axisTheme", "==", axisName),
                    where("taskType", "==", "planned")
                );
                const stepsSnap = await getDocs(stepsQuery);
                
                // **MODIFIED**: Use a Map to get unique steps by their title
                const uniqueStepsMap = new Map();
                stepsSnap.docs.forEach(doc => {
                    const taskData = doc.data();
                    uniqueStepsMap.set(taskData.title, { id: doc.id, text: taskData.title });
                });
                const uniqueSteps = Array.from(uniqueStepsMap.values());


                // --- 6. Set all state ---
                setContextData(prevData => ({
                    ...prevData, // Keep monthly theme from other listener
                    stretchGoal: stretchGoal,
                    yearlyGoal: yearlyGoal,
                    nextMilestone: nextMilestone,
                    weeklyAxisGoal: weeklyAxisGoal,
                    steps: uniqueSteps // Use the de-duplicated array
                }));

            } catch (err) {
                console.error("Error fetching context data:", err);
                setError("Failed to load context.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllContextData();

        // The monthly listener can remain as is, since it reads from a collection we didn't refactor
        const today = new Date();
        const currentMonthId = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        const monthlyPlanRef = doc(db, "monthlyPlans", currentMonthId);


        const unsubscribeMonthly = onSnapshot(monthlyPlanRef, (docSnap) => {
        let fetchedMonthlyTheme = "Month Focus Not Set";
    
    // Add these logs to see what the listener finds
    if (docSnap.exists()) {
        fetchedMonthlyTheme = docSnap.data().monthFocus || "Month Focus Not Set";
    }
    
    setContextData(prevData => ({
        ...prevData,
        monthlyTheme: fetchedMonthlyTheme
    }));
}, (err) => {
    console.error("Error listening to monthlyPlan:", err);
    setError(prevError => prevError || "Failed to listen to monthly plan updates.");
});

        return () => {
            unsubscribeMonthly();
        };

    }, [axisName]);

    if (isLoading) {
        return <div className={styles.loading}>Loading Context...</div>;
    }
    
    return (
        <div className={styles.contextMapContainer}>
            {error && <p className={styles.errorTextSmall}>{error}</p>}
            <p className={styles.contextStretch}>Stretch: {contextData.stretchGoal || <i className={styles.notSet}>Not Set</i>}</p>
            <p className={styles.contextYear}>Year: {contextData.yearlyGoal || <i className={styles.notSet}>Not Set</i>}</p>
            <p className={styles.contextMonth}>Month: {contextData.monthlyTheme || <i className={styles.notSet}>Not Set</i>}</p>
            <p className={styles.contextMilestone}>Milestone: {contextData.nextMilestone || <i className={styles.notSet}>Not Set</i>}</p>
            <p className={styles.contextWeek}>Week Goal: {contextData.weeklyAxisGoal?.goal || <i className={styles.notSet}>Not Set</i>}</p>
            <div className={styles.stepsSection}>
                <h4 className={styles.stepsTitle}>Next Steps Planned:</h4>
                {contextData.steps.length > 0 ? (
                    <ul className={styles.stepsList}>
                        {contextData.steps.map(step => (
                            <li key={step.id}>{step.text}</li>
                        ))}
                    </ul>
                )
                : (<p className={styles.noSteps}><i>None for this axis this week.</i></p>)}
            </div>
        </div>
    );
}

export default React.memo(ContextMapInternal);