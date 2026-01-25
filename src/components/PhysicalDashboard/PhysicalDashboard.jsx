import React, { useState, useEffect } from 'react';
import { db } from '../../firebaseConfig';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import styles from './PhysicalDashboard.module.css';
import PhysicalMetricsChart from '../PhysicalMetricsChart/PhysicalMetricsChart'; // We'll re-use this!

function PhysicalDashboard() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const logsRef = collection(db, 'physicalGoalsLogs');
                // Order by timestamp to get them in the right order
                const q = query(logsRef, orderBy('amMetricsCompletedAt', 'asc'));
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

    if (loading) {
        return <div className={styles.dashboardContainer}>Loading Dashboard...</div>;
    }

    if (error) {
        return <div className={styles.dashboardContainer}>{error}</div>;
    }

    return (
        <div className={styles.dashboardContainer}>
            <h2 className={styles.dashboardTitle}>Physical Goals Dashboard</h2>
            
            <div className={styles.grid}>
                {/* We will add your new charts and indicators here in the next steps.
                  For now, we'll just add your existing chart.
                */}
                
                {/* Main Weight & Bodyfat Chart */}
                <div className={`${styles.card} ${styles.fullWidth}`}>
                    <PhysicalMetricsChart chartData={data} />
                </div>

                {/* Next, we'll add KPI cards here... */}

                {/* Then, we'll add new charts for steps, water, etc. here... */}
            </div>
        </div>
    );
}

export default PhysicalDashboard;