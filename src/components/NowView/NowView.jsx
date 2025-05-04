// src/components/NowView/NowView.jsx
import React, { useState, useEffect, useRef } from 'react';
import styles from './NowView.module.css';
import { db } from '../../firebaseConfig';
import ContextMap from '../ContextMap/ContextMap';
import Modal from '../Modal/Modal';
import BreakReviewForm from '../BreakReviewForm/BreakReviewForm';
import StudyFlashcardsModal from '../StudyFlashcardsModal/StudyFlashcardsModal'; // Import Flashcard Modal
import DearAbiMarquee from '../DearAbiMarquee/DearAbiMarquee'; // Import Marquee
import {
    collection, doc, addDoc, setDoc, getDocs, getDoc, query, where,
    updateDoc, writeBatch, increment, serverTimestamp, Timestamp
} from "firebase/firestore";

// --- Definitions ---
const recurringRoutineDefinitions = {
    'routine_am': { text: "Am Routine", axisTheme: "ON TRACK N+1", assignedDays: [0, 1, 2, 3, 4, 5, 6] },
    'routine_pm': { text: "Pm Routine", axisTheme: "ON TRACK N+1", assignedDays: [0, 1, 2, 3, 4, 5, 6] },
    'routine_famclean': { text: "Family Clean", axisTheme: "Environment", assignedDays: [0, 1, 2, 3, 4, 5, 6] },
    'routine_budget': { text: "Budget", axisTheme: "Financial", assignedDays: [2] },
    'routine_prepare': { text: "Prepare", axisTheme: "Rest and preparation", assignedDays: [0] },
    'routine_study': { text: "Study", axisTheme: "Gear", assignedDays: [0, 1, 2, 3, 4, 5, 6] },
    'routine_exercise': { text: "Exercise", axisTheme: "Physical", assignedDays: [0, 1, 2, 3, 4, 5, 6] },
    'routine_ready': { text: "Ready For Work", axisTheme: "Financial", assignedDays: [1, 2, 3, 4, 5] }
};
const breakIdeas = [ "Stretch for 5 minutes", "Walk around the block", "Get some water", "Listen to one song", "Doodle for 5 minutes (on paper!)", "Step outside for fresh air", "Quick tidy-up (1 area)", "Meditate for 5 minutes", "Read a non-work article", ];
const TASK_ORDER_LS_KEY = 'nowViewTaskOrder';

// --- Helpers ---
function getWeekId(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const getYesterdayDateString = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const getTodayDayIndex = () => new Date().getDay();
const axisNameToCssVarSuffix = (axisName) => {
    if (!axisName || typeof axisName !== 'string') return 'default';
    return axisName.trim().toLowerCase().replace(/\s+/g, '-').replace(/\+/g, '-plus-');
};

// --- NowView Component ---
function NowView({
    currentTaskId, onSetCurrentTask, pomodoroDurationMinutes, timerSeconds,
    isTimerRunning, isTimerFinished,
    onSetPomodoroDurationMinutes, onSetTimerSeconds, onSetIsTimerRunning, onSetIsTimerFinished
}) {
    // == State ==
    const [tasks, setTasks] = useState([]);
    const [epiphanyCount, setEpiphanyCount] = useState(0);
    const [despairCount, setDespairCount] = useState(0);
    const [productivityScore, setProductivityScore] = useState(0);
    const [journalText, setJournalText] = useState('');
    const [isSavingMoments, setIsSavingMoments] = useState(false);
    const [isSavingJournal, setIsSavingJournal] = useState(false);
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    const [isSavingTask, setIsSavingTask] = useState(false);
    const [adHocTaskText, setAdHocTaskText] = useState('');
    const [selectedAxisTheme, setSelectedAxisTheme] = useState('Rest and preparation');
    const [availableAxes, setAvailableAxes] = useState([]);
    const [isSavingAdHoc, setIsSavingAdHoc] = useState(false);
    const previousTaskCount = useRef(0);
    const [epiphanyDetail, setEpiphanyDetail] = useState('');
    const [despairDetail, setDespairDetail] = useState('');
    const [isSavingDetail, setIsSavingDetail] = useState(false);
    const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);
    const [currentBreakIdea, setCurrentBreakIdea] = useState('');
    const [timerFinishedAt, setTimerFinishedAt] = useState(null);
    const [isFlashcardModalOpen, setIsFlashcardModalOpen] = useState(false);
    const [currentMonthTheme, setCurrentMonthTheme] = useState(null);
    // <<< ADDED: State to track which task's date is being saved >>>
    const [savingDateTaskId, setSavingDateTaskId] = useState(null);


    // == Refs ==
    const isProcessingRollover = useRef(false);
    const tasksCollectionRef = collection(db, "weeklySteps");
    const dragItem = useRef(null);
    const dragOverItem = useRef(null);
    const adHocInputRef = useRef(null);
    const isInitialLoad = useRef(true);

    // == Effects ==

    // Effect 1: Fetch Axes
    useEffect(() => {
        const fetchAxes = async () => {
            console.log("NowView: Fetching axes...");
            try {
                const axesCollectionRef = collection(db, "axes");
                const querySnapshot = await getDocs(axesCollectionRef);
                const axesList = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.axisName) { axesList.push({ id: doc.id, name: data.axisName }); }
                    else { console.warn(`NowView: Axes doc ${doc.id} missing axisName`); }
                });
                axesList.sort((a, b) => a.name.localeCompare(b.name));
                const filteredAxesList = axesList.filter(axis => axis.name !== "Prepare");
                setAvailableAxes(filteredAxesList);
                if (!filteredAxesList.some(axis => axis.name === 'Rest and preparation')) {
                    console.warn("NowView: Default axis 'Rest and preparation' not found. Resetting selection.");
                    setSelectedAxisTheme('');
                }
                console.log("NowView: Axes fetched successfully.");
            } catch (error) { console.error("NowView: Error fetching axes:", error); }
        };
        fetchAxes();
    }, []);

    // Effect to fetch current month's theme (Optional)
    useEffect(() => {
        const fetchMonthTheme = async () => {
            const today = new Date();
            const monthId = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            try {
                const monthDocRef = doc(db, "monthlyPlans", monthId);
                const monthSnap = await getDoc(monthDocRef);
                if (monthSnap.exists()) {
                    setCurrentMonthTheme(monthSnap.data().monthFocus);
                    console.log("NowView: Fetched month theme:", monthSnap.data().monthFocus);
                } else {
                    console.log("NowView: No monthly plan found for theme fetching.");
                    setCurrentMonthTheme(null);
                }
            } catch (error) {
                console.error("NowView: Error fetching month theme:", error);
                setCurrentMonthTheme(null);
            }
        };
        fetchMonthTheme();
    }, []);

    // Effect 2: Calculate & Save Productivity Score
    useEffect(() => {
        const saveProductivityScore = async (score) => {
            const today = getTodayDateString();
            const docRef = doc(db, "dailyMetrics", today);
            const dataToSave = { productivityScore: score, lastUpdated: serverTimestamp() };
            try {
                await setDoc(docRef, dataToSave, { merge: true });
                // console.log(`NowView: Productivity score (${score}) saved for ${today}.`);
            } catch (error) { console.error("NowView: Error saving productivity score:", error); }
        };

        // Calculate score based on tasks actually assigned to today
        const todayDateStr = getTodayDateString();
        if (!isLoadingTasks && Array.isArray(tasks)) {
             const completedTodayTasks = tasks.filter(task => task.completed && task.currentAssignedDate === todayDateStr).length;
             if (completedTodayTasks !== productivityScore) {
                 setProductivityScore(completedTodayTasks);
                 saveProductivityScore(completedTodayTasks);
             }
        } else if (!isLoadingTasks) {
             if (productivityScore !== 0) {
                 setProductivityScore(0); saveProductivityScore(0);
             }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tasks, isLoadingTasks]);

    // Effect 3: Handle Timer Finished Prop Change
    useEffect(() => {
        const selectRandomBreak = () => {
            if (breakIdeas.length === 0) return "Take a short break";
            const randomIndex = Math.floor(Math.random() * breakIdeas.length);
            return breakIdeas[randomIndex];
        };
        if (isTimerFinished && !isBreakModalOpen) {
            console.log("NowView: Pomodoro Finished (detected via prop). Opening break modal.");
            const idea = selectRandomBreak();
            setCurrentBreakIdea(idea);
            setTimerFinishedAt(Timestamp.now());
            setIsBreakModalOpen(true);
        }
    }, [isTimerFinished, isBreakModalOpen]);


    // Effect 4: Load All Task Data, Process Rollovers, and Apply Saved Order
    useEffect(() => {
        const loadDataAndProcessRollovers = async () => {
            if (isProcessingRollover.current) { return; }
            isProcessingRollover.current = true;
            setIsLoadingTasks(true);
            console.log("NowView: Starting data load and rollover process...");
            const todayDayIndex = getTodayDayIndex();
            const todayDateString = getTodayDateString();
            const currentWeekId = getWeekId();
            let initialTasksStatus = {};
            let initialEpiphanyCount = 0;
            let initialDespairCount = 0;
            let initialProductivityScore = 0;
            const tasksFromFirestore = [];
            const taskIdsAdded = new Set();

            try {
                // 1. Load metrics
                const metricsDocRef = doc(db, "dailyMetrics", todayDateString);
                const metricsDocSnap = await getDoc(metricsDocRef);
                if (metricsDocSnap.exists()) {
                    const data = metricsDocSnap.data();
                    initialTasksStatus = data.tasksStatus || {};
                    initialEpiphanyCount = data.epiphanyCount || 0;
                    initialDespairCount = data.despairCount || 0;
                    initialProductivityScore = data.productivityScore !== undefined ? data.productivityScore : 0;
                }
                setEpiphanyCount(initialEpiphanyCount);
                setDespairCount(initialDespairCount);
                setProductivityScore(initialProductivityScore);

                // 2. Fetch tasks assigned to today
                const todayTasksQuery = query(tasksCollectionRef, where("taskType", "in", ["planned", "ad-hoc"]), where("currentAssignedDate", "==", todayDateString));
                const todayTasksSnapshot = await getDocs(todayTasksQuery);
                todayTasksSnapshot.forEach((doc) => {
                    const data = doc.data();
                    const taskId = `task-${doc.id}`;
                    if (!taskIdsAdded.has(taskId)) {
                        const completedStatus = initialTasksStatus[taskId]?.completed || false;
                        tasksFromFirestore.push({
                            id: taskId, originalId: doc.id, text: data.plannedSteps,
                            completed: completedStatus, completedAt: initialTasksStatus[taskId]?.completedAt || null,
                            type: data.taskType === 'ad-hoc' ? 'adhoc' : 'weekly',
                            axisTheme: data.axisTheme, rolloverCount: data.rolloverCount || 0,
                            currentAssignedDate: data.currentAssignedDate || null // Read date
                        });
                        taskIdsAdded.add(taskId);
                    }
                });

                // 3. Process rollovers
                const rolloverCandidates = [];
                const rolloverQuery = query(tasksCollectionRef, where("status", "==", "pending"), where("taskType", "in", ["planned", "ad-hoc"]), where("currentAssignedDate", "<", todayDateString));
                const rolloverSnapshot = await getDocs(rolloverQuery);
                if (!rolloverSnapshot.empty) {
                    const batch = writeBatch(db);
                    rolloverSnapshot.forEach((doc) => {
                        const data = doc.data();
                        const taskId = `task-${doc.id}`;
                        batch.update(doc.ref, { currentAssignedDate: todayDateString, rolloverCount: increment(1) });
                        if (!taskIdsAdded.has(taskId)) {
                            rolloverCandidates.push({
                                id: taskId, originalId: doc.id, text: data.plannedSteps,
                                completed: false, completedAt: null,
                                type: data.taskType === 'ad-hoc' ? 'adhoc' : 'weekly',
                                axisTheme: data.axisTheme,
                                rolloverCount: (data.rolloverCount || 0) + 1,
                                currentAssignedDate: todayDateString // Rolled over tasks get today's date
                            });
                            taskIdsAdded.add(taskId);
                        }
                    });
                    await batch.commit();
                    tasksFromFirestore.push(...rolloverCandidates);
                }

                // 4. Add recurring routines
                const routinePlaceholdersForToday = [];
                for (const routineId in recurringRoutineDefinitions) {
                    const definition = recurringRoutineDefinitions[routineId];
                    if (definition.assignedDays.includes(todayDayIndex)) {
                        const statusFromMetrics = initialTasksStatus[routineId];
                        const isCompleted = statusFromMetrics?.completed || false;
                        if (!taskIdsAdded.has(routineId)) {
                            routinePlaceholdersForToday.push({
                                id: routineId, originalId: null, text: definition.text,
                                completed: isCompleted, completedAt: statusFromMetrics?.completedAt || null,
                                type: 'recurring', axisTheme: definition.axisTheme, rolloverCount: 0,
                                currentAssignedDate: todayDateString // Assign today's date
                            });
                            taskIdsAdded.add(routineId);
                        }
                    }
                }

                // 5. Combine & Apply Order
                let allTasksForToday = [...routinePlaceholdersForToday, ...tasksFromFirestore];
                const uniqueTasksMap = new Map(allTasksForToday.map(task => [task.id, task]));
                let finalOrderedTasks = [];
                const savedOrderJson = localStorage.getItem(TASK_ORDER_LS_KEY);
                if (savedOrderJson) {
                    try {
                        const orderedIds = JSON.parse(savedOrderJson);
                        orderedIds.forEach(id => { if (uniqueTasksMap.has(id)) { finalOrderedTasks.push(uniqueTasksMap.get(id)); uniqueTasksMap.delete(id); }});
                        finalOrderedTasks = [...finalOrderedTasks, ...Array.from(uniqueTasksMap.values())];
                    } catch (e) {
                         console.error("Error parsing saved task order, using default sort.", e);
                         finalOrderedTasks = Array.from(uniqueTasksMap.values());
                         finalOrderedTasks.sort((a, b) => { if (a.completed !== b.completed) return a.completed ? 1 : -1; if (a.type === 'recurring' && b.type !== 'recurring') return -1; if (a.type !== 'recurring' && b.type === 'recurring') return 1; return (a.text || '').localeCompare(b.text || ''); });
                    }
                } else {
                    finalOrderedTasks = Array.from(uniqueTasksMap.values());
                    finalOrderedTasks.sort((a, b) => { if (a.completed !== b.completed) return a.completed ? 1 : -1; if (a.type === 'recurring' && b.type !== 'recurring') return -1; if (a.type !== 'recurring' && b.type === 'recurring') return 1; return (a.text || '').localeCompare(b.text || ''); });
                }
                setTasks(finalOrderedTasks);
                previousTaskCount.current = finalOrderedTasks.length;

            } catch (error) {
                console.error("NowView: Critical error during data load/rollover:", error);
                setTasks([]);
            } finally {
                setIsLoadingTasks(false);
                isProcessingRollover.current = false;
                isInitialLoad.current = false;
                console.log("NowView: Data load and rollover process finished.");
            }
        };
        loadDataAndProcessRollovers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Effect 5: Focus Ad-Hoc Input
    useEffect(() => {
        if (!isInitialLoad.current && adHocTaskText === '' && adHocInputRef.current) {
            requestAnimationFrame(() => { if (adHocInputRef.current) { adHocInputRef.current.focus(); } });
        }
    }, [adHocTaskText]);


    // == Handlers ==
    const handleTaskToggle = async (taskId, event) => {
        event.stopPropagation();
        if (isSavingTask) { return; }
        const currentTaskLocal = tasks.find(task => task.id === taskId);
        if (!currentTaskLocal) { console.error("NowView: Task not found for toggle:", taskId); return; }
        const newCompletedStatus = !currentTaskLocal.completed;
        const newCompletedTimestamp = newCompletedStatus ? Timestamp.now() : null;
        console.log(`NowView: Toggling task ${taskId} to completed: ${newCompletedStatus}`);
        setTasks(prevTasks => {
            const otherTasks = prevTasks.filter(t => t.id !== taskId);
            const updatedTask = { ...currentTaskLocal, completed: newCompletedStatus, completedAt: newCompletedTimestamp };
            const newTasks = newCompletedStatus ? [...otherTasks, updatedTask] : [updatedTask, ...otherTasks];
            localStorage.setItem(TASK_ORDER_LS_KEY, JSON.stringify(newTasks.map(t => t.id)));
            return newTasks;
        });
        setIsSavingTask(true);
        try {
            const todayDateString = getTodayDateString();
            const metricsDocRef = doc(db, "dailyMetrics", todayDateString);
            const metricsSnap = await getDoc(metricsDocRef);
            const currentMetricsData = metricsSnap.data() || {};
            const currentTasksStatus = currentMetricsData.tasksStatus || {};
            currentTasksStatus[taskId] = { completed: newCompletedStatus, completedAt: newCompletedTimestamp };
            const completedCount = Object.values(currentTasksStatus).filter(status => status.completed).length;
            const dataToSaveInMetrics = { tasksStatus: currentTasksStatus, productivityScore: completedCount, lastUpdated: serverTimestamp() };
            await setDoc(metricsDocRef, dataToSaveInMetrics, { merge: true });
            const originalId = currentTaskLocal.originalId;
            if (originalId && currentTaskLocal.type !== 'recurring') {
                const taskDocRef = doc(tasksCollectionRef, originalId);
                const taskUpdateData = { status: newCompletedStatus ? 'completed' : 'pending', completedAt: newCompletedTimestamp };
                await updateDoc(taskDocRef, taskUpdateData);
            }
        } catch (error) {
            console.error("NowView: Error saving task status to Firestore:", error);
            alert("Error saving task status. Please try again.");
            setTasks(prevTasks => {
                 const revertedTasks = prevTasks.map(task =>
                     task.id === taskId ? { ...currentTaskLocal, completed: !newCompletedStatus, completedAt: currentTaskLocal.completedAt } : task
                 );
                 localStorage.setItem(TASK_ORDER_LS_KEY, JSON.stringify(revertedTasks.map(t => t.id)));
                 return revertedTasks;
            });
        } finally {
            setIsSavingTask(false);
        }
    };
    const saveMoment = async (type, currentCount, detail) => {
        if (isSavingMoments || isSavingDetail) { return; }
        const today = getTodayDateString();
        const newCount = currentCount + 1;
        if (type === 'epiphany') setEpiphanyCount(newCount);
        if (type === 'despair') setDespairCount(newCount);
        setIsSavingMoments(true);
        const metricsDocRef = doc(db, "dailyMetrics", today);
        const countDataToSave = { [`${type}Count`]: newCount, lastUpdated: serverTimestamp() };
        try { await setDoc(metricsDocRef, countDataToSave, { merge: true }); }
        catch (error) {
            console.error(`NowView: Error saving ${type} count:`, error);
            alert(`Error saving ${type} count.`);
            if (type === 'epiphany') setEpiphanyCount(currentCount);
            if (type === 'despair') setDespairCount(currentCount);
        } finally { setIsSavingMoments(false); }
        const detailText = detail.trim();
        if (detailText) {
            setIsSavingDetail(true);
            const detailData = { type: type, text: detailText, date: today, timestamp: serverTimestamp() };
            try {
                const momentsLogCollectionRef = collection(db, "momentsLog");
                await addDoc(momentsLogCollectionRef, detailData);
                if (type === 'epiphany') setEpiphanyDetail('');
                if (type === 'despair') setDespairDetail('');
            } catch (error) { console.error(`NowView: Error saving ${type} detail:`, error); alert(`Error saving ${type} detail.`); }
            finally { setIsSavingDetail(false); }
        }
    };
    const incrementEpiphany = () => { saveMoment('epiphany', epiphanyCount, epiphanyDetail); };
    const incrementDespair = () => { saveMoment('despair', despairCount, despairDetail); };
    const handleStartPause = () => { onSetIsTimerRunning(!isTimerRunning); };
    const handleReset = () => { onSetIsTimerRunning(false); onSetIsTimerFinished(false); onSetTimerSeconds(pomodoroDurationMinutes * 60); };
    const formatTime = (seconds) => { const mins = Math.floor(seconds / 60); const secs = seconds % 60; return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`; };
    const handleDurationChange = (event) => { const newDuration = parseInt(event.target.value, 10); if (!isNaN(newDuration) && newDuration > 0) { onSetPomodoroDurationMinutes(newDuration); } };
    const handleJournalChange = (event) => { setJournalText(event.target.value); };
    const handleJournalSave = async () => {
        if (!journalText.trim() || isSavingJournal) return;
        setIsSavingJournal(true);
        const dateString = getTodayDateString();
        const dayOfWeek = getTodayDayIndex();
        const journalData = { entryText: journalText.trim(), createdAt: serverTimestamp(), dateString: dateString, dayOfWeek: dayOfWeek, timeOfDay: 'Now' };
        try {
            const journalCollectionRef = collection(db, "journalEntries");
            await addDoc(journalCollectionRef, journalData);
            setJournalText('');
        } catch (e) { console.error("NowView: Error adding journal entry: ", e); alert("Failed to save journal entry."); }
        finally { setIsSavingJournal(false); }
    };
    const handleBreakReviewSubmit = (breakLogData) => { closeBreakModal(); };
    const closeBreakModal = () => { setIsBreakModalOpen(false); setCurrentBreakIdea(''); setTimerFinishedAt(null); onSetIsTimerFinished(false); };
    const handleAddAdHocTask = async () => {
        const text = adHocTaskText.trim();
        const axisToSave = selectedAxisTheme || 'Rest and preparation';
        if (!text || !axisToSave) { alert("Please enter task text and select an axis."); return; }
        if (isSavingAdHoc) return;
        setIsSavingAdHoc(true);
        const todayDateString = getTodayDateString();
        const currentWeekId = getWeekId();
        const adHocData = { taskType: 'ad-hoc', plannedSteps: text, axisTheme: axisToSave, weekId: currentWeekId, assignedDays: [], originalAssignedDate: todayDateString, currentAssignedDate: todayDateString, createdAt: serverTimestamp(), status: 'pending', completedAt: null, rolloverCount: 0, };
        try {
            const newDocRef = await addDoc(tasksCollectionRef, adHocData);
            const newTaskObject = { id: `task-${newDocRef.id}`, originalId: newDocRef.id, text: adHocData.plannedSteps, completed: false, completedAt: null, type: 'adhoc', axisTheme: adHocData.axisTheme, rolloverCount: 0, currentAssignedDate: todayDateString }; // Add currentAssignedDate
            setTasks(prevTasks => { const updatedTasks = [newTaskObject, ...prevTasks]; localStorage.setItem(TASK_ORDER_LS_KEY, JSON.stringify(updatedTasks.map(t => t.id))); return updatedTasks; });
            setAdHocTaskText('');
        } catch (error) { console.error("NowView: Error saving ad hoc task:", error); alert("Failed to save ad hoc task. Please try again."); }
        finally { setIsSavingAdHoc(false); }
    };
    const handleAdHocKeyDown = (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleAddAdHocTask(); } };
    const handleSetCurrentTask = (taskId) => {
        if (dragItem.current) return;
        onSetCurrentTask(taskId);
        setTasks(prevTasks => {
            const clickedIndex = prevTasks.findIndex(task => task.id === taskId);
            if (clickedIndex === -1 || clickedIndex === 0) return prevTasks;
            const newTasks = [...prevTasks];
            const [clickedItem] = newTasks.splice(clickedIndex, 1);
            newTasks.unshift(clickedItem);
            localStorage.setItem(TASK_ORDER_LS_KEY, JSON.stringify(newTasks.map(t => t.id)));
            return newTasks;
        });
    };
    const handleDragStart = (e, id) => { console.log('NowView Drag Start:', id); dragItem.current = id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); e.currentTarget.classList.add(styles.dragging); };
    const handleDragEnter = (e, id) => { console.log('NowView Drag Enter:', id); dragOverItem.current = id; e.currentTarget.classList.add(styles.dragOver); };
    const handleDragLeave = (e) => { e.currentTarget.classList.remove(styles.dragOver); };
    const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handleDrop = (e) => {
        e.preventDefault();
        const draggedItemId = dragItem.current;
        const targetItemId = dragOverItem.current;
        const targetElement = e.currentTarget;
        if (targetElement) { targetElement.classList.remove(styles.dragOver); }
        if (!draggedItemId || !targetItemId || draggedItemId === targetItemId) { dragItem.current = null; dragOverItem.current = null; return; }
        const dragIndex = tasks.findIndex(task => task.id === draggedItemId);
        const targetIndex = tasks.findIndex(task => task.id === targetItemId);
        if (dragIndex === -1 || targetIndex === -1) { console.error("NowView: Error finding dragged or target item index during drop."); dragItem.current = null; dragOverItem.current = null; return; }
        const newTasks = [...tasks];
        const [draggedItem] = newTasks.splice(dragIndex, 1);
        newTasks.splice(targetIndex, 0, draggedItem);
        setTasks(newTasks);
        localStorage.setItem(TASK_ORDER_LS_KEY, JSON.stringify(newTasks.map(t => t.id)));
        dragItem.current = null; dragOverItem.current = null;
    };
    const handleDragEnd = (e) => { console.log('NowView Drag End'); if (e.currentTarget) { e.currentTarget.classList.remove(styles.dragging); } else { const draggedElement = document.querySelector(`.${styles.dragging}`); if (draggedElement) { draggedElement.classList.remove(styles.dragging); } } const dragOverElements = document.querySelectorAll(`.${styles.dragOver}`); dragOverElements.forEach(el => el.classList.remove(styles.dragOver)); dragItem.current = null; dragOverItem.current = null; };

    // --- Handler for Assigned Date Change ---
    const handleAssignedDateChange = async (originalFirestoreId, newDateString) => {
        if (!originalFirestoreId) { console.error("Cannot update assigned date: missing original Firestore ID."); return; }
        const task = tasks.find(t => t.originalId === originalFirestoreId);
        if (task?.type === 'recurring') { console.warn("Cannot set assigned date for recurring task:", task.id); alert("Cannot change the date for recurring routines."); return; }

        setSavingDateTaskId(originalFirestoreId);
        console.log(`Updating currentAssignedDate for ${originalFirestoreId} to ${newDateString}`);

        try {
            const taskDocRef = doc(db, "weeklySteps", originalFirestoreId);
            await updateDoc(taskDocRef, { currentAssignedDate: newDateString || null });

            // Update local state optimistically
            setTasks(prevTasks => prevTasks.map(t =>
                t.originalId === originalFirestoreId
                    ? { ...t, currentAssignedDate: newDateString || null }
                    : t
            ));
            console.log(`Successfully updated currentAssignedDate for ${originalFirestoreId}`);

        } catch (error) {
            console.error("Error updating assigned date:", error);
            alert(`Failed to update assigned date for task. Error: ${error.message}`);
        } finally {
            setSavingDateTaskId(null);
        }
    };
    // --- End Handlers ---

    // == JSX Rendering ==
    // Filter tasks to display only those assigned to today and not completed
    const todayDateStr = getTodayDateString();
    const tasksForTodayDisplay = tasks.filter(task =>
        task.currentAssignedDate === todayDateStr && !task.completed
    );
    const tasksToShowInDisplayBox = tasksForTodayDisplay.slice(0, 6);

    return (
        <div className={styles.nowViewContainer}>
            <h2 className={styles.viewTitle}>Now</h2>

            {/* Left Panel */}
            <div className={styles.leftPanel}>
                {/* Moments Tracker */}
                <div className={styles.momentsTracker}>
                    <div className={styles.momentEntry}>
                        <div className={styles.momentCounter}><span>Epiphany: {epiphanyCount}</span><button onClick={incrementEpiphany} className={styles.momentButton} disabled={isSavingMoments || isSavingDetail}>+</button></div>
                        <input type="text" value={epiphanyDetail} onChange={(e) => setEpiphanyDetail(e.target.value)} placeholder="Epiphany detail..." className={styles.momentInput} disabled={isSavingMoments || isSavingDetail}/>
                    </div>
                    <div className={styles.momentEntry}>
                        <div className={styles.momentCounter}><span>Despair: {despairCount}</span><button onClick={incrementDespair} className={styles.momentButton} disabled={isSavingMoments || isSavingDetail}>+</button></div>
                        <input type="text" value={despairDetail} onChange={(e) => setDespairDetail(e.target.value)} placeholder="Despair detail..." className={styles.momentInput} disabled={isSavingMoments || isSavingDetail}/>
                    </div>
                </div>
                {/* Productivity */}
                <div className={styles.productivityDisplay}>Productivity: <span className={styles.score}>{productivityScore}</span></div>
                {/* Journal */}
                <div className={styles.journalPlaceholder}>
                    <label htmlFor="nowJournal" className={styles.journalLabel}>Quick Thought:</label>
                    <textarea id="nowJournal" value={journalText} onChange={handleJournalChange} placeholder="Jot down quick thoughts..." rows="3" className={styles.journalTextarea} disabled={isSavingJournal} />
                    <button onClick={handleJournalSave} disabled={isSavingJournal || !journalText.trim()} className={styles.saveJournalButton}>{isSavingJournal ? 'Saving...' : 'Save Thought'}</button>
                    {/* Flashcard Button */}
                    <button type="button" onClick={() => setIsFlashcardModalOpen(true)} className={styles.flashcardButton} style={{ marginTop: '0.5rem', width: '100%' }} > Study Flashcards </button>
                </div>
            </div>

            {/* Center Panel */}
            <div className={styles.centerPanel}>
                {/* Task List Section */}
                <div className={styles.taskListContainer}>
                    <h3 className={styles.sectionTitle}>Today's Tasks</h3>
                    {/* Current Task Display Box */}
                    <div className={styles.currentTaskDisplay}>
                        {tasksToShowInDisplayBox.length === 0 && !isLoadingTasks && ( <span className={styles.noTasksMessage}>No tasks for today!</span> )}
                        {tasksToShowInDisplayBox.map((task, index) => (
                            <div key={task.id} className={`${styles.upcomingTaskItem} ${styles[`upcomingTaskItem${index}`]}`}>
                                {task.text}
                                {task.rolloverCount > 0 && <span className={styles.rolloverIndicatorSmall}> ({task.rolloverCount}d)</span>}
                            </div>
                        ))}
                    </div>
                    {/* Scrollable Task List */}
                    <div className={styles.taskList} >
                         {isLoadingTasks ? ( <p>Loading tasks...</p> ) :
                             tasksForTodayDisplay.length > 0 ? ( // Map over the filtered list
                                 tasksForTodayDisplay.map((task) => {
                                     const cssSuffix = axisNameToCssVarSuffix(task.axisTheme);
                                     const taskStyle = { '--task-color-dark': `var(--axis-color-${cssSuffix}-3, var(--axis-color-default-3))`, '--task-color-medium': `var(--axis-color-${cssSuffix}-2, var(--axis-color-default-2))`, '--task-color-light': `var(--axis-color-${cssSuffix}-1, var(--axis-color-default-1))` };
                                     const assignedDateValue = task.currentAssignedDate || '';

                                     return (
                                         <div key={task.id} className={`${styles.taskItem} ${task.id === currentTaskId ? styles.selectedTask : ''}`} title={task.axisTheme ? `Axis: ${task.axisTheme}${task.rolloverCount > 0 ? ` (Rolled ${task.rolloverCount}d)` : ''}` : (task.type === 'recurring' ? 'Recurring Routine' : 'Task')} style={taskStyle} draggable="true" onDragStart={(e) => handleDragStart(e, task.id)} onDragEnter={(e) => handleDragEnter(e, task.id)} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop} onDragEnd={handleDragEnd} onClick={() => handleSetCurrentTask(task.id)} >
                                             {/* Checkbox Container */}
                                             <div className={styles.checkboxContainer} onClick={(e) => e.stopPropagation()}>
                                                 <input type="checkbox" id={`task-checkbox-${task.id}`} checked={false} onChange={(e) => handleTaskToggle(task.id, e)} className={styles.checkbox} disabled={isSavingTask} />
                                                 <label htmlFor={`task-checkbox-${task.id}`} className={styles.checkboxCustom}></label>
                                             </div>
                                             {/* Task Label */}
                                             <label className={styles.taskLabel}>
                                                 {task.text}
                                                 {task.rolloverCount > 0 && <span className={styles.rolloverIndicator}> ({task.rolloverCount}d)</span>}
                                             </label>
                                             {/* Assigned Date Input */}
                                             {task.type !== 'recurring' && (
                                                <input
                                                    type="date"
                                                    className={styles.dueDateInput} // Use a specific class for styling
                                                    value={assignedDateValue}
                                                    onChange={(e) => handleAssignedDateChange(task.originalId, e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    title={`Assigned: ${assignedDateValue || 'Not set'}`}
                                                    disabled={savingDateTaskId === task.originalId}
                                                />
                                             )}
                                         </div>
                                     );
                                 })
                             // Check original tasks array for completed message
                             ) : !isLoadingTasks && tasks.length > 0 && tasks.every(task => task.completed || task.currentAssignedDate !== todayDateStr) ? (
                                 <p className={styles.allTasksDoneMessage}>All tasks completed or moved!</p>
                             ) : (
                                 <p>No tasks assigned for today.</p> // Updated message
                             )
                         }
                     </div>
                </div>
                {/* Ad Hoc Task Adder */}
                <div className={styles.adHocForm}>
                    <h4 className={styles.adHocTitle}>Add Task</h4>
                    <textarea ref={adHocInputRef} rows="2" placeholder="Enter new task..." value={adHocTaskText} onChange={(e) => setAdHocTaskText(e.target.value)} onKeyDown={handleAdHocKeyDown} className={styles.adHocTextarea} disabled={isSavingAdHoc} />
                    <div className={styles.adHocControls}>
                        <select value={selectedAxisTheme} onChange={(e) => setSelectedAxisTheme(e.target.value)} className={styles.adHocSelect} disabled={isSavingAdHoc || availableAxes.length === 0} >
                            <option value="" disabled>Select Axis</option>
                            {availableAxes.map(axis => ( <option key={axis.name} value={axis.name}>{axis.name}</option> ))}
                        </select>
                        <button onClick={handleAddAdHocTask} disabled={!adHocTaskText.trim() || !selectedAxisTheme || isSavingAdHoc || availableAxes.length === 0} className={styles.adHocButton} >
                            {isSavingAdHoc ? 'Adding...' : 'Add Task'}
                        </button>
                    </div>
                    {availableAxes.length === 0 && isLoadingTasks && <p className={styles.adHocWarning}>Loading axes...</p>}
                 </div>
                 {/* Context Map */}
                 <ContextMap axisName={selectedAxisTheme} />
            </div>

            {/* Right Panel */}
            <div className={styles.rightPanel}>
                 <div className={styles.timerSection}>
                     <p className={styles.timeLabel}>What time is it?</p>
                     <div className={styles.timerDisplay}>
                          <img src={isTimerFinished ? "/tomato-sliced.png" : "/tomato-whole.png"} alt={isTimerFinished ? "Sliced Tomato - Time for a break!" : "Whole Tomato - Focus time"} className={styles.tomatoImage} onError={(e) => { e.target.style.display = 'none'; }} />
                          <span className={styles.timerText}>{formatTime(timerSeconds)}</span>
                      </div>
                      <div className={styles.timerControls}>
                          <button onClick={handleStartPause} className={styles.timerButton} disabled={isTimerFinished}>{isTimerRunning ? '❚❚' : '▶'}</button>
                          <button onClick={handleReset} className={styles.timerButton}>⟳</button>
                      </div>
                      <div className={styles.timerConfig}>
                           <label htmlFor="pomodoroDurationInput" className={styles.durationLabel}>Duration (min):</label>
                           <input id="pomodoroDurationInput" type="number" value={pomodoroDurationMinutes} onChange={handleDurationChange} min="1" className={styles.durationInput} disabled={isTimerRunning} />
                       </div>
                     <p className={styles.nowLabel}>NOW</p>
                 </div>
                 {/* Dear Abi Marquee Component */}
                 <DearAbiMarquee theme={currentMonthTheme} />
            </div>

             {/* Modals */}
             {isBreakModalOpen && ( <Modal isOpen={isBreakModalOpen} onClose={closeBreakModal}> <BreakReviewForm onSubmit={handleBreakReviewSubmit} onClose={closeBreakModal} pomodoroDuration={pomodoroDurationMinutes} timerFinishedTimestamp={timerFinishedAt} /> </Modal> )}
             {isFlashcardModalOpen && ( <StudyFlashcardsModal isOpen={isFlashcardModalOpen} onClose={() => setIsFlashcardModalOpen(false)} /> )}
        </div>
    );
}

export default NowView;
