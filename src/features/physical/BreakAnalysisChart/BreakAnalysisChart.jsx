// src/components/BreakAnalysisChart/BreakAnalysisChart.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Bar, Bubble } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    BarElement,
    BubbleController,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { db } from '@/firebaseConfig';
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    BarElement,
    BubbleController,
    Title,
    Tooltip,
    Legend,
    ChartDataLabels
);

// Helper to get color based on rating (e.g., efficacy) for Charts 4 & 5
// Palette: Red (Poor) -> Orange (Fair) -> Distinct Blue (Avg) -> Purple (Good) -> Jungle Green (Exc)
const getModifiedRatingColor = (rating) => {
    const roundedRating = Math.max(1, Math.min(5, Math.round(rating))); // Ensure 1-5
    if (roundedRating === 1) return 'rgb(246, 132, 45)';  // Purple
    if (roundedRating === 2) return 'rgb(229, 248, 30)';   // Softer Red
    if (roundedRating === 3) return 'rgb(144, 228, 65)';  // Orange
    if (roundedRating === 4) return 'rgb(7, 229, 44)';   // Bootstrap Primary Blue
    if (roundedRating === 5) return 'rgba(6, 196, 164, 0.88)';   // Jungle/Bootstrap Success Green
    return 'rgba(201, 203, 207, 0.7)'; // Default
};


// Specific colors for awareness levels (Used in Charts 1 & 2)
const awarenessLevelColors = {
    "N-1": 'rgba(255, 99, 132, 0.8)', // Red
    "N": 'rgba(255, 205, 86, 0.8)',   // Yellow
    "N+1": 'rgba(75, 192, 192, 0.8)', // Teal
    "N/A": 'rgba(150, 150, 150, 0.8)' // Grey for N/A or other
};
const awarenessLevelsOrdered = ["N-1", "N", "N+1", "N/A"];

function BreakAnalysisChart() {
    const [processedCycleLogs, setProcessedCycleLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAllData = async () => {
            setIsLoading(true);
            setError(null);
            const tempProcessedLogs = [];

            try {
                const logsRef = collection(db, "pomodoroCycleLogs");
                const qLogs = query(logsRef, orderBy("logSubmittedAt", "desc"), limit(300));
                const logsSnapshot = await getDocs(qLogs);

                logsSnapshot.forEach((docSnapshot) => {
                    const log = docSnapshot.data();
                    const logSubmittedAt = log.logSubmittedAt?.toDate();
                    const pomodoroTimerFinishedAt = log.pomodoroTimerFinishedAt?.toDate();
                    const workPeriodDurationMinutes = typeof log.workPeriodDurationMinutes === 'number' ? log.workPeriodDurationMinutes : 0;
                    const breakDurationMinutesData = typeof log.breakDurationMinutes === 'number' ? log.breakDurationMinutes : 0;
                    const breakEffectivenessRating = typeof log.breakEffectivenessRating === 'number' ? log.breakEffectivenessRating : 0;
                    const breakActivityText = typeof log.breakActivityText === 'string' && log.breakActivityText.trim() !== '' ? log.breakActivityText : "Unknown";
                    const postBreakEfficacy = typeof log.postBreakEfficacy === 'number' ? Math.max(1, Math.min(5, Math.round(log.postBreakEfficacy))) : 0;
                    const postBreakEnergy = typeof log.postBreakEnergy === 'number' ? Math.max(1, Math.min(5, Math.round(log.postBreakEnergy))) : 0;
                    const postBreakFrustration = typeof log.postBreakFrustration === 'number' ? log.postBreakFrustration : 0;
                    const breakActivityAwarenessLevel = log.breakActivityAwarenessLevel || "N/A";
                    const workPeriodTasksCompleted = typeof log.workPeriodTasksCompleted === 'number' ? log.workPeriodTasksCompleted : 0;

                    if (logSubmittedAt instanceof Date && pomodoroTimerFinishedAt instanceof Date &&
                        workPeriodDurationMinutes > 0 && workPeriodDurationMinutes < 240 &&
                        breakDurationMinutesData > 0 && breakDurationMinutesData < 180) {
                        tempProcessedLogs.push({
                            id: docSnapshot.id,
                            rating: breakEffectivenessRating,
                            pomodoroDurationMinutes: workPeriodDurationMinutes,
                            breakDurationMinutes: breakDurationMinutesData,
                            breakType: breakActivityText,
                            postBreakEfficacy,
                            postBreakEnergy,
                            postBreakFrustration,
                            breakActivityAwarenessLevel,
                            workPeriodTasksCompleted,
                        });
                    }
                });
                setProcessedCycleLogs(tempProcessedLogs);
            } catch (err) {
                console.error("BreakAnalysisChart: Error during data fetching:", err);
                setError("Failed to load analysis data. Please check console for details.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllData();
    }, []);

    // --- Chart 1: Productivity After Break vs. Break Duration (Bubble by Awareness during Break) ---
    const chart1Data = useMemo(() => {
        if (processedCycleLogs.length < 2) return { datasets: [] };
        const aggregatedDataByAwareness = {};
        for (let i = 0; i < processedCycleLogs.length - 1; i++) {
            const currentLog = processedCycleLogs[i];
            const previousLog = processedCycleLogs[i + 1];
            const awarenessLevel = previousLog.breakActivityAwarenessLevel || "N/A";
            const xValue = previousLog.breakDurationMinutes;
            const yValue = currentLog.workPeriodTasksCompleted;
            const key = `${xValue}-${yValue}-${awarenessLevel}`;
            if (!aggregatedDataByAwareness[awarenessLevel]) aggregatedDataByAwareness[awarenessLevel] = {};
            if (!aggregatedDataByAwareness[awarenessLevel][key]) {
                aggregatedDataByAwareness[awarenessLevel][key] = {
                    x: xValue, y: yValue, count: 0, sumBreakRating: 0, sumPostBreakEfficacyFromPrev: 0,
                    awareness: awarenessLevel,
                    prevWorkDuration: previousLog.pomodoroDurationMinutes,
                    prevBreakDuration: previousLog.breakDurationMinutes,
                    nextWorkDuration: currentLog.pomodoroDurationMinutes,
                };
            }
            aggregatedDataByAwareness[awarenessLevel][key].count++;
            aggregatedDataByAwareness[awarenessLevel][key].sumBreakRating += previousLog.rating;
            aggregatedDataByAwareness[awarenessLevel][key].sumPostBreakEfficacyFromPrev += previousLog.postBreakEfficacy;
        }
        const datasets = awarenessLevelsOrdered
            .filter(level => aggregatedDataByAwareness[level])
            .map(level => ({
                label: `Awareness: ${level}`,
                data: Object.values(aggregatedDataByAwareness[level]).map(item => ({
                    x: item.x, y: item.y,
                    r: Math.sqrt(item.count) * 3.5 + 4,
                    avgBreakRating: item.count > 0 ? item.sumBreakRating / item.count : 0,
                    avgPostBreakEfficacyFromPrev: item.count > 0 ? item.sumPostBreakEfficacyFromPrev / item.count : 0,
                    count: item.count, awareness: item.awareness,
                    prevWorkDuration: item.prevWorkDuration, prevBreakDuration: item.prevBreakDuration,
                    nextWorkDuration: item.nextWorkDuration,
                })),
                backgroundColor: awarenessLevelColors[level] || awarenessLevelColors["N/A"],
            }));
        return { datasets };
    }, [processedCycleLogs]);

    const chart1Options = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            title: { display: true, text: 'Productivity After Break vs. Break Duration (Bubble by Awareness during Break)', font: { size: 16 } },
            legend: { display: true, position: 'top' },
            tooltip: {
                callbacks: {
                    label: (c) => {
                        const raw = c.raw;
                        return [
                            `Awareness during Break: ${raw.awareness}`,
                            `Tasks Completed After Break: ${raw.y}`,
                            `Break Duration: ${raw.x}m (this break)`,
                            `Avg Rating of This Break: ${raw.avgBreakRating.toFixed(1)}★`,
                            `Avg Efficacy After This Break: ${raw.avgPostBreakEfficacyFromPrev.toFixed(1)}★`,
                            `Work Before Break: ${raw.prevWorkDuration}m`,
                            `Work After Break: ${raw.nextWorkDuration}m`,
                            `Cycles at this point: ${raw.count}`,
                        ];
                    }
                }
            },
            datalabels: { display: false }
        },
        scales: {
            y: { beginAtZero: true, title: { display: true, text: 'Tasks Completed (in Work Period After Break)' } },
            x: { beginAtZero: true, title: { display: true, text: 'Break Duration (Minutes)' } }
        }
    };

    // --- Chart 2: Total Tasks Completed by Post-Break Efficacy, Stacked by Awareness Level ---
    const chart2Data = useMemo(() => {
        if (!processedCycleLogs.length) return { datasets: [] };
        const efficacyLevels = [1, 2, 3, 4, 5];
        const tasksByEfficacyAndAwareness = {}; // Stores { "1-N": totalTasks, "1-N+1": totalTasks, ... }

        processedCycleLogs.forEach(log => {
            const efficacy = log.postBreakEfficacy;
            const awareness = log.breakActivityAwarenessLevel || "N/A";
            // We sum tasks completed in the work period *following* this break's efficacy.
            // This requires linking current log's tasks to previous log's (break) efficacy.
            // For simplicity here, if we assume tasks completed are from the *current* log's work period
            // (i.e., tasks in work period leading to the break whose efficacy is 'efficacy'),
            // then we can use log.workPeriodTasksCompleted directly.
            // Let's adjust to sum tasks completed in the work period *of the cycle being analyzed for efficacy*.
            
            // Find the log that represents the work period *after* a break with 'efficacy' and 'awareness'
            // This is tricky as `processedCycleLogs` is just one flat list.
            // A simpler interpretation: Sum tasks completed IN THE SAME CYCLE where postBreakEfficacy was rated.
            // This means `log.workPeriodTasksCompleted` refers to tasks completed *before* the break whose efficacy is `log.postBreakEfficacy`.
            const tasksCompletedInThisCycle = log.workPeriodTasksCompleted;

            const key = `${efficacy}-${awareness}`;
            tasksByEfficacyAndAwareness[key] = (tasksByEfficacyAndAwareness[key] || 0) + tasksCompletedInThisCycle;
        });

        const datasets = awarenessLevelsOrdered.map(awareness => ({
            label: `Awareness: ${awareness}`,
            data: efficacyLevels.map(efficacy => tasksByEfficacyAndAwareness[`${efficacy}-${awareness}`] || 0),
            backgroundColor: awarenessLevelColors[awareness] || awarenessLevelColors["N/A"],
        }));

        return {
            labels: efficacyLevels.map(e => `${e}★ Efficacy`),
            datasets
        };
    }, [processedCycleLogs]);

    const chart2Options = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            title: { display: true, text: 'Total Tasks Completed by Post-Break Efficacy (Stacked by Awareness during Break)', font: { size: 16 } },
            legend: { display: true, position: 'top' },
            tooltip: { 
                mode: 'index', 
                intersect: false,
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += `${context.parsed.y} tasks`;
                        }
                        return label;
                    }
                }
            },
            datalabels: { display: false }
        },
        scales: {
            y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Total Tasks Completed' } },
            x: { stacked: true, title: { display: true, text: 'Post-Break Efficacy Rating' } }
        }
    };

    // --- Chart 3: Average Post-Break Efficacy by Break Activity (Bar) ---
    const chart3Data = useMemo(() => {
        if (!processedCycleLogs.length) return { datasets: [] };
        const groupedByBreakType = processedCycleLogs.reduce((acc, log) => {
            const type = log.breakType;
            if (!acc[type]) acc[type] = { sumEfficacy: 0, count: 0, sumTasksBefore: 0 };
            acc[type].sumEfficacy += log.postBreakEfficacy;
            acc[type].sumTasksBefore += log.workPeriodTasksCompleted;
            acc[type].count++;
            return acc;
        }, {});
        const labels = Object.keys(groupedByBreakType)
            .filter(type => groupedByBreakType[type].count > 2)
            .sort((a, b) => (groupedByBreakType[b].sumEfficacy / groupedByBreakType[b].count) - (groupedByBreakType[a].sumEfficacy / groupedByBreakType[a].count));
        if (labels.length === 0) return { datasets: [] };
        return {
            labels,
            datasets: [{
                label: 'Average Post-Break Efficacy',
                data: labels.map(type => parseFloat((groupedByBreakType[type].sumEfficacy / groupedByBreakType[type].count).toFixed(1))),
                // REVERTED COLORING to original dynamic hue
                backgroundColor: labels.map((_, i) => `hsla(${(i * 360 / (labels.length || 1)) + 200}, 70%, 65%, 0.7)`),
                borderColor: labels.map((_, i) => `hsla(${(i * 360 / (labels.length || 1)) + 200}, 70%, 50%, 1)`),
                borderWidth: 1,
                avgTasksBefore: labels.map(type => parseFloat((groupedByBreakType[type].sumTasksBefore / groupedByBreakType[type].count).toFixed(1))),
                counts: labels.map(type => groupedByBreakType[type].count)
            }],
        };
    }, [processedCycleLogs]);

    const chart3Options = {
        responsive: true, maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
            title: { display: true, text: 'Average Post-Break Efficacy by Break Activity (Min. 3 Cycles)', font: { size: 16 } },
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const dataset = context.dataset;
                        const avgTasksBefore = dataset.avgTasksBefore[context.dataIndex];
                        const count = dataset.counts[context.dataIndex];
                        return `Avg Efficacy: ${context.raw.toFixed(1)}★ (from ${count} cycles, avg tasks before: ${avgTasksBefore})`;
                    }
                }
            },
            datalabels: {
                display: true, anchor: 'end', align: 'end', color: '#333',
                font: { weight: 'bold', size: 10 },
                formatter: (value, context) => value.toFixed(1) + '★\n(' + context.dataset.counts[context.dataIndex] + ')',
            }
        },
        scales: {
            x: { beginAtZero: true, min: 0, max: 5, title: { display: true, text: 'Average Post-Break Efficacy (1-5)' } },
            y: { title: { display: true, text: 'Break Activity' } }
        }
    };

    // --- Chart 4: Impact of Work & Break Duration on Post-Break State (Bubble Chart) ---
    const chart4Data = useMemo(() => {
        if (!processedCycleLogs.length) return { datasets: [] };
        const aggregatedData = {};
        processedCycleLogs.forEach(log => {
            const key = `${log.pomodoroDurationMinutes}-${log.breakDurationMinutes}`;
            if (!aggregatedData[key]) {
                aggregatedData[key] = {
                    x: log.pomodoroDurationMinutes, y: log.breakDurationMinutes,
                    sumEfficacy: 0, sumEnergy: 0, sumFrustration: 0, count: 0,
                };
            }
            aggregatedData[key].sumEfficacy += log.postBreakEfficacy;
            aggregatedData[key].sumEnergy += log.postBreakEnergy;
            aggregatedData[key].sumFrustration += log.postBreakFrustration;
            aggregatedData[key].count++;
        });
        return {
            datasets: [{
                label: 'Avg Post-Break Efficacy',
                data: Object.values(aggregatedData).map(item => ({
                    x: item.x, y: item.y,
                    r: Math.sqrt(item.count) * 3 + 3,
                    efficacy: item.count > 0 ? parseFloat((item.sumEfficacy / item.count).toFixed(1)) : 0,
                    energy: item.count > 0 ? parseFloat((item.sumEnergy / item.count).toFixed(1)) : 0,
                    frustration: item.count > 0 ? parseFloat((item.sumFrustration / item.count).toFixed(1)) : 0,
                    count: item.count
                })),
                // USING MODIFIED RATING COLORS
                backgroundColor: (context) => getModifiedRatingColor(context.raw.efficacy),
            }]
        };
    }, [processedCycleLogs]);

    const chart4Options = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            title: { display: true, text: 'Post-Break State by Work & Break Duration (Bubble)', font: { size: 16 } },
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (c) => {
                        const raw = c.raw;
                        return [
                            `Work: ${raw.x}m, Break: ${raw.y}m`,
                            `Avg Efficacy: ${raw.efficacy}★`,
                            `Avg Energy: ${raw.energy}★`,
                            `Avg Frustration: ${raw.frustration}`,
                            `Cycles at this point: ${raw.count}`,
                        ];
                    }
                }
            },
            datalabels: { display: false }
        },
        scales: {
            y: { beginAtZero: true, title: { display: true, text: 'Break Duration (Minutes)' } },
            x: { beginAtZero: true, title: { display: true, text: 'Work Duration (Minutes)' } }
        }
    };

    // --- Chart 5: Tasks Completed vs. Work-to-Break Ratio (Bubble Chart) ---
    const chart5Data = useMemo(() => {
        if (!processedCycleLogs.length) return { datasets: [] };
        const aggregatedRatioData = {};
        processedCycleLogs.forEach(log => {
            if (log.breakDurationMinutes <= 0 || log.pomodoroDurationMinutes <= 0) return;
            const ratio = parseFloat((log.pomodoroDurationMinutes / log.breakDurationMinutes).toFixed(2));
            const tasks = log.workPeriodTasksCompleted;
            if (ratio < 0.2 || ratio > 20) return;
            const key = `${ratio}-${tasks}`;
            if (!aggregatedRatioData[key]) {
                aggregatedRatioData[key] = {
                    x: ratio, y: tasks, count: 0, sumPostBreakEfficacy: 0,
                    pomodoroDurations: [], breakDurations: [], awarenessLevels: {}
                };
            }
            aggregatedRatioData[key].count++;
            aggregatedRatioData[key].sumPostBreakEfficacy += log.postBreakEfficacy;
            aggregatedRatioData[key].pomodoroDurations.push(log.pomodoroDurationMinutes);
            aggregatedRatioData[key].breakDurations.push(log.breakDurationMinutes);
            const awareness = log.breakActivityAwarenessLevel || "N/A";
            aggregatedRatioData[key].awarenessLevels[awareness] = (aggregatedRatioData[key].awarenessLevels[awareness] || 0) + 1;
        });
        const dataPoints = Object.values(aggregatedRatioData).map(item => {
            const avgWork = item.pomodoroDurations.reduce((a, b) => a + b, 0) / item.count;
            const avgBreak = item.breakDurations.reduce((a, b) => a + b, 0) / item.count;
            let dominantAwareness = "Mixed";
            if (Object.keys(item.awarenessLevels).length === 1) {
                dominantAwareness = Object.keys(item.awarenessLevels)[0];
            } else if (Object.keys(item.awarenessLevels).length > 1) {
                dominantAwareness = Object.entries(item.awarenessLevels).sort(([,a],[,b]) => b-a)[0][0];
            }

            return {
                x: item.x, y: item.y,
                r: Math.sqrt(item.count) * 3.5 + 4,
                avgPostBreakEfficacy: item.count > 0 ? parseFloat((item.sumPostBreakEfficacy / item.count).toFixed(1)) : 0,
                count: item.count,
                avgWorkDuration: avgWork.toFixed(0),
                avgBreakDuration: avgBreak.toFixed(0),
                dominantAwareness: dominantAwareness,
            };
        });
        if (dataPoints.length === 0) return { datasets: [] };
        return {
            datasets: [{
                label: 'Tasks Completed vs. Work/Break Ratio',
                data: dataPoints,
                // USING MODIFIED RATING COLORS
                backgroundColor: (context) => getModifiedRatingColor(context.raw.avgPostBreakEfficacy),
            }]
        };
    }, [processedCycleLogs]);

    const chart5Options = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            title: { display: true, text: 'Productivity by Work/Break Ratio (Colored by Post-Break Efficacy)', font: { size: 16 } },
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (c) => {
                        const raw = c.raw;
                        return [
                            `Work/Break Ratio: ${raw.x.toFixed(2)}`,
                            `Tasks Completed: ${raw.y}`,
                            `Avg Post-Break Efficacy: ${raw.avgPostBreakEfficacy.toFixed(1)}★`,
                            `Avg Work Duration: ${raw.avgWorkDuration}m`,
                            `Avg Break Duration: ${raw.avgBreakDuration}m`,
                            `Awareness (Dominant): ${raw.dominantAwareness}`,
                            `Cycles at this point: ${raw.count}`,
                        ];
                    }
                }
            },
            datalabels: { display: false }
        },
        scales: {
            y: { beginAtZero: true, title: { display: true, text: 'Tasks Completed in Work Period' } },
            x: {
                type: 'linear',
                beginAtZero: true,
                title: { display: true, text: 'Work Duration / Break Duration Ratio' }
            }
        }
    };

    // --- Render Logic ---
    if (isLoading) return <div style={{ padding: '20px', textAlign: 'center', fontSize: '1.2em' }}>Loading Break Analysis Charts from Pomodoro Cycles...</div>;
    if (error) return <div style={{ padding: '20px', color: 'red', textAlign: 'center', fontSize: '1.2em' }}>Error: {error}</div>;
    if (processedCycleLogs.length === 0 && !isLoading) return <div style={{ padding: '20px', textAlign: 'center', fontSize: '1.2em' }}>No valid pomodoro cycle data found to display charts. Please complete some work and break cycles.</div>;

    const chartPageStyle = { padding: '20px', fontFamily: 'Arial, sans-serif' };
    const mainTitleStyle = { textAlign: 'center', marginBottom: '40px', fontSize: '1.8em', color: '#333' };
    const chartWrapperStyle = { marginBottom: '60px', paddingBottom: '20px', borderBottom: '1px solid #eee' };
    const chartCanvasContainerStyle = { position: 'relative', height: '480px', width: '100%', marginBottom: '15px' };
    const captionStyle = { textAlign: 'center', fontSize: '0.95em', color: '#444', maxWidth: '900px', margin: '0 auto', lineHeight: '1.6', padding: '0 10px' };
    
    const colorKeyStyle = {
        marginTop: '10px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap', // Allow wrapping if many items
        gap: '15px', // Space between items
        fontSize: '0.9em'
    };
    const colorKeyItemStyle = (color) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '5px' // Space between color swatch and text
    });
    const colorSwatchStyle = (color) => ({
        width: '15px',
        height: '15px',
        backgroundColor: color,
        border: '1px solid #ccc',
        borderRadius: '3px'
    });

    const ModifiedRatingColorKey = () => (
        <div style={colorKeyStyle}>
            <div style={colorKeyItemStyle(getModifiedRatingColor(1))}><span style={colorSwatchStyle(getModifiedRatingColor(1))}></span> 1★ (Poor)</div>
            <div style={colorKeyItemStyle(getModifiedRatingColor(2))}><span style={colorSwatchStyle(getModifiedRatingColor(2))}></span> 2★ (Fair)</div>
            <div style={colorKeyItemStyle(getModifiedRatingColor(3))}><span style={colorSwatchStyle(getModifiedRatingColor(3))}></span> 3★ (Average)</div>
            <div style={colorKeyItemStyle(getModifiedRatingColor(4))}><span style={colorSwatchStyle(getModifiedRatingColor(4))}></span> 4★ (Good)</div>
            <div style={colorKeyItemStyle(getModifiedRatingColor(5))}><span style={colorSwatchStyle(getModifiedRatingColor(5))}></span> 5★ (Excellent)</div>
        </div>
    );


    return (
        <div style={chartPageStyle}>
            <h2 style={mainTitleStyle}>Pomodoro Cycle & Break Analysis</h2>

            {/* Chart 1 */}
            {chart1Data.datasets.length > 0 && chart1Data.datasets.some(ds => ds.data.length > 0) && (
                <div style={chartWrapperStyle}>
                    <div style={chartCanvasContainerStyle}>
                        <Bubble options={chart1Options} data={chart1Data} />
                    </div>
                    <p style={captionStyle}>
                        <strong>Chart 1: Productivity After Break vs. Break Duration (Bubble by Awareness during Break).</strong>
                        This bubble chart explores the relationship between the duration of a break and the number of tasks completed in the <em>subsequent</em> work period.
                        Bubbles are colored by the self-reported awareness level (N-1: Red, N: Yellow, N+1: Teal) <em>during</em> the break. The size of each bubble indicates how many pomodoro cycles fall into that specific combination of break duration and tasks completed.
                        This helps identify if certain break durations, under specific awareness conditions, tend to precede more productive work sessions.
                    </p>
                </div>
            )}

            {/* Chart 2 */}
            {chart2Data.datasets.length > 0 && chart2Data.datasets.some(ds => ds.data.some(val => val > 0)) && (
                <div style={chartWrapperStyle}>
                    <div style={chartCanvasContainerStyle}>
                        <Bar options={chart2Options} data={chart2Data} />
                    </div>
                    <p style={captionStyle}>
                        <strong>Chart 2: Total Tasks Completed by Post-Break Efficacy (Stacked by Awareness during Break).</strong>
                        This stacked bar chart shows the total number of tasks completed associated with different post-break efficacy ratings (1★ to 5★). Tasks are summed for work periods that led to a break with the given efficacy. Each bar represents an efficacy rating, and its segments show the total tasks completed, broken down by the awareness level reported <em>during</em> the break (N-1: Red, N: Yellow, N+1: Teal).
                        This helps visualize which awareness levels during breaks are associated with higher task completion when a certain level of post-break efficacy is achieved.
                    </p>
                </div>
            )}

            {/* Chart 3 */}
            {chart3Data.datasets.length > 0 && chart3Data.datasets[0].data.length > 0 && (
                <div style={chartWrapperStyle}>
                    <div style={chartCanvasContainerStyle}>
                        <Bar options={chart3Options} data={chart3Data} />
                    </div>
                    <p style={captionStyle}>
                        <strong>Chart 3: Average Post-Break Efficacy by Break Activity (Min. 3 Cycles).</strong>
                        This horizontal bar chart displays the average 'Post-Break Efficacy' for different types of break activities. Only activities with at least 3 recorded cycles are shown, sorted by average efficacy.
                        The color of the bar dynamically reflects the average efficacy value. This helps identify which break activities you generally find most effective for recovery.
                    </p>
                </div>
            )}

            {/* Chart 4 */}
            {chart4Data.datasets.length > 0 && chart4Data.datasets[0].data.length > 0 && (
                 <div style={chartWrapperStyle}>
                    <div style={chartCanvasContainerStyle}>
                        <Bubble options={chart4Options} data={chart4Data} />
                    </div>
                     <ModifiedRatingColorKey />
                    <p style={captionStyle}>
                        <strong>Chart 4: Post-Break State by Work & Break Duration (Bubble).</strong>
                        This bubble chart plots work duration (X-axis) against break duration (Y-axis). Each bubble represents a unique combination of work and break lengths.
                        The size of the bubble indicates the number of cycles with that specific duration pairing. The color of the bubble represents the average 'Post-Break Efficacy' (see key above) achieved after those breaks.
                        This helps identify potentially optimal work/break length pairings for maximizing efficacy.
                    </p>
                </div>
            )}

            {/* Chart 5 */}
            {chart5Data.datasets.length > 0 && chart5Data.datasets[0].data.length > 0 && (
                 <div style={{ ...chartWrapperStyle, borderBottom: 'none' }}>
                    <div style={chartCanvasContainerStyle}>
                        <Bubble options={chart5Options} data={chart5Data} />
                    </div>
                    <ModifiedRatingColorKey />
                    <p style={captionStyle}>
                        <strong>Chart 5: Productivity by Work/Break Ratio (Colored by Post-Break Efficacy).</strong>
                        This bubble chart investigates how the ratio of work duration to break duration impacts the number of tasks completed <em>within that same work period</em>.
                        The X-axis shows the Work/Break Ratio, and the Y-axis shows 'Tasks Completed'. Bubble size indicates the number of cycles at that specific ratio and task count.
                        The color of the bubble represents the average 'Post-Break Efficacy' (see key above) reported after the break component of that ratio. This helps explore if a certain balance between work and break time correlates with higher output.
                    </p>
                </div>
            )}
        </div>
    );
}

export default BreakAnalysisChart;