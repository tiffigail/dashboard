// src/components/BudgetForm/BudgetForm.jsx
import React, { useState, useEffect, useRef } from 'react';
import styles from './BudgetForm.module.css';
import { db } from '../../firebaseConfig';
import { collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore"; // Ensure Timestamp is imported if used client-side

// Checklist Items
const budgetChecklistItems = [
    "Update transactions in Monarch",
    "Review spending categories vs budget",
    "Pay/Schedule upcoming bills",
    "Adjust budget for next period (if needed)",
    "Hone this modal"
];

// Props: onSubmit, onClose, onNavigate (Passed down from App -> WeeklyView)
function BudgetForm({ onSubmit, onClose, onNavigate }) {
    // == State ==
    const [checkedItems, setCheckedItems] = useState(() => {
        return budgetChecklistItems.reduce((acc, item) => {
            acc[item] = false;
            return acc;
        }, {});
    });
    const [netWorth, setNetWorth] = useState('');
    const [bettermentBalance, setBettermentBalance] = useState('');
    const [totalDebt, setTotalDebt] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [showSuccessPopup, setShowSuccessPopup] = useState(false); // State for success popup
    const startTimeRef = useRef(Date.now());

    // == Handlers ==
    const handleCheckboxChange = (event) => {
        const { name, checked } = event.target;
        setCheckedItems(prevItems => ({ ...prevItems, [name]: checked }));
    };

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        // Allow numbers and potentially a decimal point/negative sign
        const validInput = value === '' || /^-?\d*\.?\d*$/.test(value);

        if (validInput) {
            if (name === 'netWorth') setNetWorth(value);
            else if (name === 'bettermentBalance') setBettermentBalance(value);
            else if (name === 'totalDebt') setTotalDebt(value);
        }
    };

    // Handle form submission
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setSubmitError(null);

        const completedChecklistItems = Object.entries(checkedItems)
            .filter(([key, value]) => value === true)
            .map(([key]) => key);

        const endTime = Date.now();
        const durationMinutes = Math.round((endTime - startTimeRef.current) / (1000 * 60));

        const budgetLogData = {
            type: 'budgetRoutine',
            checklistCompleted: completedChecklistItems,
            netWorth: netWorth.trim() ? parseFloat(netWorth) : null,
            bettermentBalance: bettermentBalance.trim() ? parseFloat(bettermentBalance) : null,
            totalDebt: totalDebt.trim() ? parseFloat(totalDebt) : null,
            durationMinutes: durationMinutes,
            completedAt: serverTimestamp() // Use server timestamp for the log entry
        };

        console.log("Attempting to save Budget Routine Data:", budgetLogData);

        try {
            const logDocRef = await addDoc(collection(db, "budgetLogs"), budgetLogData);
            console.log("Budget Routine Log Document written with ID: ", logDocRef.id);

            // <<< Set state to show the popup AFTER successful save >>>
            setShowSuccessPopup(true);

            // IMPORTANT: Do NOT call onSubmit or onClose here if you want the popup to show first.
            // if (onSubmit) {
            //     onSubmit(budgetLogData);
            // }

        } catch (e) {
            console.error("Error adding budget log document: ", e);
            setSubmitError("Failed to save budget routine. Please try again.");
            setIsSubmitting(false); // Only set submitting false on error
        }
        // Keep isSubmitting true while popup is shown, reset in handleRewardClick/onClose
    };

    // Handler for the "Reward" button in the success popup
    const handleRewardClick = () => {
        console.log("Reward button clicked - Requesting navigation to Life Map.");
        if (onNavigate) {
            // Call the navigation handler passed from App.jsx via WeeklyView.jsx
            // Use the key from the VIEWS constant in App.jsx
            onNavigate('Life'); // Use lowercase 'life' as defined in VIEWS
        } else {
            console.warn("onNavigate prop not provided to BudgetForm");
        }
        // Close the modal after attempting navigation
        if (onClose) {
            onClose();
        }
        // Reset state if needed (though component will unmount)
        // setIsSubmitting(false);
        // setShowSuccessPopup(false);
    };

    // Conditional Rendering for Popup
    if (showSuccessPopup) {
        console.log("<<< Rendering success popup >>>"); // For debugging
        return (
            <div className={styles.successPopup}>
                <h4>We did it!!</h4>
                <p>Budget routine logged successfully.</p>
                <button onClick={handleRewardClick} className={styles.rewardButton}>
                    Reward
                </button>
            </div>
        );
    }

    // Otherwise, render the main form
    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <h3 className={styles.formTitle}>Budget Routine</h3>

            {/* Checklist Section */}
            <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Checklist:</h4>
                {budgetChecklistItems.map((item) => (
                    <div key={item} className={styles.checkItem}>
                        <input
                            type="checkbox"
                            id={`budget-${item.replace(/\s+/g, '-')}`}
                            name={item}
                            checked={checkedItems[item]}
                            onChange={handleCheckboxChange}
                            className={styles.checkbox}
                            disabled={isSubmitting}
                        />
                        <label htmlFor={`budget-${item.replace(/\s+/g, '-')}`}>{item}</label>
                    </div>
                ))}
            </div>

             {/* Input Sections */}
             <div className={styles.section}>
                 <h4 className={styles.sectionTitle}>Financial Snapshot:</h4>
                 <div className={styles.inputGrid}>
                     <div className={styles.inputField}>
                         <label htmlFor="netWorth">Enter Current Net Worth:</label>
                         <input
                             type="text"
                             inputMode="decimal"
                             id="netWorth"
                             name="netWorth"
                             value={netWorth}
                             onChange={handleInputChange}
                             placeholder="e.g., 100000.50"
                             className={styles.numberInput}
                             disabled={isSubmitting}
                         />
                     </div>
                     <div className={styles.inputField}>
                         <label htmlFor="bettermentBalance">Enter Current Betterment Balance:</label>
                         <input
                             type="text"
                             inputMode="decimal"
                             id="bettermentBalance"
                             name="bettermentBalance"
                             value={bettermentBalance}
                             onChange={handleInputChange}
                             placeholder="e.g., 5000.25"
                             className={styles.numberInput}
                             disabled={isSubmitting}
                         />
                     </div>
                     <div className={styles.inputField}>
                         <label htmlFor="totalDebt">Enter Total Debt:</label>
                         <input
                             type="text"
                             inputMode="decimal"
                             id="totalDebt"
                             name="totalDebt"
                             value={totalDebt}
                             onChange={handleInputChange}
                             placeholder="e.g., 15000"
                             className={styles.numberInput}
                             disabled={isSubmitting}
                         />
                     </div>
                 </div>
             </div>

            {/* Display submission error if it exists */}
            {submitError && <p className={styles.errorText}>Error: {submitError}</p>}

            {/* Submit Button */}
            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Complete Budget Routine'}
            </button>
        </form>
    );
}

export default BudgetForm;
