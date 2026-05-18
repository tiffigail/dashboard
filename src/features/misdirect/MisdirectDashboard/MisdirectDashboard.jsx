// src/components/MisdirectDashboard/MisdirectDashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
    calculateSprintProgress, 
    getHabitCompletionStats 
} from '@/services/sprintService';
import styles from '@/features/misdirect/MisdirectDashboard/MisdirectDashboard.module.css';
import KanbanProgressWidget from '@/features/planning/KanbanProgressWidget/KanbanProgressWidget';

function MisdirectDashboard({ sprint, projectId }) {
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
                console.error("Error fetching Misdirect dashboard data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [sprint]);

    if (loading) {
        return <div className={styles.container}>Loading Misdirect Dashboard...</div>;
    }

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>Misdirect Dashboard 🎯</h2>

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

            {/* Misdirect Info Section */}
            <div className={styles.metricsSection}>
                <h3 className={styles.sectionTitle}>About Misdirect</h3>
                <div className={styles.infoBox}>
                    <p className={styles.infoText}>
                        🎯 <strong>Strategic Distractions:</strong> Misdirect projects are intentional breaks 
                        from your main focus areas to prevent burnout and maintain creativity.
                    </p>
                    <p className={styles.infoText}>
                        These could be hobby projects, creative endeavors, or leisure activities that provide 
                        mental refreshment while still contributing to your overall productivity system.
                    </p>
                    <p className={styles.infoText}>
                        Track your Misdirect sprint progress using the kanban board above!
                    </p>
                </div>
            </div>
        </div>
    );
}

export default MisdirectDashboard;
