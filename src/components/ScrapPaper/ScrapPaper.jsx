// src/components/ScrapPaper/ScrapPaper.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { db } from '../../firebaseConfig';
import {
    collection, query, where, orderBy, limit, getDocs, doc, getDoc,
    writeBatch, Timestamp, serverTimestamp, documentId
} from "firebase/firestore";

import ThemedChartView from '../ThemedChartView/ThemedChartView';
import WordCloudDisplay from '../WordCloudDisplay/WordCloudDisplay';

// Re-define or import recurringRoutineDefinitions if needed for axisTheme lookup
const recurringRoutineDefinitionsForScrapPaper = {
    'routine_am': { text: "Am Routine", axisTheme: "ON TRACK N+1" },
    'routine_pm': { text: "Pm Routine", axisTheme: "ON TRACK N+1" },
    'routine_famclean': { text: "Family Clean", axisTheme: "Environment" },
    'routine_budget': { text: "Budget", axisTheme: "Financial" },
    'routine_prepare': { text: "Prepare", axisTheme: "Rest and preparation" },
    'routine_study': { text: "Study", axisTheme: "Gear" },
    'routine_exercise': { text: "Exercise", axisTheme: "Physical" },
    'routine_ready': { text: "Ready For Work", axisTheme: "Financial" }
};

const formatDateForDisplay = (dateFieldValue) => {
    if (!dateFieldValue) return 'N/A';
    if (dateFieldValue.toDate) return dateFieldValue.toDate().toLocaleString();
    if (dateFieldValue instanceof Date) return dateFieldValue.toLocaleString();
    if (typeof dateFieldValue === 'string') { const d = new Date(dateFieldValue); if (!isNaN(d.getTime())) return d.toLocaleString(); }
    return 'Invalid Date';
};

const getTodayDateString = () => {
    const today = new Date(); const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

function ScrapPaper({ onNavigate }) {
    // --- All your existing state variables are preserved ---
    const [recentBreakLogs, setRecentBreakLogs] = useState([]);
    const [breakLogsLoading, setBreakLogsLoading] = useState(false);
    const [breakLogsError, setBreakLogsError] = useState(null);

    const [dailyMetricInputDate, setDailyMetricInputDate] = useState(getTodayDateString());
    const [specificDailyMetric, setSpecificDailyMetric] = useState(null);
    const [dailyMetricLoading, setDailyMetricLoading] = useState(false);
    const [dailyMetricError, setDailyMetricError] = useState(null);
    const [searchedMetricDate, setSearchedMetricDate] = useState('');

    const [epiphaniesList, setEpiphaniesList] = useState([]);
    const [despairsList, setDespairsList] = useState([]);
    const [reflectionsLoading, setReflectionsLoading] = useState(false);
    const [reflectionsError, setReflectionsError] = useState(null);
    const [reflectionsFetched, setReflectionsFetched] = useState(false);

    const [selectedChartTheme, setSelectedChartTheme] = useState('Default');
    const availableThemesForSelect = ["Default", "Financial", "Physical", "ON TRACK N+1", "Environment", "Gear", "Rest and preparation", "Misdirect"];

    const [retroStartDate, setRetroStartDate] = useState(() => {
        const d = new Date(); d.setMonth(d.getMonth() - 3); d.setDate(1); return d.toISOString().split('T')[0];
    });
    const [retroEndDate, setRetroEndDate] = useState(getTodayDateString());
    const [retroStatus, setRetroStatus] = useState('');
    const [isRetroProcessing, setIsRetroProcessing] = useState(false);
    const [allAxisThemesForRetro, setAllAxisThemesForRetro] = useState([]);



    useEffect(() => {
        const fetchAllKnownThemes = async () => {
            try {
                const axesCol = collection(db, "axes");
                const axesSnap = await getDocs(axesCol);
                const themesFromAxes = axesSnap.docs.map(d => d.data().axisName).filter(Boolean);
                const themesFromRoutines = Object.values(recurringRoutineDefinitionsForScrapPaper).map(def => def.axisTheme);
                setAllAxisThemesForRetro([...new Set([...themesFromAxes, ...themesFromRoutines])]);
            } catch (error) {
                console.error("ScrapPaper: Error fetching axes for retroactive function:", error);
                setRetroStatus("Error: Could not load axis themes for initialization.");
            }
        };
        fetchAllKnownThemes();
    }, []);

    const fetchRecentBreakLogs = useCallback(async () => { 
        setBreakLogsLoading(true); setBreakLogsError(null); try { const q = query(collection(db, "pomodoroCycleLogs"), orderBy("logSubmittedAt", "desc"), limit(3)); const querySnapshot = await getDocs(q); setRecentBreakLogs(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); } catch (err) { console.error("Err fetch breaks:", err); setBreakLogsError(err.message); } setBreakLogsLoading(false);
    }, []);
    const fetchDailyMetricByDate = useCallback(async (dateString) => { 
        if (!dateString) { setDailyMetricError("Valid date needed."); setSpecificDailyMetric(null); setSearchedMetricDate(''); return; } setDailyMetricLoading(true); setDailyMetricError(null); setSpecificDailyMetric(null); setSearchedMetricDate(dateString); try { const docRef = doc(db, "dailyMetrics", dateString); const docSnap = await getDoc(docRef); if (docSnap.exists()) { setSpecificDailyMetric({ id: docSnap.id, ...docSnap.data() }); } else { setSpecificDailyMetric(null); setDailyMetricError(`No metric for ${dateString}.`); } } catch (err) { console.error("Err fetch metric:", err); setDailyMetricError(err.message); setSpecificDailyMetric(null); } setDailyMetricLoading(false);
    }, []);
    const fetchAllEpiphaniesAndDespairs = useCallback(async () => { 
        setReflectionsLoading(true); setReflectionsError(null); setReflectionsFetched(false); try { const epiphaniesQuery = query(collection(db, "epiphanies"), orderBy("timestamp", "desc")); const despairsQuery = query(collection(db, "despairs"), orderBy("timestamp", "desc")); const [epiphaniesSnapshot, despairsSnapshot] = await Promise.all([getDocs(epiphaniesQuery), getDocs(despairsQuery)]); setEpiphaniesList(epiphaniesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))); setDespairsList(despairsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))); setReflectionsFetched(true); } catch (err) { console.error("Err fetch reflections:", err); setReflectionsError(err.message); } setReflectionsLoading(false);
    }, []);

    const handleRetroactiveUpdateAxisCounts = useCallback(async () => {
        if (!retroStartDate || !retroEndDate) { setRetroStatus("Please select valid start and end dates."); return; }
        if (allAxisThemesForRetro.length === 0) { setRetroStatus("Axis themes not loaded yet, cannot proceed."); return; }

        setIsRetroProcessing(true);
        setRetroStatus("Processing... this may take a while.");

        const weeklyStepsRef = collection(db, "weeklySteps");
        const dailyMetricsRef = collection(db, "dailyMetrics");

        let currentProcessingDate = new Date(retroStartDate + 'T00:00:00Z');
        const finalProcessingDate = new Date(retroEndDate + 'T00:00:00Z');
        let updatedCount = 0;
        let errorCount = 0;
        let operationsInCurrentBatch = 0;
        let currentFirestoreBatch = writeBatch(db);

        while (currentProcessingDate <= finalProcessingDate) {
            const dateStr = `${currentProcessingDate.getUTCFullYear()}-${String(currentProcessingDate.getUTCMonth() + 1).padStart(2, '0')}-${String(currentProcessingDate.getUTCDate()).padStart(2, '0')}`;
            setRetroStatus(`Processing ${dateStr}...`);

            try {
                const axisTaskCountsForDay = {};
                allAxisThemesForRetro.forEach(theme => { if (theme) axisTaskCountsForDay[theme] = 0; });

                const stepsQuery = query(weeklyStepsRef,
                    where("currentAssignedDate", "==", dateStr),
                    where("status", "==", "completed")
                );
                const stepsSnapshot = await getDocs(stepsQuery);
                stepsSnapshot.forEach(stepDoc => {
                    const stepData = stepDoc.data();
                    if (stepData.axisTheme && typeof axisTaskCountsForDay[stepData.axisTheme] === 'number') {
                        axisTaskCountsForDay[stepData.axisTheme]++;
                    }
                });

                const dailyMetricDocSnap = await getDoc(doc(dailyMetricsRef, dateStr));
                if (dailyMetricDocSnap.exists()) {
                    const dailyData = dailyMetricDocSnap.data();
                    if (dailyData.tasksStatus) {
                        for (const taskId in dailyData.tasksStatus) {
                            if (dailyData.tasksStatus[taskId].completed && recurringRoutineDefinitionsForScrapPaper[taskId]) {
                                const routineTheme = recurringRoutineDefinitionsForScrapPaper[taskId].axisTheme;
                                if (routineTheme && typeof axisTaskCountsForDay[routineTheme] === 'number') {
                                    axisTaskCountsForDay[routineTheme]++;
                                }
                            }
                        }
                    }
                }
                
                const metricDocRef = doc(dailyMetricsRef, dateStr);
                currentFirestoreBatch.set(metricDocRef, { 
                    axisTaskCounts: axisTaskCountsForDay, 
                    lastAxisCountsUpdate: serverTimestamp()
                }, { merge: true });
                operationsInCurrentBatch++;
                updatedCount++;

                if (operationsInCurrentBatch >= 490) {
                    await currentFirestoreBatch.commit();
                    console.log(`Committed batch for ${dateStr}. Processed ${updatedCount} days so far.`);
                    currentFirestoreBatch = writeBatch(db);
                    operationsInCurrentBatch = 0;
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } catch (e) {
                console.error(`Error processing date ${dateStr} for retroactive update:`, e);
                errorCount++;
            }
            currentProcessingDate.setUTCDate(currentProcessingDate.getUTCDate() + 1);
        }

        if (operationsInCurrentBatch > 0) {
            try {
                await currentFirestoreBatch.commit();
                console.log(`Committed final batch. Total processed ${updatedCount} days.`);
            } catch (batchError) {
                console.error("Error committing final batch:", batchError);
                errorCount++;
            }
        }
        setIsRetroProcessing(false);
        setRetroStatus(`Retroactive update finished. ${updatedCount} days processed. ${errorCount > 0 ? `${errorCount} errors.` : 'No errors.'}`);
    }, [retroStartDate, retroEndDate, allAxisThemesForRetro]);


    const sectionStyle = { marginBottom: '40px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' };
    const h2Style = { marginTop: '0', borderBottom: '1px solid #eee', paddingBottom: '10px', color: '#333' };
    const buttonStyle = { padding: '10px 15px', fontSize: '1em', cursor: 'pointer', marginRight: '10px', marginBottom: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', transition: 'background-color 0.2s ease' };
    const buttonDisabledStyle = { ...buttonStyle, backgroundColor: '#0056b3', cursor: 'not-allowed' };
    const preStyle = { backgroundColor: '#eee', padding: '15px', borderRadius: '4px', overflowX: 'auto', whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontSize: '0.9em' };
    const listStyle = { listStyleType: 'none', paddingLeft: '0' };
    const listItemStyle = { marginBottom: '10px', padding: '10px', border: '1px solid #eee', borderRadius: '4px', backgroundColor: 'white' };
    const errorStyle = { color: 'red', marginTop: '10px' };
    const inputStyle = { padding: '10px', fontSize: '1em', border: '1px solid #ccc', borderRadius: '4px', marginRight: '10px', marginBottom: '10px' };
    const selectStyle = { ...inputStyle, minWidth: '200px' };

    const handleNavigateToMapGenerator = () => { if (onNavigate) onNavigate('ProjectMapGenerator'); else console.warn("onNavigate prop not provided."); };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', lineHeight: '1.6', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ textAlign: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', color: '#333' }}>
                Firestore Data Scrap Paper 📝
            </h1>
            <p style={{ textAlign: 'center', color: '#555', marginBottom: '20px' }}>
                This component demonstrates fetching data and can be used to launch experimental views or tools.
            </p>
            
            <div style={sectionStyle}>
                <h2 style={h2Style}>Experimental Tools</h2>
                <button onClick={handleNavigateToMapGenerator} style={buttonStyle}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}>
                    Go to Project Map Generator
                </button>
                <p style={{fontSize: '0.9em', color: '#666', marginTop: '10px'}}>
                    Navigate to the AI-powered Project Map Generator tool.
                </p>
            </div>
            
            {/* --- THIS IS THE NEW SECTION FOR THE WORD CLOUD --- */}
            <div style={sectionStyle}>
                <h2 style={h2Style}>Example: Word Cloud Visualization</h2>
                <p>This chart analyzes text from Firestore to find common themes in your "Epiphanies".</p>
                <WordCloudDisplay 
                    collectionName="momentsLog"
                    textField="text"
                    filter={{ field: "type", value: "epiphany" }}
                    customStopWords={['feel', 'safe', 'peace', 'near', 'here']}
                />
            </div>

            <div style={sectionStyle}>
                <h2 style={h2Style}>Retroactively Update Daily Axis Task Counts</h2>
                <p>This tool will iterate through past dates, count completed tasks per axis from 'weeklySteps' and recurring routines (via 'dailyMetrics'), and update 'dailyMetrics' documents.</p>
                <div style={{display: 'flex', alignItems: 'center', marginBottom: '10px'}}>
                    <label htmlFor="retroStart" style={{marginRight: '5px'}}>Start Date:</label>
                    <input type="date" id="retroStart" value={retroStartDate} onChange={e => setRetroStartDate(e.target.value)} style={inputStyle} disabled={isRetroProcessing}/>
                    <label htmlFor="retroEnd" style={{marginRight: '5px', marginLeft: '15px'}}>End Date:</label>
                    <input type="date" id="retroEnd" value={retroEndDate} onChange={e => setRetroEndDate(e.target.value)} style={inputStyle} disabled={isRetroProcessing}/>
                </div>
                <button
                    onClick={handleRetroactiveUpdateAxisCounts}
                    disabled={isRetroProcessing || allAxisThemesForRetro.length === 0}
                    style={isRetroProcessing || allAxisThemesForRetro.length === 0 ? buttonDisabledStyle : buttonStyle}
                >
                    {isRetroProcessing ? 'Processing...' : (allAxisThemesForRetro.length === 0 ? 'Loading Themes...' : 'Start Retroactive Update')}
                </button>
                {allAxisThemesForRetro.length === 0 && !isRetroProcessing && <p style={errorStyle}>Loading axis themes... please wait.</p>}
                {retroStatus && <p style={{marginTop: '10px', fontStyle: 'italic', fontWeight: isRetroProcessing ? 'normal' : 'bold'}}>{retroStatus}</p>}
            </div>

            <div style={sectionStyle}>
                <h2 style={h2Style}>Example 4: Themed Chart View</h2>
                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="themeSelector" style={{ marginRight: '10px', fontWeight: 'bold' }}>Select Theme:</label>
                    <select id="themeSelector" value={selectedChartTheme} onChange={(e) => setSelectedChartTheme(e.target.value)} style={selectStyle}>
                        {availableThemesForSelect.map(themeOption => (<option key={themeOption} value={themeOption}>{themeOption.replace(/([A-Z0-9+]+)/g, ' $1').trim()}</option>))}
                    </select>
                </div>
                <ThemedChartView theme={selectedChartTheme} containerSize="large"/>
                <p style={{fontSize: '0.9em', color: '#666', marginTop: '10px'}}>This chart dynamically changes... Defaults to 1 month of data. Click chart to expand.</p>
            </div>

            <div style={sectionStyle}>
                <h2 style={h2Style}>Example 1: Fetch Recent Break Logs</h2>
                 <button onClick={fetchRecentBreakLogs} disabled={breakLogsLoading} style={breakLogsLoading ? buttonDisabledStyle : buttonStyle} onMouseOver={(e) => !breakLogsLoading && (e.currentTarget.style.backgroundColor = '#0056b3')} onMouseOut={(e) => !breakLogsLoading && (e.currentTarget.style.backgroundColor = '#007bff')}> {breakLogsLoading ? 'Loading Logs...' : 'Fetch Last 3 Break Logs'} </button>
                {breakLogsError && <p style={errorStyle}>Error: {breakLogsError}</p>}
                {recentBreakLogs.length > 0 && ( <ul style={listStyle}> {recentBreakLogs.map(log => ( <li key={log.id} style={listItemStyle}> <strong>Submitted:</strong> {formatDateForDisplay(log.logSubmittedAt)} <br /> <strong>Work Duration:</strong> {log.workPeriodDurationMinutes} mins <br /> <strong>Tasks Completed:</strong> {log.workPeriodTasksCompleted} <br /> <strong>Nature of Work:</strong> {log.workPeriodNature || 'N/A'} <br /> <strong>Break Activity:</strong> {log.breakActivityText} ({log.breakDurationMinutes} mins) </li> ))} </ul> )}
            </div>

            <div style={sectionStyle}>
                <h2 style={h2Style}>Example 2: Fetch a Specific Daily Metric</h2>
                <input type="text" value={dailyMetricInputDate} onChange={(e) => setDailyMetricInputDate(e.target.value)} placeholder="YYYY-MM-DD" style={inputStyle} />
                <button onClick={() => fetchDailyMetricByDate(dailyMetricInputDate)} disabled={dailyMetricLoading} style={dailyMetricLoading ? buttonDisabledStyle : buttonStyle} onMouseOver={(e) => !dailyMetricLoading && (e.currentTarget.style.backgroundColor = '#0056b3')} onMouseOut={(e) => !dailyMetricLoading && (e.currentTarget.style.backgroundColor = '#007bff')}> {dailyMetricLoading ? 'Loading Metric...' : 'Fetch Daily Metric'} </button>
                {dailyMetricError && <p style={errorStyle}>Error: {dailyMetricError}</p>}
                {searchedMetricDate && !specificDailyMetric && !dailyMetricLoading && !dailyMetricError && ( <p>No metric found for {searchedMetricDate}.</p> )}
                {specificDailyMetric && ( <div style={{ marginTop: '15px' }}> <h3>Metric for {searchedMetricDate}:</h3> <pre style={preStyle}>{JSON.stringify(specificDailyMetric, null, 2)}</pre> </div> )}
            </div>

            <div style={sectionStyle}>
                <h2 style={h2Style}>Example 3: All Epiphanies & Despairs</h2>
                <button onClick={fetchAllEpiphaniesAndDespairs} disabled={reflectionsLoading} style={reflectionsLoading ? buttonDisabledStyle : buttonStyle} onMouseOver={(e) => !reflectionsLoading && (e.currentTarget.style.backgroundColor = '#0056b3')} onMouseOut={(e) => !reflectionsLoading && (e.currentTarget.style.backgroundColor = '#007bff')}> {reflectionsLoading ? 'Loading Reflections...' : 'Fetch Epiphanies & Despairs'} </button>
                {reflectionsError && <p style={errorStyle}>Error: {reflectionsError}</p>}
                {reflectionsFetched && ( <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px' }}> <div style={{ width: '48%' }}> <h3>Epiphanies ({epiphaniesList.length})</h3> {epiphaniesList.length > 0 ? ( <ul style={listStyle}> {epiphaniesList.map(item => ( <li key={item.id} style={listItemStyle}> <p>{item.text}</p> <small><em>{formatDateForDisplay(item.timestamp)}</em></small> </li> ))} </ul> ) : <p>No epiphanies found.</p>} </div> <div style={{ width: '48%' }}> <h3>Despairs ({despairsList.length})</h3> {despairsList.length > 0 ? ( <ul style={listStyle}> {despairsList.map(item => ( <li key={item.id} style={listItemStyle}> <p>{item.text}</p> <small><em>{formatDateForDisplay(item.timestamp)}</em></small> </li> ))} </ul> ) : <p>No despairs found.</p>} </div> </div> )}
            </div>
        </div>
    );
}

export default ScrapPaper;