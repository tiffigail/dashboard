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
    // limit // limit was imported but not used in the provided code. Kept for now.
} from "firebase/firestore";

// --- Helper Functions ---

// Get Week ID (ISO 8601 - Monday Start)
function getWeekId(date = new Date()) {
    const d = new Date(date.valueOf());
    const dayNum = d.getUTCDay() || 7; // Sunday (0) becomes 7 for ISO 8601 calculation
    d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Adjust to Thursday of the week
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// Get Week Dates (ISO 8601 - Monday Start)
function getWeekDates(weekId) {
    try {
        const [year, week] = weekId.split('-W').map(Number);
        // Create a date for the first day of the year (Jan 1st) in UTC
        const firstDayOfYear = new Date(Date.UTC(year, 0, 1));
        // Get the day of the week for Jan 1st (0 for Sunday, 1 for Monday, ..., 6 for Saturday)
        const firstDayOfWeekOfYear = firstDayOfYear.getUTCDay();

        // Calculate the offset to find the first Monday of the year.
        // ISO 8601 weeks start on Monday.
        // If Jan 1st is Monday (1), offset is 0.
        // If Jan 1st is Tuesday (2), offset is -1 (to get to Monday).
        // If Jan 1st is Sunday (0), offset is +1 (to get to Monday).
        let dayOffset = 1 - firstDayOfWeekOfYear; // Default offset to get to Monday
        if (firstDayOfWeekOfYear === 0) { // If Jan 1st is Sunday
            dayOffset = 1;
        } else if (firstDayOfWeekOfYear > 1) { // If Jan 1st is Tue-Sat
             // No, this is simpler: (1 - dayOfWeek) will give days to subtract to get to Monday
             // Or (8 - dayOfWeek) % 7 if we want to go forward to the first Monday.
             // Let's use the logic: first day of ISO week 1 is the Monday of the week containing Jan 4th.
        }


        // A simpler way for ISO 8601:
        // The first day of week 1 is the Monday of the week containing January 4th.
        // Or, the Thursday of week 1 is January 4th.
        // Let's find the date of the Thursday of the target week.
        const thursdayOfTargetWeek = new Date(Date.UTC(year, 0, 4 + (week - 1) * 7)); // Jan 4th + (week-1)*7 days
        
        // The Monday of that week is Thursday - 3 days
        const startDate = new Date(thursdayOfTargetWeek);
        startDate.setUTCDate(thursdayOfTargetWeek.getUTCDate() - 3);

        // The Sunday of that week is Monday + 6 days
        const endDate = new Date(startDate);
        endDate.setUTCDate(startDate.getUTCDate() + 6);

        const options = { month: 'short', day: 'numeric' };
        // Ensure we use UTC dates for formatting to avoid timezone shifts from the UTC calculations
        return {
            start: new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate())).toLocaleDateString(undefined, options),
            end: new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate())).toLocaleDateString(undefined, options),
        };
    } catch (e) {
        console.error("Error parsing week ID for getWeekDates:", weekId, e);
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
    const [weeklyStepsData, setWeeklyStepsData] = useState({}); // Grouped by axis
    const [allWeeklyStepsFlat, setAllWeeklyStepsFlat] = useState([]); // Flat list for daily viz
    const [isSavingGoal, setIsSavingGoal] = useState(false);

    // Fetch data on mount
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            const today = new Date();
            
            // --- MODIFIED: Calculate CURRENT week's date and ID ---
            const targetWeekId = getWeekId(today); // Use today's date for current week
            // --- End Modification ---
            
            setDisplayWeekId(targetWeekId); 
            setDisplayWeekDates(getWeekDates(targetWeekId)); 

            // --- MODIFIED: Updated log message ---
            console.log(`WeeklyView: Fetching weekly data for CURRENT week (ISO): ${targetWeekId}`);
            // --- End Modification ---
            try {
                // Fetch Weekly Plan, All Axes, and Planned Weekly Steps concurrently
                // Queries will now use the CURRENT week ID stored in targetWeekId
                const weeklyPlanRef = doc(db, "weeklyPlan", targetWeekId);
                const axesCollectionRef = collection(db, "axes");
                const stepsCollectionRef = collection(db, "weeklySteps");
                const stepsQuery = query(
                    stepsCollectionRef,
                    where("weekId", "==", targetWeekId), // Uses current week's ID
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
                console.log("WeeklyView: Current Week's Plan Data:", planData);

                // Process Axes Definitions
                const axesDataMap = {};
                axesSnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.axisName) {
                        axesDataMap[data.axisName] = { id: doc.id, ...data };
                    }
                });
                setAllAxesData(axesDataMap);
                console.log("WeeklyView: All Axes Data:", axesDataMap);

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
                        console.warn(`WeeklyView: Step ${doc.id} missing axisTheme.`);
                    }
                });
                setWeeklyStepsData(stepsDataGrouped); // For lower grid
                setAllWeeklyStepsFlat(stepsListFlat); // For top visualization
                console.log("WeeklyView: Current Week's Steps Data (Grouped by Axis):", stepsDataGrouped);
                console.log("WeeklyView: Current Week's All Steps Data (Flat):", stepsListFlat);

            } catch (err) {
                console.error("WeeklyView: Error fetching weekly data:", err);
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
        // Ensure we use the correct week ID (should be current week's ID stored in state)
        if (isSavingGoal || !weeklyPlanData || !displayWeekId) return;
        setIsSavingGoal(true);
        const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
        const weeklyPlanRef = doc(db, "weeklyPlan", displayWeekId); // Use week ID from state (now current week)
        const previousPlanData = { ...weeklyPlanData };

        try {
            setWeeklyPlanData(prevData => ({
                ...prevData,
                axisGoalStatus: { ...(prevData?.axisGoalStatus || {}), [axisName]: newStatus }
            }));
            await updateDoc(weeklyPlanRef, { [`axisGoalStatus.${axisName}`]: newStatus });
            console.log(`WeeklyView: Updated status for goal '${axisName}' to '${newStatus}' for week ${displayWeekId}`);
        } catch (error) {
            console.error(`WeeklyView: Error updating goal status for ${axisName}:`, error);
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
            {/* This section uses allWeeklyStepsFlat from the fetched week (now current week) */}
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
                        const hardcodedTasks = []; // These are display-only for WeeklyView
                        if (dayIndex === 0) hardcodedTasks.push({ id: 'prepare', text: 'Prepare Day' });
                        if (dayIndex === 2) hardcodedTasks.push({ id: 'budget', text: 'Budget Review' });
                        if (dayIndex === 4) hardcodedTasks.push({ id: 'reset', text: 'Mid-Week Reset' });

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
                                            <strong className={styles.daySectionTitle}>Focus:</strong>
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
            {/* This section uses weeklyStepsData (grouped by axis) from the fetched week (now current week) */}
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