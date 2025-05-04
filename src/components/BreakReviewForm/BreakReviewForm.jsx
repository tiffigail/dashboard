// src/components/BreakReviewForm/BreakReviewForm.jsx
import React, { useState, useEffect, useRef } from 'react';
import styles from './BreakReviewForm.module.css';
import StarRating from '../StarRating/StarRating'; // Import the reusable StarRating
import { db } from '../../firebaseConfig';
import { collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";

// <<< Define break ideas list INSIDE the component >>>
const breakIdeas = [
    "Stretch for 5 minutes",
    "Walk around the block",
    "Get some water",
    "Listen to one song",
    "Doodle for 5 minutes",
    "Step outside for fresh air",
    "Quick tidy-up (1 area)",
    "Meditate with Headspace",
    "Google something you're curious about",
    "work on vite react",
    "Tap",
    "Call Tiff",
    "Message a friend",
    "Audiobook"
    // Add more ideas here
];

// Props: onSubmit, onClose, pomodoroDuration, timerFinishedTimestamp
// REMOVED: breakIdea prop
function BreakReviewForm({ onSubmit, onClose, pomodoroDuration, timerFinishedTimestamp }) {
    // == State ==
    const [currentBreakIndex, setCurrentBreakIndex] = useState(0); // Index for cycling
    const [rating, setRating] = useState(0);
    const [tasksCompleted, setTasksCompleted] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    // Get the currently selected break idea based on the index
    const selectedBreak = breakIdeas[currentBreakIndex];

    // == Handlers ==
    const handleInputChange = (event) => {
        const { name, value } = event.target;
        if (name === 'tasksCompleted') {
            if (value === '' || /^[0-9\b]+$/.test(value)) {
                setTasksCompleted(value);
            }
        }
    };

    // <<< Handlers for cycling through break ideas >>>
    const handlePreviousBreak = () => {
        setCurrentBreakIndex(prevIndex =>
            prevIndex > 0 ? prevIndex - 1 : breakIdeas.length - 1 // Wrap around to the end
        );
    };
    const handleNextBreak = () => {
         setCurrentBreakIndex(prevIndex =>
            prevIndex < breakIdeas.length - 1 ? prevIndex + 1 : 0 // Wrap around to the beginning
        );
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (rating === 0) {
            setSubmitError("Please provide a rating for the break.");
            return;
        }
         if (tasksCompleted.trim() === '') {
            setSubmitError("Please enter the number of tasks completed (0 if none).");
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        const breakLogData = {
            breakIdea: selectedBreak, // <<< Use the selected break from state
            rating: rating,
            tasksCompleted: Number(tasksCompleted),
            pomodoroDurationMinutes: pomodoroDuration,
            timerFinishedAt: timerFinishedTimestamp,
            submittedAt: serverTimestamp()
        };

        console.log("Attempting to save Break Log Data:", breakLogData);

        try {
            const breakLogCollectionRef = collection(db, "breakLogs");
            await addDoc(breakLogCollectionRef, breakLogData);
            console.log("Break log saved successfully.");

            if (onSubmit) {
                onSubmit(breakLogData);
            }
            if (onClose) {
                onClose();
            }
        } catch (e) {
            console.error("Error adding break log: ", e);
            setSubmitError("Failed to save break review. Please try again.");
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <h3 className={styles.formTitle}>Break Review</h3>

            {/* UPDATED: Display Selected Break Idea with Cycling Buttons */}
            <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Break Taken:</h4>
                <div className={styles.breakSelector}>
                    <button type="button" onClick={handlePreviousBreak} className={styles.cycleButton} disabled={isSubmitting}>&larr;</button>
                    <p className={styles.breakIdeaText}>{selectedBreak || "Select a break"}</p>
                    <button type="button" onClick={handleNextBreak} className={styles.cycleButton} disabled={isSubmitting}>&rarr;</button>
                </div>
            </div>

            {/* Rating Section */}
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>How effective was this break?</h4>
              <StarRating rating={rating} setRating={setRating} disabled={isSubmitting} />
            </div>

             {/* Tasks Completed Section */}
            <div className={styles.section}>
                 <h4 className={styles.sectionTitle}>Productivity</h4>
                 <div className={styles.inputField}>
                    <label htmlFor="tasksCompleted">Tasks completed during last Pomodoro:</label>
                    <input
                        type="number"
                        id="tasksCompleted"
                        name="tasksCompleted"
                        value={tasksCompleted}
                        onChange={handleInputChange}
                        placeholder="0"
                        min="0"
                        className={styles.numberInput}
                        disabled={isSubmitting}
                    />
                 </div>
            </div>

            {/* Submission */}
            {submitError && <p className={styles.errorText}>Error: {submitError}</p>}
            <button type="submit" className={styles.submitButton} disabled={isSubmitting || rating === 0 || tasksCompleted.trim() === ''}>
                {isSubmitting ? 'Saving...' : 'Submit Break Review'}
            </button>
        </form>
    );
}

export default BreakReviewForm;
