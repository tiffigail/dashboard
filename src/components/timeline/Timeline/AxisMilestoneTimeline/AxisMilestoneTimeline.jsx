// src/components/Timeline/AxisMilestoneTimeline/AxisMilestoneTimeline.jsx
import React from 'react';
import styles from '@/components/timeline/Timeline/AxisMilestoneTimeline/AxisMilestoneTimeline.module.css';

const AxisMilestoneTimeline = ({ milestone, isOpen, onClose, accentColor }) => {
    // If the modal is not open or there's no milestone data, render nothing.
    if (!isOpen || !milestone) {
        return null;
    }

    // Set the accent color as a CSS variable for styling.
    const modalStyle = {
        '--accent-color': accentColor || '#6b7280'
    };

    return (
        <div 
            className={`${styles.modalOverlay} ${isOpen ? styles.open : ''}`} 
            onClick={onClose}
        >
            <div 
                className={styles.modalContent} 
                style={modalStyle}
                onClick={(e) => e.stopPropagation()} // Prevents closing when clicking inside content
            >
                <button className={styles.closeButton} onClick={onClose}>
                    &times;
                </button>
                <div className={styles.header}>
                    <h2 className={styles.title}>{milestone.text}</h2>
                    <p className={styles.subtitle}>Detailed View & Task Planning</p>
                </div>
                <div className={styles.body}>
                    {/* This is where we will build the detailed view with weekly plans,
                        tasks, and drag-and-drop functionality in the next steps.
                    */}
                    <p>Placeholder for weekly plans and tasks for this milestone.</p>
                </div>
            </div>
        </div>
    );
};

export default AxisMilestoneTimeline;
