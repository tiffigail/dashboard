// src/components/MonthlyView/MonthlyView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import styles from './MonthlyView.module.css';
import { db } from '../../firebaseConfig';
import {
    doc, getDoc, setDoc, collection, getDocs, updateDoc, arrayUnion, serverTimestamp // Added serverTimestamp
} from "firebase/firestore";

// --- ADDED: Import MonthlyThemeModal ---
import MonthlyThemeModal from '../MonthlyThemeModal/MonthlyThemeModal.jsx'; // Adjust path if needed

// --- Helper Functions --- (Keep all your existing helpers)
function getCurrentMonthId() { /* ... same ... */ 
    const today = new Date(); const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}
function getMonthNameAndYear(date = new Date()) { /* ... same ... */ 
    const options = { month: 'long', year: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}
function getCalendarGrid(year, month) { /* ... same ... */
    const firstDayOfMonth = new Date(year, month, 1); const startingDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate(); const grid = []; let currentDay = 1;
    let week = []; for (let i = 0; i < startingDayOfWeek; i++) week.push(null);
    while (currentDay <= daysInMonth) { week.push(currentDay); if (week.length === 7) { grid.push(week); week = []; } currentDay++; }
    if (week.length > 0) { while (week.length < 7) week.push(null); grid.push(week); } return grid;
 }
function formatDateString(year, monthIndex, day) { /* ... same ... */
    const month = String(monthIndex + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
 }
function getTodayDateString() { /* ... same ... */
    const today = new Date(); const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
 }
// --- End Helper Functions ---

function MonthlyView({ onNavigate }) {
    // == Existing State == (Keep all your existing state)
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [monthData, setMonthData] = useState(null);
    const [calendarGrid, setCalendarGrid] = useState([]);
    const [currentMonthName, setCurrentMonthName] = useState("");
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [currentMonthIndex, setCurrentMonthIndex] = useState(new Date().getMonth());
    const [availableAxes, setAvailableAxes] = useState([]);
    const [newEventText, setNewEventText] = useState("");
    const [newEventDate, setNewEventDate] = useState(getTodayDateString());
    const [newEventAxis, setNewEventAxis] = useState("No Affiliation");
    const [isAddingEvent, setIsAddingEvent] = useState(false);
    const [addEventError, setAddEventError] = useState(null);

    // --- NEW: State for MonthlyThemeModal ---
    const [isMonthlyThemeModalOpen, setIsMonthlyThemeModalOpen] = useState(false);
    const [editingMonthId, setEditingMonthId] = useState(getCurrentMonthId()); // To pass to modal
    const [currentPlanDataForModal, setCurrentPlanDataForModal] = useState(null); // To pass to modal


    // --- Fetch Axes --- (Keep as is)
    useEffect(() => {
        const fetchAxes = async () => { /* ... same ... */ 
            console.log("MonthlyView: Fetching axes...");
            try {
                const axesCollectionRef = collection(db, "axes"); const querySnapshot = await getDocs(axesCollectionRef);
                const axesList = []; querySnapshot.forEach((doc) => { const data = doc.data(); if (data.axisName) axesList.push(data.axisName); else console.warn(`Axes doc ${doc.id} missing axisName`); });
                axesList.sort((a, b) => a.localeCompare(b)); setAvailableAxes(axesList);
                console.log("MonthlyView: Axes fetched successfully.", axesList);
            } catch (error) { console.error("MonthlyView: Error fetching axes:", error); setError("Failed to load axes options."); }
        };
        fetchAxes();
    }, []);

    // --- Fetch Monthly Plan Data --- (Keep as is, but also set currentPlanDataForModal)
    const fetchMonthlyData = useCallback(async (yearToFetch, monthIndexToFetch) => { // Modified to accept year/month
        setIsLoading(true); setError(null); setAddEventError(null);
        
        const targetDate = new Date(yearToFetch, monthIndexToFetch, 1);
        const monthId = `${yearToFetch}-${String(monthIndexToFetch + 1).padStart(2, '0')}`;

        setCurrentYear(yearToFetch);
        setCurrentMonthIndex(monthIndexToFetch);
        setCurrentMonthName(getMonthNameAndYear(targetDate));
        setCalendarGrid(getCalendarGrid(yearToFetch, monthIndexToFetch));
        setEditingMonthId(monthId); // Keep track of the ID for the modal

        console.log(`MonthlyView: Fetching data for month ${monthId}`);
        try {
            const docRef = doc(db, "monthlyPlans", monthId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setMonthData(data);
                setCurrentPlanDataForModal(data); // <-- SET DATA FOR MODAL
                console.log("Monthly Data Loaded:", data);
            } else {
                console.log(`No monthly plan found for ${monthId}, preparing for new entry.`);
                setMonthData(null); 
                setCurrentPlanDataForModal(null); // <-- SET NULL FOR MODAL (it will use defaults)
            }
        } catch (err) {
            console.error("Error fetching monthly data:", err);
            setError("Failed to load monthly data."); setMonthData(null); setCurrentPlanDataForModal(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial fetch on component mount for the current month
    useEffect(() => {
        const today = new Date();
        fetchMonthlyData(today.getFullYear(), today.getMonth());
    }, [fetchMonthlyData]);

    // --- Handler for Adding a New Event --- (Keep as is)
    const handleAddEvent = async (e) => { /* ... same ... */ 
        e.preventDefault(); if (isAddingEvent) return;
        if (!newEventText.trim() || !newEventDate) { setAddEventError("Event text and date required."); return; }
        setIsAddingEvent(true); setAddEventError(null);
        const monthIdForEvent = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;
        const docRef = doc(db, "monthlyPlans", monthIdForEvent);
        const newEventObject = { date: newEventDate, text: newEventText.trim(), axis: newEventAxis };
        try {
            // Ensure document exists before trying to arrayUnion, or use set with merge to create it
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                await updateDoc(docRef, { events: arrayUnion(newEventObject) });
            } else {
                // If doc doesn't exist, create it with the events array
                await setDoc(docRef, { events: [newEventObject], monthId: monthIdForEvent, monthName: getMonthNameAndYear(new Date(currentYear, currentMonthIndex)) }, { merge: true });
            }
            setMonthData(prevData => ({ ...prevData, events: [...(prevData?.events || []), newEventObject] }));
            setNewEventText("");
        } catch (err) { console.error("Error adding event:", err); setAddEventError(`Failed to add event: ${err.message}`); }
        finally { setIsAddingEvent(false); }
    };

    // --- NEW: Handlers for MonthlyThemeModal ---
    const handleOpenMonthlyThemeModal = () => {
        // Data for currentPlanDataForModal should already be set by fetchMonthlyData
        // for the currently viewed month. Or re-fetch if necessary.
        // If monthData is null, modal will show empty fields for monthId
        if (!monthData) { // If no data, ensure currentPlanDataForModal reflects this for a new plan
            setCurrentPlanDataForModal({
                monthFocus: '', monthObjective: '', reward: '', weeklyData: {}, monthName: getMonthNameAndYear(new Date(currentYear, currentMonthIndex))
            });
        } else {
            setCurrentPlanDataForModal(monthData);
        }
        setEditingMonthId(`${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`);
        setIsMonthlyThemeModalOpen(true);
    };

    const handleCloseMonthlyThemeModal = () => {
        setIsMonthlyThemeModalOpen(false);
    };

    const handleSaveMonthlyPlan = async (monthDocId, dataToSaveFromModal) => {
        setIsSaving(true); // General saving indicator for the page
        const planDocRef = doc(db, "monthlyPlans", monthDocId);
        try {
            const dataForFirestore = {
                ...dataToSaveFromModal, // monthFocus, monthObjective, reward, monthName, weeklyData (as object)
                monthId: monthDocId, // Ensure monthId is part of the document data
                lastUpdated: serverTimestamp()
            };
             // If creating a new plan (i.e., monthData was null before opening modal), add createdAt
            if (!monthData || !monthData.createdAt) { // Or check if docSnap didn't exist in fetchMonthlyData
                dataForFirestore.createdAt = serverTimestamp();
            }

            await setDoc(planDocRef, dataForFirestore, { merge: true });
            console.log(`Monthly plan for ${monthDocId} saved successfully.`);
            
            // Optimistically update local state or re-fetch
            setMonthData(prev => ({ ...(prev || {}), ...dataForFirestore, lastUpdated: new Date() })); // Simulate timestamp
            setCurrentPlanDataForModal(prev => ({ ...(prev || {}), ...dataForFirestore, lastUpdated: new Date() }));


            setIsMonthlyThemeModalOpen(false); // Close modal on successful save
        } catch (error) {
            console.error("Error saving monthly plan:", error);
            setError("Failed to save monthly plan. Please try again."); // Show error to user
            // Optionally, keep modal open on error, or pass error to modal
        } finally {
            setIsSaving(false);
        }
    };
    
    // --- NEW: Handlers for changing month view ---
    const goToPreviousMonth = () => {
        let newMonth = currentMonthIndex - 1;
        let newYear = currentYear;
        if (newMonth < 0) {
            newMonth = 11; // December (0-indexed)
            newYear--;
        }
        fetchMonthlyData(newYear, newMonth);
    };

    const goToNextMonth = () => {
        let newMonth = currentMonthIndex + 1;
        let newYear = currentYear;
        if (newMonth > 11) {
            newMonth = 0; // January
            newYear++;
        }
        fetchMonthlyData(newYear, newMonth);
    };


    // Extract specific data points for easier use in JSX (keep as is)
    const monthFocus = monthData?.monthFocus || "Not Set";
    const monthObjective = monthData?.monthObjective || "Not Set";
    const weeklyData = monthData?.weeklyData || {};
    const reward = monthData?.reward || "Not Set";
    const events = monthData?.events || [];
    const getEventsForDate = (dateString) => events.filter(event => event.date === dateString);


    return (
        <div className={styles.monthlyViewContainer}>
            {isLoading ? ( <p>Loading monthly data...</p> ) : 
             error && !monthData ? ( <p className={styles.errorText}>{error}</p> ) : (
                <>
                    {error && monthData && <p className={styles.errorText}>{error}</p>}
                    <div className={styles.headerSection}>
                        <div className={styles.headerLeft}>
                            <h1 className={styles.monthFocusDisplay}>{monthFocus}</h1>
                        </div>
                        <div className={styles.headerRight}>
                            <div className={styles.monthNavigation}>
                                <button onClick={goToPreviousMonth} className={styles.navButton}></button>
                                <h2 className={styles.monthNameTitle}> {currentMonthName}</h2>
                                <button onClick={goToNextMonth} className={styles.navButton}>Next</button>
                            </div>
                            <p className={styles.monthObjectiveDisplay}>Objective: {monthObjective}</p>
                            {/* --- ADDED: Button to open MonthlyThemeModal --- */}
                            <button 
                                onClick={handleOpenMonthlyThemeModal} 
                                className={styles.editMonthPlanButton}
                                disabled={isSaving} // Disable if another save is in progress
                            >
                                Edit Month Plan
                            </button>
                        </div>
                    </div>

                    {/* Calendar Section (Keep as is) */}
                    <div className={styles.calendarSection}> {/* ... your calendar JSX ... */} 
                        <h3 className={styles.sectionTitle}>Month Calendar & Weekly Focus</h3>
                        <table className={styles.calendarTable}>
                            <thead><tr><th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th></tr></thead>
                            <tbody>
                                {calendarGrid.map((week, weekIndex) => {
                                    const weekNum = weekIndex + 1; const currentWeekData = weeklyData[String(weekNum)];
                                    return (
                                        <React.Fragment key={`week-group-${weekIndex}`}>
                                            <tr className={styles.calendarWeekRow}>
                                                {week.map((day, dayIndex) => {
                                                    if (day === null) return <td key={`empty-${weekIndex}-${dayIndex}`} className={styles.calendarEmptyCell}></td>;
                                                    const dateString = formatDateString(currentYear, currentMonthIndex, day);
                                                    const dayEvents = getEventsForDate(dateString);
                                                    return (
                                                        <td key={`day-${weekIndex}-${dayIndex}`} className={styles.calendarDayCell}>
                                                            <div className={styles.dayNumber}>{day}</div>
                                                            <div className={styles.dayContent}>
                                                                {dayEvents.length > 0 && (<ul className={styles.dayEventsList}>{dayEvents.map((event, eventIndex) => (<li key={eventIndex} title={`Axis: ${event.axis}`}>{event.text}</li>))}</ul>)}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                            <tr className={styles.weekInfoRow}><td colSpan="7" className={styles.weekInfoDataCell}><div className={styles.weekInfoContent}><span className={styles.weekFocus}><strong>Focus:</strong> {currentWeekData?.focus || <i className={styles.notSet}>N/A</i>}</span><span className={styles.weekObjective}><strong>Objective:</strong> {currentWeekData?.objective || <i className={styles.notSet}>N/A</i>}</span></div></td></tr>
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Add Event Form Section (Keep as is) */}
                    <div className={styles.addEventSection}> {/* ... your add event form JSX ... */} 
                        <h3 className={styles.sectionTitle}>Add Event</h3>
                        <form onSubmit={handleAddEvent} className={styles.addEventForm}>
                            <div className={styles.formRow}><label htmlFor="eventText">Event:</label><input type="text" id="eventText" value={newEventText} onChange={(e) => setNewEventText(e.target.value)} placeholder="Enter event description" required className={styles.eventTextInput}/></div>
                            <div className={styles.formRow}><label htmlFor="eventDate">Date:</label><input type="date" id="eventDate" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} required className={styles.eventDateInput}/></div>
                            <div className={styles.formRow}><label htmlFor="eventAxis">Axis:</label><select id="eventAxis" value={newEventAxis} onChange={(e) => setNewEventAxis(e.target.value)} className={styles.eventAxisSelect}><option value="No Affiliation">No Affiliation</option>{availableAxes.map(axisName => (<option key={axisName} value={axisName}>{axisName}</option>))}</select></div>
                            <div className={styles.formRow}><button type="submit" disabled={isAddingEvent} className={styles.addEventButton}>{isAddingEvent ? 'Adding...' : 'Add Event'}</button></div>
                            {addEventError && <p className={styles.errorText}>{addEventError}</p>}
                        </form>
                    </div>

                    {/* Reward Section (Keep as is) */}
                    <div className={styles.rewardSection}> {/* ... your reward JSX ... */} 
                        <h3 className={styles.sectionTitle}>Month Reward</h3>
                        <p className={styles.rewardText}>{reward}</p>
                    </div>

                    <div className={styles.chartPlaceholder}>Monthly Review / Chart Placeholder (Coming Soon)</div>
                </>
            )}

            {/* --- ADDED: MonthlyThemeModal Instance --- */}
            {isMonthlyThemeModalOpen && (
                <MonthlyThemeModal
                    isOpen={isMonthlyThemeModalOpen}
                    onClose={handleCloseMonthlyThemeModal}
                    monthId={editingMonthId}
                    initialData={currentPlanDataForModal} // This holds the fetched data for the month
                    onSave={handleSaveMonthlyPlan} // The function to call when modal's save is clicked
                />
            )}
        </div>
    );
}

export default MonthlyView;