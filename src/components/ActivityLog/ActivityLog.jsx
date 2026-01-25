import React from 'react';
import styles from './ActivityLog.module.css';
import { FaDroplet } from 'react-icons/fa6'; // The water drop icon

// Helper to format "YYYY-MM-DD" to "M/D"
const formatDate = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return `${parseInt(month, 10)}/${parseInt(day, 10)}`;
};

// A sub-component for the meal blocks
const MealBlocks = ({ meals }) => {
    const mealData = meals || {};
    return (
        <div className={styles.mealBlocks}>
            <span className={mealData.Breakfast ? styles.mealTracked : styles.mealMissed}>B</span>
            <span className={mealData.Lunch ? styles.mealTracked : styles.mealMissed}>L</span>
            <span className={mealData.Dinner ? styles.mealTracked : styles.mealMissed}>D</span>
            <span className={mealData.Snacks ? styles.mealTracked : styles.mealMissed}>S</span>
        </div>
    );
};

// A sub-component for the water drops
const WaterDrops = ({ count }) => {
    const drops = [];
    for (let i = 0; i < (count || 0); i++) {
        drops.push(<FaDroplet key={i} className={styles.waterDrop} />);
    }
    return <div className={styles.waterDrops}>{drops.length > 0 ? drops : '-'}</div>;
};

// The main log component
function ActivityLog({ data }) {
    // We reverse the data so the most recent day is at the top
    const reversedData = [...data].reverse();

    return (
        <div className={styles.logContainer}>
            <h3 className={styles.chartTitle}>Daily Activity Log (Last 60 Days)</h3>
            <div className={styles.logGrid}>
                {/* Header Row */}
                <div className={styles.logHeader}>Date</div>
                <div className={styles.logHeader}>Gym</div>
                <div className={styles.logHeader}>Water</div>
                <div className={styles.logHeader}>Meals</div>
                
                {/* Data Rows */}
                {reversedData.map(doc => (
                    <React.Fragment key={doc.id}>
                        <div className={styles.logCellDate}>{formatDate(doc.id)}</div>
                        <div className={styles.logCell}>
                            {doc.wentToGym && <span className={styles.gymBlock}></span>}
                        </div>
                        <div className={styles.logCell}>
                            <WaterDrops count={doc.waterCount} />
                        </div>
                        <div className={styles.logCell}>
                            <MealBlocks meals={doc.meals} />
                        </div>
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

export default ActivityLog;