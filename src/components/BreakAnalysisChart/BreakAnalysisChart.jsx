// src/components/BreakAnalysisChart/BreakAnalysisChart.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Scatter, Bar, Bubble } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    BubbleController,
    Title,
    Tooltip,
    Legend,
    TimeScale,
} from 'chart.js';
// Make sure chartjs-plugin-datalabels is installed if you want to use it for Chart 2, 3
import ChartDataLabels from 'chartjs-plugin-datalabels'; 
import { db } from '../../firebaseConfig';
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore";

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    BubbleController,
    Title,
    Tooltip,
    Legend,
    TimeScale,
    ChartDataLabels // Register if using for any chart
);

// Helper to get color based on rating (e.g., breakEffectivenessRating or postBreakEfficacy)
const getRatingColor = (rating) => {
    const roundedRating = Math.round(rating);
    if (roundedRating <= 1) return 'rgba(255, 99, 132, 0.7)'; // Poor
    if (roundedRating === 2) return 'rgba(255, 159, 64, 0.7)'; // Fair
    if (roundedRating === 3) return 'rgba(255, 205, 86, 0.7)'; // Average
    if (roundedRating === 4) return 'rgba(75, 192, 192, 0.7)'; // Good
    if (roundedRating >= 5) return 'rgba(54, 162, 235, 0.7)'; // Excellent
    return 'rgba(201, 203, 207, 0.7)'; // Default/Unknown
};

// Specific colors for awareness levels
const awarenessLevelColors = {
    "N-1": 'rgba(255, 99, 132, 0.8)', // Red
    "N": 'rgba(255, 205, 86, 0.8)',   // Yellow
    "N+1": 'rgba(75, 192, 192, 0.8)', // Teal
    "N/A": 'rgba(150, 150, 150, 0.8)' // Grey for N/A or other
};


// Helper to format date as YYYY-MM-DD
const formatDate = (date) => {
    if (!(date instanceof Date) || isNaN(date)) return "Invalid Date";
    return date.toISOString().split('T')[0];
};

function BreakAnalysisChart() {
    const [processedCycleLogs, setProcessedCycleLogs] = useState([]);
    const [dailyMetricsScores, setDailyMetricsScores] = useState({}); 
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAllData = async () => {
            setIsLoading(true);
            setError(null);
            const tempProcessedLogs = [];
            const fetchedDailyMetrics = {};

            try {
                const logsRef = collection(db, "pomodoroCycleLogs"); 
                const qLogs = query(logsRef, orderBy("logSubmittedAt", "desc"), limit(200)); 
                const logsSnapshot = await getDocs(qLogs);

                const datesForMetrics = new Set();

                logsSnapshot.forEach((docSnapshot) => {
                    const log = docSnapshot.data();

                    const logSubmittedAt = log.logSubmittedAt?.toDate();
                    const pomodoroTimerFinishedAt = log.pomodoroTimerFinishedAt?.toDate();
                    const workPeriodDurationMinutes = typeof log.workPeriodDurationMinutes === 'number' ? log.workPeriodDurationMinutes : 0;
                    const breakDurationMinutesData = typeof log.breakDurationMinutes === 'number' ? log.breakDurationMinutes : 0;
                    const breakEffectivenessRating = typeof log.breakEffectivenessRating === 'number' ? log.breakEffectivenessRating : 0;
                    
                    const breakActivityText = typeof log.breakActivityText === 'string' && log.breakActivityText.trim() !== '' ? log.breakActivityText : "Unknown";
                    const postBreakEfficacy = typeof log.postBreakEfficacy === 'number' ? log.postBreakEfficacy : 0;
                    const postBreakEnergy = typeof log.postBreakEnergy === 'number' ? log.postBreakEnergy : 0;
                    const postBreakFrustration = typeof log.postBreakFrustration === 'number' ? log.postBreakFrustration : 0; 
                    const breakActivityAwarenessLevel = log.breakActivityAwarenessLevel || "N/A";
                    const plannedNextWorkNature = log.plannedNextWorkNature || "N/A";
                    const workPeriodTasksCompleted = typeof log.workPeriodTasksCompleted === 'number' ? log.workPeriodTasksCompleted : 0;


                    if (logSubmittedAt instanceof Date && pomodoroTimerFinishedAt instanceof Date && workPeriodDurationMinutes > 0 ) { 
                        if (breakDurationMinutesData <= 0 || breakDurationMinutesData > 180) return;

                        const workBreakRatio = breakDurationMinutesData / workPeriodDurationMinutes;

                        tempProcessedLogs.push({
                            id: docSnapshot.id,
                            workBreakRatio,
                            rating: breakEffectivenessRating, 
                            pomodoroDurationMinutes: workPeriodDurationMinutes,
                            breakDurationMinutes: breakDurationMinutesData,
                            breakType: breakActivityText, 
                            submittedAt: logSubmittedAt,
                            postBreakEfficacy,
                            postBreakEnergy,
                            postBreakFrustration,
                            breakActivityAwarenessLevel,
                            plannedNextWorkNature,
                            workPeriodTasksCompleted,
                        });
                        datesForMetrics.add(formatDate(logSubmittedAt));
                    }
                });
                setProcessedCycleLogs(tempProcessedLogs); 

                if (datesForMetrics.size > 0) {
                    for (const dateStr of datesForMetrics) {
                        if (dateStr === "Invalid Date") continue;
                        try {
                            const dailyMetricDocRef = doc(db, "dailyMetrics", dateStr);
                            const dailyMetricSnap = await getDoc(dailyMetricDocRef);
                            if (dailyMetricSnap.exists()) {
                                const data = dailyMetricSnap.data();
                                if (typeof data.productivityScore === 'number') {
                                    fetchedDailyMetrics[dateStr] = data.productivityScore;
                                }
                            }
                        } catch (dailyErr) {
                            console.error(`Error fetching dailyMetric for ${dateStr}:`, dailyErr);
                        }
                    }
                    setDailyMetricsScores(fetchedDailyMetrics);
                }

            } catch (err) {
                console.error("BreakAnalysisChart: Error during data fetching:", err);
                setError("Failed to load analysis data from pomodoroCycleLogs.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllData();
    }, []);

    // --- Chart 1: Tasks Completed vs. Break Duration by Awareness Level (Scatter) ---
    const chart1Data = useMemo(() => {
        if (processedCycleLogs.length < 2) return { datasets: [] };
        const dataByAwareness = {};

        for (let i = 0; i < processedCycleLogs.length - 1; i++) {
            const currentLog = processedCycleLogs[i]; 
            const previousLog = processedCycleLogs[i+1]; 

            const awarenessLevel = previousLog.breakActivityAwarenessLevel || "N/A";
            if (!dataByAwareness[awarenessLevel]) {
                dataByAwareness[awarenessLevel] = [];
            }

            dataByAwareness[awarenessLevel].push({
                x: previousLog.breakDurationMinutes, 
                y: currentLog.workPeriodTasksCompleted, 
                awareness: awarenessLevel,
                breakRating: previousLog.rating, 
                postBreakEfficacy: previousLog.postBreakEfficacy, 
                workDurationBeforeBreak: previousLog.pomodoroDurationMinutes,
                workDurationAfterBreak: currentLog.pomodoroDurationMinutes,
            });
        }
        
        const datasets = Object.keys(dataByAwareness).map(level => ({
            label: `Awareness: ${level}`,
            data: dataByAwareness[level],
            backgroundColor: awarenessLevelColors[level] || awarenessLevelColors["N/A"],
            pointRadius: 6,
        }));

        return { datasets };
    }, [processedCycleLogs]);

    const chart1Options = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            title: { display: true, text: 'Tasks Completed vs. Break Duration by Awareness Level', font: { size: 16 } },
            legend: { display: true, position: 'top' },
            tooltip: {
                callbacks: {
                    label: (c) => {
                        const raw = c.raw;
                        return [
                            `Awareness: ${raw.awareness}`,
                            `Tasks Completed: ${raw.y}`,
                            `Break Duration: ${raw.x}m`,
                            `Break Rating: ${raw.breakRating}★`,
                            `Post-Break Efficacy (of this break): ${raw.postBreakEfficacy}★`,
                            `Work Before Break: ${raw.workDurationBeforeBreak}m, Work After Break: ${raw.workDurationAfterBreak}m`,
                        ];
                    }
                }
            },
            datalabels: { display: false }
        },
        scales: {
            y: { 
                beginAtZero: true, 
                title: { display: true, text: 'Tasks Completed (in work period after break)' } 
            },
            x: { 
                beginAtZero: true, 
                title: { display: true, text: 'Break Duration (Minutes)' } 
            }
        }
    };

    // --- Chart 2: Post-Break Efficacy vs. Post-Break Energy (All Cycles by Awareness Level - Scatter Plot) ---
    const chart2Data = useMemo(() => {
        if (!processedCycleLogs.length) return { datasets: [] };
        
        // Group individual logs by awareness level for separate datasets
        const dataByAwareness = processedCycleLogs.reduce((acc, log) => {
            const level = log.breakActivityAwarenessLevel || "N/A";
            if (!acc[level]) {
                acc[level] = [];
            }
            acc[level].push({
                x: log.postBreakEnergy,       // Individual energy for this cycle
                y: log.postBreakEfficacy,     // Individual efficacy for this cycle
                awarenessLevel: level,
                tasksCompleted: log.workPeriodTasksCompleted,
                frustration: log.postBreakFrustration,
                breakRating: log.rating,
                breakDuration: log.breakDurationMinutes,
                workDuration: log.pomodoroDurationMinutes,
            });
            return acc;
        }, {});

        const datasets = Object.keys(dataByAwareness).map(level => ({
            label: `Awareness: ${level}`, // Used for legend
            data: dataByAwareness[level],
            backgroundColor: awarenessLevelColors[level] || awarenessLevelColors["N/A"],
            pointRadius: 5, // Fixed radius for individual points
        }));

        return { datasets };
    }, [processedCycleLogs]);

    const chart2Options = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            title: { display: true, text: 'Post-Break Efficacy vs. Energy (All Cycles by Awareness)', font: { size: 16 } },
            legend: { 
                display: true, 
                position: 'top',
            }, 
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const raw = context.raw;
                        return [
                            `Awareness: ${raw.awarenessLevel}`,
                            `Efficacy: ${raw.y}★`,
                            `Energy: ${raw.x}★`,
                            `Frustration: ${raw.frustration}`,
                            `Tasks Before Break: ${raw.tasksCompleted}`,
                            `Break: ${raw.breakDuration}m, Work: ${raw.workDuration}m`,
                            `Break Rating: ${raw.breakRating}★`
                        ];
                    }
                }
            },
            datalabels: { display: false } 
        },
        scales: {
            y: { 
                beginAtZero: true, 
                min:0, 
                max: 5, 
                title: { display: true, text: 'Post-Break Efficacy (1-5)' } 
            },
            x: { 
                beginAtZero: true,
                min: 0,
                max: 5,
                title: { display: true, text: 'Post-Break Energy (1-5)' } 
            }
        }
    };

    // --- Chart 3: Average Post-Break Efficacy by Break Activity (Bar) ---
    const chart3Data = useMemo(() => {
        if (!processedCycleLogs.length) return { datasets: [] };
        
        const groupedByBreakType = processedCycleLogs.reduce((acc, log) => {
            const type = log.breakType; 
            if (!acc[type]) acc[type] = { totalEfficacy: 0, count: 0, totalTasks: 0 };
            acc[type].totalEfficacy += log.postBreakEfficacy;
            acc[type].totalTasks += log.workPeriodTasksCompleted;
            acc[type].count++;
            return acc;
        }, {});

        const labels = Object.keys(groupedByBreakType).filter(type => groupedByBreakType[type].count > 0).sort();
        if (labels.length === 0) return { datasets: [] };

        return {
            labels,
            datasets: [{
                label: 'Average Post-Break Efficacy',
                data: labels.map(type => parseFloat((groupedByBreakType[type].totalEfficacy / groupedByBreakType[type].count).toFixed(1))),
                backgroundColor: labels.map((_, i) => `hsla(${(i * 360 / (labels.length || 1)) + 200}, 70%, 65%, 0.7)`),
                borderColor: labels.map((_, i) => `hsla(${(i * 360 / (labels.length || 1)) + 200}, 70%, 50%, 1)`),
                borderWidth: 1,
                avgTasks: labels.map(type => 
                    parseFloat((groupedByBreakType[type].totalTasks / groupedByBreakType[type].count).toFixed(1))
                ),
            }],
        };
    }, [processedCycleLogs]);

    const chart3Options = {
        responsive: true, maintainAspectRatio: false,
        indexAxis: 'y', 
        plugins: {
            title: { display: true, text: 'Average Post-Break Efficacy by Break Activity', font: { size: 16 } },
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const dataset = context.dataset;
                        const avgTasks = dataset.avgTasks[context.dataIndex];
                        return `Avg Efficacy: ${context.raw.toFixed(1)}★ (Avg Tasks Before: ${avgTasks})`;
                    }
                }
            },
            datalabels: {
                display: true, anchor: 'end', align: 'end', color: '#333',
                font: { weight: 'bold', size: 10 },
                formatter: (value) => value.toFixed(1) + '★',
            }
        },
        scales: {
            x: { beginAtZero: true, min:0, max: 5, title: { display: true, text: 'Average Post-Break Efficacy (1-5)' } },
            y: { title: { display: true, text: 'Break Activity' } }
        }
    };

    // --- Chart 4: Post-Break Metrics by Work & Break Duration (Grouped Bar) ---
    const chart4Data = useMemo(() => {
        if (!processedCycleLogs.length) return { datasets: [] };
        
        const aggregated = processedCycleLogs.reduce((acc, log) => {
            const workKey = log.pomodoroDurationMinutes;
            const breakKey = Math.max(5, Math.round(log.breakDurationMinutes / 5) * 5); 
            const key = `${workKey}m Work - ${breakKey}m Break`; 
            
            if (!acc[key]) {
                acc[key] = { 
                    totalEfficacy: 0, 
                    totalEnergy: 0, 
                    totalFrustration: 0, 
                    count: 0,
                    workDuration: workKey, 
                    breakDuration: breakKey 
                };
            }
            acc[key].totalEfficacy += log.postBreakEfficacy;
            acc[key].totalEnergy += log.postBreakEnergy;
            acc[key].totalFrustration += log.postBreakFrustration;
            acc[key].count++;
            return acc;
        }, {});

        const sortedKeys = Object.keys(aggregated).sort((a, b) => {
            const itemA = aggregated[a];
            const itemB = aggregated[b];
            if (itemA.workDuration !== itemB.workDuration) {
                return itemA.workDuration - itemB.workDuration;
            }
            return itemA.breakDuration - itemB.breakDuration;
        });
        
        if (sortedKeys.length === 0) return { datasets: [] };

        const labels = sortedKeys;
        const avgEfficacyData = [];
        const avgEnergyData = [];
        const avgFrustrationData = [];

        labels.forEach(key => {
            const item = aggregated[key];
            avgEfficacyData.push(parseFloat((item.totalEfficacy / item.count).toFixed(1)));
            avgEnergyData.push(parseFloat((item.totalEnergy / item.count).toFixed(1)));
            avgFrustrationData.push(parseFloat((item.totalFrustration / item.count).toFixed(1)));
        });

        return {
            labels,
            datasets: [
                {
                    label: 'Avg Post-Break Efficacy',
                    data: avgEfficacyData,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)', 
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                },
                {
                    label: 'Avg Post-Break Energy',
                    data: avgEnergyData,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)', 
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                },
                {
                    label: 'Avg Post-Break Frustration',
                    data: avgFrustrationData,
                    backgroundColor: 'rgba(255, 99, 132, 0.7)', 
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1,
                }
            ]
        };
    }, [processedCycleLogs]);
    
    const chart4Options = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            title: { display: true, text: 'Post-Break Metrics by Work & Break Duration', font: { size: 16 } },
            legend: { display: true, position: 'top' },
            tooltip: {
                mode: 'index', 
                intersect: false,
            },
            datalabels: { display: false } 
        },
        scales: {
            y: { 
                beginAtZero: true, 
                min: 0,
                max: 5, 
                title: { display: true, text: 'Average Rating (1-5)' } 
            },
            x: { 
                title: { display: true, text: 'Work Duration - Break Duration' },
                ticks: {
                    autoSkip: false, 
                    maxRotation: 70, 
                    minRotation: 45
                }
            }
        }
    };

    // --- Chart 5: Tasks Completed vs. Previous Break Metrics (Scatter) ---
    const linkedProductivityData = useMemo(() => {
        if (processedCycleLogs.length < 2) return { datasets: [] }; 

        const linkedData = [];
        for (let i = 0; i < processedCycleLogs.length - 1; i++) {
            const currentLog = processedCycleLogs[i]; 
            const previousLog = processedCycleLogs[i+1]; 

            linkedData.push({
                y: currentLog.workPeriodTasksCompleted, 
                
                x: previousLog.postBreakEfficacy, 
                
                previousBreakRating: previousLog.rating, 
                
                currentWorkDuration: currentLog.pomodoroDurationMinutes, 
                
                previousBreakDuration: previousLog.breakDurationMinutes,
                previousWorkDuration: previousLog.pomodoroDurationMinutes, 
                previousBreakType: previousLog.breakType,
                previousPostBreakEnergy: previousLog.postBreakEnergy,
                previousPostBreakFrustration: previousLog.postBreakFrustration,
                previousAwareness: previousLog.breakActivityAwarenessLevel,
            });
        }
        if(linkedData.length === 0) return {datasets: []};
        return {
            datasets: [{
                label: 'Tasks Completed vs. Previous Break\'s Efficacy', 
                data: linkedData,
                pointBackgroundColor: (context) => getRatingColor(context.raw.previousBreakRating),
                pointRadius: 7,
            }]
        };
    }, [processedCycleLogs]);

    const chart5Options = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            title: { display: true, text: 'Tasks Completed vs. Previous Break\'s Efficacy', font: { size: 16 } }, 
            legend: { display: true, labels: { boxWidth: 0 } }, 
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const raw = context.raw;
                        return [
                            `Tasks Completed (Y): ${raw.y} (after previous break)`, 
                            `Previous Break Efficacy (X): ${raw.x}★`,
                            `Previous Break Rating (Color): ${raw.previousBreakRating}★`,
                            `--- Work Period (Y-axis tasks) ---`,
                            ` Duration: ${raw.currentWorkDuration}m`,
                            `--- Previous Break (X-axis metrics) ---`,
                            ` Work Before: ${raw.previousWorkDuration}m, Break: ${raw.previousBreakDuration}m`,
                            ` Type: ${raw.previousBreakType}, Awareness: ${raw.previousAwareness}`,
                            ` Energy: ${raw.previousPostBreakEnergy}★, Frust: ${raw.previousPostBreakFrustration}`,
                        ];
                    }
                }
            },
            datalabels: { display: false } 
        },
        scales: {
            y: { 
                beginAtZero: true, 
                title: { display: true, text: 'Tasks Completed (in work period after previous break)' }  
            },
            x: { 
                beginAtZero: true, 
                min: 0, max: 5, 
                title: { display: true, text: 'Previous Break\'s Post-Break Efficacy' } 
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
    const chartCanvasContainerStyle = { position: 'relative', height: '450px', width: '100%', marginBottom: '15px' }; 
    const captionStyle = { textAlign: 'center', fontSize: '0.95em', color: '#444', maxWidth: '900px', margin: '0 auto', lineHeight: '1.6', padding: '0 10px' };

    return (
        <div style={chartPageStyle}>
            <h2 style={mainTitleStyle}>Pomodoro Cycle & Break Analysis</h2>
            {processedCycleLogs.length > 0 && (
                <>
                    {chart1Data.datasets.length > 0 && (
                        <div style={chartWrapperStyle}>
                            <div style={chartCanvasContainerStyle}>
                                <Scatter options={chart1Options} data={chart1Data} />
                            </div>
                            <p style={captionStyle}>
                                <strong>Chart 1: Tasks Completed vs. Break Duration by Awareness Level.</strong> This chart shows how many tasks were completed in the work period following a break, plotted against the duration of that break. Points are colored by the awareness level (N-1, N, N+1) during that preceding break. This helps identify if certain break durations, under specific awareness conditions, lead to higher task completion.
                            </p>
                        </div>
                    )}

                    {/* UPDATED CHART 2 RENDER */}
                    {chart2Data.datasets.length > 0 && chart2Data.datasets.some(ds => ds.data.length > 0) && (
                        <div style={chartWrapperStyle}>
                            <div style={chartCanvasContainerStyle}>
                                <Scatter options={chart2Options} data={chart2Data} /> 
                            </div>
                            <p style={captionStyle}>
                                <strong>Chart 2: Post-Break Efficacy vs. Energy (All Cycles by Awareness).</strong> Each point represents an individual pomodoro cycle. X-axis: Post-Break Energy. Y-axis: Post-Break Efficacy. Points are colored by the awareness level during the break. This helps visualize the direct relationship between energy and efficacy for each cycle, segmented by awareness.
                            </p>
                        </div>
                    )}

                    {chart3Data.datasets.length > 0 && chart3Data.datasets[0].data.length > 0 && (
                        <div style={chartWrapperStyle}>
                            <div style={chartCanvasContainerStyle}>
                                <Bar options={chart3Options} data={chart3Data} />
                            </div>
                            <p style={captionStyle}>
                                <strong>Chart 3: Average Post-Break Efficacy by Break Activity.</strong> Average 'Post-Break Efficacy' for different break activities. Helps identify which break types you find most effective.
                            </p>
                        </div>
                    )}

                    {chart4Data.labels && chart4Data.labels.length > 0 && (
                         <div style={chartWrapperStyle}>
                            <div style={chartCanvasContainerStyle}>
                                <Bar options={chart4Options} data={chart4Data} />
                            </div>
                            <p style={captionStyle}>
                                <strong>Chart 4: Post-Break Metrics by Work & Break Duration.</strong> This chart displays average Post-Break Efficacy (Teal), Energy (Blue), and Frustration (Red) for different combinations of Work Period and Break Durations. This helps identify optimal work/break length pairings for overall well-being and effectiveness.
                            </p>
                        </div>
                    )}

                    {linkedProductivityData.datasets.length > 0 && linkedProductivityData.datasets[0].data.length > 0 && (
                         <div style={{ ...chartWrapperStyle, borderBottom: 'none' }}>
                            <div style={chartCanvasContainerStyle}>
                                <Scatter options={chart5Options} data={linkedProductivityData} />
                            </div>
                            <p style={captionStyle}>
                                <strong>Chart 5: Tasks Completed vs. Previous Break's Efficacy.</strong> This chart explores if the quality of a previous break influences the tasks completed in the subsequent work period. Y-axis is 'Tasks Completed'. X-axis is the 'Post-Break Efficacy' of the break cycle that occurred immediately before that work period. Point color indicates the 'Break Effectiveness Rating' of that previous break.
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default BreakAnalysisChart;
