// src/components/StudyForm/StudyForm.jsx
import React, { useState, useEffect, useRef } from 'react';
import styles from './StudyForm.module.css';
import { db } from '../../firebaseConfig';
import { collection, doc, addDoc, setDoc, updateDoc, arrayUnion, serverTimestamp, Timestamp } from "firebase/firestore"; // Import Timestamp

// Define the checklist items for the Family Clean routine
// (Assuming these might be used elsewhere, keeping them for context, though not used in this specific form)
const familyCleanItems = [
    "Dishes", "Laundry", "Floors", "Tidy Surface", "Bathrooms",
    "Trash", "Recycling", "Surfaces", "Dusting",
];
const rotatingChores = [
    "Clean Mirrors", "Vacuum", "Mop", "Clean Fridge", "Clean Oven", "Clean Windows",
];
const people = ["Abi", "Izi", "Tiffany"];

// Props: onSubmit, onClose, axisQuestion (passed from DailyView)
function StudyForm({ onSubmit, onClose, axisQuestion }) {
    // == State ==
    const [topic, setTopic] = useState('');
    const [axisAnswer, setAxisAnswer] = useState('');
    const [insightTitle, setInsightTitle] = useState('');
    const [insightAnswer, setInsightAnswer] = useState('');
    const [isAddingInsight, setIsAddingInsight] = useState(false);
    const [addInsightError, setAddInsightError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const startTimeRef = useRef(Date.now()); // Record when the modal opens

    // == Handlers ==
    const handleInputChange = (event) => {
        const { name, value } = event.target;
        if (name === 'topic') setTopic(value);
        else if (name === 'axisAnswer') setAxisAnswer(value);
        else if (name === 'insightTitle') setInsightTitle(value);
        else if (name === 'insightAnswer') setInsightAnswer(value);
    };

    // Handler for adding an insight/flashcard
    const handleAddInsight = async () => {
        if (!insightTitle.trim() || !insightAnswer.trim()) {
            setAddInsightError("Please enter both an insight title and answer.");
            return;
        }
        if (!topic.trim()) {
            setAddInsightError("Please enter a main topic first.");
            return;
        }

        setIsAddingInsight(true);
        setAddInsightError(null);

        const flashcardData = {
            topic: topic.trim(),
            title: insightTitle.trim(),
            answer: insightAnswer.trim(),
            // UPDATED: Use client-side Timestamp.now() instead of serverTimestamp()
            addedAt: Timestamp.now()
        };

        // Reference the single 'flashcards' document within the 'study' collection
        const flashcardsDocRef = doc(db, "study", "flashcards");

        try {
            // Use setDoc with merge:true to create/update the document
            // and arrayUnion to add the new insight to the 'insights' array
            await setDoc(flashcardsDocRef, {
                insights: arrayUnion(flashcardData) // Add the object to the array
            }, { merge: true }); // merge:true creates the doc/array if it doesn't exist

            console.log("Insight added to flashcards:", flashcardData);
            // Clear the insight fields
            setInsightTitle('');
            setInsightAnswer('');
        } catch (e) {
            console.error("Error adding insight: ", e);
            setAddInsightError("Failed to save insight. Please try again.");
        } finally {
            setIsAddingInsight(false);
        }
    };

    // Handler for completing the entire study session
    const handleCompleteStudy = async (event) => {
        event.preventDefault(); // Prevent default form submission
        setIsSubmitting(true);
        setSubmitError(null);

        // Calculate duration
        const endTime = Date.now();
        const durationMinutes = Math.round((endTime - startTimeRef.current) / (1000 * 60));

        const studyLogData = {
            type: 'studySession',
            topic: topic.trim(),
            axisQuestion: axisQuestion || "N/A", // Include the axis question
            axisAnswer: axisAnswer.trim(),
            durationMinutes: durationMinutes,
            completedAt: serverTimestamp() // Use server timestamp for the main log document
        };

        console.log("Attempting to save Study Session Log:", studyLogData);

        try {
            // Save to a new dated document in the 'study' collection
            const dateString = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format for doc ID
            const docId = `${dateString}-${Date.now()}`; // Add timestamp for uniqueness
            const studyLogDocRef = doc(db, "study", docId);
            await setDoc(studyLogDocRef, studyLogData); // Use setDoc for custom ID

            console.log("Study Session Log Document written with ID: ", studyLogDocRef.id);

            if (onSubmit) {
                onSubmit(studyLogData); // Pass data back if needed
            }
            if (onClose) {
                onClose(); // Close the modal
            }
        } catch (e) {
            console.error("Error adding study log document: ", e);
            setSubmitError("Failed to save study session. Please try again.");
            setIsSubmitting(false); // Only keep modal open on error
        }
        // Don't set isSubmitting false here if successful, as modal closes
    };

    return (
        <form onSubmit={handleCompleteStudy} className={styles.form}>
            <h3 className={styles.formTitle}>Study Session</h3>

            {/* Main Topic Section */}
            <div className={styles.section}>
                <div className={styles.inputField}>
                    <label htmlFor="studyTopic">Topic:</label>
                    <input
                        type="text"
                        id="studyTopic"
                        name="topic"
                        value={topic}
                        onChange={handleInputChange}
                        placeholder="Enter the main study topic"
                        className={styles.textInput}
                        required // Make topic required for the session
                        disabled={isSubmitting}
                    />
                </div>
            </div>

            {/* Axis Question Section */}
            <div className={styles.section}>
                 <h4 className={styles.sectionTitle}>Axis Focus</h4>
                 <p className={styles.axisQuestion}>{axisQuestion || "No axis question loaded."}</p>
                 <div className={styles.inputField}>
                    <label htmlFor="axisAnswer">Your Thoughts/Answer:</label>
                    <textarea
                        id="axisAnswer"
                        name="axisAnswer"
                        rows="4"
                        value={axisAnswer}
                        onChange={handleInputChange}
                        placeholder="How does the topic relate to today's axis?"
                        className={styles.textArea}
                        disabled={isSubmitting}
                    />
                 </div>
            </div>

            {/* Insights/Flashcards Section */}
            <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Insights & Flashcards</h4>
                 <div className={styles.inputField}>
                    <label htmlFor="insightTitle">Insight/Question Title:</label>
                    <input
                        type="text"
                        id="insightTitle"
                        name="insightTitle"
                        value={insightTitle}
                        onChange={handleInputChange}
                        placeholder="e.g., Key Term, Concept, Question"
                        className={styles.textInput}
                        disabled={isSubmitting || isAddingInsight}
                    />
                 </div>
                 <div className={styles.inputField}>
                    <label htmlFor="insightAnswer">Details/Answer:</label>
                    <textarea
                        id="insightAnswer"
                        name="insightAnswer"
                        rows="3"
                        value={insightAnswer}
                        onChange={handleInputChange}
                        placeholder="Elaborate here..."
                        className={styles.textArea}
                        disabled={isSubmitting || isAddingInsight}
                    />
                 </div>
                 {addInsightError && <p className={styles.errorTextInline}>{addInsightError}</p>}
                 <button
                    type="button" // Important: type="button" prevents form submission
                    onClick={handleAddInsight}
                    className={styles.addInsightButton}
                    disabled={isSubmitting || isAddingInsight || !insightTitle.trim() || !insightAnswer.trim()}
                 >
                    {isAddingInsight ? 'Adding...' : 'Add Insight'}
                 </button>
            </div>


            {/* Final Submission */}
            {submitError && <p className={styles.errorText}>Error: {submitError}</p>}
            <button type="submit" className={styles.submitButton} disabled={isSubmitting || isAddingInsight}>
                {isSubmitting ? 'Saving...' : 'Complete Study Session'}
            </button>
        </form>
    );
}

export default StudyForm;
