import React, { useState, useEffect } from 'react';
import styles from '@/features/planning/HabitChainView/HabitChainView.module.css';
import { db } from '@/firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from "firebase/firestore";

// --- Helper Functions ---

const ChainLinkIcon = ({ color, isDouble, isBold }) => {
    const strokeWidth = isBold ? "4.5" : "2.5";
    return (
        <svg className={styles.chainIcon} viewBox="0 0 24 24" fill="none">
            {isDouble && (
                <>
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72" stroke={color} strokeWidth="6" strokeOpacity="0.3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72" stroke={color} strokeWidth="6" strokeOpacity="0.3" strokeLinecap="round" strokeLinejoin="round" />
                </>
            )}
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"></path>
        </svg>
    );
};

const toDateString = (date) => {
    if (!date) return null;
    try {
        const d = date.toDate ? date.toDate() : new Date(date);
        if (isNaN(d.getTime())) return null;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        return null;
    }
};

const axisNameToCssVarSuffix = (axisName) => {
    if (!axisName || typeof axisName !== 'string') return 'default';
    return axisName.trim().toLowerCase().replace(/\s+/g, '-').replace(/\+/g, '-plus-');
};

const normalizeName = (name) => {
    if (typeof name !== 'string') return '';
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
};


// --- Main Component ---

function HabitChainView({ axisName, axisId }) {
    const [dailyData, setDailyData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasCompletions, setHasCompletions] = useState(false);

    useEffect(() => {
        // We only need axisName for this component to work now.
        if (!axisName) { 
            setIsLoading(false); 
            return; 
        }

        const fetchHabitData = async () => {
            setIsLoading(true);

            const today = new Date();
            const last7DaysDateArray = [...Array(7)].map((_, i) => {
                const d = new Date();
                d.setDate(today.getDate() - i);
                return d;
            });
            const last7DaysDateStrings = last7DaysDateArray.map(toDateString).reverse();
            const sevenDaysAgoTimestamp = Timestamp.fromDate(last7DaysDateArray[last7DaysDateArray.length - 1]);

            const completionsByDate = {};

            try {
                // --- FIX: Query using axisTheme instead of axisId ---
                const plannedTasksQuery = query(
                    collection(db, "new_tasks"),
                    where("axisTheme", "==", axisName), // Using the name directly
                    where("taskType", "==", "planned"),
                    where("status", "==", "completed"),
                    where("completedAt", ">=", sevenDaysAgoTimestamp)
                );
                const plannedTasksSnapshot = await getDocs(plannedTasksQuery);
                plannedTasksSnapshot.forEach(doc => {
                    const task = doc.data();
                    const dateStr = toDateString(task.completedAt);
                    if (dateStr) {
                        if (!completionsByDate[dateStr]) completionsByDate[dateStr] = { count: 0, sources: [] };
                        completionsByDate[dateStr].count++;
                        completionsByDate[dateStr].sources.push(task.title);
                    }
                });

                 const dailyMetricsPromises = last7DaysDateArray.map(date => getDoc(doc(db, "dailyMetrics", toDateString(date))));
                const dailyMetricsSnapshots = await Promise.all(dailyMetricsPromises);

                const normalizedAxisName = normalizeName(axisName);

                dailyMetricsSnapshots.forEach(docSnap => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        const tasksStatus = data.tasksStatus || {};
                        for (const key in tasksStatus) {
                            const routine = tasksStatus[key];
                            // Only count if routine is completed
                            if (routine.completed) {
                                let countsForCurrentAxis = false;
                                const routineName = normalizeName(key.replace(/_/g, ' ')); // Normalize key for comparison

                                // --- START OF MODIFIED LOGIC FOR DAILY METRICS ---
                                if (routineName === normalizeName("routine famclean") && normalizedAxisName === normalizeName("environment")) {
                                    countsForCurrentAxis = true;
                                } else if (routineName === normalizeName("routine study") && normalizedAxisName === normalizeName("gear")) {
                                    countsForCurrentAxis = true;
                                } else if (routineName === normalizeName("routine exercise") && normalizedAxisName === normalizeName("physical")) {
                                    countsForCurrentAxis = true;
                                } else if ((routineName === normalizeName("routine am") || routineName === normalizeName("routine pm")) && normalizedAxisName === normalizeName("on track n+1")) {
                                    countsForCurrentAxis = true;
                                }
                                // Original logic: If it's a routine and has an axisTheme, and it matches
                                else if (key.includes("routine") && routine.axisTheme && normalizeName(routine.axisTheme) === normalizedAxisName) {
                                     countsForCurrentAxis = true;
                                }
                                // --- END OF MODIFIED LOGIC FOR DAILY METRICS ---
                                
                                if (countsForCurrentAxis) {
                                    const dateStr = docSnap.id;
                                    if (!completionsByDate[dateStr]) completionsByDate[dateStr] = { count: 0, sources: [] };
                                    completionsByDate[dateStr].count++;
                                    completionsByDate[dateStr].sources.push(key.replace(/_/g, ' '));
                                }
                            }
                        }
                    }
                });

                // Format data for display
                let totalCompletions = 0;
                const formattedData = last7DaysDateStrings.map(dateStr => {
                    const dayData = completionsByDate[dateStr];
                    const logCount = dayData?.count || 0;
                    if (logCount > 0) totalCompletions++;
                    
                    let tooltip = new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
                    if (logCount > 0) {
                        tooltip += `\nCompletions: ${dayData.sources.join(', ')}`;
                    }

                    return {
                        dateStr,
                        tooltip,
                        isCompleted: logCount > 0,
                        isBold: logCount >= 2,
                        isDouble: logCount >= 4,
                    };
                });
                
                setDailyData(formattedData);
                setHasCompletions(totalCompletions > 0);

            } catch (error) {
                console.error(`Error fetching habit data for ${axisName}:`, error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHabitData();
    }, [axisName]); // The component now only depends on axisName

    if (isLoading) {
        return <div className={styles.chainGrid}><div className={styles.loadingText}>...</div></div>;
    }

    if (!hasCompletions) {
        return <div className={styles.noDataText}>No activity logged in the past 7 days.</div>;
    }

    const axisCssSuffix = axisNameToCssVarSuffix(axisName);

    return (
        <div className={styles.chainGrid}>
            {dailyData.map(day => {
                const iconColorVar = day.isCompleted 
                    ? `var(--axis-color-${axisCssSuffix}-3, #4A5568)` 
                    : '#EAEAEA';

                return (
                    <div 
                        key={day.dateStr} 
                        className={styles.dayCell} 
                        title={day.tooltip}
                        style={{ '--icon-color': iconColorVar }}
                    >
                        <div className={styles.iconContainer}>
                            <ChainLinkIcon 
                                color={iconColorVar}
                                isBold={day.isBold} 
                                isDouble={day.isDouble} 
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default React.memo(HabitChainView);