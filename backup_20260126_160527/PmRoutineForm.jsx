// src/components/PmRoutineForm/PmRoutineForm.jsx
import React, { useState, useEffect, useCallback } from 'react';
import styles from './PmRoutineForm.module.css';
import { db } from '../../firebaseConfig';
import { collection, addDoc, serverTimestamp, query, where, limit, getDocs, doc, setDoc } from "firebase/firestore";
import PhysicalGoalsTracker from '../PhysicalGoalsTracker/PhysicalGoalsTracker';
import StudyTracker from '../StudyTracker/StudyTracker';
import Modal from '../Modal/Modal'; 
import PhysicalDashboard from '../PhysicalDashboard/PhysicalDashboard';

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
  "Foot care",
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

  const didSubmit = React.useRef(false);
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
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);

// This effect only saves data to localStorage when the modal is closed accidentally.
    useEffect(() => {
        // This cleanup function runs when the component unmounts (closes).
        return () => {
            if (!didSubmit.current) {
                // If we HAVEN'T submitted, it's an accidental close. Save the current state.
                localStorage.setItem('pmRoutineCheckedItems', JSON.stringify(checkedItems));
                localStorage.setItem('pmRoutineEpiphanyCount', epiphanyCount);
                localStorage.setItem('pmRoutineDespairCount', despairCount);
                localStorage.setItem('pmRoutineJournalEntry', pmJournalEntry);
                localStorage.setItem('physicalGoalsData', JSON.stringify(physicalGoals));
                localStorage.setItem('pmStudyData', JSON.stringify(studyData));
                console.log("Form closed without submission. Data saved.");
            }
        };
        // The dependency array includes all state so the cleanup function has the latest data.
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

 const handlePhysicalGoalsChange = useCallback((data) => {
    setPhysicalGoals(data);
  }, []); // The empty array means this function is created once and never changes

  const handleStudyDataChange = useCallback((data) => {
    setStudyData(data);
  }, []); // The empty array means this function is created once and never changes

  const resetForm = () => {
    setCheckedItems(pmRoutineItems.reduce((acc, task) => ({ ...acc, [task]: false }), {}));
    setEpiphanyCount('');
    setDespairCount('');
    setPmJournalEntry('');
    setPhysicalGoals({});
    setStudyData({ linkedinMinutes: '' }); // Reset study data, keeping the object structure
    console.log("Form state has been reset.");
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
      didSubmit.current = true;
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

      // 3. Update physical goals log
if (Object.keys(physicalGoals).length > 0 && Object.values(physicalGoals).some(v => v)) {
    
    // This is the YYYY-MM-DD ID you already defined, e.g., "2025-10-24"
    const docId = dateString; 

    // Create a reference to the *specific* document for today
    const physicalLogRef = doc(db, "physicalGoalsLogs", docId);

    const goalsData = {
        steps: Number(physicalGoals.steps) || 0,
        waterCount: physicalGoals.waterCount || 0,
        meals: physicalGoals.meals || { Breakfast: false, Lunch: false, Dinner: false, Snacks: false },
        wentToGym: physicalGoals.wentToGym || false,
        pmMetricsCompletedAt: serverTimestamp() // Renamed 'date' for clarity
        // We don't need 'dateString' here, as it's the document's ID
    };

    // Use setDoc with { merge: true } to *add* this data
    // without overwriting the weight/bodyfat from the AM form.
    await setDoc(physicalLogRef, goalsData, { merge: true });
    console.log("Physical Goals Log *updated* for:", docId);
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
      

      // 6. Reset the form's internal state
      resetForm();

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
                  <label htmlFor="pmJournalEntry">Thoughts on the Day: What did you do and how was it rewarding?</label>
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

<button 
      type="button" 
      className={styles.chartButton} 
      onClick={() => setIsChartModalOpen(true)}
      disabled={isSubmitting} // Disable button while submitting
    >
      View Progress Chart
    </button>
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
      <Modal 
  isOpen={isChartModalOpen} 
  onClose={() => setIsChartModalOpen(false)}
  closeOnClickOutside={true} 
>
  <PhysicalDashboard />
</Modal>
    </form>
  );
}

export default PmRoutineForm;