// src/components/PmRoutineForm/PmRoutineForm.jsx (UPDATED VERSION)
// 
// CHANGES MADE:
// 1. Import DynamicSprintDashboard instead of PhysicalDashboard
// 2. Change button text to "View Sprint Progress"
// 3. Updated modal content to use DynamicSprintDashboard

import React, { useState, useEffect, useCallback } from 'react';
import styles from './PmRoutineForm.module.css';
import { db } from '../../firebaseConfig';
import { collection, addDoc, serverTimestamp, query, where, limit, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import PhysicalGoalsTracker from '../PhysicalGoalsTracker/PhysicalGoalsTracker';
import StudyTracker from '../StudyTracker/StudyTracker';
import Modal from '../Modal/Modal'; 
// CHANGED: Import DynamicSprintDashboard instead of PhysicalDashboard
import DynamicSprintDashboard from '../DynamicSprintDashboard/DynamicSprintDashboard';
import FitnessAchievementDashboard from '../FitnessAchievementDashboard/FitnessAchievementDashboard';
import { useAuth } from '../../context/AuthContext';
import { saveCorpusEntry, writeActivityEntry } from '../../services/advisorService';
import { updateActiveDistanceGoals } from '../../services/enduranceGoalsService';

// Helper to get today's date string
const getTodayString = () => {
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    const localDate = new Date(now - timezoneOffset);
    return localDate.toISOString().split('T')[0];
};

// PM routine divided into 3 sections
const pmSections = [
  {
    id: 'prepare',
    title: 'Prepare',
    subtitle: 'What is tomorrow? How can I ensure success?',
    items: [
      "Ready for Tomorrow",
      "Shoes Off Outside Room",
      "Drink in Fridge",
      "Clothes Laid Out",
      "Charge Phone",
      "Charge Mask",
      "Flashcards",
      "N+1 Review",
      "Write Recite and Envision",
      "Things I want to Remember (to learn in my sleep)",
    ],
  },
  {
    id: 'transition',
    title: 'Transition',
    items: [
      "Brush Teeth",
      "Red Lenses",
      "Lotion",
      "PJs",
      "Cuddle",
    ],
  },
  {
    id: 'sleep',
    title: 'Meditate & Sleep',
    items: [
      "Pray",
      "Meditate",
    ],
  },
];

// Flat list derived from sections — used for checkedItems init and completion %
const pmRoutineItems = pmSections.flatMap(s => s.items);

// Props: onSubmit, onClose
function PmRoutineForm({ onSubmit, onClose }) {

  const { currentUser } = useAuth();
  const didSubmit = React.useRef(false);
  
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

  const [epiphanyCount, setEpiphanyCount] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('pmRoutineEpiphanyCount') || '' : '');
  const [despairCount, setDespairCount] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('pmRoutineDespairCount') || '' : '');
  const [pmJournalEntry, setPmJournalEntry] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('pmRoutineJournalEntry') || '' : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [pmRecitation, setPmRecitation] = useState("Loading recitation...");

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
  const [isPhysicalDashboardOpen, setIsPhysicalDashboardOpen] = useState(false);

  useEffect(() => {
    return () => {
        if (!didSubmit.current) {
            localStorage.setItem('pmRoutineCheckedItems', JSON.stringify(checkedItems));
            localStorage.setItem('pmRoutineEpiphanyCount', epiphanyCount);
            localStorage.setItem('pmRoutineDespairCount', despairCount);
            localStorage.setItem('pmRoutineJournalEntry', pmJournalEntry);
            localStorage.setItem('physicalGoalsData', JSON.stringify(physicalGoals));
            localStorage.setItem('pmStudyData', JSON.stringify(studyData));
            console.log("Form closed without submission. Data saved.");
        }
    };
  }, [checkedItems, epiphanyCount, despairCount, pmJournalEntry, physicalGoals, studyData]);

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

  useEffect(() => {
    const fetchTodayCounts = async () => {
      try {
        const todayStr = getTodayString();
        const docRef = doc(db, "dailyMetrics", todayStr);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.epiphanyCount !== undefined) setEpiphanyCount(String(data.epiphanyCount));
          if (data.despairCount !== undefined) setDespairCount(String(data.despairCount));
        }
      } catch (err) {
        console.error("Error fetching today's moment counts:", err);
      }
    };
    fetchTodayCounts();
  }, []);

  const handleCheckboxChange = (event) => {
    const { name, checked } = event.target;
    setCheckedItems(prevItems => ({ ...prevItems, [name]: checked }));
  };

  const handlePhysicalGoalsChange = useCallback((data) => {
    setPhysicalGoals(data);
  }, []);

  const handleStudyDataChange = useCallback((data) => {
    setStudyData(data);
  }, []);

  const resetForm = () => {
    setCheckedItems(pmRoutineItems.reduce((acc, task) => ({ ...acc, [task]: false }), {}));
    setEpiphanyCount('');
    setDespairCount('');
    setPmJournalEntry('');
    setPhysicalGoals({});
    setStudyData({ linkedinMinutes: '' });
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
      didSubmit.current = true;
      const routineDocRef = await addDoc(collection(db, "pmRoutineLogs"), baseFormData);
      if (currentUser?.uid) {
        writeActivityEntry(currentUser.uid, {
          type: 'routine_completion',
          source: 'dashboard',
          data: { which: 'pm', completion_pct: completionPercentage, items_completed: completedChecklistItems.length, items_total: pmRoutineItems.length, epiphany_count: baseFormData.epiphanyCount, despair_count: baseFormData.despairCount },
        }).catch(() => {});
      }

      if (journalText) {
        const journalData = {
          entryText: journalText,
          createdAt: serverTimestamp(),
          dateString: dateString,
          dayOfWeek: now.getDay(),
          timeOfDay: 'PM',
        };
        await addDoc(collection(db, "journalEntries"), journalData);
        if (currentUser?.uid) {
          saveCorpusEntry(currentUser.uid, {
            type: 'journal',
            axis: ['mental', 'rest_prep'],
            themes: ['pm_routine'],
            voice_markers: [],
            state: 'settled',
            significance: 2,
            summary: journalText.slice(0, 150),
            raw: journalText,
          }).catch(() => {});
        }
      }

      if (Object.keys(physicalGoals).length > 0 && Object.values(physicalGoals).some(v => v)) {
        const docId = dateString;
        const physicalLogRef = doc(db, "physicalGoalsLogs", docId);
        const goalsData = {
            steps: Number(physicalGoals.steps) || 0,
            waterCount: physicalGoals.waterCount || 0,
            meals: physicalGoals.meals || { Breakfast: false, Lunch: false, Dinner: false, Snacks: false },
            wentToGym: physicalGoals.wentToGym || false,
            pmMetricsCompletedAt: serverTimestamp()
        };
        await setDoc(physicalLogRef, goalsData, { merge: true });
        console.log("Physical Goals Log *updated* for:", docId);

        // Auto-feed steps into active endurance distance goals
        const stepCount = Number(physicalGoals.steps) || 0;
        if (stepCount > 0 && currentUser?.uid) {
          try {
            await updateActiveDistanceGoals(currentUser.uid, docId, stepCount);
            console.log("Endurance goals updated with", stepCount, "steps");
          } catch (err) {
            console.error("Error updating endurance goals:", err);
          }
        }
      }

      // Fresh read from localStorage at submit time — avoids relying on the 5s poll state
      const freshStudySeconds = Number(localStorage.getItem(`studyModalTime_${dateString}`) || 0);
      const freshFlashcardSeconds = Number(localStorage.getItem(`flashcardsModalTime_${dateString}`) || 0);
      const freshStudyMinutes = Math.floor(freshStudySeconds / 60);
      const freshFlashcardMinutes = Math.floor(freshFlashcardSeconds / 60);
      const linkedinMins = Number(studyData.linkedinMinutes || 0);

      const hasStudyData = freshStudyMinutes > 0 || freshFlashcardMinutes > 0 || linkedinMins > 0;
      if (hasStudyData) {
          const dailyLogData = {
              studyModalMinutes: freshStudyMinutes,
              flashcardsModalMinutes: freshFlashcardMinutes,
              linkedinMinutes: linkedinMins,
              totalMinutes: freshStudyMinutes + freshFlashcardMinutes + linkedinMins,
              lastUpdatedAt: serverTimestamp(),
          };
          const dailyLogDocRef = doc(db, "dailyStudyLogs", dateString);
          await setDoc(dailyLogDocRef, dailyLogData, { merge: true });
          console.log("Daily Study Log saved/updated for:", dateString);
      }

      if (typeof window !== 'undefined') {
          localStorage.removeItem('pmRoutineCheckedItems');
          localStorage.removeItem('pmRoutineEpiphanyCount');
          localStorage.removeItem('pmRoutineDespairCount');
          localStorage.removeItem('pmRoutineJournalEntry');
          localStorage.removeItem('physicalGoalsData');
          localStorage.removeItem('pmStudyData');
      }

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

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h3 className={styles.formTitle}>PM Orientation & Daily Input</h3>

      {pmSections.map((section) => (
        <div key={section.id} className={styles.section}>
          <h4 className={styles.sectionTitle}>{section.title}</h4>
          {section.subtitle && (
            <p className={styles.sectionSubtitle}>{section.subtitle}</p>
          )}
          {section.items.map((item) => (
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
      ))}

      {/* CHANGED: Button text updated */}
      <button 
        type="button" 
        className={styles.chartButton} 
        onClick={() => setIsChartModalOpen(true)}
        disabled={isSubmitting}
      >
        View Sprint Progress
      </button>

      <PhysicalGoalsTracker
        onDataChange={handlePhysicalGoalsChange}
        initialData={physicalGoals}
        disabled={isSubmitting}
      />
      
      <StudyTracker
        onDataChange={handleStudyDataChange}
        initialData={studyData}
        disabled={isSubmitting}
      />
      
      {submitError && <p className={styles.errorText}>Error: {submitError}</p>}

      <button
        type="button"
        className={styles.chartButton}
        onClick={() => setIsPhysicalDashboardOpen(true)}
        disabled={isSubmitting}
      >
        View Physical Progress
      </button>

      <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Complete PM Routine'}
      </button>

      {/* CHANGED: Modal now uses DynamicSprintDashboard */}
      <Modal
        isOpen={isChartModalOpen}
        onClose={() => setIsChartModalOpen(false)}
        closeOnClickOutside={true}
      >
        <DynamicSprintDashboard />
      </Modal>

      <Modal
        isOpen={isPhysicalDashboardOpen}
        onClose={() => setIsPhysicalDashboardOpen(false)}
      >
        <FitnessAchievementDashboard />
      </Modal>
    </form>
  );
}

export default PmRoutineForm;
