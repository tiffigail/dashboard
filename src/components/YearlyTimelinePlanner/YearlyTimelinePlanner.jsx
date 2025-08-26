import React, { useState, useEffect } from 'react';
import styles from './YearlyTimelinePlanner.module.css'; // <-- IMPORT a CSS Module

const getAxisColor = (axisId = '') => {
    const colors = {
        'physical': '#ef4444', 'financial': '#8b5cf6', 'gear': '#3b82f6',
        'environment': '#10b981', 'misdirect': '#f97316',
        'rest-and-preparation': '#14b8a6', 'on-track-n+1': '#6b7280',
        'default': '#6b7280'
    };
    return colors[axisId] || colors['default'];
};

const YearlyTimelinePlanner = ({ allAxesData = [], activeAxisId, onNavigate }) => {
    const [currentAxisId, setCurrentAxisId] = useState(activeAxisId);

    useEffect(() => {
        setCurrentAxisId(activeAxisId);
    }, [activeAxisId]);

    const handleAxisChange = (e) => {
        setCurrentAxisId(e.target.value);
    };

    const currentAxisData = allAxesData.find(axis => axis.id === currentAxisId);
    const milestones = currentAxisData?.milestones?.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)) || [];
    const accentColor = getAxisColor(currentAxisData?.id);

    // This is the key change for dynamic styling: we pass a CSS variable to the container.
    const containerStyle = {
        '--accent-color': accentColor
    };

    return (
        <div className={styles.container} style={containerStyle}>
            <div className={styles.header}>
                <h2 className={styles.title}>Yearly Timeline Planner</h2>
                {allAxesData.length > 0 && (
                    <select value={currentAxisId || ''} onChange={handleAxisChange} className={styles.axisSelector}>
                        <option value="" disabled>-- Select an Axis --</option>
                        {allAxesData.map(axis => (
                            <option key={axis.id} value={axis.id}>{axis.axisName}</option>
                        ))}
                    </select>
                )}
            </div>

            <div className={styles.timelineWrapper}>
                {currentAxisData && milestones.length > 0 ? (
                    <div className={styles.timeline}>
                        {milestones.map((milestone, index) => {
                            const isCompleted = !!milestone.completionDate;

                            // Combine class names conditionally
                            const iconClasses = `${styles.milestoneIcon} ${isCompleted ? styles.milestoneIconCompleted : ''}`;
                            const textClasses = `${styles.milestoneText} ${isCompleted ? styles.completedText : ''}`;

                            return (
                                <React.Fragment key={milestone.id}>
                                    <div className={styles.milestoneNode}>
                                        <div className={iconClasses}>{index + 1}</div>
                                        <div className={styles.milestoneDetails}>
                                            <p className={textClasses}>
                                                {milestone.text}
                                            </p>
                                            {milestone.dueDate && (
                                                <p className={styles.milestoneDate}>
                                                    Due: {new Date(milestone.dueDate.seconds * 1000).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {index < milestones.length - 1 && <div className={styles.line}></div>}
                                </React.Fragment>
                            );
                        })}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <p>{currentAxisData ? "No milestones found for this axis." : "Please select an axis to view its timeline."}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default YearlyTimelinePlanner;