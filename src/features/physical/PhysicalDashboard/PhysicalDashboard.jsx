// src/components/PhysicalDashboard/PhysicalDashboard.jsx (ENHANCED VERSION)
import React, { useState, useEffect } from 'react';
import { db } from '@/firebaseConfig';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { 
    calculateSprintProgress, 
    getHabitCompletionStats 
} from '@/services/sprintService';
import styles from '@/features/physical/PhysicalDashboard/PhysicalDashboard.module.css';
import PhysicalMetricsChart from '@/features/physical/PhysicalMetricsChart/PhysicalMetricsChart';
import KanbanProgressWidget from '@/features/planning/KanbanProgressWidget/KanbanProgressWidget';

function PhysicalDashboard({ sprint, projectId }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sprintProgress, setSprintProgress] = useState(null);
    const [habitStats, setHabitStats] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch physical goals logs
                const logsRef = collection(db, 'physicalGoalsLogs');
                const q = query(logsRef, orderBy('amMetricsCompletedAt', 'asc'));
                const querySnapshot = await getDocs(q);

                let allData = querySnapshot.docs.map(doc => ({
                    id: doc.id, // "YYYY-MM-DD"
                    ...doc.data()
                }));

                // If sprint is active, calculate sprint-specific stats
                if (sprint) {
                    const progress = calculateSprintProgress(sprint.startDate, sprint.endDate);
                    setSprintProgress(progress);

                    const habits = await getHabitCompletionStats(sprint.startDate, sprint.endDate);
                    setHabitStats(habits);

                    // Filter data to sprint dates
                    allData = allData.filter(d => 
                        d.id >= sprint.startDate && d.id <= sprint.endDate
                    );
                }

                setData(allData);
                
            } catch (err) {
                console.error("Error fetching physical logs:", err);
                setError("Could not load dashboard data.");
            }
            setLoading(false);
        };

        fetchData();
    }, [sprint]);

    if (loading) {
        return <div className={styles.dashboardContainer}>Loading Dashboard...</div>;
    }

    if (error) {
        return <div className={styles.dashboardContainer}>{error}</div>;
    }

    // Calculate current week stats
    const last7Days = data.slice(-7);
    const totalSteps = last7Days.reduce((sum, day) => sum + (day.steps || 0), 0);
    const avgSteps = last7Days.length > 0 ? Math.round(totalSteps / last7Days.length) : 0;
    const gymDays = last7Days.filter(day => day.wentToGym).length;
    const totalMeals = last7Days.reduce((sum, day) => {
        const meals = day.meals || {};
        return sum + Object.values(meals).filter(Boolean).length;
    }, 0);

    // Get latest weight and bodyfat
    const latestDay = data[data.length - 1];
    const currentWeight = latestDay?.weight || 0;
    const currentBodyfat = latestDay?.bodyfat || 0;

    // Calculate trends (last 60 days)
    const last60Days = data.slice(-60);
    const weightTrend = last60Days.length >= 2 
        ? ((last60Days[last60Days.length - 1]?.weight || 0) - (last60Days[0]?.weight || 0))
        : 0;
    const workoutStatus = weightTrend > 0 ? "Gaining" : weightTrend < 0 ? "Losing" : "Maintaining";

    return (
        <div className={styles.dashboardContainer}>
            <h2 className={styles.dashboardTitle}>Physical Goals Dashboard</h2>
            
            {/* Sprint Progress Section */}
            {sprintProgress && (
                <div className={styles.sprintSection}>
                    <h3 className={styles.sectionTitle}>Sprint Progress</h3>
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statLabel}>Days Elapsed</div>
                            <div className={styles.statValue}>{sprintProgress.daysElapsed} / {sprintProgress.totalDays}</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statLabel}>Days Remaining</div>
                            <div className={styles.statValue}>{sprintProgress.daysRemaining}</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statLabel}>Progress</div>
                            <div className={styles.statValue}>{sprintProgress.percentComplete}%</div>
                            <div className={styles.progressBar}>
                                <div 
                                    className={styles.progressFill} 
                                    style={{ width: `${sprintProgress.percentComplete}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Kanban Progress Widget */}
            {projectId && sprint && (
                <KanbanProgressWidget 
                    projectId={projectId} 
                    projectName={sprint.text?.replace('Sprint: ', '')}
                />
            )}

            {/* Habit Completion Section */}
            {habitStats && (
                <div className={styles.habitSection}>
                    <h3 className={styles.sectionTitle}>Habit Completion</h3>
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statLabel}>AM Routine</div>
                            <div className={styles.statValue}>{habitStats.amCompletionRate}%</div>
                            <div className={styles.statSubtext}>{habitStats.amDaysLogged} days logged</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statLabel}>PM Routine</div>
                            <div className={styles.statValue}>{habitStats.pmCompletionRate}%</div>
                            <div className={styles.statSubtext}>{habitStats.pmDaysLogged} days logged</div>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.grid}>
                {/* Current Week Stats */}
                <div className={styles.currentWeekSection}>
                    <h3 className={styles.sectionTitle}>Current Week</h3>
                    <div className={styles.statsGrid}>
                        <div className={styles.kpiCard}>
                            <div className={styles.kpiLabel}>Avg Daily Steps</div>
                            <div className={styles.kpiValue}>{avgSteps.toLocaleString()}</div>
                        </div>
                        <div className={styles.kpiCard}>
                            <div className={styles.kpiLabel}>Meals Logged</div>
                            <div className={styles.kpiValue}>{totalMeals} / {last7Days.length * 4}</div>
                        </div>
                        <div className={styles.kpiCard}>
                            <div className={styles.kpiLabel}>Gym Days</div>
                            <div className={styles.kpiValue}>{gymDays} / 7</div>
                        </div>
                    </div>
                </div>

                {/* Overall Trends */}
                <div className={styles.trendsSection}>
                    <h3 className={styles.sectionTitle}>Overall Trends (Last 60 Days)</h3>
                    <div className={styles.statsGrid}>
                        <div className={styles.kpiCard}>
                            <div className={styles.kpiLabel}>Current Weight</div>
                            <div className={styles.kpiValue}>{currentWeight} lbs</div>
                        </div>
                        <div className={styles.kpiCard}>
                            <div className={styles.kpiLabel}>Weekly Trend</div>
                            <div className={styles.kpiValue} style={{ color: weightTrend > 0 ? '#4caf50' : '#f44336' }}>
                                {weightTrend > 0 ? '+' : ''}{weightTrend.toFixed(1)} lbs
                            </div>
                        </div>
                        <div className={`${styles.kpiCard} ${styles[workoutStatus.toLowerCase()]}`}>
                            <div className={styles.kpiLabel}>Workout Goal</div>
                            <div className={styles.kpiValue}>{workoutStatus}</div>
                        </div>
                    </div>
                </div>

                {/* Weight & Body Fat Chart */}
                <div className={`${styles.card} ${styles.fullWidth}`}>
                    <PhysicalMetricsChart chartData={data} />
                </div>
            </div>
        </div>
    );
}

export default PhysicalDashboard;
