import React, { useState, useEffect } from 'react';
import { db } from '../../firebaseConfig';
import { collection, query, getDocs, orderBy, where, documentId } from 'firebase/firestore';
import {
    ResponsiveContainer,
    LineChart,
    BarChart,
    Line,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from 'recharts';
import styles from './PhysicalMetricsChart.module.css';
import ActivityLog from '../ActivityLog/ActivityLog';

// --- Reusable Helper Functions ---

const getAverage = (arr, key) => {
    if (!arr || arr.length === 0) return 0;
    const validItems = arr.filter(d => d[key] != null);
    if (validItems.length === 0) return 0;
    const sum = validItems.reduce((acc, val) => acc + val[key], 0);
    return sum / validItems.length;
};

const formatDate = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return `${parseInt(month, 10)}/${parseInt(day, 10)}`;
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className={styles.customTooltip}>
                <p className={styles.tooltipLabel}>{label}</p>
                {payload.map((pld, index) => (
                    <p key={index} style={{ color: pld.color }}>
                        {`${pld.name}: ${pld.value}`}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

// --- 1. KPI: Current Week "At a Glance" (NEW) ---

function CurrentWeekKpis({ data }) {
    // Get data from the last 7 days
    const today = new Date();
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - 6); // Today + 6 previous days = 7 days
    
    const year = pastDate.getFullYear();
    const month = String(pastDate.getMonth() + 1).padStart(2, '0');
    const day = String(pastDate.getDate()).padStart(2, '0');
    const startDateString = `${year}-${month}-${day}`;
    
    // Filter the full data prop to get just the last 7 days
    const last7DaysData = data.filter(doc => doc.id >= startDateString);
    const numDays = last7DaysData.length;

    if (numDays === 0) {
        return <div className={styles.kpiGrid}>No data for the last 7 days.</div>;
    }

    // 1. % of days with 3+ waters
    const daysWith3Waters = last7DaysData.filter(d => d.waterCount >= 3).length;
    const percentWaters = (daysWith3Waters / numDays) * 100;

    // 2. % of meals tracked (out of all possible meals)
    let totalMealsPossible = numDays * 4; // B, L, D, S
    let totalMealsTracked = 0;
    last7DaysData.forEach(doc => {
      if (doc.meals) {
        if (doc.meals.Breakfast) totalMealsTracked++;
        if (doc.meals.Lunch) totalMealsTracked++;
        if (doc.meals.Dinner) totalMealsTracked++;
        if (doc.meals.Snacks) totalMealsTracked++;
      }
    });
    const percentMeals = (totalMealsTracked / totalMealsPossible) * 100;

    // 3. % of days with 10k+ steps
    const daysWith10kSteps = last7DaysData.filter(d => d.steps >= 10000).length;
    const percentSteps = (daysWith10kSteps / numDays) * 100;

    return (
        <div className={styles.kpiGrid}>
            <div className={`${styles.kpiCard} ${percentSteps >= 80 ? styles.green : styles.yellow}`}>
                <div className={styles.kpiTitle}>10k Step Days</div>
                <div className={styles.kpiValue}>{percentSteps.toFixed(0)}<span className={styles.kpiUnit}>%</span></div>
            </div>
            <div className={`${styles.kpiCard} ${percentWaters >= 80 ? styles.green : styles.yellow}`}>
                <div className={styles.kpiTitle}>3+ Water Days</div>
                <div className={styles.kpiValue}>{percentWaters.toFixed(0)}<span className={styles.kpiUnit}>%</span></div>
            </div>
            <div className={`${styles.kpiCard} ${percentMeals >= 80 ? styles.green : styles.yellow}`}>
                <div className={styles.kpiTitle}>Meals Tracked</div>
                <div className={styles.kpiValue}>{percentMeals.toFixed(0)}<span className={styles.kpiUnit}>%</span></div>
            </div>
        </div>
    );
}

// --- 2. KPI: Weight Trend Sub-Component ---

function KpiWeightCards({ data }) {
    if (data.length === 0) return null;
    const entriesWithWeight = data.filter(d => d.weight != null);
    if (entriesWithWeight.length === 0) return null;

    const lastEntry = entriesWithWeight[entriesWithWeight.length - 1];
    const currentWeight = lastEntry.weight;

    const last7Days = entriesWithWeight.slice(-7);
    const prev7Days = entriesWithWeight.slice(-14, -7);
    const avgLast7 = getAverage(last7Days, 'weight');
    const avgPrev7 = getAverage(prev7Days, 'weight');
    
    let trend = 0;
    if (avgLast7 > 0 && avgPrev7 > 0) {
        trend = avgLast7 - avgPrev7;
    }

    let trendStyle = styles.yellow;
    let trendIndicator = "Maintaining";
    if (trend < -0.25) {
        trendStyle = styles.green;
        trendIndicator = "Losing";
    } else if (trend > 0.25) {
        trendStyle = styles.red;
        trendIndicator = "Gaining";
    }

    return (
        <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
                <div className={styles.kpiTitle}>Current Weight</div>
                <div className={styles.kpiValue}>{currentWeight.toFixed(1)} <span className={styles.kpiUnit}>lbs</span></div>
            </div>
            <div className={styles.kpiCard}>
                <div className={styles.kpiTitle}>Weekly Trend</div>
                <div className={styles.kpiValue}>
                    {trend > 0 ? '+' : ''}{trend.toFixed(1)} <span className={styles.kpiUnit}>lbs</span>
                </div>
            </div>
            <div className={`${styles.kpiCard} ${trendStyle}`}>
                <div className={styles.kpiTitle}>Momentum</div>
                <div className={styles.kpiValue}>{trendIndicator}</div>
            </div>
        </div>
    );
}

// --- 3. KPI: Activity Stats Sub-Component ---

function KpiActivityCards({ data }) {
    if (data.length === 0) return null;

    const totalGymDays = data.filter(d => d.wentToGym === true).length;
    const daysWithMealData = data.filter(d => d.meals).length;
    const mealTrackedPercent = (daysWithMealData / data.length) * 100;

    let gymStreak = 0;
    const reversedData = [...data].reverse();
    for (const doc of reversedData) {
        if (doc.wentToGym === true) {
            gymStreak++;
        } else if (doc.hasOwnProperty('wentToGym')) {
            break;
        }
    }

    return (
        <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
                <div className={styles.kpiTitle}>Total Gym Visits</div>
                <div className={styles.kpiValue}>{totalGymDays}</div>
            </div>
            <div className={styles.kpiCard}>
                <div className={styles.kpiTitle}>Current Gym Streak</div>
                <div className={styles.kpiValue}>{gymStreak} <span className={styles.kpiUnit}>days</span></div>
            </div>
            <div className={styles.kpiCard}>
                <div className={styles.kpiTitle}>Meals Logged % (All)</div>
                <div className={styles.kpiValue}>{mealTrackedPercent.toFixed(0)}<span className={styles.kpiUnit}>%</span></div>
            </div>
        </div>
    );
}

// --- 4. Weight & Bodyfat Chart ---

function WeightAndBodyfatChart({ data }) {
    const chartData = data.map(doc => ({
        date: formatDate(doc.id),
        weight: doc.weight || null,
        bodyfat: doc.bodyfatPercentage || null,
    }));

    return (
        <div className={styles.chartBox}>
            <h3 className={styles.chartTitle}>Weight & Body Fat</h3>
            <ResponsiveContainer width="100%" height={350}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" stroke="#d90429" />
                    <YAxis yAxisId="right" orientation="right" stroke="#888" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                        yAxisId="left" type="monotone" dataKey="weight"
                        stroke="#d90429" strokeWidth={2} activeDot={{ r: 8 }} connectNulls
                    />
                    <Line
                        yAxisId="right" type="monotone" dataKey="bodyfat"
                        stroke="#888" strokeWidth={2} connectNulls
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

// --- 5. Steps Chart ---

function StepsChart({ data }) {
    const chartData = data.filter(d => d.steps > 0).map(doc => ({
        date: formatDate(doc.id),
        Steps: doc.steps || 0,
    }));

    return (
        <div className={styles.chartBox}>
            <h3 className={styles.chartTitle}>Daily Steps</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" stroke="#d90429" /> 
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="Steps" fill="#d90429" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

// --- 6. Main Component (The Dashboard) ---

function PhysicalMetricsChart({ isModal = false }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const today = new Date();
                const pastDate = new Date();
                pastDate.setDate(today.getDate() - 60); 

                const year = pastDate.getFullYear();
                const month = String(pastDate.getMonth() + 1).padStart(2, '0');
                const day = String(pastDate.getDate()).padStart(2, '0');
                const startDateString = `${year}-${month}-${day}`;
                
                const logsRef = collection(db, 'physicalGoalsLogs');
                
                const q = query(
                    logsRef, 
                    where(documentId(), '>=', startDateString), 
                    orderBy(documentId(), 'asc')
                ); 
                
                const querySnapshot = await getDocs(q);

                const allData = querySnapshot.docs.map(doc => ({
                    id: doc.id, // "YYYY-MM-DD"
                    ...doc.data()
                }));
                
                setData(allData);
                
            } catch (err) {
                console.error("Error fetching physical logs:", err);
                setError("Could not load dashboard data.");
            }
            setLoading(false);
        };

        fetchData();
    }, []);

    const containerClass = isModal ? styles.modalVersion : styles.dashboardContainer;

    if (loading) {
        return <div className={containerClass}>Loading Dashboard...</div>;
    }

    if (error) {
        return <div className={containerClass}>{error}</div>;
    }

    // --- 7. UPDATED RENDER ---
    return (
        <div className={containerClass}>
            
            <h3 className={styles.kpiHeader}>Current Week</h3>
            <CurrentWeekKpis data={data} />
            
            <h3 className={styles.kpiHeader}>Overall Trends (Last 60 Days)</h3>
            <KpiWeightCards data={data} />
            <KpiActivityCards data={data} />
            
            <div className={styles.grid}>
                <div className={`${styles.card} ${styles.fullWidth}`}>
                    <WeightAndBodyfatChart data={data} />
                </div>
                <div className={styles.card}>
                    <StepsChart data={data} />
                </div>
                <div className={styles.card}>
                    <ActivityLog data={data} />
                </div>
            </div>
        </div>
    );
}

export default PhysicalMetricsChart;