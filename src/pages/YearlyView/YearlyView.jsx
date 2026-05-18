import React, { useState, useEffect } from 'react';
import styles from '@/pages/YearlyView/YearlyView.module.css';
import { db } from '@/firebaseConfig';
import { collection, onSnapshot, query, where } from "firebase/firestore";
import YearlyAxisOverview from '@/features/planning/YearlyAxisOverview/YearlyAxisOverview';
import SixMonthCheckinModal from '@/features/planning/SixMonthCheckinModal/SixMonthCheckinModal';
import ParetoTimelineModal from '@/components/timeline/Timeline/ParetoTimelineModal/ParetoTimelineModal';
// ✅ 1. Import the new YearlyReviewModal
import YearlyReviewModal from '@/features/planning/YearlyReviewModal/YearlyReviewModal';


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

    useEffect(() => {
        setIsLoading(true);
        setError(null);

        let latestAxes = null;
        let latestGoals = null;
        let latestMilestones = null;

        const buildAndSet = () => {
            if (!latestAxes || !latestGoals || !latestMilestones) return;

            const axesMap = new Map(latestAxes.map(a => [a.id, a]));
            const goalsByAxisId = new Map();
            latestGoals.forEach(goal => {
                if (!goalsByAxisId.has(goal.axisId)) goalsByAxisId.set(goal.axisId, []);
                goalsByAxisId.get(goal.axisId).push(goal);
            });
            const milestonesByGoal = new Map();
            latestMilestones.forEach(m => {
                if (!milestonesByGoal.has(m.goalId)) milestonesByGoal.set(m.goalId, []);
                milestonesByGoal.get(m.goalId).push(m);
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
                        activeGoal = sortedGoals[0];
                        achievedGoals = sortedGoals.slice(1);
                    }
                }
                const milestones = activeGoal ? (milestonesByGoal.get(activeGoal.id) || []) : [];
                combinedData.push({ ...axis, yearlyGoal: activeGoal, achievedGoals, milestones });
            }

            const sortedData = axisDisplayOrder
                .map(orderInfo => {
                    const found = combinedData.find(a => a.axisName === orderInfo.id);
                    return found ? { ...found, displayName: orderInfo.displayName } : undefined;
                })
                .filter(Boolean);

            setAllAxesData(sortedData);
            setIsLoading(false);
        };

        const goalsQuery = query(
            collection(db, "new_goals"),
            where("type", "==", "yearly"),
            where("year", "==", currentYear)
        );

        const unsubAxes = onSnapshot(collection(db, "new_axes"),
            snap => { latestAxes = snap.docs.map(d => ({ id: d.id, ...d.data() })); buildAndSet(); },
            err => { console.error("Error loading axes:", err); setError("Failed to load yearly data."); setIsLoading(false); }
        );
        const unsubGoals = onSnapshot(goalsQuery,
            snap => { latestGoals = snap.docs.map(d => ({ id: d.id, ...d.data() })); buildAndSet(); },
            err => { console.error("Error loading goals:", err); setError("Failed to load yearly data."); setIsLoading(false); }
        );
        const unsubMilestones = onSnapshot(collection(db, "new_milestones"),
            snap => { latestMilestones = snap.docs.map(d => ({ id: d.id, ...d.data() })); buildAndSet(); },
            err => { console.error("Error loading milestones:", err); setError("Failed to load yearly data."); setIsLoading(false); }
        );

        return () => { unsubAxes(); unsubGoals(); unsubMilestones(); };
    }, []);

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
            <YearlyAxisOverview isOpen={!!selectedAxis} onClose={handleCloseModal} axisData={selectedAxis} onDataUpdated={() => {}} onOpenTimeline={handleOpenTimelineModal} />
            <SixMonthCheckinModal isOpen={isCheckinModalOpen} onClose={() => setIsCheckinModalOpen(false)} onOpenTimeline={handleOpenTimelineModal} allAxesData={allAxesData} />
            {/* ✅ 4. Render the new YearlyReviewModal */}
            <YearlyReviewModal isOpen={isYearlyModalOpen} onClose={() => setIsYearlyModalOpen(false)} onOpenTimeline={handleOpenTimelineModal} allAxesData={allAxesData} />
            <ParetoTimelineModal isOpen={isTimelineModalOpen} onClose={handleCloseTimelineModal} />
        </div>
    );
}

export default YearlyView;