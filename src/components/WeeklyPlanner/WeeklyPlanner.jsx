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
function getWeekId(date = new Date()) {
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
    // Adjust day index for Sunday start (0=Sun) to add correct days
    targetDate.setDate(weekStartDate.getDate() + targetDayIndex);
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}


function getCurrentWeekStartDate(date = new Date()) {
    const current = new Date(date);
    const dayOfWeek = current.getDay(); // 0 = Sunday
    const diff = current.getDate() - dayOfWeek;
    const sundayDate = new Date(current.setDate(diff));
    return sundayDate;
}


function getUpcomingMondaySundayRange(date = new Date()) {
    const today = new Date(date);
    const currentDay = today.getDay();
    const daysUntilMonday = (currentDay === 0) ? 1 : (8 - currentDay);
    const upcomingMonday = new Date(today);
    upcomingMonday.setDate(today.getDate() + daysUntilMonday);
    const followingSunday = new Date(upcomingMonday);
    followingSunday.setDate(upcomingMonday.getDate() + 6);
    const options = { month: 'long', day: 'numeric' };
    return {
        monday: upcomingMonday.toLocaleDateString(undefined, options),
        sunday: followingSunday.toLocaleDateString(undefined, options)
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

// Helper to load state from localStorage, ensuring steps is an array of objects
const loadFromLocalStorage = (key, defaultValue) => {
    try {
        const saved = localStorage.getItem(key);
        if (saved === null) return defaultValue;
        const parsed = JSON.parse(saved);
        // Sanitize loaded data: ensure steps is always an array of objects
        for (const axis in parsed) {
            if (parsed[axis] && !Array.isArray(parsed[axis].steps)) {
                 parsed[axis].steps = [{ text: '', assignedDays: [] }]; // Default step object
            } else if (parsed[axis] && parsed[axis].steps.length === 0) {
                 parsed[axis].steps = [{ text: '', assignedDays: [] }]; // Ensure at least one step object
            } else if (parsed[axis]) {
                // Ensure each step is an object with text and assignedDays array
                parsed[axis].steps = parsed[axis].steps.map(step =>
                    (typeof step === 'object' && step !== null && Array.isArray(step.assignedDays))
                        ? step
                        : { text: typeof step === 'string' ? step : '', assignedDays: [] }
                );
            }
            // Ensure days (legacy?) is removed or handled if needed - removing for clarity
            // delete parsed[axis]?.days;
        }
        return parsed;
    } catch (error) {
        console.error(`Error reading localStorage key “${key}”:`, error);
        return defaultValue;
    }
};


// Props: onClose
function WeeklyPlanner({ onClose }) {
    const [currentAxisIndex, setCurrentAxisIndex] = useState(() => loadFromLocalStorage('weeklyPlanner_currentAxisIndex', 0));
    // State structure updated: steps is now an array of {text: string, assignedDays: number[]}
    const [inProgressPlan, setInProgressPlan] = useState(() => loadFromLocalStorage(LOCAL_STORAGE_KEY, {}));
    const [isFinishing, setIsFinishing] = useState(false);
    const [error, setError] = useState(null);

    const currentAxisTheme = dayToAxisThemeMapping[currentAxisIndex];
    const currentWeekStartDate = getCurrentWeekStartDate();

    const upcomingWeek = getUpcomingMondaySundayRange();
    const weekRangeString = `Week of ${upcomingWeek.monday} to ${upcomingWeek.sunday}`;

    // Effect to save in-progress plan to localStorage
    useEffect(() => {
        try {
            // Filter out empty steps before saving
            const planToSave = {};
            for (const axis in inProgressPlan) {
                const stepsToSave = (inProgressPlan[axis].steps || [])
                                    .filter(step => step && step.text.trim() !== '');
                // If filtering results in empty steps, add back one empty object for the UI
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


    // Navigation Handlers
    const handlePrevious = () => {
        setCurrentAxisIndex(prev => (prev > 0 ? prev - 1 : dayToAxisThemeMapping.length - 1));
    };
    const handleNext = () => {
        setCurrentAxisIndex(prev => (prev < dayToAxisThemeMapping.length - 1 ? prev + 1 : 0));
    };

    // Form Input Handlers
    const handleAxisGoalChange = (e) => {
        const goal = e.target.value;
        setInProgressPlan(prevPlan => ({
            ...prevPlan,
            [currentAxisTheme]: { ...(prevPlan[currentAxisTheme] || { steps: [{ text: '', assignedDays: [] }], goal: '' }), goal: goal }
        }));
    };

    // --- Handler for individual step input changes ---
    const handleStepInputChange = (index, value) => {
         setInProgressPlan(prevPlan => {
            const currentAxisPlan = prevPlan[currentAxisTheme] || { steps: [{ text: '', assignedDays: [] }], goal: '' };
            const updatedSteps = [...currentAxisPlan.steps];
            // Ensure the step object exists
            if (!updatedSteps[index]) {
                 updatedSteps[index] = { text: '', assignedDays: [] };
            }
            updatedSteps[index].text = value; // Update the text property
            return { ...prevPlan, [currentAxisTheme]: { ...currentAxisPlan, steps: updatedSteps } };
        });
    };

    // --- Handler to add a new empty step input field ---
    const handleAddStepInput = () => {
        setInProgressPlan(prevPlan => {
            const currentAxisPlan = prevPlan[currentAxisTheme] || { steps: [], goal: '' };
            // Add a new empty step object
            const updatedSteps = [...currentAxisPlan.steps, { text: '', assignedDays: [] }];
            return { ...prevPlan, [currentAxisTheme]: { ...currentAxisPlan, steps: updatedSteps } };
        });
    };

     // --- Handler to remove a step input field ---
     const handleRemoveStepInput = (indexToRemove) => {
        setInProgressPlan(prevPlan => {
            const currentAxisPlan = prevPlan[currentAxisTheme] || { steps: [], goal: '' };
            let updatedSteps = currentAxisPlan.steps.filter((_, index) => index !== indexToRemove);
            // Ensure at least one step input remains (can be empty)
            if (updatedSteps.length === 0) {
                updatedSteps = [{ text: '', assignedDays: [] }];
            }
            return { ...prevPlan, [currentAxisTheme]: { ...currentAxisPlan, steps: updatedSteps } };
        });
    };

    // --- Handler for day selection checkboxes for a SPECIFIC step ---
    const handleStepDayChange = (stepIndex, dayValue, isChecked) => {
        setInProgressPlan(prevPlan => {
            const currentAxisPlan = prevPlan[currentAxisTheme] || { steps: [], goal: '' };
            const updatedSteps = [...currentAxisPlan.steps];
            // Ensure the step object and its assignedDays array exist
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
            updatedSteps[stepIndex].assignedDays = newDays; // Update assignedDays for the specific step
            return { ...prevPlan, [currentAxisTheme]: { ...currentAxisPlan, steps: updatedSteps } };
        });
    };


    // Final Save Handler
    const handleFinish = async () => {
        console.log("Weekly planning finished. Saving overall weekly plan and steps...");
        setIsFinishing(true);
        setError(null);

        const finalGoals = {};
        const stepsToAdd = [];
        const nextWeekStartDate = new Date(currentWeekStartDate);
        nextWeekStartDate.setDate(nextWeekStartDate.getDate() + 7);

        for (const axisName in inProgressPlan) {
            const plan = inProgressPlan[axisName];
            if (plan.goal && plan.goal.trim()) {
                finalGoals[axisName] = plan.goal.trim();
            }

            // Iterate through each step object for the axis
            if (plan.steps && Array.isArray(plan.steps)) {
                plan.steps.forEach(step => {
                    // Only save steps with actual text and assigned days
                    if (step.text && step.text.trim() && Array.isArray(step.assignedDays) && step.assignedDays.length > 0) {
                        const earliestDayIndex = Math.min(...step.assignedDays);
                        const initialAssignedDateString = getDateStringForDayInWeek(nextWeekStartDate, earliestDayIndex);
                        if (!initialAssignedDateString) {
                            console.error(`Could not calculate initial assigned date for step "${step.text}" in axis ${axisName}`);
                            return; // Skip this step if date calculation fails
                        }

                        stepsToAdd.push({
                            taskType: 'planned',
                            plannedSteps: step.text.trim(),
                            axisTheme: axisName,
                            weekId: getWeekId(nextWeekStartDate),
                            assignedDays: step.assignedDays, // Use days specific to this step
                            createdAt: serverTimestamp(),
                            status: 'pending',
                            completedAt: null,
                            rolloverCount: 0,
                            currentAssignedDate: initialAssignedDateString,
                        });
                    }
                });
            }
        }

        const nextWeekId = getWeekId(nextWeekStartDate);
        const weeklyPlanData = {
            weekId: nextWeekId,
            axisGoals: finalGoals,
            axisGoalStatus: {},
            createdAt: serverTimestamp(),
            lastUpdatedAt: serverTimestamp()
        };

        const batch = writeBatch(db);
        const weeklyPlanDocRef = doc(db, "weeklyPlan", nextWeekId);
        batch.set(weeklyPlanDocRef, weeklyPlanData, { merge: true });

        const stepsCollectionRef = collection(db, "weeklySteps");
        stepsToAdd.forEach(stepData => {
            const newStepDocRef = doc(stepsCollectionRef);
            batch.set(newStepDocRef, stepData);
        });

        console.log(`Prepared batch: Setting weeklyPlan/${nextWeekId} and adding ${stepsToAdd.length} individual steps.`);

        try {
            await batch.commit();
            console.log(`Batch write successful for week ${nextWeekId}`);
            alert("Weekly plan and all steps saved successfully!");
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            localStorage.removeItem('weeklyPlanner_currentAxisIndex');
            setInProgressPlan({});
            setCurrentAxisIndex(0);
            onClose();
        } catch (err) {
            console.error("Error committing batch write:", err);
            setError(`Failed to save the weekly plan/steps for ${nextWeekId}. Please try again.`);
            alert(`Error: Failed to save the weekly plan/steps.`);
        } finally {
            setIsFinishing(false);
        }
    };


    // == JSX Rendering ==
    const currentPlanData = inProgressPlan[currentAxisTheme] || { steps: [{ text: '', assignedDays: [] }], goal: '' }; // Ensure default structure
    const displayGoal = currentPlanData.goal || '';
    // Ensure displayStepsArray is always an array of objects, with at least one empty object if none exist
    let displayStepsArray = Array.isArray(currentPlanData.steps) ? currentPlanData.steps : [];
    if (displayStepsArray.length === 0 || displayStepsArray.every(step => typeof step !== 'object')) {
        displayStepsArray = [{ text: '', assignedDays: [] }];
    } else {
        // Ensure every item is an object with the correct structure
        displayStepsArray = displayStepsArray.map(step =>
             (typeof step === 'object' && step !== null && Array.isArray(step.assignedDays))
                 ? step
                 : { text: typeof step === 'string' ? step : '', assignedDays: [] }
         );
         // Ensure at least one input field if all existing steps were somehow invalid
         if (displayStepsArray.length === 0) {
             displayStepsArray.push({ text: '', assignedDays: [] });
         }
    }


    return (
        <div className={styles.weeklyPlannerModalContent}>
            <h3 className={styles.plannerTitle}>{currentAxisTheme} - Weekly Plan</h3>
            <p className={styles.weekRange}>{weekRangeString}</p>

            <div className={styles.plannerLayout}>
                {/* Left Side: Context Map */}
                <div className={styles.contextMapArea}>
                    <ContextMap axisName={currentAxisTheme} />
                </div>

                {/* Right Side: Inputs */}
                <div className={styles.inputsArea}>
                    {error && <p className={styles.errorText}>{error}</p>}
                    {/* Weekly Axis Goal Input */}
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

                    {/* Input Section: Weekly steps and day assignment */}
                    <div className={styles.nextStepsSection}>
                        <label className={styles.nextStepsLabel}>Weekly Steps for {currentAxisTheme}:</label>

                        {/* --- UPDATED: Dynamic Step Inputs with Individual Day Checkboxes --- */}
                        <div className={styles.stepInputContainer}>
                            {displayStepsArray.map((step, index) => (
                                <div key={index} className={styles.stepEntry}> {/* Container for step + days */}
                                    <div className={styles.stepInputRow}>
                                        <input
                                            type="text"
                                            value={step.text}
                                            onChange={(e) => handleStepInputChange(index, e.target.value)}
                                            placeholder={`Step ${index + 1}...`}
                                            className={styles.stepInput}
                                            disabled={isFinishing}
                                        />
                                        {/* Show remove button only if there's more than one step input */}
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
                                    {/* Day Assignment Checkboxes FOR THIS STEP */}
                                    <div className={styles.dayCheckboxes}>
                                        {daysOfWeek.map(day => (
                                            <div key={day.value} className={styles.dayCheckboxItem}>
                                                <input
                                                    type="checkbox"
                                                    id={`day-${day.value}-step-${index}-${currentAxisIndex}`} // More specific ID
                                                    value={day.value}
                                                    // Check if this step's assignedDays includes the current day value
                                                    checked={(step.assignedDays || []).includes(day.value)}
                                                    // Pass step index and day value to handler
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
                        {/* Button to add another step input */}
                        <button
                            type="button"
                            onClick={handleAddStepInput}
                            className={styles.addStepButton}
                            disabled={isFinishing}
                            title="Add another step"
                        >
                            + Add Step
                        </button>
                        {/* --- END UPDATED --- */}

                        {/* --- REMOVED: Old Day Assignment Section --- */}
                        {/* <div className={styles.dayAssignmentSection}> ... </div> */}
                    </div>
                </div>
            </div>

            {/* Navigation Buttons */}
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
