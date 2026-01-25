import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './AllowanceModal.module.css';
import { db } from '../../firebaseConfig';
import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs, where, Timestamp } from "firebase/firestore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts';
import Modal from '../Modal/Modal';
import FamilyCleaningStats from './FamilyCleanStats.jsx';

const DEDUCTION_PER_ITEM = 1.00;
const STARTING_ALLOWANCE = 20;

// Helper functions
const getStartOfWeek = (date = new Date()) => { const d = new Date(date); d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d; };
const toYYYYMMDD = (date) => date.toISOString().split('T')[0];
const toMMDD = (date) => { const d = new Date(date); const month = (d.getMonth() + 1).toString().padStart(2, '0'); const day = d.getDate().toString().padStart(2, '0'); return `${month}/${day}`; };

// Chart Components
const RoomRatingsChart = ({ data, isZoomed = false }) => { return ( <ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={isZoomed ? { top: 20, right: 30, left: 0, bottom: 120 } : { top: 5, right: 10, left: -20, bottom: 85 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" /><XAxis dataKey="name" angle={-60} textAnchor="end" interval={0} stroke="#4B5563" height={50} /><YAxis domain={[0, 10]} stroke="#4B5563" /><Tooltip cursor={{fill: 'rgba(0, 0, 0, 0.05)'}} contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', border: '1px solid #ccc', color: '#333' }} labelStyle={{ color: '#337487ff', fontWeight: 'bold' }} /><Legend verticalAlign="top" wrapperStyle={{ color: '#4B5563', marginBottom: '10px' }}/><Bar dataKey="average" fill="#d9b606ff" name="6-Month Average" barSize={30} /><Bar dataKey="latest" fill="#408093ff" name="Most Recent" barSize={15} /></BarChart></ResponsiveContainer> ); };
const AllowanceHistoryChart = ({ data, people }) => { const colors = ['#059669', '#337487ff', '#d9b606ff']; return ( <ResponsiveContainer width="100%" height={250}><BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 40 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" /><XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} stroke="#4B5563" height={50}><Label value="Week Of" offset={-25} position="insideBottom" fill="#4B5563" /></XAxis><YAxis stroke="#4B5563"><Label value="Allowance ($)" angle={-90} position="insideLeft" fill="#4B5563" /></YAxis><Tooltip cursor={{fill: 'rgba(0, 0, 0, 0.05)'}} contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', border: '1px solid #ccc', color: '#333' }} labelStyle={{ color: '#92400E', fontWeight: 'bold' }} /><Legend verticalAlign="top" wrapperStyle={{ color: '#4B5563', marginBottom: '10px' }} />{people.map((person, index) => (<Bar key={person} dataKey={person} fill={colors[index % colors.length]} name={person} />))}</BarChart></ResponsiveContainer> ); };


// --- onNavigate has been REMOVED from the function signature ---
function AllowanceModal({ people, cleaningAreas, onClose }) {
    const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
    const [trackerState, setTrackerState] = useState({ currentWeek: {}, lastWeek: {} });
    const [weeklyCleaningTime, setWeeklyCleaningTime] = useState({});
    const [roomRatings, setRoomRatings] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [roomImages, setRoomImages] = useState({});
    const [roomChartData, setRoomChartData] = useState([]);
    const [allowanceChartData, setAllowanceChartData] = useState([]);
    const [isRoomChartModalOpen, setIsRoomChartModalOpen] = useState(false);
    const [isAllowanceChartModalOpen, setIsAllowanceChartModalOpen] = useState(false);
    
    // --- FIX: This ref prevents the data from re-fetching after you clear the ratings ---
    const hasFetched = useRef(false);

    const fetchData = useCallback(async () => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        setIsLoading(true);
        
        const imageCollectionRef = collection(db, "images");
        const imageSnapshot = await getDocs(imageCollectionRef);
        const imagesData = {};
        imageSnapshot.forEach(doc => { const data = doc.data(); if (data.associatedRoom && data.imageUrl) { imagesData[data.associatedRoom] = data.imageUrl; } });
        setRoomImages(imagesData);

        const allowanceStateRef = doc(db, "allowances", "allowanceState");
        const allowanceStateSnap = await getDoc(allowanceStateRef);
        let currentWeekData = {};
        const defaultWeekState = {};
        people.forEach(person => { defaultWeekState[person] = { allowance: STARTING_ALLOWANCE, itemsLeftOut: '' }; });

        if (allowanceStateSnap.exists()) {
            const savedState = allowanceStateSnap.data();
            const lastUpdate = savedState.lastUpdate.toDate();
            const startOfThisWeek = getStartOfWeek();

            if (lastUpdate < startOfThisWeek) {
                const completedWeekStartDate = getStartOfWeek(lastUpdate);
                const completedWeekEndDate = new Date(completedWeekStartDate);
                completedWeekEndDate.setDate(completedWeekStartDate.getDate() + 6);
                const logsRef = collection(db, "familyCleanLogs");
                const q = query(logsRef, where("completedAt", ">=", Timestamp.fromDate(completedWeekStartDate)), where("completedAt", "<=", Timestamp.fromDate(completedWeekEndDate)));
                const logsSnapshot = await getDocs(q);
                const totalCleaningTime = Object.fromEntries(people.map(p => [p, 0]));
                logsSnapshot.forEach(doc => { const log = doc.data(); if (log.cleanerName && totalCleaningTime.hasOwnProperty(log.cleanerName)) { totalCleaningTime[log.cleanerName] += log.durationMinutes || 0; } });
                const logDateString = toYYYYMMDD(completedWeekStartDate);
                const finalAllowances = Object.entries(savedState.currentWeek).reduce((acc, [key, value]) => { acc[key] = value.allowance; return acc; }, {});
                const logDocRef = doc(db, "weeklyAllowanceLogs", logDateString);
                await setDoc(logDocRef, { weekOf: completedWeekStartDate, finalAllowances: finalAllowances, totalCleaningTime: totalCleaningTime });
                currentWeekData = defaultWeekState;
                await setDoc(allowanceStateRef, { currentWeek: defaultWeekState, lastUpdate: new Date() });
            } else {
                currentWeekData = savedState.currentWeek;
            }
        } else {
            currentWeekData = defaultWeekState;
            await setDoc(allowanceStateRef, { currentWeek: defaultWeekState, lastUpdate: new Date() });
        }

        const startOfCurrentWeek = getStartOfWeek();
        const endOfCurrentWeek = new Date();
        const currentLogsRef = collection(db, "familyCleanLogs");
        const qCurrent = query(currentLogsRef, where("completedAt", ">=", Timestamp.fromDate(startOfCurrentWeek)), where("completedAt", "<=", Timestamp.fromDate(endOfCurrentWeek)));
        const currentLogsSnapshot = await getDocs(qCurrent);
        const currentCleaningTime = Object.fromEntries(people.map(p => [p, 0]));
        currentLogsSnapshot.forEach(doc => { const log = doc.data(); if (log.cleanerName && currentCleaningTime.hasOwnProperty(log.cleanerName)) { currentCleaningTime[log.cleanerName] += log.durationMinutes || 0; } });
        setWeeklyCleaningTime(currentCleaningTime);

        const logsCollectionRef = collection(db, "weeklyAllowanceLogs");
        const qLogs = query(logsCollectionRef, orderBy("weekOf", "desc"), limit(1));
        const querySnapshot = await getDocs(qLogs);
        let lastWeekData = {};
        people.forEach(person => { lastWeekData[person] = { allowance: 0 }; });
        if (!querySnapshot.empty) { const mostRecentLog = querySnapshot.docs[0].data().finalAllowances; people.forEach(person => { lastWeekData[person] = { allowance: mostRecentLog[person] || 0 }; }); }
        setTrackerState({ currentWeek: currentWeekData, lastWeek: lastWeekData });
        const today = toYYYYMMDD(new Date());
        const ratingsDocRef = doc(db, "roomRatings", today);
        const ratingsDocSnap = await getDoc(ratingsDocRef);
        setRoomRatings(ratingsDocSnap.exists() ? ratingsDocSnap.data().ratings || {} : {});
        const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6); const sixMonthsAgoTimestamp = Timestamp.fromDate(sixMonthsAgo);
        const roomRatingsQuery = query(collection(db, "roomRatings"), where("lastUpdatedAt", ">=", sixMonthsAgoTimestamp));
        const roomRatingsSnapshot = await getDocs(roomRatingsQuery);
        const ratingsByRoom = {}; const latestRatings = {};
        roomRatingsSnapshot.forEach(doc => { const data = doc.data(); const date = data.lastUpdatedAt.toDate(); Object.entries(data.ratings).forEach(([roomName, rating]) => { if (!ratingsByRoom[roomName]) { ratingsByRoom[roomName] = []; } ratingsByRoom[roomName].push(rating); if (!latestRatings[roomName] || date > latestRatings[roomName].date) { latestRatings[roomName] = { rating, date }; } }); });
        const processedRoomChartData = cleaningAreas.map(area => { const ratings = ratingsByRoom[area.name]; const average = ratings ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0; const latest = latestRatings[area.name] ? latestRatings[area.name].rating : 0; return { name: area.name, average: parseFloat(average.toFixed(1)), latest: latest }; }).sort((a, b) => b.average - a.average);
        setRoomChartData(processedRoomChartData);
        const threeMonthsAgo = new Date(); threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3); const threeMonthsAgoTimestamp = Timestamp.fromDate(threeMonthsAgo);
        const allowanceLogsQuery = query(collection(db, "weeklyAllowanceLogs"), where("weekOf", ">=", threeMonthsAgoTimestamp), orderBy("weekOf", "asc"));
        const allowanceLogsSnapshot = await getDocs(allowanceLogsQuery);
        const processedAllowanceChartData = allowanceLogsSnapshot.docs.map(doc => { const data = doc.data(); const weekDate = data.weekOf.toDate(); const weekLabel = toMMDD(weekDate); const allowances = { name: weekLabel }; people.forEach(person => { allowances[person] = data.finalAllowances[person] || 0; }); return allowances; });
        const currentWeekLabel = `Current (${toMMDD(getStartOfWeek())})`;
        const currentWeekAllowances = { name: currentWeekLabel };
        people.forEach(person => { currentWeekAllowances[person] = currentWeekData[person]?.allowance || STARTING_ALLOWANCE; });
        processedAllowanceChartData.push(currentWeekAllowances);
        setAllowanceChartData(processedAllowanceChartData);

        setIsLoading(false);
    }, [people, cleaningAreas]);

    useEffect(() => { fetchData(); }, [fetchData]);
    
    const handleItemsChange = (personName, value) => { const numValue = Math.max(0, parseInt(value, 10)); setTrackerState(prev => ({ ...prev, currentWeek: { ...prev.currentWeek, [personName]: { ...prev.currentWeek[personName], itemsLeftOut: isNaN(numValue) ? '' : numValue.toString() } } })); };
    const handleDeduct = async (personName) => { const personData = trackerState.currentWeek[personName]; const items = parseInt(personData.itemsLeftOut || 0, 10); if (isNaN(items) || items <= 0) return; const newAllowance = Math.max(0, personData.allowance - (items * DEDUCTION_PER_ITEM)); const newCurrentWeekState = { ...trackerState.currentWeek, [personName]: { ...trackerState.currentWeek[personName], allowance: newAllowance, itemsLeftOut: '' } }; setTrackerState(prev => ({ ...prev, currentWeek: newCurrentWeekState })); const allowanceStateRef = doc(db, "allowances", "allowanceState"); await setDoc(allowanceStateRef, { currentWeek: newCurrentWeekState, lastUpdate: new Date() }, { merge: true }); };
    const handleRatingChange = (roomName, value) => { const ratingValue = value === '' ? null : Math.max(1, Math.min(10, Number(value))); setRoomRatings(prev => ({ ...prev, [roomName]: ratingValue })); };
    const handleSaveRatings = async () => { setIsSaving(true); const today = toYYYYMMDD(new Date()); const ratingsDocRef = doc(db, "roomRatings", today); const finalRatings = Object.entries(roomRatings).reduce((acc, [key, value]) => { if (value !== null && value !== '') acc[key] = value; return acc; }, {}); const allowanceSnapshot = Object.entries(trackerState.currentWeek).reduce((acc, [key, value]) => { acc[key] = value.allowance; return acc; }, {}); const dataToSave = { ratings: finalRatings, allowanceSnapshot: allowanceSnapshot, lastUpdatedAt: new Date() }; await setDoc(ratingsDocRef, dataToSave, { merge: true }); setIsSaving(false); alert("Room ratings and allowance snapshot saved!"); setRoomRatings({}); };

    return (
        <>
            <div className={styles.modalOverlay}>
                <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.modalHeader}>
                        <h3 className={styles.modalTitle}>Allowance & Ratings Dashboard</h3>
                        <button onClick={onClose} className={styles.closeButton}>×</button>
                    </div>
                    <div className={styles.dashboardLayout}>
                        <div className={styles.leftColumn}>
                            <div className={styles.section}>
                                <h4 className={styles.sectionTitle}>Allowance Tracker</h4>
                                <div className={styles.trackerContainer}>
                                    {people.map(personName => (
                                        <div key={personName} className={styles.personTracker}>
                                            <span className={styles.personName}>{personName}</span>
                                            <div className={styles.allowanceDetails}><span className={styles.allowanceTotal}>${(trackerState.currentWeek[personName]?.allowance || 0).toFixed(2)}</span><span className={styles.lastWeekTotal}>(Last: ${(trackerState.lastWeek[personName]?.allowance || 0).toFixed(2)})</span></div>
                                            <div className={styles.cleaningTime}>{weeklyCleaningTime[personName] || 0} min</div>
                                            <div className={styles.deductionControls}><input type="number" min="0" placeholder="#" value={trackerState.currentWeek[personName]?.itemsLeftOut || ''} onChange={(e) => handleItemsChange(personName, e.target.value)} className={styles.itemsInput}/><button onClick={() => handleDeduct(personName)} className={styles.deductButton}>Deduct</button></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className={styles.section}>
                                <h4 className={styles.sectionTitle}>Allowance History (3 Months)</h4>
                                {isLoading ? <p>Loading allowance history...</p> : <div className={styles.chartContainer} onClick={() => setIsAllowanceChartModalOpen(true)}><AllowanceHistoryChart data={allowanceChartData} people={people} /></div>}
                            </div>
                        </div>
                        <div className={styles.rightColumn}>
                            <div className={`${styles.section} ${styles.fixedChartSection}`}>
                                <h4 className={styles.sectionTitle}>Room Rating Averages (6 Months)</h4>
                                {isLoading ? <p>Loading room rating chart...</p> : <div className={styles.chartContainer} onClick={() => setIsRoomChartModalOpen(true)}><RoomRatingsChart data={roomChartData} /></div>}
                            </div>
                            <div className={`${styles.section} ${styles.scrollableRatingsSection}`}>
                                <h4 className={styles.sectionTitle}>Daily Room Ratings (1-10)</h4>
                                <div className={styles.ratingsGrid}>
                                    {cleaningAreas.map(area => (
                                        <div key={area.name} className={styles.ratingItem}>
                                            {roomImages[area.name] && <img src={roomImages[area.name]} alt={area.name} className={styles.roomImage} />}
                                            <label className={styles.ratingLabel}>{area.name}</label>
                                            <input type="number" min="1" max="10" value={roomRatings[area.name] || ''} onChange={(e) => handleRatingChange(area.name, e.target.value)} className={styles.ratingInput} placeholder="-"/>
                                        </div>
                                    ))}
                                </div>
                                <div className={styles.modalFooter}><button onClick={handleSaveRatings} className={styles.saveButton} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Ratings'}</button></div>
                            </div>
                             <div className={styles.statsButtonContainer}>
                                    <button onClick={() => setIsStatsModalOpen(true)} className={styles.statsButton}>Family Cleaning Stats</button>
                                </div>
                        </div>
                    </div>
                </div>
            </div>
            {isRoomChartModalOpen && (<div className={styles.chartModalOverlay} onClick={() => setIsRoomChartModalOpen(false)}><div className={styles.chartModalContent} onClick={(e) => e.stopPropagation()}><h3 className={styles.chartModalTitle}>Room Rating Averages (Zoomed View)</h3><div className={styles.chartModalChartArea}><RoomRatingsChart data={roomChartData} isZoomed={true} /></div><button onClick={() => setIsRoomChartModalOpen(false)} className={styles.chartModalCloseButton}>Close</button></div></div>)}
            {isAllowanceChartModalOpen && (<div className={styles.chartModalOverlay} onClick={() => setIsAllowanceChartModalOpen(false)}><div className={styles.chartModalContent} onClick={(e) => e.stopPropagation()}><h3 className={styles.chartModalTitle}>Allowance History (3 Months Zoomed View)</h3><div className={styles.chartModalChartArea}><AllowanceHistoryChart data={allowanceChartData} people={people} isZoomed={true} /></div><button onClick={() => setIsAllowanceChartModalOpen(false)} className={styles.chartModalCloseButton}>Close</button></div></div>)}
            {isStatsModalOpen && (<Modal isOpen={isStatsModalOpen} onClose={() => setIsStatsModalOpen(false)} zIndex={1100}><FamilyCleaningStats people={people} onClose={() => setIsStatsModalOpen(false)} /></Modal>)}
        </>
    );
}

export default AllowanceModal;