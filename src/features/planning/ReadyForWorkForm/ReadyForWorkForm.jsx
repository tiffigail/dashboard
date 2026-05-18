// src/components/ReadyForWorkForm/ReadyForWorkForm.jsx
import React, { useState, useEffect, useRef } from 'react';
import styles from '@/features/planning/ReadyForWorkForm/ReadyForWorkForm.module.css'; // Ensure you have this CSS Module file
import StarRating from '@/components/ui/StarRating/StarRating'; // Import the reusable StarRating
import { db } from '@/firebaseConfig';
import {
    collection,
    writeBatch, // Add this
    doc, // Add this
    serverTimestamp,
    query,
    where,
    limit,
    getDocs
} from "firebase/firestore";

// Define checklist items
const checklistItems = [
    "Shower", "Dress", "AM Meds", "Brush Teeth", "Floss Teeth", "Deoderant",
    "Hair", "Makeup", "Scent", "Recitation", 
    "PKW", "Water", "Lunch", "Supps", "Snacks", "Leave your worth", "remember your point"
];
const getTodayString = () => {
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    const localDate = new Date(now - timezoneOffset);
    return localDate.toISOString().split('T')[0];
};
// Props: onSubmit, onClose
function ReadyForWorkForm({ onSubmit, onClose }) {
    const DRAFT_KEY = `readyForWorkDraft_${getTodayString()}`;

    const [draft] = useState(() => {
        try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) || {}; } catch { return {}; }
    });

    const [draftRestored] = useState(() =>
        !!(draft.checkedItems && Object.values(draft.checkedItems).some(Boolean)) ||
        !!(draft.weight || draft.bodyfat || draft.readinessRating)
    );

    // == State ==
    const [checkedItems, setCheckedItems] = useState(() => {
        const initial = checklistItems.reduce((acc, item) => ({ ...acc, [item]: false }), {});
        return draft.checkedItems ? { ...initial, ...draft.checkedItems } : initial;
    });
    const [weight, setWeight] = useState(draft.weight || '');
    const [bodyfat, setBodyfat] = useState(draft.bodyfat || '');
    const [readinessRating, setReadinessRating] = useState(draft.readinessRating || 0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const startTimeRef = useRef(Date.now());

    // State for Recitation
    const [workRecitation, setWorkRecitation] = useState("Loading recitation...");

    // Effect to fetch active 'work' recitation
    useEffect(() => {
        const fetchRecitation = async () => {
            setWorkRecitation("Loading recitation..."); // Reset on fetch
            try {
                const recitationsRef = collection(db, "recitations");
                // Query for the document where activeContext is "work" AND isArchived is false
                const q = query(
                    recitationsRef,
                    where("activeContext", "==", "work"), // Find where activeContext field equals "work"
                    where("isArchived", "==", false),    // And is not archived
                    limit(1)                             // Expect only one result
                );
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const docSnap = querySnapshot.docs[0];
                    setWorkRecitation(docSnap.data().text || "Recitation text missing.");
                } else {
                    setWorkRecitation("No active 'work' recitation set.");
                }
            } catch (error) {
                console.error("Error fetching 'work' recitation: ", error);
                setWorkRecitation("Error loading recitation.");
            }
        };

        fetchRecitation();
    }, []); // Run once on component mount

    // Auto-save draft on every change
    useEffect(() => {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ checkedItems, weight, bodyfat, readinessRating }));
    }, [DRAFT_KEY, checkedItems, weight, bodyfat, readinessRating]);

    // == Handlers ==
    const handleCheckboxChange = (event) => {
        const { name, checked } = event.target;
        setCheckedItems(prev => ({ ...prev, [name]: checked }));
    };

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        const validInput = value === '' || /^\d*\.?\d*$/.test(value);
        if (validInput) {
            if (name === 'weight') setWeight(value);
            else if (name === 'bodyfat') setBodyfat(value);
        }
    };

    const handleSubmit = async (event) => {
    event.preventDefault();
    if (readinessRating === 0) {
        setSubmitError("Please rate how ready you feel.");
        return;
    }
    setIsSubmitting(true);
    setSubmitError(null);

    // --- NEW: Use the helper to get the YYYY-MM-DD Document ID ---
    const docId = getTodayString(); // e.g., "2025-10-24"


    // --- Data Preparation ---
    const endTime = Date.now();
    const durationMinutes = Math.round((endTime - startTimeRef.current) / (1000 * 60));
    const timestamp = serverTimestamp(); 

    // 1. Prepare data for 'readyForWorkLogs'
    const completedChecklist = Object.entries(checkedItems)
        .filter(([key, value]) => value === true)
        .map(([key]) => key);

    const readyForWorkData = {
        type: 'readyForWorkLog',
        checklistCompleted: completedChecklist,
        readinessRating: readinessRating,
        durationMinutes: durationMinutes,
        completedAt: timestamp 
    };

    // 2. Prepare data for 'physicalGoalsLogs'
    const hasPhysicalData = weight.trim() || bodyfat.trim();
    const physicalGoalsData = {
        weight: weight.trim() ? parseFloat(weight) : null,
        bodyfat: bodyfat.trim() ? parseFloat(bodyfat) : null,
        amMetricsCompletedAt: timestamp
    };

    // --- Firestore Batch Write ---
    try {
        const batch = writeBatch(db);

        // Create a reference to the *specific* YYYY-MM-DD document
        const workLogRef = doc(db, "readyForWorkLogs", docId);
        batch.set(workLogRef, readyForWorkData);

        if (hasPhysicalData) {
            // Create a reference to the *specific* YYYY-MM-DD document
            const physicalLogRef = doc(db, "physicalGoalsLogs", docId);
            // Use set() WITH MERGE: TRUE
            // This creates the doc *or* merges if it somehow already exists
            batch.set(physicalLogRef, physicalGoalsData, { merge: true });
        }

        await batch.commit();
        localStorage.removeItem(DRAFT_KEY);

        if (onSubmit) onSubmit(readyForWorkData);
        if (onClose) onClose();

    } catch (e) {
        console.error("Error committing batch: ", e);
        setSubmitError("Failed to save log. Please try again.");
        setIsSubmitting(false);
    }
};
    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <h3 className={styles.formTitle}>Ready for Work</h3>
            {draftRestored && (
                <p style={{ fontSize: '0.78rem', color: '#8ecbac', margin: '0.2rem 0 0.5rem', opacity: 0.85 }}>
                    ↩ Resuming today's draft
                </p>
            )}

            {/* Checklist Section */}
            <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Checklist</h4>
                {/* Grid for checkboxes only */}
                <div className={styles.checkGrid}>
                    {checklistItems.map((item) => (
                        <div key={item} className={styles.checkItem}>
                             <input
                                type="checkbox"
                                id={`ready-${item.replace(/\s+/g, '-')}`}
                                name={item}
                                checked={!!checkedItems[item]}
                                onChange={handleCheckboxChange}
                                className={styles.checkbox}
                                disabled={isSubmitting}
                            />
                            <label htmlFor={`ready-${item.replace(/\s+/g, '-')}`}>{item}</label>
                        </div>
                    ))}
                </div> {/* End of checkGrid */}

                {/* Display Recitation Section (After Grid) */}
                {/* Conditionally render only if a valid recitation was loaded */}
                {(workRecitation && workRecitation !== "Loading recitation..." && workRecitation !== "No active 'work' recitation set." && workRecitation !== "Error loading recitation.") && (
                    <div className={styles.recitationDisplay}>
                         <p className={styles.recitationText}>{workRecitation}</p>
                         <p>Zoom In</p>
                    </div>
                )}
                {/* End Recitation Display */}

            </div> {/* End of Checklist Section */}


            {/* Metrics Section */}
            <div className={styles.section}>
                 <h4 className={styles.sectionTitle}>Metrics</h4>
                <div className={styles.metricsGrid}>
                    <div className={styles.inputField}>
                        <label htmlFor="weight">Weight:</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            id="weight"
                            name="weight"
                            value={weight}
                            onChange={handleInputChange}
                            placeholder="e.g., 150.5"
                            className={styles.numberInput}
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className={styles.inputField}>
                        <label htmlFor="bodyfat">Body Fat %:</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            id="bodyfat"
                            name="bodyfat"
                            value={bodyfat}
                            onChange={handleInputChange}
                            placeholder="e.g., 22.5"
                            className={styles.numberInput}
                            disabled={isSubmitting}
                        />
                    </div>
                </div>
            </div>

            {/* Rating Section */}
            <div className={styles.section}>
                 <h4 className={styles.sectionTitle}>How ready do you feel?</h4>
                <StarRating rating={readinessRating} setRating={setReadinessRating} disabled={isSubmitting} />
            </div>

            {/* Submission */}
            {submitError && <p className={styles.errorText}>Error: {submitError}</p>}
            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Complete Routine'}
            </button>
        </form>
    );
}

export default ReadyForWorkForm;