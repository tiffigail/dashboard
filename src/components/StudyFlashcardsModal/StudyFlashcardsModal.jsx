// src/components/StudyFlashcardsModal/StudyFlashcardsModal.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './StudyFlashcardsModal.module.css';
import { db } from '../../firebaseConfig';
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import StarRating from '../StarRating/StarRating';

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

// Props: isOpen (boolean), onClose (function)
function StudyFlashcardsModal({ isOpen, onClose }) {
    // == State ==
    const [flashcards, setFlashcards] = useState([]); // Cards for the current study session (max 10)
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // State for rating
    const [currentRating, setCurrentRating] = useState(0);
    const [isSavingRating, setIsSavingRating] = useState(false);
    const [ratingError, setRatingError] = useState(null);

    // NEW: State for topic selection
    const [availableTopics, setAvailableTopics] = useState(["All"]);
    const [selectedTopic, setSelectedTopic] = useState("All");

    // == Fetch and Prepare Flashcards ==
    const fetchAndPrepareFlashcards = useCallback(async (topicToFetch) => {
        if (!isOpen) {
            setFlashcards([]); // Clear cards if modal is not open
            return;
        }

        setIsLoading(true);
        setError(null);
        setRatingError(null);
        setFlashcards([]); // Clear previous session's cards
        setCurrentCardIndex(0);
        setShowAnswer(false);
        setCurrentRating(0);

        console.log(`Workspaceing and preparing flashcards for topic: ${topicToFetch}...`);

        try {
            const flashcardsDocRef = doc(db, "study", "flashcards");
            const docSnap = await getDoc(flashcardsDocRef);

            if (docSnap.exists()) {
                const allInsights = docSnap.data().insights || [];
                console.log(`Workspaceed ${allInsights.length} total insights from DB.`);

                // Populate available topics from all insights
                const uniqueTopics = ["All", ...new Set(allInsights.map(card => card.topic).filter(Boolean))];
                setAvailableTopics(uniqueTopics);

                let cardsForSession = allInsights;
                if (topicToFetch !== "All") {
                    cardsForSession = allInsights.filter(card => card.topic === topicToFetch);
                }
                console.log(`${cardsForSession.length} cards found for topic "${topicToFetch}" before shuffling.`);

                if (cardsForSession.length > 0) {
                    const shuffledCards = shuffleArray([...cardsForSession]);
                    const limitedCards = shuffledCards.slice(0, 10); // Limit to 10 cards
                    setFlashcards(limitedCards);
                    console.log(`Prepared ${limitedCards.length} flashcards for the session.`);
                } else {
                    setFlashcards([]); // Ensure flashcards are empty
                    if (allInsights.length === 0) {
                        setError("No flashcards found in the 'insights' array in the document.");
                    } else {
                        setError(`No flashcards found for topic: "${topicToFetch}".`);
                    }
                }
            } else {
                console.log("Document 'study/flashcards' does not exist.");
                setError("No flashcards document found.");
                setFlashcards([]);
                setAvailableTopics(["All"]); // Reset topics
            }
        } catch (err) {
            console.error("Error fetching/preparing flashcards:", err);
            setError("Failed to load flashcards. Please try again.");
            setFlashcards([]);
            setAvailableTopics(["All"]); // Reset topics on error
        } finally {
            setIsLoading(false);
        }
    }, [isOpen]); // Dependencies: isOpen and stable setters (implicitly via React)

    // Effect to reset selectedTopic to "All" when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedTopic("All"); // Default to "All" when modal becomes visible
        } else {
            // Optional: Clear states when modal is closed to ensure clean state for next open
            setFlashcards([]);
            setCurrentCardIndex(0);
            setShowAnswer(false);
            setCurrentRating(0);
            setError(null);
            setRatingError(null);
            // Keep availableTopics as they might be useful if modal reopens quickly,
            // or reset them: setAvailableTopics(["All"]);
        }
    }, [isOpen]);

    // Effect to fetch cards when isOpen state changes to true OR selectedTopic changes
    useEffect(() => {
        if (isOpen) {
            fetchAndPrepareFlashcards(selectedTopic);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, selectedTopic, fetchAndPrepareFlashcards]); // fetchAndPrepareFlashcards is memoized

    // Get the current card data
    const currentCard = flashcards.length > 0 ? flashcards[currentCardIndex] : null;

    // Function to save rating
    const saveRating = async () => {
        if (!currentCard || currentRating === 0 || isSavingRating) {
            return;
        }
        setIsSavingRating(true);
        setRatingError(null);
        console.log(`Saving rating ${currentRating} for card: ${currentCard.title}`);
        const ratingData = {
            cardTitle: currentCard.title,
            cardTopic: currentCard.topic, // This uses topic from the card itself
            rating: currentRating,
            reviewedAt: serverTimestamp()
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

    const handleRatingSelect = (rating) => {
        setCurrentRating(rating);
    };

    const handleNextCard = async () => {
        if (currentRating > 0 && currentCard) { // Ensure currentCard exists
            await saveRating();
        }
        if (flashcards.length > 0) { // Ensure there are cards to navigate
            setShowAnswer(false);
            setCurrentRating(0);
            setRatingError(null);
            setCurrentCardIndex(prevIndex => (prevIndex + 1) % flashcards.length);
        }
    };

    const handlePreviousCard = async () => {
        if (currentRating > 0 && currentCard) { // Ensure currentCard exists
            await saveRating();
        }
        if (flashcards.length > 0) { // Ensure there are cards to navigate
            setShowAnswer(false);
            setCurrentRating(0);
            setRatingError(null);
            setCurrentCardIndex(prevIndex => (prevIndex - 1 + flashcards.length) % flashcards.length);
        }
    };

    // NEW: Handler for topic selection change
    const handleTopicChange = (event) => {
        setSelectedTopic(event.target.value);
        // The useEffect watching selectedTopic will trigger data fetching
    };

    // NEW: Handler for ending the study session
    const handleEndSession = () => {
        onClose(); // Simply close the modal
    };

    if (!isOpen) {
        return null;
    }

    // == Render ==
    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>×</button>
                <h3 className={styles.modalTitle}>Study Flashcards</h3>

                {/* NEW: Topic Selection Dropdown */}
                <div className={styles.topicSelectorContainer}>
                    <label htmlFor="topic-select" className={styles.topicLabel}>Select Topic: </label>
                    <select
                        id="topic-select"
                        value={selectedTopic}
                        onChange={handleTopicChange}
                        className={styles.topicSelect}
                        disabled={isLoading}
                    >
                        {availableTopics.map(topic => (
                            <option key={topic} value={topic}>{topic}</option>
                        ))}
                    </select>
                </div>

                {isLoading && <p className={styles.loadingText}>Loading Flashcards...</p>}
                {error && <p className={styles.errorText}>{error}</p>}

                {!isLoading && !error && flashcards.length === 0 && (
                    <p>No flashcards available for the selected topic, or no flashcards found.</p>
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
                                    <StarRating
                                        rating={currentRating}
                                        setRating={handleRatingSelect}
                                        disabled={isSavingRating}
                                    />
                                    {isSavingRating && <p className={styles.savingText}>Saving rating...</p>}
                                    {ratingError && <p className={styles.errorTextSmall}>{ratingError}</p>}
                                </div>
                            ) : (
                                <div className={styles.cardQuestion}>
                                    <p><strong>Question/Title:</strong></p>
                                    <p>{currentCard.title}</p>
                                </div>
                            )}
                        </div>

                        <div className={styles.controls}>
                            <button onClick={handlePreviousCard} className={styles.navButton} disabled={isSavingRating || flashcards.length <= 1}>
                                Previous
                            </button>
                            <button onClick={handleFlipCard} className={styles.flipButton} disabled={isSavingRating}>
                                {showAnswer ? 'Show Question' : 'Show Answer'}
                            </button>
                            <button onClick={handleNextCard} className={styles.navButton} disabled={isSavingRating || flashcards.length <= 1}>
                                Next
                            </button>
                        </div>
                        {/* NEW: End Study Session Button */}
                        <button onClick={handleEndSession} className={`${styles.navButton} ${styles.endSessionButton}`}>
                            End Study Session
                        </button>
                    </>
                )}
                 {!isLoading && !error && !currentCard && flashcards.length > 0 && (
                    // This case might occur if flashcards array is populated but currentCard is somehow null
                    // Should be rare with current logic but good for robustness.
                    <p>Error displaying current card.</p>
                )}
            </div>
        </div>
    );
}

export default StudyFlashcardsModal;