// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import styles from './App.module.css'; // Your existing App.module.css
import { Howl, Howler } from 'howler';

// Import Firestore db instance
import { db } from './firebaseConfig';

// Import view components
import NowView from './components/NowView/NowView';
import DailyView from './components/DailyView/DailyView';
import WeeklyView from './components/WeeklyView/WeeklyView';
import MonthlyView from './components/MonthlyView/MonthlyView';
import YearlyView from './components/YearlyView/YearlyView';
import ParetoView from './components/ParetoView/ParetoView';
import LifeMapView from './components/LifeMapView/LifeMapView';
import ScrapPaper from './components/ScrapPaper/ScrapPaper';
import ProjectMapGenerator from './components/ProjectMapGenerator/ProjectMapGenerator'; // <-- ADDED IMPORT

// Import the new ThePointSection component
import ThePointSection from './components/ThePointSection/ThePointSection';

// Constants for view names
const VIEWS = {
    NOW: 'now',
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    YEARLY: 'yearly',
    PARETO: 'pareto',
    LIFE: 'life',
    SCRAPPAPER: 'scrappaper',
    PROJECTMAPGENERATOR: 'projectmapgenerator', // <-- ADDED VIEW KEY (matches toUpperCase() of 'ProjectMapGenerator')
};

// Default Pomodoro timer duration
const DEFAULT_POMODORO_MINUTES = 20;

// LocalStorage keys
const LS_KEYS = {
    CURRENT_TASK_ID: 'productivityApp_currentTaskId',
    POMODORO_DURATION: 'productivityApp_pomodoroDurationMinutes',
    TIMER_SECONDS: 'productivityApp_timerSeconds',
    IS_TIMER_RUNNING: 'productivityApp_isTimerRunning',
};

// Array of timer sound file paths
const timerSounds = [
    '/sounds/082569_robot-voice-let39s-get-it-on-82780.mp3',
    '/sounds/applause-2-31567.mp3',
    // ... (other sounds remain the same) ...
    '/sounds/Yeahoh.mp3'
];

// Helper function to load state from localStorage
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

// Main App component
function App() {
    const [currentView, setCurrentView] = useState(VIEWS.NOW);
    const [currentTaskId, setCurrentTaskId] = useState(() => loadState(LS_KEYS.CURRENT_TASK_ID, null));
    const [pomodoroDurationMinutes, setPomodoroDurationMinutes] = useState(() => loadState(LS_KEYS.POMODORO_DURATION, DEFAULT_POMODORO_MINUTES));
    const [timerSeconds, setTimerSeconds] = useState(() => loadState(LS_KEYS.TIMER_SECONDS, loadState(LS_KEYS.POMODORO_DURATION, DEFAULT_POMODORO_MINUTES) * 60));
    const [isTimerRunning, setIsTimerRunning] = useState(() => loadState(LS_KEYS.IS_TIMER_RUNNING, false));
    const [isTimerFinished, setIsTimerFinished] = useState(false);

    const intervalRef = useRef(null);
    const soundRef = useRef(null);
    const nextSoundIndexRef = useRef(0);

    // Effect to save currentTaskId to localStorage
    useEffect(() => {
        if (currentTaskId !== null) {
            localStorage.setItem(LS_KEYS.CURRENT_TASK_ID, currentTaskId);
        } else {
            localStorage.removeItem(LS_KEYS.CURRENT_TASK_ID);
        }
    }, [currentTaskId]);

    // Effect to save pomodoroDurationMinutes to localStorage
    useEffect(() => {
        localStorage.setItem(LS_KEYS.POMODORO_DURATION, String(pomodoroDurationMinutes));
    }, [pomodoroDurationMinutes]);

    // Effect to save timerSeconds to localStorage
    useEffect(() => {
        localStorage.setItem(LS_KEYS.TIMER_SECONDS, String(timerSeconds));
    }, [timerSeconds]);

    // Effect to save isTimerRunning to localStorage
    useEffect(() => {
        localStorage.setItem(LS_KEYS.IS_TIMER_RUNNING, String(isTimerRunning));
    }, [isTimerRunning]);

    // Effect for timer logic and sound playback
    useEffect(() => {
        const selectNextSound = () => {
            if (!timerSounds || timerSounds.length === 0) return null;
            const soundIndex = nextSoundIndexRef.current;
            const selectedSound = timerSounds[soundIndex];
            nextSoundIndexRef.current = (soundIndex + 1) % timerSounds.length;
            return selectedSound;
        };

        if (isTimerRunning && timerSeconds > 0) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(() => {
                setTimerSeconds((prevSeconds) => {
                    if (prevSeconds <= 1) {
                        clearInterval(intervalRef.current);
                        setIsTimerRunning(false);
                        setIsTimerFinished(true);
                        const soundToPlay = selectNextSound();
                        if (soundToPlay) {
                            try {
                                if (soundRef.current) {
                                    soundRef.current.stop();
                                    soundRef.current.unload();
                                }
                                soundRef.current = new Howl({
                                    src: [soundToPlay],
                                    html5: true,
                                    onload: () => soundRef.current.play(),
                                    onloaderror: (id, err) => console.error("App.jsx: Howler load error:", id, err),
                                    onplayerror: (id, err) => console.error("App.jsx: Howler play error:", id, err)
                                });
                            } catch (error) {
                                console.error("App.jsx: Error initializing Howl:", error);
                            }
                        } else {
                            console.warn("App.jsx: No timer sounds found or array is empty.");
                        }
                        return 0;
                    }
                    return prevSeconds - 1;
                });
            }, 1000);
        } else if (!isTimerRunning && intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isTimerRunning, timerSeconds]);

    // Effect to unload sound on component unmount
    useEffect(() => {
        return () => {
            soundRef.current?.unload();
        };
    }, []);

    // Handler functions for Pomodoro timer state
    const handleSetCurrentTask = (taskId) => { setCurrentTaskId(taskId); };
    const handleSetTimerSeconds = (seconds) => { setTimerSeconds(seconds); };
    const handleSetIsTimerRunning = (isRunning) => {
        if (isRunning) { setIsTimerFinished(false); }
        setIsTimerRunning(isRunning);
    };
    const handleSetIsTimerFinished = (isFinished) => {
        setIsTimerFinished(isFinished);
        if (isFinished) { setIsTimerRunning(false); }
    };
    const handleSetPomodoroDurationMinutes = (minutes) => {
        const newDurationSeconds = minutes * 60;
        setPomodoroDurationMinutes(minutes);
        if (!isTimerRunning) {
            setTimerSeconds(newDurationSeconds);
            setIsTimerFinished(false);
        }
    };

    // Handler for view navigation
    const handleNavigation = (viewKey) => { // viewKey is like 'ProjectMapGenerator' from ScrapPaper
        console.log(`App.jsx: handleNavigate called with viewKey: "${viewKey}"`);
        const targetViewKeyConstant = viewKey.toUpperCase(); // Converts 'ProjectMapGenerator' to 'PROJECTMAPGENERATOR'
        const targetViewValue = VIEWS[targetViewKeyConstant]; // Looks up VIEWS.PROJECTMAPGENERATOR
        console.log(`App.jsx: targetViewKeyConstant is "${targetViewKeyConstant}", targetViewValue is "${targetViewValue}"`);
        if (targetViewValue) {
            setCurrentView(targetViewValue); // Sets currentView to 'projectmapgenerator'
            console.log(`App.jsx: Attempting to set currentView to "${targetViewValue}"`);
        } else {
            console.warn(`App.jsx: Invalid view key: "${viewKey}" (Processed as "${targetViewKeyConstant}"). No navigation will occur.`);
        }
    };

    useEffect(() => {
        console.log(`App.jsx: currentView changed to: "${currentView}"`);
    }, [currentView]);

    const renderCurrentView = () => {
        const commonProps = {
            currentTaskId,
            onSetCurrentTask: handleSetCurrentTask,
            pomodoroDurationMinutes,
            timerSeconds,
            isTimerRunning,
            isTimerFinished,
            onSetPomodoroDurationMinutes: handleSetPomodoroDurationMinutes,
            onSetTimerSeconds: handleSetTimerSeconds,
            onSetIsTimerRunning: handleSetIsTimerRunning,
            onSetIsTimerFinished: handleSetIsTimerFinished,
        };
        switch (currentView) {
            case VIEWS.NOW: return <NowView {...commonProps} />;
            case VIEWS.DAILY: return <DailyView />;
            case VIEWS.WEEKLY: return <WeeklyView onNavigate={handleNavigation} />;
            case VIEWS.MONTHLY: return <MonthlyView />;
            case VIEWS.YEARLY: return <YearlyView />;
            case VIEWS.PARETO: return <ParetoView />;
            case VIEWS.LIFE: return <LifeMapView />;
            case VIEWS.SCRAPPAPER:
                console.log("App.jsx: Rendering ScrapPaper, passing onNavigate prop.");
                return <ScrapPaper onNavigate={handleNavigation} />;
            case VIEWS.PROJECTMAPGENERATOR: // <-- ADDED CASE
                console.log("App.jsx: Rendering ProjectMapGenerator.");
                return <ProjectMapGenerator />;
            default:
                console.warn("App.jsx: Invalid view selected, defaulting to NOW view.");
                return <NowView {...commonProps} />;
        }
    };

    const buttonStyle = { margin: '0.5rem', padding: '0.5rem 1rem', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#e7e7e7', transition: 'background-color 0.2s ease', fontSize: '0.9em' };
    const activeButtonStyle = { ...buttonStyle, backgroundColor: '#a0a0a0', fontWeight: 'bold', borderColor: '#888' };
    const scrapPaperButtonStyle = { ...buttonStyle, backgroundColor: '#ffc107', color: '#212529' };
    const activeScrapPaperButtonStyle = { ...scrapPaperButtonStyle, backgroundColor: '#e0a800', fontWeight: 'bold' };

    return (
        <div className={styles.appContainer}>
            <div style={{ marginBottom: '1rem', flexWrap: 'wrap', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <button style={currentView === VIEWS.LIFE ? activeButtonStyle : buttonStyle} onClick={() => handleNavigation('LIFE')}>Life Map</button>
                <button style={currentView === VIEWS.PARETO ? activeButtonStyle : buttonStyle} onClick={() => handleNavigation('PARETO')}>Pareto</button>
                <button style={currentView === VIEWS.YEARLY ? activeButtonStyle : buttonStyle} onClick={() => handleNavigation('YEARLY')}>Yearly</button>
                <button style={currentView === VIEWS.MONTHLY ? activeButtonStyle : buttonStyle} onClick={() => handleNavigation('MONTHLY')}>Monthly</button>
                <button style={currentView === VIEWS.WEEKLY ? activeButtonStyle : buttonStyle} onClick={() => handleNavigation('WEEKLY')}>Weekly</button>
                <button style={currentView === VIEWS.DAILY ? activeButtonStyle : buttonStyle} onClick={() => handleNavigation('DAILY')}>Daily</button>
                <button style={currentView === VIEWS.NOW ? activeButtonStyle : buttonStyle} onClick={() => handleNavigation('NOW')}>Now</button>
                <button style={currentView === VIEWS.SCRAPPAPER ? activeScrapPaperButtonStyle : scrapPaperButtonStyle} onClick={() => handleNavigation('SCRAPPAPER')}>
                    📝 Scrap Paper
                </button>
                {/* You could add a direct navigation button here for ProjectMapGenerator if desired */}
                {/* <button style={currentView === VIEWS.PROJECTMAPGENERATOR ? activeButtonStyle : buttonStyle} onClick={() => handleNavigation('PROJECTMAPGENERATOR')}>Project Map Gen</button> */}
            </div>

            <ThePointSection db={db} />

            <div className={styles.contentArea}>
                {renderCurrentView()}
            </div>
        </div>
    );
}

export default App;
