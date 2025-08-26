import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../../firebaseConfig';
import { collection, getDocs, query, where, addDoc, updateDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import Timeline from '../Timeline';
import MilestoneTimelineModal from '../MilestoneTimelineModal/MilestoneTimelineModal';

const AXES_ORDER = ["Physical", "Financial", "Gear", "Environment", "Misdirect", "Rest and preparation", "On Track N+1"];

function YearlyTimelineModal({ isOpen, onClose, year }) {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timelineData, setTimelineData] = useState([]);
    const [allAxes, setAllAxes] = useState([]);
    const [filter, setFilter] = useState('All');

    const [isAddMilestoneModalOpen, setIsAddMilestoneModalOpen] = useState(false);
    const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
    const [newMilestoneDueDate, setNewMilestoneDueDate] = useState('');
    const [selectedAxisForNewMilestone, setSelectedAxisForNewMilestone] = useState('');
    const [selectedGoalForNewMilestone, setSelectedGoalForNewMilestone] = useState('');
    const [yearlyGoalsInScope, setYearlyGoalsInScope] = useState([]);

    const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
    const [selectedMilestoneId, setSelectedMilestoneId] = useState(null);

    const fetchData = useCallback(async () => {
        if (!year) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);

        try {
            const axesSnapshot = await getDocs(collection(db, "new_axes"));
            const axesList = axesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllAxes(axesList);

            const goalsQuery = query(
                collection(db, "new_goals"),
                where("type", "==", "yearly"),
                where("year", "==", year)
            );
            const goalsSnapshot = await getDocs(goalsQuery);
            const yearlyGoals = goalsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setYearlyGoalsInScope(yearlyGoals);

            const goalIdsForLookup = yearlyGoals.map(g => g.goalId).filter(Boolean);
            
            let milestonesList = [];
            if (goalIdsForLookup.length > 0) {
                const milestonesQuery = query(
                    collection(db, "new_milestones"),
                    where("goalId", "in", goalIdsForLookup)
                );
                const milestonesSnapshot = await getDocs(milestonesQuery);
                milestonesList = milestonesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }

            const dataByAxis = axesList.map(axis => {
                const yearlyGoalsForAxis = yearlyGoals.filter(g => g.axisId === axis.id);
                const milestonesForAxis = milestonesList.filter(m => m.axisId === axis.id);
                
                return {
                    ...axis,
                    items: [...milestonesForAxis, ...yearlyGoalsForAxis],
                };
            });
            
            setTimelineData(dataByAxis);

        } catch (err) {
            console.error(`Error fetching Year Timeline data for ${year}:`, err);
            setError("Failed to load timeline data.");
        } finally {
            setIsLoading(false);
        }
    }, [year]);

    useEffect(() => {
        if(isOpen) {
            fetchData();
        }
    }, [isOpen, fetchData]);

    const handleUpdateItem = async (itemId, updatedData) => {
        try {
            if (updatedData.completionDate) updatedData.status = 'completed';
            else if (updatedData.completionDate === null) updatedData.status = 'todo';

            const goalRef = doc(db, "new_goals", itemId);
            const milestoneRef = doc(db, "new_milestones", itemId);
            
            try {
                await updateDoc(milestoneRef, updatedData);
            } catch (e) {
                await updateDoc(goalRef, updatedData);
            }

            fetchData();
        } catch (error) {
            console.error("Error updating item:", error);
            setError("Could not update item. Please try again.");
        }
    };
    
    const handleAddMilestone = async () => {
        if (!newMilestoneTitle.trim() || !newMilestoneDueDate || !selectedAxisForNewMilestone || !selectedGoalForNewMilestone) {
            setError("Please fill all required fields for the new milestone.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const selectedGoal = yearlyGoalsInScope.find(g => g.id === selectedGoalForNewMilestone);
            if (!selectedGoal) {
                setError("Selected goal not found.");
                setIsLoading(false);
                return;
            }

            const newMilestoneRef = doc(collection(db, "new_milestones"));
            const newMilestoneId = newMilestoneRef.id;

            const milestoneData = {
                milestoneId: newMilestoneId,
                title: newMilestoneTitle.trim(),
                dueDate: new Date(newMilestoneDueDate),
                completionDate: null,
                status: 'todo',
                goalId: selectedGoal.goalId,
                axisId: selectedGoal.axisId,
                createdAt: serverTimestamp(),
                type: 'milestone',
            };

            await setDoc(newMilestoneRef, milestoneData);
            
            setNewMilestoneTitle('');
            setNewMilestoneDueDate('');
            setSelectedAxisForNewMilestone('');
            setSelectedGoalForNewMilestone('');
            setIsAddMilestoneModalOpen(false);

            fetchData();
        } catch (err) {
            console.error("Error adding new milestone:", err);
            setError("Failed to add new milestone.");
            setIsLoading(false);
        }
    };

    const filteredGoalsForNewMilestone = yearlyGoalsInScope.filter(goal => 
        selectedAxisForNewMilestone ? goal.axisId === selectedAxisForNewMilestone : true
    );

    const handleZoomIntoMilestone = (milestoneId) => {
        setSelectedMilestoneId(milestoneId);
        setIsMilestoneModalOpen(true);
    };

    if (!isOpen) return null;

    const filteredData = timelineData.filter(axis => filter === 'All' || axis.axisName === filter);
    const sortedData = AXES_ORDER.map(name => filteredData.find(axis => axis.axisName === name)).filter(Boolean);

    const timeSpan = { start: new Date(year, 0, 1), end: new Date(year, 11, 31) };

    return (
        <>
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#f9fafb', width: '95%', height: '95%', borderRadius: '1rem', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', flexShrink: 0 }}>
                        <div>
                            <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Year Timeline ({year})</h2>
                            <p style={{ color: '#6b7280' }}>An overview of all major Milestones for the year.</p>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '1.5rem'}}>
                            <button 
                                onClick={() => setIsAddMilestoneModalOpen(true)}
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
                                Add Milestone
                            </button>
                            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                <label htmlFor="axis-filter-year" style={{ fontWeight: '600' }}>Filter by Axis:</label>
                                <select id="axis-filter-year" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}>
                                    <option value="All">All Axes</option>
                                    {allAxes.map(axis => (<option key={axis.id} value={axis.axisName}>{axis.axisName}</option>))}
                                </select>
                            </div>
                            <button onClick={onClose} style={{ 
                                padding: '0.5rem 1rem', 
                                backgroundColor: '#e2e8f0', 
                                color: '#4a5563', 
                                border: 'none', 
                                borderRadius: '0.5rem', 
                                cursor: 'pointer',
                                fontSize: '0.875rem', 
                                fontWeight: '600',
                                whiteSpace: 'nowrap' 
                            }}>
                                Zoom Out
                            </button>
                        </div>
                    </div>

                    <div style={{ flexGrow: 1, overflowY: 'auto', padding: '1rem 0' }}>
                        {isLoading ? (<p>Loading Timeline...</p>) : error ? (<p style={{ color: 'red' }}>{error}</p>) : (
                            <Timeline 
                                data={sortedData} 
                                timeSpan={timeSpan} 
                                onUpdateItem={handleUpdateItem} 
                                onZoomIntoMilestone={handleZoomIntoMilestone}
                                itemType="milestone"
                            />
                        )}
                    </div>
                </div>
            </div>

            {isAddMilestoneModalOpen && (
                <div style={{ 
                    position: 'fixed', 
                    top: 0, left: 0, right: 0, bottom: 0, 
                    backgroundColor: 'rgba(0,0,0,0.6)', 
                    zIndex: 1200, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                }}>
                    <div style={{ 
                        background: 'white', 
                        padding: '2rem', 
                        borderRadius: '0.75rem', 
                        boxShadow: '0 8px 24px rgba(0,0,0,0.2)', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '1rem', 
                        minWidth: '350px'
                    }}>
                        <h3 style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem'}}>Add New Milestone</h3>
                        
                        <label style={{fontWeight: '600', fontSize: '0.875rem'}}>Title:</label>
                        <input 
                            type="text" 
                            value={newMilestoneTitle} 
                            onChange={(e) => setNewMilestoneTitle(e.target.value)} 
                            style={{padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '0.375rem'}}
                            placeholder="e.g., Complete Phase 1 Training"
                        />

                        <label style={{fontWeight: '600', fontSize: '0.875rem'}}>Due Date:</label>
                        <input 
                            type="date" 
                            value={newMilestoneDueDate} 
                            onChange={(e) => setNewMilestoneDueDate(e.target.value)} 
                            style={{padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '0.375rem'}}
                        />

                        <label style={{fontWeight: '600', fontSize: '0.875rem'}}>Axis:</label>
                        <select 
                            value={selectedAxisForNewMilestone} 
                            onChange={(e) => {
                                setSelectedAxisForNewMilestone(e.target.value);
                                setSelectedGoalForNewMilestone('');
                            }}
                            style={{padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '0.375rem'}}
                        >
                            <option value="">Select Axis</option>
                            {allAxes.map(axis => (
                                <option key={axis.id} value={axis.id}>{axis.axisName}</option>
                            ))}
                        </select>

                        <label style={{fontWeight: '600', fontSize: '0.875rem'}}>Parent Goal:</label>
                        <select 
                            value={selectedGoalForNewMilestone} 
                            onChange={(e) => setSelectedGoalForNewMilestone(e.target.value)} 
                            disabled={!selectedAxisForNewMilestone}
                            style={{padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '0.375rem'}}
                        >
                            <option value="">Select Goal</option>
                            {filteredGoalsForNewMilestone.map(goal => (
                                <option key={goal.id} value={goal.id}>{goal.title}</option>
                            ))}
                        </select>
                        
                        {error && <p style={{color: 'red', fontSize: '0.875rem'}}>{error}</p>}

                        <div style={{display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem'}}>
                            <button 
                                onClick={() => {
                                    setIsAddMilestoneModalOpen(false);
                                    setError(null);
                                }} 
                                style={{
                                    padding: '0.6rem 1.25rem',
                                    background: '#e2e8f0',
                                    color: '#4a5563',
                                    border: 'none',
                                    borderRadius: '0.375rem',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleAddMilestone} 
                                style={{
                                    padding: '0.6rem 1.25rem', 
                                    background: '#4A90E2', 
                                    color: 'white', 
                                    border: 'none', 
                                    borderRadius: '0.375rem', 
                                    cursor: 'pointer',
                                    fontWeight: '600' 
                                }}
                            >
                                Add Milestone
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isMilestoneModalOpen && (
                <MilestoneTimelineModal
                    isOpen={isMilestoneModalOpen}
                    onClose={() => setIsMilestoneModalOpen(false)}
                    milestoneId={selectedMilestoneId}
                />
            )}
        </>
    );
}

export default YearlyTimelineModal;