import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../../firebaseConfig';
import { collection, getDoc, getDocs, query, where, doc, updateDoc, setDoc, documentId, serverTimestamp } from "firebase/firestore";
import ProjectMap from '../ProjectMap';

// --- Color Mapping ---
const axisColorMap = {
    "Physical":           { light: '#FDC1B4', medium: '#f59284', dark: '#e7514c' },
    "Financial":          { light: '#e9def4', medium: '#beaccf', dark: '#927aaa' },
    "Gear":               { light: '#c9ebf4', medium: '#7ebde0', dark: '#3280a7' },
    "ON TRACK N+1":       { light: '#BCDDDC', medium: '#618882', dark: '#053229' },
    "Environment":        { light: '#efe5c3', medium: '#e3d295', dark: '#d8bf67' },
    "Misdirect":          { light: '#b0e8d7', medium: '#78bfa1', dark: '#409c7c' },
    "Rest and preparation": { light: '#eaf1fa', medium: '#cbdbe7', dark: '#aec6de' },
    "on-track-n+1":       { light: '#BCDDDC', medium: '#618882', dark: '#053229' },
    "default":            { light: '#F1F5F9', medium: '#abb5c2', dark: '#64748B' }
};

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

const getGoalMapKey = (axisName) => {
    if (!axisName) return '';
    return axisName.toLowerCase().replace(/\s/g, '-').replace(/\+/g, '-');
};


function MilestoneTimelineModal({ isOpen, onClose, milestoneId }) {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [parentMilestone, setParentMilestone] = useState(null);
    const [parentAxis, setParentAxis] = useState(null);
    const [projectMapData, setProjectMapData] = useState([]);
    const [timelineSpan, setTimelineSpan] = useState(null);
    const [addingToDate, setAddingToDate] = useState(null);

    const fetchData = useCallback(async () => {
        if (!isOpen || !milestoneId) return;
        setIsLoading(true);
        setError(null);

        try {
            const milestoneRef = doc(db, "new_milestones", milestoneId);
            const milestoneSnap = await getDoc(milestoneRef);
            if (!milestoneSnap.exists()) throw new Error("Milestone not found.");
            const currentMilestone = { id: milestoneSnap.id, ...milestoneSnap.data() };
            setParentMilestone(currentMilestone);

            const axisRef = doc(db, "new_axes", currentMilestone.axisId);
            const axisSnap = await getDoc(axisRef);
            if (!axisSnap.exists()) throw new Error("Parent axis not found.");
            const currentAxis = { id: axisSnap.id, ...axisSnap.data() };
            setParentAxis(currentAxis);

            const goalMapKey = getGoalMapKey(currentAxis.axisName);
            const weeklyPlansQuery = query(
                collection(db, "new_weeklyPlans"),
                where(`weeklyGoals.${goalMapKey}.milestoneId`, "==", currentMilestone.id)
            );
            const weeklyPlansSnapshot = await getDocs(weeklyPlansQuery);
            
            const relevantWeeklyGoals = [];
            weeklyPlansSnapshot.forEach(weeklyPlanDoc => {
                const weeklyPlan = weeklyPlanDoc.data();
                if (weeklyPlan.weeklyGoals && weeklyPlan.weeklyGoals[goalMapKey]) {
                    const goal = weeklyPlan.weeklyGoals[goalMapKey];
                    relevantWeeklyGoals.push({
                        id: `${weeklyPlanDoc.id}_${goalMapKey}`,
                        weeklyPlanDocId: weeklyPlanDoc.id,
                        axisKey: goalMapKey,
                        ...goal
                    });
                }
            });

            const allMilestonesForGoalQuery = query(collection(db, "new_milestones"), where("goalId", "==", currentMilestone.goalId));
            const allMilestonesSnap = await getDocs(allMilestonesForGoalQuery);
            const allMilestonesForGoal = allMilestonesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            const sortedMilestones = allMilestonesForGoal.sort((a, b) => (a.dueDate.toDate() || 0) - (b.dueDate.toDate() || 0));
            const currentIndex = sortedMilestones.findIndex(m => m.id === currentMilestone.id);

            let startpointItem = null;
            let startDateForTimeline;
            if (currentIndex > 0) {
                const previousMilestone = sortedMilestones[currentIndex - 1];
                startpointItem = { ...previousMilestone };
                startDateForTimeline = previousMilestone.completionDate?.toDate() || previousMilestone.dueDate.toDate();
            } else {
                const milestoneYear = currentMilestone.dueDate.toDate().getFullYear();
                startDateForTimeline = new Date(milestoneYear, 0, 1);
            }

            const endDateForTimeline = currentMilestone.completionDate?.toDate() || currentMilestone.dueDate.toDate();

            setTimelineSpan({ start: startDateForTimeline, end: endDateForTimeline });

            const structuredProjectMapData = [{
                id: currentAxis.id,
                axisName: currentAxis.axisName,
                startpoint: startpointItem,
                items: relevantWeeklyGoals,
                endpoint: currentMilestone
            }];
            setProjectMapData(structuredProjectMapData);

        } catch (err) {
            console.error("Error fetching Milestone Timeline data:", err);
            setError("Failed to load timeline data.");
        } finally {
            setIsLoading(false);
        }
    }, [isOpen, milestoneId]);

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen, fetchData]);

    const handleSaveNewGoal = async (goalTitle, dueDate) => {
        if (!goalTitle.trim() || !dueDate || !parentAxis || !parentMilestone) return;

        const weekId = getWeekId(dueDate);
        const goalMapKey = getGoalMapKey(parentAxis.axisName);
        const weeklyPlanRef = doc(db, "new_weeklyPlans", weekId);

        const newGoalData = {
            goal: goalTitle.trim(),
            status: 'todo',
            dueDate: dueDate,
            completionDate: null,
            milestoneId: parentMilestone.id,
        };

        try {
            await setDoc(weeklyPlanRef, {
                weekId: weekId,
                weeklyGoals: {
                    [goalMapKey]: newGoalData
                }
            }, { merge: true });

            setAddingToDate(null);
            fetchData();

        } catch (error) {
            console.error("Error saving new weekly goal:", error);
            setError("Failed to save new goal. Please try again.");
        }
    };

    const handleUpdateItem = async (itemId, updatedData) => {
        const isMilestone = !itemId.includes('_');
        
        if (isMilestone) {
            const milestoneRef = doc(db, "new_milestones", itemId);
            try {
                if (updatedData.completionDate) updatedData.status = 'completed';
                else if (updatedData.completionDate === null) updatedData.status = 'todo';
                await updateDoc(milestoneRef, updatedData);
                fetchData();
            } catch (error) {
                console.error("Error updating milestone:", error);
                setError("Could not update milestone.");
            }
        } else {
            const [weeklyPlanDocId, axisKey] = itemId.split('_');
            const weeklyPlanRef = doc(db, "new_weeklyPlans", weeklyPlanDocId);
            try {
                const planSnap = await getDoc(weeklyPlanRef);
                if (planSnap.exists()) {
                    const existingGoals = planSnap.data().weeklyGoals;
                    const goalToUpdate = existingGoals[axisKey];
                    const updatedGoal = { ...goalToUpdate, ...updatedData };

                    if (updatedData.completionDate) updatedGoal.status = 'completed';
                    else if (updatedData.completionDate === null) updatedGoal.status = 'todo';

                    await updateDoc(weeklyPlanRef, {
                        [`weeklyGoals.${axisKey}`]: updatedGoal
                    });
                    fetchData();
                }
            } catch (error) {
                console.error("Error updating weekly goal:", error);
                setError("Could not update weekly goal.");
            }
        }
    };

    if (!isOpen) return null;
    
    const axisColors = parentAxis ? axisColorMap[parentAxis.axisName] || axisColorMap.default : axisColorMap.default;
    
    const axisInfoStyle = {
        marginTop: '0.75rem',
        padding: '1rem 1.5rem',
        borderRadius: '12px',
        backgroundColor: '#ffffff',
        border: `2px solid ${axisColors.light}`,
        boxShadow: `0 0 0 2px ${axisColors.medium}, 0 0 0 4px ${axisColors.dark}`,
        maxWidth: 'fit-content',
        textAlign: 'left',
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#f9fafb', width: '95%', height: '95%', borderRadius: '1rem', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', flexShrink: 0 }}>
                    <div style={{ textAlign: 'left' }}>
                        <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', margin: 0 }}>
                            Milestone: {parentMilestone ? parentMilestone.title : 'Loading...'}
                        </h2>
                        <p style={{ color: '#6b7280', marginTop: '0.25rem', marginBottom: 0 }}>
                            Weekly goals linked to this milestone.
                        </p>
                        {/* --- FIX: Restored the Axis Info Box to its correct location --- */}
                        {parentAxis && (
                            <div style={axisInfoStyle}>
                                <p style={{fontWeight: '700', fontSize: '1rem', color: axisColors.dark, margin: '0 0 0.5rem 0'}}>Axis: {parentAxis.axisName}</p>
                                <p style={{fontWeight: '500', fontSize: '0.95rem', margin: '0 0 0.5rem 0'}}>Question: {parentAxis.question}</p>
                                {parentAxis.overview && <p style={{marginTop: '0.5rem', fontStyle: 'italic', fontSize: '0.95rem', margin: 0}}>{parentAxis.overview}</p>}
                            </div>
                        )}
                    </div>
                    <div style={{display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0}}>
                        {/* --- FIX: Restored the "Add Weekly Goal" button --- */}
                        <button 
                            onClick={() => alert("Add Goal functionality to be implemented.")} // Placeholder action
                            style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: '#4A90E2',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            Add Weekly Goal
                        </button>
                        <button onClick={onClose} style={{ padding: '0.5rem 1rem', backgroundColor: '#e2e8f0', color: '#4a5563', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                            Zoom Out
                        </button>
                    </div>
                </div>

                <div style={{ flexGrow: 1, overflowY: 'auto', padding: '1rem 0' }}>
                    {isLoading ? (<p>Loading Timeline...</p>) : error ? (<p style={{ color: 'red' }}>{error}</p>) : (
                        <>
                        
                            <ProjectMap 
                                data={projectMapData} 
                                timeSpan={timelineSpan} 
                                onUpdateItem={handleUpdateItem}
                                onAddGoalClick={setAddingToDate}
                                addingToDate={addingToDate}
                                onSaveNewGoal={handleSaveNewGoal}
                                onCancelAdd={() => setAddingToDate(null)}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MilestoneTimelineModal;