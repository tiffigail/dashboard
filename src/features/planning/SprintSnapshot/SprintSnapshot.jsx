// src/components/SprintSnapshot/SprintSnapshot.jsx
import React, { useState, useEffect } from 'react';
import styles from '@/features/planning/SprintSnapshot/SprintSnapshot.module.css';
import { db } from '@/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import {
    getPrimaryActiveSprint,
    getProjectIdFromSprint,
    getProjectKanbanStats
} from '@/services/sprintService';
import { getWeekId } from '@/utils/dateUtils';

function SprintSnapshot() {
    const [activeSprint, setActiveSprint] = useState(null);
    const [projectId, setProjectId] = useState(null);
    const [projectName, setProjectName] = useState('');
    const [weeklyFocus, setWeeklyFocus] = useState('');
    const [weeklyObjective, setWeeklyObjective] = useState('');
    const [inProgressCards, setInProgressCards] = useState([]);
    const [kanbanStats, setKanbanStats] = useState(null);
    const [standupCount, setStandupCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSprintData = async () => {
            setLoading(true);

            try {
                const sprint = await getPrimaryActiveSprint();
                setActiveSprint(sprint);

                if (!sprint) {
                    setLoading(false);
                    return;
                }

                const projId = await getProjectIdFromSprint(sprint);
                setProjectId(projId);

                if (projId) {
                    const projectDocRef = doc(db, 'projects', projId);
                    const projectSnap = await getDoc(projectDocRef);
                    if (projectSnap.exists()) {
                        setProjectName(projectSnap.data().projectName || 'Current Sprint');
                    }

                    const stats = await getProjectKanbanStats(projId);
                    setKanbanStats(stats);

                    const cardsRef = collection(db, 'kanbanCards');
                    const cardsQuery = query(cardsRef, where('projectId', '==', projId));
                    const cardsSnap = await getDocs(cardsQuery);
                    const allCards = cardsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    const inProgress = allCards.filter(card => card.status === 'inProgress');
                    setInProgressCards(inProgress.slice(0, 3));

                    const sprintLogsRef = collection(db, 'sprintLogs');
                    const logsQuery = query(sprintLogsRef, where('projectId', '==', projId));
                    const logsSnap = await getDocs(logsQuery);
                    const sprintStart = new Date(sprint.startDate);
                    const sprintEnd = new Date(sprint.endDate);
                    let standupCounter = 0;
                    logsSnap.docs.forEach(doc => {
                        const data = doc.data();
                        if (data.createdAt) {
                            const logDate = data.createdAt.toDate();
                            if (logDate >= sprintStart && logDate <= sprintEnd) standupCounter++;
                        }
                    });
                    setStandupCount(standupCounter);
                }

                const currentWeekId = getWeekId();
                const weekDocRef = doc(db, 'weeklyPlans', currentWeekId);
                const weekSnap = await getDoc(weekDocRef);
                if (weekSnap.exists()) {
                    const weekData = weekSnap.data();
                    setWeeklyFocus(weekData.focus || '');
                    setWeeklyObjective(weekData.objective || '');
                }

            } catch (error) {
                console.error('Error fetching sprint snapshot data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSprintData();
    }, []);

    if (loading) {
        return (
            <div className={styles.snapshotContainer}>
                <p className={styles.loadingText}>Loading sprint...</p>
            </div>
        );
    }

    if (!activeSprint) {
        return (
            <div className={styles.snapshotContainer}>
                <div className={styles.noSprint}>
                    <p>No active sprint</p>
                    <span className={styles.emoji}>🎯</span>
                </div>
            </div>
        );
    }

    // Calculate progress using kanban stats
    const totalTasks = kanbanStats ? (kanbanStats.sprintBacklog + kanbanStats.inProgress + kanbanStats.done) : 0;
    const progressPercentage = totalTasks > 0 ? Math.round((kanbanStats.done / totalTasks) * 100) : 0;

    // Convert axis name to CSS variable suffix
    const axisNameToCssVarSuffix = (axisName) => {
        if (!axisName || typeof axisName !== 'string') return 'default';
        return axisName.trim().toLowerCase().replace(/\s+/g, '-').replace(/\+/g, '-plus-');
    };

    const axisSuffix = axisNameToCssVarSuffix(activeSprint.axis);

    // Create CSS variables object for dynamic theming
    const axisThemeStyle = {
        '--axis-light': `var(--axis-color-${axisSuffix}-1, var(--axis-color-default-1))`,
        '--axis-medium': `var(--axis-color-${axisSuffix}-2, var(--axis-color-default-2))`,
        '--axis-dark': `var(--axis-color-${axisSuffix}-3, var(--axis-color-default-3))`,
        '--axis-darkest': `var(--axis-color-${axisSuffix}-4, var(--axis-color-default-4))`
    };

    return (
        <div className={styles.snapshotContainer} style={axisThemeStyle}>
            <div className={styles.header}>
                <h3 className={styles.title}>🚀 Sprint Snapshot</h3>
            </div>

            {/* Sprint Info */}
            <div className={styles.sprintInfo}>
                <div className={styles.sprintName}>{projectName || activeSprint.text}</div>
                <div className={styles.sprintAxis}>{activeSprint.axis}</div>
                <div className={styles.sprintDates}>
                    {activeSprint.startDate} → {activeSprint.endDate}
                </div>
            </div>

            {/* Stand-up Count */}
            {standupCount > 0 && (
                <div className={styles.standupSection}>
                    <span className={styles.standupIcon}>📅</span>
                    <span className={styles.standupText}>{standupCount} Stand-ups</span>
                </div>
            )}

            {/* Weekly Focus */}
            {weeklyFocus && (
                <div className={styles.weeklySection}>
                    <div className={styles.weeklyLabel}>Week Focus</div>
                    <div className={styles.weeklyContent}>{weeklyFocus}</div>
                </div>
            )}

            {/* Weekly Objective */}
            {weeklyObjective && (
                <div className={styles.weeklySection}>
                    <div className={styles.weeklyLabel}>Week Objective</div>
                    <div className={styles.weeklyContent}>{weeklyObjective}</div>
                </div>
            )}

            {/* Progress Metrics */}
            {kanbanStats && (
                <div className={styles.metricsSection}>
                    <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: `${progressPercentage}%` }}></div>
                    </div>
                    <div className={styles.progressText}>{progressPercentage}% Complete</div>

                    <div className={styles.taskCounts}>
                        <div className={styles.countItem}>
                            <span className={styles.countNumber}>{kanbanStats.sprintBacklog}</span>
                            <span className={styles.countLabel}>To Do</span>
                        </div>
                        <div className={styles.countItem}>
                            <span className={styles.countNumber}>{kanbanStats.inProgress}</span>
                            <span className={styles.countLabel}>In Progress</span>
                        </div>
                        <div className={styles.countItem}>
                            <span className={styles.countNumber}>{kanbanStats.done}</span>
                            <span className={styles.countLabel}>Done</span>
                        </div>
                    </div>
                </div>
            )}

            {/* In Progress Cards */}
            {inProgressCards.length > 0 && (
                <div className={styles.cardsSection}>
                    <div className={styles.cardsHeader}>Active Tasks</div>
                    {inProgressCards.map(card => (
                        <div key={card.id} className={styles.card}>
                            <div className={styles.cardTitle}>{card.title}</div>
                            {card.acceptanceCriteria && card.acceptanceCriteria.length > 0 && (
                                <div className={styles.cardCriteria}>
                                    {card.acceptanceCriteria.length} criteria
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Motivational Message */}
            <div className={styles.motivation}>
                {progressPercentage === 100 ? '🎉 Sprint Complete!' :
                 progressPercentage >= 75 ? '💪 Almost there!' :
                 progressPercentage >= 50 ? '⚡ Making progress!' :
                 progressPercentage >= 25 ? '🔥 Keep pushing!' :
                 '🌟 Let\'s get started!'}
            </div>
        </div>
    );
}

export default SprintSnapshot;
