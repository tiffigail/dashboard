// src/components/GearDashboard/GearDashboard.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebaseConfig';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { 
    calculateSprintProgress, 
    getHabitCompletionStats, 
    getProjectKanbanStats 
} from '../../services/sprintService';
import styles from './GearDashboard.module.css';

function GearDashboard({ sprint }) {
    const [loading, setLoading] = useState(true);
    const [studyData, setStudyData] = useState([]);
    const [habitStats, setHabitStats] = useState(null);
    const [kanbanStats, setKanbanStats] = useState(null);
    const [sprintProgress, setSprintProgress] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                // Calculate sprint progress
                if (sprint) {
                    const progress = calculateSprintProgress(sprint.startDate, sprint.endDate);
                    setSprintProgress(progress);

                    // Get habit completion stats
                    const habits = await getHabitCompletionStats(sprint.startDate, sprint.endDate);
                    setHabitStats(habits);

                    // Extract project ID from sprint text if available
                    // Sprint text format: "Sprint: ProjectName"
                    // We'll need to match this to get the project ID
                    // For now, we'll skip kanban stats unless we can extract projectId
                }

                // Fetch study logs
                const logsRef = collection(db, 'dailyStudyLogs');
                const querySnapshot = await getDocs(logsRef);

                const allData = querySnapshot.docs.map(doc => ({
                    dateString: doc.id, // "YYYY-MM-DD"
                    ...doc.data()
                }));

                // Sort by date
                allData.sort((a, b) => a.dateString.localeCompare(b.dateString));

                // Filter to sprint dates if sprint is active
                let filteredData = allData;
                if (sprint) {
                    filteredData = allData.filter(d => 
                        d.dateString >= sprint.startDate && d.dateString <= sprint.endDate
                    );
                }

                setStudyData(filteredData);
            } catch (err) {
                console.error("Error fetching Gear dashboard data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [sprint]);

    if (loading) {
        return <div className={styles.container}>Loading Gear Dashboard...</div>;
    }

    // Calculate summary stats
    const totalStudyMinutes = studyData.reduce((sum, day) => sum + (day.totalMinutes || 0), 0);
    const avgStudyMinutes = studyData.length > 0 ? Math.round(totalStudyMinutes / studyData.length) : 0;
    const totalStudyHours = (totalStudyMinutes / 60).toFixed(1);
    const daysWithStudy = studyData.filter(d => d.totalMinutes > 0).length;

    // Get last 7 days for chart
    const last7Days = studyData.slice(-7);

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>Gear Dashboard 🎓</h2>

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

            {/* Study Metrics Section */}
            <div className={styles.studySection}>
                <h3 className={styles.sectionTitle}>Study Metrics</h3>
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Total Study Time</div>
                        <div className={styles.statValue}>{totalStudyHours} hrs</div>
                        <div className={styles.statSubtext}>{totalStudyMinutes} minutes</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Daily Average</div>
                        <div className={styles.statValue}>{avgStudyMinutes} min</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Active Days</div>
                        <div className={styles.statValue}>{daysWithStudy} / {studyData.length}</div>
                        <div className={styles.statSubtext}>
                            {studyData.length > 0 ? Math.round((daysWithStudy / studyData.length) * 100) : 0}% consistency
                        </div>
                    </div>
                </div>
            </div>

            {/* Last 7 Days Chart */}
            {last7Days.length > 0 && (
                <div className={styles.chartSection}>
                    <h3 className={styles.sectionTitle}>Last 7 Days</h3>
                    <div className={styles.barChart}>
                        {last7Days.map((day, index) => {
                            const height = day.totalMinutes > 0 ? Math.min((day.totalMinutes / 120) * 100, 100) : 5;
                            return (
                                <div key={index} className={styles.barWrapper}>
                                    <div 
                                        className={styles.bar}
                                        style={{ height: `${height}%` }}
                                        title={`${day.totalMinutes} minutes`}
                                    >
                                        <span className={styles.barValue}>
                                            {day.totalMinutes > 0 ? day.totalMinutes : ''}
                                        </span>
                                    </div>
                                    <div className={styles.barLabel}>
                                        {day.dateString.slice(-5)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Detailed Breakdown */}
            {studyData.length > 0 && (
                <div className={styles.detailsSection}>
                    <h3 className={styles.sectionTitle}>Study Breakdown</h3>
                    <div className={styles.table}>
                        <div className={styles.tableHeader}>
                            <div>Date</div>
                            <div>Study Modal</div>
                            <div>Flashcards</div>
                            <div>LinkedIn</div>
                            <div>Total</div>
                        </div>
                        {studyData.slice(-14).reverse().map((day, index) => (
                            <div key={index} className={styles.tableRow}>
                                <div>{day.dateString}</div>
                                <div>{day.studyModalMinutes || 0} min</div>
                                <div>{day.flashcardsModalMinutes || 0} min</div>
                                <div>{day.linkedinMinutes || 0} min</div>
                                <div className={styles.totalCell}>{day.totalMinutes || 0} min</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {studyData.length === 0 && (
                <div className={styles.emptyState}>
                    <p>No study data recorded yet. Start tracking your learning in the PM routine!</p>
                </div>
            )}
        </div>
    );
}

export default GearDashboard;
