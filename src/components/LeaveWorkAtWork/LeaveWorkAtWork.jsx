// src/components/LeaveWorkAtWork/LeaveWorkAtWork.jsx
import React, { useState, useEffect } from 'react';
import styles from './LeaveWorkAtWork.module.css';
import { db } from '../../firebaseConfig';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// --- Page Definitions (Unchanged) ---
const PAGE = {
  WORK_SHUTDOWN: 1,
  AT_HOME_ARRIVAL: 2,
};

// --- Checklist Definitions (Unchanged) ---
const workChecklistItems = {
  "Record tasks for tomorrow": false,
  "Prep tasks for tomorrow": false,
  "Log out": false,
  "Shut down computer": false,
};
const homeChecklistItems = {
  "Mr. Rogers": false,
  "Use Landing Zone": false,
  "Zoom Out": false,
  "Land!": false,
  "Orient": false,
  "Hydrate": false,
  "Mindful Greeting": false,
};

// --- ADDED: A key to use for saving/loading from localStorage ---
const STORAGE_KEY = 'leaveWorkAtWorkProgress';

// --- ADDED: A function to define the initial state ---
// It either gets the saved data from localStorage or returns a fresh, empty state.
const getInitialState = () => {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            console.log("Found saved progress. Loading...");
            return JSON.parse(savedData);
        }
    } catch (error) {
        console.error("Error parsing saved data from localStorage", error);
    }
    // Return a fresh state if nothing is saved
    return {
        currentPage: PAGE.WORK_SHUTDOWN,
        ticketTotal: '',
        closedTickets: '',
        dailySummary: '',
        workChecks: workChecklistItems,
        homeChecks: homeChecklistItems,
        driveStartTime: null,
    };
};

function LeaveWorkAtWork({ onSubmit, onClose }) {
  // --- MODIFIED: Use a single state object initialized from our new function ---
  const [state, setState] = useState(getInitialState);
  
  // Shared State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // --- ADDED: useEffect hook to save state to localStorage whenever it changes ---
  useEffect(() => {
    // We only save if the process has started (i.e., we're on page 2)
    // to avoid saving an empty form every time the modal is opened and closed.
    if (state.currentPage === PAGE.AT_HOME_ARRIVAL) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]); // This hook runs every time the 'state' object changes

  // == Handlers (MODIFIED to work with the single state object) ==
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setState(prev => ({ ...prev, [id]: value }));
  };

  const handleWorkCheckboxChange = (key) => {
    setState(prev => ({
      ...prev,
      workChecks: { ...prev.workChecks, [key]: !prev.workChecks[key] }
    }));
  };
  
  const handleHomeCheckboxChange = (key) => {
    setState(prev => ({
      ...prev,
      homeChecks: { ...prev.homeChecks, [key]: !prev.homeChecks[key] }
    }));
  };

  const handleStartDrive = () => {
    setState(prev => ({
      ...prev,
      currentPage: PAGE.AT_HOME_ARRIVAL,
      driveStartTime: Date.now() // Save the start time to state
    }));
  };

  const handleIAmHome = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    const driveEndTime = Date.now();
    const driveDurationMinutes = state.driveStartTime 
      ? Math.round((driveEndTime - state.driveStartTime) / (1000 * 60)) 
      : 0;

    const getCompleted = (stateObj) => Object.entries(stateObj)
        .filter(([, checked]) => checked)
        .map(([name]) => name);

    const formData = {
      type: 'leaveWorkLog',
      ticketTotal: state.ticketTotal !== '' ? parseInt(state.ticketTotal, 10) : null,
      ticketsClosed: state.closedTickets !== '' ? parseInt(state.closedTickets, 10) : null,
      dailySummary: state.dailySummary.trim() || null,
      workChecklist: getCompleted(state.workChecks),
      homeChecklist: getCompleted(state.homeChecks),
      driveDurationMinutes: driveDurationMinutes,
      completedAt: serverTimestamp(),
    };

    console.log("Attempting to save Leave Work at Work Data:", formData);

    try {
      await addDoc(collection(db, "leaveWorkLogs"), formData);
      
      // --- ADDED: Clear localStorage on successful submission ---
      localStorage.removeItem(STORAGE_KEY);
      
      if (onSubmit) onSubmit(formData);
      if (onClose) onClose();
    } catch (e) {
      console.error("Error adding Leave Work log: ", e);
      setSubmitError("Failed to save log. Please try again.");
      setIsSubmitting(false);
    }
  };

  // --- Render JSX (MODIFIED to read from the single 'state' object) ---
  return (
    <div className={styles.form}>
      {state.currentPage === PAGE.WORK_SHUTDOWN && (
        <>
          <h3 className={styles.formTitle}>Work Shutdown Ritual</h3>
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Daily Metrics</h4>
            <div className={styles.metricsGrid}>
              <div className={styles.inputField}>
                <label htmlFor="ticketTotal">DM Ticket Total:</label>
                <input type="number" id="ticketTotal" value={state.ticketTotal} onChange={handleInputChange} className={styles.numberInput} placeholder="e.g., 5"/>
              </div>
              <div className={styles.inputField}>
                <label htmlFor="closedTickets">Closed DM Tickets:</label>
                <input type="number" id="closedTickets" value={state.closedTickets} onChange={handleInputChange} className={styles.numberInput} placeholder="e.g., 3"/>
              </div>
            </div>
          </div>
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Daily Summary</h4>
            <textarea id="dailySummary" rows="4" value={state.dailySummary} onChange={handleInputChange} placeholder="A brief summary of the day's events, challenges, and successes..." className={styles.textareaInput} />
          </div>
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Shutdown Checklist</h4>
            <div className={styles.checkGrid}>
              {Object.keys(state.workChecks).map((item) => (
                <div key={item} className={styles.checkItem}>
                  <input type="checkbox" id={`work-${item}`} checked={state.workChecks[item]} onChange={() => handleWorkCheckboxChange(item)} className={styles.checkbox}/>
                  <label htmlFor={`work-${item}`}>{item}</label>
                </div>
              ))}
            </div>
          </div>
          <button type="button" onClick={handleStartDrive} className={styles.submitButton}>
            Start Drive
          </button>
        </>
      )}

      {state.currentPage === PAGE.AT_HOME_ARRIVAL && (
        <>
          <h3 className={styles.formTitle}>Home Arrival Ritual</h3>
          <p className={styles.driveInstructions}>Timer for your drive is running. Complete these steps upon arrival.</p>
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Home Arrival Checklist</h4>
            <div className={styles.checkGrid}>
               {Object.keys(state.homeChecks).map((item) => (
                <div key={item} className={styles.checkItem}>
                  <input type="checkbox" id={`home-${item}`} checked={state.homeChecks[item]} onChange={() => handleHomeCheckboxChange(item)} className={styles.checkbox} disabled={isSubmitting} />
                  <label htmlFor={`home-${item}`}>{item}</label>
                </div>
              ))}
            </div>
          </div>
          {submitError && <p className={styles.errorText}>{submitError}</p>}
          <button type="button" onClick={handleIAmHome} className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'I Am Home'}
          </button>
        </>
      )}
    </div>
  );
}

// Keep the named export if other files use it
export { LeaveWorkAtWork };

// Add a default export for easier dynamic importing if needed
export default LeaveWorkAtWork;