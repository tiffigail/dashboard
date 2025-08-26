import React, { useState, useEffect } from 'react';
import styles from './SixMonthCheckinModal.module.css';
import { db } from '../../firebaseConfig';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// Paste the questions array we created earlier here
const sixMonthCheckinQuestions = [
  { id: 'clarityAndResonance', category: 'Goal Assessment & Relevance', text: 'Looking back at the goal you set six months ago, does it still feel as important and relevant to you today? Why or why not?', placeholder: 'Is this goal still a top priority? Does it excite you, or does it feel like a chore now?' },
  { id: 'initialWhy', category: 'Goal Assessment & Relevance', text: 'Remind yourself of the original "why" behind this goal. Has your motivation or the reason for pursuing it changed?', placeholder: 'My original motivation was... Now, I am also driven by...' },
  { id: 'celebrateWins', category: 'Progress & Accomplishments', text: 'What are the top 3-5 accomplishments or moments of progress toward this goal that you are most proud of?', placeholder: 'List your biggest wins, no matter how small they seem...' },
  { id: 'unexpectedPositives', category: 'Progress & Accomplishments', text: 'What have been some unexpected benefits or positive outcomes you\'ve experienced while working towards this goal?', placeholder: 'e.g., Met new people, discovered a new hobby, became more confident in...' },
  { id: 'obstacles', category: 'Challenges & Learnings', text: 'What have been the biggest obstacles or challenges you\'ve faced? Were they internal or external?', placeholder: 'Be honest about what stood in your way. e.g., Procrastination, an unexpected event...' },
  { id: 'keyLessons', category: 'Challenges & Learnings', text: 'What is the most important lesson you\'ve learned about yourself or the process in the last six months?', placeholder: 'e.g., "I learned that I work best when..."' },
  { id: 'skillGaps', category: 'Challenges & Learnings', text: 'What new skills have you had to develop? Are there any skills you realize you still need to acquire?', placeholder: 'Skills developed: [e.g., Public speaking]. Skills I still need: [e.g., Data analysis].' },
  { id: 'courseCorrection', category: 'Future Planning & Adjustments', text: 'Based on your progress and learnings, does your original plan need to be adjusted?', placeholder: 'My original timeline was too ambitious. I will adjust it by...' },
  { id: 'focusAreas', category: 'Future Planning & Adjustments', text: 'Which specific actions or areas require more of your focus and energy for the next six months?', placeholder: 'For the next 6 months, I need to prioritize marketing, networking, etc.' },
  { id: 'supportSystem', category: 'Future Planning & Adjustments', text: 'What kind of support do you need for the next phase?', placeholder: 'I need to find an accountability partner, a mentor, specific resources, etc.' }
];

const axisColorMap = {
    "Physical": { light: '#FDC1B4', medium: '#f59284', dark: '#e7514c' },
    "Financial": { light: '#e9def4', medium: '#beaccf', dark: '#927aaa' },
    "Gear": { light: '#c9ebf4', medium: '#7ebde0', dark: '#3280a7' },
    "ON TRACK N+1": { light: '#BCDDDC', medium: '#618882', dark: '#053229' },
    "Environment": { light: '#efe5c3', medium: '#e3d295', dark: '#d8bf67' },
    "Misdirect": { light: '#b0e8d7', medium: '#78bfa1', dark: '#409c7c' },
    "Rest and preparation": { light: '#eaf1fa', medium: '#cbdbe7', dark: '#aec6de' },
    "default": { light: '#F1F5F9', medium: '#abb5c2', dark: '#64748B' }
};

function SixMonthCheckinModal({ isOpen, onClose, onOpenTimeline, allAxesData }) {
    const [selectedAxisId, setSelectedAxisId] = useState('');
    const [responses, setResponses] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const axesWithGoals = allAxesData.filter(axis => axis.yearlyGoal);

    useEffect(() => {
        // Pre-select the first axis with a goal when the modal opens
        if (isOpen && axesWithGoals.length > 0 && !selectedAxisId) {
            setSelectedAxisId(axesWithGoals[0].id);
        }
        // Reset form when modal closes
        if (!isOpen) {
            setResponses({});
            setError('');
            setSuccessMessage('');
            setSelectedAxisId('');
        }
    }, [isOpen, axesWithGoals, selectedAxisId]);

    const handleResponseChange = (questionId, value) => {
        setResponses(prev => ({ ...prev, [questionId]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const selectedAxis = allAxesData.find(axis => axis.id === selectedAxisId);
        if (!selectedAxis || !selectedAxis.yearlyGoal) {
            setError('This axis does not have a goal to check in on.');
            return;
        }

        setIsSubmitting(true);
        setError('');
        setSuccessMessage('');

        try {
            await addDoc(collection(db, "goalCheckins"), {
                goalId: selectedAxis.yearlyGoal.id,
                axisId: selectedAxis.id,
                axisName: selectedAxis.displayName,
                // Make sure you have a way to get the real userId
                userId: "user_placeholder_id", 
                responses: responses,
                createdAt: serverTimestamp(),
                checkinType: '6-month'
            });
            setSuccessMessage(`Check-in for "${selectedAxis.displayName}" submitted successfully!`);
            setResponses({});
            setTimeout(() => {
                onClose(); // Close modal after a delay
            }, 2000);
        } catch (err) {
            console.error("Error submitting check-in:", err);
            setError("Failed to submit. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const selectedAxisData = allAxesData.find(axis => axis.id === selectedAxisId);
    const axisColor = selectedAxisData ? (axisColorMap[selectedAxisData.displayName] || axisColorMap.default).dark : axisColorMap.default.dark;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <button onClick={onClose} className={styles.closeButton}>×</button>
                <h2>6-Month Goal Check-in</h2>

                <div className={styles.axisSelector}>
                    <label htmlFor="axis-select">Select an Axis to Review:</label>
                    <select 
                        id="axis-select"
                        value={selectedAxisId} 
                        onChange={(e) => setSelectedAxisId(e.target.value)}
                        className={styles.dropdown}
                    >
                        <option value="" disabled>--Choose an Axis--</option>
                        {axesWithGoals.map(axis => (
                            <option key={axis.id} value={axis.id}>{axis.displayName}</option>
                        ))}
                    </select>
                </div>

                {selectedAxisData && selectedAxisData.yearlyGoal ? (
                    <form onSubmit={handleSubmit}>
                        <div className={styles.goalHeader} style={{ borderLeftColor: axisColor }}>
                            <p><strong>Reviewing Goal:</strong> {selectedAxisData.yearlyGoal.title}</p>
                        </div>
                        
                        <div className={styles.questionsContainer}>
                            {sixMonthCheckinQuestions.map(q => (
                                <div key={q.id} className={styles.questionBlock}>
                                    <label htmlFor={q.id}>{q.text}</label>
                                    <textarea
                                        id={q.id}
                                        value={responses[q.id] || ''}
                                        onChange={(e) => handleResponseChange(q.id, e.target.value)}
                                        placeholder={q.placeholder}
                                        rows="4"
                                        required
                                    />
                                </div>
                            ))}
                        </div>

                        <div className={styles.modalActions}>
                            <button type="button" onClick={onOpenTimeline} className={styles.timelineButton}>
                                Open Timeline
                            </button>
                            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                                {isSubmitting ? 'Submitting...' : 'Submit Check-in'}
                            </button>
                        </div>
                        {error && <p className={styles.errorText}>{error}</p>}
                        {successMessage && <p className={styles.successText}>{successMessage}</p>}
                    </form>
                ) : (
                    <p className={styles.pleaseSelect}>Please select an axis from the dropdown to begin your check-in.</p>
                )}
            </div>
        </div>
    );
}

export default SixMonthCheckinModal;