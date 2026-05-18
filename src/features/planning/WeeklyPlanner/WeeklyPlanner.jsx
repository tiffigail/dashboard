import React, { useState, useEffect, useCallback } from 'react';
import styles from '@/features/planning/WeeklyPlanner/WeeklyPlanner.module.css';
import { db } from '@/firebaseConfig';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    writeBatch,
    serverTimestamp,
} from "firebase/firestore";
import ContextMap from '@/features/lifemap/ContextMap/ContextMap';
import { getWeekId, getWeekStartDate, getDateStringForDayInWeek } from '@/utils/dateUtils';

// --- Constants ---
const dayToAxisThemeMapping = [
    "Rest and preparation", "Physical", "Financial", "Gear",
    "On Track N+1", "Misdirect", "Environment"
];

const daysOfWeek = [
    { label: 'Sun', value: 0 }, { label: 'Mon', value: 1 }, { label: 'Tue', value: 2 },
    { label: 'Wed', value: 3 }, { label: 'Thu', value: 4 }, { label: 'Fri', value: 5 },
    { label: 'Sat', value: 6 },
];

// --- Component ---
function WeeklyPlanner({ onClose, allAxes = [], allMilestones = [], targetDate }) {
    const [currentAxisIndex, setCurrentAxisIndex] = useState(0);
    const [inProgressPlan, setInProgressPlan] = useState({});
    const [isFinishing, setIsFinishing] = useState(false);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [weekStartDate, setWeekStartDate] = useState(null); // Will be set in useEffect

    // This function fetches data for a given week but does NOT set component state.
    // It returns the fetched plan data and the calculated week start date.
    const getPlanDataForWeek = useCallback(async (dateToFetch) => {
        const calculatedWeekStartDate = getWeekStartDate(dateToFetch);
        const weekId = getWeekId(calculatedWeekStartDate);


        const planDocRef = doc(db, "new_weeklyPlans", weekId);
        const tasksQuery = query(
            collection(db, "new_tasks"),
            where("parentId", "==", weekId),
            where("taskType", "==", "planned")
        );

        try {
            const [planDocSnap, tasksSnap] = await Promise.all([getDoc(planDocRef), getDocs(tasksQuery)]);
            let existingPlan = {};

            if (planDocSnap.exists()) {
                const planData = planDocSnap.data();
                if (planData.weeklyGoals) {
                    for (const axisName in planData.weeklyGoals) {
                        const themeName = dayToAxisThemeMapping.find(theme => 
                            theme.toLowerCase() === axisName.toLowerCase() || 
                            theme.toLowerCase().replace(/\s/g, '-') === axisName.toLowerCase()
                        );
                        if (themeName) {
                            existingPlan[themeName] = {
                                goal: planData.weeklyGoals[axisName].goal,
                                milestoneId: planData.weeklyGoals[axisName].milestoneId,
                                steps: [] // Steps will be populated from tasksSnap
                            };
                        }
                    }
                }
            }

            if (!tasksSnap.empty) {
                const rawTasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() })); // Capture doc.id here!

                // Group tasks by title and axisTheme, collecting assignedDays and their doc IDs
                const tasksByTitle = {};
                rawTasks.forEach(task => { // Iterate rawTasks that now include ID
                    if (!tasksByTitle[task.title]) {
                        tasksByTitle[task.title] = { text: task.title, assignedDays: [], axisTheme: task.axisTheme, docIds: [] };
                    }
                    const assignedDate = new Date(task.assignedDate + 'T00:00:00');
                    const dayOfWeek = assignedDate.getUTCDay();
                    tasksByTitle[task.title].assignedDays.push(dayOfWeek);
                    tasksByTitle[task.title].docIds.push(task.id); // Store the doc ID for the task document
                });

                for (const title in tasksByTitle) {
                    const taskGroup = tasksByTitle[title];
                    if (existingPlan[taskGroup.axisTheme]) {
                        existingPlan[taskGroup.axisTheme].steps.push({
                            text: taskGroup.text,
                            assignedDays: taskGroup.assignedDays.sort((a, b) => a - b),
                            // IMPORTANT: For simplification, we'll collect all IDs associated with this title/theme/assignedDays combo.
                            // When saving, we'll manage individual (title, assignedDate) pairs.
                            // This `allAssociatedDocIds` is for debugging/understanding, not directly used in the reconciliation below.
                            allAssociatedDocIds: taskGroup.docIds 
                        });
                    } else {
                        existingPlan[taskGroup.axisTheme] = {
                            goal: '',
                            steps: [{
                                text: taskGroup.text,
                                assignedDays: taskGroup.assignedDays.sort((a, b) => a - b),
                                allAssociatedDocIds: taskGroup.docIds
                            }]
                        };
                    }
                }
            }

            return { plan: existingPlan, weekStart: calculatedWeekStartDate };

        } catch (err) {
            console.error("Error fetching weekly plan data from Firebase:", err);
            setError("Could not load the weekly plan.");
            return { plan: {}, weekStart: calculatedWeekStartDate }; // Return empty plan on error
        }
    }, []);

    // Effect to handle initial load and updates when `targetDate` prop changes
    useEffect(() => {
        const loadPlan = async (date) => {
            setIsLoading(true); // Show loading when fetch starts
            const { plan, weekStart } = await getPlanDataForWeek(date);
            setWeekStartDate(weekStart); // Update week start date state
            setInProgressPlan(plan); // Update the plan data
            setIsLoading(false); // Hide loading when fetch finishes
        };

        const initialDate = targetDate ? new Date(targetDate) : new Date();
        loadPlan(initialDate);

    }, [targetDate, getPlanDataForWeek]);

    const handlePreviousAxis = () => setCurrentAxisIndex(prev => (prev > 0 ? prev - 1 : dayToAxisThemeMapping.length - 1));
    const handleNextAxis = () => setCurrentAxisIndex(prev => (prev < dayToAxisThemeMapping.length - 1 ? prev + 1 : 0));

    const handlePreviousWeek = async () => {
        setIsLoading(true);
        const newDate = new Date(weekStartDate);
        newDate.setDate(newDate.getDate() - 7);
        const { plan, weekStart } = await getPlanDataForWeek(newDate);
        setWeekStartDate(weekStart);
        setInProgressPlan(plan);
        setIsLoading(false);
    };

    const handleNextWeek = async () => {
        setIsLoading(true);
        const newDate = new Date(weekStartDate);
        newDate.setDate(newDate.getDate() + 7);
        const { plan, weekStart } = await getPlanDataForWeek(newDate);
        setWeekStartDate(weekStart);
        setInProgressPlan(plan);
        setIsLoading(false);
    };

    const handleAxisGoalChange = (e) => {
        const goal = e.target.value;
        setInProgressPlan(prev => ({ ...prev, [currentAxisTheme]: { ...(prev[currentAxisTheme] || { steps: [] }), goal } }));
    };

    const handleStepInputChange = (index, value) => {
        setInProgressPlan(prev => {
            const steps = [...(currentPlanData.steps || [])];
            const existingStep = steps[index] || { text: '', assignedDays: [] };
            steps[index] = { ...existingStep, text: value };
            return { ...prev, [currentAxisTheme]: { ...currentPlanData, steps } };
        });
    };

    const handleAddStepInput = () => {
        setInProgressPlan(prev => {
            const steps = [...(currentPlanData.steps || []), { text: '', assignedDays: [] }];
            return { ...prev, [currentAxisTheme]: { ...currentPlanData, steps } };
        });
    };

    const handleRemoveStepInput = (indexToRemove) => {
        setInProgressPlan(prev => {
            let steps = (currentPlanData.steps || []).filter((_, i) => i !== indexToRemove);
            if (steps.length === 0) steps = [{ text: '', assignedDays: [] }];
            return { ...prev, [currentAxisTheme]: { ...currentPlanData, steps } };
        });
    };

    const handleStepDayChange = (stepIndex, dayValue, isChecked) => {
        setInProgressPlan(prev => {
            const steps = [...(currentPlanData.steps || [])];
            const existingStep = steps[stepIndex] || { text: '', assignedDays: [] };
            const currentDays = existingStep.assignedDays || [];
            const newDays = isChecked ? [...currentDays, dayValue] : currentDays.filter(d => d !== dayValue);
            steps[stepIndex] = { ...existingStep, assignedDays: newDays.sort((a, b) => a - b) };
            return { ...prev, [currentAxisTheme]: { ...currentPlanData, steps } };
        });
    };

    const handleSelectAllDays = (stepIndex) => {
        setInProgressPlan(prev => {
            const steps = [...(currentPlanData.steps || [])];
            const step = { ...(steps[stepIndex] || { text: '', assignedDays: [] }) };
            step.assignedDays = (step.assignedDays.length === 7) ? [] : daysOfWeek.map(d => d.value);
            steps[stepIndex] = step;
            return { ...prev, [currentAxisTheme]: { ...currentPlanData, steps } };
        });
    };

    const handleFinish = async () => {
        setIsFinishing(true);
        setError(null);

        try {
            const targetPlanWeekId = getWeekId(weekStartDate);
            const batch = writeBatch(db);
            let dataError = null;

            // --- 1. Process Weekly Goals ---
            const finalWeeklyGoals = {};
            for (const axisName of dayToAxisThemeMapping) {
                const plan = inProgressPlan[axisName];
                // Only save goals if they have text or associated steps
                if (plan && (plan.goal?.trim() || (plan.steps && plan.steps.some(s => s.text?.trim())))) {
                    const axisData = allAxes.find(a => a.axisName === axisName);
                    if (!axisData) {
                        dataError = `Configuration Error: Data for axis "${axisName}" is missing.`;
                        break;
                    }
                    const axisId = axisData.id;

                    const currentYear = new Date().getFullYear();
                    const activeMilestonesForAxis = allMilestones.filter(m => {
                        if (m.axisId !== axisId || m.completionDate !== null) return false;

                        // Filter by current year using the dueDate
                        const dueDate = m.dueDate?.toDate ? m.dueDate.toDate() : null;
                        if (!dueDate) return false;

                        return dueDate.getFullYear() === currentYear;
                    });


                    // Sort by dueDate to get the earliest incomplete milestone
                    activeMilestonesForAxis.sort((a, b) => {
                        const dateA = a.dueDate?.toDate ? a.dueDate.toDate() : new Date('9999-12-31');
                        const dateB = b.dueDate?.toDate ? b.dueDate.toDate() : new Date('9999-12-31');
                        return dateA - dateB;
                    });

                    const activeMilestone = activeMilestonesForAxis.length > 0 ? activeMilestonesForAxis[0] : null;
                    
                    const goalDueDate = new Date(weekStartDate);
                    goalDueDate.setDate(weekStartDate.getDate() + 6);
                    
                    finalWeeklyGoals[axisName] = {
                        goal: plan.goal?.trim() || '', // Ensure goal is empty string if null/undefined
                        status: 'todo',
                        dueDate: goalDueDate,
                        completionDate: null,
                        milestoneId: activeMilestone ? activeMilestone.id : null
                    };
                }
            }

            if (dataError) { setError(dataError); setIsFinishing(false); return; }

            const weeklyPlanDocRef = doc(db, "new_weeklyPlans", targetPlanWeekId);
            if (Object.keys(finalWeeklyGoals).length > 0) {
                batch.set(weeklyPlanDocRef, {
                    weekId: targetPlanWeekId,
                    weeklyGoals: finalWeeklyGoals,
                    createdAt: serverTimestamp(),
                    lastUpdatedAt: serverTimestamp()
                }, { merge: true });
            } else {
            }


            // --- 2. Reconcile Planned Tasks (Steps) ---
            const currentTasksToSave = []; // Tasks derived from current UI state
            for (const axisName of dayToAxisThemeMapping) {
                const plan = inProgressPlan[axisName];
                const axisData = allAxes.find(a => a.axisName === axisName);
                if (!axisData) continue; // Skip if axis data is missing

                if (plan && Array.isArray(plan.steps)) {
                    plan.steps.forEach(step => {
                        if (step.text?.trim() && step.assignedDays?.length > 0) {
                            step.assignedDays.forEach(dayIndex => {
                                const assignedDateString = getDateStringForDayInWeek(weekStartDate, dayIndex);
                                if (assignedDateString) {
                                    currentTasksToSave.push({
                                        title: step.text.trim(),
                                        axisId: axisData.id,
                                        axisTheme: axisName,
                                        parentId: targetPlanWeekId,
                                        parentType: 'weeklyPlan',
                                        taskType: 'planned',
                                        status: 'todo',
                                        assignedDate: assignedDateString,
                                    });
                                }
                            });
                        }
                    });
                }
            }

            // Fetch ALL existing planned tasks for this specific week from Firestore
            const existingFirestoreTasksSnap = await getDocs(query(
                collection(db, "new_tasks"),
                where("parentId", "==", targetPlanWeekId),
                where("taskType", "==", "planned")
            ));
            
            const existingFirestoreTasksMap = new Map(); // Key: `${title}-${assignedDate}`, Value: Firestore Doc ID
            existingFirestoreTasksSnap.docs.forEach(doc => {
                const data = doc.data();
                const key = `${data.title}-${data.assignedDate}`;
                existingFirestoreTasksMap.set(key, doc.id);
            });


            // Determine tasks to delete and tasks to add
            const tasksToDeleteIds = [];
            const tasksToCreate = [];

            // Identify tasks to delete (exist in Firestore but not in current UI state)
            existingFirestoreTasksMap.forEach((docId, key) => {
                const isStillInUI = currentTasksToSave.some(task => `${task.title}-${task.assignedDate}` === key);
                if (!isStillInUI) {
                    tasksToDeleteIds.push(docId);
                }
            });

            // Identify tasks to create (exist in current UI state but not in Firestore)
            currentTasksToSave.forEach(taskData => {
                const key = `${taskData.title}-${taskData.assignedDate}`;
                if (!existingFirestoreTasksMap.has(key)) {
                    tasksToCreate.push(taskData);
                }
            });

            // Add delete operations to batch
            tasksToDeleteIds.forEach(docId => {
                batch.delete(doc(db, "new_tasks", docId));
            });

            // Add create operations to batch
            tasksToCreate.forEach(taskData => {
                const newTaskDocRef = doc(collection(db, "new_tasks"));
                batch.set(newTaskDocRef, { ...taskData, createdAt: serverTimestamp(), completedAt: null });
            });

            if (Object.keys(finalWeeklyGoals).length === 0 && currentTasksToSave.length === 0 && tasksToDeleteIds.length === 0) {
                 setError("Nothing to save. Please enter at least one weekly goal or step.");
                 setIsFinishing(false);
                 return;
            }

            // Commit the batch
            await batch.commit();

            if (onClose) onClose();

        } catch (err) {
            console.error("--- FIRESTORE WRITE FAILED ---", err);
            setError(`Failed to save plan. Check console for details: ${err.message}`);
        } finally {
            setIsFinishing(false);
        }
    };
    
    if (isLoading || !weekStartDate) {
        return <div className={styles.loading}>Loading Plan...</div>;
    }

    const currentAxisTheme = dayToAxisThemeMapping[currentAxisIndex];
    const options = { month: 'long', day: 'numeric' };
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);
    const weekRangeString = `Planning for: ${weekStartDate.toLocaleDateString(undefined, options)} (Sun) to ${weekEndDate.toLocaleDateString(undefined, options)} (Sat)`;

    const currentPlanData = inProgressPlan[currentAxisTheme] || {};
    const displayGoal = currentPlanData.goal || '';
    const displayStepsArray = Array.isArray(currentPlanData.steps) && currentPlanData.steps.length > 0
        ? currentPlanData.steps
        : [{ text: '', assignedDays: [] }];

    return (
        <div className={styles.weeklyPlannerModalContent}>
            <h3 className={styles.plannerTitle}>{currentAxisTheme} - Weekly Plan</h3>
            <p className={styles.weekRange}>{weekRangeString}</p>

            <div className={styles.weekNavigation}>
                <button type="button" onClick={handlePreviousWeek} className={styles.navButton} disabled={isFinishing}>
                    &larr; Previous Week
                </button>
                <button type="button" onClick={handleNextWeek} className={styles.navButton} disabled={isFinishing}>
                    Next Week &rarr;
                </button>
            </div>

            <div className={styles.plannerLayout}>
                <ContextMap axisName={currentAxisTheme} />

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
                                            value={step.text || ''}
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
                                        <button 
                                            type="button" 
                                            onClick={() => handleSelectAllDays(index)}
                                            className={styles.allDaysButton}
                                            title="Select/Deselect All Days"
                                        >
                                            All
                                        </button>
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
                <button type="button" onClick={handlePreviousAxis} className={styles.navButton} disabled={isFinishing}>
                    &larr; Previous Axis
                </button>
                <button type="button" onClick={handleFinish} className={`${styles.navButton} ${styles.finishButton}`} disabled={isFinishing}>
                    {isFinishing ? 'Saving Plan...' : 'Finish Planning & Save All'}
                </button>
                <button type="button" onClick={handleNextAxis} className={styles.navButton} disabled={isFinishing}>
                    Next Axis &rarr;
                </button>
            </div>
        </div>
    );
}

export default WeeklyPlanner;