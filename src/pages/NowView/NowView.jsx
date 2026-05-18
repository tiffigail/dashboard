// src/components/NowView/NowView.jsx
import React, { useState, useEffect, useRef, Suspense } from 'react';
import styles from '@/pages/NowView/NowView.module.css';
import { db } from '@/firebaseConfig';
import ContextMap from '@/features/lifemap/ContextMap/ContextMap';
import Modal from '@/components/ui/Modal/Modal';
import BreakReviewForm from '@/features/physical/BreakReviewForm/BreakReviewForm';
import StudyFlashcardsModal from '@/features/gear/StudyFlashcardsModal/StudyFlashcardsModal';
import DearAbiMarquee from '@/components/ui/DearAbiMarquee/DearAbiMarquee';
import SprintSnapshot from '@/features/planning/SprintSnapshot/SprintSnapshot';
import PeriodQuickLog from '@/features/physical/PeriodQuickLog/PeriodQuickLog';
const FitnessAchievementDashboard = React.lazy(() => import('@/features/physical/FitnessAchievementDashboard/FitnessAchievementDashboard'));
import {
    collection, doc, addDoc, setDoc, getDocs, getDoc, query, where,
    updateDoc, serverTimestamp, Timestamp
} from "firebase/firestore";
import { useTimer } from '@/context/TimerContext.jsx';
import { useAuth } from '@/context/AuthContext';
import { saveCorpusEntry } from '@/services/advisorService';
import { getTodayDateString, getWeekId } from '@/utils/dateUtils';
import ErrorBoundary from '@/components/ui/ErrorBoundary/ErrorBoundary';


const LS_KEYS = {
    CURRENT_TASK_ID: 'productivityApp_currentTaskId',
};

const loadState = (key, defaultValue) => {
    try {
        const saved = localStorage.getItem(key);
        if (saved === null) return defaultValue;
        if (typeof defaultValue === 'number') {
            const parsed = parseFloat(saved);
            return isNaN(parsed) ? defaultValue : parsed;
        }
        if (typeof defaultValue === 'boolean') return saved === 'true';
        return saved;
    } catch (error) {
        console.error(`Error reading localStorage key “${key}”:`, error);
        return defaultValue;
    }
};
// --- Definitions ---
const recurringRoutineDefinitions = {
    'routine_am': { text: "Am Routine", axisTheme: "On Track N+1", assignedDays: [0, 1, 2, 3, 4, 5, 6] },
    'routine_pm': { text: "Pm Routine", axisTheme: "On Track N+1", assignedDays: [0, 1, 2, 3, 4, 5, 6] },
    'routine_famclean': { text: "Family Clean", axisTheme: "Environment", assignedDays: [0, 1, 2, 3, 4, 5, 6] },
    'routine_budget': { text: "Budget", axisTheme: "Financial", assignedDays: [2] },
    'routine_prepare': { text: "Prepare", axisTheme: "Rest and preparation", assignedDays: [0] },
    'routine_study': { text: "Study", axisTheme: "Gear", assignedDays: [0, 1, 2, 3, 4, 5, 6] },
    'routine_exercise': { text: "Exercise", axisTheme: "Physical", assignedDays: [0, 1, 2, 3, 4, 5, 6] },
    'routine_ready': { text: "Ready For Work", axisTheme: "Financial", assignedDays: [1, 2, 3, 4, 5] }
};
const breakIdeas = ["Stretch for 5 minutes", "Walk around the block", "Get some water", "Listen to one song", "Doodle for 5 minutes (on paper!)", "Step outside for fresh air", "Quick tidy-up (1 area)", "Meditate for 5 minutes", "Read a non-work article",];
const TASK_ORDER_LS_KEY = 'nowViewTaskOrder';

// --- Helpers ---
const getTodayDayIndex = () => new Date().getDay();
const getYesterdayDateString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const axisNameToCssVarSuffix = (axisName) => {
    if (!axisName || typeof axisName !== 'string') return 'default';
    return axisName.trim().toLowerCase().replace(/\s+/g, '-').replace(/\+/g, '-plus-');
};

// --- ConfettiBurst Component ---
const CONFETTI_COLORS = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff6bff','#ff9f43','#a29bfe','#fd79a8'];
function ConfettiBurst() {
    const particles = Array.from({ length: 28 }, (_, i) => {
        const angle = (i / 28) * 360 + Math.random() * 13;
        const distance = 55 + Math.random() * 45;
        const tx = Math.cos((angle * Math.PI) / 180) * distance;
        const ty = Math.sin((angle * Math.PI) / 180) * distance - 20;
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const size = 5 + Math.random() * 6;
        const dur = (0.7 + Math.random() * 0.5).toFixed(2);
        const isCircle = Math.random() > 0.5;
        return (
            <div key={i} className={styles.confettiParticle} style={{
                backgroundColor: color, width: size, height: size,
                borderRadius: isCircle ? '50%' : '2px',
                '--tx': `${tx}px`, '--ty': `${ty}px`,
                animationDuration: `${dur}s`,
                animationDelay: `${(Math.random() * 0.1).toFixed(2)}s`,
            }} />
        );
    });
    return <div className={styles.confettiBurst}>{particles}</div>;
}

// --- NowView Component ---
function NowView() {
    const { currentUser } = useAuth();
    const {
        pomodoroDurationMinutes, timerSeconds,
        isTimerRunning, isTimerFinished,
        onSetPomodoroDurationMinutes, onSetTimerSeconds, onSetIsTimerRunning, onSetIsTimerFinished
    } = useTimer();

    // --- ADD THIS STATE AND EFFECT BACK ---
    const [currentTaskId, setCurrentTaskId] = useState(() => loadState(LS_KEYS.CURRENT_TASK_ID, null));

    useEffect(() => {
        if (currentTaskId !== null) {
            localStorage.setItem(LS_KEYS.CURRENT_TASK_ID, currentTaskId);
        } else {
            localStorage.removeItem(LS_KEYS.CURRENT_TASK_ID);
        }
    }, [currentTaskId]);

    
    // == State ==
    const [tasks, setTasks] = useState([]);
    const [epiphanyCount, setEpiphanyCount] = useState(0);
    const [despairCount, setDespairCount] = useState(0);
    const [journalText, setJournalText] = useState('');
    const [isSavingMoments, setIsSavingMoments] = useState(false);
    const [isSavingJournal, setIsSavingJournal] = useState(false);
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    const [isSavingTask, setIsSavingTask] = useState(false);
    const [adHocTaskText, setAdHocTaskText] = useState('');
    const [selectedAxisTheme, setSelectedAxisTheme] = useState('Rest and preparation');
    const [availableAxes, setAvailableAxes] = useState([]);
    const [isSavingAdHoc, setIsSavingAdHoc] = useState(false);
    const [focusAdHocInput, setFocusAdHocInput] = useState(false);
    const [focusMomentInput, setFocusMomentInput] = useState(null); // 'epiphany' | 'despair' | null
    const [epiphanyDetail, setEpiphanyDetail] = useState('');
    const [despairDetail, setDespairDetail] = useState('');
    const [isSavingDetail, setIsSavingDetail] = useState(false);
    const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);
    const [currentBreakIdea, setCurrentBreakIdea] = useState('');
    const [timerFinishedAt, setTimerFinishedAt] = useState(null);
    const [isFlashcardModalOpen, setIsFlashcardModalOpen] = useState(false);
    const [isPhysicalDashboardOpen, setIsPhysicalDashboardOpen] = useState(false);
    const [currentMonthTheme, setCurrentMonthTheme] = useState(null);
    const [pendingDates, setPendingDates] = useState({}); // uncommitted date selections
    const [topThree, setTopThree] = useState([null, null, null]);
    const [confettiBurst, setConfettiBurst] = useState(null); // slot index 0|1|2|null

    // FIX: productivityScore is now a direct counter, loaded and saved.
    const [productivityScore, setProductivityScore] = useState(0);
    // Keep for axisTaskCounts which are derived from completed tasks
    const [firestoreAxisTaskCounts, setFirestoreAxisTaskCounts] = useState({});

    // == Refs ==
    const tasksCollectionRef = collection(db, "new_tasks");
    const dragItem = useRef(null);
    const dragOverItem = useRef(null);
    const adHocInputRef = useRef(null);
    const epiphanyInputRef = useRef(null);
    const despairInputRef = useRef(null);
    const dateTimerRef = useRef({}); // debounce commit timers keyed by task.originalId

    // == Derived State ==
    const todayDateStr = getTodayDateString();
    // tasksForTodayDisplay now only shows UNCOMPLETED tasks, which is the expected behavior if completed tasks disappear.
    const tasksForTodayDisplay = tasks.filter(task => !task.completed);
    const tasksToShowInDisplayBox = tasksForTodayDisplay.slice(0, 6);

    // == Effects ==
    useEffect(() => {
        if (focusAdHocInput && adHocInputRef.current) {
            adHocInputRef.current.focus();
            setFocusAdHocInput(false);
        }
    }, [focusAdHocInput]);

    useEffect(() => {
        if (focusMomentInput === 'epiphany' && epiphanyInputRef.current) {
            epiphanyInputRef.current.focus();
            setFocusMomentInput(null);
        } else if (focusMomentInput === 'despair' && despairInputRef.current) {
            despairInputRef.current.focus();
            setFocusMomentInput(null);
        }
    }, [focusMomentInput]);

    useEffect(() => { // Fetch Axes
        const fetchAxes = async () => {
            try {
                const axesCollectionRef = collection(db, "new_axes");
                const querySnapshot = await getDocs(axesCollectionRef);
                const axesList = querySnapshot.docs
                    .map(doc => ({ id: doc.id, name: doc.data().axisName }))
                    .filter(axis => axis.name);
                axesList.sort((a, b) => a.name.localeCompare(b.name));
                const filteredAxesList = axesList.filter(axis => axis.name !== "Prepare");
                setAvailableAxes(filteredAxesList);
                if (filteredAxesList.length > 0 && !filteredAxesList.some(axis => axis.name === selectedAxisTheme)) {
                    setSelectedAxisTheme(filteredAxesList.find(axis => axis.name === 'Rest and preparation')?.name || filteredAxesList[0].name);
                } else if (filteredAxesList.length === 0 && selectedAxisTheme !== '') {
                    setSelectedAxisTheme('');
                }
            } catch (error) { console.error("Error fetching axes:", error); }
        };
        fetchAxes();
    }, []);

    useEffect(() => { // Fetch current month's theme
        const fetchMonthTheme = async () => {
            const today = new Date();
            const monthId = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            try {
                const monthDocRef = doc(db, "monthlyPlans", monthId);
                const monthSnap = await getDoc(monthDocRef);
                if (monthSnap.exists()) { setCurrentMonthTheme(monthSnap.data().monthFocus); }
                else { setCurrentMonthTheme(null); }
            } catch (error) { console.error("Error fetching month theme:", error); }
        };
        fetchMonthTheme();
    }, []);

    useEffect(() => { // Handle Timer Finished Prop Change
        const selectRandomBreak = () => {
            if (breakIdeas.length === 0) return "Take a short break";
            const randomIndex = Math.floor(Math.random() * breakIdeas.length);
            return breakIdeas[randomIndex];
        };
        if (isTimerFinished && !isBreakModalOpen) {
            const idea = selectRandomBreak(); setCurrentBreakIdea(idea);
            setTimerFinishedAt(Timestamp.now()); setIsBreakModalOpen(true);
        }
    }, [isTimerFinished, isBreakModalOpen]);

    // FIX: Load All Task Data AND Daily Metrics (including direct productivity score)
    useEffect(() => {
        const loadTasksForToday = async () => {
            setIsLoadingTasks(true);
            const todayDayIndex = getTodayDayIndex();
            // FIX: tasksStatus will now primarily hold recurring task completion status
            let initialTasksStatus = {};
            let initialAxisTaskCounts = {};

            try {
                const metricsDocRef = doc(db, "dailyMetrics", todayDateStr);
                const metricsDocSnap = await getDoc(metricsDocRef);
                if (metricsDocSnap.exists()) {
                    const data = metricsDocSnap.data();
                    initialTasksStatus = data.tasksStatus || {}; // Still needed for recurring tasks
                    setEpiphanyCount(data.epiphanyCount || 0);
                    setDespairCount(data.despairCount || 0);

                    // FIX: Directly retrieve and set the productivityScore state
                    setProductivityScore(data.productivityScore || 0);
                    setFirestoreAxisTaskCounts(data.axisTaskCounts || {});
                }

                // Load topThree + rollover from yesterday into empty slots
                const rawTop3 = metricsDocSnap.exists() ? (metricsDocSnap.data().topThree || [null, null, null]) : [null, null, null];
                const finalTop3 = [...rawTop3.slice(0, 3)];
                while (finalTop3.length < 3) finalTop3.push(null);
                const ySnap = await getDoc(doc(db, "dailyMetrics", getYesterdayDateString()));
                let rolledAnything = false;
                if (ySnap.exists()) {
                    (ySnap.data().topThree || []).slice(0, 3).forEach((slot, i) => {
                        if (slot && !slot.completed && finalTop3[i] === null) {
                            finalTop3[i] = { text: slot.text, axisTheme: slot.axisTheme, completed: false, completedAt: null, originalTaskId: slot.originalTaskId || null };
                            rolledAnything = true;
                        }
                    });
                }
                if (rolledAnything) {
                    await setDoc(metricsDocRef, { topThree: finalTop3, lastUpdated: serverTimestamp() }, { merge: true });
                }
                setTopThree(finalTop3);

                // This query ensures that tasks that are completed (status: 'completed')
                // in the 'new_tasks' collection will *not* be returned here.
                const tasksQuery = query(
                    tasksCollectionRef,
                    where("assignedDate", "<=", todayDateStr),
                    where("status", "==", "todo")
                );
                const tasksSnapshot = await getDocs(tasksQuery);


                const tasksFromFirestore = tasksSnapshot.docs.map(docSnap => {
                    const data = docSnap.data();
                    const originalId = docSnap.id;
                    // FIX: 'completed: false' here is correct, as these are 'todo' tasks.
                    // If a non-recurring task is completed, its 'status' in new_tasks will change
                    // and it will no longer be retrieved by the above query.
                    return {
                        id: `task-${originalId}`,
                        originalId: originalId,
                        text: data.title,
                        completed: false, // These are fetched as 'todo', so they are not completed.
                        completedAt: null,
                        type: data.taskType,
                        axisTheme: data.axisTheme,
                        assignedDate: data.assignedDate,
                    };
                });
                const a_properlyFilteredTasks = tasksFromFirestore.filter(task => {
                return task.assignedDate && task.assignedDate <= todayDateStr;
                });

                // DEBUGGING: Log the first task object to inspect its structure
                if (tasksFromFirestore.length > 0) {
                }

                const routinePlaceholdersForToday = [];
                for (const routineId in recurringRoutineDefinitions) {
                    const definition = recurringRoutineDefinitions[routineId];
                    if (definition.assignedDays.includes(todayDayIndex)) {
                        // FIX: Recurring tasks *still* need to check initialTasksStatus for daily completion
                        routinePlaceholdersForToday.push({
                            id: routineId,
                            originalId: null, // Recurring tasks don't have an originalId in new_tasks
                            text: definition.text,
                            completed: initialTasksStatus[routineId]?.completed || false, // Essential for recurring task checkbox state
                            completedAt: initialTasksStatus[routineId]?.completedAt || null,
                            type: 'recurring',
                            axisTheme: definition.axisTheme,
                            assignedDate: todayDateStr
                        });
                    }
                }

                let allTasksForToday = [...a_properlyFilteredTasks, ...routinePlaceholdersForToday];
                let finalOrderedTasks;
                const savedOrderJson = localStorage.getItem(TASK_ORDER_LS_KEY);

                if (savedOrderJson) {
                    try {
                        const orderedIds = JSON.parse(savedOrderJson);
                        const tasksInSavedOrder = [];
                        const combinedTasksMap = new Map(allTasksForToday.map(task => [task.id, task]));
                        orderedIds.forEach(id => {
                            if (combinedTasksMap.has(id)) {
                                tasksInSavedOrder.push(combinedTasksMap.get(id));
                                combinedTasksMap.delete(id);
                            }
                        });
                        const newTasksNotInSavedOrder = Array.from(combinedTasksMap.values());
                        finalOrderedTasks = [...tasksInSavedOrder, ...newTasksNotInSavedOrder];
                    } catch (e) {
                        finalOrderedTasks = allTasksForToday;
                    }
                } else {
                    finalOrderedTasks = allTasksForToday;
                }

                setTasks(finalOrderedTasks);
            } catch (error) {
                console.error("Error loading tasks:", error);
                setTasks([]);
            } finally {
                setIsLoadingTasks(false);
            }
        };
        loadTasksForToday();
    }, []); // Dependency array: Run once on mount

    // == Handlers ==
const handleSetCurrentTask = (taskId) => {
    if (dragItem.current) return;
    setCurrentTaskId(taskId);
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

// ... your other handler functions
    const handleTaskToggle = async (taskId, event) => {
        event.stopPropagation();
        if (isSavingTask) return;

        const taskIndex = tasks.findIndex(task => task.id === taskId);
        if (taskIndex === -1) return;

        const originalTask = tasks[taskIndex]; // Get the task before local state update
        const newCompletedStatus = !originalTask.completed; // The status it will become
        const newCompletedTimestamp = newCompletedStatus ? Timestamp.now() : null;

        // FIX: Update local productivity score directly based on the toggle action
        setProductivityScore(prevScore => newCompletedStatus ? prevScore + 1 : prevScore - 1);

        const locallyUpdatedTasks = tasks.map(t =>
            t.id === taskId ? { ...t, completed: newCompletedStatus, completedAt: newCompletedTimestamp } : t
        );

        // Update tasks state for recurring tasks' checkbox visuals, and for removing non-recurring tasks.
        // If it's a non-recurring task being completed, it will be filtered out by `tasksForTodayDisplay`
        // due to the update to its 'new_tasks' document status.
        setTasks(locallyUpdatedTasks);
        localStorage.setItem(TASK_ORDER_LS_KEY, JSON.stringify(locallyUpdatedTasks.map(t => t.id)));
        setIsSavingTask(true);

        try {
    // 1. Find the specific task that was toggled
    const task = tasks.find(t => t.id === taskId);
    if (!task) throw new Error("Task not found");

    // 2. Determine its theme
    let theme;
    if (task.type === 'recurring') {
        theme = recurringRoutineDefinitions[task.id]?.axisTheme;
    } else {
        theme = task.axisTheme;
    }

    // 3. Fetch the latest metrics from the database
    const metricsDocRef = doc(db, "dailyMetrics", todayDateStr);
    const metricsDocSnap = await getDoc(metricsDocRef);
    const existingData = metricsDocSnap.data() || {};

    // 4. Increment/decrement the counts
    const newProductivityScore = (existingData.productivityScore || 0) + (newCompletedStatus ? 1 : -1);
    const newAxisTaskCounts = { ...(existingData.axisTaskCounts || {}) };

    if (theme) {
        const currentThemeCount = newAxisTaskCounts[theme] || 0;
        newAxisTaskCounts[theme] = currentThemeCount + (newCompletedStatus ? 1 : -1);
        // Ensure count doesn't go below zero
        if (newAxisTaskCounts[theme] < 0) newAxisTaskCounts[theme] = 0;
    }
    
    // Also handle the recurring task status for the checkbox display
    const newTasksStatus = { ...(existingData.tasksStatus || {}) };
    if (task.type === 'recurring') {
        newTasksStatus[task.id] = { completed: newCompletedStatus, completedAt: newCompletedTimestamp };
    }

    // 5. Save everything back to the database
    await setDoc(metricsDocRef, {
        productivityScore: Math.max(0, newProductivityScore),
        axisTaskCounts: newAxisTaskCounts,
        tasksStatus: newTasksStatus,
        lastUpdated: serverTimestamp()
    }, { merge: true });

    // Update the global status for non-recurring tasks so they disappear on refresh
    if (task.originalId && task.type !== 'recurring') {
        const taskDocRef = doc(db, "new_tasks", task.originalId);
        await updateDoc(taskDocRef, { status: newCompletedStatus ? 'completed' : 'todo', completedAt: newCompletedTimestamp });
    }

} catch (error) {
    console.error("Error saving task status:", error);
    setTasks(tasks); // Revert local state on error
} finally {
    setIsSavingTask(false);
}
    };

    const handleAddAdHocTask = async () => {
        const text = adHocTaskText.trim();
        const axisToSave = selectedAxisTheme || (availableAxes.length > 0 ? availableAxes[0].name : 'Rest and preparation');
        if (!text || !axisToSave || isSavingAdHoc) return;

        setIsSavingAdHoc(true);
        const currentWeekIdValue = getWeekId();

        const adHocData = {
            title: text,
            axisTheme: axisToSave,
            parentId: currentWeekIdValue,
            parentType: 'weeklyPlan',
            taskType: 'ad-hoc',
            status: 'todo', // Ad-hoc tasks start as todo
            createdAt: serverTimestamp(),
            completedAt: null,
            assignedDate: todayDateStr,
        };

        try {
            const newDocRef = await addDoc(tasksCollectionRef, adHocData);
            const newTaskObject = {
                id: `task-${newDocRef.id}`,
                originalId: newDocRef.id,
                text: adHocData.title,
                completed: false, // New ad-hoc tasks are NOT completed
                completedAt: null,
                type: 'adhoc',
                axisTheme: adHocData.axisTheme,
                assignedDate: adHocData.assignedDate
            };
            setTasks(prevTasks => [newTaskObject, ...prevTasks]);
            setAdHocTaskText('');
        } catch (error) {
            console.error("Error adding ad-hoc task:", error);
        } finally {
            setIsSavingAdHoc(false);
            setFocusAdHocInput(true);
        }
    };

    const saveMoment = async (type, currentCount, detail) => {
        if (isSavingMoments || isSavingDetail) return;
        const today = getTodayDateString();
        const newCount = currentCount + 1;

        if (type === 'epiphany') setEpiphanyCount(newCount);
        else setDespairCount(newCount);

        setIsSavingMoments(true);
        const metricsDocRef = doc(db, "dailyMetrics", today);
        const countDataToSave = { [`${type}Count`]: newCount, lastUpdated: serverTimestamp() };

        try {
            await setDoc(metricsDocRef, countDataToSave, { merge: true });
        } catch (error) {
            console.error(`Error saving ${type} count:`, error);
            if (type === 'epiphany') setEpiphanyCount(currentCount);
            else setDespairCount(currentCount);
        } finally {
            setIsSavingMoments(false);
        }

        if (detail.trim()) {
            setIsSavingDetail(true);
            const detailData = { type, text: detail.trim(), date: today, timestamp: serverTimestamp() };
            try {
                await addDoc(collection(db, "momentsLog"), detailData);
                if (currentUser?.uid) {
                    saveCorpusEntry(currentUser.uid, {
                        type,
                        axis: ['mental'],
                        themes: type === 'epiphany' ? ['n+1'] : ['scared_voice'],
                        voice_markers: type === 'epiphany' ? ['breakthrough'] : [],
                        state: type === 'epiphany' ? 'flow' : 'despair',
                        significance: 3,
                        summary: detail.trim().slice(0, 150),
                        raw: detail.trim(),
                    }).catch(() => {});
                }
                if (type === 'epiphany') setEpiphanyDetail('');
                else setDespairDetail('');
            } catch (error) {
                console.error(`Error saving ${type} detail:`, error);
            } finally {
                setIsSavingDetail(false);
            }
        }

        // Refocus the input after save so the next entry can be typed immediately
        setFocusMomentInput(type);
    };

    const incrementEpiphany = () => saveMoment('epiphany', epiphanyCount, epiphanyDetail);
    const incrementDespair = () => saveMoment('despair', despairCount, despairDetail);

    const handleMomentKeyDown = (event, type) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (type === 'epiphany') {
                incrementEpiphany();
            } else if (type === 'despair') {
                incrementDespair();
            }
        }
    };

    const handleDragStart = (e, id) => {
        dragItem.current = id;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
        e.currentTarget.classList.add(styles.dragging);
    };

    const handleDragEnter = (e, id) => {
        dragOverItem.current = id;
        e.currentTarget.classList.add(styles.dragOver);
    };

    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove(styles.dragOver);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const draggedItemId = dragItem.current;
        const targetItemId = dragOverItem.current;
        const targetElement = e.currentTarget;
        if (targetElement) {
            targetElement.classList.remove(styles.dragOver);
        }
        if (!draggedItemId || !targetItemId || draggedItemId === targetItemId) {
            dragItem.current = null;
            dragOverItem.current = null;
            return;
        }
        setTasks(prevTasks => {
            const dragIndex = prevTasks.findIndex(task => task.id === draggedItemId);
            const targetIndex = prevTasks.findIndex(task => task.id === targetItemId);
            if (dragIndex === -1 || targetIndex === -1) {
                console.error("Drag/drop index error.");
                return prevTasks;
            }
            const newTasks = [...prevTasks];
            const [draggedItemValue] = newTasks.splice(dragIndex, 1);
            newTasks.splice(targetIndex, 0, draggedItemValue);
            localStorage.setItem(TASK_ORDER_LS_KEY, JSON.stringify(newTasks.map(t => t.id)));
            return newTasks;
        });
        dragItem.current = null;
        dragOverItem.current = null;
    };

    const handleDragEnd = (e) => {
        if (e.currentTarget) {
            e.currentTarget.classList.remove(styles.dragging);
        }
        document.querySelectorAll(`.${styles.dragOver}`).forEach(el => el.classList.remove(styles.dragOver));
        dragItem.current = null;
        dragOverItem.current = null;
    };

    // == Top 3 Handlers ==
    const saveTopThree = async (newTop3) => {
        const metricsDocRef = doc(db, "dailyMetrics", todayDateStr);
        await setDoc(metricsDocRef, { topThree: newTop3, lastUpdated: serverTimestamp() }, { merge: true });
    };

    const handleTopThreeTextChange = (i, text) => {
        setTopThree(prev => prev.map((s, idx) =>
            idx === i ? (s ? { ...s, text } : { text, axisTheme: availableAxes[0]?.name || '', completed: false, completedAt: null, originalTaskId: null }) : s
        ));
    };

    const handleTopThreeAxisChange = (i, axisTheme) => {
        setTopThree(prev => prev.map((s, idx) =>
            idx === i ? (s ? { ...s, axisTheme } : { text: '', axisTheme, completed: false, completedAt: null, originalTaskId: null }) : s
        ));
    };

    const handleTopThreeSave = async (i) => {
        const slot = topThree[i];
        if (!slot?.text?.trim()) return;
        await saveTopThree(topThree);
    };

    const handleTopThreeComplete = async (i) => {
        const slot = topThree[i];
        if (!slot || slot.completed) return;
        const newTop3 = topThree.map((s, idx) =>
            idx === i ? { ...s, completed: true, completedAt: Timestamp.now() } : s
        );
        setTopThree(newTop3);
        setConfettiBurst(i);
        setTimeout(() => setConfettiBurst(null), 1400);
        setProductivityScore(prev => prev + 5);
        try {
            const metricsDocRef = doc(db, "dailyMetrics", todayDateStr);
            const metricsSnap = await getDoc(metricsDocRef);
            const existing = metricsSnap.data() || {};
            const newScore = (existing.productivityScore || 0) + 5;
            const newAxisCounts = { ...(existing.axisTaskCounts || {}) };
            if (slot.axisTheme) newAxisCounts[slot.axisTheme] = (newAxisCounts[slot.axisTheme] || 0) + 5;
            await setDoc(metricsDocRef, { topThree: newTop3, productivityScore: newScore, axisTaskCounts: newAxisCounts, lastUpdated: serverTimestamp() }, { merge: true });
            if (slot.originalTaskId) {
                await updateDoc(doc(db, "new_tasks", slot.originalTaskId), { status: 'completed', completedAt: Timestamp.now() });
            }
        } catch (err) {
            console.error("Error completing top3 slot:", err);
        }
    };

    const handleTopThreeClear = async (i) => {
        const slot = topThree[i];
        const newTop3 = topThree.map((s, idx) => idx === i ? null : s);
        setTopThree(newTop3);
        if (slot?.originalTaskId) {
            await updateDoc(doc(db, "new_tasks", slot.originalTaskId), { status: 'todo' });
            setTasks(prev => [...prev, {
                id: `task-${slot.originalTaskId}`, originalId: slot.originalTaskId,
                text: slot.text, completed: false, completedAt: null,
                type: 'adhoc', axisTheme: slot.axisTheme, assignedDate: todayDateStr
            }]);
        }
        await saveTopThree(newTop3);
    };

    const handleTop3SlotDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleTop3SlotDrop = async (e, i) => {
        e.preventDefault();
        e.stopPropagation();
        if (topThree[i] !== null) return;
        const taskId = dragItem.current;
        if (!taskId) return;
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        const newSlot = { text: task.text, axisTheme: task.axisTheme || availableAxes[0]?.name || '', completed: false, completedAt: null, originalTaskId: task.originalId || null };
        const newTop3 = topThree.map((s, idx) => idx === i ? newSlot : s);
        setTopThree(newTop3);
        setTasks(prev => prev.filter(t => t.id !== taskId));
        dragItem.current = null;
        dragOverItem.current = null;
        await saveTopThree(newTop3);
    };

    const handleAssignedDateChange = (originalFirestoreId, newDateString) => {
        if (!originalFirestoreId || !newDateString) return;

        const task = tasks.find(t => t.originalId === originalFirestoreId);
        if (task?.type === 'recurring') return;
        if (newDateString <= todayDateStr) return;

        // Optimistic: remove from today's list immediately
        setTasks(prevTasks => prevTasks.filter(t => t.originalId !== originalFirestoreId));

        // Fire-and-forget Firestore update
        updateDoc(doc(db, "new_tasks", originalFirestoreId), { assignedDate: newDateString })
            .catch(err => console.error("Error updating assigned date:", err));
    };

    const handleStartPause = () => onSetIsTimerRunning(!isTimerRunning);
    const handleReset = () => { onSetIsTimerRunning(false); onSetIsTimerFinished(false); onSetTimerSeconds(pomodoroDurationMinutes * 60); };
    const formatTime = (seconds) => { const mins = Math.floor(seconds / 60); const secs = seconds % 60; return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`; };
    const handleDurationChange = (event) => { const newDuration = parseInt(event.target.value, 10); if (!isNaN(newDuration) && newDuration > 0) { onSetPomodoroDurationMinutes(newDuration); if (!isTimerRunning && !isTimerFinished) { onSetTimerSeconds(newDuration * 60); } } };
    const handleJournalChange = (event) => setJournalText(event.target.value);
    const handleJournalSave = async () => {
    if (!journalText.trim() || isSavingJournal) return; // Prevent saving empty thoughts

    setIsSavingJournal(true);

    const thoughtData = {
        text: journalText.trim(),
        createdAt: serverTimestamp(),
        date: getTodayDateString() // Using your existing helper function
    };

    try {
        const thoughtsCollectionRef = collection(db, "thoughtsLog");
        await addDoc(thoughtsCollectionRef, thoughtData);
        if (currentUser?.uid) {
            saveCorpusEntry(currentUser.uid, {
                type: 'journal',
                axis: ['mental'],
                themes: ['mental_os'],
                voice_markers: [],
                state: 'settled',
                significance: 2,
                summary: thoughtData.text.slice(0, 150),
                raw: thoughtData.text,
            }).catch(() => {});
        }
        setJournalText('');
    } catch (error) {
        console.error("Error saving thought:", error);
        // Optionally, show an error message to the user
    } finally {
        setIsSavingJournal(false);
    }
};
    const handleBreakReviewSubmit = (breakLogData) => closeBreakModal();
    const closeBreakModal = () => { setIsBreakModalOpen(false); setCurrentBreakIdea(''); setTimerFinishedAt(null); onSetIsTimerFinished(false); handleReset(); };
    const handleAdHocKeyDown = (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleAddAdHocTask(); } };

    // --- JSX FOR THE COMPONENT ---
    return (
        <div className={styles.nowViewContainer}>
            <h2 className={styles.viewTitle}>Now</h2>

            {/* Top 3 Section */}
            <div className={styles.top3Section}>
                <h3 className={styles.top3Title}>Top 3 Today <span className={styles.top3Points}>5 pts each</span></h3>
                <div className={styles.top3Row}>
                    {[0, 1, 2].map(i => {
                        const slot = topThree[i];
                        const isEmpty = !slot?.text?.trim();
                        const isComplete = slot?.completed;
                        const cssSuffix = axisNameToCssVarSuffix(slot?.axisTheme);
                        const slotStyle = slot?.axisTheme ? {
                            '--slot-color-dark': `var(--axis-color-${cssSuffix}-3, var(--axis-color-default-3))`,
                            '--slot-color-medium': `var(--axis-color-${cssSuffix}-2, var(--axis-color-default-2))`,
                            '--slot-color-light': `var(--axis-color-${cssSuffix}-1, var(--axis-color-default-1))`,
                        } : {};
                        return (
                            <div
                                key={i}
                                className={`${styles.top3Slot} ${isEmpty && !slot ? styles.top3Empty : ''} ${isComplete ? styles.top3Done : ''}`}
                                style={slotStyle}
                                onDragOver={handleTop3SlotDragOver}
                                onDrop={(e) => handleTop3SlotDrop(e, i)}
                            >
                                <div className={styles.top3SlotNum}>{i + 1}</div>
                                {confettiBurst === i && <ConfettiBurst />}
                                {isComplete ? (
                                    <>
                                        <div className={styles.top3CompleteOverlay}>
                                            <span className={styles.top3Check}>✓</span>
                                        </div>
                                        <p className={styles.top3DoneText}>{slot.text}</p>
                                        <button className={styles.top3AddAnother} onClick={() => handleTopThreeClear(i)}>+ Add Another</button>
                                    </>
                                ) : (
                                    <>
                                        <input
                                            type="text"
                                            className={styles.top3Input}
                                            placeholder="Drop a task or type here…"
                                            value={slot?.text || ''}
                                            onChange={(e) => handleTopThreeTextChange(i, e.target.value)}
                                            onBlur={() => handleTopThreeSave(i)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleTopThreeSave(i); }}
                                        />
                                        <div className={styles.top3Actions}>
                                            <select
                                                className={styles.top3Select}
                                                value={slot?.axisTheme || ''}
                                                onChange={(e) => { handleTopThreeAxisChange(i, e.target.value); }}
                                                onBlur={() => handleTopThreeSave(i)}
                                            >
                                                <option value="">Axis…</option>
                                                {availableAxes.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                                            </select>
                                            {slot?.text?.trim() && (
                                                <button className={styles.top3CompleteBtn} onClick={() => handleTopThreeComplete(i)}>✓ Done</button>
                                            )}
                                            {slot && (
                                                <button className={styles.top3ClearBtn} onClick={() => handleTopThreeClear(i)}>✕</button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Left Panel */}
            <div className={styles.leftPanel}>
                <div className={styles.momentsTracker}>
                    <div className={styles.momentEntry}>
                        <div className={styles.momentCounter}><span>Epiphany: {epiphanyCount}</span><button onClick={incrementEpiphany} className={styles.momentButton} disabled={isSavingMoments || isSavingDetail}>+</button></div>
                        <input
                            ref={epiphanyInputRef}
                            type="text"
                            value={epiphanyDetail}
                            onChange={(e) => setEpiphanyDetail(e.target.value)}
                            onKeyDown={(e) => handleMomentKeyDown(e, 'epiphany')}
                            placeholder="Epiphany detail..."
                            className={styles.momentInput}
                            disabled={isSavingMoments || isSavingDetail}
                        />
                    </div>
                    <div className={styles.momentEntry}>
                        <div className={styles.momentCounter}><span>Despair: {despairCount}</span><button onClick={incrementDespair} className={styles.momentButton} disabled={isSavingMoments || isSavingDetail}>+</button></div>
                        <input
                            ref={despairInputRef}
                            type="text"
                            value={despairDetail}
                            onChange={(e) => setDespairDetail(e.target.value)}
                            onKeyDown={(e) => handleMomentKeyDown(e, 'despair')}
                            placeholder="Despair detail..."
                            className={styles.momentInput}
                            disabled={isSavingMoments || isSavingDetail}
                        />
                    </div>
                </div>
                {/* Display the productivityScore directly from the state */}
                <div className={styles.productivityDisplay}>Productivity: <span className={styles.score}>{productivityScore}</span></div>
                {/* Optional: You could display firestoreAxisTaskCounts for debugging or specific UI elements */}
                {/* <div style={{marginTop: '10px', fontSize: '0.8em'}}>
                    Axis Counts (Loaded):
                    {Object.entries(firestoreAxisTaskCounts).map(([axis, count]) => (
                        <div key={axis}>{axis}: {count}</div>
                    ))}
                </div> */}

                <div className={styles.journalPlaceholder}>
                    <label htmlFor="nowJournal" className={styles.journalLabel}>Quick Thought:</label>
                    <textarea id="nowJournal" value={journalText} onChange={handleJournalChange} placeholder="Jot down quick thoughts..." rows="3" className={styles.journalTextarea} disabled={isSavingJournal} />
                    <button onClick={handleJournalSave} disabled={isSavingJournal || !journalText.trim()} className={styles.saveJournalButton}>{isSavingJournal ? 'Saving...' : 'Save Thought'}</button>
                    <button type="button" onClick={() => setIsFlashcardModalOpen(true)} className={styles.flashcardButton} style={{ marginTop: '0.5rem', width: '100%' }} > Study Flashcards </button>
                </div>
                <div className={styles.gymTimeCard} onClick={() => setIsPhysicalDashboardOpen(true)}>
                    <span className={styles.gymTimeEmoji}>💪</span>
                    <span className={styles.gymTimeText}>Gym Time!</span>
                </div>
                <PeriodQuickLog />
            </div>

            {/* Center Panel */}
            <div className={styles.centerPanel}>
                <div className={styles.taskListContainer}>
                    <h3 className={styles.sectionTitle}>Today's Tasks</h3>
                    <div className={styles.currentTaskDisplay}>
                        {isLoadingTasks && tasksToShowInDisplayBox.length === 0 && (<span className={styles.noTasksMessage}>Loading...</span>)}
                        {!isLoadingTasks && tasksToShowInDisplayBox.length === 0 && (<span className={styles.noTasksMessage}>No tasks for today!</span>)}
                        {tasksToShowInDisplayBox.map((task, index) => (
                            <div key={task.id} className={`${styles.upcomingTaskItem} ${styles[`upcomingTaskItem${index}`]}`}>
                                {task.text}
                            </div>
                        ))}
                    </div>
                    <div className={styles.taskList} >
                        {isLoadingTasks ? (<p>Loading tasks...</p>) :
                            tasksForTodayDisplay.length > 0 ? (
                                tasksForTodayDisplay.map((task) => {
                                    const cssSuffix = axisNameToCssVarSuffix(task.axisTheme);
                                    const taskStyle = { '--task-color-dark': `var(--axis-color-${cssSuffix}-3, var(--axis-color-default-3))`, '--task-color-medium': `var(--axis-color-${cssSuffix}-2, var(--axis-color-default-2))`, '--task-color-light': `var(--axis-color-${cssSuffix}-1, var(--axis-color-default-1))` };
                                    const assignedDateValue = task.assignedDate || '';
                                    

                                    const pendingDate = pendingDates[task.originalId];

                                    return (
                                        <div
                                            key={task.id}
                                            className={`${styles.taskItem} ${task.completed ? styles.completedTask : ''} ${task.id === currentTaskId ? styles.selectedTask : ''}`}
                                            title={`${task.text}${task.axisTheme ? `\nAxis: ${task.axisTheme}` : ''}`}
                                            style={taskStyle}
                                            draggable={!task.completed}
                                            onDragStart={(e) => !task.completed && handleDragStart(e, task.id)}
                                            onDragEnter={(e) => !task.completed && handleDragEnter(e, task.id)}
                                            onDragLeave={handleDragLeave}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => !task.completed && handleDrop(e)}
                                            onDragEnd={handleDragEnd}
                                            onClick={() => !task.completed && handleSetCurrentTask(task.id)}
                                        >
                                            <div className={styles.taskMainRow}>
                                                <div className={styles.checkboxContainer} onClick={(e) => e.stopPropagation()}>
                                                    <input type="checkbox" id={`task-checkbox-${task.id}`} checked={task.completed} onChange={(e) => handleTaskToggle(task.id, e)} className={styles.checkbox} disabled={isSavingTask} />
                                                    <label htmlFor={`task-checkbox-${task.id}`} className={styles.checkboxCustom}></label>
                                                </div>
                                                <label className={styles.taskLabel}>{task.text}</label>
                                                {task.type !== 'recurring' && !task.completed && (
                                                    <div className={styles.rescheduleGroup} onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="date"
                                                            className={styles.dueDateInput}
                                                            value={pendingDate || assignedDateValue}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Escape') {
                                                                    clearTimeout(dateTimerRef.current[task.originalId]);
                                                                    delete dateTimerRef.current[task.originalId];
                                                                    setPendingDates(prev => { const n = {...prev}; delete n[task.originalId]; return n; });
                                                                }
                                                            }}
                                                            onChange={(e) => {
                                                                const newDate = e.target.value;
                                                                const tid = task.originalId;
                                                                setPendingDates(prev => ({ ...prev, [tid]: newDate }));
                                                                // Reset debounce timer — navigation clicks keep resetting it,
                                                                // final day-click lets it fire after 6s (or immediately on blur)
                                                                clearTimeout(dateTimerRef.current[tid]);
                                                                if (newDate && newDate.length === 10 && newDate > todayDateStr && newDate !== assignedDateValue) {
                                                                    dateTimerRef.current[tid] = setTimeout(() => {
                                                                        delete dateTimerRef.current[tid];
                                                                        handleAssignedDateChange(tid, newDate);
                                                                        setPendingDates(prev => { const n = {...prev}; delete n[tid]; return n; });
                                                                    }, 6000);
                                                                }
                                                            }}
                                                            onBlur={() => {
                                                                // If a timer is waiting, fire it immediately instead of waiting 600ms
                                                                const tid = task.originalId;
                                                                if (dateTimerRef.current[tid]) {
                                                                    clearTimeout(dateTimerRef.current[tid]);
                                                                    delete dateTimerRef.current[tid];
                                                                    const p = pendingDates[tid];
                                                                    if (p && p > todayDateStr && p !== assignedDateValue) {
                                                                        handleAssignedDateChange(tid, p);
                                                                        setPendingDates(prev => { const n = {...prev}; delete n[tid]; return n; });
                                                                    }
                                                                }
                                                            }}
                                                            min={todayDateStr}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p>No tasks assigned for today.</p>
                            )
                        }
                    </div>
                </div>
                <div className={styles.adHocForm}>
                    <h4 className={styles.adHocTitle}>Add Task</h4>
                    <textarea ref={adHocInputRef} rows="2" placeholder="Enter new task..." value={adHocTaskText} onChange={(e) => setAdHocTaskText(e.target.value)} onKeyDown={handleAdHocKeyDown} className={styles.adHocTextarea} disabled={isSavingAdHoc} />
                    <div className={styles.adHocControls}>
                        <select value={selectedAxisTheme} onChange={(e) => setSelectedAxisTheme(e.target.value)} className={styles.adHocSelect} disabled={isSavingAdHoc || availableAxes.length === 0} >
                            <option value="" disabled={selectedAxisTheme !== ""}>Select Axis</option>
                            {availableAxes.map(axis => (<option key={axis.id} value={axis.name}>{axis.name}</option>))}
                        </select>
                        <button onClick={handleAddAdHocTask} disabled={!adHocTaskText.trim() || !selectedAxisTheme || isSavingAdHoc || availableAxes.length === 0} className={styles.adHocButton} >
                            {isSavingAdHoc ? 'Adding...' : 'Add Task'}
                        </button>
                    </div>
                </div>
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
                <div className={styles.timerSection}>
                    <DearAbiMarquee theme={currentMonthTheme} />
                </div>
                <SprintSnapshot />
            </div>

            {/* Modals */}
            {isBreakModalOpen && (<Modal isOpen={isBreakModalOpen} onClose={closeBreakModal}> <BreakReviewForm onSubmit={handleBreakReviewSubmit} onClose={closeBreakModal} pomodoroDuration={pomodoroDurationMinutes} timerFinishedTimestamp={timerFinishedAt} currentTask={tasks.find(t => t.id === currentTaskId)} /> </Modal>)}
            {isFlashcardModalOpen && (<StudyFlashcardsModal isOpen={isFlashcardModalOpen} onClose={() => setIsFlashcardModalOpen(false)} />)}
            {isPhysicalDashboardOpen && (<Modal isOpen={isPhysicalDashboardOpen} onClose={() => setIsPhysicalDashboardOpen(false)}><ErrorBoundary><Suspense fallback={<div>Loading...</div>}><FitnessAchievementDashboard /></Suspense></ErrorBoundary></Modal>)}
        </div>
    );
}

export default NowView;