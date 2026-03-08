import React, { useState, useEffect, useCallback } from 'react';
import styles from './YearlyView.module.css';
import { db } from '../../firebaseConfig';
import { collection, getDocs, query, where } from "firebase/firestore";
import YearlyAxisOverview from '../YearlyAxisOverview/YearlyAxisOverview';
import SixMonthCheckinModal from '../SixMonthCheckinModal/SixMonthCheckinModal';
import ParetoTimelineModal from '../Timeline/ParetoTimelineModal/ParetoTimelineModal';
// ✅ 1. Import the new YearlyReviewModal
import YearlyReviewModal from '../YearlyReviewModal/YearlyReviewModal';


const axisColorMap = {
    "Physical":           { light: '#FDC1B4', medium: '#f59284', dark: '#e7514c' },
    "Financial":          { light: '#e9def4', medium: '#beaccf', dark: '#927aaa' },
    "Gear":               { light: '#c9ebf4', medium: '#7ebde0', dark: '#3280a7' },
    "On Track N+1":       { light: '#BCDDDC', medium: '#618882', dark: '#053229' },
    "Environment":        { light: '#efe5c3', medium: '#e3d295', dark: '#d8bf67' },
    "Misdirect":          { light: '#b0e8d7', medium: '#78bfa1', dark: '#409c7c' },
    "Rest and preparation": { light: '#eaf1fa', medium: '#cbdbe7', dark: '#aec6de' },
    "default":            { light: '#F1F5F9', medium: '#abb5c2', dark: '#64748B' }
};

const axisDisplayOrder = [
    { id: "Rest and preparation", displayName: "Rest and preparation" },
    { id: "Physical", displayName: "Physical" },
    { id: "Financial", displayName: "Financial" },
    { id: "Gear", displayName: "Gear" },
    { id: "On Track N+1", displayName: "On Track N+1" },
    { id: "Misdirect", displayName: "Misdirect" },
    { id: "Environment", displayName: "Environment" }
];

function YearlyView({ onNavigate }) {
    const currentYear = new Date().getFullYear();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [allAxesData, setAllAxesData] = useState([]);
    const [selectedAxis, setSelectedAxis] = useState(null);
    const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
    const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
    // ✅ 2. Add state for the new yearly review modal
    const [isYearlyModalOpen, setIsYearlyModalOpen] = useState(false);

    // ... (All your data fetching and other functions remain exactly the same)
    const fetchRefactoredYearlyData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const goalsQuery = query(
                collection(db, "new_goals"),
                where("type", "==", "yearly"),
                where("year", "==", currentYear)
            );

            const [axesSnapshot, goalsSnapshot, milestonesSnapshot] = await Promise.all([
                getDocs(collection(db, "new_axes")),
                getDocs(goalsQuery),
                getDocs(collection(db, "new_milestones"))
            ]);

            const axesMap = new Map(axesSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() }]));
            const goalsByAxisId = new Map();
            goalsSnapshot.forEach(doc => {
                const goal = { id: doc.id, ...doc.data() };
                if (!goalsByAxisId.has(goal.axisId)) {
                    goalsByAxisId.set(goal.axisId, []);
                }
                goalsByAxisId.get(goal.axisId).push(goal);
            });

            const milestonesByGoal = new Map();
            milestonesSnapshot.forEach(doc => {
                const milestone = { id: doc.id, ...doc.data() };
                if (!milestonesByGoal.has(milestone.goalId)) {
                    milestonesByGoal.set(milestone.goalId, []);
                }
                milestonesByGoal.get(milestone.goalId).push(milestone);
            });

            const combinedData = [];
            for (const axis of axesMap.values()) {
                const axisGoals = goalsByAxisId.get(axis.id) || [];
                let activeGoal = null;
                let achievedGoals = [];
                if (axisGoals.length > 0) {
                    const sortedGoals = [...axisGoals].sort((a, b) =>
                        (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)
                    );
                    const currentlyActive = sortedGoals.find(g => g.completionDate == null);

if (currentlyActive) {
    activeGoal = currentlyActive;
    achievedGoals = sortedGoals.filter(g => g.id !== activeGoal.id);
} else {
    // If all are completed, show the most recent one as the main title
    activeGoal = sortedGoals[0]; 
    achievedGoals = sortedGoals.slice(1); // Put the rest in the 'achieved' list
}
                }
                const milestones = activeGoal ? (milestonesByGoal.get(activeGoal.id) || []) : [];
                combinedData.push({ ...axis, yearlyGoal: activeGoal, achievedGoals: achievedGoals, milestones: milestones });
            }

            const sortedData = axisDisplayOrder
                .map(orderInfo => {
                    const foundAxis = combinedData.find(axis => axis.axisName === orderInfo.id);
                    if (foundAxis) return { ...foundAxis, displayName: orderInfo.displayName };
                    return undefined;
                })
                .filter(axis => axis !== undefined);
            setAllAxesData(sortedData);
        } catch (err) {
            console.error(`Error fetching ${currentYear} yearly data:`, err);
            setError("Failed to load yearly data.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRefactoredYearlyData();
    }, [fetchRefactoredYearlyData]);

    const handleOpenModal = (axis) => setSelectedAxis(axis);
    const handleCloseModal = () => setSelectedAxis(null);
    const handleOpenTimelineModal = () => setIsTimelineModalOpen(true);
    const handleCloseTimelineModal = () => setIsTimelineModalOpen(false);
    const calculateProgress = (milestones) => {
        if (!Array.isArray(milestones) || milestones.length === 0) return 0;
        const completedCount = milestones.filter(m => m && m.completionDate != null).length;
        return (completedCount / milestones.length) * 100;
    };

    return (
        <div className={styles.yearlyViewContainer}>
            <h2 className={styles.viewTitle}>Yearly Dashboard ({currentYear})</h2>
            {isLoading ? <p>Loading {currentYear} Goals...</p> : error ? <p className={styles.errorText}>{error}</p> : (
                <>
                    <div className={styles.axisGrid}>{allAxesData.map((axis) => {
                        const progress = calculateProgress(axis.milestones);
                        const axisColor = (axisColorMap[axis.displayName] || axisColorMap.default).dark;
                        return (
                            <div key={axis.id} className={styles.axisCard} onClick={() => handleOpenModal(axis)} style={{ cursor: 'pointer' }}>
                                <div className={styles.cardContent}>
                                    <div className={styles.cardLeft}>
                                        <h3 className={styles.axisTitleLg}>{axis.displayName}</h3>
                                        {axis.achievedGoals && axis.achievedGoals.map(ag => (<p key={ag.id} className={styles.achievedGoal}>✅ {ag.title}</p>))}
                                    </div>
                                    <div className={styles.cardRight}>
                                        <p className={styles.yearlyGoalText}>{axis.yearlyGoal?.title || <i className={styles.notSet}>Yearly goal not set</i>}</p>
                                        <div className={styles.progressWrapper}>
                                            <div className={styles.peacockBorder}>
                                                <div className={styles.progressBarContainer}>
                                                    <div className={styles.progressBar} style={{ width: `${progress}%`, backgroundColor: axisColor }}></div>
                                                </div>
                                            </div>
                                            <p className={styles.progressLabel}>{Math.round(progress)}%</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    </div>
                    {/* ✅ 3. New section for review and planning buttons */}
                    <div className={styles.reviewActionsContainer}>
                        <div className={styles.checkinSection}>
                            <h3>Mid-Year Check-in</h3>
                            <p>It's August! A perfect time for a 6-month check-in on your {currentYear} goals.</p>
                            <button className={styles.checkinButton} onClick={() => setIsCheckinModalOpen(true)}>
                                Start 6-Month Check-in
                            </button>
                        </div>
                        <div className={styles.checkinSection}>
                            <h3>Yearly Review & Planning</h3>
                            <p>Reflect on the past year and set powerful intentions for the next one.</p>
                            <button className={styles.checkinButton} onClick={() => setIsYearlyModalOpen(true)}>
                                Start Yearly Review
                            </button>
                        </div>
                    </div>
                </>
            )}
            <YearlyAxisOverview isOpen={!!selectedAxis} onClose={handleCloseModal} axisData={selectedAxis} onDataUpdated={fetchRefactoredYearlyData} onOpenTimeline={handleOpenTimelineModal} />
            <SixMonthCheckinModal isOpen={isCheckinModalOpen} onClose={() => setIsCheckinModalOpen(false)} onOpenTimeline={handleOpenTimelineModal} allAxesData={allAxesData} />
            {/* ✅ 4. Render the new YearlyReviewModal */}
            <YearlyReviewModal isOpen={isYearlyModalOpen} onClose={() => setIsYearlyModalOpen(false)} onOpenTimeline={handleOpenTimelineModal} allAxesData={allAxesData} />
            <ParetoTimelineModal isOpen={isTimelineModalOpen} onClose={handleCloseTimelineModal} />
        </div>
    );
}

export default YearlyView;