// src/components/PmRoutineForm/PmRoutineForm.jsx
import React, { useState, useEffect } from 'react';
import styles from './PmRoutineForm.module.css';
import { db } from '../../firebaseConfig';
import {
    collection,
    addDoc,
    serverTimestamp,
    query,      // <-- Import query
    where,      // <-- Import where
    limit,      // <-- Import limit
    getDocs     // <-- Import getDocs
} from "firebase/firestore";

// Define the checklist items for the PM routine
const pmRoutineItems = [
  "Brush teeth",
  "Ready for Tomorrow",
  "Clothes",
  "Charge Phone",
  "Drink",
  "Things I want to Remember (to learn in my sleep)",
  "N+1 Review",
  "Write Recite and Envision", // <-- Journal entry will go after this AND Recitation
  "Lotion",
  "Tap Out",
  "Meditate"
];

// Props: onSubmit, onClose
function PmRoutineForm({ onSubmit, onClose }) {

  // == State for Checklist Items ==
  const [checkedItems, setCheckedItems] = useState(() => {
    // Client-side only check for localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pmRoutineCheckedItems');
      try {
        // Ensure saved data structure matches current items if possible
        const parsed = saved ? JSON.parse(saved) : {};
        // Initialize with defaults, then override with saved values
        const initialState = pmRoutineItems.reduce((acc, item) => ({ ...acc, [item]: false }), {});
        // Only use saved value if the key exists in current items
        for (const key in parsed) {
            if (initialState.hasOwnProperty(key)) {
                initialState[key] = parsed[key];
            }
        }
        return initialState;
      } catch (e) {
        console.warn('Error parsing saved checked items:', e);
        // Fallback to default state if parsing fails
      }
    }
    // Default state if no localStorage or parsing error
    return pmRoutineItems.reduce((acc, item) => ({ ...acc, [item]: false }), {});
  });

  // == State for Metric Inputs ==
  // Only access localStorage on client-side after mount or via initial state function
  const [epiphanyCount, setEpiphanyCount] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('pmRoutineEpiphanyCount') || '' : '');
  const [despairCount, setDespairCount] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('pmRoutineDespairCount') || '' : '');
  const [pmJournalEntry, setPmJournalEntry] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('pmRoutineJournalEntry') || '' : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // --- NEW: State for Recitation ---
  const [pmRecitation, setPmRecitation] = useState("Loading recitation...");
  // --- End Recitation State ---

  // == LocalStorage Persistence ==
  useEffect(() => {
      if (typeof window !== 'undefined') {
          localStorage.setItem('pmRoutineCheckedItems', JSON.stringify(checkedItems));
          localStorage.setItem('pmRoutineEpiphanyCount', epiphanyCount);
          localStorage.setItem('pmRoutineDespairCount', despairCount);
          localStorage.setItem('pmRoutineJournalEntry', pmJournalEntry);
      }
  }, [checkedItems, epiphanyCount, despairCount, pmJournalEntry]);

  // --- NEW: Effect to fetch active PM recitation ---
  useEffect(() => {
    const fetchRecitation = async () => {
      console.log("Fetching active PM recitation...");
      setPmRecitation("Loading recitation..."); // Reset on fetch
      try {
        const recitationsRef = collection(db, "recitations");
        // Query for the document where activeContext is "PM" AND isArchived is false
        const q = query(
          recitationsRef,
          where("activeContext", "==", "PM"),   // Check the activeContext field
          where("isArchived", "==", false),      // Check the isArchived field
          limit(1)                               // Expect only one result
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          setPmRecitation(docSnap.data().text || "Recitation text missing."); // Set text or default
          console.log("Found active PM recitation:", docSnap.id, "Recitation ID:", docSnap.data().recitationId);
        } else {
          console.log("No active, non-archived PM recitation found in Firestore.");
          setPmRecitation("No active PM recitation set."); // Default text
        }
      } catch (error) {
        console.error("Error fetching PM recitation: ", error);
        setPmRecitation("Error loading recitation.");
      }
    };

    fetchRecitation();
  }, []); // Run once on component mount
  // --- End Fetch Effect ---

  // == Handlers ==
  const handleCheckboxChange = (event) => {
    const { name, checked } = event.target;
    setCheckedItems(prevItems => ({ ...prevItems, [name]: checked }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const completedChecklistItems = Object.entries(checkedItems)
      .filter(([key, value]) => value === true)
      .map(([key]) => key);

    const completionPercentage = pmRoutineItems.length > 0
      ? Math.round((completedChecklistItems.length / pmRoutineItems.length) * 100)
      : 0;

    const baseFormData = {
      type: 'pmRoutine',
      checklist: completedChecklistItems,
      completionPercentage: completionPercentage,
      epiphanyCount: epiphanyCount.trim() ? Number(epiphanyCount) : null, // Ensure number or null
      despairCount: despairCount.trim() ? Number(despairCount) : null,   // Ensure number or null
      completedAt: serverTimestamp()
      // Optionally add pmRecitation here if needed
    };

    const journalText = pmJournalEntry.trim();

    console.log("Attempting to save PM Routine Data:", { ...baseFormData, journalEntry: journalText });

    try {
      // Save routine completion log
      const routineDocRef = await addDoc(collection(db, "pmRoutineLogs"), baseFormData);
      console.log("PM Routine Log Document written with ID: ", routineDocRef.id);

      // If journal entry exists, save it separately
      if (journalText) {
        const now = new Date();
        const dateString = now.toISOString().split('T')[0];
        const dayOfWeek = now.getDay();

        const journalData = {
          entryText: journalText,
          createdAt: serverTimestamp(),
          dateString: dateString,
          dayOfWeek: dayOfWeek,
          timeOfDay: 'PM',
        };
        const journalDocRef = await addDoc(collection(db, "journalEntries"), journalData);
        console.log("PM Journal Entry Document written with ID: ", journalDocRef.id);
      }

      // Clear local storage on successful submission
      if (typeof window !== 'undefined') {
            localStorage.removeItem('pmRoutineCheckedItems');
            localStorage.removeItem('pmRoutineEpiphanyCount');
            localStorage.removeItem('pmRoutineDespairCount');
            localStorage.removeItem('pmRoutineJournalEntry');
      }

      if (onSubmit) {
        onSubmit({ ...baseFormData, journalEntry: journalText });
      }
      if (onClose) {
        onClose();
      }
    } catch (e) {
      console.error("Error adding document(s): ", e);
      setSubmitError("Failed to save routine. Please try again.");
      setIsSubmitting(false); // Re-enable button on error
    }
  };


  // --- Render JSX ---
  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h3 className={styles.formTitle}>PM Orientation & Daily Input</h3>

      {/* Checklist Section */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>PM Routine Checklist:</h4>
        {pmRoutineItems.map((item) => (
          <React.Fragment key={item}> {/* Use Fragment to wrap items */}
            <div className={styles.checkItem}>
              <input
                type="checkbox"
                id={`pm-${item.replace(/\s+/g, '-')}`}
                name={item}
                checked={checkedItems[item]}
                onChange={handleCheckboxChange}
                className={styles.checkbox}
                disabled={isSubmitting}
              />
              <label htmlFor={`pm-${item.replace(/\s+/g, '-')}`}>{item}</label>
            </div>

            {/* --- Display Recitation and Journal after 'Write Recite and Envision' --- */}
            {item === "Write Recite and Envision" && (
              <> {/* Use Fragment to group Recitation and Journal */}
                {/* Display Recitation */}
                {(pmRecitation && pmRecitation !== "Loading recitation..." && pmRecitation !== "No active PM recitation set." && pmRecitation !== "Error loading recitation.") && (
                   <div className={styles.recitationDisplay}>
                      <p className={styles.recitationText}>{pmRecitation}</p>
                   </div>
                 )}

                {/* Journal Textarea */}
                <div className={styles.journalField}>
                  <label htmlFor="pmJournalEntry">Thoughts on the Day:</label>
                  <textarea
                    id="pmJournalEntry"
                    name="pmJournalEntry"
                    rows="5"
                    value={pmJournalEntry}
                    onChange={(e) => setPmJournalEntry(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Enter any thoughts..."
                  />
                </div>
              </>
            )}
            {/* --- End Recitation and Journal Display --- */}

          </React.Fragment>
        ))}
      </div>
      {submitError && <p className={styles.errorText}>Error: {submitError}</p>}
      <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Complete PM Routine'}
      </button>
    </form>
  );
}

export default PmRoutineForm;