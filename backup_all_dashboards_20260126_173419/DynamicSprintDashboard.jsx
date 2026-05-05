// src/components/DynamicSprintDashboard/DynamicSprintDashboard.jsx
import React, { useState, useEffect } from 'react';
import { getPrimaryActiveSprint, getProjectIdFromSprint } from '../../services/sprintService';
import PhysicalDashboard from '../PhysicalDashboard/PhysicalDashboard';
import GearDashboard from '../GearDashboard/GearDashboard';
// Import other dashboards as we create them
// import FinancialDashboard from '../FinancialDashboard/FinancialDashboard';
// import EnvironmentDashboard from '../EnvironmentDashboard/EnvironmentDashboard';
// import GenericSprintDashboard from '../GenericSprintDashboard/GenericSprintDashboard';

import styles from './DynamicSprintDashboard.module.css';

function DynamicSprintDashboard() {
    const [activeSprint, setActiveSprint] = useState(null);
    const [projectId, setProjectId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchActiveSprint = async () => {
            setLoading(true);
            setError(null);
            try {
                const sprint = await getPrimaryActiveSprint();
                setActiveSprint(sprint);
                
                // Get project ID from sprint
                if (sprint) {
                    const projId = await getProjectIdFromSprint(sprint);
                    setProjectId(projId);
                }
            } catch (err) {
                console.error("Error fetching active sprint:", err);
                setError("Could not load active sprint information.");
            } finally {
                setLoading(false);
            }
        };

        fetchActiveSprint();
    }, []);

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Loading sprint dashboard...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>{error}</div>
            </div>
        );
    }

    // No active sprint - default to Physical Dashboard
    if (!activeSprint) {
        return (
            <div className={styles.container}>
                <div className={styles.noSprintBanner}>
                    <p>No active sprint. Showing Physical Dashboard by default.</p>
                </div>
                <PhysicalDashboard />
            </div>
        );
    }

    // Route to the appropriate dashboard based on axis
    const renderDashboard = () => {
        const axis = activeSprint.axis;

        switch (axis) {
            case 'Physical':
                return <PhysicalDashboard sprint={activeSprint} projectId={projectId} />;
            
            case 'Gear':
                return <GearDashboard sprint={activeSprint} projectId={projectId} />;
            
            // TODO: Add other axes as we build them
            // case 'Financial':
            //     return <FinancialDashboard sprint={activeSprint} projectId={projectId} />;
            
            // case 'Environment':
            //     return <EnvironmentDashboard sprint={activeSprint} projectId={projectId} />;
            
            // case 'Misdirect':
            // case 'On Track N+1':
            // case 'Rest and preparation':
            default:
                // For now, fall back to Physical Dashboard
                // Later we'll create GenericSprintDashboard
                return (
                    <div className={styles.container}>
                        <div className={styles.noSprintBanner}>
                            <p>Dashboard for "{axis}" axis coming soon. Showing Physical Dashboard.</p>
                        </div>
                        <PhysicalDashboard sprint={activeSprint} projectId={projectId} />
                    </div>
                );
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.sprintBanner}>
                <div className={styles.sprintInfo}>
                    <h3 className={styles.sprintTitle}>
                        🎯 Active Sprint: {activeSprint.text}
                    </h3>
                    <div className={styles.sprintMeta}>
                        <span className={styles.axis}>Axis: {activeSprint.axis}</span>
                        <span className={styles.dates}>
                            {activeSprint.startDate} → {activeSprint.endDate}
                        </span>
                    </div>
                </div>
            </div>
            {renderDashboard()}
        </div>
    );
}

export default DynamicSprintDashboard;
