// src/components/DearAbiMarquee/DearAbiMarquee.jsx
import React, { useState, useEffect } from 'react';
import styles from '@/components/ui/DearAbiMarquee/DearAbiMarquee.module.css'; // Make sure to create/update this CSS file
import { db } from '@/firebaseConfig';
import {
    collection,
    query,
    limit,
    getDocs,
    where,
    // orderBy, // Kept for potential future use
    // Timestamp // Kept for potential future use
} from "firebase/firestore";

// --- Helper function to shuffle an array (Fisher-Yates) ---
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

// --- Helper function to deduplicate fetched quotes by ID ---
function deduplicateQuotes(quotesArray) {
    const seenIds = new Set();
    return quotesArray.filter(quote => {
        if (!quote || typeof quote.id === 'undefined') { // Added a check for valid quote structure
            console.warn("DeduplicateQuotes: Encountered invalid quote object", quote);
            return false;
        }
        if (seenIds.has(quote.id)) {
            return false; 
        }
        seenIds.add(quote.id);
        return true; 
    });
}

const FETCH_POOL_MULTIPLIER = 3; 

function DearAbiMarquee({ currentMonthId, currentAxisName, count = 5 }) {
    const [quotes, setQuotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchQuotes = async () => {
            setIsLoading(true);
            setError(null);
            let candidateQuotes = []; 

            const quotesCollectionRef = collection(db, "dearAbiQuotes");
            const targetPoolSize = count * FETCH_POOL_MULTIPLIER;

            try {
                let fieldToQuery = null;
                let specificValue = null;

                if (currentAxisName) {
                    fieldToQuery = "relatedAxes";
                    specificValue = currentAxisName;
                } else if (currentMonthId) {
                    fieldToQuery = "relatedMonthIds";
                    specificValue = currentMonthId;
                }

                if (specificValue) {
                    const specificQuery = query(
                        quotesCollectionRef,
                        where(fieldToQuery, "array-contains", specificValue),
                        limit(targetPoolSize)
                    );
                    const specificSnapshot = await getDocs(specificQuery);
                    specificSnapshot.forEach((doc) => {
                        if (doc.data() && doc.data().text) {
                            candidateQuotes.push({ id: doc.id, ...doc.data() });
                        }
                    });
                }
                
                // Deduplicate after specific fetch before deciding if general fetch is needed
                // This avoids over-fetching general quotes if specific ones had many duplicates not yet removed
                let uniqueSpecificCandidates = deduplicateQuotes([...candidateQuotes]); // Use spread to avoid mutating original if needed elsewhere

                const currentUniqueCandidateCount = uniqueSpecificCandidates.length;
                const neededForPool = targetPoolSize - currentUniqueCandidateCount;

                if (neededForPool > 0 || !specificValue) {
                    const generalLimit = !specificValue ? targetPoolSize : neededForPool;
                    if (generalLimit > 0) {
                        const generalQuery = query(
                            quotesCollectionRef,
                            where("relatedAxes", "array-contains", "all"),
                            limit(generalLimit)
                        );
                        const generalSnapshot = await getDocs(generalQuery);
                        generalSnapshot.forEach((doc) => {
                            if (doc.data() && doc.data().text) {
                                candidateQuotes.push({ id: doc.id, ...doc.data() });
                            }
                        });
                    }
                }

                let finalQuotes = deduplicateQuotes(candidateQuotes);
                finalQuotes = shuffleArray(finalQuotes);
                finalQuotes = finalQuotes.slice(0, count);

                if (finalQuotes.length === 0) {
                    setQuotes([{ id: 'default', text: "Be the Abi you want to see in the world!" }]);
                } else {
                    setQuotes(finalQuotes);
                }

            } catch (err) {
                console.error("DearAbiMarquee: Error fetching quotes:", err);
                setError("Could not load quotes.");
                setQuotes([{ id: 'error', text: "Error loading quotes." }]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchQuotes();
    }, [currentMonthId, currentAxisName, count]);

    const baseSpeedPerQuote = 10; 
    const minDuration = 10; 
    const calculatedDuration = quotes.length * baseSpeedPerQuote;
    const animationDuration = `${Math.max(calculatedDuration, minDuration)}s`;

    return (
        <div className={styles.marqueeContainer}> {/* Apply white box styles here */}
            <p className={styles.marqueeTitle}>Dear Abi,</p>
            {isLoading ? (
                <p className={styles.loadingText}>Loading advice...</p>
            ) : error ? (
                <p className={styles.errorText}>{error}</p>
            ) : (
                <div className={styles.marqueeContent} style={{ animationDuration }}>
                    {[...quotes, ...quotes].map((quote, index) => (
                        <span key={`${quote.id}-${index}`} className={styles.quoteItem}>
                            {quote.text}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

export default DearAbiMarquee;