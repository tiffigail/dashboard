// src/components/StudyFlashcardsModal/StudyFlashcardsModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import styles from './StudyFlashcardsModal.module.css';
import { db } from '../../firebaseConfig';
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import StarRating from '../StarRating/StarRating'; // <<< ADDED: Import external StarRating component

// Helper function to shuffle an array (Fisher-Yates algorithm)
function shuffleArray(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
    return array;
}

// --- REMOVED: Internal Star Rating Component Definition ---

// Props: isOpen (boolean), onClose (function)
function StudyFlashcardsModal({ isOpen, onClose }) {
    // == State ==
    const [flashcards, setFlashcards] = useState([]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    // State for rating
    const [currentRating, setCurrentRating] = useState(0); // 0 means no rating selected
    const [isSavingRating, setIsSavingRating] = useState(false);
    const [ratingError, setRatingError] = useState(null);

    // == Fetch Flashcards ==
    const fetchFlashcards = useCallback(async () => {
        if (!isOpen) return; // Don't fetch if modal isn't open

        setIsLoading(true);
        setError(null);
        setRatingError(null); // Clear rating error on fetch
        setFlashcards([]); // Clear previous cards
        setCurrentCardIndex(0);
        setShowAnswer(false);
        setCurrentRating(0); // Reset rating
        console.log("Fetching flashcards from study/flashcards...");

        try {
            const flashcardsDocRef = doc(db, "study", "flashcards");
            const docSnap = await getDoc(flashcardsDocRef);

            if (docSnap.exists()) {
                const insightsArray = docSnap.data().insights || []; // Get the insights array or empty array
                console.log(`Fetched ${insightsArray.length} insights.`);

                if (insightsArray.length > 0) {
                    // Shuffle the array randomly for review
                    const shuffledCards = shuffleArray([...insightsArray]); // Shuffle a copy
                    setFlashcards(shuffledCards);
                } else {
                    setError("No flashcards found in the 'insights' array.");
                }
            } else {
                console.log("Document 'study/flashcards' does not exist.");
                setError("No flashcards document found.");
            }
        } catch (err) {
            console.error("Error fetching flashcards:", err);
            setError("Failed to load flashcards. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, [isOpen]); // Dependency: re-fetch if modal is opened

    // Trigger fetch when the modal becomes visible
    useEffect(() => {
        fetchFlashcards();
    }, [fetchFlashcards]); // Use the memoized fetch function

    // Get the current card data
    const currentCard = flashcards.length > 0 ? flashcards[currentCardIndex] : null;

    // Function to save rating
    const saveRating = async () => {
        if (!currentCard || currentRating === 0 || isSavingRating) {
            return; // Don't save if no card, no rating selected, or already saving
        }

        setIsSavingRating(true);
        setRatingError(null);
        console.log(`Saving rating ${currentRating} for card: ${currentCard.title}`);

        const ratingData = {
            cardTitle: currentCard.title,
            cardTopic: currentCard.topic,
            rating: currentRating,
            reviewedAt: serverTimestamp() // Use server time for consistency
        };

        try {
            const ratingsCollectionRef = collection(db, "flashcardRatings");
            await addDoc(ratingsCollectionRef, ratingData);
            console.log("Rating saved successfully.");
        } catch (err) {
            console.error("Error saving rating:", err);
            setRatingError("Failed to save rating.");
        } finally {
            setIsSavingRating(false);
        }
    };

    // == Handlers ==
    const handleFlipCard = () => {
        setShowAnswer(prev => !prev);
    };

    // Use setCurrentRating directly as the handler passed to the external component
    const handleRatingSelect = (rating) => {
        setCurrentRating(rating);
    };

    const handleNextCard = async () => {
        if (currentRating > 0) {
            await saveRating(); // Wait for save attempt before moving
        }
        setShowAnswer(false);
        setCurrentRating(0);
        setRatingError(null);
        setCurrentCardIndex(prevIndex => (prevIndex + 1) % flashcards.length);
    };

    const handlePreviousCard = async () => {
        if (currentRating > 0) {
            await saveRating(); // Wait for save attempt before moving
        }
        setShowAnswer(false);
        setCurrentRating(0);
        setRatingError(null);
        setCurrentCardIndex(prevIndex => (prevIndex - 1 + flashcards.length) % flashcards.length);
    };


    // Don't render anything if modal is not open
    if (!isOpen) {
        return null;
    }

    // == Render ==
    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>×</button>
                <h3 className={styles.modalTitle}>Study Flashcards</h3>

                {isLoading && <p className={styles.loadingText}>Loading Flashcards...</p>}
                {error && <p className={styles.errorText}>{error}</p>}

                {!isLoading && !error && flashcards.length === 0 && (
                    <p>No flashcards available to study.</p>
                )}

                {!isLoading && !error && currentCard && (
                    <>
                        <p className={styles.cardCounter}>
                            Card {currentCardIndex + 1} of {flashcards.length}
                        </p>
                        <p className={styles.topicDisplay}>
                            Topic: <strong>{currentCard.topic}</strong>
                        </p>

                        <div className={styles.flashcard} onClick={handleFlipCard}>
                            {showAnswer ? (
                                <div className={styles.cardAnswer}>
                                    <p><strong>Answer:</strong></p>
                                    <p>{currentCard.answer}</p>
                                    {/* <<< UPDATED: Use imported StarRating component >>> */}
                                    <StarRating
                                        rating={currentRating}
                                        setRating={handleRatingSelect} // Pass the handler function
                                        disabled={isSavingRating} // Disable stars while saving
                                        // maxRating={5} // Optional: Pass if different from default
                                    />
                                    {/* Display saving status/error for rating */}
                                    {isSavingRating && <p className={styles.savingText}>Saving rating...</p>}
                                    {ratingError && <p className={styles.errorTextSmall}>{ratingError}</p>}
                                    {/* <<< END UPDATED >>> */}
                                </div>
                            ) : (
                                <div className={styles.cardQuestion}>
                                    <p><strong>Question/Title:</strong></p>
                                    <p>{currentCard.title}</p>
                                </div>
                            )}
                        </div>

                        <div className={styles.controls}>
                            <button onClick={handlePreviousCard} className={styles.navButton} disabled={isSavingRating}>
                                Previous
                            </button>
                            <button onClick={handleFlipCard} className={styles.flipButton} disabled={isSavingRating}>
                                {showAnswer ? 'Show Question' : 'Show Answer'}
                            </button>
                            <button onClick={handleNextCard} className={styles.navButton} disabled={isSavingRating}>
                                Next
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default StudyFlashcardsModal;
