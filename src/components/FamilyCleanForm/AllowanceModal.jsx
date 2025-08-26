import React, { useState, useEffect, useCallback } from 'react';
import styles from './AllowanceModal.module.css';
import { db } from '../../firebaseConfig';
import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";

const DEDUCTION_PER_ITEM = 1.00;
const STARTING_ALLOWANCE = 20;

// Helper function to get the start date of a given week (Sunday at 00:00)
const getStartOfWeek = (date = new Date()) => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
};

// Helper to format a date as YYYY-MM-DD
const toYYYYMMDD = (date) => date.toISOString().split('T')[0];

function AllowanceModal({ people, cleaningAreas, onClose }) {
    const [trackerState, setTrackerState] = useState({ currentWeek: {}, lastWeek: {} });
    const [roomRatings, setRoomRatings] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // --- Main Data Fetching and Weekly Rollover Logic ---
    const fetchData = useCallback(async () => {
        setIsLoading(true);

        // --- 1. Get the Live Data for the Current Week ---
        const allowanceStateRef = doc(db, "allowances", "allowanceState");
        const allowanceStateSnap = await getDoc(allowanceStateRef);
        let currentWeekData = {};

        // Prepare a default state for a fresh week
        const defaultWeekState = {};
        people.forEach(person => {
            defaultWeekState[person] = { allowance: STARTING_ALLOWANCE, itemsLeftOut: '' };
        });

        if (allowanceStateSnap.exists()) {
            const savedState = allowanceStateSnap.data();
            const lastUpdate = savedState.lastUpdate.toDate();
            const startOfThisWeek = getStartOfWeek();

            // --- Weekly Rollover Check ---
            // If the last update was before this week started, it's time to log the old week.
            if (lastUpdate < startOfThisWeek) {
                const completedWeekStartDate = getStartOfWeek(lastUpdate);
                const logDateString = toYYYYMMDD(completedWeekStartDate);
                
                // Create the final log data for the completed week
                const finalAllowances = Object.entries(savedState.currentWeek).reduce((acc, [key, value]) => {
                    acc[key] = value.allowance;
                    return acc;
                }, {});

                // Create a new document in the historical logs
                const logDocRef = doc(db, "weeklyAllowanceLogs", logDateString);
                await setDoc(logDocRef, {
                    weekOf: completedWeekStartDate,
                    finalAllowances: finalAllowances
                });

                // The new "current week" is the default, fresh state
                currentWeekData = defaultWeekState;
                // Update the live state document to reflect the new week
                await setDoc(allowanceStateRef, {
                    currentWeek: defaultWeekState,
                    lastUpdate: new Date()
                });

            } else {
                // We're still in the same week, so just use the saved data.
                currentWeekData = savedState.currentWeek;
            }
        } else {
            // Document doesn't exist, so this is the very first run.
            currentWeekData = defaultWeekState;
            await setDoc(allowanceStateRef, {
                currentWeek: defaultWeekState,
                lastUpdate: new Date()
            });
        }

        // --- 2. Get the Most Recent Historical Log for "Last Week" Display ---
        const logsCollectionRef = collection(db, "weeklyAllowanceLogs");
        const q = query(logsCollectionRef, orderBy("weekOf", "desc"), limit(1));
        const querySnapshot = await getDocs(q);
        
        let lastWeekData = {};
        if (!querySnapshot.empty) {
            const mostRecentLog = querySnapshot.docs[0].data().finalAllowances;
            // Format it to match the structure our UI expects
            people.forEach(person => {
                lastWeekData[person] = { allowance: mostRecentLog[person] || STARTING_ALLOWANCE };
            });
        }

        setTrackerState({ currentWeek: currentWeekData, lastWeek: lastWeekData });
        
        // --- 3. Fetch Today's Room Ratings ---
        const today = toYYYYMMDD(new Date());
        const ratingsDocRef = doc(db, "roomRatings", today);
        const ratingsDocSnap = await getDoc(ratingsDocRef);
        setRoomRatings(ratingsDocSnap.exists() ? ratingsDocSnap.data().ratings || {} : {});

        setIsLoading(false);
    }, [people]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleItemsChange = (personName, value) => {
        const numValue = Math.max(0, parseInt(value, 10));
        setTrackerState(prev => ({
            ...prev,
            currentWeek: {
                ...prev.currentWeek,
                [personName]: { ...prev.currentWeek[personName], itemsLeftOut: isNaN(numValue) ? '' : numValue.toString() }
            }
        }));
    };

    const handleDeduct = async (personName) => {
        const personData = trackerState.currentWeek[personName];
        const items = parseInt(personData.itemsLeftOut || 0, 10);
        if (isNaN(items) || items <= 0) return;

        const newAllowance = Math.max(0, personData.allowance - (items * DEDUCTION_PER_ITEM));
        
        const newCurrentWeekState = {
            ...trackerState.currentWeek,
            [personName]: {
                ...trackerState.currentWeek[personName],
                allowance: newAllowance,
                itemsLeftOut: ''
            }
        };

        setTrackerState(prev => ({ ...prev, currentWeek: newCurrentWeekState }));

        // Update the live state document in Firestore
        const allowanceStateRef = doc(db, "allowances", "allowanceState");
        await setDoc(allowanceStateRef, {
            currentWeek: newCurrentWeekState,
            lastUpdate: new Date()
        }, { merge: true });
    };

    const handleRatingChange = (roomName, value) => {
        const ratingValue = value === '' ? null : Math.max(1, Math.min(10, Number(value)));
        setRoomRatings(prev => ({ ...prev, [roomName]: ratingValue }));
    };

    const handleSaveRatings = async () => {
        setIsSaving(true);
        const today = toYYYYMMDD(new Date());
        const ratingsDocRef = doc(db, "roomRatings", today);
        
        const finalRatings = Object.entries(roomRatings).reduce((acc, [key, value]) => {
            if (value !== null && value !== '') acc[key] = value;
            return acc;
        }, {});
    
        const allowanceSnapshot = Object.entries(trackerState.currentWeek).reduce((acc, [key, value]) => {
            acc[key] = value.allowance;
            return acc;
        }, {});

        const dataToSave = {
            ratings: finalRatings,
            allowanceSnapshot: allowanceSnapshot,
            lastUpdatedAt: new Date()
        };

        await setDoc(ratingsDocRef, dataToSave, { merge: true });
        setIsSaving(false);
        alert("Room ratings and allowance snapshot saved!");
    };

    if (isLoading) {
        return <div className={styles.modalOverlay}><div className={styles.modalContent}>Loading...</div></div>;
    }

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h3 className={styles.modalTitle}>Allowance & Ratings Dashboard</h3>
                    <button onClick={onClose} className={styles.closeButton}>×</button>
                </div>
                <div className={styles.dashboardLayout}>
                    <div className={styles.leftColumn}>
                        <div className={styles.section}>
                            <h4 className={styles.sectionTitle}>This Week's Allowance</h4>
                            <div className={styles.trackerContainer}>
                                {people.map(personName => (
                                    <div key={personName} className={styles.personTracker}>
                                        <span className={styles.personName}>{personName}</span>
                                        <span className={styles.allowanceTotal}>${(trackerState.currentWeek[personName]?.allowance || 0).toFixed(2)}</span>
                                        <div className={styles.deductionControls}>
                                            <input type="number" min="0" placeholder="#" value={trackerState.currentWeek[personName]?.itemsLeftOut || ''} onChange={(e) => handleItemsChange(personName, e.target.value)} className={styles.itemsInput}/>
                                            <button onClick={() => handleDeduct(personName)} className={styles.deductButton}>Deduct</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className={`${styles.section} ${styles.lastWeekSection}`}>
                            <h4 className={styles.sectionTitle}>Last Week's Final Totals</h4>
                            <div className={styles.trackerContainer}>
                                {people.map(personName => (
                                    <div key={personName} className={`${styles.personTracker} ${styles.lastWeekTracker}`}>
                                        <span className={styles.personName}>{personName}</span>
                                        <span className={styles.allowanceTotalLastWeek}>${(trackerState.lastWeek[personName]?.allowance || 0).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className={styles.rightColumn}>
                        <h4 className={styles.sectionTitle}>Daily Room Ratings (1-10)</h4>
                        <div className={styles.ratingsGrid}>
                            {cleaningAreas.map(area => (
                                <div key={area.name} className={styles.ratingItem}>
                                    <label className={styles.ratingLabel}>{area.name}</label>
                                    <input type="number" min="1" max="10" value={roomRatings[area.name] || ''} onChange={(e) => handleRatingChange(area.name, e.target.value)} className={styles.ratingInput} placeholder="-"/>
                                </div>
                            ))}
                        </div>
                        <div className={styles.modalFooter}>
                            <button onClick={handleSaveRatings} className={styles.saveButton} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save Ratings'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AllowanceModal;