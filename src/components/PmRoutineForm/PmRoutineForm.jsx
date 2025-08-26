// src/components/PmRoutineForm/PmRoutineForm.jsx
import React, { useState, useEffect } from 'react';
import styles from './PmRoutineForm.module.css';
import { db } from '../../firebaseConfig';
import { collection, addDoc, serverTimestamp, query, where, limit, getDocs, doc, setDoc } from "firebase/firestore";
import PhysicalGoalsTracker from '../PhysicalGoalsTracker/PhysicalGoalsTracker';
import StudyTracker from '../StudyTracker/StudyTracker';

// Helper to get today's date string
const getTodayString = () => {
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    const localDate = new Date(now - timezoneOffset);
    return localDate.toISOString().split('T')[0];
};

// Define the checklist items for the PM routine
const pmRoutineItems = [
  "PM Lumen",
  "Brush teeth",
  "Ready for Tomorrow",
  "Clothes",
  "Charge Phone",
  "Drink",
  "Things I want to Remember (to learn in my sleep)",
  "N+1 Review",
  "Write Recite and Envision",
  "Lotion",
  "Pray",
  "Meditate"
];

// Props: onSubmit, onClose
function PmRoutineForm({ onSubmit, onClose }) {

  // == State for Checklist Items ==
  const [checkedItems, setCheckedItems] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pmRoutineCheckedItems');
      try {
        const parsed = saved ? JSON.parse(saved) : {};
        const initialState = pmRoutineItems.reduce((acc, item) => ({ ...acc, [item]: false }), {});
        for (const key in parsed) {
            if (initialState.hasOwnProperty(key)) {
                initialState[key] = parsed[key];
            }
        }
        return initialState;
      } catch (e) {
        console.warn('Error parsing saved checked items:', e);
      }
    }
    return pmRoutineItems.reduce((acc, item) => ({ ...acc, [item]: false }), {});
  });

  // == State for Metric Inputs ==
  const [epiphanyCount, setEpiphanyCount] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('pmRoutineEpiphanyCount') || '' : '');
  const [despairCount, setDespairCount] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('pmRoutineDespairCount') || '' : '');
  const [pmJournalEntry, setPmJournalEntry] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('pmRoutineJournalEntry') || '' : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [pmRecitation, setPmRecitation] = useState("Loading recitation...");

  // == State for Trackers ==
  const [physicalGoals, setPhysicalGoals] = useState(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('physicalGoalsData');
        return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const [studyData, setStudyData] = useState(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('pmStudyData');
        return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  // == LocalStorage Persistence ==
  useEffect(() => {
      if (typeof window !== 'undefined') {
          localStorage.setItem('pmRoutineCheckedItems', JSON.stringify(checkedItems));
          localStorage.setItem('pmRoutineEpiphanyCount', epiphanyCount);
          localStorage.setItem('pmRoutineDespairCount', despairCount);
          localStorage.setItem('pmRoutineJournalEntry', pmJournalEntry);
          localStorage.setItem('physicalGoalsData', JSON.stringify(physicalGoals));
          localStorage.setItem('pmStudyData', JSON.stringify(studyData));
      }
  }, [checkedItems, epiphanyCount, despairCount, pmJournalEntry, physicalGoals, studyData]);

  // --- Effect to fetch active PM recitation ---
  useEffect(() => {
    const fetchRecitation = async () => {
      console.log("Fetching active PM recitation...");
      setPmRecitation("Loading recitation...");
      try {
        const recitationsRef = collection(db, "recitations");
        const q = query(
          recitationsRef,
          where("activeContext", "==", "PM"),
          where("isArchived", "==", false),
          limit(1)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          setPmRecitation(docSnap.data().text || "Recitation text missing.");
        } else {
          setPmRecitation("No active PM recitation set.");
        }
      } catch (error) {
        console.error("Error fetching PM recitation: ", error);
        setPmRecitation("Error loading recitation.");
      }
    };

    fetchRecitation();
  }, []);

  // == Handlers ==
  const handleCheckboxChange = (event) => {
    const { name, checked } = event.target;
    setCheckedItems(prevItems => ({ ...prevItems, [name]: checked }));
  };

  const handlePhysicalGoalsChange = (data) => {
    setPhysicalGoals(data);
  };

  const handleStudyDataChange = (data) => {
    setStudyData(data);
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
      epiphanyCount: epiphanyCount.trim() ? Number(epiphanyCount) : null,
      despairCount: despairCount.trim() ? Number(despairCount) : null,
      completedAt: serverTimestamp()
    };
    
    const journalText = pmJournalEntry.trim();
    const dateString = getTodayString();
    const now = new Date();

    try {
      // 1. Save routine completion log
      const routineDocRef = await addDoc(collection(db, "pmRoutineLogs"), baseFormData);
      console.log("PM Routine Log Document written with ID: ", routineDocRef.id);

      // 2. If journal entry exists, save it
      if (journalText) {
        const journalData = {
          entryText: journalText,
          createdAt: serverTimestamp(),
          dateString: dateString,
          dayOfWeek: now.getDay(),
          timeOfDay: 'PM',
        };
        await addDoc(collection(db, "journalEntries"), journalData);
      }

      // 3. Save physical goals data
      if (Object.keys(physicalGoals).length > 0 && Object.values(physicalGoals).some(v => v)) {
          const goalsData = {
              steps: Number(physicalGoals.steps) || 0,
              waterCount: physicalGoals.waterCount || 0,
              meals: physicalGoals.meals || { Breakfast: false, Lunch: false, Dinner: false, Snacks: false },
              wentToGym: physicalGoals.wentToGym || false,
              date: serverTimestamp(),
              dateString: dateString
          };
          await addDoc(collection(db, "physicalGoalsLogs"), goalsData);
          console.log("Physical Goals Log written.");
      }

      // 4. Save daily study log
      const hasStudyData = studyData.studyMinutes > 0 || studyData.flashcardMinutes > 0 || (studyData.linkedinMinutes && Number(studyData.linkedinMinutes) > 0);
      if (hasStudyData) {
          const totalMinutes = (studyData.studyMinutes || 0) + (studyData.flashcardMinutes || 0) + Number(studyData.linkedinMinutes || 0);
          const dailyLogData = {
              studyModalMinutes: studyData.studyMinutes || 0,
              flashcardsModalMinutes: studyData.flashcardMinutes || 0,
              linkedinMinutes: Number(studyData.linkedinMinutes || 0),
              totalMinutes: totalMinutes,
              lastUpdatedAt: serverTimestamp(),
          };
          const dailyLogDocRef = doc(db, "dailyStudyLogs", dateString);
          await setDoc(dailyLogDocRef, dailyLogData, { merge: true });
          console.log("Daily Study Log saved/updated for:", dateString);
      }

      // 5. Clear local storage on successful submission
      if (typeof window !== 'undefined') {
          localStorage.removeItem('pmRoutineCheckedItems');
          localStorage.removeItem('pmRoutineEpiphanyCount');
          localStorage.removeItem('pmRoutineDespairCount');
          localStorage.removeItem('pmRoutineJournalEntry');
          localStorage.removeItem('physicalGoalsData');
          localStorage.removeItem('pmStudyData');
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
      setIsSubmitting(false);
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
          <React.Fragment key={item}>
            <div className={styles.checkItem}>
              <input
                type="checkbox"
                id={`pm-${item.replace(/\s+/g, '-')}`}
                name={item}
                checked={!!checkedItems[item]}
                onChange={handleCheckboxChange}
                className={styles.checkbox}
                disabled={isSubmitting}
              />
              <label htmlFor={`pm-${item.replace(/\s+/g, '-')}`}>{item}</label>
            </div>
            {item === "Write Recite and Envision" && (
              <>
                {(pmRecitation && pmRecitation !== "Loading recitation..." && pmRecitation !== "No active PM recitation set." && pmRecitation !== "Error loading recitation.") && (
                    <div className={styles.recitationDisplay}>
                        <p className={styles.recitationText}>{pmRecitation}</p>
                    </div>
                )}
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
          </React.Fragment>
        ))}
      </div>

      {/* Physical Goals Tracker Section */}
      <PhysicalGoalsTracker
        onDataChange={handlePhysicalGoalsChange}
        initialData={physicalGoals}
        disabled={isSubmitting}
      />
      
      {/* Study Tracker Section */}
      <StudyTracker
        onDataChange={handleStudyDataChange}
        initialData={studyData}
        disabled={isSubmitting}
      />
      
      {submitError && <p className={styles.errorText}>Error: {submitError}</p>}
      <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Complete PM Routine'}
      </button>
    </form>
  );
}

export default PmRoutineForm;