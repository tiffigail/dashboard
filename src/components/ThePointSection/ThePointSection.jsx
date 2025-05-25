// src/components/ThePointSection/ThePointSection.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';
// Ensure this path is correct. It assumes ThePoint.module.css is in the SAME directory as ThePointSection.jsx
import styles from './ThePoint.module.css'; 

// This component will manage the "What's the point" feature.
// It needs the Firestore 'db' instance passed as a prop.
function ThePointSection({ db }) {
    const [latestPoint, setLatestPoint] = useState(null);
    const [isLoading, setIsLoading] = useState(true); // For initial data load
    const [isSubmitting, setIsSubmitting] = useState(false); // For form submission
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newPointText, setNewPointText] = useState('');

    // Function to determine font size class based on text length
    // Adjusted thresholds for a wider display band and larger fonts.
    const getFontSizeClass = useCallback((text) => {
        if (!text) return styles.pointTextMedium; // Default if no text
        const length = text.length;
        
        // These character counts are estimates. You may need to fine-tune them
        // based on how the text looks in the wider band with new font sizes.
        if (length === 0) return styles.pointTextMedium; // Default for empty string after trim
        if (length < 60) return styles.pointTextLarge;  // For shorter text, use largest font
        if (length < 180) return styles.pointTextMedium; // For medium length text
        return styles.pointTextSmall;                   // For longer text
    }, []); // Empty dependency array as styles object reference should be stable

    // Effect to fetch the latest point from Firestore
    useEffect(() => {
        if (!db) {
            setError("Firestore database instance is not available.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const pointsCollectionRef = collection(db, 'thePoint');
        // Query to get the most recent document, ordered by 'createdAt' in descending order, limit to 1
        const q = query(pointsCollectionRef, orderBy('createdAt', 'desc'), limit(1));

        // Subscribe to real-time updates
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            if (!querySnapshot.empty) {
                const latestDoc = querySnapshot.docs[0];
                setLatestPoint({ id: latestDoc.id, ...latestDoc.data() });
            } else {
                setLatestPoint(null); // No points found
            }
            setIsLoading(false);
            setError(null); // Clear any previous error on successful fetch
        }, (err) => {
            console.error("Error fetching latest point:", err);
            setError("Failed to fetch the latest point. Please try again later.");
            setIsLoading(false);
        });

        // Cleanup subscription on component unmount
        return () => unsubscribe();
    }, [db]); // Rerun effect if db instance changes

    // Handler to open the modal
    const handleOpenModal = () => {
        // Pre-fill textarea with the current latest point if it exists, otherwise empty.
        setNewPointText(latestPoint?.text || ''); 
        setError(null); // Clear any previous errors when opening modal
        setIsModalOpen(true);
    };

    // Handler to close the modal
    const handleCloseModal = () => {
        setIsModalOpen(false);
        // setError(null); // Optionally clear error when modal is explicitly closed
    };

    // Handler for text input change in the modal
    const handleInputChange = (event) => {
        setNewPointText(event.target.value);
    };

    // Handler to submit the new point
    const handleSubmitPoint = async () => {
        if (!newPointText.trim()) {
            // If you want to allow clearing the point, you might handle that differently
            // or remove this alert and allow submitting an empty string.
            alert("The point cannot be empty!"); 
            return;
        }
        if (!db) {
            setError("Firestore database instance is not available for saving.");
            return;
        }

        setIsSubmitting(true); // Indicate submission process
        setError(null); // Clear previous errors

        try {
            // Add a new document to the 'thePoint' collection
            await addDoc(collection(db, 'thePoint'), {
                text: newPointText.trim(),
                createdAt: serverTimestamp(), // Use server-side timestamp for consistency
            });
            // Firestore's onSnapshot will automatically update latestPoint.
            handleCloseModal(); // Close modal on successful submission
        } catch (err) {
            console.error("Error adding new point:", err);
            setError("Failed to save the point. Please try again.");
            // Keep modal open if save fails, so user can retry or see the error.
        } finally {
            setIsSubmitting(false); // Reset submission state
        }
    };

    return (
        <div className={styles.pointSectionContainer}>
            <button 
                onClick={handleOpenModal} 
                className={styles.pointButton} 
                disabled={isLoading} // Disable button while initial data is loading
            >
                What's the point?
            </button>

            <div className={styles.pointDisplayBand}>
                {isLoading && <p className={styles.loadingText}>Loading the point...</p>}
                {error && !isLoading && <p className={styles.errorText}>{error}</p>}
                {!isLoading && !error && latestPoint && (
                    <p className={`${styles.pointText} ${getFontSizeClass(latestPoint.text)}`}>
                        {latestPoint.text}
                    </p>
                )}
                {/* Show this message if not loading, no error, and no point exists */}
                {!isLoading && !error && !latestPoint && (
                    <p className={`${styles.pointText} ${styles.pointTextMedium}`}>No point set yet. Click the button to add one!</p>
                )}
            </div>

            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h2 className={styles.modalTitle}>What's the point?</h2>
                        <textarea
                            className={styles.modalTextArea}
                            value={newPointText}
                            onChange={handleInputChange}
                            placeholder="Enter your main point here..."
                            rows="4" // Initial rows, can be adjusted by user if resize is enabled
                            disabled={isSubmitting} // Disable textarea during submission
                        />
                        {/* Display submission-specific error inside the modal */}
                        {error && <p className={styles.errorText} style={{marginBottom: '1rem'}}>{error}</p>}
                        <div className={styles.modalActions}>
                            <button 
                                onClick={handleCloseModal} 
                                className={`${styles.modalButton} ${styles.cancelButton}`} 
                                disabled={isSubmitting} // Disable cancel during submission
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSubmitPoint} 
                                className={`${styles.modalButton} ${styles.submitButton}`} 
                                disabled={isSubmitting} // Disable submit during submission
                            >
                                {isSubmitting ? 'Saving...' : 'Save Point'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ThePointSection;
