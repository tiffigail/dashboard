// src/components/BreakReviewForm/BreakReviewForm.jsx
import React, { useState } from 'react';
import styles from './BreakReviewForm.module.css';
import StarRating from '../StarRating/StarRating'; // Assuming this component exists
import { db } from '../../firebaseConfig';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// Define awareness levels for selection (outside component)
const awarenessOptions = [
    { value: "N-1", label: "N-1 (Hyperfocus / Zoomed In)" },
    { value: "N", label: "N (Normal / Relaxed Focus)" },
    { value: "N+1", label: "N+1 (Expansive / Zoomed Out)" }
];

// Modified breakIdeas for Awareness Levels (outside component)
const breakOptionsList = [
    { id: 'stretch', text: "Stretch for 5 minutes", awarenessLevel: "N" },
    { id: 'walk', text: "Walk around the block", awarenessLevel: "N" },
    { id: 'water', text: "Get some water", awarenessLevel: "N" },
    { id: 'song', text: "Listen to one song", awarenessLevel: "N+1" },
    { id: 'doodle', text: "Doodle for 5 minutes", awarenessLevel: "N" },
    { id: 'freshAir', text: "Step outside for fresh air", awarenessLevel: "N+1" },
    { id: 'tidy', text: "Quick tidy-up (1 area)", awarenessLevel: "N" },
    { id: 'meditate', text: "Meditate with Headspace", awarenessLevel: "N" },
    { id: 'curiousGoogle', text: "Google something you're curious about", awarenessLevel: "N+1" },
    { id: 'vite', text: "Work on vite react (break task)", awarenessLevel: "N-1" },
    { id: 'tap', text: "Tap", awarenessLevel: "N" },
    { id: 'callTiff', text: "Call Tiff", awarenessLevel: "N+1" },
    { id: 'messageFriend', text: "Message a friend", awarenessLevel: "N+1" },
    { id: 'audiobook', text: "Audiobook", awarenessLevel: "N+1" }
];

function BreakReviewForm({ onSubmit, onClose, pomodoroDuration, timerFinishedTimestamp }) {
    // == Existing State ==
    const [currentBreakIndex, setCurrentBreakIndex] = useState(0);
    const [rating, setRating] = useState(0); // For breakEffectivenessRating
    const [tasksCompleted, setTasksCompleted] = useState(''); // For workPeriodTasksCompleted
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    // == New State Variables from the plan ==
    // Section 1: Review of Previous Work Period
    const [workPeriodNature, setWorkPeriodNature] = useState('');
    const [workPeriodEnergy, setWorkPeriodEnergy] = useState(0);
    const [workPeriodFrustration, setWorkPeriodFrustration] = useState(0);
    const [workPeriodEfficacy, setWorkPeriodEfficacy] = useState(0);

    // Section 2: Break Taken
    const [breakDurationMinutes, setBreakDurationMinutes] = useState('');

    // Section 3: Reorient for Next Work Period
    const [plannedNextWorkNature, setPlannedNextWorkNature] = useState(''); // Nature is still planned
    const [postBreakEnergy, setPostBreakEnergy] = useState(0); // CHANGED from plannedNextWorkEnergy
    const [postBreakFrustration, setPostBreakFrustration] = useState(0); // CHANGED from plannedNextWorkFrustration
    const [postBreakEfficacy, setPostBreakEfficacy] = useState(0); // CHANGED from plannedNextWorkEfficacy

    // Derived state for selected break
    const selectedBreakObject = breakOptionsList[currentBreakIndex];

    // == Handlers ==
    const handleInputChange = (event) => {
        const { name, value } = event.target;
        if (name === 'tasksCompleted') {
            if (value === '' || /^[0-9\b]+$/.test(value)) {
                setTasksCompleted(value);
            }
        }
    };

    const handlePreviousBreak = () => {
        setCurrentBreakIndex(prevIndex =>
            prevIndex > 0 ? prevIndex - 1 : breakOptionsList.length - 1
        );
    };

    const handleNextBreak = () => {
        setCurrentBreakIndex(prevIndex =>
            prevIndex < breakOptionsList.length - 1 ? prevIndex + 1 : 0
        );
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        // --- Validation ---
        if (tasksCompleted.trim() === '') {
            setSubmitError("Please enter the number of tasks completed (0 if none).");
            return;
        }
        if (workPeriodNature === '') {
            setSubmitError("Please select the nature of your previous work period.");
            return;
        }
        // Add specific validation for workPeriodEnergy, Frustration, Efficacy if 0 is not allowed

        if (breakDurationMinutes === '' || parseInt(breakDurationMinutes) <= 0) {
            setSubmitError("Please enter a valid break duration.");
            return;
        }
        if (rating === 0) { 
            setSubmitError("Please provide a rating for the break's effectiveness.");
            return;
        }
        if (plannedNextWorkNature === '') {
            setSubmitError("Please select the nature of your planned next work period.");
            return;
        }
        // Add specific validation for postBreakEnergy, Frustration, Efficacy if 0 is not allowed


        setIsSubmitting(true);
        setSubmitError(null);

        const breakLogData = {
            // Section 1: Review of Previous Work Period
            workPeriodDurationMinutes: pomodoroDuration,
            workPeriodTasksCompleted: Number(tasksCompleted),
            workPeriodNature: workPeriodNature,
            workPeriodEnergy: workPeriodEnergy,
            workPeriodFrustration: workPeriodFrustration,
            workPeriodEfficacy: workPeriodEfficacy,

            // Section 2: Break Taken
            breakDurationMinutes: Number(breakDurationMinutes),
            breakActivityText: selectedBreakObject?.text,
            breakActivityAwarenessLevel: selectedBreakObject?.awarenessLevel,
            breakEffectivenessRating: rating,

            // Section 3: Reorient for Next Work Period
            plannedNextWorkNature: plannedNextWorkNature, // This remains "planned"
            postBreakEnergy: postBreakEnergy, // CHANGED key
            postBreakFrustration: postBreakFrustration, // CHANGED key
            postBreakEfficacy: postBreakEfficacy, // CHANGED key

            // Timestamps & Context
            pomodoroTimerFinishedAt: timerFinishedTimestamp,
            logSubmittedAt: serverTimestamp()
        };

        console.log("Attempting to save New Cycle Log Data:", breakLogData);

        try {
            const cycleLogCollectionRef = collection(db, "pomodoroCycleLogs");
            await addDoc(cycleLogCollectionRef, breakLogData);
            console.log("Cycle log saved successfully.");

            if (onSubmit) {
                onSubmit(breakLogData);
            }
            if (onClose) {
                onClose();
            }
        } catch (e) {
            console.error("Error adding cycle log: ", e);
            setSubmitError("Failed to save cycle review. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <h3 className={styles.formTitle}>Pomodoro Cycle Review</h3>

            {/* --- Section 1: Review of Previous Work Period --- */}
            <div className={styles.formSection}>
                <h4 className={styles.sectionTitle}>Review Previous Work Period</h4>
                
                <p>Last Pomodoro Duration: {pomodoroDuration} minutes</p>

                <div className={styles.inputField}>
                    <label htmlFor="tasksCompleted">Tasks completed:</label>
                    <input
                        type="number" id="tasksCompleted" name="tasksCompleted"
                        value={tasksCompleted} onChange={handleInputChange}
                        placeholder="0" min="0" className={styles.numberInput}
                        disabled={isSubmitting}
                    />
                </div>

                <div className={styles.inputField}>
                    <label>Nature of Previous Work:</label>
                    <div className={styles.radioGroup}>
                        {awarenessOptions.map(opt => (
                            <label key={opt.value} className={styles.radioLabel}>
                                <input type="radio" name="workPeriodNature" value={opt.value}
                                    checked={workPeriodNature === opt.value}
                                    onChange={(e) => setWorkPeriodNature(e.target.value)}
                                    disabled={isSubmitting} />
                                {opt.label}
                            </label>
                        ))}
                    </div>
                </div>

                <div className={styles.inputField}>
                    <label>Energy Level (after work):</label>
                    <StarRating rating={workPeriodEnergy} setRating={setWorkPeriodEnergy} disabled={isSubmitting} />
                </div>
                <div className={styles.inputField}>
                    <label>Frustration Level (after work):</label>
                    <StarRating rating={workPeriodFrustration} setRating={setWorkPeriodFrustration} disabled={isSubmitting} />
                </div>
                <div className={styles.inputField}>
                    <label>Efficacy Level (during work):</label>
                    <StarRating rating={workPeriodEfficacy} setRating={setWorkPeriodEfficacy} disabled={isSubmitting} />
                </div>
            </div>

            {/* --- Section 2: Break Taken --- */}
            <div className={styles.formSection}>
                <h4 className={styles.sectionTitle}>Break Taken</h4>

                <div className={styles.inputField}>
                    <label htmlFor="breakDuration">Break Duration (minutes):</label>
                    <input
                        type="number" id="breakDuration" name="breakDuration"
                        value={breakDurationMinutes}
                        onChange={(e) => setBreakDurationMinutes(e.target.value === '' ? '' : String(Math.max(0, parseInt(e.target.value))))}
                        placeholder="e.g., 15" min="0" className={styles.numberInput}
                        disabled={isSubmitting}
                    />
                </div>
                
                <div className={styles.inputField}>
                    <label>Break Activity (Awareness: {selectedBreakObject?.awarenessLevel || 'N/A'}):</label>
                    <div className={styles.breakSelector}>
                        <button type="button" onClick={handlePreviousBreak} className={styles.cycleButton} aria-label="Previous break idea" disabled={isSubmitting}>&larr;</button>
                        <p className={styles.breakIdeaText}>{selectedBreakObject?.text || "Select a break"}</p>
                        <button type="button" onClick={handleNextBreak} className={styles.cycleButton} aria-label="Next break idea" disabled={isSubmitting}>&rarr;</button>
                    </div>
                </div>

                <div className={styles.inputField}>
                  <label>How effective was this break?</label>
                  <StarRating rating={rating} setRating={setRating} disabled={isSubmitting} />
                </div>
            </div>

            {/* --- Section 3: Reorient for Next Work Period --- */}
            <div className={styles.formSection}>
                <h4 className={styles.sectionTitle}>Reorient for Next Work Period</h4>

                <div className={styles.inputField}>
                    <label>Nature of Next Tasks (Planned):</label>
                    <div className={styles.radioGroup}>
                        {awarenessOptions.map(opt => (
                            <label key={opt.value} className={styles.radioLabel}>
                                <input type="radio" name="plannedNextWorkNature" value={opt.value}
                                    checked={plannedNextWorkNature === opt.value}
                                    onChange={(e) => setPlannedNextWorkNature(e.target.value)}
                                    disabled={isSubmitting} />
                                {opt.label}
                            </label>
                        ))}
                    </div>
                </div>
                <div className={styles.inputField}>
                    <label>Energy Level (after break):</label> {/* CHANGED LABEL */}
                    <StarRating rating={postBreakEnergy} setRating={setPostBreakEnergy} disabled={isSubmitting} /> {/* CHANGED STATE */}
                </div>
                <div className={styles.inputField}>
                    <label>Frustration Level (after break):</label> {/* CHANGED LABEL */}
                    <StarRating rating={postBreakFrustration} setRating={setPostBreakFrustration} disabled={isSubmitting} /> {/* CHANGED STATE */}
                </div>
                <div className={styles.inputField}>
                    <label>Anticipated Efficacy (for next period):</label> {/* CHANGED LABEL */}
                    <StarRating rating={postBreakEfficacy} setRating={setPostBreakEfficacy} disabled={isSubmitting} /> {/* CHANGED STATE */}
                </div>
            </div>

            {submitError && <p className={styles.errorText}>Error: {submitError}</p>}
            <button 
                type="submit" 
                className={styles.submitButton} 
                disabled={isSubmitting}
            >
                {isSubmitting ? 'Saving...' : 'Submit Cycle Review'}
            </button>
        </form>
    );
}

export default BreakReviewForm;