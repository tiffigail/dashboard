// src/components/StudyFlashcardsModal/StudyFlashcardsModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import styles from './StudyFlashcardsModal.module.css';
import { db } from '../../firebaseConfig';
import { doc, getDoc, getDocs, collection, addDoc, serverTimestamp, query, where, orderBy, limit } from "firebase/firestore";
import StarRating from '../StarRating/StarRating';
import { useTimeAggregator } from '../../hooks/useTimeAggregator';

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
    useTimeAggregator('flashcardsModalTime');

    // == State ==
    const [flashcards, setFlashcards] = useState([]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentRating, setCurrentRating] = useState(0);
    const [isSavingRating, setIsSavingRating] = useState(false);
    const [ratingError, setRatingError] = useState(null);
    const [availableTopics, setAvailableTopics] = useState(["All"]);
    const [selectedTopic, setSelectedTopic] = useState("All");
    const [ratingHistory, setRatingHistory] = useState({ average: 0, count: 0 });

    // == Fetch and Prepare Flashcards ==
    const fetchAndPrepareFlashcards = useCallback(async (topicToFetch) => {
        setIsLoading(true);
        setError(null);
        setRatingError(null);
        setFlashcards([]);
        setCurrentCardIndex(0);
        setShowAnswer(false);
        setCurrentRating(0);
        setRatingHistory({ average: 0, count: 0 });

        try {
            const flashcardsDocRef = doc(db, "study", "flashcards");
            const docSnap = await getDoc(flashcardsDocRef);

            if (docSnap.exists()) {
                const allInsights = docSnap.data().insights || [];
                const uniqueTopics = ["All", ...new Set(allInsights.map(card => card.topic).filter(Boolean))];
                setAvailableTopics(uniqueTopics);

                let cardsForSession = allInsights;
                if (topicToFetch !== "All") {
                    cardsForSession = allInsights.filter(card => card.topic === topicToFetch);
                }

                if (cardsForSession.length > 0) {
                    const shuffledCards = shuffleArray([...cardsForSession]);
                    const limitedCards = shuffledCards.slice(0, 10);
                    setFlashcards(limitedCards);
                } else {
                    setFlashcards([]);
                    setError(allInsights.length === 0 ? "No flashcards found in database." : `No flashcards found for topic: "${topicToFetch}".`);
                }
            } else {
                setError("No flashcards document found.");
                setFlashcards([]);
                setAvailableTopics(["All"]);
            }
        } catch (err) {
            console.error("Error fetching/preparing flashcards:", err);
            setError("Failed to load flashcards. Please try again.");
            setFlashcards([]);
            setAvailableTopics(["All"]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Function to fetch the rating history for a specific card
    const fetchRatingHistory = useCallback(async (card) => {
        if (!card) return;
        
        try {
            const ratingsRef = collection(db, "flashcardRatings");
            const q = query(
                ratingsRef,
                where("cardTitle", "==", card.title),
                orderBy("reviewedAt", "desc"),
                limit(3)
            );

            const querySnapshot = await getDocs(q);
            const pastRatings = querySnapshot.docs.map(doc => doc.data().rating);

            if (pastRatings.length > 0) {
                const sum = pastRatings.reduce((a, b) => a + b, 0);
                const avg = sum / pastRatings.length;
                setRatingHistory({ average: avg, count: pastRatings.length });
            } else {
                setRatingHistory({ average: 0, count: 0 });
            }
        } catch (err) {
            console.error("Error fetching rating history:", err);
            setRatingHistory({ average: 0, count: 0 });
        }
    }, []);

    // == Effects ==
    useEffect(() => {
        if (isOpen) {
            fetchAndPrepareFlashcards(selectedTopic);
        } else {
            setFlashcards([]);
            setCurrentCardIndex(0);
            setShowAnswer(false);
            setCurrentRating(0);
            setError(null);
            setRatingError(null);
        }
    }, [isOpen, selectedTopic, fetchAndPrepareFlashcards]);

    const currentCard = flashcards.length > 0 ? flashcards[currentCardIndex] : null;

    useEffect(() => {
        if (isOpen && currentCard) {
            fetchRatingHistory(currentCard);
        } else {
            setRatingHistory({ average: 0, count: 0 });
        }
    }, [isOpen, currentCard, fetchRatingHistory]);
    
    // Function to save rating
    const saveRating = async () => {
        if (!currentCard || currentRating === 0 || isSavingRating) return;
        setIsSavingRating(true);
        setRatingError(null);
        const ratingData = {
            cardTitle: currentCard.title,
            cardTopic: currentCard.topic,
            rating: currentRating,
            reviewedAt: serverTimestamp()
        };
        try {
            const ratingsCollectionRef = collection(db, "flashcardRatings");
            await addDoc(ratingsCollectionRef, ratingData);
        } catch (err) {
            console.error("Error saving rating:", err);
            setRatingError("Failed to save rating.");
        } finally {
            setIsSavingRating(false);
        }
    };

    // == Handlers ==
    const handleFlipCard = () => setShowAnswer(prev => !prev);
    const handleRatingSelect = (rating) => setCurrentRating(rating);

    const handleNextCard = async () => {
        if (currentRating > 0 && currentCard) await saveRating();
        if (flashcards.length > 0) {
            setShowAnswer(false);
            setCurrentRating(0);
            setRatingError(null);
            setCurrentCardIndex(prevIndex => (prevIndex + 1) % flashcards.length);
        }
    };

    const handlePreviousCard = async () => {
        if (currentRating > 0 && currentCard) await saveRating();
        if (flashcards.length > 0) {
            setShowAnswer(false);
            setCurrentRating(0);
            setRatingError(null);
            setCurrentCardIndex(prevIndex => (prevIndex - 1 + flashcards.length) % flashcards.length);
        }
    };

    const handleTopicChange = (event) => setSelectedTopic(event.target.value);
    const handleEndSession = () => onClose();

    if (!isOpen) return null;

    // == Render ==
    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>×</button>
                <h3 className={styles.modalTitle}>Study Flashcards</h3>

                <div className={styles.topicSelectorContainer}>
                    <label htmlFor="topic-select" className={styles.topicLabel}>Select Topic: </label>
                    <select id="topic-select" value={selectedTopic} onChange={handleTopicChange} className={styles.topicSelect} disabled={isLoading}>
                        {availableTopics.map(topic => (
                            <option key={topic} value={topic}>{topic}</option>
                        ))}
                    </select>
                </div>

                {isLoading && <p className={styles.loadingText}>Loading Flashcards...</p>}
                {error && <p className={styles.errorText}>{error}</p>}

                {!isLoading && !error && currentCard && (
                    <>
                        <p className={styles.cardCounter}>Card {currentCardIndex + 1} of {flashcards.length}</p>
                        <p className={styles.topicDisplay}>Topic: <strong>{currentCard.topic}</strong></p>
                        <div className={styles.flashcard} onClick={handleFlipCard}>
                            {showAnswer ? (
                                <div className={styles.cardAnswer}>
                                    <p><strong>Answer:</strong></p>
                                    <p>{currentCard.answer}</p>
                                    <StarRating rating={currentRating} setRating={handleRatingSelect} disabled={isSavingRating}/>
                                    {isSavingRating && <p className={styles.savingText}>Saving rating...</p>}
                                    {ratingError && <p className={styles.errorTextSmall}>{ratingError}</p>}
                                    {ratingHistory.count > 0 && (
                                        <div className={styles.historyDisplay}>
                                            Avg. of Last {ratingHistory.count} Ratings: <strong>{ratingHistory.average.toFixed(1)}</strong>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className={styles.cardQuestion}>
                                    <p><strong>Question/Title:</strong></p>
                                    <p>{currentCard.title}</p>
                                </div>
                            )}
                        </div>
                        <div className={styles.controls}>
                            <button onClick={handlePreviousCard} className={styles.navButton} disabled={isSavingRating || flashcards.length <= 1}>Previous</button>
                            <button onClick={handleFlipCard} className={styles.flipButton} disabled={isSavingRating}>{showAnswer ? 'Show Question' : 'Show Answer'}</button>
                            <button onClick={handleNextCard} className={styles.navButton} disabled={isSavingRating || flashcards.length <= 1}>Next</button>
                        </div>
                        <button onClick={handleEndSession} className={`${styles.navButton} ${styles.endSessionButton}`}>End Study Session</button>
                    </>
                )}
            </div>
        </div>
    );
}

export default StudyFlashcardsModal;