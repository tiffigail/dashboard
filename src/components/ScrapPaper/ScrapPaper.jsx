// src/components/ScrapPaper/ScrapPaper.jsx
import React, { useState, useCallback } from 'react';
import { db } from '../../firebaseConfig'; // Adjust path as needed
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore";

// Helper to format Firestore Timestamp or JS Date to a readable string
const formatDateForDisplay = (dateFieldValue) => {
    if (!dateFieldValue) return 'N/A';
    // Check if it's a Firestore Timestamp
    if (dateFieldValue.toDate) {
        return dateFieldValue.toDate().toLocaleString();
    }
    // Check if it's already a JS Date object (e.g., from new Date())
    if (dateFieldValue instanceof Date) {
        return dateFieldValue.toLocaleString();
    }
    // If it's a string, try to parse it (basic ISO 8601 support)
    if (typeof dateFieldValue === 'string') {
        const d = new Date(dateFieldValue);
        if (!isNaN(d.getTime())) {
            return d.toLocaleString();
        }
    }
    return 'Invalid Date';
};

// Helper to get today's date in YYYY-MM-DD format for input default
const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- MODIFIED: Accept onNavigate as a prop ---
function ScrapPaper({ onNavigate }) { // <--- onNavigate prop
    const [recentBreakLogs, setRecentBreakLogs] = useState([]);
    const [breakLogsLoading, setBreakLogsLoading] = useState(false);
    const [breakLogsError, setBreakLogsError] = useState(null);

    const [dailyMetricInputDate, setDailyMetricInputDate] = useState(getTodayDateString());
    const [specificDailyMetric, setSpecificDailyMetric] = useState(null);
    const [dailyMetricLoading, setDailyMetricLoading] = useState(false);
    const [dailyMetricError, setDailyMetricError] = useState(null);
    const [searchedMetricDate, setSearchedMetricDate] = useState(''); // To display the date that was searched

    const [epiphaniesList, setEpiphaniesList] = useState([]);
    const [despairsList, setDespairsList] = useState([]);
    const [reflectionsLoading, setReflectionsLoading] = useState(false);
    const [reflectionsError, setReflectionsError] = useState(null);
    const [reflectionsFetched, setReflectionsFetched] = useState(false);


    const fetchRecentBreakLogs = useCallback(async () => {
        setBreakLogsLoading(true);
        setBreakLogsError(null);
        try {
            const logsCollection = collection(db, "pomodoroCycleLogs");
            const q = query(logsCollection, orderBy("logSubmittedAt", "desc"), limit(3));
            const querySnapshot = await getDocs(q);
            const logs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRecentBreakLogs(logs);
        } catch (err) {
            console.error("Error fetching recent break logs:", err);
            setBreakLogsError("Failed to fetch recent break logs. " + err.message);
        }
        setBreakLogsLoading(false);
    }, []);

    const fetchDailyMetricByDate = useCallback(async (dateString) => {
        if (!dateString) {
            setDailyMetricError("Please enter a valid date in YYYY-MM-DD format.");
            setSpecificDailyMetric(null);
            setSearchedMetricDate('');
            return;
        }
        setDailyMetricLoading(true);
        setDailyMetricError(null);
        setSpecificDailyMetric(null);
        setSearchedMetricDate(dateString); // Store the date that is being searched

        try {
            // The document ID in 'dailyMetrics' is the date string itself (e.g., "2023-10-26")
            const docRef = doc(db, "dailyMetrics", dateString);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setSpecificDailyMetric({ id: docSnap.id, ...docSnap.data() });
            } else {
                setSpecificDailyMetric(null); // Explicitly set to null if not found
                setDailyMetricError(`No daily metric found for ${dateString}.`);
            }
        } catch (err) {
            console.error("Error fetching daily metric:", err);
            setDailyMetricError("Failed to fetch daily metric. " + err.message);
            setSpecificDailyMetric(null);
        }
        setDailyMetricLoading(false);
    }, []);


    const fetchAllEpiphaniesAndDespairs = useCallback(async () => {
        setReflectionsLoading(true);
        setReflectionsError(null);
        setReflectionsFetched(false);
        try {
            const epiphaniesCol = collection(db, "epiphanies");
            const despairsCol = collection(db, "despairs");

            const epiphaniesQuery = query(epiphaniesCol, orderBy("timestamp", "desc"));
            const despairsQuery = query(despairsCol, orderBy("timestamp", "desc"));

            const [epiphaniesSnapshot, despairsSnapshot] = await Promise.all([
                getDocs(epiphaniesQuery),
                getDocs(despairsQuery)
            ]);

            const epiphanies = epiphaniesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const despairs = despairsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            setEpiphaniesList(epiphanies);
            setDespairsList(despairs);
            setReflectionsFetched(true);
        } catch (err) {
            console.error("Error fetching reflections:", err);
            setReflectionsError("Failed to fetch reflections. " + err.message);
        }
        setReflectionsLoading(false);
    }, []);


    // Style constants
    const sectionStyle = { marginBottom: '40px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' };
    const h2Style = { marginTop: '0', borderBottom: '1px solid #eee', paddingBottom: '10px', color: '#333' };
    const buttonStyle = {
        padding: '10px 15px',
        fontSize: '1em',
        cursor: 'pointer',
        marginRight: '10px',
        marginBottom: '10px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        transition: 'background-color 0.2s ease'
    };
    const buttonDisabledStyle = { ...buttonStyle, backgroundColor: '#0056b3', cursor: 'not-allowed' };
    const preStyle = { backgroundColor: '#eee', padding: '15px', borderRadius: '4px', overflowX: 'auto', whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontSize: '0.9em' };
    const listStyle = { listStyleType: 'none', paddingLeft: '0' };
    const listItemStyle = { marginBottom: '10px', padding: '10px', border: '1px solid #eee', borderRadius: '4px', backgroundColor: 'white' };
    const errorStyle = { color: 'red', marginTop: '10px' };
    const inputStyle = { padding: '10px', fontSize: '1em', border: '1px solid #ccc', borderRadius: '4px', marginRight: '10px', marginBottom: '10px' };

    // --- ADDED: Handler for navigating to Project Map Generator ---
    const handleNavigateToMapGenerator = () => {
        if (onNavigate) {
            // Use a string key that your App.js or parent navigator component
            // will recognize to switch to the ProjectMapGenerator component.
            onNavigate('ProjectMapGenerator');
        } else {
            console.warn("onNavigate prop is not provided to ScrapPaper component.");
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', lineHeight: '1.6', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ textAlign: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', color: '#333' }}>
                Firestore Data Scrap Paper 📝
            </h1>
            <p style={{ textAlign: 'center', color: '#555', marginBottom: '20px' }}>
                This component demonstrates fetching data and can be used to launch experimental views or tools.
            </p>

            {/* --- ADDED: Section for Experimental Tools --- */}
            <div style={sectionStyle}>
                <h2 style={h2Style}>Experimental Tools</h2>
                <button
                    onClick={handleNavigateToMapGenerator}
                    style={buttonStyle}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
                >
                    Go to Project Map Generator
                </button>
                <p style={{fontSize: '0.9em', color: '#666', marginTop: '10px'}}>
                    Click the button above to navigate to the AI-powered Project Map Generator tool.
                </p>
            </div>


            {/* --- Section 1: Recent Break Logs --- */}
            <div style={sectionStyle}>
                <h2 style={h2Style}>Example 1: Fetch Recent Break Logs</h2>
                <button
                    onClick={fetchRecentBreakLogs}
                    disabled={breakLogsLoading}
                    style={breakLogsLoading ? buttonDisabledStyle : buttonStyle}
                    onMouseOver={(e) => !breakLogsLoading && (e.currentTarget.style.backgroundColor = '#0056b3')}
                    onMouseOut={(e) => !breakLogsLoading && (e.currentTarget.style.backgroundColor = '#007bff')}
                >
                    {breakLogsLoading ? 'Loading Logs...' : 'Fetch Last 3 Break Logs'}
                </button>
                {breakLogsError && <p style={errorStyle}>Error: {breakLogsError}</p>}
                {recentBreakLogs.length > 0 && (
                    <ul style={listStyle}>
                        {recentBreakLogs.map(log => (
                            <li key={log.id} style={listItemStyle}>
                                <strong>Submitted:</strong> {formatDateForDisplay(log.logSubmittedAt)} <br />
                                <strong>Duration:</strong> {log.workPeriodDurationMinutes} mins <br />
                                <strong>Tasks Completed:</strong> {log.workPeriodTasksCompleted} <br />
                                <strong>Nature of Work:</strong> {log.workPeriodNature} <br />
                                <strong>Break Activity:</strong> {log.breakActivityText} ({log.breakDurationMinutes} mins)
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* --- Section 2: Specific Daily Metric --- */}
            <div style={sectionStyle}>
                <h2 style={h2Style}>Example 2: Fetch a Specific Daily Metric</h2>
                <input
                    type="text" // Could be type="date" for better UX if desired
                    value={dailyMetricInputDate}
                    onChange={(e) => setDailyMetricInputDate(e.target.value)}
                    placeholder="YYYY-MM-DD"
                    style={inputStyle}
                />
                <button
                    onClick={() => fetchDailyMetricByDate(dailyMetricInputDate)}
                    disabled={dailyMetricLoading}
                    style={dailyMetricLoading ? buttonDisabledStyle : buttonStyle}
                    onMouseOver={(e) => !dailyMetricLoading && (e.currentTarget.style.backgroundColor = '#0056b3')}
                    onMouseOut={(e) => !dailyMetricLoading && (e.currentTarget.style.backgroundColor = '#007bff')}
                >
                    {dailyMetricLoading ? 'Loading Metric...' : 'Fetch Daily Metric'}
                </button>
                {dailyMetricError && <p style={errorStyle}>Error: {dailyMetricError}</p>}
                {searchedMetricDate && !specificDailyMetric && !dailyMetricLoading && !dailyMetricError && (
                    <p>No metric found for {searchedMetricDate}.</p>
                )}
                {specificDailyMetric && (
                    <div style={{ marginTop: '15px' }}>
                        <h3>Metric for {searchedMetricDate}:</h3>
                        <pre style={preStyle}>{JSON.stringify(specificDailyMetric, null, 2)}</pre>
                    </div>
                )}
            </div>

            {/* --- Section 3: All Epiphanies and Despairs --- */}
            <div style={sectionStyle}>
                <h2 style={h2Style}>Example 3: All Epiphanies & Despairs</h2>
                <button
                    onClick={fetchAllEpiphaniesAndDespairs}
                    disabled={reflectionsLoading}
                    style={reflectionsLoading ? buttonDisabledStyle : buttonStyle}
                    onMouseOver={(e) => !reflectionsLoading && (e.currentTarget.style.backgroundColor = '#0056b3')}
                    onMouseOut={(e) => !reflectionsLoading && (e.currentTarget.style.backgroundColor = '#007bff')}
                >
                    {reflectionsLoading ? 'Loading Reflections...' : 'Fetch Epiphanies & Despairs'}
                </button>
                {reflectionsError && <p style={errorStyle}>Error: {reflectionsError}</p>}
                {reflectionsFetched && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px' }}>
                        <div style={{ width: '48%' }}>
                            <h3>Epiphanies ({epiphaniesList.length})</h3>
                            {epiphaniesList.length > 0 ? (
                                <ul style={listStyle}>
                                    {epiphaniesList.map(item => (
                                        <li key={item.id} style={listItemStyle}>
                                            <p>{item.text}</p>
                                            <small><em>{formatDateForDisplay(item.timestamp)}</em></small>
                                        </li>
                                    ))}
                                </ul>
                            ) : <p>No epiphanies found.</p>}
                        </div>
                        <div style={{ width: '48%' }}>
                            <h3>Despairs ({despairsList.length})</h3>
                            {despairsList.length > 0 ? (
                                <ul style={listStyle}>
                                    {despairsList.map(item => (
                                        <li key={item.id} style={listItemStyle}>
                                            <p>{item.text}</p>
                                            <small><em>{formatDateForDisplay(item.timestamp)}</em></small>
                                        </li>
                                    ))}
                                </ul>
                            ) : <p>No despairs found.</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ScrapPaper;
