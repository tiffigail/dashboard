// src/components/FamilyCleanForm/FamilyCleanForm.jsx
import React, { useState, useEffect, useRef } from 'react';
import styles from './FamilyCleanForm.module.css';
import { db } from '../../firebaseConfig';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// UPDATED Checklist Items (Rotating chore added dynamically)
const familyCleanItems = [
    "Dishes",
    "Laundry",
    "Floors",
    "Bathrooms",
    "Trash",
    "Recycling",
    "Surfaces",
];

// Define the rotating chores. Order matters for weekly rotation.
const rotatingChores = [
    "Clean Mirrors",
    "Vacuum",
    "Mop",
    "Clean Fridge",
    "Clean Oven",
    "Clean Windows",
];

// Define the people for the dropdown
const people = ["Abi", "Izi", "Tiffany"];

// Helper to get ISO week number
function getWeekNumber(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
    return weekNo;
}


// Props: onSubmit, onClose
function FamilyCleanForm({ onSubmit, onClose }) {
    // == State ==
    const [currentRotatingChore, setCurrentRotatingChore] = useState('');
    const [checkedItems, setCheckedItems] = useState({});
    const [dishesPerson, setDishesPerson] = useState(() => localStorage.getItem('familyCleanDishesPerson') || '');
    const [laundryPerson, setLaundryPerson] = useState(() => localStorage.getItem('familyCleanLaundryPerson') || '');
    const [floorsPerson, setFloorsPerson] = useState(() => localStorage.getItem('familyCleanFloorsPerson') || '');
    const [bathroomsPerson, setBathroomsPerson] = useState(() => localStorage.getItem('familyCleanBathroomsPerson') || '');
    const [trashPerson, setTrashPerson] = useState(() => localStorage.getItem('familyCleanTrashPerson') || '');
    const [recyclingPerson, setRecyclingPerson] = useState(() => localStorage.getItem('familyCleanRecyclingPerson') || '');
    const [surfacesPerson, setSurfacesPerson] = useState(() => localStorage.getItem('familyCleanSurfacesPerson') || '');
    // <<< NEW State for Rotating Chore Person >>>
    const [rotatingChorePerson, setRotatingChorePerson] = useState(() => localStorage.getItem('familyCleanRotatingChorePerson') || '');
    const [preCleaningRating, setPreCleaningRating] = useState(() => localStorage.getItem('familyCleanPreCleaningRating') || '');
    const [postCleaningRating, setPostCleaningRating] = useState(() => localStorage.getItem('familyCleanPostCleaningRating') || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const startTimeRef = useRef(Date.now());

    // Effect to determine rotating chore and initialize checklist state
    useEffect(() => {
        const weekNumber = getWeekNumber();
        const choreIndex = (weekNumber - 1) % rotatingChores.length;
        const selectedChore = rotatingChores[choreIndex];
        setCurrentRotatingChore(selectedChore);

        const initialCheckedState = {};
        [...familyCleanItems, selectedChore].forEach(item => {
            if (item) initialCheckedState[item] = false;
        });

        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('familyCleanCheckedItems');
            if (saved) {
                try {
                    const savedItems = JSON.parse(saved);
                    Object.keys(initialCheckedState).forEach(item => {
                        if (savedItems.hasOwnProperty(item)) {
                            initialCheckedState[item] = savedItems[item];
                        }
                    });
                } catch (e) { console.error("Error parsing saved checklist items:", e); }
            }
        }
        setCheckedItems(initialCheckedState);

    }, []); // Run only once on mount

    // Effect for LocalStorage Persistence
    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (Object.keys(checkedItems).length > 0) {
                 localStorage.setItem('familyCleanCheckedItems', JSON.stringify(checkedItems));
            }
            localStorage.setItem('familyCleanPreCleaningRating', preCleaningRating);
            localStorage.setItem('familyCleanPostCleaningRating', postCleaningRating);
            localStorage.setItem('familyCleanDishesPerson', dishesPerson);
            localStorage.setItem('familyCleanLaundryPerson', laundryPerson);
            localStorage.setItem('familyCleanFloorsPerson', floorsPerson);
            localStorage.setItem('familyCleanBathroomsPerson', bathroomsPerson);
            localStorage.setItem('familyCleanTrashPerson', trashPerson);
            localStorage.setItem('familyCleanRecyclingPerson', recyclingPerson);
            localStorage.setItem('familyCleanSurfacesPerson', surfacesPerson);
            // <<< Save rotating chore person >>>
            localStorage.setItem('familyCleanRotatingChorePerson', rotatingChorePerson);
        }
    // Updated dependencies
    }, [checkedItems, preCleaningRating, postCleaningRating, dishesPerson, laundryPerson, floorsPerson, bathroomsPerson, trashPerson, recyclingPerson, surfacesPerson, rotatingChorePerson /* Added rotatingChorePerson */]);


    // == Handlers ==
    const handleCheckboxChange = (event) => {
        const { name, checked } = event.target;
        setCheckedItems(prevItems => ({ ...prevItems, [name]: checked }));
    };

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        if (name === 'preCleaningRating') setPreCleaningRating(value);
        else if (name === 'postCleaningRating') setPostCleaningRating(value);
    };

    const handleDropdownChange = (event) => {
        const { name, value } = event.target;
        const stateSetters = {
            dishesPerson: setDishesPerson,
            laundryPerson: setLaundryPerson,
            floorsPerson: setFloorsPerson,
            bathroomsPerson: setBathroomsPerson,
            trashPerson: setTrashPerson,
            recyclingPerson: setRecyclingPerson,
            surfacesPerson: setSurfacesPerson,
            // <<< Add rotating chore person setter >>>
            rotatingChorePerson: setRotatingChorePerson,
        };
        // Construct the expected name based on the rotating chore text if needed
        // Or pass a specific name attribute to the rotating chore dropdown
        const setter = stateSetters[name];
        if (setter) {
            setter(value);
        } else {
             console.warn("Unhandled dropdown change:", name);
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

        const baseFormData = {
            type: 'familyCleanRoutine',
            checklist: completedChecklistItems,
            rotatingChoreForTheWeek: currentRotatingChore,
            preCleaningRating: preCleaningRating.trim() ? Number(preCleaningRating) : null,
            postCleaningRating: postCleaningRating.trim() ? Number(postCleaningRating) : null,
            dishesPerson: dishesPerson,
            laundryPerson: laundryPerson,
            floorsPerson: floorsPerson,
            bathroomsPerson: bathroomsPerson,
            trashPerson: trashPerson,
            recyclingPerson: recyclingPerson,
            surfacesPerson: surfacesPerson,
            // <<< Add rotating chore person to data >>>
            rotatingChorePerson: rotatingChorePerson,
            durationMinutes: durationMinutes,
            completedAt: serverTimestamp()
        };

        console.log("Attempting to save Family Clean Routine Data:", baseFormData);

        try {
            const routineDocRef = await addDoc(collection(db, "familyCleanLogs"), baseFormData);
            console.log("Family Clean Routine Log Document written with ID: ", routineDocRef.id);

            // Clear relevant localStorage on successful submit
            localStorage.removeItem('familyCleanCheckedItems');
            localStorage.removeItem('familyCleanPreCleaningRating');
            localStorage.removeItem('familyCleanPostCleaningRating');
            localStorage.removeItem('familyCleanRotatingChorePerson'); // Clear rotating chore person
            // Optionally keep person assignments or clear them too

            if (onSubmit) {
                onSubmit(baseFormData);
            }
            if (onClose) {
                onClose();
            }
        } catch (e) {
            console.error("Error adding document: ", e);
            setSubmitError("Failed to save Family Clean routine. Please try again.");
            setIsSubmitting(false);
        }
    };

    // Combine static and rotating chores for rendering
    const allChecklistItems = [...familyCleanItems, currentRotatingChore];
    const uniqueChecklistItems = allChecklistItems.filter((item, index, self) =>
        item && self.indexOf(item) === index
    );
     // Define which items should have a dropdown (including the rotating one)
     const itemsWithDropdown = ["Dishes", "Laundry", "Floors", "Bathrooms", "Trash", "Recycling", "Surfaces", currentRotatingChore];


    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <h3 className={styles.formTitle}>Family Clean</h3>

            {/* Rotating Chore Display */}
            <div className={styles.rotatingChoreSection}>
                <h4 className={styles.sectionTitle}>This Week's Rotating Chore:</h4>
                <p className={styles.rotatingChoreText}>{currentRotatingChore || 'Calculating...'}</p>
            </div>

            {/* Checklist Section */}
            <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Checklist:</h4>
                {uniqueChecklistItems.map((item) => (
                    <div key={item} className={styles.checkItem}>
                        <input
                            type="checkbox"
                            id={`familyClean-${item.replace(/\s+/g, '-')}`}
                            name={item}
                            checked={!!checkedItems[item]}
                            onChange={handleCheckboxChange}
                            className={styles.checkbox}
                            disabled={isSubmitting}
                        />
                        <label htmlFor={`familyClean-${item.replace(/\s+/g, '-')}`}>{item}</label>
                         {/* UPDATED: Conditionally render dropdown for static AND rotating chore */}
                         {itemsWithDropdown.includes(item) && (
                             <select
                                 // Use a consistent name for the rotating chore dropdown state
                                 name={item === currentRotatingChore ? 'rotatingChorePerson' : `${item.toLowerCase().replace(/\s+/g, '')}Person`}
                                 value={
                                     item === currentRotatingChore ? rotatingChorePerson :
                                     item === "Dishes" ? dishesPerson :
                                     item === "Laundry" ? laundryPerson :
                                     item === "Floors" ? floorsPerson :
                                     item === "Bathrooms" ? bathroomsPerson :
                                     item === "Trash" ? trashPerson :
                                     item === "Recycling" ? recyclingPerson :
                                     item === "Surfaces" ? surfacesPerson : ''
                                 }
                                 onChange={handleDropdownChange}
                                 disabled={isSubmitting}
                                 className={styles.personDropdown}
                             >
                                 <option value="">Select Person</option>
                                 {people.map(person => (
                                     <option key={person} value={person}>{person}</option>
                                 ))}
                             </select>
                         )}
                    </div>
                ))}
            </div>

            {/* Ratings Section */}
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Ratings:</h4>
               <div className={styles.inputField}>
                   <label htmlFor="preCleaningRating">Pre-Cleaning Rating (1-5):</label>
                   <input
                       type="number"
                       id="preCleaningRating"
                       name="preCleaningRating"
                       value={preCleaningRating}
                       onChange={handleInputChange}
                       min="1" max="5"
                       className={styles.numberInput}
                       disabled={isSubmitting}
                   />
               </div>
               <div className={styles.inputField}>
                   <label htmlFor="postCleaningRating">Post-Cleaning Rating (1-5):</label>
                   <input
                       type="number"
                       id="postCleaningRating"
                       name="postCleaningRating"
                       value={postCleaningRating}
                       onChange={handleInputChange}
                       min="1" max="5"
                       className={styles.numberInput}
                       disabled={isSubmitting}
                   />
               </div>
            </div>

            {/* Display submission error if it exists */}
            {submitError && <p className={styles.errorText}>Error: {submitError}</p>}
            {/* Disable button while submitting */}
            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Complete Family Clean Routine'}
            </button>
        </form>
    );
}

export default FamilyCleanForm;
