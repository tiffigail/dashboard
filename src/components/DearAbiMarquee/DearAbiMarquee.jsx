// src/components/DearAbiMarquee/DearAbiMarquee.jsx
import React, { useState, useEffect } from 'react';
import styles from './DearAbiMarquee.module.css';
import { db } from '../../firebaseConfig';
import {
    collection,
    query,
    // orderBy, // Removed orderBy as we are not sorting by date anymore
    limit,
    getDocs,
    where // <<< ADDED: Import where function
    // Timestamp // Not currently used
} from "firebase/firestore";

// Props:
// - theme (optional): Filter quotes by a specific theme field in Firestore
// - count (optional): Max number of quotes to fetch (default 5)
function DearAbiMarquee({ theme, count = 5 }) {
    const [quotes, setQuotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchQuotes = async () => {
            setIsLoading(true);
            setError(null);
            console.log("DearAbiMarquee: Fetching quotes...");

            try {
                const quotesCollectionRef = collection(db, "dearAbiQuotes");
                let q; // Firestore query variable

                // Query construction based on whether a theme is provided
                if (theme) {
                     console.log(`DearAbiMarquee: Filtering by theme: ${theme}`);
                     // Query by theme, limit the results
                     // Assumes documents have a 'theme' field
                     q = query(
                         quotesCollectionRef,
                         where("theme", "==", theme), // Filter by theme
                         limit(count) // Limit the number of results
                     );
                } else {
                    // Fetch limited quotes if no theme specified, no specific order
                     q = query(
                         quotesCollectionRef,
                         // REMOVED: orderBy("createdAt", "desc")
                         limit(count) // Limit the number of results
                     );
                }

                const querySnapshot = await getDocs(q);
                const fetchedQuotes = [];
                querySnapshot.forEach((doc) => {
                    // Assumes each document has a 'text' field for the quote
                    if (doc.data().text) {
                        fetchedQuotes.push({ id: doc.id, text: doc.data().text });
                    }
                });

                if (fetchedQuotes.length === 0) {
                    console.log("DearAbiMarquee: No quotes found matching criteria.");
                    // Provide a default message if no quotes are fetched
                    setQuotes([{ id: 'default', text: "Remember to add some 'Dear Abi' quotes to the database!" }]);
                } else {
                    // Optional: Shuffle results here if you want random order from the fetched set
                    // const shuffledQuotes = shuffleArray(fetchedQuotes);
                    // setQuotes(shuffledQuotes);
                    setQuotes(fetchedQuotes); // Use default Firestore order (or filtered order)
                    console.log("DearAbiMarquee: Quotes fetched:", fetchedQuotes);
                }

            } catch (err) {
                console.error("DearAbiMarquee: Error fetching quotes:", err);
                setError("Could not load quotes.");
                // Provide an error message
                 setQuotes([{ id: 'error', text: "Error loading quotes." }]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchQuotes();
        // Re-fetch if the theme or count prop changes
    }, [theme, count]);

    // Calculate animation duration based on number of quotes to keep speed consistent
    const animationDuration = `${quotes.length * 10}s`; // Adjust multiplier for speed

    return (
        <div className={styles.marqueeContainer}>
            <p className={styles.marqueeTitle}>Dear Abi,</p>
            {isLoading ? (
                <p className={styles.loadingText}>Loading advice...</p>
            ) : (
                <div className={styles.marqueeContent} style={{ animationDuration }}>
                    {/* Render quotes twice for seamless looping */}
                    {[...quotes, ...quotes].map((quote, index) => (
                        <span key={`${quote.id}-${index}`} className={styles.quoteItem}>
                            {quote.text}
                        </span>
                    ))}
                </div>
            )}
             {error && <p className={styles.errorText}>{error}</p>}
        </div>
    );
}

// Helper function to shuffle an array (Fisher-Yates algorithm) - Optional
// function shuffleArray(array) {
//     let currentIndex = array.length, randomIndex;
//     while (currentIndex !== 0) {
//         randomIndex = Math.floor(Math.random() * currentIndex);
//         currentIndex--;
//         [array[currentIndex], array[randomIndex]] = [
//             array[randomIndex], array[currentIndex]];
//     }
//     return array;
// }

export default DearAbiMarquee;
