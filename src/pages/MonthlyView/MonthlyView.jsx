// src/components/MonthlyView/MonthlyView.jsx (IMPROVED VERSION)
import React, { useState, useEffect, useCallback } from 'react';
import styles from '@/pages/MonthlyView/MonthlyView.module.css';
import { db } from '@/firebaseConfig';
import {
    doc, getDoc, setDoc, collection, getDocs, updateDoc, arrayUnion, serverTimestamp, deleteDoc, addDoc
} from "firebase/firestore";

// --- Imports for Integrated Features ---
import * as kanbanService from '@/services/kanbanServices';
import KanbanBoard from '@/features/planning/KanbanBoard/KanbanBoard';
import MonthlyThemeModal from '@/features/planning/MonthlyThemeModal/MonthlyThemeModal.jsx';
import SprintEditModal from '@/pages/MonthlyView/SprintEditModal';
import { getPrimaryActiveSprint, getProjectIdFromSprint } from '@/services/sprintService';

// --- Helper Functions ---
function getMonthNameAndYear(date = new Date()) {
    const options = { month: 'long', year: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}

function getCalendarGrid(year, month) {
    const firstDayOfMonth = new Date(year, month, 1);
    const startingDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid = [];
    let currentDay = 1;
    let week = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
        week.push(null);
    }
    while (currentDay <= daysInMonth) {
        week.push(currentDay);
        if (week.length === 7) {
            grid.push(week);
            week = [];
        }
        currentDay++;
    }
    if (week.length > 0) {
        while (week.length < 7) {
            week.push(null);
        }
        grid.push(week);
    }
    return grid;
}

import { getTodayDateString, formatDateString } from '@/utils/dateUtils';

const axisColorMap = {
    "Physical": { light: '#FDC1B4', medium: '#f59284', dark: '#e7514c' },
    "Financial": { light: '#e9def4', medium: '#beaccf', dark: '#927aaa' },
    "Gear": { light: '#c9ebf4', medium: '#7ebde0', dark: '#3280a7' },
    "On Track N+1": { light: '#BCDDDC', medium: '#618882', dark: '#053229' },
    "Environment": { light: '#efe5c3', medium: '#e3d295', dark: '#d8bf67' },
    "Misdirect": { light: '#b0e8d7', medium: '#78bfa1', dark: '#409c7c' },
    "Rest and preparation": { light: '#eaf1fa', medium: '#cbdbe7', dark: '#aec6de' },
};
// --- End Helper Functions ---

function MonthlyView({ onNavigate }) {
    // State for Monthly View
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [monthData, setMonthData] = useState(null);
    const [calendarGrid, setCalendarGrid] = useState([]);
    const [currentMonthName, setCurrentMonthName] = useState("");
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [currentMonthIndex, setCurrentMonthIndex] = useState(new Date().getMonth());
    const [isMonthlyThemeModalOpen, setIsMonthlyThemeModalOpen] = useState(false);
    const [editingMonthId, setEditingMonthId] = useState('');
    const [currentPlanDataForModal, setCurrentPlanDataForModal] = useState(null);
    const [availableAxes, setAvailableAxes] = useState([]); 

    // KANBAN & PROJECTS STATE
    const [selectedAxis, setSelectedAxis] = useState('');
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectVision, setNewProjectVision] = useState('');
    const [isLoadingProjects, setIsLoadingProjects] = useState(false);
    const [isCreatingProject, setIsCreatingProject] = useState(false);
    const [isProjectFormVisible, setIsProjectFormVisible] = useState(false);
    const [activeGoalId, setActiveGoalId] = useState('');
    const [sprintStartDate, setSprintStartDate] = useState(getTodayDateString());
    const [sprintDuration, setSprintDuration] = useState('14');
    const [editingSprint, setEditingSprint] = useState(null);
    const [activeSprint, setActiveSprint] = useState(null);
    const [carryoverSprints, setCarryoverSprints] = useState([]);
    const selectedProject = projects.find(p => p.id === selectedProjectId);

    // --- Effects ---
    useEffect(() => {
        const fetchAxes = async () => {
            try {
                const [querySnapshot, sprint] = await Promise.all([
                    getDocs(collection(db, "new_axes")),
                    getPrimaryActiveSprint()
                ]);
                const axesList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().axisName
                })).filter(axis => axis.name);
                axesList.sort((a, b) => a.name.localeCompare(b.name));
                setAvailableAxes(axesList);

                if (sprint && sprint.axis) {
                    setSelectedAxis(sprint.axis);
                    setActiveSprint(sprint);
                } else if (axesList.length > 0) {
                    setSelectedAxis(axesList.find(a => a.name === 'Physical')?.name || axesList[0].name);
                }
            } catch (error) {
                console.error("MonthlyView: Error fetching axes:", error);
                setError("Failed to load axes options.");
            }
        };
        fetchAxes();
    }, []);

    const fetchMonthlyData = useCallback(async (yearToFetch, monthIndexToFetch) => {
        setIsLoading(true);
        setError(null);
        const targetDate = new Date(yearToFetch, monthIndexToFetch, 1);
        const monthId = `${yearToFetch}-${String(monthIndexToFetch + 1).padStart(2, '0')}`;
        setCurrentYear(yearToFetch);
        setCurrentMonthIndex(monthIndexToFetch);
        setCurrentMonthName(getMonthNameAndYear(targetDate));
        setCalendarGrid(getCalendarGrid(yearToFetch, monthIndexToFetch));
        setEditingMonthId(monthId);
        try {
            const docRef = doc(db, "monthlyPlans", monthId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setMonthData(data);
                setCurrentPlanDataForModal(data);
            } else {
                setMonthData(null);
                setCurrentPlanDataForModal(null);
            }

            // Fetch the 2 previous months in parallel to find sprints that carry over
            const firstOfMonth = `${yearToFetch}-${String(monthIndexToFetch + 1).padStart(2, '0')}-01`;
            const prevDates = [1, 2].map(i => new Date(yearToFetch, monthIndexToFetch - i, 1));
            const prevMonthIds = prevDates.map(d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
            const [prevSnap1, prevSnap2] = await Promise.all(
                prevMonthIds.map(id => getDoc(doc(db, "monthlyPlans", id)))
            );
            const carryover = [];
            for (const prevSnap of [prevSnap1, prevSnap2]) {
                if (prevSnap.exists()) {
                    const prevSprints = (prevSnap.data().events || []).filter(
                        e => e.type === 'sprint' && e.endDate >= firstOfMonth
                    );
                    carryover.push(...prevSprints);
                }
            }
            setCarryoverSprints(carryover);
        } catch (err) {
            console.error("Error fetching monthly data:", err);
            setError("Failed to load monthly data.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const today = new Date();
        fetchMonthlyData(today.getFullYear(), today.getMonth());
    }, [fetchMonthlyData]);

    // KANBAN & PROJECTS EFFECTS
    useEffect(() => {
        if (!selectedAxis) return;

        const fetchProjectsData = async () => {
            setIsLoadingProjects(true);
            let fetchedProjects = [];

            if (selectedAxis === 'Completed Projects') {
                fetchedProjects = await kanbanService.getAllCompletedProjects();
                setActiveGoalId('');
            } else {
                fetchedProjects = await kanbanService.getProjectsForAxis(selectedAxis);
                
                const currentYearValue = new Date().getFullYear();
                const goal = await kanbanService.getActiveYearlyGoal(selectedAxis, currentYearValue);
                setActiveGoalId(goal ? goal.goalId : '');
            }
            
            setProjects(fetchedProjects);

            // Auto-select active sprint project if it matches this axis
            if (activeSprint && activeSprint.axis === selectedAxis) {
                const sprintProjectId = await getProjectIdFromSprint(activeSprint);
                if (sprintProjectId && fetchedProjects.some(p => p.id === sprintProjectId)) {
                    setSelectedProjectId(sprintProjectId);
                    setIsLoadingProjects(false);
                    return;
                }
            }

            // Otherwise use last selected or first project
            const lastProjectId = localStorage.getItem(`lastProject_${selectedAxis}`);
            if (lastProjectId && fetchedProjects.some(p => p.id === lastProjectId)) {
                setSelectedProjectId(lastProjectId);
            } else if (fetchedProjects.length > 0) {
                setSelectedProjectId(fetchedProjects[0].id);
            } else {
                setSelectedProjectId('');
            }
            setIsLoadingProjects(false);
        };

        fetchProjectsData();
    }, [selectedAxis, activeSprint]);

    useEffect(() => {
        if (selectedProjectId && selectedAxis) {
            localStorage.setItem(`lastProject_${selectedAxis}`, selectedProjectId);
        }
    }, [selectedProjectId, selectedAxis]);

    // --- Handlers ---
    const handleOpenMonthlyThemeModal = () => {
        const monthId = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;
        setCurrentPlanDataForModal(monthData || {
            monthFocus: '', monthObjective: '', reward: '', weeklyData: {}, monthName: getMonthNameAndYear(new Date(currentYear, currentMonthIndex))
        });
        setEditingMonthId(monthId);
        setIsMonthlyThemeModalOpen(true);
    };

    const handleCloseMonthlyThemeModal = () => setIsMonthlyThemeModalOpen(false);

    const handleSaveMonthlyPlan = async (monthDocId, dataToSave) => {
        setIsSaving(true);
        const planDocRef = doc(db, "monthlyPlans", monthDocId);
        try {
            const dataForFirestore = { ...dataToSave, monthId: monthDocId, lastUpdated: serverTimestamp() };
            if (!monthData?.createdAt) {
                dataForFirestore.createdAt = serverTimestamp();
            }
            await setDoc(planDocRef, dataForFirestore, { merge: true });
            const updatedData = { ...(monthData || {}), ...dataForFirestore };
            setMonthData(updatedData);
            setCurrentPlanDataForModal(updatedData);

            // Create end-of-month reward task if reward is set
            if (dataToSave.reward && dataToSave.reward.trim()) {
                await createMonthEndRewardTask(monthDocId, dataToSave.monthName, dataToSave.reward);
            }

            setIsMonthlyThemeModalOpen(false);
        } catch (error) {
            console.error("Error saving monthly plan:", error);
            setError("Failed to save monthly plan.");
        } finally {
            setIsSaving(false);
        }
    };

    const createMonthEndRewardTask = async (monthId, monthName, rewardText) => {
        try {
            // Parse monthId to get year and month (format: YYYY-MM)
            const [year, month] = monthId.split('-').map(Number);

            // Get the last day of the month
            const lastDay = new Date(year, month, 0).getDate();
            const lastDayDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

            // Check if a reward task already exists for this month
            const tasksCollectionRef = collection(db, "new_tasks");
            const existingTasksQuery = await getDocs(tasksCollectionRef);
            const rewardTaskExists = existingTasksQuery.docs.some(doc => {
                const data = doc.data();
                return data.title && data.title.includes(`${monthName} reward:`) && data.assignedDate === lastDayDate;
            });

            if (rewardTaskExists) {
                return;
            }

            // Create the reward task with matching NowView data structure
            const rewardTaskData = {
                title: `Congratulations, ${monthName} reward: ${rewardText}`,
                axisTheme: 'On Track N+1',
                parentId: monthId,
                parentType: 'monthlyPlan',
                taskType: 'reward',
                status: 'todo',
                createdAt: serverTimestamp(),
                completedAt: null,
                assignedDate: lastDayDate,
            };

            await addDoc(tasksCollectionRef, rewardTaskData);
        } catch (error) {
            console.error("Error creating month-end reward task:", error);
            // Don't throw error - this is not critical enough to fail the whole save
        }
    };
    
    const goToPreviousMonth = () => {
        let newMonth = currentMonthIndex - 1, newYear = currentYear;
        if (newMonth < 0) { newMonth = 11; newYear--; }
        fetchMonthlyData(newYear, newMonth);
    };

    const goToNextMonth = () => {
        let newMonth = currentMonthIndex + 1, newYear = currentYear;
        if (newMonth > 11) { newMonth = 0; newYear++; }
        fetchMonthlyData(newYear, newMonth);
    };

    const handleCreateProject = async () => {
        if (!newProjectName.trim() || isCreatingProject) return;
        setIsCreatingProject(true);
        try {
            const newProject = await kanbanService.createProject(newProjectName, selectedAxis, newProjectVision);
            setProjects(prev => [...prev, newProject]);
            setSelectedProjectId(newProject.id);
            setNewProjectName('');
            setNewProjectVision('');
            setIsProjectFormVisible(false);
        } catch (error) {
            console.error("Error creating project:", error);
            alert("Failed to create project.");
        } finally {
            setIsCreatingProject(false);
        }
    };
    
    const handleMarkProjectComplete = async () => {
        if (!selectedProjectId || !selectedProject) return;
        
        const confirmComplete = window.confirm(
            `Mark "${selectedProject.projectName}" as complete? This will move it to Completed Projects.`
        );
        
        if (!confirmComplete) return;
        
        try {
            await kanbanService.markProjectComplete(selectedProjectId);
            
            // Remove from current projects list
            setProjects(prev => prev.filter(p => p.id !== selectedProjectId));
            
            // Select next available project or clear selection
            const remainingProjects = projects.filter(p => p.id !== selectedProjectId);
            if (remainingProjects.length > 0) {
                setSelectedProjectId(remainingProjects[0].id);
            } else {
                setSelectedProjectId('');
            }
            
            alert(`"${selectedProject.projectName}" marked as complete!`);
        } catch (error) {
            console.error("Error marking project complete:", error);
            alert("Failed to mark project complete. Please try again.");
        }
    };
    
    const handleDeleteProject = async () => {
        if (!selectedProjectId || !selectedProject) return;
        
        const confirmDelete = window.confirm(
            `Delete "${selectedProject.projectName}"? This will permanently remove the project and all its tasks. This cannot be undone.`
        );
        
        if (!confirmDelete) return;
        
        try {
            // Delete all kanban cards for this project
            const cards = await kanbanService.getKanbanCards(selectedProjectId);
            const deletePromises = cards.map(card => 
                kanbanService.deleteKanbanCard(card.id)
            );
            await Promise.all(deletePromises);
            
            // Delete the project document
            const projectRef = doc(db, "projects", selectedProjectId);
            await deleteDoc(projectRef);
            
            // Remove from projects list
            setProjects(prev => prev.filter(p => p.id !== selectedProjectId));
            
            // Select next available project or clear selection
            const remainingProjects = projects.filter(p => p.id !== selectedProjectId);
            if (remainingProjects.length > 0) {
                setSelectedProjectId(remainingProjects[0].id);
            } else {
                setSelectedProjectId('');
            }
            
            alert(`"${selectedProject.projectName}" deleted successfully.`);
        } catch (error) {
            console.error("Error deleting project:", error);
            alert("Failed to delete project. Please try again.");
        }
    };
    
    const handleScheduleSprint = async () => {
        if (!selectedProjectId || !sprintStartDate || !sprintDuration) {
            alert("Please select a project, start date, and duration.");
            return;
        }
        
        const durationDays = parseInt(sprintDuration, 10);
        const startDate = new Date(sprintStartDate + 'T00:00:00');
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + durationDays - 1);

        const newSprintEvent = {
            type: 'sprint',
            startDate: sprintStartDate,
            endDate: endDate.toISOString().split('T')[0],
            text: `Sprint: ${selectedProject.projectName}`,
            axis: selectedAxis,
        };

        const monthIdForEvent = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;
        const docRef = doc(db, "monthlyPlans", monthIdForEvent);

        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                await updateDoc(docRef, { events: arrayUnion(newSprintEvent) });
            } else {
                await setDoc(docRef, { events: [newSprintEvent] }, { merge: true });
            }
            setMonthData(prevData => ({
                ...prevData,
                events: [...(prevData?.events || []), newSprintEvent]
            }));
            
            alert(`Sprint for "${selectedProject.projectName}" scheduled successfully!`);
        } catch (error) {
            console.error("Error scheduling sprint:", error);
            alert("Failed to schedule sprint. Please try again.");
        }
    };

    const handleUpdateSprint = async (sprintToUpdate, newSchedule) => {
        if (!newSchedule.newStartDate || !newSchedule.newDuration) {
            alert("Please select a start date and duration.");
            return;
        }

        const monthId = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;
        const docRef = doc(db, "monthlyPlans", monthId);

        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const eventsArray = docSnap.data().events || [];
                const sprintIndex = eventsArray.findIndex(e =>
                    e.type === 'sprint' && e.startDate === sprintToUpdate.startDate && e.text === sprintToUpdate.text
                );

                if (sprintIndex > -1) {
                    const newStartDate = newSchedule.newStartDate;
                    const durationDays = parseInt(newSchedule.newDuration, 10);
                    const startDate = new Date(newStartDate + 'T00:00:00');
                    const endDate = new Date(startDate);
                    endDate.setDate(startDate.getDate() + durationDays - 1);

                    const updatedEvent = {
                        ...eventsArray[sprintIndex],
                        startDate: newStartDate,
                        endDate: endDate.toISOString().split('T')[0],
                    };
                    eventsArray[sprintIndex] = updatedEvent;
                    await updateDoc(docRef, { events: eventsArray });

                    setMonthData(prevData => {
                        const newEvents = (prevData?.events || []).map(e =>
                            e.type === 'sprint' && e.startDate === sprintToUpdate.startDate && e.text === sprintToUpdate.text
                                ? updatedEvent
                                : e
                        );
                        return { ...prevData, events: newEvents };
                    });
                }
            }
        } catch (error) {
            console.error("Error updating sprint:", error);
            alert("Failed to update sprint. Please try again.");
        }
    };

    const handleDeleteSprint = async (sprintToDelete) => {
        const monthId = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;
        const docRef = doc(db, "monthlyPlans", monthId);

        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const eventsArray = docSnap.data().events || [];
                const newEventsArray = eventsArray.filter(e => !(e.type === 'sprint' && e.startDate === sprintToDelete.startDate && e.text === sprintToDelete.text));
                await updateDoc(docRef, { events: newEventsArray });
                
                setMonthData(prevData => ({ ...prevData, events: newEventsArray }));
            }
        } catch (error) {
            console.error("Error deleting sprint:", error);
            alert("Failed to delete sprint. Please try again.");
        }
    };
    
    const { monthFocus, monthObjective, events = [], weeklyData = {} } = monthData || {};
    const getEventsForDate = (dateString) => (events).filter(event => event.type !== 'sprint' && event.date === dateString);

    return (
        <div className={styles.monthlyViewContainer}>
            {isLoading ? ( <p>Loading monthly data...</p> ) : 
             error && !monthData ? ( <p className={styles.errorText}>{error}</p> ) : (
                <>
                    <div className={styles.headerSection}>
                        <div className={styles.headerLeft}>
                            <button onClick={goToPreviousMonth} className={styles.navButton}>&lt;</button>
                            <h2 className={styles.monthNameTitle}>{currentMonthName}</h2>
                            <button onClick={goToNextMonth} className={styles.navButton}>&gt;</button>
                        </div>
                        <div className={styles.headerCenter}>
                             <h1 className={styles.monthFocusDisplay}>{monthFocus || "Not Set"}</h1>
                             <p className={styles.monthObjectiveDisplay}>Objective: {monthObjective || "Not Set"}</p>
                        </div>
                        <div className={styles.headerRight}>
                             <button onClick={handleOpenMonthlyThemeModal} className={styles.editMonthPlanButton} disabled={isSaving}>Edit Monthly Plan</button>
                        </div>
                    </div>

                    {error && monthData && <p className={styles.errorText}>{error}</p>}

                    <div className={styles.layoutContainer}>
                        <div className={styles.mainContent}>
                            <div className={styles.calendarSection}>
                                <table className={styles.calendarTable}>
                                    <thead><tr><th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th></tr></thead>
                                    <tbody>
                                        {calendarGrid.map((week, weekIndex) => (
                                            <React.Fragment key={`week-group-${weekIndex}`}>
                                                <tr className={styles.calendarWeekRow}>
                                                    {week.map((day, dayIndex) => {
                                                        if (day === null) return <td key={`empty-${weekIndex}-${dayIndex}`} className={styles.calendarEmptyCell}></td>;
                                                        const dateString = formatDateString(currentYear, currentMonthIndex, day);
                                                        const dayEvents = getEventsForDate(dateString);
                                                        const sprintsToday = [...events.filter(e => e.type === 'sprint'), ...carryoverSprints].filter(e => dateString >= e.startDate && dateString <= e.endDate);
                                                        return (
                                                            <td key={`day-${weekIndex}-${dayIndex}`} className={`${styles.calendarDayCell} ${getTodayDateString() === dateString ? styles.todayCell : ''}`}>
                                                                <div className={styles.dayNumber}>{day}</div>
                                                                <div className={styles.dayContent}>
                                                                    {dayEvents.length > 0 && (<ul className={styles.dayEventsList}>{dayEvents.map((event, eventIndex) => (<li key={eventIndex} title={`Axis: ${event.axis}`}>{event.text}</li>))}</ul>)}
                                                                </div>
                                                                <div className={styles.sprintLanes}>
                                                                    {sprintsToday.map((sprint, index) => {
                                                                        const sprintColor = axisColorMap[sprint.axis]?.medium || '#cccccc';
                                                                        const isStart = sprint.startDate === dateString || dayIndex === 0;
                                                                        const isEnd = sprint.endDate === dateString || dayIndex === 6;
                                                                        const bandClass = `${styles.sprintBand} ${isStart ? styles.sprintStart : ''} ${isEnd ? styles.sprintEnd : ''}`;
                                                                        return <div key={index} className={bandClass} style={{top: `${index * 20}px`, backgroundColor: sprintColor}} onClick={() => setEditingSprint(sprint)}>{isStart && sprint.text}</div>
                                                                    })}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                                <tr className={styles.weekInfoRow}><td colSpan="7" className={styles.weekInfoDataCell}><div className={styles.weekInfoContent}><span className={styles.weekFocus}><strong>Focus:</strong> {weeklyData?.[String(weekIndex + 1)]?.focus || <i className={styles.notSet}>N/A</i>}</span><span className={styles.weekObjective}><strong>Objective:</strong> {weeklyData?.[String(weekIndex + 1)]?.objective || <i className={styles.notSet}>N/A</i>}</span></div></td></tr>
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <div className={styles.sidebar}>
                            <div className={styles.kanbanControlsSection}>
                                <h3 className={styles.sidebarTitle}>Project Controls</h3>
                                
                                <div className={styles.sidebarControlGroup}>
                                    <label htmlFor="axis-select" className={styles.label}>Axis:</label>
                                    <select id="axis-select" value={selectedAxis} onChange={(e) => setSelectedAxis(e.target.value)} className={styles.select}>
                                        {availableAxes.map(axis => (<option key={axis.id} value={axis.name}>{axis.name}</option>))}
                                        <option key="completed-separator" disabled>──────────</option>
                                        <option key="completed-projects" value="Completed Projects">Completed Projects</option>
                                    </select>
                                </div>
                                
                                <div className={styles.sidebarControlGroup}>
                                    <label htmlFor="project-select" className={styles.label}>Project:</label>
                                    <select id="project-select" value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className={styles.select} disabled={isLoadingProjects || projects.length === 0}>
                                        {isLoadingProjects && <option>Loading...</option>}
                                        {!isLoadingProjects && projects.length === 0 && <option>No projects yet</option>}
                                        {projects.map(proj => (<option key={proj.id} value={proj.id}>{proj.projectName}</option>))}
                                    </select>
                                </div>
                                
                                <div className={styles.sprintScheduleSection}>
                                    <h4 className={styles.subsectionTitle}>Schedule Sprint</h4>
                                    <div className={styles.sidebarControlGroup}>
                                        <label htmlFor="sprint-start" className={styles.label}>Start Date:</label>
                                        <input type="date" id="sprint-start" value={sprintStartDate} onChange={e => setSprintStartDate(e.target.value)} className={styles.input} />
                                    </div>
                                    <div className={styles.sidebarControlGroup}>
                                        <label htmlFor="sprint-duration" className={styles.label}>Duration:</label>
                                        <select id="sprint-duration" value={sprintDuration} onChange={e => setSprintDuration(e.target.value)} className={styles.select}>
                                            <option value="7">1 Week</option>
                                            <option value="14">2 Weeks</option>
                                            <option value="21">3 Weeks</option>
                                            <option value="30">1 Month</option>
                                        </select>
                                    </div>
                                    <button onClick={handleScheduleSprint} className={styles.button} disabled={!selectedProjectId}>Schedule Sprint</button>
                                </div>
                                
                                <div className={styles.projectActionsSection}>
                                    <h4 className={styles.subsectionTitle}>Actions</h4>
                                    <button onClick={() => setIsProjectFormVisible(prev => !prev)} className={styles.toggleButton}>
                                        {isProjectFormVisible ? 'Cancel' : '+ New Project'}
                                    </button>
                                    {selectedProjectId && selectedAxis !== 'Completed Projects' && (
                                        <>
                                            <button onClick={handleMarkProjectComplete} className={styles.completeButton}>
                                                ✓ Mark Complete
                                            </button>
                                            <button onClick={handleDeleteProject} className={styles.deleteButton}>
                                                🗑️ Delete Project
                                            </button>
                                        </>
                                    )}
                                </div>
                                
                                <div className={`${styles.createProjectForm} ${isProjectFormVisible ? styles.isOpen : ''}`}>
                                    <div className={styles.sidebarControlGroup}>
                                        <label htmlFor="new-project" className={styles.label}>Project Name:</label>
                                        <input type="text" id="new-project" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} className={styles.input} placeholder="e.g., Scrum Certification" />
                                    </div>
                                    <div className={styles.sidebarControlGroup}>
                                        <label htmlFor="new-vision" className={styles.label}>Vision:</label>
                                        <textarea id="new-vision" value={newProjectVision} onChange={e => setNewProjectVision(e.target.value)} className={styles.textarea} placeholder="Long-term objective..." rows="3" />
                                    </div>
                                    <button onClick={handleCreateProject} className={styles.button} disabled={isCreatingProject}>
                                        {isCreatingProject ? 'Creating...' : 'Create Project'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className={styles.kanbanBoardSection}>
                        <h2 className={styles.sectionTitle}>Kanban Board: {selectedProject?.projectName || 'Select a project'}</h2>
                        <KanbanBoard
                            key={selectedProjectId}
                            axisId={selectedAxis}
                            project={selectedProject}
                            goalId={activeGoalId}
                        />
                    </div>
                </>
            )}

            {isMonthlyThemeModalOpen && (
                <MonthlyThemeModal
                    isOpen={isMonthlyThemeModalOpen}
                    onClose={handleCloseMonthlyThemeModal}
                    monthId={editingMonthId}
                    initialData={currentPlanDataForModal}
                    onSave={handleSaveMonthlyPlan}
                />
            )}
            
            {editingSprint && (
                <SprintEditModal 
                    sprint={editingSprint}
                    onClose={() => setEditingSprint(null)}
                    onUpdate={handleUpdateSprint}
                    onDelete={handleDeleteSprint}
                />
            )}
        </div>
    );
}

export default MonthlyView;