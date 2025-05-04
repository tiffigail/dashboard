// src/components/WeeklyView/WeeklyView.jsx
import React, { useState, useEffect } from 'react';
import styles from './WeeklyView.module.css'; // Import styles for this component
import Modal from '../Modal/Modal'; // Import Modal component
import WeeklyPlanner from '../WeeklyPlanner/WeeklyPlanner'; // Import the planner component
import BudgetForm from '../BudgetForm/BudgetForm'; // Import BudgetForm
import { db } from '../../firebaseConfig'; // Import Firestore db instance
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    updateDoc,
    limit
} from "firebase/firestore";

// --- Helper Functions ---

// Get Week ID (ISO 8601 - Monday Start)
function getWeekId(date = new Date()) {
    const d = new Date(date.valueOf());
    const dayNum = d.getUTCDay() || 7; // Sunday (0) becomes 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Adjust to Thursday of the week
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// Get Week Dates (ISO 8601 - Monday Start)
function getWeekDates(weekId) {
    try {
        const [year, week] = weekId.split('-W').map(Number);
        const firstDayOfYear = new Date(Date.UTC(year, 0, 1));
        const firstDayOfWeek = firstDayOfYear.getUTCDay(); // 0=Sun, 1=Mon,...
        // Calculate offset to find the first Monday of the year
        const dayOffset = (firstDayOfWeek <= 1) ? (1 - firstDayOfWeek) : (8 - firstDayOfWeek);
        const firstMondayOfYear = new Date(Date.UTC(year, 0, 1 + dayOffset));
        // Calculate the start date (Monday) of the target week
        const startDate = new Date(firstMondayOfYear.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
        // Calculate the end date (Sunday) of the target week
        const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
        const options = { month: 'short', day: 'numeric' };
        return {
            start: startDate.toLocaleDateString(undefined, options),
            end: endDate.toLocaleDateString(undefined, options),
        };
    } catch (e) {
        console.error("Error parsing week ID:", weekId, e);
        return { start: 'N/A', end: 'N/A' };
    }
}
// --- End Date Functions ---

function findUpcomingMilestone(milestones) {
    if (!Array.isArray(milestones)) return null;
    return milestones.find(m => m.completionDate === null || m.completionDate === undefined) || null;
}

const axisNameToCssVarSuffix = (axisName) => {
    if (!axisName || typeof axisName !== 'string') return 'default';
    return axisName.trim().toLowerCase().replace(/\s+/g, '-').replace(/\+/g, '-plus-');
};

const axisDisplayOrder = [
  "Rest and preparation", "Physical", "Financial", "Gear",
  "ON TRACK N+1", "Misdirect", "Environment"
];

// Day/Axis Mapping (0=Sun, 6=Sat - still used for data lookup)
const dayIndexToAxisTheme = {
    0: "Rest and preparation", 1: "Physical", 2: "Financial", 3: "Gear",
    4: "ON TRACK N+1", 5: "Misdirect", 6: "Environment"
};
const dayIndexToName = {
    0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday",
    4: "Thursday", 5: "Friday", 6: "Saturday"
};
// Display order Mon-Sun
const displayDayOrder = [1, 2, 3, 4, 5, 6, 0];
// --- End Helper Functions ---


function WeeklyView({ onNavigate }) {
    // State declarations...
    const [isPlannerModalOpen, setIsPlannerModalOpen] = useState(false);
    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [displayWeekId, setDisplayWeekId] = useState("");
    const [displayWeekDates, setDisplayWeekDates] = useState({ start: '', end: '' });
    const [weeklyPlanData, setWeeklyPlanData] = useState(null);
    const [allAxesData, setAllAxesData] = useState({});
    const [weeklyStepsData, setWeeklyStepsData] = useState({});
    const [allWeeklyStepsFlat, setAllWeeklyStepsFlat] = useState([]);
    const [isSavingGoal, setIsSavingGoal] = useState(false);

    // Fetch data on mount
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            const today = new Date();
            // --- MODIFIED: Calculate LAST week's date and ID ---
            const lastWeekDate = new Date(today);
            lastWeekDate.setDate(today.getDate() - 7); // Subtract 7 days
            const targetWeekId = getWeekId(lastWeekDate); // Use last week's date
            // --- End Modification ---
            setDisplayWeekId(targetWeekId); // Set state with last week's ID
            setDisplayWeekDates(getWeekDates(targetWeekId)); // Get dates for last week

            // --- MODIFIED: Updated log message ---
            console.log(`Fetching weekly data for LAST week (ISO): ${targetWeekId}`);
            // --- End Modification ---
            try {
                // Fetch Weekly Plan, All Axes, and Planned Weekly Steps concurrently
                // Queries will now use the LAST week ID stored in targetWeekId
                const weeklyPlanRef = doc(db, "weeklyPlan", targetWeekId);
                const axesCollectionRef = collection(db, "axes");
                const stepsCollectionRef = collection(db, "weeklySteps");
                const stepsQuery = query(
                    stepsCollectionRef,
                    where("weekId", "==", targetWeekId), // Uses last week's ID
                    where("taskType", "==", "planned")
                );

                const [weeklyPlanSnap, axesSnapshot, stepsSnapshot] = await Promise.all([
                    getDoc(weeklyPlanRef),
                    getDocs(axesCollectionRef),
                    getDocs(stepsQuery)
                ]);

                // Process Weekly Plan
                const planData = weeklyPlanSnap.exists() ? weeklyPlanSnap.data() : { axisGoals: {}, axisGoalStatus: {} };
                setWeeklyPlanData(planData);
                console.log("Last Week's Plan Data:", planData);

                // Process Axes Definitions
                const axesDataMap = {};
                axesSnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.axisName) {
                        axesDataMap[data.axisName] = { id: doc.id, ...data };
                    }
                });
                setAllAxesData(axesDataMap);
                console.log("All Axes Data:", axesDataMap);

                // Process steps into BOTH grouped and flat structures
                const stepsDataGrouped = {};
                const stepsListFlat = [];
                stepsSnapshot.forEach((doc) => {
                    const data = doc.data();
                    const axis = data.axisTheme;
                    const stepData = { id: doc.id, ...data };
                    stepsListFlat.push(stepData); // Add to flat list
                    if (axis) { // Group by axis
                        if (!stepsDataGrouped[axis]) {
                            stepsDataGrouped[axis] = [];
                        }
                        stepsDataGrouped[axis].push(stepData);
                    } else {
                        console.warn(`Step ${doc.id} missing axisTheme.`);
                    }
                });
                setWeeklyStepsData(stepsDataGrouped); // For lower grid
                setAllWeeklyStepsFlat(stepsListFlat); // For top visualization
                console.log("Last Week's Steps Data (Grouped by Axis):", stepsDataGrouped);
                console.log("Last Week's All Steps Data (Flat):", stepsListFlat);

            } catch (err) {
                console.error("Error fetching weekly data:", err);
                setError("Failed to load weekly data. Check console.");
                setWeeklyPlanData(null); setAllAxesData({}); setWeeklyStepsData({}); setAllWeeklyStepsFlat([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []); // Run only on mount

    // Handler for toggling weekly goal completion status
    const handleGoalToggle = async (axisName, currentStatus) => {
        // --- MODIFIED: Ensure we use the correct week ID (should be last week's ID stored in state) ---
        if (isSavingGoal || !weeklyPlanData || !displayWeekId) return;
        setIsSavingGoal(true);
        const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
        const weeklyPlanRef = doc(db, "weeklyPlan", displayWeekId); // Use week ID from state
        const previousPlanData = { ...weeklyPlanData };

        try {
            setWeeklyPlanData(prevData => ({
                ...prevData,
                axisGoalStatus: { ...(prevData?.axisGoalStatus || {}), [axisName]: newStatus }
            }));
            await updateDoc(weeklyPlanRef, { [`axisGoalStatus.${axisName}`]: newStatus });
            console.log(`Updated status for goal '${axisName}' to '${newStatus}' for week ${displayWeekId}`);
        } catch (error) {
            console.error(`Error updating goal status for ${axisName}:`, error);
            setError(`Failed to update status for ${axisName}.`);
            setWeeklyPlanData(previousPlanData);
        } finally {
            setIsSavingGoal(false);
        }
    };

    // Modal handlers...
    const closePlannerModal = () => setIsPlannerModalOpen(false);
    const openBudgetModal = () => setIsBudgetModalOpen(true);
    const closeBudgetModal = () => setIsBudgetModalOpen(false);
    const handleBudgetSubmit = (formData) => {
        console.log("Budget Routine Submitted (in WeeklyView):", formData);
        closeBudgetModal();
    };

    return (
        <div className={styles.weeklyViewContainer}>
            <h2 className={styles.viewTitle}>
                {/* Title now reflects the week ID being displayed */}
                Weekly Dashboard - Week {displayWeekId.split('-W')[1] || ''}: {displayWeekDates.start} - {displayWeekDates.end}
            </h2>

            {/* --- Weekday Visualization (Horizontal) --- */}
            {/* This section uses allWeeklyStepsFlat from the fetched week */}
            {isLoading ? (
                <p>Loading daily visualization...</p>
            ) : !error && weeklyPlanData ? (
                <div className={styles.weekDaysContainerHorizontal}>
                    {/* Use Mon-Sun display order */}
                    {displayDayOrder.map((dayIndex) => {
                        const axisTheme = dayIndexToAxisTheme[dayIndex];
                        if (!axisTheme) return null;

                        const dayName = dayIndexToName[dayIndex];
                        const axisCssSuffix = axisNameToCssVarSuffix(axisTheme);
                        const weeklyGoal = weeklyPlanData?.axisGoals?.[axisTheme] || "";
                        const plannedStepsForDay = allWeeklyStepsFlat.filter(step =>
                            Array.isArray(step.assignedDays) && step.assignedDays.includes(dayIndex)
                        );
                        const hardcodedTasks = [];
                        if (dayIndex === 0) hardcodedTasks.push({ id: 'prepare', text: 'Prepare' });
                        if (dayIndex === 2) hardcodedTasks.push({ id: 'budget', text: 'Budget' });
                        if (dayIndex === 4) hardcodedTasks.push({ id: 'reset', text: 'Reset' });

                        const dayCardStyle = {
                            backgroundColor: `var(--axis-color-${axisCssSuffix}-1, var(--axis-color-default-1))`,
                            borderColor: `var(--axis-color-${axisCssSuffix}-3, var(--axis-color-default-3))`
                        };

                        return (
                            <div key={dayIndex} className={styles.dayCardHorizontal} style={dayCardStyle}>
                                <h4 className={styles.dayName}>{dayName}</h4>
                                <p className={styles.dayAxisName}>{axisTheme}</p>
                                <div className={styles.dayContent}>
                                    {weeklyGoal && (
                                        <div className={styles.daySection}>
                                            <strong className={styles.daySectionTitle}>Goal:</strong>
                                            <p className={styles.dayGoalText}>{weeklyGoal}</p>
                                        </div>
                                    )}
                                    {plannedStepsForDay.length > 0 && (
                                        <div className={styles.daySection}>
                                            <strong className={styles.daySectionTitle}>Steps:</strong>
                                            <ul className={styles.dayTaskList}>
                                                {plannedStepsForDay.map(step => (
                                                    <li key={step.id}>{step.plannedSteps}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {hardcodedTasks.length > 0 && (
                                        <div className={styles.daySection}>
                                            <strong className={styles.daySectionTitle}>Tasks:</strong>
                                            <ul className={styles.dayTaskList}>
                                                {hardcodedTasks.map(task => (
                                                    <li key={task.id}>{task.text}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : null }
            {/* --- End Weekday Visualization --- */}


            {/* --- Existing Axis Grid Section (Lower Section) --- */}
            {/* This section uses weeklyStepsData (grouped by axis) from the fetched week */}
            {isLoading ? (
                <p>Loading weekly axes...</p>
            ) : error ? (
                <p className={styles.errorText}>{error}</p>
            ) : (
                <div className={styles.axisGrid}>
                    {axisDisplayOrder.map((axisName) => {
                        const axisData = allAxesData[axisName];
                        const weeklyGoal = weeklyPlanData?.axisGoals?.[axisName] || "";
                        const goalStatus = weeklyPlanData?.axisGoalStatus?.[axisName] || 'pending';
                        const upcomingMilestone = axisData ? findUpcomingMilestone(axisData.milestones) : null;
                        const steps = weeklyStepsData[axisName] || []; // Use grouped data

                        return (
                            <div key={axisName} className={styles.axisCard}>
                                <div className={styles.cardContent}>
                                    <div className={styles.cardLeft}>
                                        <h3 className={styles.axisTitle}>{axisName}</h3>
                                    </div>
                                    <div className={styles.cardRight}>
                                        {/* Goal Display */}
                                        <div className={styles.goalDisplay}>
                                            <input
                                                type="checkbox"
                                                id={`goal-check-${axisName.replace(/\s+/g, '-')}`}
                                                checked={goalStatus === 'completed'}
                                                onChange={() => handleGoalToggle(axisName, goalStatus)}
                                                disabled={isSavingGoal}
                                                className={styles.goalCheckbox}
                                            />
                                            <p className={`${styles.goalText} ${goalStatus === 'completed' ? styles.completedGoal : ''}`}>
                                                {weeklyGoal || <i className={styles.notSet}>Goal not set</i>}
                                            </p>
                                        </div>
                                        {/* Milestone Display */}
                                        <div className={styles.milestoneDisplay}>
                                            <span className={styles.label}>Milestone:</span>
                                            {upcomingMilestone ? (
                                                <span className={styles.value}>
                                                    {upcomingMilestone.text}
                                                    {upcomingMilestone.dueDate && typeof upcomingMilestone.dueDate.toDate === 'function' &&
                                                        ` (Due: ${upcomingMilestone.dueDate.toDate().toLocaleDateString()})`
                                                    }
                                                </span>
                                            ) : (
                                                <i className={styles.notSet}>None/Complete</i>
                                            )}
                                        </div>
                                         {/* Steps Display */}
                                        <div className={styles.stepsDisplay}>
                                             <span className={styles.label}>Steps:</span>
                                             {steps.length > 0 ? (
                                                 <span className={styles.value}>
                                                     {steps.map(step => step.plannedSteps).join(' | ')}
                                                 </span>
                                             ) : (
                                                 <i className={styles.notSet}>None planned</i>
                                             )}
                                         </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            {/* --- End Axis Grid Section --- */}


             {/* Buttons container at the bottom */}
             <div className={styles.topButtonContainer}>
                 <button
                     className={styles.actionButton}
                     onClick={() => setIsPlannerModalOpen(true)}
                 >
                     Plan Next Week
                 </button>
                  <button
                     className={`${styles.actionButton} ${styles.budgetButton}`}
                     onClick={openBudgetModal}
                 >
                     Budget
                 </button>
             </div>


             {/* Modals */}
             {isPlannerModalOpen && (
                 <Modal isOpen={isPlannerModalOpen} onClose={closePlannerModal}>
                     <WeeklyPlanner onClose={closePlannerModal} />
                 </Modal>
             )}
             {isBudgetModalOpen && (
                 <Modal isOpen={isBudgetModalOpen} onClose={closeBudgetModal}>
                     <BudgetForm
                         onSubmit={handleBudgetSubmit}
                         onClose={closeBudgetModal}
                         onNavigate={onNavigate}
                     />
                 </Modal>
             )}
        </div>
    );
}

export default WeeklyView;
