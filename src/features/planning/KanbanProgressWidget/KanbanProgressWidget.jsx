// src/components/KanbanProgressWidget/KanbanProgressWidget.jsx
import React, { useState, useEffect } from 'react';
import { getProjectKanbanStats } from '@/services/sprintService';
import styles from '@/features/planning/KanbanProgressWidget/KanbanProgressWidget.module.css';

/**
 * KanbanProgressWidget - Shows task completion stats for a sprint
 * @param {string} projectId - The project ID to fetch kanban stats for
 * @param {string} projectName - Name of the project (for display)
 */
function KanbanProgressWidget({ projectId, projectName }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            if (!projectId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const kanbanStats = await getProjectKanbanStats(projectId);
                setStats(kanbanStats);
            } catch (error) {
                console.error("Error fetching kanban stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [projectId]);

    if (loading) {
        return (
            <div className={styles.widget}>
                <h4 className={styles.title}>Sprint Tasks</h4>
                <div className={styles.loading}>Loading task stats...</div>
            </div>
        );
    }

    if (!stats || stats.total === 0) {
        return (
            <div className={styles.widget}>
                <h4 className={styles.title}>Sprint Tasks</h4>
                <div className={styles.emptyState}>
                    No tasks in this sprint yet. Add tasks in the kanban board!
                </div>
            </div>
        );
    }

    // Calculate completion percentage
    const completionPercentage = stats.total > 0 
        ? Math.round((stats.done / stats.total) * 100) 
        : 0;

    // Calculate sprint backlog + in progress (active work)
    const activeWork = stats.sprintBacklog + stats.inProgress;

    return (
        <div className={styles.widget}>
            <h4 className={styles.title}>Sprint Tasks: {projectName || 'Current Sprint'}</h4>
            
            <div className={styles.overallProgress}>
                <div className={styles.progressHeader}>
                    <span className={styles.progressLabel}>Overall Progress</span>
                    <span className={styles.progressPercentage}>{completionPercentage}%</span>
                </div>
                <div className={styles.progressBar}>
                    <div 
                        className={styles.progressFill} 
                        style={{ width: `${completionPercentage}%` }}
                    />
                </div>
                <div className={styles.progressStats}>
                    <span>{stats.done} completed</span>
                    <span>•</span>
                    <span>{stats.total} total</span>
                </div>
            </div>

            <div className={styles.breakdown}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>📦</div>
                    <div className={styles.statContent}>
                        <div className={styles.statValue}>{stats.productBacklog}</div>
                        <div className={styles.statLabel}>Backlog</div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon}>📋</div>
                    <div className={styles.statContent}>
                        <div className={styles.statValue}>{stats.sprintBacklog}</div>
                        <div className={styles.statLabel}>Sprint Backlog</div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon}>⚡</div>
                    <div className={styles.statContent}>
                        <div className={styles.statValue}>{stats.inProgress}</div>
                        <div className={styles.statLabel}>In Progress</div>
                    </div>
                </div>

                <div className={`${styles.statCard} ${styles.doneCard}`}>
                    <div className={styles.statIcon}>✅</div>
                    <div className={styles.statContent}>
                        <div className={styles.statValue}>{stats.done}</div>
                        <div className={styles.statLabel}>Done</div>
                    </div>
                </div>
            </div>

            {activeWork > 0 && (
                <div className={styles.activeWorkBanner}>
                    <span className={styles.activeWorkIcon}>🎯</span>
                    <span className={styles.activeWorkText}>
                        {activeWork} task{activeWork !== 1 ? 's' : ''} in active work
                    </span>
                </div>
            )}
        </div>
    );
}

export default KanbanProgressWidget;
