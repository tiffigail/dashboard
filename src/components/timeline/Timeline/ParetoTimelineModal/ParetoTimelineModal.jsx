import React, { useState, useEffect, useCallback } from 'react';
import { db } from '@/firebaseConfig';
import { collection, getDocs, query, where, addDoc, updateDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import Timeline from '@/components/timeline/Timeline/Timeline';
import YearlyTimelineModal from '@/components/timeline/Timeline/YearlyTimelineModal/YearlyTimelineModal'; // Import the new modal

const PARETO_AXES_ORDER = ["Physical", "Financial", "Gear", "Environment", "Misdirect"];
const SUPPORT_AXES_ORDER = ["Rest and preparation", "On Track N+1"];

function ParetoTimelineModal({ isOpen, onClose }) {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timelineData, setTimelineData] = useState([]);
    const [allAxes, setAllAxes] = useState([]);
    const [filter, setFilter] = useState('All');
    
    // State to manage the YearlyTimelineModal
    const [selectedYear, setSelectedYear] = useState(null);
    const [isYearModalOpen, setIsYearModalOpen] = useState(false);

    // --- State for Add Goal Modal ---
    const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
    const [newGoalTitle, setNewGoalTitle] = useState('');
    const [newGoalDueDate, setNewGoalDueDate] = useState('');
    const [newGoalType, setNewGoalType] = useState('yearly'); // Default to yearly
    const [newGoalYear, setNewGoalYear] = useState(new Date().getFullYear()); // Default to current year
    const [selectedAxisForNewGoal, setSelectedAxisForNewGoal] = useState('');
    // ------------------------------------

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const axesQuery = query(collection(db, "new_axes"));
            const axesSnapshot = await getDocs(axesQuery);
            const axesList = axesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllAxes(axesList);

            const goalsQuery = query(collection(db, "new_goals"), where("type", "in", ["yearly", "stretch"]));
            const goalsSnapshot = await getDocs(goalsQuery);
            const goalsList = goalsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const dataByAxis = axesList.map(axis => ({ ...axis, items: goalsList.filter(goal => goal.axisId === axis.id) }));
            setTimelineData(dataByAxis);

        } catch (err) {
            console.error("Error fetching Pareto Timeline data:", err);
            setError("Failed to load timeline data.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) fetchData();
    }, [isOpen, fetchData]);

    const handleUpdateGoal = async (goalId, updatedData) => {
        if (!goalId) return;
        const goalRef = doc(db, "new_goals", goalId);
        try {
            if (updatedData.completionDate) {
                updatedData.status = 'completed';
            } else if (updatedData.completionDate === null) {
                updatedData.status = 'todo';
            }
            await updateDoc(goalRef, updatedData);
            fetchData(); // Re-fetch to update the UI
        } catch (error) {
            console.error("Error updating goal: ", error);
            setError("Could not update the goal. Please try again.");
        }
    };

    const handleYearClick = (year) => {
        setSelectedYear(year);
        setIsYearModalOpen(true);
    };

    // --- New Function to Add Goal ---
    const handleAddGoal = async () => {
        if (!newGoalTitle.trim() || !newGoalDueDate || !selectedAxisForNewGoal || !newGoalType || (newGoalType === 'yearly' && !newGoalYear)) {
            setError("Please fill all required fields for the new goal.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const newGoalRef = doc(collection(db, "new_goals"));
            const newGoalId = newGoalRef.id;

            const goalData = {
                goalId: newGoalId, // Store the document ID as goalId
                title: newGoalTitle.trim(),
                type: newGoalType,
                year: newGoalType === 'yearly' ? newGoalYear : null, // Only store year for yearly goals
                dueDate: new Date(newGoalDueDate),
                completionDate: null,
                status: 'todo',
                axisId: selectedAxisForNewGoal,
                createdAt: serverTimestamp(),
            };

            await setDoc(newGoalRef, goalData);
            
            // Reset form fields
            setNewGoalTitle('');
            setNewGoalDueDate('');
            setNewGoalType('yearly');
            setNewGoalYear(new Date().getFullYear());
            setSelectedAxisForNewGoal('');
            setIsAddGoalModalOpen(false); // Close the add modal

            fetchData(); // Re-fetch data to update the timeline
        } catch (err) {
            console.error("Error adding new goal:", err);
            setError("Failed to add new goal.");
            setIsLoading(false); // Ensure loading state is reset on error
        }
    };
    // ------------------------------------


    if (!isOpen) return null;

    const filteredData = timelineData.filter(axis => filter === 'All' || axis.axisName === filter);
    const paretoAxesData = PARETO_AXES_ORDER.map(name => filteredData.find(axis => axis.axisName === name)).filter(Boolean);
    const supportAxesData = SUPPORT_AXES_ORDER.map(name => filteredData.find(axis => axis.axisName === name)).filter(Boolean);



    const timeSpan = { start: 2024, end: 2029 };

    return (
        <>
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#f9fafb', width: '95%', height: '95%', borderRadius: '1rem', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', flexShrink: 0 }}>
                        <div>
                            <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Pareto Project Timeline (2024-2029)</h2>
                            <p style={{ color: '#6b7280' }}>An overview of all major Yearly and Stretch goals across your core axes.</p>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '1.5rem'}}>
                            <button 
                                onClick={() => setIsAddGoalModalOpen(true)}
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
                                Add Goal
                            </button>
                            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                <label htmlFor="axis-filter" style={{ fontWeight: '600' }}>Filter by Axis:</label>
                                <select id="axis-filter" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}>
                                    <option value="All">All Axes</option>
                                    {allAxes.map(axis => (<option key={axis.id} value={axis.axisName}>{axis.axisName}</option>))}
                                </select>
                            </div>
                            <button
                                onClick={onClose}
                                style={{
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
                            <>
                                <h3 style={{fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#374151'}}>Core Pareto Axes</h3>
                                <Timeline
                                    data={paretoAxesData}
                                    timeSpan={timeSpan}
                                    onUpdateItem={handleUpdateGoal}
                                    onRulerClick={handleYearClick}
                                    itemType="goal"
                                />

                                <hr style={{margin: '2.5rem 0'}} />

                                <h3 style={{fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#374151'}}>Support Axes</h3>
                                <Timeline
                                    data={supportAxesData}
                                    timeSpan={timeSpan}
                                    onUpdateItem={handleUpdateGoal}
                                    onRulerClick={handleYearClick}
                                    itemType="goal"
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* --- Add New Goal Modal --- */}
            {isAddGoalModalOpen && (
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
                        <h3 style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem'}}>Add New Goal</h3>
                        
                        <label style={{fontWeight: '600', fontSize: '0.875rem'}}>Title:</label>
                        <input 
                            type="text" 
                            value={newGoalTitle} 
                            onChange={(e) => setNewGoalTitle(e.target.value)} 
                            style={{padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '0.375rem'}}
                            placeholder="e.g., Achieve Target Weight"
                        />

                        <label style={{fontWeight: '600', fontSize: '0.875rem'}}>Due Date:</label>
                        <input 
                            type="date" 
                            value={newGoalDueDate} 
                            onChange={(e) => setNewGoalDueDate(e.target.value)} 
                            style={{padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '0.375rem'}}
                        />

                        <label style={{fontWeight: '600', fontSize: '0.875rem'}}>Axis:</label>
                        <select 
                            value={selectedAxisForNewGoal} 
                            onChange={(e) => setSelectedAxisForNewGoal(e.target.value)} 
                            style={{padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '0.375rem'}}
                        >
                            <option value="">Select Axis</option>
                            {allAxes.map(axis => (
                                <option key={axis.id} value={axis.id}>{axis.axisName}</option>
                            ))}
                        </select>

                        <label style={{fontWeight: '600', fontSize: '0.875rem'}}>Goal Type:</label>
                        <select 
                            value={newGoalType} 
                            onChange={(e) => setNewGoalType(e.target.value)} 
                            style={{padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '0.375rem'}}
                        >
                            <option value="yearly">Yearly</option>
                            <option value="stretch">Stretch</option>
                        </select>

                        {newGoalType === 'yearly' && (
                            <>
                                <label style={{fontWeight: '600', fontSize: '0.875rem'}}>Year:</label>
                                <input 
                                    type="number" 
                                    value={newGoalYear} 
                                    onChange={(e) => setNewGoalYear(parseInt(e.target.value) || new Date().getFullYear())} 
                                    style={{padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '0.375rem'}}
                                />
                            </>
                        )}
                        
                        {error && <p style={{color: 'red', fontSize: '0.875rem'}}>{error}</p>}

                        <div style={{display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem'}}>
                            <button 
                                onClick={() => {
                                    setIsAddGoalModalOpen(false);
                                    setError(null);
                                    // Reset form fields when closing
                                    setNewGoalTitle('');
                                    setNewGoalDueDate('');
                                    setNewGoalType('yearly');
                                    setNewGoalYear(new Date().getFullYear());
                                    setSelectedAxisForNewGoal('');
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
                                onClick={handleAddGoal} 
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
                                Add Goal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isYearModalOpen && (
                <YearlyTimelineModal
                    isOpen={isYearModalOpen}
                    onClose={() => {
                        setIsYearModalOpen(false);
                        fetchData();
                    }}
                    year={selectedYear}
                />
            )}
        </>
    );
}

export default ParetoTimelineModal;