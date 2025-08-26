// src/components/Timeline/YearlyAxisTimeline/YearlyAxisTimeline.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styles from './YearlyAxisTimeline.module.css';
import editorStyles from '../Subcomponents/TimelineEditor/TimelineEditor.module.css';
import { db } from '../../../firebaseConfig';
import { doc, updateDoc, collection, getDocs } from "firebase/firestore";

import TimelineItem from '../Subcomponents/TimelineItem/TimelineItem';
import TimelineEditor from '../Subcomponents/TimelineEditor/TimelineEditor';

// --- UTILITY FUNCTIONS ---
const getAxisColor = (axisId = '') => {
    const colors = {
        'physical': '#ef4444', 'financial': '#8b5cf6', 'gear': '#3b82f6',
        'environment': '#10b981', 'misdirect': '#f97316',
        'rest-and-preparation': '#14b8a6', 'On Track N + 1': '#6b7280',
        'default': '#6b7280'
    };
    return colors[axisId] || colors['default'];
};

const generateId = () => `ms_${Date.now().toString(36)}${Math.random().toString(36).substr(2, 9)}`;

const toDate = (firestoreDate) => {
    if (!firestoreDate) return null;
    if (firestoreDate instanceof Date) {
        return firestoreDate;
    }
    let date;
    if (typeof firestoreDate === 'string') {
        date = new Date(firestoreDate);
    } else if (typeof firestoreDate === 'object' && firestoreDate.seconds !== undefined) {
        date = new Date(firestoreDate.seconds * 1000);
    } else {
        return null; // Unknown format
    }
    return isNaN(date.getTime()) ? null : date;
};

// --- MAIN COMPONENT ---
const YearlyAxisTimeline = ({ allAxesData = [], activeAxisId, onDataUpdated }) => {
    // --- STATE MANAGEMENT ---
    const [currentAxisId, setCurrentAxisId] = useState(activeAxisId);
    const [timelineNodes, setTimelineNodes] = useState([]); // These are milestone objects
    const [isLoading, setIsLoading] = useState(false);
    const [newMilestoneText, setNewMilestoneText] = useState('');
    const [newMilestoneDueDate, setNewMilestoneDueDate] = useState('');
    // expandedItems now stores milestone.milestoneId
    const [expandedItems, setExpandedItems] = useState(new Set()); 
    // editingItemId now stores milestone.milestoneId
    const [editingItemId, setEditingItemId] = useState(null);

    // DEBUG STATES (for displaying lists)
    const [debugMilestonesList, setDebugMilestonesList] = useState([]);
    const [debugWeeklyPlansList, setDebugWeeklyPlansList] = useState([]);

    // --- Memoized Values ---
    const currentAxisData = useMemo(() => {
        return allAxesData.find(axis => axis.id === currentAxisId);
    }, [allAxesData, currentAxisId]);

    const accentColor = useMemo(() => getAxisColor(currentAxisData?.id), [currentAxisData]);
    const year = useMemo(() => new Date().getFullYear(), []);

    // --- Data Fetching & Processing ---
    useEffect(() => {
        const getAndProcessData = async () => {
            if (!currentAxisData) {
                setTimelineNodes([]);
                setIsLoading(false);
                setDebugMilestonesList([]); // Clear debug lists
                setDebugWeeklyPlansList([]); // Clear debug lists
                return;
            }
            setIsLoading(true);

            const milestones = currentAxisData.milestones || [];
            const plansCollectionRef = collection(db, "weeklyPlan");
            const querySnapshot = await getDocs(plansCollectionRef);
            const allWeeklyPlans = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // --- CRITICAL DATA VALIDATION: Check for duplicate Milestone IDs ---
            // Now checks 'milestoneId' which is the actual field in Firestore
            const milestoneUniqueIds = milestones.map(m => m.milestoneId).filter(id => id !== undefined && id !== null);
            const uniqueMilestoneSet = new Set(milestoneUniqueIds);
            if (uniqueMilestoneSet.size !== milestoneUniqueIds.length) {
                const duplicates = milestoneUniqueIds.filter((id, index) => milestoneUniqueIds.indexOf(id) !== index);
                console.error(
                    "--- CRITICAL ERROR: DUPLICATE MILESTONE IDs DETECTED! ---",
                    "This is the most likely cause of 'all items expanding simultaneously'.",
                    "Please ensure all milestone objects in your Firestore 'axes' document (specifically in the 'milestones' array) have unique 'milestoneId' fields.",
                    "Duplicate IDs found:", duplicates
                );
            }

            // --- DEBUG: Populate debugMilestonesList for UI display ---
            // Uses milestoneId as the primary identifier for display
            setDebugMilestonesList(milestones.map(m => ({
                id: m.milestoneId, // Using milestoneId from Firestore
                text: m.text,
                dueDate: toDate(m.dueDate)?.toLocaleDateString() || 'N/A'
            })).sort((a, b) => {
                const dateA = toDate(a.dueDate);
                const dateB = toDate(b.dueDate);
                if (dateA === null && dateB === null) return 0;
                if (dateA === null) return 1;
                if (dateB === null) return -1;
                return dateA.getTime() - dateB.getTime();
            }));


            // Sort milestones by date (dueDate primarily, then completionDate)
            const sortedMilestones = milestones.sort((a, b) => {
                const dateA = toDate(a.dueDate);
                const dateB = toDate(b.dueDate);
                if (dateA === null && dateB === null) return 0;
                if (dateA === null) return 1;
                if (dateB === null) return -1;
                return dateA.getTime() - dateB.getTime();
            });
            
            // finalTimelineNodes are now directly milestone objects from Firestore
            const finalTimelineNodes = sortedMilestones.map((milestone) => {
                const associatedChildren = allWeeklyPlans
                    .filter(plan => {
                        const currentAxisName = currentAxisData?.axisName;
                        if (!plan.axisGoals || !currentAxisName) {
                            return false; 
                        }
                        const planAxisGoal = plan.axisGoals[currentAxisName];
                        // Match weekly plan's milestoneId to the milestone's milestoneId
                        return planAxisGoal && planAxisGoal.milestoneId === milestone.milestoneId; 
                    })
                    .sort((a, b) => toDate(a.createdAt)?.getTime() - toDate(b.createdAt)?.getTime()); 

                return { ...milestone, level2Children: associatedChildren };
            });

            // --- DEBUG: Populate debugWeeklyPlansList for UI display ---
            setDebugWeeklyPlansList(allWeeklyPlans
                .filter(plan => plan.axisGoals && currentAxisData?.axisName) 
                .map(plan => {
                    const planAxisGoal = plan.axisGoals[currentAxisData.axisName];
                    return {
                        id: plan.id, // This is the weeklyPlan document's ID
                        createdAt: toDate(plan.createdAt)?.toLocaleDateString() || 'N/A',
                        goalText: typeof planAxisGoal === 'string' ? planAxisGoal : planAxisGoal?.goal || 'N/A (No Goal Text)',
                        milestoneId: planAxisGoal?.milestoneId || 'N/A (No Linked ID)', // This is the ID it claims to link to
                        forAxis: currentAxisData?.axisName
                    };
                })
                .sort((a, b) => {
                    const dateA = toDate(a.createdAt);
                    const dateB = toDate(b.createdAt);
                    if (dateA === null && dateB === null) return 0;
                    if (dateA === null) return 1;
                    if (dateB === null) return -1;
                    return dateA.getTime() - dateB.getTime();
                }));


            setTimelineNodes(finalTimelineNodes);
            setIsLoading(false);
        };

        getAndProcessData();
    }, [currentAxisData, year]); 

    useEffect(() => {
        setCurrentAxisId(activeAxisId);
    }, [activeAxisId]);

    const handleAxisChange = useCallback((e) => {
        setCurrentAxisId(e.target.value);
        setExpandedItems(new Set()); 
    }, []);
    
    // itemId will now be milestone.milestoneId
    const handleToggleExpand = useCallback((itemId) => {
        setExpandedItems(prev => {
            const newSet = new Set(prev);
            newSet.has(itemId) ? newSet.delete(itemId) : newSet.add(itemId);
            return newSet;
        });
    }, []);

    const handleEditClick = useCallback((itemId) => setEditingItemId(itemId), []);
    const handleCancelEdit = useCallback(() => setEditingItemId(null), []);

    // milestoneId here is the passed-in milestone.milestoneId
    const handleSaveMilestone = useCallback(async (milestoneId, newText, newDueDate, newCompletionDate) => {
        if (!currentAxisData?.id || !milestoneId) return;
        setIsLoading(true);
        const currentMilestones = currentAxisData.milestones || [];
        // Match by milestone.milestoneId for update
        const updatedMilestones = currentMilestones.map(m => 
            m.milestoneId === milestoneId 
                ? { ...m, text: newText, dueDate: newDueDate ? toDate(newDueDate) : null, completionDate: newCompletionDate ? toDate(newCompletionDate) : m.completionDate } 
                : m
        );
        try {
            await updateDoc(doc(db, 'axes', currentAxisData.id), { milestones: updatedMilestones });
            if (onDataUpdated) onDataUpdated();
        } catch (error) { console.error("Error saving milestone:", error); } 
        finally { 
            setIsLoading(false); 
            setEditingItemId(null);
        }
    }, [currentAxisData, onDataUpdated]);

    const handleAddMilestone = useCallback(async () => {
        if (!newMilestoneText.trim() || !currentAxisData?.id) return;
        setIsLoading(true);
        const parsedDueDate = newMilestoneDueDate ? toDate(newMilestoneDueDate) : null;
        if (newMilestoneDueDate && !parsedDueDate) {
            console.error("Invalid date for new milestone:", newMilestoneDueDate);
            setIsLoading(false);
            return;
        }

        const newMilestone = { 
            milestoneId: generateId(), // Generate new unique milestoneId
            text: newMilestoneText, 
            dueDate: parsedDueDate, 
            completionDate: null 
        };
        const currentMilestones = currentAxisData.milestones || [];
        const updatedMilestones = [...currentMilestones, newMilestone];
        try {
            await updateDoc(doc(db, 'axes', currentAxisData.id), { milestones: updatedMilestones });
            if (onDataUpdated) onDataUpdated();
        } catch(error) { console.error("Error adding milestone:", error); } 
        finally { 
            setNewMilestoneText('');
            setNewMilestoneDueDate('');
            setIsLoading(false); 
        }
    }, [newMilestoneText, newMilestoneDueDate, currentAxisData, onDataUpdated]);

    const handleDeleteMilestone = useCallback(async (milestoneId) => {
        if (!currentAxisData?.id) return;
        setIsLoading(true);
        const currentMilestones = currentAxisData.milestones || [];
        // Filter by milestone.milestoneId
        const updatedMilestones = currentMilestones.filter(m => m.milestoneId !== milestoneId); 
        try {
            await updateDoc(doc(db, 'axes', currentAxisData.id), { milestones: updatedMilestones });
            if (onDataUpdated) onDataUpdated();
        } catch (error) { console.error("Error deleting milestone:", error); }
        finally { setIsLoading(false); }
    }, [currentAxisData, onDataUpdated]);
    
    const handleMarkComplete = useCallback(async (milestoneId) => {
        if (!currentAxisData?.id) return;
        setIsLoading(true);
        const currentMilestones = currentAxisData.milestones || [];
        // Match by milestone.milestoneId
        const updatedMilestones = currentMilestones.map(m => 
            m.milestoneId === milestoneId 
                ? { ...m, completionDate: m.completionDate ? null : new Date() } 
                : m
        );
        try {
            await updateDoc(doc(db, 'axes', currentAxisData.id), { milestones: updatedMilestones });
            if (onDataUpdated) onDataUpdated();
        } catch(error) { console.error("Error marking milestone complete:", error); }
        finally { setIsLoading(false); }
    }, [currentAxisData, onDataUpdated]);

    const containerStyle = { '--accent-color': accentColor };

    // --- RENDER LOGIC ---
    return (
        <div className={styles.container} style={containerStyle}>
            <div className={styles.header}>
                <h2 className={styles.title}>Yearly Axis Timeline</h2>
                <select value={currentAxisId || ''} onChange={handleAxisChange} className={styles.axisSelector}>
                    {allAxesData.map(axis => <option key={axis.id} value={axis.id}>{axis.axisName}</option>)}
                </select>
            </div>

            <div className={styles.timelineWrapper}>
                <div className={styles.timeline}>
                    <div className={styles.startNode}>
                        <div className={styles.startIcon}>🏁</div>
                        <div className={styles.startText}>Jan 1, {year}</div>
                    </div>
                    {(timelineNodes.length > 0 || currentAxisData?.yearlyGoal) && <div className={styles.line}></div>}

                    {isLoading ? <p>Loading...</p> : timelineNodes.map((node, index) => (
                        // Use node.milestoneId for the key
                        <React.Fragment key={node.milestoneId}> 
                            {editingItemId === node.milestoneId ? (
                                <TimelineEditor
                                    key={`editor-${node.milestoneId}`}
                                    itemToEdit={node} // node now has milestoneId directly
                                    onSave={handleSaveMilestone}
                                    onDelete={handleDeleteMilestone}
                                    onCancel={handleCancelEdit}
                                    isLoading={isLoading}
                                />
                            ) : (
                                <TimelineItem
                                    key={`item-${node.milestoneId}`} // Use node.milestoneId for the key
                                    item={node} // item now has milestoneId directly
                                    level2Children={node.level2Children}
                                    axisName={currentAxisData?.axisName}
                                    index={index}
                                    isExpanded={expandedItems.has(node.milestoneId)} // Use node.milestoneId for expansion
                                    onToggleExpand={() => handleToggleExpand(node.milestoneId)} // Pass node.milestoneId
                                    onEditClick={() => handleEditClick(node.milestoneId)}
                                    onMarkComplete={handleMarkComplete}
                                    isLoading={isLoading}
                                    isEditing={editingItemId === node.milestoneId}
                                />
                            )}
                            {index < timelineNodes.length && (index < timelineNodes.length - 1 || currentAxisData?.yearlyGoal) && (
                                <div className={styles.line}></div>
                            )}
                        </React.Fragment>
                    ))}
                    
                    {(timelineNodes.length > 0 || currentAxisData?.yearlyGoal) && (
                        <div className={styles.endNode}>
                            <div className={styles.endIcon}>🎯</div>
                            <div className={styles.endText}>{currentAxisData?.yearlyGoal || 'Yearly Goal'}</div>
                        </div>
                    )}
                </div>
            </div>
            
            <div className={editorStyles.addItemForm}>
                <h3>Add New Milestone</h3>
                <div className={editorStyles.inputWrapper}>
                    <input type="text" placeholder="New milestone..." value={newMilestoneText} onChange={e => setNewMilestoneText(e.target.value)} />
                    <input type="date" value={newMilestoneDueDate} onChange={e => setNewMilestoneDueDate(e.target.value)} />
                    <button onClick={handleAddMilestone} disabled={isLoading}>Add</button>
                </div>
            </div>

            {/* --- DEBUGGING SECTION --- */}
            <div style={{ marginTop: '3rem', borderTop: '1px solid #ccc', paddingTop: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>DEBUG DATA for Current Axis: "{currentAxisData?.axisName || 'N/A'}"</h3>

                <h4 style={{ marginBottom: '0.5rem' }}>Milestones (from `currentAxisData.milestones` array)</h4>
                <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', borderRadius: '5px', backgroundColor: '#fdfdfd', marginBottom: '1rem' }}>
                    {debugMilestonesList.length === 0 ? (
                        <p>No milestones found for debugging.</p>
                    ) : (
                        <ul style={{ listStyle: 'disc', paddingLeft: '20px', margin: 0 }}>
                            {debugMilestonesList.map((m, i) => (
                                <li key={m.id || `debug-ms-${i}`} style={{ marginBottom: '5px', fontSize: '0.9em', lineHeight: '1.4' }}>
                                    <strong>ID:</strong> <span style={{ color: m.id === undefined || m.id === null ? 'red' : 'inherit', fontWeight: m.id === undefined || m.id === null ? 'bold' : 'normal' }}>{m.id || 'MISSING/NULL ID!'}</span> <br />
                                    <strong>Text:</strong> {m.text} <br />
                                    <strong>Due Date:</strong> {m.dueDate}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <h4 style={{ marginTop: '2rem', marginBottom: '0.5rem' }}>Weekly Plans (with their linked `milestoneId`s for this axis)</h4>
                <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', borderRadius: '5px', backgroundColor: '#fdfdfd' }}>
                    {debugWeeklyPlansList.length === 0 ? (
                        <p>No weekly plans found with an `axisGoals` entry for this axis.</p>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {debugWeeklyPlansList.map((item, i) => (
                                <li key={item.id || `debug-wp-${i}`} style={{ marginBottom: '10px', padding: '8px', borderBottom: '1px dotted #ccc', fontSize: '0.9em' }}>
                                    <strong>WP ID:</strong> <span style={{ color: item.id === undefined || item.id === null ? 'red' : 'inherit', fontWeight: item.id === undefined || item.id === null ? 'bold' : 'normal' }}>{item.id || 'MISSING/NULL ID!'}</span> (Created: {item.createdAt})<br/>
                                    <strong>Goal:</strong> "{item.goalText}"<br/>
                                    <strong>Linked Milestone ID (`{item.forAxis}`):</strong> <span style={{ color: item.milestoneId === 'N/A (No Linked ID)' ? 'orange' : 'blue' }}>{item.milestoneId}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
            {/* --- END DEBUGGING SECTION --- */}
        </div>
    );
};

export default YearlyAxisTimeline;