// src/components/MonthlyView/MonthlyView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import styles from './MonthlyView.module.css';
import { db } from '../../firebaseConfig';
import {
    doc, getDoc, setDoc, collection, getDocs, updateDoc, arrayUnion
} from "firebase/firestore"; // Added updateDoc, arrayUnion

// --- Helper Functions ---

// Get current month ID (e.g., "2025-04")
function getCurrentMonthId() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

// Get month name and year (e.g., "April 2025")
function getMonthNameAndYear(date = new Date()) {
    const options = { month: 'long', year: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}

// Get calendar grid data for a given month and year
function getCalendarGrid(year, month) { // month is 0-indexed
    const firstDayOfMonth = new Date(year, month, 1);
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 6 = Saturday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const grid = [];
    let currentDay = 1;
    let week = [];

    // Add padding for days before the 1st of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
        week.push(null);
    }

    // Add days of the month
    while (currentDay <= daysInMonth) {
        week.push(currentDay);
        if (week.length === 7) {
            grid.push(week);
            week = [];
        }
        currentDay++;
    }

    // Add padding for days after the last day of the month
    if (week.length > 0) {
        while (week.length < 7) {
            week.push(null);
        }
        grid.push(week);
    }

    return grid; // Returns array of weeks, each week is array of days (or null)
}

// Format date object or parts into YYYY-MM-DD string
function formatDateString(year, monthIndex, day) {
    const month = String(monthIndex + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
}

// Get today's date as YYYY-MM-DD for default input value
function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
// --- End Helper Functions ---


function MonthlyView() {
    // == State ==
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false); // General saving state (can be reused or specified)
    const [error, setError] = useState(null);
    const [monthData, setMonthData] = useState(null); // Holds the entire monthly plan document data
    const [calendarGrid, setCalendarGrid] = useState([]);
    const [currentMonthName, setCurrentMonthName] = useState("");
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [currentMonthIndex, setCurrentMonthIndex] = useState(new Date().getMonth()); // 0-indexed
    const [availableAxes, setAvailableAxes] = useState([]); // State for fetched axes dropdown
    // REMOVED: dateAxes state - no longer managing axis per day this way
    // const [dateAxes, setDateAxes] = useState({});

    // --- State for the Add Event Form ---
    const [newEventText, setNewEventText] = useState("");
    const [newEventDate, setNewEventDate] = useState(getTodayDateString()); // Default to today
    const [newEventAxis, setNewEventAxis] = useState("No Affiliation"); // Default axis selection
    const [isAddingEvent, setIsAddingEvent] = useState(false); // Specific loading state for adding event
    const [addEventError, setAddEventError] = useState(null); // Specific error state for adding event

    // --- Fetch Axes ---
    useEffect(() => {
        const fetchAxes = async () => {
            console.log("MonthlyView: Fetching axes...");
            try {
                const axesCollectionRef = collection(db, "axes");
                const querySnapshot = await getDocs(axesCollectionRef);
                const axesList = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.axisName) {
                        axesList.push(data.axisName);
                    } else {
                        console.warn(`Axes doc ${doc.id} missing axisName`);
                    }
                });
                axesList.sort((a, b) => a.localeCompare(b));
                setAvailableAxes(axesList);
                console.log("MonthlyView: Axes fetched successfully.", axesList);
            } catch (error) {
                console.error("MonthlyView: Error fetching axes:", error);
                setError("Failed to load axes options."); // Set general error if axes fail
            }
        };
        fetchAxes();
    }, []); // Runs once on mount

    // --- Fetch Monthly Plan Data ---
    // Fetches the entire document for the current month
    const fetchMonthlyData = useCallback(async () => {
        setIsLoading(true);
        setError(null); // Clear previous errors
        setAddEventError(null); // Clear event errors too
        const today = new Date();
        const monthId = getCurrentMonthId();
        const year = today.getFullYear();
        const monthIndex = today.getMonth();

        setCurrentYear(year);
        setCurrentMonthIndex(monthIndex);
        setCurrentMonthName(getMonthNameAndYear(today));
        setCalendarGrid(getCalendarGrid(year, monthIndex));

        console.log(`MonthlyView: Fetching data for month ${monthId}`);

        try {
            const docRef = doc(db, "monthlyPlans", monthId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setMonthData(data);
                // REMOVED: setDateAxes - no longer needed
                console.log("Monthly Data Loaded:", data);
            } else {
                console.log(`No monthly plan found for ${monthId}`);
                // Don't set a blocking error, allow user to add events which might create the doc
                setMonthData(null); // Indicate no data exists yet
            }
        } catch (err) {
            console.error("Error fetching monthly data:", err);
            setError("Failed to load monthly data."); // Set blocking error on fetch failure
            setMonthData(null);
        } finally {
            setIsLoading(false);
        }
    }, []); // Dependency array is empty, fetch is triggered by useEffect below

    // Initial fetch on component mount
    useEffect(() => {
        fetchMonthlyData();
    }, [fetchMonthlyData]); // Depend on the memoized fetch function

    // REMOVED: handleDateAxisChange handler - dropdowns removed from cells

    // --- Handler for Adding a New Event ---
    const handleAddEvent = async (e) => {
        e.preventDefault(); // Prevent default form submission
        if (isAddingEvent) return; // Prevent double clicks

        // Basic validation
        if (!newEventText.trim() || !newEventDate) {
            setAddEventError("Please enter event text and select a date.");
            return;
        }

        setIsAddingEvent(true);
        setAddEventError(null); // Clear previous errors

        const monthId = getCurrentMonthId(); // Assumes events are added to the *current* month's plan
        const docRef = doc(db, "monthlyPlans", monthId);

        const newEventObject = {
            date: newEventDate,        // YYYY-MM-DD string from the date input
            text: newEventText.trim(), // Trimmed event description
            axis: newEventAxis,        // Selected axis or "No Affiliation"
            // Optionally add a timestamp or unique ID if needed
            // id: uuidv4(), // Example if using uuid library
            // createdAt: serverTimestamp() // Example Firestore timestamp
        };

        console.log("Adding event:", newEventObject);

        try {
            // Use updateDoc with arrayUnion to add the new event to the 'events' array.
            // This will create the 'events' field if it doesn't exist.
            // It will also create the document if it doesn't exist (though setDoc might be slightly clearer for creation)
            // Using updateDoc ensures we don't overwrite other fields if the doc exists.
            await updateDoc(docRef, {
                events: arrayUnion(newEventObject)
            });

            console.log(`Successfully added event for ${newEventDate}.`);

            // --- Optimistic UI Update (Optional but Recommended) ---
            // To avoid re-fetching the whole document just to see the new event,
            // update the local monthData state optimistically.
            setMonthData(prevData => {
                const currentEvents = prevData?.events || []; // Get existing events or empty array
                return {
                    ...prevData, // Keep existing data
                    events: [...currentEvents, newEventObject] // Add the new event locally
                };
            });
            // --- End Optimistic Update ---

            // Clear the form on success
            setNewEventText("");
            // Keep the date and axis potentially for adding multiple events quickly
            // setNewEventDate(getTodayDateString()); // Uncomment to reset date
            // setNewEventAxis("No Affiliation"); // Uncomment to reset axis

        } catch (err) {
            console.error("Error adding event:", err);
            setAddEventError(`Failed to add event. Error: ${err.message}`);
            // No need to revert optimistic update here, as the source `monthData` wasn't directly mutated
            // A refetch might be needed if the display relies solely on Firestore data
        } finally {
            setIsAddingEvent(false); // Reset loading state
        }
    };


    // Extract specific data points for easier use in JSX, with defaults
    const monthFocus = monthData?.monthFocus || "Not Set";
    const monthObjective = monthData?.monthObjective || "Not Set";
    const weeklyData = monthData?.weeklyData || {};
    const reward = monthData?.reward || "Not Set";
    const events = monthData?.events || []; // Get events array, default to empty

    // Helper to get events for a specific date
    const getEventsForDate = (dateString) => {
        return events.filter(event => event.date === dateString);
    };

    return (
        <div className={styles.monthlyViewContainer}>

            {isLoading ? (
                <p>Loading monthly data...</p>
            ) : error && !monthData ? ( // Show main error only if loading failed and no data exists
                <p className={styles.errorText}>{error}</p>
            ) : ( // Render content if not loading
                <>
                    {/* Display general errors if they occurred but some data might still render */}
                    {error && monthData && <p className={styles.errorText}>{error}</p>}

                    {/* --- Header Section --- */}
                    <div className={styles.headerSection}>
                        <div className={styles.headerLeft}>
                            <h1 className={styles.monthFocusDisplay}>
                                {monthFocus}
                            </h1>
                        </div>
                        <div className={styles.headerRight}>
                            <h2 className={styles.monthNameTitle}>{currentMonthName} Dashboard</h2>
                            <p className={styles.monthObjectiveDisplay}>
                                Objective: {monthObjective}
                            </p>
                        </div>
                    </div>
                    {/* --- End Header Section --- */}


                    {/* --- Calendar Section --- */}
                    <div className={styles.calendarSection}>
                        <h3 className={styles.sectionTitle}>Month Calendar & Weekly Focus</h3>
                        <table className={styles.calendarTable}>
                            <thead>
                                <tr>
                                    <th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {calendarGrid.map((week, weekIndex) => {
                                    const weekNum = weekIndex + 1;
                                    const currentWeekData = weeklyData[String(weekNum)];

                                    return (
                                        <React.Fragment key={`week-group-${weekIndex}`}>
                                            {/* Row for the days */}
                                            <tr className={styles.calendarWeekRow}>
                                                {week.map((day, dayIndex) => {
                                                    if (day === null) {
                                                        return <td key={`empty-${weekIndex}-${dayIndex}`} className={styles.calendarEmptyCell}></td>;
                                                    }

                                                    const dateString = formatDateString(currentYear, currentMonthIndex, day);
                                                    // Get events for this specific day
                                                    const dayEvents = getEventsForDate(dateString);

                                                    return (
                                                        <td key={`day-${weekIndex}-${dayIndex}`} className={styles.calendarDayCell}>
                                                            <div className={styles.dayNumber}>{day}</div>
                                                            <div className={styles.dayContent}>
                                                                {/* --- Display Events for the Day --- */}
                                                                {dayEvents.length > 0 && (
                                                                    <ul className={styles.dayEventsList}>
                                                                        {dayEvents.map((event, eventIndex) => (
                                                                            <li key={eventIndex} title={`Axis: ${event.axis}`}>
                                                                                {event.text}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                )}
                                                                {/* --- REMOVED Axis Selection Dropdown --- */}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                            {/* Row for the weekly focus/objective */}
                                            <tr className={styles.weekInfoRow}>
                                                <td colSpan="7" className={styles.weekInfoDataCell}>
                                                    <div className={styles.weekInfoContent}>
                                                        <span className={styles.weekFocus}>
                                                            <strong>Focus:</strong> {currentWeekData?.focus || <i className={styles.notSet}>N/A</i>}
                                                        </span>
                                                        <span className={styles.weekObjective}>
                                                            <strong>Objective:</strong> {currentWeekData?.objective || <i className={styles.notSet}>N/A</i>}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {/* --- End Calendar Section --- */}

                    {/* --- Add Event Form Section --- */}
                    <div className={styles.addEventSection}>
                        <h3 className={styles.sectionTitle}>Add Event</h3>
                        <form onSubmit={handleAddEvent} className={styles.addEventForm}>
                            <div className={styles.formRow}>
                                <label htmlFor="eventText">Event:</label>
                                <input
                                    type="text"
                                    id="eventText"
                                    value={newEventText}
                                    onChange={(e) => setNewEventText(e.target.value)}
                                    placeholder="Enter event description"
                                    required
                                    className={styles.eventTextInput}
                                />
                            </div>
                            <div className={styles.formRow}>
                                <label htmlFor="eventDate">Date:</label>
                                <input
                                    type="date"
                                    id="eventDate"
                                    value={newEventDate}
                                    onChange={(e) => setNewEventDate(e.target.value)}
                                    required
                                    className={styles.eventDateInput}
                                />
                            </div>
                            <div className={styles.formRow}>
                                <label htmlFor="eventAxis">Axis:</label>
                                <select
                                    id="eventAxis"
                                    value={newEventAxis}
                                    onChange={(e) => setNewEventAxis(e.target.value)}
                                    className={styles.eventAxisSelect}
                                >
                                    {/* Default option */}
                                    <option value="No Affiliation">No Affiliation</option>
                                    {/* Options from fetched axes */}
                                    {availableAxes.map(axisName => (
                                        <option key={axisName} value={axisName}>
                                            {axisName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.formRow}>
                                <button
                                    type="submit"
                                    disabled={isAddingEvent}
                                    className={styles.addEventButton}
                                >
                                    {isAddingEvent ? 'Adding...' : 'Add Event'}
                                </button>
                            </div>
                            {/* Display adding errors */}
                            {addEventError && <p className={styles.errorText}>{addEventError}</p>}
                        </form>
                    </div>
                    {/* --- End Add Event Form Section --- */}


                    {/* Reward Section */}
                    <div className={styles.rewardSection}>
                        <h3 className={styles.sectionTitle}>Month Reward</h3>
                        <p className={styles.rewardText}>{reward}</p>
                    </div>

                    {/* Placeholder for Monthly Chart/Review */}
                    <div className={styles.chartPlaceholder}>
                        Monthly Review / Chart Placeholder (Coming Soon)
                    </div>
                </>
            )}
        </div>
    );
}

export default MonthlyView;
