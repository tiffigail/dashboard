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
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';

import styles from './ThemedChartView.module.css';
import Modal from '../Modal/Modal';

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement,
    Title, Tooltip, Legend, ChartDataLabels, Filler
);

// --- Helper Functions ---
const getAxisThemeColor = (axisName, opacity = '0.7') => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return `rgba(201, 203, 207, ${opacity})`;
    }
    if (!axisName || typeof axisName !== 'string') {
        const defaultColorVar = getComputedStyle(document.documentElement).getPropertyValue('--axis-color-default-2')?.trim();
        return defaultColorVar ? `rgba(${defaultColorVar}, ${opacity})` : `rgba(201, 203, 207, ${opacity})`;
    }
    const cssVarSuffix = axisName.trim().toLowerCase().replace(/\s+/g, '-').replace(/\+/g, '-plus-');
    const colorVar = getComputedStyle(document.documentElement).getPropertyValue(`--axis-color-${cssVarSuffix}-2`)?.trim();
    if (colorVar) {
        return `rgba(${colorVar}, ${opacity})`;
    }
    const fallbackColorVar = getComputedStyle(document.documentElement).getPropertyValue('--axis-color-default-2')?.trim();
    return fallbackColorVar ? `rgba(${fallbackColorVar}, ${opacity})` : `rgba(201, 203, 207, ${opacity})`;
};

const cleanerColors = {
    "Abi": "rgba(0, 123, 255, 0.9)", 
    "Izi": "rgba(122, 77, 255, 0.9)",
    "Tiffany": "rgba(199, 21, 133, 0.9)", 
    "Default": "rgba(108, 117, 125, 0.9)"
};

const getSafeMax = (arrValues, defaultMax, paddingFactor = 0.1, minPad = 5) => {
    const validNumbers = arrValues.flat().filter(val => typeof val === 'number' && !isNaN(val));
    if (validNumbers.length === 0) return defaultMax;
    const maxVal = Math.max(0, ...validNumbers);
    return Math.max(defaultMax, maxVal + Math.max(Math.ceil(maxVal * paddingFactor), minPad));
};

const linearRegression = (data) => {
    const n = data.length;
    if (n < 2) return { slope: 0, intercept: data[0]?.[1] || 0 };
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    data.forEach(([x, y]) => {
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
    });
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
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
    const [cachedData, setCachedData] = useState({});

    const internalDateRange = useMemo(() => {
        console.log("LOG 1: Is a dateRangeProp being passed?", dateRangeProp);
        if (dateRangeProp) return dateRangeProp;
        
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        
        console.log("LOG 2: Calculated default startDate:", startDate.toString());

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        return { startDate, endDate };
    }, [dateRangeProp]);

    const chartConfigs = useMemo(() => ({
        "Financial": {
            fetchData: async (range) => {
                const { startDate, endDate } = range;
                const budgetLogsRef = collection(db, "budgetLogs");
                const q = query(budgetLogsRef, where("completedAt", ">=", Timestamp.fromDate(startDate)), where("completedAt", "<=", Timestamp.fromDate(endDate)), orderBy("completedAt", "asc"));
                const querySnapshot = await getDocs(q);
                const logs = querySnapshot.docs.map(doc => doc.data());
                
                const labels = [];
                const bettermentData = [];
                let currentDate = new Date(startDate);

                logs.forEach(log => {
                    const logDate = log.completedAt.toDate();
                    while (currentDate < logDate) {
                        labels.push(currentDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
                        bettermentData.push(null);
                        currentDate.setDate(currentDate.getDate() + 1);
                    }
                    labels.push(logDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
                    bettermentData.push(log.bettermentBalance || null);
                    currentDate.setDate(currentDate.getDate() + 1);
                });

                while (currentDate <= endDate) {
                    labels.push(currentDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
                    bettermentData.push(null);
                    currentDate.setDate(currentDate.getDate() + 1);
                }

                const monthlyContribution = 1000;
                const dailyContribution = monthlyContribution / 30.44;
                const projectionData = new Array(labels.length).fill(null);
                const lastDataIndex = bettermentData.findLastIndex(d => d !== null);

                if (lastDataIndex !== -1) {
                    projectionData[lastDataIndex] = bettermentData[lastDataIndex];
                    for (let i = lastDataIndex + 1; i < labels.length; i++) {
                        projectionData[i] = projectionData[i - 1] + dailyContribution;
                    }
                }

                const datasets = [
                    { label: 'Betterment Balance', data: bettermentData, type: 'line', tension: 0.1, borderColor: 'rgba(0, 123, 255, 0.9)', backgroundColor: 'rgba(0, 123, 255, 0.2)', yAxisID: 'y', spanGaps: true, fill: true },
                    { label: 'Projected Balance', data: projectionData, type: 'line', tension: 0.1, borderColor: 'rgba(40, 167, 69, 0.9)', backgroundColor: 'rgba(40, 167, 69, 0.1)', yAxisID: 'y', borderDash: [5, 5], spanGaps: true }
                ];
                return { labels, datasets };
            },
            options: (titleSuffix, _, fetchedRawData) => ({
                plugins: { title: { display: true, text: `Betterment Balance ${titleSuffix}` }, legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } },
                scales: { y: { beginAtZero: false, title: { display: true, text: 'USD ($)' }, suggestedMax: getSafeMax(fetchedRawData.datasets.map(ds => ds.data), 10000) }, x: { title: { display: true, text: 'Date' } } }
            }),
            type: 'line',
        },
        "Physical": {
            fetchData: async (range) => {
                const { startDate, endDate } = range;
                const logsRef = collection(db, "readyForWorkLogs");
                const q = query(logsRef, where("completedAt", ">=", Timestamp.fromDate(startDate)), where("completedAt", "<=", Timestamp.fromDate(endDate)), orderBy("completedAt", "asc"));
                const querySnapshot = await getDocs(q);
                const logs = querySnapshot.docs.map(doc => doc.data());

                const labels = [];
                const weightData = [];
                let currentDate = new Date(startDate);

                logs.forEach(log => {
                    const logDate = log.completedAt.toDate();
                    while (currentDate < logDate) {
                        labels.push(currentDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
                        weightData.push(null);
                        currentDate.setDate(currentDate.getDate() + 1);
                    }
                    labels.push(logDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
                    weightData.push(log.weight || null);
                    currentDate.setDate(currentDate.getDate() + 1);
                });

                while (currentDate <= endDate) {
                    labels.push(currentDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
                    weightData.push(null);
                    currentDate.setDate(currentDate.getDate() + 1);
                }

                const projectionData = new Array(labels.length).fill(null);
                const validWeightData = weightData.map((y, x) => (y !== null ? [x, y] : null)).filter(Boolean);
                if (validWeightData.length >= 2) {
                    const { slope, intercept } = linearRegression(validWeightData);
                    const lastDataIndex = weightData.findLastIndex(d => d !== null);
                    if (lastDataIndex !== -1) {
                        for (let i = lastDataIndex; i < labels.length; i++) {
                            projectionData[i] = slope * i + intercept;
                        }
                    }
                }
                const datasets = [
                    { label: 'Weight (lbs)', data: weightData, type: 'line', tension: 0.2, borderColor: getAxisThemeColor("Physical", '0.9'), backgroundColor: getAxisThemeColor("Physical", '0.2'), yAxisID: 'y', spanGaps: true, fill: false, pointRadius: 2 },
                    { label: 'Trend Line', data: projectionData, type: 'line', borderColor: 'rgba(255, 99, 132, 0.8)', yAxisID: 'y', borderDash: [5, 5], spanGaps: true, pointRadius: 0 }
                ];
                return { labels, datasets };
            },
            options: (titleSuffix, _, fetchedRawData) => ({
                plugins: { title: { display: true, text: `Weight Trend ${titleSuffix}` }, legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } },
                scales: { y: { min: 160, max: 180, title: { display: true, text: 'Weight (lbs)' } }, x: { title: { display: true, text: 'Date' } } }
            }),
            type: 'line',
        },
        "Environment": {
            fetchData: async (range) => {
                const { startDate, endDate } = range;
                const logsRef = collection(db, "familyCleanLogs");
                const q = query(logsRef, where("completedAt", ">=", Timestamp.fromDate(startDate)), where("completedAt", "<=", Timestamp.fromDate(endDate)), orderBy("completedAt", "asc"));
                const querySnapshot = await getDocs(q);
                const logs = querySnapshot.docs.map(doc => ({ ...doc.data(), completedAt: doc.data().completedAt.toDate() }));

                if (logs.length === 0) return { labels: [], datasets: [], avgPostRatings: [], cleanerImprovementData: {} };

                const cleanerNames = ["Abi", "Izi", "Tiffany"];
                const dataByDate = new Map();

                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                    const dateStr = d.toISOString().split('T')[0];
                    dataByDate.set(dateStr, {
                        label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                        logs: []
                    });
                }
                
                logs.forEach(log => {
                    const dateStr = log.completedAt.toISOString().split('T')[0];
                    if (dataByDate.has(dateStr)) {
                        dataByDate.get(dateStr).logs.push(log);
                    }
                });
                
                const labels = [];
                const avgPostRatings = [];
                const cleanerImprovementData = Object.fromEntries(cleanerNames.map(name => [name, []]));

                dataByDate.forEach(dayData => {
                    labels.push(dayData.label);
                    if (dayData.logs.length === 0) {
                        avgPostRatings.push(null);
                        cleanerNames.forEach(name => cleanerImprovementData[name].push(null));
                    } else {
                        const sum = dayData.logs.reduce((acc, curr) => acc + (curr.postCleaningRating || 0), 0);
                        avgPostRatings.push(parseFloat((sum / dayData.logs.length).toFixed(1)));

                        cleanerNames.forEach(name => {
                            const cleanerLogs = dayData.logs.filter(log => log.cleanerName === name);
                            const improvement = cleanerLogs.reduce((acc, curr) => acc + ((curr.postCleaningRating || 0) - (curr.preCleaningRating || 0)), 0);
                            cleanerImprovementData[name].push(improvement);
                        });
                    }
                });

                const datasets = [{ label: 'Avg. Room Rating', data: avgPostRatings, borderColor: 'rgba(0,0,0,0.9)', backgroundColor: 'rgba(0,0,0,0.1)', type: 'line', tension: 0.1, yAxisID: 'y', order: 0, spanGaps: true }];
                cleanerNames.forEach(name => {
                    datasets.push({ label: `${name}'s Improvement`, data: cleanerImprovementData[name], borderColor: cleanerColors[name] || cleanerColors["Default"], backgroundColor: (cleanerColors[name] || cleanerColors["Default"]).replace('0.9', '0.2'), type: 'line', tension: 0.3, borderDash: [5, 5], yAxisID: 'y', order: cleanerNames.indexOf(name) + 1, spanGaps: true });
                });
                
                return { labels, datasets, avgPostRatings, cleanerImprovementData };
            },
            options: (titleSuffix = '', _, fetchedRawData) => ({
                plugins: { title: { display: true, text: `Room Cleanliness & Cleaner Impact ${titleSuffix}` }, legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false }, },
                scales: { y: { type: 'linear', display: true, position: 'left', beginAtZero: true, title: { display: true, text: 'Rating / Improvement Score' }, suggestedMax: getSafeMax([fetchedRawData?.avgPostRatings || [], ...Object.values(fetchedRawData?.cleanerImprovementData || {})], 10) }, x: { title: { display: true, text: 'Date' } } }
            }),
            type: 'line',
        },
        "Gear": { type: 'placeholder' },
        "ON TRACK N+1": { type: 'placeholder' },
        "Misdirect": { type: 'placeholder' },
        "Rest and preparation": { type: 'placeholder' }
    }), [theme]);

    useEffect(() => {
        const loadChart = async () => {
            console.log("LOG 3: useEffect is using startDate:", internalDateRange.startDate.toString());
            setIsLoading(true); 
            setError(null);

            const cacheKey = `${theme}-${internalDateRange.startDate.toISOString()}-${internalDateRange.endDate.toISOString()}`;
            if (cachedData[cacheKey]) {
                const { chartData, chartOptions, chartType } = cachedData[cacheKey];
                setChartData(chartData);
                setChartOptions(chartOptions);
                setChartType(chartType);
                setIsLoading(false);
                return;
            }
            
            const config = chartConfigs[theme] || { type: 'placeholder' };
            if (config.type === 'placeholder' || !config.fetchData) {
                setChartData(null);
                setIsLoading(false);
                return;
            }

            try {
                const fetchedData = await config.fetchData(internalDateRange);
                if (!fetchedData || !fetchedData.datasets) {
                    throw new Error("Data fetching returned invalid structure.");
                }
                const baseOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: (fetchedData.datasets?.length || 0) > 1, position: 'top' }, datalabels: { display: false } } };
                let specificOptions = config.options ? config.options('', theme, fetchedData) : {};
                
                const finalChartData = { ...fetchedData };
                const finalChartOptions = { ...baseOptions, ...specificOptions, plugins: { ...baseOptions.plugins, ...specificOptions.plugins } };
                const finalChartType = config.type || 'line';

                setChartData(finalChartData);
                setChartOptions(finalChartOptions);
                setChartType(finalChartType);

                setCachedData(prevCache => ({
                    ...prevCache,
                    [cacheKey]: {
                        chartData: finalChartData,
                        chartOptions: finalChartOptions,
                        chartType: finalChartType
                    }
                }));

            } catch (e) {
                console.error(`Error in loadChart for theme ${theme}:`, e);
                setError(`Failed to load data for ${theme} chart.`);
            } finally {
                setIsLoading(false);
            }
        };
        if (theme) loadChart();
    }, [theme, internalDateRange, chartConfigs, cachedData]);

    const handleChartClick = () => {
        if (!chartData) return;
        const config = chartConfigs[theme] || { type: 'placeholder' };
        if (config.type === 'placeholder') return;

        const modalSpecificOptions = config.options ? config.options('(Expanded View)', theme, chartData) : {};
        setModalChartData(chartData);
        setModalChartOptions({ ...chartOptions, ...modalSpecificOptions, plugins: { ...chartOptions.plugins, ...modalSpecificOptions.plugins, datalabels: { display: true, anchor: 'end', align: 'end', color: '#333' } }, });
        setModalChartType(chartType);
        setIsModalOpen(true);
    };

    const renderChart = (data, options, type) => {
        const config = chartConfigs[theme] || { type: 'placeholder' };

        if (config.type === 'placeholder') {
            return <div className={styles.placeholder}>
                <h2>{theme} Chart</h2>
                <p>Coming Soon!</p>
            </div>;
        }
        if (!data || !data.datasets || data.datasets.length === 0 || data.datasets.every(ds => !ds.data || ds.data.length === 0 || ds.data.every(pt => pt === null))) {
            return <p className={styles.noDataMessage}>No data available for the {theme} chart in this period.</p>;
        }

        const ChartComponentMap = { bar: Bar, line: Line, doughnut: Doughnut, pie: Pie };
        const ChartComponent = ChartComponentMap[type] || Line;

        return <ChartComponent options={options} data={data} />;
    };

    const containerClass = `${styles.chartContainer} ${styles[containerSize]}`;
    if (isLoading) return <div className={containerClass}><p>Loading {theme} chart...</p></div>;
    if (error) return <div className={containerClass}><p style={{ color: 'red' }}>{error}</p></div>;

    return (
        <>
            <div className={containerClass} onClick={handleChartClick} title={`Click to expand ${theme} chart`}>
                {renderChart(chartData, chartOptions, chartType)}
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