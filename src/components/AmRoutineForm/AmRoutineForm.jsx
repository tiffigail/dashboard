// src/components/AmRoutineForm/AmRoutineForm.jsx
import React, { useState, useEffect } from 'react'; // Added useEffect
import styles from './AmRoutineForm.module.css'; // Use AM specific styles
import { db } from '../../firebaseConfig';
import {
    collection,
    addDoc,
    serverTimestamp,
    query, // Added
    where, // Added
    limit, // Added
    getDocs // Added
} from "firebase/firestore";

// Define the checklist items for the AM routine
const amRoutineItems = [
  "Light",
  "Charge Watch",
  "Meditate",
  "Brain Train",
  "Write", // Journal entry will go after this
  "Recite", // Recitation text will go after this
  "Review Daily Focus",
  "add Daily Tasks"
];

// Props: onSubmit, onClose
function AmRoutineForm({ onSubmit, onClose }) {

  // == State for Checklist Items ==
  const [checkedItems, setCheckedItems] = useState(
    amRoutineItems.reduce((acc, item) => {
      acc[item] = false;
      return acc;
    }, {})
  );

  // == State for Metric Inputs ==
  const [gratitude1, setGratitude1] = useState('');
  const [gratitude2, setGratitude2] = useState('');
  const [gratitude3, setGratitude3] = useState('');
  const [goodThing, setGoodThing] = useState('');
  const [amJournalEntry, setAmJournalEntry] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // --- NEW: State for Recitation ---
  const [currentRecitation, setCurrentRecitation] = useState("Loading recitation...");
  // --- End Recitation State ---

  // --- NEW: Effect to fetch active AM recitation ---
  useEffect(() => {
    const fetchRecitation = async () => {
      console.log("Fetching active AM recitation...");
      try {
        const recitationsRef = collection(db, "recitations");
        // Query for the document that is active for the 'AM' context and not archived
        const q = query(
          recitationsRef,
          where("isActiveFor.AM", "==", true), // Find where AM map key is true
          // where("isArchived", "==", false), // Optional: only fetch non-archived
          limit(1) // Should only be one active
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          setCurrentRecitation(docSnap.data().text || "Recitation text missing."); // Set text or default
          console.log("Found active AM recitation:", docSnap.id);
        } else {
          console.log("No active AM recitation found in Firestore.");
          setCurrentRecitation("No active AM recitation set."); // Default text
        }
      } catch (error) {
        console.error("Error fetching recitation: ", error);
        setCurrentRecitation("Error loading recitation.");
        // Optionally set an error state to display
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

  // Update handleSubmit to save to Firebase and include journal
  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const completedChecklistItems = Object.entries(checkedItems)
      .filter(([key, value]) => value === true)
      .map(([key]) => key);

    // Calculate completion percentage
    const completionPercentage = amRoutineItems.length > 0
      ? Math.round((completedChecklistItems.length / amRoutineItems.length) * 100)
      : 0;

    const baseFormData = { // Data for the routine log
      type: 'amRoutine',
      checklist: completedChecklistItems,
      completionPercentage: completionPercentage,
      gratitudes: [gratitude1, gratitude2, gratitude3].filter(g => g.trim() !== ''),
      goodThing: goodThing.trim(),
      // Optionally include the recitation text shown at time of submit
      // recitationText: currentRecitation !== "Loading recitation..." && currentRecitation !== "No active AM recitation set." && currentRecitation !== "Error loading recitation." ? currentRecitation : null,
      completedAt: serverTimestamp()
    };

    const journalText = amJournalEntry.trim();

    console.log("Attempting to save AM Routine Data:", { ...baseFormData, journalEntry: journalText });

    try {
      // Save routine completion log
      const routineDocRef = await addDoc(collection(db, "amRoutineLogs"), baseFormData);
      console.log("AM Routine Log Document written with ID: ", routineDocRef.id);

      // If journal entry exists, save it to the separate journal collection
      if (journalText) {
        const now = new Date();
        const getTodayDateString = () => { // Keep local helper for consistency
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const dateString = getTodayDateString();
        const dayOfWeek = now.getDay();

        const journalData = {
          entryText: journalText, createdAt: serverTimestamp(), dateString: dateString,
          dayOfWeek: dayOfWeek, timeOfDay: 'AM',
        };
        const journalDocRef = await addDoc(collection(db, "journalEntries"), journalData);
        console.log("AM Journal Entry Document written with ID: ", journalDocRef.id);
      }

      if (onSubmit) { onSubmit({ ...baseFormData, journalEntry: journalText }); }
      if (onClose) { onClose(); }

    } catch (e) {
      console.error("Error adding document(s): ", e);
      setSubmitError("Failed to save routine. Please try again.");
      setIsSubmitting(false); // Keep modal open on error
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h3 className={styles.formTitle}>AM Orientation & Daily Input</h3>

      {/* Checklist Section */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>AM Routine Checklist:</h4>
        {amRoutineItems.map((item) => (
          <React.Fragment key={item}>
            <div className={styles.checkItem}>
              <input
                type="checkbox"
                id={`am-${item.replace(/\s+/g, '-')}`}
                name={item}
                checked={checkedItems[item]}
                onChange={handleCheckboxChange}
                className={styles.checkbox}
                disabled={isSubmitting}
              />
              <label htmlFor={`am-${item.replace(/\s+/g, '-')}`}>{item}</label>
            </div>

            {/* --- NEW: Display Recitation after 'Recite' item --- */}
            {item === "Recite" && (
              <div className={styles.recitationDisplay}>
                {/* TODO: Add styles for .recitationDisplay and .recitationText in CSS Module */}
                <p className={styles.recitationText}>{currentRecitation}</p>
              </div>
            )}
            {/* --- End Recitation Display --- */}

            {/* Add Journal Textarea after 'Write' item */}
            {item === "Write" && (
             <div className={styles.journalField}>
                 <label htmlFor="amJournalEntry">Thoughts on the Day:</label>
                 <textarea
                   id="amJournalEntry"
                   name="amJournalEntry"
                   rows="5"
                   value={amJournalEntry}
                   onChange={(e) => setAmJournalEntry(e.target.value)}
                   disabled={isSubmitting}
                   placeholder="Enter any thoughts..."
                 />
             </div>
           )}
          </React.Fragment>
        ))}
      </div>

      {/* Metrics Section */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Daily Metrics (AM Entry):</h4>
          <div className={styles.inputField}>
           <label htmlFor="gratitude1">Gratitude 1:</label>
           <input
             type="text"
             id="gratitude1"
             name="gratitude1"
             value={gratitude1}
             onChange={(e) => setGratitude1(e.target.value)}
             disabled={isSubmitting}
           />
         </div>
          <div className={styles.inputField}>
           <label htmlFor="gratitude2">Gratitude 2:</label>
           <input
             type="text"
             id="gratitude2"
             name="gratitude2"
             value={gratitude2}
             onChange={(e) => setGratitude2(e.target.value)}
             disabled={isSubmitting}
           />
         </div>
          <div className={styles.inputField}>
           <label htmlFor="gratitude3">Gratitude 3:</label>
           <input
             type="text"
             id="gratitude3"
             name="gratitude3"
             value={gratitude3}
             onChange={(e) => setGratitude3(e.target.value)}
             disabled={isSubmitting}
           />
         </div>
         <div className={styles.inputField}>
           <label htmlFor="goodThing">Good Thing About Abi Harrison:</label>
           <input
             type="text"
             id="goodThing"
             name="goodThing"
             value={goodThing}
             onChange={(e) => setGoodThing(e.target.value)}
             disabled={isSubmitting}
           />
         </div>
      </div>

      {submitError && <p className={styles.errorText}>Error: {submitError}</p>}
      <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Complete AM Routine'}
      </button>
    </form>
  );
}

export default AmRoutineForm;
