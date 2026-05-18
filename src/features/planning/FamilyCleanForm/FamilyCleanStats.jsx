import React, { useState, useEffect, useCallback } from 'react';
import styles from '@/features/planning/FamilyCleanForm/FamilyCleanStats.module.css';
import { db } from '@/firebaseConfig';
import { collection, query, where, Timestamp, getDocs, orderBy } from "firebase/firestore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// --- Chart Colors ---
const CLEANER_COLORS = { "Abi": '#ef4444', "Izi": '#3b82f6', "Tiffany": '#f59e0b' };
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// --- Helper for Pie Chart Labels ---
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    if (percent < 0.05) return null;
    return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontWeight="bold">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

function FamilyCleanStats({ people }) { // Accept people as a prop
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mainChartData, setMainChartData] = useState([]);
    const [cleanestRooms, setCleanestRooms] = useState([]);
    const [timeSpentData, setTimeSpentData] = useState([]);
    const [usageConsistency, setUsageConsistency] = useState(0);
    const [dateRange, setDateRange] = useState(() => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 29);
        return { startDate, endDate };
    });

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { startDate, endDate } = dateRange;
            const logsRef = collection(db, "familyCleanLogs");
            const q = query(logsRef, where("completedAt", ">=", Timestamp.fromDate(startDate)), where("completedAt", "<=", Timestamp.fromDate(endDate)), orderBy("completedAt", "asc"));
            const querySnapshot = await getDocs(q);
            const logs = querySnapshot.docs.map(doc => ({ ...doc.data(), completedAt: doc.data().completedAt.toDate() }));

            if (logs.length === 0) {
                setMainChartData([]); setCleanestRooms([]); setTimeSpentData([]); setUsageConsistency(0);
                setIsLoading(false);
                return;
            }

            const roomStats = {};
            const loggedDays = new Set();

            logs.forEach(log => {
                loggedDays.add(log.completedAt.toISOString().split('T')[0]);
                if (!roomStats[log.roomName]) {
                    roomStats[log.roomName] = { ratings: [], time: 0 };
                }
                if(log.postCleaningRating) roomStats[log.roomName].ratings.push(log.postCleaningRating);
                if(log.durationMinutes) roomStats[log.roomName].time += log.durationMinutes;
            });
            
            const avgRatings = Object.entries(roomStats).map(([name, stats]) => ({
                name,
                avg: stats.ratings.length > 0 ? stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length : 0
            })).sort((a, b) => b.avg - a.avg).slice(0, 5);
            setCleanestRooms(avgRatings);

            const pieData = Object.entries(roomStats)
                .map(([name, stats]) => ({ name, value: stats.time }))
                .filter(item => item.value > 0).sort((a,b) => b.value - a.value);
            setTimeSpentData(pieData);

            const totalDaysInRange = (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24) + 1;
            setUsageConsistency(Math.round((loggedDays.size / totalDaysInRange) * 100));
            
            const dataByDate = new Map();
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                dataByDate.set(dateStr, {
                    name: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                    avgRating: null,
                    ...Object.fromEntries(people.map(name => [name, null]))
                });
            }
            logs.forEach(log => {
                const dateStr = log.completedAt.toISOString().split('T')[0];
                if (dataByDate.has(dateStr)) {
                    const dayData = dataByDate.get(dateStr);
                    if (!dayData.logs) dayData.logs = [];
                    dayData.logs.push(log);
                }
            });
            dataByDate.forEach((dayData) => {
                if (dayData.logs && dayData.logs.length > 0) {
                    dayData.avgRating = parseFloat((dayData.logs.reduce((a, c) => a + (c.postCleaningRating || 0), 0) / dayData.logs.length).toFixed(1));
                    people.forEach(name => {
                        const cleanerLogs = dayData.logs.filter(log => log.cleanerName === name);
                        dayData[name] = cleanerLogs.reduce((a, c) => a + ((c.postCleaningRating || 0) - (c.preCleaningRating || 0)), 0);
                    });
                }
                delete dayData.logs;
            });
            setMainChartData(Array.from(dataByDate.values()));

        } catch (err) {
            console.error("Error fetching cleaning stats:", err);
            setError("Failed to load cleaning statistics.");
        } finally {
            setIsLoading(false);
        }
    }, [dateRange, people]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className={styles.statsContainer}>
            <h1 className={styles.title}>Family Clean Statistics</h1>
            
            {isLoading ? <p>Loading stats...</p> : error ? <p className={styles.error}>{error}</p> :
                <>
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <h3>Cleanest Rooms (Avg. Rating)</h3>
                            <ol className={styles.rankedList}>
                                {cleanestRooms.map(room => (
                                    <li key={room.name}>
                                        <span>{room.name}</span>
                                        <span className={styles.statValue}>{room.avg.toFixed(1)} ★</span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                        <div className={styles.statCard}>
                            <h3>Time Spent per Room</h3>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={timeSpentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={renderCustomizedLabel}>
                                        {timeSpentData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className={styles.statCard}>
                            <h3>Usage Consistency</h3>
                            <p className={styles.consistencyValue}>{usageConsistency}<span>%</span></p>
                            <p className={styles.consistencySubtext}>Logged in last 30 days</p>
                        </div>
                    </div>

                    <div className={styles.chartSection}>
                        <h2 className={styles.sectionTitle}>Room Cleanliness & Cleaner Impact</h2>
                        <div className={styles.chartWrapper}>
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={mainChartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#FDE68A" />
                                    <XAxis dataKey="name" stroke="#92400E" />
                                    <YAxis yAxisId="left" label={{ value: 'Avg. Rating', angle: -90, position: 'insideLeft', fill: '#92400E' }} stroke="#92400E" />
                                    <YAxis yAxisId="right" orientation="right" label={{ value: 'Improvement Score', angle: -90, position: 'insideRight', fill: '#92400E' }} stroke="#92400E" />
                                    <Tooltip />
                                    <Legend />
                                    <Line yAxisId="left" type="monotone" dataKey="avgRating" name="Avg. Room Rating" stroke="#4B5563" strokeWidth={3} connectNulls />
                                    {/* FIX: Use `people` prop instead of undefined `cleanerNames` */}
                                    {people.map(name => (
                                        <Line key={name} yAxisId="right" type="monotone" dataKey={name} name={`${name}'s Improvement`} stroke={CLEANER_COLORS[name]} strokeDasharray="4 4" strokeWidth={2} connectNulls />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            }
        </div>
    );
};

export default FamilyCleanStats;