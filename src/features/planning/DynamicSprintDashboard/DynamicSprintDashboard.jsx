// src/components/DynamicSprintDashboard/DynamicSprintDashboard.jsx (COMPLETE VERSION)
import React, { useState, useEffect } from 'react';
import { getPrimaryActiveSprint, getProjectIdFromSprint } from '@/services/sprintService';
import PhysicalDashboard from '@/features/physical/PhysicalDashboard/PhysicalDashboard';
import GearDashboard from '@/features/gear/GearDashboard/GearDashboard';
import FinancialDashboard from '@/features/financial/FinancialDashboard/FinancialDashboard';
import EnvironmentDashboard from '@/features/environment/EnvironmentDashboard/EnvironmentDashboard';
import MisdirectDashboard from '@/features/misdirect/MisdirectDashboard/MisdirectDashboard';
import OnTrackDashboard from '@/features/ontrack/OnTrackDashboard/OnTrackDashboard';
import RestPreparationDashboard from '@/features/rest/RestPreparationDashboard/RestPreparationDashboard';

import styles from '@/features/planning/DynamicSprintDashboard/DynamicSprintDashboard.module.css';

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
            
            case 'Financial':
                return <FinancialDashboard sprint={activeSprint} projectId={projectId} />;
            
            case 'Environment':
                return <EnvironmentDashboard sprint={activeSprint} projectId={projectId} />;
            
            case 'Misdirect':
                return <MisdirectDashboard sprint={activeSprint} projectId={projectId} />;
                
            case 'On Track N+1':
                return <OnTrackDashboard sprint={activeSprint} projectId={projectId} />;
                
            case 'Rest and preparation':
                return <RestPreparationDashboard sprint={activeSprint} projectId={projectId} />;
            
            default:
                // Fallback for any unknown axis
                return (
                    <div className={styles.container}>
                        <div className={styles.noSprintBanner}>
                            <p>Dashboard for "{axis}" axis not found. Showing Physical Dashboard.</p>
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
