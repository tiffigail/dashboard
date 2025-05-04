// src/components/ReadyForWorkForm/ReadyForWorkForm.jsx
import React, { useState, useEffect, useRef } from 'react';
import styles from './ReadyForWorkForm.module.css'; // Create this CSS file
import StarRating from '../StarRating/StarRating'; // Import the reusable StarRating
import { db } from '../../firebaseConfig';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// Define checklist items
const checklistItems = [
    "Shower", "Dress", "AM Meds", "Brush Teeth", "Floss Teeth",
    "Hair", "Makeup", "Scent", "Recitation", "PKW",
    "Water", "Lunch", "Supps", "Snacks"
];

// Props: onSubmit, onClose
function ReadyForWorkForm({ onSubmit, onClose }) {
    // == State ==
    const [checkedItems, setCheckedItems] = useState(() => {
        return checklistItems.reduce((acc, item) => ({ ...acc, [item]: false }), {});
    });
    const [weight, setWeight] = useState('');
    const [bodyfat, setBodyfat] = useState('');
    const [readinessRating, setReadinessRating] = useState(0); // 0-5 rating
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const startTimeRef = useRef(Date.now());

    // == Handlers ==
    const handleCheckboxChange = (event) => {
        const { name, checked } = event.target;
        setCheckedItems(prev => ({ ...prev, [name]: checked }));
    };

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        // Allow numbers and one decimal point for weight/bodyfat
        const validInput = value === '' || /^\d*\.?\d*$/.test(value);

        if (validInput) {
            if (name === 'weight') setWeight(value);
            else if (name === 'bodyfat') setBodyfat(value);
        }
    };

    // Handle form submission
    const handleSubmit = async (event) => {
        event.preventDefault();
        if (readinessRating === 0) {
            setSubmitError("Please rate how ready you feel.");
            return;
        }
        setIsSubmitting(true);
        setSubmitError(null);

        const completedChecklist = Object.entries(checkedItems)
            .filter(([key, value]) => value === true)
            .map(([key]) => key);

        const endTime = Date.now();
        const durationMinutes = Math.round((endTime - startTimeRef.current) / (1000 * 60));

        const formData = {
            type: 'readyForWorkLog',
            checklistCompleted: completedChecklist,
            weight: weight.trim() ? parseFloat(weight) : null,
            bodyfatPercentage: bodyfat.trim() ? parseFloat(bodyfat) : null,
            readinessRating: readinessRating,
            durationMinutes: durationMinutes,
            completedAt: serverTimestamp()
        };

        console.log("Attempting to save Ready For Work Data:", formData);

        try {
            const logDocRef = await addDoc(collection(db, "readyForWorkLogs"), formData);
            console.log("Ready For Work Log Document written with ID: ", logDocRef.id);

            if (onSubmit) onSubmit(formData);
            if (onClose) onClose();

        } catch (e) {
            console.error("Error adding Ready For Work log: ", e);
            setSubmitError("Failed to save log. Please try again.");
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <h3 className={styles.formTitle}>Ready for Work</h3>

            {/* Checklist Section */}
            <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Checklist</h4>
                <div className={styles.checkGrid}>
                    {checklistItems.map((item) => (
                        <div key={item} className={styles.checkItem}>
                            <input
                                type="checkbox"
                                id={`ready-${item.replace(/\s+/g, '-')}`}
                                name={item}
                                checked={!!checkedItems[item]}
                                onChange={handleCheckboxChange}
                                className={styles.checkbox}
                                disabled={isSubmitting}
                            />
                            <label htmlFor={`ready-${item.replace(/\s+/g, '-')}`}>{item}</label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Metrics Section */}
            <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Metrics</h4>
                <div className={styles.metricsGrid}>
                    <div className={styles.inputField}>
                        <label htmlFor="weight">Weight:</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            id="weight"
                            name="weight"
                            value={weight}
                            onChange={handleInputChange}
                            placeholder="e.g., 150.5"
                            className={styles.numberInput}
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className={styles.inputField}>
                        <label htmlFor="bodyfat">Body Fat %:</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            id="bodyfat"
                            name="bodyfat"
                            value={bodyfat}
                            onChange={handleInputChange}
                            placeholder="e.g., 22.5"
                            className={styles.numberInput}
                            disabled={isSubmitting}
                        />
                    </div>
                </div>
            </div>

            {/* Rating Section */}
            <div className={styles.section}>
                <h4 className={styles.sectionTitle}>How ready do you feel?</h4>
                <StarRating rating={readinessRating} setRating={setReadinessRating} disabled={isSubmitting} />
            </div>

            {/* Submission */}
            {submitError && <p className={styles.errorText}>Error: {submitError}</p>}
            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Complete Routine'}
            </button>
        </form>
    );
}

export default ReadyForWorkForm;
