import React, { useState, useEffect } from 'react';
import styles from './PmRoutineForm.module.css';
// Import Firestore functions and the database instance
import { db } from '../../firebaseConfig'; // Adjust path if needed
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// Define the checklist items for the PM routine - REORDERED & UPDATED LIST
const pmRoutineItems = [
  "Brush teeth", // Moved to beginning
  "Ready for Tomorrow",
  "Clothes",
  "Charge Phone",
  "Drink",
  "Things I want to Remember (to learn in my sleep)",
  "N+1 Review",
  "Write Recite and Envision", // Journal entry will go after this
  "Lotion", // Moved before Brain Train
  "Brain Train",
  "Meditate" // End
  // "Tap out" removed
];

// Props: onSubmit, onClose
function PmRoutineForm({ onSubmit, onClose }) {

  // == State for Checklist Items ==
  const [checkedItems, setCheckedItems] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pmRoutineCheckedItems');
      try {
        return saved ? JSON.parse(saved) : pmRoutineItems.reduce((acc, item) => {
          acc[item] = false;
          return acc;
        }, {});
      } catch (e) {
        console.warn('Error parsing saved checked items:', e);
        return pmRoutineItems.reduce((acc, item) => { //fallback
          acc[item] = false;
          return acc;
        }, {});
      }
    }
    return pmRoutineItems.reduce((acc, item) => {  // Default initialState
      acc[item] = false;
      return acc;
    }, {});
  });

  // == State for Metric Inputs ==
  const [epiphanyCount, setEpiphanyCount] = useState(() => localStorage.getItem('pmRoutineEpiphanyCount') || '');
  const [despairCount, setDespairCount] = useState(() => localStorage.getItem('pmRoutineDespairCount') || '');
  const [pmJournalEntry, setPmJournalEntry] = useState(() => localStorage.getItem('pmRoutineJournalEntry') || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);


  // == LocalStorage Persistence ==
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('pmRoutineCheckedItems', JSON.stringify(checkedItems));
            localStorage.setItem('pmRoutineEpiphanyCount', epiphanyCount);
            localStorage.setItem('pmRoutineDespairCount', despairCount);
            localStorage.setItem('pmRoutineJournalEntry', pmJournalEntry);
        }
    }, [checkedItems, epiphanyCount, despairCount, pmJournalEntry]);


  // == Handlers ==
  const handleCheckboxChange = (event) => {
    const { name, checked } = event.target;
    setCheckedItems(prevItems => ({ ...prevItems, [name]: checked }));
  };

  // Update handleSubmit to save to Firebase
  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const completedChecklistItems = Object.entries(checkedItems)
      .filter(([key, value]) => value === true)
      .map(([key]) => key);

    // Calculate completion percentage
    const completionPercentage = pmRoutineItems.length > 0
      ? Math.round((completedChecklistItems.length / pmRoutineItems.length) * 100)
      : 0;

    const baseFormData = { // Data for the routine log
      type: 'pmRoutine',
      checklist: completedChecklistItems,
      completionPercentage: completionPercentage, // Added metric
      epiphanyCount: epiphanyCount === '' ? null : Number(epiphanyCount),
      despairCount: despairCount === '' ? null : Number(despairCount),
      completedAt: serverTimestamp()
    };

    const journalText = pmJournalEntry.trim();

    console.log("Attempting to save PM Routine Data:", { ...baseFormData, journalEntry: journalText });

    try {
      // Save routine completion log to 'pmRoutineLogs' collection
      // Ensure collection name is correct (e.g., pmRoutineLogs)
      const routineDocRef = await addDoc(collection(db, "pmRoutineLogs"), baseFormData);
      console.log("PM Routine Log Document written with ID: ", routineDocRef.id);

      // If journal entry exists, save it to the separate 'journalEntries' collection
      if (journalText) {
        const now = new Date();
        const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon,... 6=Sat

        const journalData = {
          entryText: journalText,
          createdAt: serverTimestamp(), // Use server timestamp
          dateString: dateString,
          dayOfWeek: dayOfWeek,
          timeOfDay: 'PM', // Mark as PM entry
          // userId: '...' // Add later
        };
        // Ensure collection name is correct (e.g., journalEntries)
        const journalDocRef = await addDoc(collection(db, "journalEntries"), journalData);
        console.log("PM Journal Entry Document written with ID: ", journalDocRef.id);
      }

      if (onSubmit) {
        onSubmit({ ...baseFormData, journalEntry: journalText }); // Pass combined data if needed
      }
      if (onClose) {
        onClose(); // Close modal on success
      }
    } catch (e) {
      console.error("Error adding document(s): ", e);
      setSubmitError("Failed to save routine. Please try again.");
      setIsSubmitting(false); // Re-enable button on error
    }
    // No need to set isSubmitting false on success as modal closes, unless modal isn't closing automatically
    // If the modal doesn't close automatically on success, uncomment the line below
    // if (!submitError) { setIsSubmitting(false); }
  };


  return (
    // Pass handleSubmit to the form's onSubmit event
    <form onSubmit={handleSubmit} className={styles.form}>
      <h3 className={styles.formTitle}>PM Orientation & Daily Input</h3>

      {/* Checklist Section */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>PM Routine Checklist:</h4>
        {pmRoutineItems.map((item) => (
          // Use React.Fragment to avoid unnecessary divs if needed, but div is fine too
          <div key={item} className={styles.checkItem}>
            <input
              type="checkbox"
              id={`pm-${item.replace(/\s+/g, '-')}`} // Create safer ID
              name={item}
              checked={checkedItems[item]}
              onChange={handleCheckboxChange}
              className={styles.checkbox}
              disabled={isSubmitting}
            />
            <label htmlFor={`pm-${item.replace(/\s+/g, '-')}`}>{item}</label>
          </div>
        ))}
      </div>

      {/* Journal Section - Moved outside the checklist map */}
      <div className={`${styles.section} ${styles.journalSection}`}>
        <div className={styles.journalField}>
            <label htmlFor="pmJournalEntry">Thoughts on the Day:</label>
            <textarea
              id="pmJournalEntry"
              name="pmJournalEntry"
              rows="5" // Increased rows
              value={pmJournalEntry}
              onChange={(e) => setPmJournalEntry(e.target.value)}
              disabled={isSubmitting}
              placeholder="Enter any thoughts..."
            />
          </div>
      </div>

      {/* Display submission error if it exists */}
      {submitError && <p className={styles.errorText}>Error: {submitError}</p>}
      {/* Disable button while submitting */}
      <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Complete PM Routine'}
      </button>
    </form>
  );
}

export default PmRoutineForm;
