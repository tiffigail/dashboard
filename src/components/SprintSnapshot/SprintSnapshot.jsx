// src/components/SprintSnapshot/SprintSnapshot.jsx
import React, { useState, useEffect } from 'react';
import styles from './SprintSnapshot.module.css';
import { db } from '../../firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import {
    getPrimaryActiveSprint,
    getProjectIdFromSprint,
    getProjectKanbanStats
} from '../../services/sprintService';

function getWeekId(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

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
    const [debugInfo, setDebugInfo] = useState({});

    useEffect(() => {
        const fetchSprintData = async () => {
            setLoading(true);
            const debug = {};

            try {
                // Get active sprint
                console.log('🔍 Fetching active sprint...');
                const sprint = await getPrimaryActiveSprint();
                debug.sprint = sprint;
                console.log('Sprint found:', sprint);
                setActiveSprint(sprint);

                if (!sprint) {
                    console.log('❌ No active sprint');
                    setDebugInfo(debug);
                    setLoading(false);
                    return;
                }

                // Get project ID and name
                console.log('🔍 Getting project ID from sprint...');
                const projId = await getProjectIdFromSprint(sprint);
                debug.projectId = projId;
                console.log('Project ID:', projId);
                setProjectId(projId);

                if (projId) {
                    // Get project name
                    const projectDocRef = doc(db, 'projects', projId);
                    const projectSnap = await getDoc(projectDocRef);
                    if (projectSnap.exists()) {
                        const pName = projectSnap.data().projectName || 'Current Sprint';
                        console.log('Project name:', pName);
                        setProjectName(pName);
                    }

                    // Get kanban stats using the helper function
                    console.log('🔍 Fetching kanban stats...');
                    const stats = await getProjectKanbanStats(projId);
                    debug.kanbanStats = stats;
                    console.log('Kanban stats:', stats);
                    setKanbanStats(stats);

                    // Get in-progress cards directly
                    console.log('🔍 Fetching in-progress cards...');
                    const cardsRef = collection(db, 'kanbanCards');
                    const cardsQuery = query(cardsRef, where('projectId', '==', projId));
                    const cardsSnap = await getDocs(cardsQuery);

                    const allCards = cardsSnap.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                    debug.totalCards = allCards.length;
                    console.log(`Total cards found: ${allCards.length}`);

                    // FIXED: Use 'inProgress' (camelCase) instead of 'In Progress'
                    const inProgress = allCards.filter(card => {
                        console.log(`Card "${card.title}" status: "${card.status}"`);
                        return card.status === 'inProgress';
                    });

                    debug.inProgressCount = inProgress.length;
                    console.log(`In Progress cards: ${inProgress.length}`);
                    setInProgressCards(inProgress.slice(0, 3)); // Limit to 3 for compact view

                    // Count stand-ups/sprint logs for this sprint
                    console.log('🔍 Counting stand-ups...');
                    const sprintLogsRef = collection(db, 'sprintLogs');
                    const logsQuery = query(sprintLogsRef, where('projectId', '==', projId));
                    const logsSnap = await getDocs(logsQuery);

                    // Filter logs within sprint date range
                    const sprintStart = new Date(sprint.startDate);
                    const sprintEnd = new Date(sprint.endDate);

                    let standupCounter = 0;
                    logsSnap.docs.forEach(doc => {
                        const data = doc.data();
                        if (data.createdAt) {
                            const logDate = data.createdAt.toDate();
                            if (logDate >= sprintStart && logDate <= sprintEnd) {
                                standupCounter++;
                            }
                        }
                    });

                    debug.standupCount = standupCounter;
                    console.log(`Stand-ups during sprint: ${standupCounter}`);
                    setStandupCount(standupCounter);
                }

                // Get current week's focus and objective
                console.log('🔍 Fetching weekly plan...');
                const currentWeekId = getWeekId();
                const weekDocRef = doc(db, 'weeklyPlans', currentWeekId);
                const weekSnap = await getDoc(weekDocRef);

                if (weekSnap.exists()) {
                    const weekData = weekSnap.data();
                    debug.weekData = { focus: weekData.focus, objective: weekData.objective };
                    console.log('Week data:', debug.weekData);
                    setWeeklyFocus(weekData.focus || '');
                    setWeeklyObjective(weekData.objective || '');
                } else {
                    console.log('No weekly plan found for:', currentWeekId);
                }

                setDebugInfo(debug);
            } catch (error) {
                console.error('❌ Error fetching sprint snapshot data:', error);
                debug.error = error.message;
                setDebugInfo(debug);
            } finally {
                setLoading(false);
                console.log('📊 Debug Info:', debug);
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
