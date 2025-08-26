// src/components/PrepareModal/PrepareModal.jsx
import React, { useState } from 'react';
import styles from './PrepareModal.module.css'; // The CSS file name also stays the same
import { db } from '../../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Helper functions
const axisNameToCssVarSuffix = (axisName) => {
    if (!axisName || typeof axisName !== 'string') return 'default';
    return axisName.trim().toLowerCase().replace(/\s+/g, '-').replace(/\+/g, '-plus-');
};
const getTodayDateString = () => new Date().toISOString().split('T')[0];
const getCurrentWeekId = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((now.getDay() + 1 + dayOfYear) / 7);
    return `${now.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
};

const recurringPrepTasks = [
    "Refill supplements", "Get gas", "Prepare foods", 
    "Refill AM meds", "5 professional outfits ready"
];

// Props: onClose, weeklyGoals
function PrepareModal({ onClose, weeklyGoals }) {
    // All state and handler logic remains exactly the same as before
    const [checkedItems, setCheckedItems] = useState(() => 
        recurringPrepTasks.reduce((acc, task) => ({ ...acc, [task]: false }), {})
    );
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [isAddingTask, setIsAddingTask] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleCheckboxChange = (event) => {
        const { name, checked } = event.target;
        setCheckedItems(prev => ({ ...prev, [name]: checked }));
    };

    const handleNewTaskChange = (event) => {
        setNewTaskTitle(event.target.value);
    };

    const handleTaskInputKeyDown = (event) => {
        // Check if the key pressed was 'Enter'
        if (event.key === 'Enter') {
            event.preventDefault();
            // Call the same function that the 'Add' button uses
            handleAddTask();
        }
    };

    const handleAddTask = async () => {
        if (!newTaskTitle.trim()) return;
        setIsAddingTask(true);
        setError(null);
        const newTaskData = {
            title: newTaskTitle.trim(), status: "todo", taskType: "ad-hoc",
            createdAt: serverTimestamp(), assignedDate: getTodayDateString(),
            parentID: getCurrentWeekId(), parentType: "weeklyPlan",
            axisTheme: "Rest and preparation", completedAt: null,
        };
        try {
            await addDoc(collection(db, "new_tasks"), newTaskData);
            setNewTaskTitle('');
        } catch (err) {
            setError("Failed to add task.");
        } finally {
            setIsAddingTask(false);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError(null);
        const completedTasks = Object.keys(checkedItems).filter(task => checkedItems[task]);
        const prepLogData = {
            weekId: getCurrentWeekId(),
            completedAt: serverTimestamp(),
            completedTasks: completedTasks,
            completionPercentage: Math.round((completedTasks.length / recurringPrepTasks.length) * 100)
        };
        try {
            await addDoc(collection(db, "weeklyPrepLogs"), prepLogData);
            onClose();
        } catch (err) {
            setError("Failed to save prep log.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.prepareContainer}>
            <h3 className={styles.modalTitle}>Weekly Preparation</h3>

            <div className={styles.section}>
                <h4 className={styles.sectionTitle}>This Week's Goals</h4>
                <ul className={styles.goalList}>
                    {Object.entries(weeklyGoals || {}).map(([category, goal]) => (
                        <li key={category}>
                        <span style={{ color: `var(--axis-color-${axisNameToCssVarSuffix(category)}-3, #e0e0e0)` }}>
                                    <strong>{category}:</strong>
                                </span> {goal.goal}
                        </li>
                    ))}
                </ul>
            </div>
            
            <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Recurring Prep</h4>
                {recurringPrepTasks.map(task => (
                    <div key={task} className={styles.checkItem}>
                        <input type="checkbox" id={`prep-${task.replace(/\s+/g, '-')}`} name={task} checked={checkedItems[task]} onChange={handleCheckboxChange} disabled={isSubmitting} />
                        <label htmlFor={`prep-${task.replace(/\s+/g, '-')}`}>{task}</label>
                    </div>
                ))}
            </div>

            <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Add Prep Tasks</h4>
                <div className={styles.taskEntry}>
                    <input type="text" value={newTaskTitle} onChange={handleNewTaskChange} onKeyDown={handleTaskInputKeyDown} placeholder="e.g., 'Iron shirts for the week'" className={styles.textInput} disabled={isAddingTask} />
                    <button onClick={handleAddTask} disabled={isAddingTask || !newTaskTitle.trim()}>
                        {isAddingTask ? 'Adding...' : 'Add'}
                    </button>
                </div>
            </div>

            {error && <p className={styles.errorText}>{error}</p>}
            <button className={styles.submitButton} onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Complete Preparation'}
            </button>
        </div>
    );
}

export default PrepareModal;