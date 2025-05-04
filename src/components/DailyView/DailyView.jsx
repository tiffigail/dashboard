// src/components/DailyView/DailyView.jsx
import React, { useState, useEffect } from 'react';
import styles from './DailyView.module.css';
import Modal from '../Modal/Modal';
import AmRoutineForm from '../AmRoutineForm/AmRoutineForm';
import PmRoutineForm from '../PmRoutineForm/PmRoutineForm';
import FamilyCleanForm from '../FamilyCleanForm/FamilyCleanForm';
import StudyForm from '../StudyForm/StudyForm';
import ReadyForWorkForm from '../ReadyForWorkForm/ReadyForWorkForm'; // <<< Import ReadyForWorkForm
import ContextMap from '../ContextMap/ContextMap';
import { db } from '../../firebaseConfig';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    limit,
    orderBy,
    Timestamp,
    documentId,
    updateDoc // Added updateDoc back
} from "firebase/firestore";
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

// --- Helper Functions ---
const getWeekId = (date = new Date()) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};
const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const dayToAxisThemeMapping = [
    "Rest and preparation",
    "Physical",
    "Financial",
    "Gear",
    "ON TRACK N+1",
    "Misdirect",
    "Environment"
];
function findUpcomingMilestone(milestones) {
    if (!Array.isArray(milestones)) return null;
    return milestones.find(m => m.completionDate === null || m.completionDate === undefined) || null;
}
function formatDisplayDate(date) {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}
function formatChartDateLabel(dateString_YYYY_MM_DD) {
    try {
        const parts = dateString_YYYY_MM_DD.split('-');
        if (parts.length === 3) {
            return `${parts[1]}/${parts[2]}`;
        }
        return dateString_YYYY_MM_DD;
    } catch (e) {
        return dateString_YYYY_MM_DD;
    }
}
const axisNameToCssVarSuffix = (axisName) => {
    if (!axisName || typeof axisName !== 'string') return 'default';
    return axisName.trim().toLowerCase().replace(/\s+/g, '-').replace(/\+/g, '-plus-');
};
// --- End Helper Functions ---

// <<< Accept onNavigate prop if needed by BudgetForm >>>
function DailyView({ onNavigate }) {
    // == State ==
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [todayDate, setTodayDate] = useState(new Date());
    const [axisName, setAxisName] = useState("Loading...");
    const [axisData, setAxisData] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [isAmModalOpen, setIsAmModalOpen] = useState(false);
    const [isPmModalOpen, setIsPmModalOpen] = useState(false);
    const [isFamilyCleanModalOpen, setIsFamilyCleanModalOpen] = useState(false);
    const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);
    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false); // Keep Budget Modal state
    const [isReadyModalOpen, setIsReadyModalOpen] = useState(false); // <<< State for Ready Modal
    const [axisCssSuffix, setAxisCssSuffix] = useState('default');

    // == Fetch Data ==
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            const today = new Date();
            const dayIndex = today.getDay();
            const currentAxisTheme = dayToAxisThemeMapping[dayIndex];
            const currentAxisSuffix = axisNameToCssVarSuffix(currentAxisTheme);

            setTodayDate(today);
            setAxisName(currentAxisTheme);
            setAxisCssSuffix(currentAxisSuffix);

            console.log(`Fetching data for DailyView: Axis=${currentAxisTheme}, Suffix=${currentAxisSuffix}`);

            try {
                const axisQuery = query(collection(db, "axes"), where("axisName", "==", currentAxisTheme), limit(1));
                const axisDataPromise = getDocs(axisQuery);
                const metricsQuery = query(
                    collection(db, "dailyMetrics"),
                    orderBy(documentId(), "desc"),
                    limit(30)
                );
                const metricsHistoryPromise = getDocs(metricsQuery);

                const [axisSnapshot, metricsHistorySnapshot] = await Promise.all([
                    axisDataPromise, metricsHistoryPromise
                ]);

                if (!axisSnapshot.empty) {
                    const fetchedAxisData = axisSnapshot.docs[0].data();
                    setAxisData(fetchedAxisData);
                    console.log("Axis Data for Roadmap:", fetchedAxisData);
                } else {
                    console.warn(`Axis data not found for: ${currentAxisTheme}`);
                    setError(`Axis data setup needed for ${currentAxisTheme}`);
                    setAxisData(null);
                }

                const processedChartData = [];
                metricsHistorySnapshot.forEach(doc => {
                    const data = doc.data();
                    processedChartData.push({
                        name: formatChartDateLabel(doc.id),
                        score: Number(data.productivityScore !== undefined ? data.productivityScore : 0),
                        epiphany: Number(data.epiphanyCount !== undefined ? data.epiphanyCount : 0),
                        despair: Number(data.despairCount !== undefined ? data.despairCount : 0),
                        fullDate: doc.id
                    });
                });
                setChartData(processedChartData.reverse());
                console.log("Processed Chart Data:", processedChartData);

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
    const handleAmRoutineSubmit = (formData) => { console.log("AM Routine Submitted:", formData); closeAmModal(); };
    const handlePmRoutineSubmit = (formData) => { console.log("PM Routine Submitted:", formData); closePmModal(); };
    const handleFamilyCleanSubmit = (formData) => { console.log("Family Clean Routine Submitted:", formData); closeFamilyCleanModal(); };
    const handleStudySubmit = (formData) => { console.log("Study Session Submitted:", formData); closeStudyModal(); };
    const handleBudgetSubmit = (formData) => { console.log("Budget Routine Submitted (in DailyView):", formData); closeBudgetModal(); };
    // <<< Handler for Ready Form >>>
    const handleReadySubmit = (formData) => { console.log("Ready For Work Submitted:", formData); closeReadyModal(); };

    const closeAmModal = () => setIsAmModalOpen(false);
    const closePmModal = () => setIsPmModalOpen(false);
    const closeFamilyCleanModal = () => setIsFamilyCleanModalOpen(false);
    const closeStudyModal = () => setIsStudyModalOpen(false);
    const closeBudgetModal = () => setIsBudgetModalOpen(false); // Keep Budget Modal close handler
     // <<< Handler to close Ready Modal >>>
    const closeReadyModal = () => setIsReadyModalOpen(false);


    // Helper to render milestone status visually
    const getMilestoneStatusClass = (milestone, currentMilestone) => {
        if (!milestone) return '';
        if (milestone.completionDate && typeof milestone.completionDate.toDate === 'function') {
            return styles.completed;
        }
        if (currentMilestone && milestone.text === currentMilestone.text) {
            return styles.current;
        }
        return styles.upcoming;
    };


    // Find the current milestone
    const currentMilestone = axisData ? findUpcomingMilestone(axisData.milestones) : null;

    // --- Define Inline Styles for Roadmap Section ---
    const roadmapStyle = {
        '--roadmap-border-color': `var(--axis-color-${axisCssSuffix}-4, var(--axis-color-${axisCssSuffix}-3, var(--axis-color-default-3)))`,
        '--roadmap-text-color': `var(--axis-color-${axisCssSuffix}-4, var(--axis-color-${axisCssSuffix}-3, var(--axis-color-default-3)))`,
        '--roadmap-color-light': `var(--axis-color-${axisCssSuffix}-1, var(--axis-color-default-1))`,
        '--roadmap-color-medium': `var(--axis-color-${axisCssSuffix}-2, var(--axis-color-default-2))`,
        '--roadmap-color-dark': `var(--axis-color-${axisCssSuffix}-3, var(--axis-color-default-3))`,
        '--roadmap-color-darkest': `var(--axis-color-${axisCssSuffix}-4, var(--axis-color-${axisCssSuffix}-3, var(--axis-color-default-3)))`,
    };
    // --- End Roadmap Styles ---

    // Define chart line colors using global CSS variables
    const scoreColor = 'var(--axis-color-on-track-n-plus-1-2)';
    const epiphanyColor = 'var(--axis-color-environment-3)';
    const despairColor = 'var(--axis-color-financial-3)';


    return (
        <div className={styles.dailyViewContainer}>
            {isLoading ? (
                <p>Loading daily focus...</p>
            ) : error ? (
                <p className={styles.errorText}>{error}</p>
            ) : (
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
                                            <YAxis allowDecimals={false} stroke="var(--text-secondary)" fontSize="0.8em" domain={[0, 'auto']} />
                                            <Tooltip contentStyle={{ fontSize: '0.8em', padding: '5px' }} />
                                            <Legend wrapperStyle={{ fontSize: '0.8em', paddingTop: '10px' }}/>
                                            <Line type="monotone" dataKey="score" stroke={scoreColor} strokeWidth={2} dot={false} activeDot={{ r: 6, fill: scoreColor }} name="Score" />
                                            <Line type="monotone" dataKey="epiphany" stroke={epiphanyColor} strokeWidth={1} dot={false} activeDot={{ r: 4, fill: epiphanyColor }} name="E" />
                                            <Line type="monotone" dataKey="despair" stroke={despairColor} strokeWidth={1} dot={false} activeDot={{ r: 4, fill: despairColor }} name="D" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className={styles.chartMessageSmall}>Not enough data for chart.</p>
                                )}
                            </div>
                        </div>
                        <div className={styles.headerRight}>
                            <ContextMap axisName={axisName} />
                        </div>
                    </div>
                    {/* --- End Header Section --- */}

                    {/* --- Roadmap Section --- */}
                    {axisData && (axisData.question || axisData.milestones?.length > 0 || axisData.yearlyGoal) && (
                        <div className={styles.roadmapSection} style={roadmapStyle}>
                            <h3 className={styles.sectionTitle} >
                                {axisName} Roadmap
                            </h3>
                            <div className={styles.roadmapHorizontalContainer}>
                                <div className={`${styles.roadmapColumn} ${styles.roadmapQuestion}`}>
                                    <h4 className={styles.roadmapColumnTitle}>To Ponder</h4>
                                    <p>{axisData?.question || <i className={styles.notSet}>N/A</i>}</p>
                                </div>
                                <div className={`${styles.roadmapColumn} ${styles.roadmapMilestones}`}>
                                    <h4 className={styles.roadmapColumnTitle}>Milestones</h4>
                                    {axisData?.milestones && axisData.milestones.length > 0 ? (
                                        <div className={styles.milestonesHorizontalList}>
                                            {axisData.milestones.map((milestone, index) => (
                                                <div
                                                    key={milestone.text || index}
                                                    className={`${styles.milestoneItemHoriz} ${getMilestoneStatusClass(milestone, currentMilestone)}`}
                                                >
                                                    <span className={styles.milestoneTextHoriz}>{milestone.text}</span>
                                                    {milestone.dueDate && typeof milestone.dueDate.toDate === 'function' && (
                                                        <span className={styles.milestoneDateHoriz}>
                                                            Due: {milestone.dueDate.toDate().toLocaleDateString()}
                                                        </span>
                                                    )}
                                                    {milestone.completionDate &&
                                                        typeof milestone.completionDate.toDate === 'function' && (
                                                            <span className={styles.milestoneDateHoriz}>
                                                                Done: {milestone.completionDate
                                                                    .toDate()
                                                                    .toLocaleDateString()}
                                                            </span>
                                                        )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className={styles.noMilestones}>
                                            <i>No milestones defined.</i>
                                        </p>
                                    )}
                                </div>
                                <div className={`${styles.roadmapColumn} ${styles.roadmapYearlyGoal}`}>
                                    <h4 className={styles.roadmapColumnTitle}>Yearly Goal</h4>
                                    <p>{axisData?.yearlyGoal || <i className={styles.notSet}>N/A</i>}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* --- End Roadmap Section --- */}

                    {/* --- Routine Buttons --- */}
                    <div className={styles.routineButtonsWrapper}>
                        <button className={styles.routineButton} onClick={() => setIsAmModalOpen(true)}>
                            Start AM Routine
                        </button>
                         {/* <<< Added Ready For Work Button >>> */}
                         <button className={`${styles.routineButton} ${styles.readyButton}`} onClick={() => setIsReadyModalOpen(true)}>
                            Ready For Work
                        </button>
                        <button className={`${styles.routineButton} ${styles.studyButton}`} onClick={() => setIsStudyModalOpen(true)}>
                            Start Study Session
                        </button>
                        <button className={`${styles.routineButton} ${styles.familyCleanButton}`} onClick={() => setIsFamilyCleanModalOpen(true)}>
                            Start Family Clean
                        </button>
                        {/* Keep Budget Button if needed on Daily View */}
                        {/* <button className={`${styles.actionButton} ${styles.budgetButton}`} onClick={openBudgetModal}> Budget </button> */}
                        <button className={`${styles.routineButton} ${styles.pmButton}`} onClick={() => setIsPmModalOpen(true)}>
                            Start PM Routine
                        </button>
                    </div>
                    {/* --- End Routine Buttons --- */}
                </>
            )}

            {/* --- Modals --- */}
            {isAmModalOpen && (
                <Modal isOpen={isAmModalOpen} onClose={closeAmModal}>
                    <AmRoutineForm onSubmit={handleAmRoutineSubmit} onClose={closeAmModal} />
                </Modal>
            )}
            {isPmModalOpen && (
                <Modal isOpen={isPmModalOpen} onClose={closePmModal}>
                    <PmRoutineForm onSubmit={handlePmRoutineSubmit} onClose={closePmModal} />
                </Modal>
            )}
            {isFamilyCleanModalOpen && (
                <Modal isOpen={isFamilyCleanModalOpen} onClose={closeFamilyCleanModal}>
                    <FamilyCleanForm onSubmit={handleFamilyCleanSubmit} onClose={closeFamilyCleanModal} />
                </Modal>
            )}
             {isStudyModalOpen && (
                <Modal isOpen={isStudyModalOpen} onClose={closeStudyModal}>
                    <StudyForm
                        onSubmit={handleStudySubmit}
                        onClose={closeStudyModal}
                        axisQuestion={axisData?.question}
                    />
                </Modal>
            )}
            {isBudgetModalOpen && ( // Keep Budget Modal logic if button exists
                <Modal isOpen={isBudgetModalOpen} onClose={closeBudgetModal}>
                    <BudgetForm
                        onSubmit={handleBudgetSubmit}
                        onClose={closeBudgetModal}
                        onNavigate={onNavigate}
                    />
                </Modal>
            )}
            {/* <<< Added Ready For Work Modal Rendering >>> */}
            {isReadyModalOpen && (
                <Modal isOpen={isReadyModalOpen} onClose={closeReadyModal}>
                    <ReadyForWorkForm onSubmit={handleReadySubmit} onClose={closeReadyModal} />
                </Modal>
            )}
            {/* --- End Modals --- */}
        </div>
    );
}

export default DailyView;
