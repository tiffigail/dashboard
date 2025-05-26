// src/components/WeeklyPlanner/WeeklyPlanner.jsx
import React, { useState, useEffect, useRef } from 'react';
import styles from './WeeklyPlanner.module.css';
import { db } from '../../firebaseConfig';
import {
    collection,
    doc,
    setDoc,
    writeBatch,
    serverTimestamp,
} from "firebase/firestore";
import ContextMap from '../ContextMap/ContextMap';

// --- localStorage Key ---
const LOCAL_STORAGE_KEY = 'weeklyPlanInProgress_v4'; // Updated key for new structure

// --- Date Helper Functions ---
function getWeekId(date = new Date()) { // ISO Week ID (Week starts Monday)
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getDateStringForDayInWeek(weekStartDate, targetDayIndex) {
    if (!(weekStartDate instanceof Date) || isNaN(weekStartDate)) {
        console.error("Invalid weekStartDate provided to getDateStringForDayInWeek");
        return null;
    }
    const targetDate = new Date(weekStartDate);
    // weekStartDate is expected to be Sunday. targetDayIndex is 0 for Sun, 1 for Mon, etc.
    targetDate.setDate(weekStartDate.getDate() + targetDayIndex);
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}


function getCurrentWeekStartDate(date = new Date()) { // Returns Sunday of the current week
    const current = new Date(date);
    const dayOfWeek = current.getDay(); // 0 = Sunday
    const diff = current.getDate() - dayOfWeek;
    const sundayDate = new Date(current.setDate(diff));
    sundayDate.setHours(0, 0, 0, 0); // Normalize to start of day
    return sundayDate;
}


function getUpcomingMondaySundayRange(date = new Date()) { // For display string
    const today = new Date(date);
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday...
    // Days until the *next* Monday (could be tomorrow if today is Sun, or next week's Mon if today is Mon)
    let daysUntilMonday;
    if (currentDay === 0) { // Sunday
        daysUntilMonday = 1;
    } else {
        daysUntilMonday = 8 - currentDay;
    }
    const upcomingMonday = new Date(today);
    upcomingMonday.setDate(today.getDate() + daysUntilMonday);
    upcomingMonday.setHours(0,0,0,0);

    const followingSunday = new Date(upcomingMonday);
    followingSunday.setDate(upcomingMonday.getDate() + 6);
    followingSunday.setHours(0,0,0,0);

    const options = { month: 'long', day: 'numeric' };
    return {
        monday: upcomingMonday.toLocaleDateString(undefined, options),
        sunday: followingSunday.toLocaleDateString(undefined, options),
        mondayDateObj: upcomingMonday // Return the Monday Date object
    };
}
// --- End Date Helper Functions ---

// Mapping from Day of Week (0=Sun) to Axis Theme Name
const dayToAxisThemeMapping = [
    "Rest and preparation", "Physical", "Financial", "Gear",
    "ON TRACK N+1", "Misdirect", "Environment"
];

// Days of the week for checkboxes
const daysOfWeek = [
    { label: 'Sun', value: 0 }, { label: 'Mon', value: 1 }, { label: 'Tue', value: 2 },
    { label: 'Wed', value: 3 }, { label: 'Thu', value: 4 }, { label: 'Fri', value: 5 },
    { label: 'Sat', value: 6 },
];

const loadFromLocalStorage = (key, defaultValue) => {
    try {
        const saved = localStorage.getItem(key);
        if (saved === null) return defaultValue;
        const parsed = JSON.parse(saved);
        for (const axis in parsed) {
            if (parsed[axis] && !Array.isArray(parsed[axis].steps)) {
                parsed[axis].steps = [{ text: '', assignedDays: [] }];
            } else if (parsed[axis] && parsed[axis].steps.length === 0) {
                parsed[axis].steps = [{ text: '', assignedDays: [] }];
            } else if (parsed[axis]) {
                parsed[axis].steps = parsed[axis].steps.map(step =>
                    (typeof step === 'object' && step !== null && Array.isArray(step.assignedDays))
                        ? step
                        : { text: typeof step === 'string' ? step : '', assignedDays: [] }
                );
            }
        }
        return parsed;
    } catch (error) {
        console.error(`Error reading localStorage key “${key}”:`, error);
        return defaultValue;
    }
};

function WeeklyPlanner({ onClose }) {
    const [currentAxisIndex, setCurrentAxisIndex] = useState(() => loadFromLocalStorage('weeklyPlanner_currentAxisIndex', 0));
    const [inProgressPlan, setInProgressPlan] = useState(() => loadFromLocalStorage(LOCAL_STORAGE_KEY, {}));
    const [isFinishing, setIsFinishing] = useState(false);
    const [error, setError] = useState(null);

    const currentAxisTheme = dayToAxisThemeMapping[currentAxisIndex];
    
    // Determine the target planning week (next week)
    // currentWeekSundayAtMidnight is the Sunday of the week the planner is opened.
    const currentWeekSundayAtMidnight = getCurrentWeekStartDate(new Date());

    // nextWeekSundayAtMidnight is the Sunday the user will be planning FOR.
    const nextWeekSundayAtMidnight = new Date(currentWeekSundayAtMidnight);
    nextWeekSundayAtMidnight.setDate(currentWeekSundayAtMidnight.getDate() + 7);

    // For display, use the Mon-Sun range of the ISO week we are planning FOR.
    // The targetISOWeekId will be based on the Monday of the week that nextWeekSundayAtMidnight is part of.
    const mondayOfTargetPlanningISOWeek = new Date(nextWeekSundayAtMidnight);
    if (mondayOfTargetPlanningISOWeek.getUTCDay() === 0) { // If Sunday
        mondayOfTargetPlanningISOWeek.setUTCDate(mondayOfTargetPlanningISOWeek.getUTCDate() + 1);
    } else { // If not Sunday, find that week's Monday
        const day = mondayOfTargetPlanningISOWeek.getUTCDay();
        const diff = mondayOfTargetPlanningISOWeek.getUTCDate() - day + (day === 0 ? -6 : 1);
        mondayOfTargetPlanningISOWeek.setUTCDate(diff);
    }
    const endOfTargetPlanningISOWeek = new Date(mondayOfTargetPlanningISOWeek);
    endOfTargetPlanningISOWeek.setUTCDate(mondayOfTargetPlanningISOWeek.getUTCDate() + 6);
    
    const options = { month: 'long', day: 'numeric' };
    const weekRangeString = `Planning for: ${nextWeekSundayAtMidnight.toLocaleDateString(undefined, options)} (Sun) to ${new Date(new Date(nextWeekSundayAtMidnight).setDate(nextWeekSundayAtMidnight.getDate() + 6)).toLocaleDateString(undefined, options)} (Sat)`;


    useEffect(() => {
        try {
            const planToSave = {};
            for (const axis in inProgressPlan) {
                const stepsToSave = (inProgressPlan[axis].steps || [])
                                        .filter(step => step && typeof step.text === 'string' && step.text.trim() !== '');
                if (stepsToSave.length === 0) {
                    stepsToSave.push({ text: '', assignedDays: [] });
                }
                planToSave[axis] = {
                    ...inProgressPlan[axis],
                    steps: stepsToSave
                };
            }
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(planToSave));
            localStorage.setItem('weeklyPlanner_currentAxisIndex', currentAxisIndex);
        } catch (error) {
            console.error("Error saving plan to localStorage:", error);
        }
    }, [inProgressPlan, currentAxisIndex]);

    const handlePrevious = () => {
        setCurrentAxisIndex(prev => (prev > 0 ? prev - 1 : dayToAxisThemeMapping.length - 1));
    };
    const handleNext = () => {
        setCurrentAxisIndex(prev => (prev < dayToAxisThemeMapping.length - 1 ? prev + 1 : 0));
    };

    const handleAxisGoalChange = (e) => {
        const goal = e.target.value;
        setInProgressPlan(prevPlan => ({
            ...prevPlan,
            [currentAxisTheme]: { ...(prevPlan[currentAxisTheme] || { steps: [{ text: '', assignedDays: [] }], goal: '' }), goal: goal }
        }));
    };

    const handleStepInputChange = (index, value) => {
        setInProgressPlan(prevPlan => {
            const currentAxisPlan = prevPlan[currentAxisTheme] || { steps: [{ text: '', assignedDays: [] }], goal: '' };
            const updatedSteps = [...currentAxisPlan.steps];
            if (!updatedSteps[index]) {
                updatedSteps[index] = { text: '', assignedDays: [] };
            }
            updatedSteps[index].text = value;
            return { ...prevPlan, [currentAxisTheme]: { ...currentAxisPlan, steps: updatedSteps } };
        });
    };

    const handleAddStepInput = () => {
        setInProgressPlan(prevPlan => {
            const currentAxisPlan = prevPlan[currentAxisTheme] || { steps: [], goal: '' };
            const updatedSteps = [...currentAxisPlan.steps, { text: '', assignedDays: [] }];
            return { ...prevPlan, [currentAxisTheme]: { ...currentAxisPlan, steps: updatedSteps } };
        });
    };

    const handleRemoveStepInput = (indexToRemove) => {
        setInProgressPlan(prevPlan => {
            const currentAxisPlan = prevPlan[currentAxisTheme] || { steps: [], goal: '' };
            let updatedSteps = currentAxisPlan.steps.filter((_, index) => index !== indexToRemove);
            if (updatedSteps.length === 0) {
                updatedSteps = [{ text: '', assignedDays: [] }];
            }
            return { ...prevPlan, [currentAxisTheme]: { ...currentAxisPlan, steps: updatedSteps } };
        });
    };

    const handleStepDayChange = (stepIndex, dayValue, isChecked) => {
        setInProgressPlan(prevPlan => {
            const currentAxisPlan = prevPlan[currentAxisTheme] || { steps: [], goal: '' };
            const updatedSteps = [...currentAxisPlan.steps];
            if (!updatedSteps[stepIndex]) {
                updatedSteps[stepIndex] = { text: '', assignedDays: [] };
            }
            const currentDays = updatedSteps[stepIndex].assignedDays || [];
            let newDays;
            if (isChecked) {
                newDays = [...currentDays, dayValue].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
            } else {
                newDays = currentDays.filter(day => day !== dayValue);
            }
            updatedSteps[stepIndex].assignedDays = newDays;
            return { ...prevPlan, [currentAxisTheme]: { ...currentAxisPlan, steps: updatedSteps } };
        });
    };

    const handleFinish = async () => {
        console.log("Weekly planning finished. Saving overall weekly plan and steps...");
        setIsFinishing(true);
        setError(null);

        const finalGoals = {};
        const stepsToAdd = [];

        // *** MODIFICATION START: Determine the target ISO Week ID for the plan ***
        // nextWeekSundayAtMidnight is the Sunday the user is planning FOR (e.g., May 25th)
        // We need the ISO Week ID of the week that *contains the Monday of this planning period*.
        const mondayOfTargetUserWeek = new Date(nextWeekSundayAtMidnight); // Start with the Sunday
        if (mondayOfTargetUserWeek.getUTCDay() !== 1) { // If it's not already Monday (1 in UTC)
             // Adjust to find the Monday of the week this Sunday (nextWeekSundayAtMidnight) belongs to,
             // or rather, the Monday of the user's perceived week starting this Sunday.
             // If nextWeekSundayAtMidnight is Sunday, its corresponding Monday is the next day.
            if (mondayOfTargetUserWeek.getUTCDay() === 0) { // If it's Sunday
                mondayOfTargetUserWeek.setUTCDate(mondayOfTargetUserWeek.getUTCDate() + 1);
            } else { // For any other day, find the Monday of that week (this path is less likely if nextWeekSundayAtMidnight is always Sunday)
                let day = mondayOfTargetUserWeek.getUTCDay();
                let diffToMonday = 1 - day; // e.g. if Tuesday (2), diff is -1.
                if (day === 0) diffToMonday = 1; // if Sunday (0), diff is 1.
                mondayOfTargetUserWeek.setUTCDate(mondayOfTargetUserWeek.getUTCDate() + diffToMonday);
            }
        }
        const targetPlanFirestoreWeekId = getWeekId(mondayOfTargetUserWeek);
        console.log(`Targeting Firestore Week ID: ${targetPlanFirestoreWeekId} (based on Monday: ${mondayOfTargetUserWeek.toISOString()}) for plans starting on Sunday: ${nextWeekSundayAtMidnight.toISOString()}`);
        // *** MODIFICATION END ***


        for (const axisName in inProgressPlan) {
            const plan = inProgressPlan[axisName];
            if (plan.goal && plan.goal.trim()) {
                finalGoals[axisName] = plan.goal.trim();
            }

            if (plan.steps && Array.isArray(plan.steps)) {
                plan.steps.forEach(step => {
                    if (step.text && step.text.trim() && Array.isArray(step.assignedDays) && step.assignedDays.length > 0) {
                        const earliestDayIndex = Math.min(...step.assignedDays);
                        // Use nextWeekSundayAtMidnight (actual start of user's week) to calculate the date string
                        const initialAssignedDateString = getDateStringForDayInWeek(nextWeekSundayAtMidnight, earliestDayIndex);
                        
                        if (!initialAssignedDateString) {
                            console.error(`Could not calculate initial assigned date for step "${step.text}" in axis ${axisName}`);
                            return;
                        }

                        stepsToAdd.push({
                            taskType: 'planned',
                            plannedSteps: step.text.trim(),
                            axisTheme: axisName,
                            weekId: targetPlanFirestoreWeekId, // *** USE MODIFIED Week ID ***
                            assignedDays: step.assignedDays,
                            createdAt: serverTimestamp(),
                            status: 'pending',
                            completedAt: null,
                            rolloverCount: 0,
                            currentAssignedDate: initialAssignedDateString, // Date of first assignment in the planned week
                        });
                    }
                });
            }
        }

        const weeklyPlanData = {
            weekId: targetPlanFirestoreWeekId, // *** USE MODIFIED Week ID ***
            axisGoals: finalGoals,
            axisGoalStatus: {}, // Initialize as empty or with default statuses
            createdAt: serverTimestamp(),
            lastUpdatedAt: serverTimestamp()
        };

        const batch = writeBatch(db);
        const weeklyPlanDocRef = doc(db, "weeklyPlan", targetPlanFirestoreWeekId); // *** USE MODIFIED Week ID ***
        batch.set(weeklyPlanDocRef, weeklyPlanData, { merge: true });

        const stepsCollectionRef = collection(db, "weeklySteps");
        stepsToAdd.forEach(stepData => {
            const newStepDocRef = doc(stepsCollectionRef); // Auto-generate ID for each step
            batch.set(newStepDocRef, stepData);
        });

        console.log(`Prepared batch: Setting weeklyPlan/${targetPlanFirestoreWeekId} and adding ${stepsToAdd.length} individual steps.`);

        try {
            await batch.commit();
            console.log(`Batch write successful for week ${targetPlanFirestoreWeekId}`);
            alert("Weekly plan and all steps saved successfully!");
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            localStorage.removeItem('weeklyPlanner_currentAxisIndex');
            setInProgressPlan({});
            setCurrentAxisIndex(0);
            onClose();
        } catch (err) {
            console.error("Error committing batch write:", err);
            setError(`Failed to save the weekly plan/steps for ${targetPlanFirestoreWeekId}. Please try again.`);
            alert(`Error: Failed to save the weekly plan/steps.`);
        } finally {
            setIsFinishing(false);
        }
    };

    const currentPlanData = inProgressPlan[currentAxisTheme] || { steps: [{ text: '', assignedDays: [] }], goal: '' };
    const displayGoal = currentPlanData.goal || '';
    let displayStepsArray = Array.isArray(currentPlanData.steps) ? currentPlanData.steps : [];
    if (displayStepsArray.length === 0 || displayStepsArray.every(step => typeof step !== 'object')) {
        displayStepsArray = [{ text: '', assignedDays: [] }];
    } else {
        displayStepsArray = displayStepsArray.map(step =>
             (typeof step === 'object' && step !== null && Array.isArray(step.assignedDays))
                 ? step
                 : { text: typeof step === 'string' ? step : '', assignedDays: [] }
         );
        if (displayStepsArray.length === 0) {
            displayStepsArray.push({ text: '', assignedDays: [] });
        }
    }

    return (
        <div className={styles.weeklyPlannerModalContent}>
            <h3 className={styles.plannerTitle}>{currentAxisTheme} - Weekly Plan</h3>
            <p className={styles.weekRange}>{weekRangeString}</p>

            <div className={styles.plannerLayout}>
                <div className={styles.contextMapArea}>
                    <ContextMap axisName={currentAxisTheme} />
                </div>

                <div className={styles.inputsArea}>
                    {error && <p className={styles.errorText}>{error}</p>}
                    <div className={styles.axisGoalSection}>
                        <label htmlFor={`axisGoalInput-${currentAxisIndex}`} className={styles.axisGoalLabel}>
                            Goal for {currentAxisTheme} this week:
                        </label>
                        <textarea
                            id={`axisGoalInput-${currentAxisIndex}`}
                            rows="3"
                            placeholder={`Enter your main goal for ${currentAxisTheme}...`}
                            className={styles.axisGoalInput}
                            value={displayGoal}
                            onChange={handleAxisGoalChange}
                            disabled={isFinishing}
                        />
                    </div>
                    <hr className={styles.divider} />
                    <div className={styles.nextStepsSection}>
                        <label className={styles.nextStepsLabel}>Weekly Steps for {currentAxisTheme}:</label>
                        <div className={styles.stepInputContainer}>
                            {displayStepsArray.map((step, index) => (
                                <div key={index} className={styles.stepEntry}>
                                    <div className={styles.stepInputRow}>
                                        <input
                                            type="text"
                                            value={step.text}
                                            onChange={(e) => handleStepInputChange(index, e.target.value)}
                                            placeholder={`Step ${index + 1}...`}
                                            className={styles.stepInput}
                                            disabled={isFinishing}
                                        />
                                        {displayStepsArray.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveStepInput(index)}
                                                className={styles.removeStepButton}
                                                disabled={isFinishing}
                                                title="Remove step"
                                            >
                                                &times;
                                            </button>
                                        )}
                                    </div>
                                    <div className={styles.dayCheckboxes}>
                                        {daysOfWeek.map(day => (
                                            <div key={day.value} className={styles.dayCheckboxItem}>
                                                <input
                                                    type="checkbox"
                                                    id={`day-${day.value}-step-${index}-${currentAxisIndex}`}
                                                    value={day.value}
                                                    checked={(step.assignedDays || []).includes(day.value)}
                                                    onChange={(e) => handleStepDayChange(index, day.value, e.target.checked)}
                                                    disabled={isFinishing}
                                                    className={styles.dayCheckbox}
                                                />
                                                <label htmlFor={`day-${day.value}-step-${index}-${currentAxisIndex}`}>{day.label}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={handleAddStepInput}
                            className={styles.addStepButton}
                            disabled={isFinishing}
                            title="Add another step"
                        >
                            + Add Step
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles.navigation}>
                <button type="button" onClick={handlePrevious} className={styles.navButton} disabled={isFinishing}>
                    &larr; Previous Axis
                </button>
                <button type="button" onClick={handleFinish} className={`${styles.navButton} ${styles.finishButton}`} disabled={isFinishing}>
                    {isFinishing ? 'Saving Plan...' : 'Finish Planning & Save All'}
                </button>
                <button type="button" onClick={handleNext} className={styles.navButton} disabled={isFinishing}>
                    Next Axis &rarr;
                </button>
            </div>
        </div>
    );
}

export default WeeklyPlanner;
