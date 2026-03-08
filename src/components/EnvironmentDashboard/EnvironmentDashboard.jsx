// src/components/EnvironmentDashboard/EnvironmentDashboard.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebaseConfig';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { 
    calculateSprintProgress, 
    getHabitCompletionStats 
} from '../../services/sprintService';
import styles from './EnvironmentDashboard.module.css';
import KanbanProgressWidget from '../KanbanProgressWidget/KanbanProgressWidget';

function EnvironmentDashboard({ sprint, projectId }) {
    const [loading, setLoading] = useState(true);
    const [cleaningData, setCleaningData] = useState([]);
    const [sprintProgress, setSprintProgress] = useState(null);
    const [habitStats, setHabitStats] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                // Calculate sprint progress
                if (sprint) {
                    const progress = calculateSprintProgress(sprint.startDate, sprint.endDate);
                    setSprintProgress(progress);

                    const habits = await getHabitCompletionStats(sprint.startDate, sprint.endDate);
                    setHabitStats(habits);
                }

                // Fetch cleaning/room rating logs (if you have these collections)
                // const roomRatingsRef = collection(db, 'roomRatings');
                // const cleaningLogsRef = collection(db, 'familyCleanLogs');
                // ... fetch data here
                
            } catch (err) {
                console.error("Error fetching Environment dashboard data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [sprint]);

    if (loading) {
        return <div className={styles.container}>Loading Environment Dashboard...</div>;
    }

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>Environment Dashboard 🏠</h2>

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

            {/* Environment Metrics Section */}
            <div className={styles.metricsSection}>
                <h3 className={styles.sectionTitle}>Environment Metrics</h3>
                <div className={styles.infoBox}>
                    <p className={styles.infoText}>
                        💡 <strong>Coming Soon:</strong> This dashboard will display your room ratings, 
                        cleaning logs, and home environment tracking data.
                    </p>
                    <p className={styles.infoText}>
                        Track your environment improvements during this sprint by using the Family Clean form 
                        and rating your living spaces regularly.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default EnvironmentDashboard;
