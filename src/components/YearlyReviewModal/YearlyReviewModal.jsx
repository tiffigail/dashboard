import React, { useState, useEffect, useCallback } from 'react';
import styles from './YearlyReviewModal.module.css'; // You can reuse the same CSS
import { db } from '../../firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

// ✅ 1. Questions are now a constant in this file
const yearlyReviewQuestions = [
    // --- Reflection & Assessment ---
    { id: 'yearlyHighlights', text: 'What were your top 3-5 highlights or biggest wins of the year?', placeholder: 'Think about moments of growth, joy, or success...' },
    { id: 'yearlyChallenges', text: 'What were the biggest challenges or roadblocks you faced? How did you overcome them?', placeholder: 'Be honest about what stood in your way and what you learned...' },
    { id: 'goalAlignment', text: 'On a scale of 1-10, how aligned did your daily actions feel with your long-term stretch goals? Why?', placeholder: 'Did you feel like you were working on the right things? Explain why...' },
    
    // --- Value & Intention Check ---
    { id: 'valueCheck', text: 'Did this year’s progress align with your core values?', placeholder: 'Did you act with integrity? Are you happy with the person you were this year?' },
    { id: 'recommitment', text: 'What are you ready to let go of to make room for what’s next?', placeholder: 'Old habits, outdated beliefs, projects that no longer serve you...' },
    
    // --- Future Planning ---
    { id: 'nextYearGoals', text: 'Based on this review, what are your 3 most important goals for the next year?', placeholder: 'Be specific, measurable, and inspiring.' },
    { id: 'oneThingFocus', text: 'What is the "one thing" you will focus on to make the most impact?', placeholder: 'This should be the single goal that will unlock everything else.' },
    { id: 'newResources', text: 'What new resources or support will you need to achieve these goals?', placeholder: 'Books, courses, mentors, or a new routine.' }
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

function YearlyReviewModal({ isOpen, onClose, onOpenTimeline, allAxesData }) {
    const [selectedAxisId, setSelectedAxisId] = useState('');
    const [responses, setResponses] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [statusMessage, setStatusMessage] = useState(''); // For drafts and success

    const axesWithGoals = allAxesData.filter(axis => axis.yearlyGoal);
    const currentYear = new Date().getFullYear();

    // ✅ 2. useEffect now fetches drafts when the modal opens or the axis changes
    useEffect(() => {
        const fetchDraft = async () => {
            if (!isOpen || !selectedAxisId) return;
            
            const selectedAxis = allAxesData.find(axis => axis.id === selectedAxisId);
            if (!selectedAxis || !selectedAxis.yearlyGoal) return;

            // Use a predictable ID for drafts: type_goalId_year
            const draftId = `yearly_draft_${selectedAxis.yearlyGoal.id}`;
            const docRef = doc(db, "goalCheckins", draftId);
            
            setStatusMessage('Checking for saved draft...');
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                setResponses(docSnap.data().responses || {});
                setStatusMessage('Draft loaded successfully!');
            } else {
                setResponses({}); // Clear responses for new draft
                setStatusMessage('');
            }
        };

        fetchDraft();
    }, [isOpen, selectedAxisId, allAxesData]);
    
    // Pre-select the first axis when the modal opens
    useEffect(() => {
        if (isOpen && axesWithGoals.length > 0 && !selectedAxisId) {
            setSelectedAxisId(axesWithGoals[0].id);
        }
        if (!isOpen) {
            setResponses({});
            setError('');
            setStatusMessage('');
            setSelectedAxisId('');
        }
    }, [isOpen]);

    const handleResponseChange = (questionId, value) => {
        setResponses(prev => ({ ...prev, [questionId]: value }));
    };

    // ✅ 3. New function to save draft without closing the modal
    const handleSaveDraft = async () => {
        const selectedAxis = allAxesData.find(axis => axis.id === selectedAxisId);
        if (!selectedAxis || !selectedAxis.yearlyGoal) {
            setError('Cannot save draft without a selected goal.');
            return;
        }

        setError('');
        setStatusMessage('Saving draft...');
        const draftId = `yearly_draft_${selectedAxis.yearlyGoal.id}`;
        const formattedResponses = yearlyReviewQuestions.map(q => ({
            id: q.id,
            question: q.text,
            answer: responses[q.id] || ''
        }));

        try {
            // Use setDoc to overwrite the existing draft with the latest version
            await setDoc(doc(db, "goalCheckins", draftId), {
                goalId: selectedAxis.yearlyGoal.id,
                axisId: selectedAxis.id,
                axisName: selectedAxis.displayName,
                userId: "user_placeholder_id",
                responses: responses, // Save the simple {id: answer} format for easier editing
                checkinType: 'yearly_draft',
                lastSaved: serverTimestamp()
            });
            setStatusMessage('Draft saved successfully!');
        } catch (err) {
            console.error("Error saving draft:", err);
            setError('Failed to save draft. Please try again.');
            setStatusMessage('');
        }
    };

const handleSubmit = async (e) => {
    e.preventDefault();
    const selectedAxis = allAxesData.find(axis => axis.id === selectedAxisId);
    
    // Validation: Ensure all questions have at least some text
    const unanswered = yearlyReviewQuestions.filter(q => !responses[q.id] || responses[q.id].trim() === '');
    if (unanswered.length > 0) {
        setError(`Please answer all questions before submitting. (${unanswered.length} remaining)`);
        return;
    }

    setIsSubmitting(true);
    setError('');
    setStatusMessage('Finalizing your yearly review...');

    try {
        // 1. Create the final record
        // We use addDoc to create a unique entry, or setDoc with a timestamped ID
        const finalReviewId = `yearly_final_${selectedAxis.yearlyGoal.id}_${Date.now()}`;
        
        await setDoc(doc(db, "goalCheckins", finalReviewId), {
            goalId: selectedAxis.yearlyGoal.id,
            axisId: selectedAxis.id,
            axisName: selectedAxis.displayName,
            userId: "user_placeholder_id", // Replace with actual auth UID if available
            responses: responses,
            checkinType: 'yearly_review', 
            submittedAt: serverTimestamp(),
            year: 2025 
        });

        // 2. Delete the draft now that the final version exists
        const draftId = `yearly_draft_${selectedAxis.yearlyGoal.id}`;
        await deleteDoc(doc(db, "goalCheckins", draftId));

        setStatusMessage('Yearly review submitted successfully!');
        
        // 3. Close the modal after a short delay
        setTimeout(() => {
            onClose();
        }, 1500);

    } catch (err) {
        console.error("Error submitting final review:", err);
        setError('Failed to submit final review. Your draft is still safe.');
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
                <h2>Yearly Review & Planning</h2>

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
                            {yearlyReviewQuestions.map(q => (
                                <div key={q.id} className={styles.questionBlock}>
                                    <label htmlFor={q.id}>{q.text}</label>
                                    <textarea
                                        id={q.id}
                                        value={responses[q.id] || ''}
                                        onChange={(e) => handleResponseChange(q.id, e.target.value)}
                                        placeholder={q.placeholder}
                                        rows="4"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className={styles.modalStatus}>
                           {statusMessage && <p className={styles.statusText}>{statusMessage}</p>}
                           {error && <p className={styles.errorText}>{error}</p>}
                        </div>

                        {/* ✅ 4. Updated actions with a "Save Draft" button */}
                        <div className={styles.modalActions}>
                            <button type="button" onClick={onOpenTimeline} className={styles.secondaryButton}>
                                Open Timeline
                            </button>
                            <div>
                                <button type="button" onClick={handleSaveDraft} className={styles.secondaryButton} disabled={isSubmitting}>
                                    Save Draft
                                </button>
                                <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
                                    {isSubmitting ? 'Submitting...' : 'Submit Final Review'}
                                </button>
                            </div>
                        </div>
                    </form>
                ) : (
                    <p className={styles.pleaseSelect}>Please select an axis to begin your review.</p>
                )}
            </div>
        </div>
    );
}

export default YearlyReviewModal;