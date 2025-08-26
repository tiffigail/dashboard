// src/components/StudyTracker/StudyTracker.jsx
import React, { useState, useEffect } from 'react';
import styles from './StudyTracker.module.css';

const getTodayString = () => {
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    const localDate = new Date(now - timezoneOffset);
    return localDate.toISOString().split('T')[0];
};

// Props: onDataChange, initialData, disabled
function StudyTracker({ onDataChange, initialData, disabled }) {
    const [studyMinutes, setStudyMinutes] = useState(0);
    const [flashcardMinutes, setFlashcardMinutes] = useState(0);
    const [linkedinMinutes, setLinkedinMinutes] = useState(initialData?.linkedinMinutes || '');

    // Effect to read tracked time from localStorage and refresh it periodically
    useEffect(() => {
        const today = getTodayString();
        const studyKey = `studyModalTime_${today}`;
        const flashcardsKey = `flashcardsModalTime_${today}`;

        const loadTimes = () => {
            const studySeconds = Number(localStorage.getItem(studyKey) || 0);
            const flashcardSeconds = Number(localStorage.getItem(flashcardsKey) || 0);
            const newStudyMinutes = Math.floor(studySeconds / 60);
            const newFlashcardMinutes = Math.floor(flashcardSeconds / 60);

            setStudyMinutes(newStudyMinutes);
            setFlashcardMinutes(newFlashcardMinutes);

            // Also pass the latest automatic times up to the parent with the manual time
            onDataChange({
                linkedinMinutes,
                studyMinutes: newStudyMinutes,
                flashcardMinutes: newFlashcardMinutes,
            });
        };

        loadTimes(); // Load immediately on mount
        const refreshInterval = setInterval(loadTimes, 5000); // Refresh every 5s

        return () => clearInterval(refreshInterval);
    }, [onDataChange, linkedinMinutes]); // Rerun if manual minutes change to update parent

    const handleManualInputChange = (e) => {
        const newLinkedinMinutes = e.target.value;
        setLinkedinMinutes(newLinkedinMinutes);
        // Pass all data up to the parent immediately on change
        onDataChange({
            linkedinMinutes: newLinkedinMinutes,
            studyMinutes,
            flashcardMinutes,
        });
    };

    return (
        <div className={styles.container}>
            <h4 className={styles.sectionTitle}>Daily Study Tracker 📚</h4>
            
            <div className={styles.displayGroup}>
                <div className={styles.displayItem}>
                    <span>Study Modal Time:</span>
                    <span className={styles.value}>{studyMinutes} min</span>
                </div>
                <div className={styles.displayItem}>
                    <span>Flashcards Time:</span>
                    <span className={styles.value}>{flashcardMinutes} min</span>
                </div>
            </div>

            <div className={styles.inputGroup}>
                <label htmlFor="linkedin-minutes">LinkedIn Learning Minutes:</label>
                <input
                    type="number"
                    id="linkedin-minutes"
                    value={linkedinMinutes}
                    onChange={handleManualInputChange}
                    placeholder="e.g., 30"
                    className={styles.inputField}
                    disabled={disabled}
                />
            </div>
        </div>
    );
}

export default StudyTracker;