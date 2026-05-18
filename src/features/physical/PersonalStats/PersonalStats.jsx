// src/components/PersonalStats/PersonalStats.jsx
import React, { useState, useEffect } from 'react';
import styles from '@/features/physical/PersonalStats/PersonalStats.module.css';

// --- Helper component for a single stat card ---
const StatCard = ({ title, value, unit, icon }) => (
    <div className={styles.statCard}>
        <div className={styles.statIcon}>{icon}</div>
        <div className={styles.statContent}>
            <span className={styles.statTitle}>{title}</span>
            <span className={styles.statValue}>{value}</span>
            {unit && <span className={styles.statUnit}>{unit}</span>}
        </div>
    </div>
);


const PersonalStats = ({ birthDate }) => {
    const [now, setNow] = useState(new Date());

    // Effect for the live-ticking counters
    useEffect(() => {
        const timer = setInterval(() => {
            setNow(new Date());
        }, 1000); // Update every second

        // Cleanup function to stop the timer when the component unmounts
        return () => clearInterval(timer);
    }, []);

    // --- All calculation logic ---
    const msInDay = 1000 * 60 * 60 * 24;
    const msInSecond = 1000;

    const totalMsAlive = now.getTime() - birthDate.getTime();
    const totalDaysAlive = Math.floor(totalMsAlive / msInDay);
    const totalSecondsAlive = Math.floor(totalMsAlive / msInSecond);

    // Static Personal Stats
    const offspring = 1;
    const bonesBroken = 2;

    // Time-based stats
    const solarOrbits = Math.floor(totalDaysAlive / 365.25);

    // Biological Stats (Estimates)
    const restingHeartRateBPM = 79;
    const heartbeats = Math.floor(totalSecondsAlive * (restingHeartRateBPM / 60));

    const breathsPerMinute = 16; // Average for an adult
    const breaths = Math.floor(totalSecondsAlive * (breathsPerMinute / 60));
    
    // Menstrual Cycle Stats (Estimates)
    const menstruationStartDate = new Date(birthDate.getFullYear() + 12, birthDate.getMonth(), birthDate.getDate());
    const pregnancyDurationDays = 274; // Approx 9 months
    const totalDaysSinceMenarche = Math.floor((now.getTime() - menstruationStartDate.getTime()) / msInDay);
    const daysInCycle = 28;
    const periodDuration = 5;
    const menstrualCycles = Math.max(0, Math.floor((totalDaysSinceMenarche - pregnancyDurationDays) / daysInCycle));
    const daysSpentMenstruating = menstrualCycles * periodDuration;

    // Theoretical Oxygen Stat
    // This is a rough scientific estimation for fun.
    // (Avg. lung capacity * breaths * O2% * density * atoms per mole)
    const oxygenAtomsRecycled = (4 * breaths * 0.21 * 1.429 / 32) * (6.022e23 * 2);

    return (
        <div className={styles.statsContainer}>
            <h2 className={styles.statsViewTitle}>Life Stats Dashboard</h2>
            <div className={styles.statsGrid}>
                <StatCard title="Days Alive" value={totalDaysAlive.toLocaleString()} icon="☀️" />
                <StatCard title="Solar Orbits" value={solarOrbits.toLocaleString()} icon="🌍" />
                <StatCard title="Heartbeats" value={heartbeats.toLocaleString()} icon="❤️" unit="Est." />
                <StatCard title="Breaths Taken" value={breaths.toLocaleString()} icon="🌬️" unit="Est." />
                <StatCard title="Menstrual Cycles" value={menstrualCycles.toLocaleString()} icon="🩸" unit="Est." />
                <StatCard title="Time Menstruating" value={`${(daysSpentMenstruating / 365.25).toFixed(1)} years`} icon="🗓️" unit="Est." />
                <StatCard title="Oxygen Recycled" value={oxygenAtomsRecycled.toExponential(2)} icon="⚛️" unit="Atoms" />
                <StatCard title="Offspring" value={offspring} icon="👶" />
                <StatCard title="Bones Broken" value={bonesBroken} icon="🦴" />
            </div>
        </div>
    );
};

export default PersonalStats;