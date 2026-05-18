// src/components/MonthlyThemeModal/MonthlyThemeModal.jsx
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Modal from '@/components/ui/Modal/Modal';
import styles from '@/features/planning/MonthlyThemeModal/MonthlyThemeModal.module.css';
import { db } from '@/firebaseConfig';
import { doc, getDoc } from "firebase/firestore";

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// This is the correct "Presentational" component. It receives all data via props.
const MonthlyThemeModal = ({ isOpen, onClose, monthId, initialData, onSave }) => {


    const [editableData, setEditableData] = useState({
        monthFocus: '',
        monthObjective: '',
        selectedMonth: 0,
        selectedYear: new Date().getFullYear(),
        reward: '',
        weeklyData: [],
    });

    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const parseMonthId = (mId) => {
        if (!mId || !mId.includes('-')) return { year: new Date().getFullYear(), month: new Date().getMonth() };
        try {
            const [year, monthNum] = mId.split('-');
            return { year: Number(year), month: Number(monthNum) - 1 };
        } catch (e) {
            return { year: new Date().getFullYear(), month: new Date().getMonth() };
        }
    };

    // This useEffect hook listens for the `initialData` prop from the parent.
    useEffect(() => {
        if (!isOpen) return;

        setError('');

        const { year, month } = parseMonthId(monthId);

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

            // Default to 4 weeks if no weekly data
            if (weeklyDataArray.length === 0) {
                for (let i = 1; i <= 4; i++) {
                    weeklyDataArray.push({ week: String(i), focus: '', objective: '' });
                }
            }

            setEditableData({
                monthFocus: initialData.monthFocus || '',
                monthObjective: initialData.monthObjective || '',
                selectedMonth: month,
                selectedYear: year,
                reward: initialData.reward || '',
                weeklyData: weeklyDataArray,
            });
        } else {
            // If no data, prepare a blank form.
            setEditableData({
                monthFocus: '',
                monthObjective: '',
                selectedMonth: month,
                selectedYear: year,
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

    const handleMonthChange = async (e) => {
        const newMonth = parseInt(e.target.value);
        setEditableData(prev => ({ ...prev, selectedMonth: newMonth }));
        await fetchMonthData(editableData.selectedYear, newMonth);
    };

    const handleYearChange = async (e) => {
        const newYear = parseInt(e.target.value);
        setEditableData(prev => ({ ...prev, selectedYear: newYear }));
        await fetchMonthData(newYear, editableData.selectedMonth);
    };

    const fetchMonthData = async (year, monthIndex) => {
        setIsLoading(true);
        setError('');

        const targetMonthId = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

        try {
            const docRef = doc(db, "monthlyPlans", targetMonthId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                const weeklyDataArray = [];

                if (data.weeklyData && typeof data.weeklyData === 'object') {
                    Object.keys(data.weeklyData).sort((a, b) => parseInt(a) - parseInt(b)).forEach(weekNum => {
                        weeklyDataArray.push({
                            week: weekNum,
                            ...(data.weeklyData[weekNum] || { focus: '', objective: '' })
                        });
                    });
                }

                // Default to 4 weeks if no weekly data
                if (weeklyDataArray.length === 0) {
                    for (let i = 1; i <= 4; i++) {
                        weeklyDataArray.push({ week: String(i), focus: '', objective: '' });
                    }
                }

                setEditableData(prev => ({
                    ...prev,
                    monthFocus: data.monthFocus || '',
                    monthObjective: data.monthObjective || '',
                    reward: data.reward || '',
                    weeklyData: weeklyDataArray,
                    selectedMonth: monthIndex,
                    selectedYear: year
                }));
            } else {
                // No data exists for this month, create blank form
                setEditableData(prev => ({
                    ...prev,
                    monthFocus: '',
                    monthObjective: '',
                    reward: '',
                    weeklyData: [
                        { week: '1', focus: '', objective: '' },
                        { week: '2', focus: '', objective: '' },
                        { week: '3', focus: '', objective: '' },
                        { week: '4', focus: '', objective: '' }
                    ],
                    selectedMonth: monthIndex,
                    selectedYear: year
                }));
            }
        } catch (err) {
            console.error("Error fetching month data:", err);
            setError("Failed to load month data. Please try again.");
        } finally {
            setIsLoading(false);
        }
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

        // Construct the new monthId from selected month and year
        const newMonthId = `${editableData.selectedYear}-${String(editableData.selectedMonth + 1).padStart(2, '0')}`;
        const monthName = `${MONTHS[editableData.selectedMonth]} ${editableData.selectedYear}`;

        const dataToSave = {
            monthFocus: editableData.monthFocus,
            monthObjective: editableData.monthObjective,
            monthName: monthName,
            reward: editableData.reward,
            weeklyData: weeklyDataForFirestore,
        };

        try {
            await onSave(newMonthId, dataToSave);
        } catch (err) {
            setError("Failed to save. Please try again.");
            setIsSaving(false);
        }
    };
    
    // --- JSX / RENDER ---
    if (!isOpen) return null;

    // Generate year options (current year ± 5 years)
    const currentYear = new Date().getFullYear();
    const yearOptions = [];
    for (let y = currentYear - 5; y <= currentYear + 5; y++) {
        yearOptions.push(y);
    }

    const modalTitle = `Edit Plan for ${MONTHS[editableData.selectedMonth]} ${editableData.selectedYear}`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
            <div className={styles.modalContent}>
                {error && <p className={styles.errorMessage}>{error}</p>}

                {/* Month and Year Selection */}
                <div className={styles.dateSelectionRow}>
                    <div className={styles.formGroup}>
                        <label htmlFor="month-select">Month:</label>
                        <select
                            id="month-select"
                            value={editableData.selectedMonth}
                            onChange={handleMonthChange}
                            disabled={isSaving}
                            className={styles.selectField}
                        >
                            {MONTHS.map((monthName, index) => (
                                <option key={index} value={index}>{monthName}</option>
                            ))}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="year-select">Year:</label>
                        <select
                            id="year-select"
                            value={editableData.selectedYear}
                            onChange={handleYearChange}
                            disabled={isSaving}
                            className={styles.selectField}
                        >
                            {yearOptions.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Loading indicator */}
                {isLoading && <p className={styles.loadingMessage}>Loading month data...</p>}

                {/* Monthly Plan Fields */}
                <div className={styles.formGroup}>
                    <label htmlFor="monthFocus">Month Focus:</label>
                    <textarea
                        id="monthFocus"
                        name="monthFocus"
                        value={editableData.monthFocus || ''}
                        onChange={handleChange}
                        disabled={isSaving || isLoading}
                        className={styles.textareaField}
                        placeholder="What is the main focus for this month?"
                    />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="monthObjective">Month Objective:</label>
                    <textarea
                        id="monthObjective"
                        name="monthObjective"
                        value={editableData.monthObjective || ''}
                        onChange={handleChange}
                        disabled={isSaving || isLoading}
                        className={styles.textareaField}
                        placeholder="What do you want to achieve this month?"
                    />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="reward">Reward:</label>
                    <input
                        id="reward"
                        name="reward"
                        value={editableData.reward || ''}
                        onChange={handleChange}
                        disabled={isSaving || isLoading}
                        className={styles.inputField}
                        placeholder="Your reward for completing this month"
                    />
                </div>

                <h4 className={styles.weeklyDataHeader}>Weekly Breakdown</h4>
                {editableData.weeklyData.map((week, index) => (
                    <div key={week.week || index} className={styles.weekGroup}>
                        <h5>Week {week.week}</h5>
                        <div className={styles.formGroup}>
                            <label htmlFor={`week-${index}-focus`}>Focus:</label>
                            <input
                                id={`week-${index}-focus`}
                                value={week.focus || ''}
                                onChange={(e) => handleWeeklyDataChange(index, 'focus', e.target.value)}
                                disabled={isSaving || isLoading}
                                className={styles.inputField}
                                placeholder="Week's focus area"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor={`week-${index}-objective`}>Objective:</label>
                            <textarea
                                id={`week-${index}-objective`}
                                value={week.objective || ''}
                                onChange={(e) => handleWeeklyDataChange(index, 'objective', e.target.value)}
                                disabled={isSaving || isLoading}
                                className={styles.textareaField}
                                rows="2"
                                placeholder="What to accomplish this week"
                            />
                        </div>
                    </div>
                ))}

                <div className={styles.modalActions}>
                    <button onClick={handleInternalSave} className={styles.saveButton} disabled={isSaving || isLoading}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button onClick={onClose} className={styles.cancelButton} disabled={isSaving}>
                        Cancel
                    </button>
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