// src/components/AmRoutineForm/AmRoutineForm.jsx
import React, { useState, useEffect } from 'react';
import styles from './AmRoutineForm.module.css';
import { db } from '../../firebaseConfig';
import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    where,
    limit,
    getDocs
} from "firebase/firestore";
import Modal from '../Modal/Modal';
import DynamicSprintDashboard from '../DynamicSprintDashboard/DynamicSprintDashboard';
import FitnessAchievementDashboard from '../FitnessAchievementDashboard/FitnessAchievementDashboard';
import { useAuth } from '../../context/AuthContext';
import { saveCorpusEntry, writeActivityEntry } from '../../services/advisorService';

// Day index (0=Sun) → axis name
const dayToAxisThemeMapping = [
    "Rest and preparation", "Physical", "Financial", "Gear", "On Track N+1", "Misdirect", "Environment"
];

// Axis descriptions from the Pareto view
const axisSubtexts = {
    "Rest and preparation": "Crucial for rejuvenation and sustained productivity.",
    "Physical": 'Mastering the body to move like an "optical illusion."',
    "Financial": "Ensuring survival and funding other endeavors.",
    "Gear": "Creating a system for mental control.",
    "On Track N+1": "Aligning with personal values and future goals. Again and Again.",
    "Misdirect": "Strategic distractions to maintain productivity and prevent fatigue.",
    "Environment": "Shaping surroundings to reflect the inner mind and foster ease.",
};

// Define the checklist items for the AM routine ("AM Lumen" removed)
const amRoutineItems = [
  "Pray",
  "Light",
  "Charge Watch",
  "Meditate",
  "Brain Train",
  "Write",
  "Recite",
  "Review Daily Focus",
  "add Daily Tasks"
];

// Helper
const getTodayDateString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

// Props: onSubmit, onClose
function AmRoutineForm({ onSubmit, onClose }) {
  const { currentUser } = useAuth();

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
  const [dreamEntry, setDreamEntry] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // --- Today's axis ---
  const todayAxisName = dayToAxisThemeMapping[new Date().getDay()];
  const todayAxisSubtext = axisSubtexts[todayAxisName] || '';

  // --- State for Recitation ---
  const [currentRecitation, setCurrentRecitation] = useState("Loading recitation...");

  // --- State for Sprint Dashboard Modal ---
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [isPhysicalDashboardOpen, setIsPhysicalDashboardOpen] = useState(false);

  // --- Effect to fetch active AM recitation ---
  useEffect(() => {
    const fetchRecitation = async () => {
      setCurrentRecitation("Loading recitation...");
      try {
        const recitationsRef = collection(db, "recitations");
        const q = query(
          recitationsRef,
          where("activeContext", "==", "AM"),
          where("isArchived", "==", false),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          setCurrentRecitation(docSnap.data().text || "Recitation text missing.");
        } else {
          setCurrentRecitation("No active AM recitation set.");
        }
      } catch (error) {
        console.error("Error fetching recitation: ", error);
        setCurrentRecitation("Error loading recitation.");
      }
    };
    fetchRecitation();
  }, []);

  // == Handlers ==
  const handleCheckboxChange = (event) => {
    const { name, checked } = event.target;
    setCheckedItems(prevItems => ({ ...prevItems, [name]: checked }));
  };

  // Prevent Enter key from submitting the form when in a text input
  const handleFormKeyDown = (event) => {
    if (event.key === 'Enter' && event.target.tagName === 'INPUT') {
      event.preventDefault();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const completedChecklistItems = Object.entries(checkedItems)
      .filter(([key, value]) => value === true)
      .map(([key]) => key);

    const completionPercentage = amRoutineItems.length > 0
      ? Math.round((completedChecklistItems.length / amRoutineItems.length) * 100)
      : 0;

    const baseFormData = {
      type: 'amRoutine',
      checklist: completedChecklistItems,
      completionPercentage: completionPercentage,
      gratitudes: [gratitude1, gratitude2, gratitude3].filter(g => g.trim() !== ''),
      goodThing: goodThing.trim(),
      completedAt: serverTimestamp()
    };

    const journalText = amJournalEntry.trim();
    const dreamText = dreamEntry.trim();
    const dateString = getTodayDateString();
    const dayOfWeek = new Date().getDay();

    try {
      await addDoc(collection(db, "amRoutineLogs"), baseFormData);
      if (currentUser?.uid) {
        writeActivityEntry(currentUser.uid, {
          type: 'routine_completion',
          source: 'dashboard',
          data: { which: 'am', completion_pct: completionPercentage, items_completed: completedChecklistItems.length, items_total: amRoutineItems.length },
        }).catch(() => {});
      }

      if (journalText) {
        await addDoc(collection(db, "journalEntries"), {
          entryText: journalText,
          createdAt: serverTimestamp(),
          dateString,
          dayOfWeek,
          timeOfDay: 'AM',
        });
        if (currentUser?.uid) {
          saveCorpusEntry(currentUser.uid, {
            type: 'journal',
            axis: ['mental', 'rest_prep'],
            themes: ['am_routine'],
            voice_markers: [],
            state: 'settled',
            significance: 2,
            summary: journalText.slice(0, 150),
            raw: journalText,
          }).catch(() => {});
        }
      }

      if (dreamText) {
        await addDoc(collection(db, "journalEntries"), {
          entryText: dreamText,
          createdAt: serverTimestamp(),
          dateString,
          dayOfWeek,
          timeOfDay: 'Dreams',
        });
      }

      if (onSubmit) { onSubmit({ ...baseFormData, journalEntry: journalText, dreamEntry: dreamText }); }
      if (onClose) { onClose(); }

    } catch (e) {
      console.error("Error adding document(s): ", e);
      setSubmitError("Failed to save routine. Please try again.");
      setIsSubmitting(false);
    }
  };

  // --- Render JSX ---
  return (
    <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className={styles.form}>
      <h3 className={styles.formTitle}>AM Orientation & Daily Input</h3>

      {/* Today's Axis Display */}
      <div className={styles.axisDisplay}>
        <p className={styles.axisLabel}>Today's Axis</p>
        <p className={styles.axisName}>{todayAxisName}</p>
        <p className={styles.axisSubtext}>{todayAxisSubtext}</p>
      </div>

      {/* Dreams Section */}
      <div className={styles.section}>
        <div className={styles.journalField}>
          <label htmlFor="dreamEntry">Dreams & Interpretation:</label>
          <textarea
            id="dreamEntry"
            name="dreamEntry"
            rows="4"
            value={dreamEntry}
            onChange={(e) => setDreamEntry(e.target.value)}
            disabled={isSubmitting}
            placeholder="What did you dream? What might it mean?"
          />
        </div>
      </div>

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

            {item === "Recite" && (
              <div className={styles.recitationDisplay}>
                <p className={styles.recitationText}>{currentRecitation}</p>
              </div>
            )}

            {item === "Write" && (
             <div className={styles.journalField}>
                 <label htmlFor="amJournalEntry">Envision your Day:</label>
                 <textarea
                   id="amJournalEntry"
                   name="amJournalEntry"
                   rows="5"
                   value={amJournalEntry}
                   onChange={(e) => setAmJournalEntry(e.target.value)}
                   disabled={isSubmitting}
                   placeholder="How do you want today to go? What will you accomplish?"
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
           <input type="text" id="gratitude1" name="gratitude1" value={gratitude1} onChange={(e) => setGratitude1(e.target.value)} disabled={isSubmitting} />
         </div>
          <div className={styles.inputField}>
           <label htmlFor="gratitude2">Gratitude 2:</label>
           <input type="text" id="gratitude2" name="gratitude2" value={gratitude2} onChange={(e) => setGratitude2(e.target.value)} disabled={isSubmitting} />
         </div>
          <div className={styles.inputField}>
           <label htmlFor="gratitude3">Gratitude 3:</label>
           <input type="text" id="gratitude3" name="gratitude3" value={gratitude3} onChange={(e) => setGratitude3(e.target.value)} disabled={isSubmitting} />
         </div>
         <div className={styles.inputField}>
           <label htmlFor="goodThing">Good Thing About Abi Harrison:</label>
           <input type="text" id="goodThing" name="goodThing" value={goodThing} onChange={(e) => setGoodThing(e.target.value)} disabled={isSubmitting} />
         </div>
      </div>

      <button type="button" className={styles.chartButton} onClick={() => setIsSprintModalOpen(true)} disabled={isSubmitting}>
        View Sprint Progress
      </button>

      <button type="button" className={styles.chartButton} onClick={() => setIsPhysicalDashboardOpen(true)} disabled={isSubmitting}>
        View Physical Progress
      </button>

      {submitError && <p className={styles.errorText}>Error: {submitError}</p>}

      <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Complete AM Routine'}
      </button>

      <Modal isOpen={isSprintModalOpen} onClose={() => setIsSprintModalOpen(false)} closeOnClickOutside={true}>
        <DynamicSprintDashboard />
      </Modal>

      <Modal isOpen={isPhysicalDashboardOpen} onClose={() => setIsPhysicalDashboardOpen(false)}>
        <FitnessAchievementDashboard />
      </Modal>
    </form>
  );
}

export default AmRoutineForm;
