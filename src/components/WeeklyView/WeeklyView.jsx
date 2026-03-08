// src/components/WeeklyView/WeeklyView.jsx
import React, { useState, useEffect } from 'react';
import styles from './WeeklyView.module.css';
import Modal from '../Modal/Modal';
import WeeklyPlanner from '../WeeklyPlanner/WeeklyPlanner';
import BudgetForm from '../BudgetForm/BudgetForm';
import { db } from '../../firebaseConfig';
import PrepareModal from '../PrepareModal/PrepareModal';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    updateDoc,
    serverTimestamp, // --- FIX: Import serverTimestamp ---
} from "firebase/firestore";

import HabitChainView from '../HabitChainView/HabitChainView';

// --- Helper Functions ---

function getWeekId(date = new Date()) {
    const targetDate = new Date(date);
    targetDate.setHours(12, 0, 0, 0);
    const weekStartDate = new Date(targetDate);
    weekStartDate.setDate(targetDate.getDate() - targetDate.getDay());
    const year = weekStartDate.getFullYear();
    const janFirst = new Date(year, 0, 1);
    const firstWeekStartDate = new Date(janFirst);
    firstWeekStartDate.setDate(janFirst.getDate() - janFirst.getDay());
    const diffInMilliseconds = weekStartDate.getTime() - firstWeekStartDate.getTime();
    const diffInDays = diffInMilliseconds / (1000 * 60 * 60 * 24);
    const weekNumber = Math.round(diffInDays / 7) + 1;
    return `${year}-W${String(weekNumber).padStart(2, '0')}`;
}

function getWeekDates(weekId) {
    try {
        const [year, week] = weekId.split('-W').map(Number);
        const aDayInWeek = new Date(Date.UTC(year, 0, 4 + (week - 1) * 7));
        const dayOfWeek = aDayInWeek.getUTCDay();
        const startDate = new Date(aDayInWeek);
        startDate.setUTCDate(aDayInWeek.getUTCDate() - dayOfWeek);
        const endDate = new Date(startDate);
        endDate.setUTCDate(startDate.getUTCDate() + 6);
        const options = { month: 'short', day: 'numeric' };
        return {
            start: startDate.toLocaleDateString(undefined, options),
            end: endDate.toLocaleDateString(undefined, options),
        };
    } catch (e) {
        console.error("Error parsing week ID for getWeekDates:", weekId, e);
        return { start: 'N/A', end: 'N/A' };
    }
}

const axisNameToCssVarSuffix = (axisName) => {
    if (!axisName || typeof axisName !== 'string') return 'default';
    return axisName.trim().toLowerCase().replace(/\s+/g, '-').replace(/\+/g, '-plus-');
};

const axisDisplayOrder = [
    "Rest and preparation", "Physical", "Financial", "Gear",
    "On Track N+1", "Misdirect", "Environment"
];

const dayIndexToAxisTheme = {
    0: "Rest and preparation", 1: "Physical", 2: "Financial", 3: "Gear",
    4: "On Track N+1", 5: "Misdirect", 6: "Environment"
};
const dayIndexToName = {
    0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday",
    4: "Thursday", 5: "Friday", 6: "Saturday"
};
const displayDayOrder = [1, 2, 3, 4, 5, 6, 0];


function WeeklyView({ onNavigate }) {
    const [isPlannerModalOpen, setIsPlannerModalOpen] = useState(false);
    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
    const [isPrepareModalOpen, setIsPrepareModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [currentWeekId, setCurrentWeekId] = useState("");
    const [currentWeekDates, setCurrentWeekDates] = useState({ start: '', end: '' });
    const [currentWeeklyPlanData, setCurrentWeeklyPlanData] = useState(null);
    const [schedulePlanData, setSchedulePlanData] = useState(null);

    const [allAxesData, setAllAxesData] = useState({});
    const [allMilestones, setAllMilestones] = useState([]);
    const [isSavingGoal, setIsSavingGoal] = useState(false);
    
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            
            const today = new Date();
            const currentWeek = getWeekId(today);
            const nextWeekDate = new Date();
            nextWeekDate.setDate(today.getDate() + 7);
            const nextWeek = getWeekId(nextWeekDate);

            setCurrentWeekId(currentWeek);
            setCurrentWeekDates(getWeekDates(currentWeek));

            try {
                // Get current year for filtering milestones
                const currentYear = today.getFullYear();

                // Fetch yearly goals for current year to get their goalIds
                const goalsQuery = query(
                    collection(db, "new_goals"),
                    where("type", "==", "yearly"),
                    where("year", "==", currentYear)
                );

                const currentPlanRef = doc(db, "new_weeklyPlans", currentWeek);
                const nextWeekPlanRef = doc(db, "new_weeklyPlans", nextWeek);

                const [currentPlanSnap, nextWeekPlanSnap, axesSnapshot, goalsSnapshot] = await Promise.all([
                    getDoc(currentPlanRef),
                    getDoc(nextWeekPlanRef),
                    getDocs(collection(db, "new_axes")),
                    getDocs(goalsQuery),
                ]);

                setCurrentWeeklyPlanData(currentPlanSnap.exists() ? currentPlanSnap.data() : { weeklyGoals: {} });

                if (nextWeekPlanSnap.exists()) {
                    setSchedulePlanData(nextWeekPlanSnap.data());
                } else {
                    setSchedulePlanData(currentPlanSnap.exists() ? currentPlanSnap.data() : { weeklyGoals: {} });
                }

                const axesDataMap = {};
                axesSnapshot.forEach(doc => {
                    const d = doc.data();
                    if(d.axisName) axesDataMap[d.axisName] = { id: doc.id, ...d };
                });
                setAllAxesData(axesDataMap);

                // Extract goalIds from current year's goals
                const currentYearGoalIds = goalsSnapshot.docs.map(doc => doc.data().goalId).filter(Boolean);

                // Fetch only milestones linked to current year's goals
                let milestonesList = [];
                if (currentYearGoalIds.length > 0) {
                    const milestonesQuery = query(
                        collection(db, "new_milestones"),
                        where("goalId", "in", currentYearGoalIds)
                    );
                    const milestonesSnapshot = await getDocs(milestonesQuery);
                    milestonesList = milestonesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                }
                setAllMilestones(milestonesList);

            } catch (err) {
                console.error("WeeklyView: Error fetching weekly data:", err);
                setError("Failed to load weekly data. Check console.");
            } finally {
                setIsLoading(false);
            }
        };
    
        fetchData();
    }, []);

    // --- FIX: This function now correctly updates both status and completionDate ---
    const handleGoalToggle = async (goalKey, currentStatus) => {
        if (isSavingGoal || !currentWeeklyPlanData || !currentWeekId || !goalKey) return;
        
        setIsSavingGoal(true);
        const newStatus = currentStatus === 'completed' ? 'todo' : 'completed';
        const weeklyPlanRef = doc(db, "new_weeklyPlans", currentWeekId);
        
        // Determine the new completion date based on the new status
        const newCompletionDate = newStatus === 'completed' ? serverTimestamp() : null;
        
        // This is the payload we will send to Firestore
        const updatePayload = {
            [`weeklyGoals.${goalKey}.status`]: newStatus,
            [`weeklyGoals.${goalKey}.completionDate`]: newCompletionDate
        };

        try {
            // Optimistically update the local state for immediate UI feedback
            setCurrentWeeklyPlanData(prevData => {
                const newWeeklyGoals = { ...prevData.weeklyGoals };
                if (newWeeklyGoals[goalKey]) {
                    newWeeklyGoals[goalKey].status = newStatus;
                    // For the optimistic update, we can use a local new Date()
                    newWeeklyGoals[goalKey].completionDate = newStatus === 'completed' ? new Date() : null;
                }
                return { ...prevData, weeklyGoals: newWeeklyGoals };
            });

            // Update the document in Firestore
            await updateDoc(weeklyPlanRef, updatePayload);

        } catch (error) {
            console.error(`WeeklyView: Error updating goal status for key ${goalKey}:`, error);
            setError(`Failed to update status.`);
            // Revert the optimistic update if the Firestore call fails
            setCurrentWeeklyPlanData(prevData => {
                 const newWeeklyGoals = { ...prevData.weeklyGoals };
                if (newWeeklyGoals[goalKey]) {
                    newWeeklyGoals[goalKey].status = currentStatus; // Revert status
                    // Note: Reverting the date precisely isn't critical but possible if needed
                    newWeeklyGoals[goalKey].completionDate = currentStatus === 'completed' ? new Date() : null;
                }
                return { ...prevData, weeklyGoals: newWeeklyGoals };
            });
        } finally {
            setIsSavingGoal(false);
        }
    };
    
    const closePlannerModal = () => setIsPlannerModalOpen(false);
    const openBudgetModal = () => setIsBudgetModalOpen(true);
    const closeBudgetModal = () => setIsBudgetModalOpen(false);
    const handleBudgetSubmit = (formData) => {
        console.log("Budget Routine Submitted (in WeeklyView):", formData);
        closeBudgetModal();
    };

    const findGoalObject = (goals, axisName) => {
    if (!goals || !axisName) return { goalData: null, foundKey: null };
    
    // 1. Check for the correct, new format first (e.g., "On Track N+1")
    if (goals[axisName]) {
        return { goalData: goals[axisName], foundKey: axisName };
    }

    // 2. Fallback for old format: all lowercase (e.g., "on track n+1")
    const keyWithSpaces = axisName.toLowerCase();
    if (goals[keyWithSpaces]) {
        return { goalData: goals[keyWithSpaces], foundKey: keyWithSpaces };
    }

    // 3. Fallback for oldest format: lowercase and hyphenated (e.g., "on-track-n+1")
    const keyWithHyphens = keyWithSpaces.replace(/\s/g, '-');
    if (goals[keyWithHyphens]) {
        return { goalData: goals[keyWithHyphens], foundKey: keyWithHyphens };
    }
    
    // If none of the formats match, return null
    return { goalData: null, foundKey: null };
};

    return (
        <div className={styles.weeklyViewContainer}>
            <h2 className={styles.viewTitle}>
                Weekly Dashboard - Week {currentWeekId.split('-W')[1] || ''}: {currentWeekDates.start} - {currentWeekDates.end}
            </h2>

            {isLoading ? (
                <p>Loading weekly data...</p>
            ) : error ? (
                <p className={styles.errorText}>{error}</p>
            ) : (
                <>
                    <div className={styles.axisGrid}>
                        {axisDisplayOrder.map((axisName) => {
                            const { goalData: weeklyGoalObject, foundKey } = findGoalObject(currentWeeklyPlanData?.weeklyGoals, axisName);
                            
                            const weeklyGoal = weeklyGoalObject?.goal || "";
                            const goalStatus = weeklyGoalObject?.status || 'pending';
                            const milestoneId = weeklyGoalObject?.milestoneId;
                            const milestone = allMilestones.find(m => m.id === milestoneId);

                            return (
                                <div key={axisName} className={styles.axisCard}>
                                    <div className={styles.cardContent}>
                                        <div className={styles.cardLeft}>
                                            <h3 className={styles.axisTitle}>{axisName}</h3>
                                            <HabitChainView 
                                            axisName={axisName}
                                            /> 
                                        </div>
                                        <div className={styles.cardRight}>
                                            <div className={styles.goalDisplay}>
                                                <input type="checkbox" id={`goal-check-${axisName.replace(/\s+/g, '-')}`} checked={goalStatus === 'completed'} onChange={() => handleGoalToggle(foundKey, goalStatus)} disabled={isSavingGoal || !weeklyGoal} className={styles.goalCheckbox} />
                                                <p className={`${styles.goalText} ${goalStatus === 'completed' ? styles.completedGoal : ''}`} title={weeklyGoal}>
                                                    {weeklyGoal || <i className={styles.notSet}>Goal not set</i>}
                                                </p>
                                            </div>
                                            <div className={styles.milestoneDisplay}>
                                                <span className={styles.label}>Milestone:</span>
                                                {milestone ? ( 
                                                    <span className={styles.value} title={milestone.title}> 
                                                        {milestone.title} 
                                                        {milestone.dueDate && typeof milestone.dueDate.toDate === 'function' && ` (Due: ${milestone.dueDate.toDate().toLocaleDateString()})`} 
                                                    </span> 
                                                ) : ( <i className={styles.notSet}>None</i> )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className={styles.topButtonContainer}>
                        <button className={styles.actionButton} onClick={() => setIsPlannerModalOpen(true)}> Plan Next Week </button>
                        <button className={`${styles.actionButton} ${styles.budgetButton}`} onClick={openBudgetModal}> Budget </button>
                         <button className={`${styles.actionButton} ${styles.prepareButton}`} onClick={() => setIsPrepareModalOpen(true)}>
                            Prepare for Week
                        </button>
                    </div>
                    
                    <h3 className={styles.sectionHeader}>Daily Task Schedule</h3>
                    <div className={styles.weekDaysContainerHorizontal}>
                        {displayDayOrder.map((dayIndex) => {
                            const axisTheme = dayIndexToAxisTheme[dayIndex];
                            if (!axisTheme) return null;
                            const dayName = dayIndexToName[dayIndex];
                            const axisCssSuffix = axisNameToCssVarSuffix(axisTheme);
                            
                            const { goalData: dayGoalObject } = findGoalObject(schedulePlanData?.weeklyGoals, axisTheme);
                            const dayGoal = dayGoalObject?.goal || "";

                            const dayCardStyle = {
                                backgroundColor: `var(--axis-color-${axisCssSuffix}-1, var(--axis-color-default-1))`,
                                borderColor: `var(--axis-color-${axisCssSuffix}-3, var(--axis-color-default-3))`
                            };

                            return (
                                <div key={dayIndex} className={styles.dayCardHorizontal} style={dayCardStyle}>
                                    <h4 className={styles.dayName}>{dayName}</h4>
                                    <p className={styles.dayAxisName}>{axisTheme}</p>
                                    <div className={styles.dayContent}>
                                        <div className={styles.daySection}>
                                            <strong className={styles.daySectionTitle}>Weekly Goal:</strong>
                                            <p className={styles.dayGoalTextInCard}>
                                                {dayGoal || <i className={styles.notSet}>Not set</i>}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {isPlannerModalOpen && ( <Modal isOpen={isPlannerModalOpen} onClose={closePlannerModal}> <WeeklyPlanner onClose={closePlannerModal} allAxes={Object.values(allAxesData)} allMilestones={allMilestones} /> </Modal> )}
            {isBudgetModalOpen && ( <Modal isOpen={isBudgetModalOpen} onClose={closeBudgetModal}> <BudgetForm onSubmit={handleBudgetSubmit} onClose={closeBudgetModal} onNavigate={onNavigate} /> </Modal> )}
            {isPrepareModalOpen && (
                <Modal isOpen={isPrepareModalOpen} onClose={() => setIsPrepareModalOpen(false)}>
                    <PrepareModal
                        onClose={() => setIsPrepareModalOpen(false)}
                        weeklyGoals={currentWeeklyPlanData?.weeklyGoals}
                    />
                </Modal>
            )}</div>
    );
}

export default WeeklyView;