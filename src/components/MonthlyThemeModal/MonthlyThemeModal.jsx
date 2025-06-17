// src/components/MonthlyThemeModal/MonthlyThemeModal.jsx
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Modal from '../Modal/Modal';
import styles from './MonthlyThemeModal.module.css';

// This is the correct "Presentational" component. It receives all data via props.
const MonthlyThemeModal = ({ isOpen, onClose, monthId, initialData, onSave }) => {
    
    // Sanity Check Log: This will show us exactly what props are arriving.
    console.log("MODAL RENDERED. Received props:", { isOpen, monthId, initialData });

    const [editableData, setEditableData] = useState({
        monthFocus: '',
        monthObjective: '',
        monthName: '',
        reward: '',
        weeklyData: [],
    });

    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const deriveMonthName = (mId) => {
        if (!mId || !mId.includes('-')) return "Unknown Month";
        try {
            const [year, monthNum] = mId.split('-');
            const date = new Date(Number(year), Number(monthNum) - 1, 1);
            return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        } catch (e) { return "Invalid Month ID"; }
    };

    // This useEffect hook listens for the `initialData` prop from the parent.
    useEffect(() => {
        if (!isOpen) return;

        setError('');
        console.log("MODAL useEffect triggered. Processing initialData:", initialData);

        if (initialData) {
            // If data is provided, populate the form with it.
            const weeklyDataArray = [];
            if (initialData.weeklyData && typeof initialData.weeklyData === 'object') {
                Object.keys(initialData.weeklyData).sort((a, b) => parseInt(a) - parseInt(b)).forEach(weekNum => {
                    weeklyDataArray.push({
                        week: weekNum,
                        ...(initialData.weeklyData[weekNum] || { focus: '', objective: '' })
                    });
                });
            }

            setEditableData({
                monthFocus: initialData.monthFocus || '',
                monthObjective: initialData.monthObjective || '',
                monthName: initialData.monthName || deriveMonthName(monthId),
                reward: initialData.reward || '',
                weeklyData: weeklyDataArray,
            });
        } else {
            // If no data, prepare a blank form.
            setEditableData({
                monthFocus: '',
                monthObjective: '',
                monthName: deriveMonthName(monthId),
                reward: '',
                weeklyData: [{ week: '1', focus: '', objective: '' }, { week: '2', focus: '', objective: '' }, { week: '3', focus: '', objective: '' }, { week: '4', focus: '', objective: '' }],
            });
        }
    }, [isOpen, initialData, monthId]); // Dependency array is correct.

    // --- FORM HANDLERS ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditableData(prev => ({ ...prev, [name]: value }));
    };
    const handleWeeklyDataChange = (index, field, value) => {
        setEditableData(prev => {
            const newWeeklyData = [...prev.weeklyData];
            newWeeklyData[index] = { ...newWeeklyData[index], [field]: value };
            return { ...prev, weeklyData: newWeeklyData };
        });
    };
    
    // --- SAVE HANDLER ---
    const handleInternalSave = async () => {
        if (!onSave) {
            setError("Configuration Error: onSave function is missing.");
            return;
        }
        setIsSaving(true);
        setError('');

        const weeklyDataForFirestore = {};
        editableData.weeklyData.forEach(item => {
            weeklyDataForFirestore[item.week] = { focus: item.focus || '', objective: item.objective || '' };
        });

        const dataToSave = {
            monthFocus: editableData.monthFocus,
            monthObjective: editableData.monthObjective,
            monthName: editableData.monthName,
            reward: editableData.reward,
            weeklyData: weeklyDataForFirestore,
        };

        try {
            await onSave(monthId, dataToSave);
        } catch (err) {
            setError("Failed to save. Please try again.");
            setIsSaving(false);
        }
    };
    
    // --- JSX / RENDER ---
    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit Plan for ${editableData.monthName || monthId}`}>
            <div className={styles.modalContent}>
                {error && <p className={styles.errorMessage}>{error}</p>}
                
                {/* Your Form */}
                <div className={styles.formGroup}><label>Month Name:</label><input name="monthName" value={editableData.monthName || ''} onChange={handleChange} disabled={isSaving}/></div>
                <div className={styles.formGroup}><label>Month Focus:</label><textarea name="monthFocus" value={editableData.monthFocus || ''} onChange={handleChange} disabled={isSaving}/></div>
                <div className={styles.formGroup}><label>Month Objective:</label><textarea name="monthObjective" value={editableData.monthObjective || ''} onChange={handleChange} disabled={isSaving}/></div>
                <div className={styles.formGroup}><label>Reward:</label><input name="reward" value={editableData.reward || ''} onChange={handleChange} disabled={isSaving}/></div>
                
                <h4>Weekly Breakdown:</h4>
                {editableData.weeklyData.map((week, index) => (
                    <div key={week.week || index} className={styles.weekGroup}>
                        <h5>Week {week.week}</h5>
                        <label>Focus:</label><input value={week.focus || ''} onChange={(e) => handleWeeklyDataChange(index, 'focus', e.target.value)} disabled={isSaving}/>
                        <label>Objective:</label><textarea value={week.objective || ''} onChange={(e) => handleWeeklyDataChange(index, 'objective', e.target.value)} disabled={isSaving}/>
                    </div>
                ))}

                <div className={styles.modalActions}>
                    <button onClick={handleInternalSave} className={styles.saveButton} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</button>
                    <button onClick={onClose} className={styles.cancelButton} disabled={isSaving}>Cancel</button>
                </div>
            </div>
        </Modal>
    );
};

MonthlyThemeModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    monthId: PropTypes.string.isRequired,
    initialData: PropTypes.object,
    onSave: PropTypes.func.isRequired,
};

export default MonthlyThemeModal;