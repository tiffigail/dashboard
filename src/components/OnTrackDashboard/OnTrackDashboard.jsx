// src/components/OnTrackDashboard/OnTrackDashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
    calculateSprintProgress, 
    getHabitCompletionStats 
} from '../../services/sprintService';
import styles from './OnTrackDashboard.module.css';
import KanbanProgressWidget from '../KanbanProgressWidget/KanbanProgressWidget';

function OnTrackDashboard({ sprint, projectId }) {
    const [loading, setLoading] = useState(true);
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
            } catch (err) {
                console.error("Error fetching On Track N+1 dashboard data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [sprint]);

    if (loading) {
        return <div className={styles.container}>Loading On Track N+1 Dashboard...</div>;
    }

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>On Track N+1 Dashboard 🎯</h2>

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

            {/* On Track Info Section */}
            <div className={styles.metricsSection}>
                <h3 className={styles.sectionTitle}>About On Track N+1</h3>
                <div className={styles.infoBox}>
                    <p className={styles.infoText}>
                        🔄 <strong>Continuous Alignment:</strong> On Track N+1 is about ensuring your daily 
                        actions align with your personal values and long-term goals. Again and Again.
                    </p>
                    <p className={styles.infoText}>
                        This axis focuses on regular self-reflection, goal review, and course correction to 
                        keep you moving in the right direction.
                    </p>
                    <p className={styles.infoText}>
                        Track your alignment projects using the kanban board and maintain momentum toward 
                        your future self!
                    </p>
                </div>
            </div>
        </div>
    );
}

export default OnTrackDashboard;
