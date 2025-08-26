// src/components/DailyView/DailyView.jsx
import React, { useState, useEffect } from 'react';
import styles from './DailyView.module.css';
import Modal from '../Modal/Modal';
import AmRoutineForm from '../AmRoutineForm/AmRoutineForm';
import PmRoutineForm from '../PmRoutineForm/PmRoutineForm';
import FamilyCleanForm from '../FamilyCleanForm/FamilyCleanForm';
import StudyForm from '../StudyForm/StudyForm';
import ReadyForWorkForm from '../ReadyForWorkForm/ReadyForWorkForm';
import {LeaveWorkAtWork} from '../LeaveWorkAtWork/LeaveWorkAtWork';
import ContextMap from '../ContextMap/ContextMap';
import BreakAnalysisChart from '../BreakAnalysisChart/BreakAnalysisChart';
import { db } from '../../firebaseConfig';
import {
    collection, doc, getDoc, getDocs, query,
    where, limit, orderBy, Timestamp, documentId, updateDoc
} from "firebase/firestore";
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

// --- Helper Functions ---
const getWeekId = (date = new Date()) => { /* ... same as your original ... */ 
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};
const getTodayDateString = () => { /* ... same as your original ... */
    const today = new Date(); const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const dayToAxisThemeMapping = [ /* ... same as your original ... */
    "Rest and preparation", "Physical", "Financial", "Gear", "On Track N+1", "Misdirect", "Environment"
];
function findUpcomingMilestone(milestones) { /* ... same as your original ... */
    if (!Array.isArray(milestones)) return null;
    return milestones.find(m => m.completionDate === null || m.completionDate === undefined) || null;
}
function formatDisplayDate(date) { /* ... same as your original ... */
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}
function formatChartDateLabel(dateString_YYYY_MM_DD) { /* ... same as your original ... */
    try { const parts = dateString_YYYY_MM_DD.split('-'); if (parts.length === 3) return `${parts[1]}/${parts[2]}`; return dateString_YYYY_MM_DD; }
    catch (e) { return dateString_YYYY_MM_DD; }
}
const axisNameToCssVarSuffix = (axisName) => { /* ... same as your original ... */
    if (!axisName || typeof axisName !== 'string') return 'default';
    return axisName.trim().toLowerCase().replace(/\s+/g, '-').replace(/\+/g, '-plus-');
};

// Helper to get a fully resolved color string from CSS variable or fallback
const getCssVariableValue = (variableName, fallbackColor = 'rgba(100,100,100,1)') => {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const value = getComputedStyle(document.documentElement).getPropertyValue(variableName)?.trim();
        if (value) {
            if (value.startsWith('rgb') || value.startsWith('#') || /^[a-zA-Z]+$/.test(value)) {
                return value; // Already a full color string
            }
            return `rgba(${value}, 1)`; // Assuming RGB triplet "R, G, B"
        }
    }
    return fallbackColor;
};

// Helper to get axis theme color specifically for chart lines, using preferred suffixes
const getAxisThemeColorForDailyChart = (axisName, fallbackColor = 'rgba(108, 117, 125, 1)') => {
    if (!axisName || typeof axisName !== 'string') return fallbackColor;
    const cssVarSuffix = axisNameToCssVarSuffix(axisName);
    return getCssVariableValue(`--axis-color-${cssVarSuffix}-3`, 
               getCssVariableValue(`--axis-color-${cssVarSuffix}-2`, fallbackColor));
};
// --- End Helper Functions ---

function DailyView({ onNavigate }) {
    // == State ==
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [todayDate, setTodayDate] = useState(new Date());
    const [axisName, setAxisName] = useState("Loading..."); // This is the "Axis Theme of the Day"
    const [axisData, setAxisData] = useState(null); // Roadmap data for the current axis
    const [chartData, setChartData] = useState([]); // Data for the recharts chart
    const [isAmModalOpen, setIsAmModalOpen] = useState(false);
    const [isPmModalOpen, setIsPmModalOpen] = useState(false);
    const [isFamilyCleanModalOpen, setIsFamilyCleanModalOpen] = useState(false);
    const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);
    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
    const [isReadyModalOpen, setIsReadyModalOpen] = useState(false);
    const [isLeaveWorkModalOpen, setIsLeaveWorkModalOpen] = useState(false);
    const [axisCssSuffix, setAxisCssSuffix] = useState('default');
    const [currentDayAxisThemeTaskLineColor, setCurrentDayAxisThemeTaskLineColor] = useState(getAxisThemeColorForDailyChart('default'));

 useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        setError(null);

        // --- 1. Initial Setup ---
        const todayForLogic = new Date();
        const currentYear = todayForLogic.getFullYear();
        const dayIndex = todayForLogic.getDay();
        const currentAxisThemeOfDay = dayToAxisThemeMapping[dayIndex]; // e.g., "Environment"
        
        // Set state for display right away
        setTodayDate(todayForLogic);
        setAxisName(currentAxisThemeOfDay);
        // ... (other state setters for CSS, etc.)
        const currentAxisSuffixVal = axisNameToCssVarSuffix(currentAxisThemeOfDay);
        const themeTaskLineColor = getAxisThemeColorForDailyChart(currentAxisThemeOfDay);
        setAxisCssSuffix(currentAxisSuffixVal);
        setCurrentDayAxisThemeTaskLineColor(themeTaskLineColor);
        
        console.log(`DailyView: Fetching all data to find axis=${currentAxisThemeOfDay}`);

        try {
            // --- 2. Use the "Robust Fetch" strategy from YearlyView ---
            const goalsQuery = query(
                collection(db, "new_goals"),
                where("type", "==", "yearly"),
                where("year", "==", 2025)
            );

            const [axesSnapshot, goalsSnapshot, milestonesSnapshot] = await Promise.all([
                getDocs(collection(db, "new_axes")),
                getDocs(goalsQuery),
                getDocs(collection(db, "new_milestones"))
            ]);

            // --- 3. Process and link data in JavaScript, just like YearlyView ---
            const axesMap = new Map(axesSnapshot.docs.map(doc => [doc.data().axisName, { id: doc.id, ...doc.data() }]));
            const milestonesByGoal = new Map();
            milestonesSnapshot.forEach(doc => {
                const milestone = { id: doc.id, ...doc.data() };
                if (!milestonesByGoal.has(milestone.goalId)) {
                    milestonesByGoal.set(milestone.goalId, []);
                }
                milestonesByGoal.get(milestone.goalId).push(milestone);
            });

            // --- 4. Find the specific data for THIS day's axis ---
            const finalAxisData = { question: '', new_goals: null, new_milestones: [] };
            const currentAxisObject = axesMap.get(currentAxisThemeOfDay);

            if (currentAxisObject) {
                finalAxisData.question = currentAxisObject.question || '';
                
                // FIX 1: Find the goal by matching its 'axisId' to the current axis's DOCUMENT ID.
                const goalForThisAxis = goalsSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .find(goal => goal.axisId === currentAxisObject.id); // <-- CORRECTED LINE

                if (goalForThisAxis) {
                    finalAxisData.new_goals = goalForThisAxis.title;

                    // FIX 2: Get milestones using the goal's logical 'goalId' field, not its document ID.
                    const milestones = milestonesByGoal.get(goalForThisAxis.goalId) || []; // <-- CORRECTED LINE
                    
                    finalAxisData.new_milestones = milestones
                        .map(m => ({...m, text: m.title}))
                        .sort((a,b) => (a.dueDate?.toMillis() || 0) - (b.dueDate?.toMillis() || 0));
                } else {
                    console.warn(`Could not find a 2025 goal for axisID: ${currentAxisObject.id}`);
                }
            } else {
                console.warn(`Could not find axis data for axisName: ${currentAxisThemeOfDay} in new_axes collection.`);
            }

            setAxisData(finalAxisData);

            // --- 5. Fetch Chart Data (this logic remains the same) ---
            const metricsQuery = query(collection(db, "dailyMetrics"), orderBy(documentId(), "desc"), limit(30));
            const metricsHistorySnapshot = await getDocs(metricsQuery);
            const processedChartData = [];
            metricsHistorySnapshot.forEach(doc => {
                const data = doc.data();
                const tasksForThisDayAxisTheme = (data.axisTaskCounts && data.axisTaskCounts[currentAxisThemeOfDay] !== undefined)
                    ? Number(data.axisTaskCounts[currentAxisThemeOfDay])
                    : 0;

                processedChartData.push({
                    name: formatChartDateLabel(doc.id),
                    score: Number(data.productivityScore !== undefined ? data.productivityScore : 0),
                    epiphany: Number(data.epiphanyCount !== undefined ? data.epiphanyCount : 0),
                    despair: Number(data.despairCount !== undefined ? data.despairCount : 0),
                    axisTasks: tasksForThisDayAxisTheme,
                    fullDate: doc.id
                });
            });
            setChartData(processedChartData.reverse());
            
        } catch (err) {
            console.error("Error fetching data for DailyView: ", err);
            setError("Failed to load daily data.");
            setAxisData(null);
            setChartData([]);
        } finally {
            setIsLoading(false);
        }
    };

    fetchData();
}, []);
        

    // == Modal Handlers ==
    const handleAmRoutineSubmit = (formData) => { console.log("AM Sub:", formData); closeAmModal(); };
    const handlePmRoutineSubmit = (formData) => { console.log("PM Sub:", formData); closePmModal(); };
    const handleFamilyCleanSubmit = (formData) => { console.log("FamClean Sub:", formData); closeFamilyCleanModal(); };
    const handleStudySubmit = (formData) => { console.log("Study Sub:", formData); closeStudyModal(); };
    const handleBudgetSubmit = (formData) => { console.log("Budget Sub (DailyView):", formData); closeBudgetModal(); };
    const handleReadySubmit = (formData) => { console.log("Ready Sub:", formData); closeReadyModal(); };
     const handleLeaveWorkSubmit = (formData) => { console.log("Leave Work at Work Submitted:", formData); closeLeaveWorkModal(); };
    const closeLeaveWorkModal = () => setIsLeaveWorkModalOpen(false);
    const closeAmModal = () => setIsAmModalOpen(false);
    const closePmModal = () => setIsPmModalOpen(false);
    const closeFamilyCleanModal = () => setIsFamilyCleanModalOpen(false);
    const closeStudyModal = () => setIsStudyModalOpen(false);
    const closeBudgetModal = () => setIsBudgetModalOpen(false);
    const closeReadyModal = () => setIsReadyModalOpen(false);

    const getMilestoneStatusClass = (milestone, currentMilestone) => { /* ... same as your original ... */ 
        if (!milestone) return '';
        if (milestone.completionDate && typeof milestone.completionDate.toDate === 'function') return styles.completed;
        if (currentMilestone && milestone.text === currentMilestone.text) return styles.current;
        return styles.upcoming;
    };
    const currentMilestone = axisData ? findUpcomingMilestone(axisData.new_milestones) : null;
    const roadmapStyle = { /* ... same as your original ... */
        '--roadmap-border-color': `var(--axis-color-${axisCssSuffix}-4, var(--axis-color-${axisCssSuffix}-3, var(--axis-color-default-3)))`,
        '--roadmap-text-color': `var(--axis-color-${axisCssSuffix}-4, var(--axis-color-${axisCssSuffix}-3, var(--axis-color-default-3)))`,
        '--roadmap-color-light': `var(--axis-color-${axisCssSuffix}-1, var(--axis-color-default-1))`,
        '--roadmap-color-medium': `var(--axis-color-${axisCssSuffix}-2, var(--axis-color-default-2))`,
        '--roadmap-color-dark': `var(--axis-color-${axisCssSuffix}-3, var(--axis-color-default-3))`,
        '--roadmap-color-darkest': `var(--axis-color-${axisCssSuffix}-4, var(--axis-color-${axisCssSuffix}-3, var(--axis-color-default-3)))`,
    };
    
    // Define chart line colors using CSS variables, matching your original intent
    const scoreChartLineColor = getCssVariableValue('--axis-color-on-track-n-plus-1-2', 'rgba(54, 162, 235, 1)');
    const epiphanyChartLineColor = getCssVariableValue('--axis-color-environment-3', 'rgba(255, 205, 86, 1)');
    const despairChartLineColor = getCssVariableValue('--axis-color-financial-3', 'rgba(104, 67, 188, 1)');
    // currentDayAxisThemeTaskLineColor is already in state, dynamically set for the new axis tasks line

    return (
        <div className={styles.dailyViewContainer}>
            {isLoading ? ( <p>Loading daily focus...</p> ) : 
             error ? ( <p className={styles.errorText}>{error}</p> ) : (
                <>
                    {/* --- Header Section --- */}
                    <div className={styles.headerSection}>
                       <div className={styles.headerLeft}>
                            <div className={styles.titleDateInfo}>
                                <h1 className={styles.axisTitleLg}>{axisName}</h1>
                                <p className={styles.dateInfo}>{formatDisplayDate(todayDate)}</p>
                            </div>
                            <div className={styles.chartContainerInHeader}>
                                {chartData.length > 1 ? (
                                    <ResponsiveContainer width="100%" height={200}>
                                        <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                                            <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize="0.8em" />
                                            <YAxis yAxisId="left" allowDecimals={false} stroke="var(--text-secondary)" fontSize="0.8em" domain={[0, 'auto']} />
                                            <Tooltip contentStyle={{ fontSize: '0.8em', padding: '5px' }} />
                                            <Legend wrapperStyle={{ fontSize: '0.8em', paddingTop: '10px' }}/>
                                            
                                            <Line yAxisId="left" type="monotone" dataKey="score" stroke={scoreChartLineColor} strokeWidth={2} dot={false} activeDot={{ r: 6 }} name="Score (All Tasks)" />
                                            <Line yAxisId="left" type="monotone" dataKey="epiphany" stroke={epiphanyChartLineColor} strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} name="E" />
                                            <Line yAxisId="left" type="monotone" dataKey="despair" stroke={despairChartLineColor} strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} name="D" />
                                            
                                            {/* NEW Line for the day's axis theme tasks */}
                                            <Line 
                                                yAxisId="left" 
                                                type="monotone"
                                                dataKey="axisTasks" 
                                                stroke={currentDayAxisThemeTaskLineColor} // Dynamic color
                                                strokeWidth={2} 
                                                dot={false} // No dots
                                                activeDot={{ r: 5, fill: currentDayAxisThemeTaskLineColor }} 
                                                name={`${axisName} Tasks`} 
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : ( <p className={styles.chartMessageSmall}>Not enough data for chart.</p> )}
                            </div>
                        </div>
                        <div className={styles.headerRight}> <ContextMap axisName={axisName} /> </div>
                    </div>
                    {/* --- End Header Section --- */}

                    {/* --- REPIACE THE ENTIRE Roadmap Section --- */}
{axisData && (axisData.question || axisData.new_milestones?.length > 0 || axisData.new_goals) && (
    <div className={styles.roadmapSection} style={roadmapStyle}>
        <h3 className={styles.sectionTitle} >{axisName} Roadmap</h3>
        <div className={styles.roadmapHorizontalContainer}>
            <div className={`${styles.roadmapColumn} ${styles.roadmapQuestion}`}>
                <h4 className={styles.roadmapColumnTitle}>To Ponder</h4>
                <p>{axisData?.question || <i className={styles.notSet}>N/A</i>}</p>
            </div>
            <div className={`${styles.roadmapColumn} ${styles.roadmapMilestones}`}>
                <h4 className={styles.roadmapColumnTitle}>Milestones</h4>
                {/* Use new_milestones here */}
                {axisData?.new_milestones && axisData.new_milestones.length > 0 ? (
                    <div className={styles.milestonesHorizontalList}>
                        {axisData.new_milestones.map((milestone, index) => (
                            <div key={milestone.text || index} className={`${styles.milestoneItemHoriz} ${getMilestoneStatusClass(milestone, currentMilestone)}`}>
                                <span className={styles.milestoneTextHoriz}>{milestone.text}</span>
                                {milestone.dueDate?.toDate && (<span className={styles.milestoneDateHoriz}>Due: {milestone.dueDate.toDate().toLocaleDateString()}</span>)}
                                {milestone.completionDate?.toDate && (<span className={styles.milestoneDateHoriz}>Done: {milestone.completionDate.toDate().toLocaleDateString()}</span>)}
                            </div>
                        ))}
                    </div>
                ) : (<p className={styles.noMilestones}><i>No milestones defined.</i></p>)}
            </div>
            <div className={`${styles.roadmapColumn} ${styles.roadmapYearlyGoal}`}>
                <h4 className={styles.roadmapColumnTitle}>Yearly Goal</h4>
                {/* Use new_goals here */}
                <p>{axisData?.new_goals || <i className={styles.notSet}>N/A</i>}</p>
            </div>
        </div>
    </div>
)}
{/* --- End Roadmap Section --- */}
                    
                    {/* --- Routine Buttons (Copied from your original) --- */}
                    <div className={styles.routineButtonsWrapper}>
                        <button className={styles.routineButton} onClick={() => setIsAmModalOpen(true)}>Start AM Routine</button>
                        <button className={`${styles.routineButton} ${styles.readyButton}`} onClick={() => setIsReadyModalOpen(true)}>Ready For Work</button>
                        <button className={`${styles.routineButton} ${styles.studyButton}`} onClick={() => setIsStudyModalOpen(true)}>Start Study Session</button>
                        <button className={`${styles.routineButton} ${styles.leaveWorkButton}`} onClick={() => setIsLeaveWorkModalOpen(true)}>Leave Work at Work</button>
                        <button className={`${styles.routineButton} ${styles.familyCleanButton}`} onClick={() => setIsFamilyCleanModalOpen(true)}>Start Family Clean</button>
                        <button className={`${styles.routineButton} ${styles.pmButton}`} onClick={() => setIsPmModalOpen(true)}>Start PM Routine</button>
                    </div>
                    {/* --- End Routine Buttons --- */}

                    {/* --- Break Analysis Chart Section (Copied from your original) --- */}
                    {!isLoading && !error && (
                        <section className={styles.analysisSection}>
                            <BreakAnalysisChart />
                        </section>
                    )}
                    {/* --- End Break Analysis Chart Section --- */}
                </>
            )}

            {/* --- Modals (Copied from your original) --- */}
            {isAmModalOpen && (<Modal isOpen={isAmModalOpen} onClose={closeAmModal}><AmRoutineForm onSubmit={handleAmRoutineSubmit} onClose={closeAmModal} /></Modal>)}
            {isPmModalOpen && (<Modal isOpen={isPmModalOpen} onClose={closePmModal}><PmRoutineForm onSubmit={handlePmRoutineSubmit} onClose={closePmModal} /></Modal>)}
            {isFamilyCleanModalOpen && (<Modal isOpen={isFamilyCleanModalOpen} onClose={closeFamilyCleanModal}><FamilyCleanForm onSubmit={handleFamilyCleanSubmit} onClose={closeFamilyCleanModal} /></Modal>)}
            {isStudyModalOpen && (<Modal isOpen={isStudyModalOpen} onClose={closeStudyModal}><StudyForm onSubmit={handleStudySubmit} onClose={closeStudyModal} axisQuestion={axisData?.question}/></Modal>)}
            {isBudgetModalOpen && (
                 <Modal isOpen={isBudgetModalOpen} onClose={closeBudgetModal}>
                    {/* <BudgetForm onSubmit={handleBudgetSubmit} onClose={closeBudgetModal} onNavigate={onNavigate} /> */}
                    <p>Budget Form Placeholder</p> {/* Placeholder if BudgetForm isn't ready */}
                </Modal>
            )}
            {isReadyModalOpen && (<Modal isOpen={isReadyModalOpen} onClose={closeReadyModal}><ReadyForWorkForm onSubmit={handleReadySubmit} onClose={closeReadyModal} /></Modal>)}
             {isLeaveWorkModalOpen && (
                <Modal isOpen={isLeaveWorkModalOpen} onClose={closeLeaveWorkModal}>
                    <LeaveWorkAtWork onSubmit={handleLeaveWorkSubmit} onClose={closeLeaveWorkModal} />
                </Modal>
            )}
            {/* --- End Modals --- */}
        </div>
    );
}

export default DailyView;