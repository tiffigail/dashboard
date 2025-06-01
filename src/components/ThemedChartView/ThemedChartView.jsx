// src/components/ThemedChartView/ThemedChartView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Bar, Line, Doughnut, Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { db } from '../../firebaseConfig';
import { collection, query, where, orderBy, getDocs, doc, getDoc, Timestamp, documentId } from 'firebase/firestore'; // Added documentId

import styles from './ThemedChartView.module.css';
import Modal from '../Modal/Modal';

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement,
    Title, Tooltip, Legend, ChartDataLabels, Filler
);

const getAxisThemeColor = (axisName, opacity = '0.7') => { /* ... same ... */
    if (typeof window === 'undefined' || typeof document === 'undefined') return `rgba(201, 203, 207, ${opacity})`;
    if (!axisName || typeof axisName !== 'string') { const defaultColorVar = getComputedStyle(document.documentElement).getPropertyValue('--axis-color-default-2')?.trim(); return defaultColorVar ? `rgba(${defaultColorVar}, ${opacity})` : `rgba(201, 203, 207, ${opacity})`; }
    const cssVarSuffix = axisName.trim().toLowerCase().replace(/\s+/g, '-').replace(/\+/g, '-plus-');
    const colorVar = getComputedStyle(document.documentElement).getPropertyValue(`--axis-color-${cssVarSuffix}-2`)?.trim();
    if (colorVar) return `rgba(${colorVar}, ${opacity})`;
    const fallbackColorVar = getComputedStyle(document.documentElement).getPropertyValue('--axis-color-default-2')?.trim();
    return fallbackColorVar ? `rgba(${fallbackColorVar}, ${opacity})` : `rgba(201, 203, 207, ${opacity})`;
};
const cleanerColors = { /* ... same ... */
    "Abi": "rgba(0, 123, 255, 0.9)", "Izi": "rgba(122, 77, 255, 0.9)",
    "Tiffany": "rgba(199, 21, 133, 0.9)", "Default": "rgba(108, 117, 125, 0.9)"
};
const parseWeightFromString = (checklistArray) => { /* ... same ... */
    if (!Array.isArray(checklistArray)) return null;
    const weightEntry = checklistArray.find(item => typeof item === 'string' && item.toLowerCase().startsWith("weight:"));
    if (weightEntry) { const weightVal = parseFloat(weightEntry.split(":")[1]); return isNaN(weightVal) ? null : weightVal; } return null;
};
const getSafeMax = (arrValues, defaultMax, paddingFactor = 0.1, minPad = 2) => { /* ... same ... */
    const validNumbers = arrValues.flat().filter(val => typeof val === 'number' && !isNaN(val));
    if (validNumbers.length === 0) return defaultMax;
    const maxVal = Math.max(0, ...validNumbers);
    return Math.max(defaultMax, maxVal + Math.max(Math.ceil(maxVal * paddingFactor), minPad));
};
const getSafeMinMax = (arrValues, defaultMin, defaultMax, paddingFactor = 0.1, minPad = 2) => { /* ... same ... */
    const validNumbers = arrValues.flat().filter(val => typeof val === 'number' && !isNaN(val));
    if (validNumbers.length === 0) return {min: defaultMin, max: defaultMax};
    const maxVal = Math.max(...validNumbers); const minVal = Math.min(...validNumbers);
    return { min: Math.min(defaultMin, minVal - Math.max(Math.ceil(Math.abs(minVal) * paddingFactor), minPad)), max: Math.max(defaultMax, maxVal + Math.max(Math.ceil(Math.abs(maxVal) * paddingFactor), minPad)) };
};

const ThemedChartView = ({ theme, dateRange: dateRangeProp, containerSize = 'medium' }) => {
    const [chartData, setChartData] = useState(null);
    const [chartOptions, setChartOptions] = useState({});
    const [chartType, setChartType] = useState('line');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalChartData, setModalChartData] = useState(null);
    const [modalChartOptions, setModalChartOptions] = useState({});
    const [modalChartType, setModalChartType] = useState('line');

    const internalDateRange = useMemo(() => {
        if (dateRangeProp) return dateRangeProp;
        const endDate = new Date();
        const startDate = new Date();
        // --- MODIFIED: Default to 1 month back ---
        startDate.setMonth(startDate.getMonth() - 1); 
        startDate.setDate(1); // Start from the 1st day of that month
        startDate.setHours(0,0,0,0);
        endDate.setHours(23,59,59,999);
        return { startDate, endDate };
    }, [dateRangeProp]);

    const chartConfigs = useMemo(() => ({
        "Default": {
            fetchData: async (range, currentThemeForData = "Default") => {
                try { // Add try...catch within fetchData
                    const endDate = range?.endDate || new Date();
                    const startDate = range?.startDate || new Date(new Date().setMonth(endDate.getMonth() - 1)); // 1 month
                    startDate.setHours(0,0,0,0); endDate.setHours(23,59,59,999);
                    
                    const dateLabels = []; const productivityScoresData = [];
                    const epiphanyCountsData = []; const despairCountsData = [];
                    const themeSpecificTaskCountsData = [];
                    const weeklyStepsRef = collection(db, "weeklySteps");
                    const dailyMetricsRef = collection(db, "dailyMetrics"); // For batching reads

                    const dateStringsToFetch = [];
                    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        dateLabels.push(new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
                        dateStringsToFetch.push(dateStr);
                    }

                    // Batch read dailyMetrics if possible (Firestore 'in' query limit is 10-30 depending on SDK version)
                    const dailyMetricsMap = new Map();
                    if (dateStringsToFetch.length > 0) {
                        // Chunk dateStringsToFetch if it's too large for 'in' query
                        const chunkSize = 10; 
                        for (let i = 0; i < dateStringsToFetch.length; i += chunkSize) {
                            const chunk = dateStringsToFetch.slice(i, i + chunkSize);
                            if (chunk.length > 0) {
                                const metricsQuery = query(dailyMetricsRef, where(documentId(), 'in', chunk));
                                const metricsSnapshot = await getDocs(metricsQuery);
                                metricsSnapshot.forEach(snap => dailyMetricsMap.set(snap.id, snap.data()));
                            }
                        }
                    }
                    
                    for (const dateStr of dateStringsToFetch) {
                        const metricData = dailyMetricsMap.get(dateStr);
                        productivityScoresData.push(metricData?.productivityScore || 0);
                        epiphanyCountsData.push(metricData?.epiphanyCount || 0);
                        despairCountsData.push(metricData?.despairCount || 0);

                        if (currentThemeForData !== "Default") {
                            let themeTasksDone = 0;
                            try {
                                const themeTasksQ = query(weeklyStepsRef, where("axisTheme", "==", currentThemeForData), where("currentAssignedDate", "==", dateStr), where("status", "==", "completed"));
                                themeTasksDone = (await getDocs(themeTasksQ)).size;
                            } catch(e) { console.warn(`Error fetching '${currentThemeForData}' tasks for ${dateStr}:`, e); }
                            themeSpecificTaskCountsData.push(themeTasksDone);
                        }
                    }
                    
                    const datasets = [ /* ... same dataset definitions as before, all using yAxisID: 'y' ... */
                        { label: 'Productivity Score', data: productivityScoresData, type: 'line', borderColor: 'rgba(54, 162, 235, 0.9)', backgroundColor: 'rgba(54, 162, 235, 0.2)', tension: 0.1, fill: true, yAxisID: 'y', order: 0 },
                        { label: 'Epiphanies (E)', data: epiphanyCountsData, type: 'line', borderColor: 'rgba(255, 205, 86, 0.9)', backgroundColor: 'rgba(255, 205, 86, 0.2)', tension: 0.3, yAxisID: 'y', borderDash: [5, 5], order: 1, spanGaps: true, fill: false },
                        { label: 'Despairs (D)', data: despairCountsData, type: 'line', borderColor: 'rgba(104, 67, 188, 0.9)', backgroundColor: 'rgba(104, 67, 188, 0.2)', tension: 0.3, yAxisID: 'y', borderDash: [5, 5], order: 2, spanGaps: true, fill: false }
                    ];
                    if (currentThemeForData !== "Default") { // No need for && themeSpecificTaskCountsData.length > 0 here
                        datasets.push({ label: `${currentThemeForData} Tasks`, data: themeSpecificTaskCountsData, type: 'bar', backgroundColor: getAxisThemeColor(currentThemeForData, '0.6'), borderColor: getAxisThemeColor(currentThemeForData, '1'), yAxisID: 'y', order: 3, borderWidth: 1 });
                    }
                    return { labels: dateLabels, datasets, productivityScoresData, epiphanyCountsData, despairCountsData, themeSpecificTaskCountsData };
                } catch (error) {
                    console.error(`fetchData for ${currentThemeForData} failed:`, error);
                    return { labels: [], datasets: [], productivityScoresData: [], epiphanyCountsData: [], despairCountsData: [], themeSpecificTaskCountsData: [] }; // Ensure valid structure on error
                }
            },
            options: (titleSuffix = '', currentThemeForOptions = "Default", fetchedRawData = {}) => ({
                plugins: { 
                    title: { display: true, text: `${currentThemeForOptions === "Default" ? "Overall" : currentThemeForOptions} Performance ${titleSuffix}` },
                    legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false, callbacks: { label: function(context) { let label = context.dataset.label || ''; if (label) { label += ': '; } if (context.parsed.y !== null) { label += context.parsed.y; } return label; } } }
                },
                scales: { 
                    y: { type: 'linear', display: true, position: 'left', beginAtZero: true, title: { display: true, text: 'Value / Count' }, },
                    x: { title: {display: true, text: 'Date'} }
                }
            }),
            type: 'line',
        },
        "Financial": {
            fetchData: async (range) => {
                try {
                    const baseData = await chartConfigs.Default.fetchData(range, "Financial");
                    if (!baseData || !baseData.labels) return { labels: [], datasets: [] }; // Guard against undefined baseData

                    const endDate = range?.endDate || new Date();
                    const startDate = range?.startDate || new Date(new Date().setMonth(endDate.getMonth() - 1)); // 1 month
                    const netWorthData = []; const totalDebtData = []; const bettermentBalanceData = [];
                    
                    const budgetLogsByDate = new Map();
                    if (baseData.labels.length > 0) {
                        const budgetLogsRef = collection(db, "budgetLogs");
                        const budgetQ = query(budgetLogsRef, where("completedAt", ">=", Timestamp.fromDate(startDate)), where("completedAt", "<=", Timestamp.fromDate(endDate)), orderBy("completedAt", "asc"));
                        const budgetSnapshot = await getDocs(budgetQ);
                        budgetSnapshot.forEach(docSnap => {
                            const log = docSnap.data();
                            if (log.completedAt?.toDate) budgetLogsByDate.set(log.completedAt.toDate().toISOString().split('T')[0], log);
                        });
                    }

                    for (let i = 0; i < baseData.labels.length; i++) {
                        const currentDate = new Date(startDate); currentDate.setDate(startDate.getDate() + i);
                        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
                        const budgetLog = budgetLogsByDate.get(dateStr);
                        netWorthData.push(budgetLog?.netWorth || null); totalDebtData.push(budgetLog?.totalDebt || null); bettermentBalanceData.push(budgetLog?.bettermentBalance || null);
                    }

                    baseData.datasets.unshift(
                        { label: 'Net Worth', data: netWorthData, type: 'line', tension: 0.1, borderColor: 'rgba(40, 167, 69, 0.9)', backgroundColor: 'rgba(40, 167, 69, 0.2)', yAxisID: 'y', spanGaps: true, order: -3 },
                        { label: 'Betterment Balance', data: bettermentBalanceData, type: 'line', tension: 0.1, borderColor: 'rgba(0, 123, 255, 0.6)', backgroundColor: 'rgba(0, 123, 255, 0.1)', yAxisID: 'y', spanGaps: true, order: -2, borderDash: [3,3] },
                        { label: 'Total Debt', data: totalDebtData, type: 'line', tension: 0.1, borderColor: 'rgba(255, 77, 77, 0.9)', backgroundColor: 'rgba(255, 77, 77, 0.2)', yAxisID: 'y', spanGaps: true, order: -1 }
                    );
                    baseData.netWorthData = netWorthData; baseData.totalDebtData = totalDebtData; baseData.bettermentBalanceData = bettermentBalanceData; // For suggestedMax
                    return baseData;
                } catch (error) { console.error("fetchData for Financial failed:", error); return { labels: [], datasets: [] }; }
            },
            options: (titleSuffix, _, fetchedRawData) => chartConfigs.Default.options(titleSuffix, "Financial", fetchedRawData),
            type: 'line',
        },
        "Physical": {
             fetchData: async (range) => {
                try {
                    const baseData = await chartConfigs.Default.fetchData(range, "Physical");
                    if (!baseData || !baseData.labels) return { labels: [], datasets: [] };
                    const endDate = range?.endDate || new Date();
                    const startDate = range?.startDate || new Date(new Date().setMonth(endDate.getMonth() - 1)); // 1 month
                    const weightData = []; const bodyfatData = [];
                    
                    // More efficient fetching for readyForWorkLogs (assuming date string IDs)
                    const dateStringsToFetchRFW = [];
                    for (let i = 0; i < baseData.labels.length; i++) {
                        const currentDate = new Date(startDate); currentDate.setDate(startDate.getDate() + i);
                        dateStringsToFetchRFW.push(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`);
                    }
                    const rfwLogsMap = new Map();
                    if (dateStringsToFetchRFW.length > 0) {
                        const chunkSize = 10;
                        for (let i = 0; i < dateStringsToFetchRFW.length; i += chunkSize) {
                            const chunk = dateStringsToFetchRFW.slice(i, i + chunkSize);
                            if(chunk.length > 0) {
                                const rfwQuery = query(collection(db, "readyForWorkLogs"), where(documentId(), 'in', chunk));
                                const rfwSnapshot = await getDocs(rfwQuery);
                                rfwSnapshot.forEach(snap => rfwLogsMap.set(snap.id, snap.data()));
                            }
                        }
                    }
                    dateStringsToFetchRFW.forEach(dateStr => {
                        const rfwData = rfwLogsMap.get(dateStr);
                        bodyfatData.push(rfwData?.bodyfatPercentage || null);
                        weightData.push(rfwData ? parseWeightFromString(rfwData.checklistCompleted) : null);
                    });

                    baseData.datasets.push(
                        { label: 'Weight', data: weightData, type: 'line', tension: 0.1, borderColor: getAxisThemeColor("Physical", '0.8'), backgroundColor: getAxisThemeColor("Physical", '0.1'), yAxisID: 'y', spanGaps: true, order: 4 },
                        { label: 'Body Fat %', data: bodyfatData, type: 'line', tension: 0.1, borderColor: 'rgba(255, 159, 64, 0.7)', backgroundColor: 'rgba(255, 159, 64, 0.1)', yAxisID: 'y', spanGaps: true, order: 5, borderDash: [2,2] }
                    );
                    baseData.weightData = weightData; baseData.bodyfatData = bodyfatData;
                    return baseData;
                } catch (error) { console.error("fetchData for Physical failed:", error); return { labels: [], datasets: [] }; }
            },
            options: (titleSuffix, _, fetchedRawData) => chartConfigs.Default.options(titleSuffix, "Physical", fetchedRawData),
            type: 'line',
        },
        "Gear": { fetchData: (range) => chartConfigs.Default.fetchData(range, "Gear"), options: (titleSuffix, _, fetchedRawData) => chartConfigs.Default.options(titleSuffix, "Gear", fetchedRawData), type: 'line', },
        "Environment": { /* ... Distinct Environment logic ... */
            fetchData: async (range) => {
                try {
                    const endDate = range?.endDate || new Date(); const startDate = range?.startDate || new Date(new Date().setMonth(endDate.getMonth() - 1)); // 1 month
                    startDate.setHours(0, 0, 0, 0); endDate.setHours(23, 59, 59, 999);
                    const logsRef = collection(db, "familyCleanLogs");
                    const q = query(logsRef, where("completedAt", ">=", Timestamp.fromDate(startDate)), where("completedAt", "<=", Timestamp.fromDate(endDate)), orderBy("completedAt", "asc"));
                    const querySnapshot = await getDocs(q); const logs = []; querySnapshot.forEach(docSnap => logs.push({ id: docSnap.id, ...docSnap.data() }));
                    if (logs.length === 0) return { labels: [], datasets: [], avgPostRatings:[], cleanerImprovementData:{} };
                    const logsByDate = {}; logs.forEach(log => { if (log.completedAt?.toDate) { const dateStr = log.completedAt.toDate().toISOString().split('T')[0]; if (!logsByDate[dateStr]) logsByDate[dateStr] = []; logsByDate[dateStr].push(log); }});
                    const dateLabels = Object.keys(logsByDate).sort();
                    const avgPostRatings = dateLabels.map(dateStr => { const dayLogs = logsByDate[dateStr]; const sum = dayLogs.reduce((acc, curr) => acc + (curr.postCleaningRating || 0), 0); return dayLogs.length > 0 ? parseFloat((sum / dayLogs.length).toFixed(1)) : 0; });
                    const cleanerNames = ["Abi", "Izi", "Tiffany"]; const cleanerImprovementData = {};
                    cleanerNames.forEach(name => { cleanerImprovementData[name] = dateLabels.map(dateStr => { const dayLogsForCleaner = logsByDate[dateStr].filter(log => log.cleanerName === name); return dayLogsForCleaner.reduce((acc, curr) => acc + ((curr.postCleaningRating || 0) - (curr.preCleaningRating || 0)), 0); }); });
                    const datasets = [ { label: 'Avg. Room Rating', data: avgPostRatings, borderColor: 'rgba(0,0,0,0.9)', backgroundColor: 'rgba(0,0,0,0.1)', type: 'line', tension: 0.1, yAxisID: 'y', order: 0 }];
                    cleanerNames.forEach(name => { datasets.push({ label: `${name}'s Improvement`, data: cleanerImprovementData[name], borderColor: cleanerColors[name] || cleanerColors["Default"], backgroundColor: (cleanerColors[name] || cleanerColors["Default"]).replace('0.9', '0.2'), type: 'line', tension: 0.3, borderDash: [5, 5], yAxisID: 'y', order: cleanerNames.indexOf(name) + 1 }); });
                    return { labels: dateLabels.map(d => new Date(d + 'T00:00:00Z').toLocaleDateString(undefined, {month:'short', day:'numeric'})), datasets, avgPostRatings, cleanerImprovementData };
                } catch (error) { console.error("fetchData for Environment failed:", error); return { labels: [], datasets: [] }; }
            },
            options: (titleSuffix = '', _, fetchedRawData) => ({
                plugins: { title: { display: true, text: `Room Cleanliness & Cleaner Impact ${titleSuffix}` }, legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false }, },
                scales: { y: { type: 'linear', display: true, position: 'left', beginAtZero: true, title: {display:true, text:'Rating / Improvement Score'}, suggestedMax: getSafeMax([fetchedRawData?.avgPostRatings || [], ...Object.values(fetchedRawData?.cleanerImprovementData || {})], 10)}, x:{title:{display:true, text:'Date'}}}
            }), type: 'line',
        },
        "ON TRACK N+1": { fetchData: (range) => chartConfigs.Default.fetchData(range, "ON TRACK N+1"), options: (titleSuffix, _, fetchedRawData) => chartConfigs.Default.options(titleSuffix, "ON TRACK N+1", fetchedRawData), type: 'line',},
        "Misdirect": { // Added Misdirect
            fetchData: (range) => chartConfigs.Default.fetchData(range, "Misdirect"),
            options: (titleSuffix, _, fetchedRawData) => chartConfigs.Default.options(titleSuffix, "Misdirect", fetchedRawData),
            type: 'line',
        },
        "Rest and preparation": { fetchData: (range) => chartConfigs.Default.fetchData(range, "Rest and preparation"), options: (titleSuffix, _, fetchedRawData) => chartConfigs.Default.options(titleSuffix, "Rest and preparation", fetchedRawData), type: 'line',}
    }), [theme]); // Only theme is a direct dependency for the definition block

    useEffect(() => {
        const loadChart = async () => {
            setIsLoading(true); setError(null);
            const config = chartConfigs[theme] || chartConfigs["Default"];
            if (!config || !config.fetchData) { setError(`No chart configuration for theme: ${theme}`); setIsLoading(false); return; }
            try {
                const fetchedData = await config.fetchData(internalDateRange, theme);
                
                // Check if fetchedData or fetchedData.datasets is undefined before proceeding
                if (!fetchedData || !fetchedData.datasets) {
                    console.error(`fetchData for theme ${theme} returned undefined or no datasets object.`);
                    setError(`Data structure error for ${theme} chart.`);
                    setChartData({ labels: [], datasets: [] }); // Set to empty valid structure
                    setIsLoading(false);
                    return;
                }

                const baseOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: (fetchedData.datasets?.length || 0) > 1, position: 'top' }, datalabels: { display: false } } };
                let specificOptions = config.options ? config.options('', theme, fetchedData) : {}; // Pass fetchedData
                
                if (specificOptions.scales?.y && fetchedData.datasets) {
                    const allYDataForMainAxis = fetchedData.datasets.reduce((acc, ds) => {
                        if (ds.yAxisID === 'y' || !ds.yAxisID) {
                           return acc.concat(ds.data.filter(v => typeof v === 'number' && !isNaN(v)))
                        }
                        return acc;
                    }, []);

                    if (allYDataForMainAxis.length > 0) {
                       specificOptions.scales.y.suggestedMax = getSafeMax(allYDataForMainAxis, 10);
                       const minVal = Math.min(...allYDataForMainAxis);
                       if (minVal < 0) { // Only set suggestedMin if there are negative values
                           specificOptions.scales.y.suggestedMin = getSafeMinMax(allYDataForMainAxis, -10, 0).min;
                           specificOptions.scales.y.beginAtZero = false; 
                       } else {
                           specificOptions.scales.y.beginAtZero = true;
                       }
                    } else {
                        specificOptions.scales.y.suggestedMax = 10;
                        specificOptions.scales.y.beginAtZero = true;
                    }
                }

                setChartData(fetchedData);
                setChartOptions({ ...baseOptions, ...specificOptions, plugins: {...baseOptions.plugins, ...specificOptions.plugins}});
                setChartType(config.type || 'line');
            } catch (e) { console.error(`Error in loadChart for theme ${theme}:`, e); setError(`Failed to load data for ${theme} chart (exception).`); }
            finally { setIsLoading(false); }
        };
        if (theme) loadChart();
    }, [theme, internalDateRange, chartConfigs]);

    const handleChartClick = () => { /* ... same ... */
        if (!chartData) return;
        const config = chartConfigs[theme] || chartConfigs["Default"];
        const modalSpecificOptions = config.options ? config.options('(Expanded View)', theme, chartData) : {};
        setModalChartData(chartData);
        setModalChartOptions({ ...chartOptions, ...modalSpecificOptions, plugins: { ...chartOptions.plugins, ...modalSpecificOptions.plugins, datalabels: { display: true, anchor: 'end', align: 'end', color: '#333' } }, });
        setModalChartType(chartType);
        setIsModalOpen(true);
    };

    const renderChart = (data, options, type) => { /* ... same ... */
        if (!data || !data.datasets || data.datasets.length === 0 || data.datasets.every(ds => !ds.data || ds.data.length === 0 || ds.data.every(pt => pt === null))) {
            return <p className={styles.noDataMessage}>No data available for this {theme} chart for the selected period.</p>;
        }
        const ChartComponent = { bar: Bar, line: Line, doughnut: Doughnut, pie: Pie }[type] || Bar;
        return <ChartComponent options={options} data={data} />;
    };
    
    const containerClass = `${styles.chartContainer} ${styles[containerSize]}`;
    if (isLoading) return <div className={containerClass}><p>Loading {theme} chart...</p></div>;
    if (error) return <div className={containerClass}><p style={{color: 'red'}}>{error}</p></div>;

    return (
        <>
            <div className={containerClass} onClick={handleChartClick} title={`Click to expand ${theme} chart`}>
                {chartData && renderChart(chartData, chartOptions, chartType)}
            </div>
            {isModalOpen && modalChartData && (
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${theme.replace(/([A-Z0-9+]+)/g, ' $1').trim()} Chart - Expanded View`}>
                    <div className={styles.modalChartContainer}>
                        {renderChart(modalChartData, modalChartOptions, modalChartType)}
                    </div>
                </Modal>
            )}
        </>
    );
};

ThemedChartView.propTypes = {
    theme: PropTypes.string.isRequired,
    dateRange: PropTypes.shape({ startDate: PropTypes.instanceOf(Date), endDate: PropTypes.instanceOf(Date) }),
    containerSize: PropTypes.oneOf(['small', 'medium', 'large']),
};

export default ThemedChartView;