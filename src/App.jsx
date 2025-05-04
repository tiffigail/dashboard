// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import styles from './App.module.css';
import { Howl, Howler } from 'howler'; // Import Howl

// Import view components...
import NowView from './components/NowView/NowView';
import DailyView from './components/DailyView/DailyView';
import WeeklyView from './components/WeeklyView/WeeklyView';
import MonthlyView from './components/MonthlyView/MonthlyView';
import YearlyView from './components/YearlyView/YearlyView';
import ParetoView from './components/ParetoView/ParetoView';
import LifeMapView from './components/LifeMapView/LifeMapView';

// Define constants for view names
const VIEWS = {
    NOW: 'now',
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    YEARLY: 'yearly',
    PARETO: 'pareto',
    LIFE: 'life',
};

// Default Pomodoro Duration (in minutes)
const DEFAULT_POMODORO_MINUTES = 20;

// --- localStorage Keys ---
const LS_KEYS = {
    CURRENT_TASK_ID: 'productivityApp_currentTaskId',
    POMODORO_DURATION: 'productivityApp_pomodoroDurationMinutes',
    TIMER_SECONDS: 'productivityApp_timerSeconds',
    IS_TIMER_RUNNING: 'productivityApp_isTimerRunning',
};

// <<< Define Timer Sounds (Ensure all paths are correct) >>>
const timerSounds = [
    // NOTE: Ensure these paths are correct relative to the 'public' folder
    '/sounds/082569_robot-voice-let39s-get-it-on-82780.mp3',
    '/sounds/applause-2-31567.mp3',
    '/sounds/applause-105579.mp3',
    '/sounds/applause-cheer-236786.mp3',
    '/sounds/bam-bam-bolam-82704.mp3',
    '/sounds/brass-fanfare-with-timpani-and-winchimes-reverberated-146260.mp3',
    '/sounds/congratulations-deep-voice-172193.mp3',
    '/sounds/easy-does-it-slow-down-spoken-204539.mp3',
    '/sounds/elephant-triumph-sfx-293300.mp3',
    '/sounds/endingelevator-152337.mp3',
    '/sounds/female-voice-and-so-it-begins-62244.mp3',
    '/sounds/female-voice-and-this-is-how-it-ends-26030.mp3',
    '/sounds/gonna-do-it-36184.mp3',
    '/sounds/great-way-to-end-42202.mp3',
    '/sounds/old-internet-modem-dialing-189735.mp3',
    '/sounds/paft-drunk-no-play-no-games-sons-of-arcade-mix-212504.mp3',
    '/sounds/sound-effect-crowd-applause-and-cheering-23775.mp3',
    '/sounds/sound-effects-finger-snap-with-reverb-113861.mp3',
    '/sounds/triumph-83761.mp3',
    '/sounds/triumphant-yes-x2-103141.mp3',
    '/sounds/victory-96688.mp3',
    '/sounds/wait-what-198328.mp3',
    '/sounds/what-did-you-say-41026.mp3',
    '/sounds/whatwouldmothersay-99778.mp3',
    '/sounds/winner-bell-game-show-91932.mp3',
    '/sounds/yeah-boy-2-244326.mp3',
    '/sounds/Yeaoh.mp3'
];

// --- Helper to load state from localStorage ---
const loadState = (key, defaultValue) => {
    try {
        const saved = localStorage.getItem(key);
        if (saved === null) {
            return defaultValue;
        }
        if (typeof defaultValue === 'number') {
            const parsed = parseFloat(saved);
            return isNaN(parsed) ? defaultValue : parsed;
        }
        if (typeof defaultValue === 'boolean') {
            return saved === 'true';
        }
        return saved;
    } catch (error) {
        console.error(`Error reading localStorage key “${key}”:`, error);
        return defaultValue;
    }
};


function App() {
    // State variable to hold the currently active view name
    const [currentView, setCurrentView] = useState(VIEWS.NOW);

    // --- Lifted State with localStorage Persistence ---
    const [currentTaskId, setCurrentTaskId] = useState(() => loadState(LS_KEYS.CURRENT_TASK_ID, null));
    const [pomodoroDurationMinutes, setPomodoroDurationMinutes] = useState(() => loadState(LS_KEYS.POMODORO_DURATION, DEFAULT_POMODORO_MINUTES));
    const [timerSeconds, setTimerSeconds] = useState(() => loadState(LS_KEYS.TIMER_SECONDS, loadState(LS_KEYS.POMODORO_DURATION, DEFAULT_POMODORO_MINUTES) * 60));
    const [isTimerRunning, setIsTimerRunning] = useState(() => loadState(LS_KEYS.IS_TIMER_RUNNING, false));
    const [isTimerFinished, setIsTimerFinished] = useState(false);

    // --- Refs ---
    const intervalRef = useRef(null);
    const soundRef = useRef(null); // Ref for the main timer sound Howl instance
    const nextSoundIndexRef = useRef(0); // <<< Ref to track the index for rotation

    // --- Effects to Save State Changes to localStorage ---
    useEffect(() => {
        if (currentTaskId !== null) {
            localStorage.setItem(LS_KEYS.CURRENT_TASK_ID, currentTaskId);
        } else {
            localStorage.removeItem(LS_KEYS.CURRENT_TASK_ID);
        }
    }, [currentTaskId]);

    useEffect(() => {
        localStorage.setItem(LS_KEYS.POMODORO_DURATION, String(pomodoroDurationMinutes));
    }, [pomodoroDurationMinutes]);

    useEffect(() => {
        localStorage.setItem(LS_KEYS.TIMER_SECONDS, String(timerSeconds));
    }, [timerSeconds]);

    useEffect(() => {
        localStorage.setItem(LS_KEYS.IS_TIMER_RUNNING, String(isTimerRunning));
    }, [isTimerRunning]);
    // --- End Save Effects ---

    // --- Global Timer Logic Effect (Handles countdown and sound) ---
    useEffect(() => {
        // <<< Function to select the NEXT sound in sequence >>>
        const selectNextSound = () => {
            if (!timerSounds || timerSounds.length === 0) return null; // Handle empty array

            // Get the sound at the current index
            const soundIndex = nextSoundIndexRef.current;
            const selectedSound = timerSounds[soundIndex];

            // Increment the index for the next time, wrapping around if needed
            nextSoundIndexRef.current = (soundIndex + 1) % timerSounds.length;

            return selectedSound;
        };

        if (isTimerRunning && timerSeconds > 0) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }

            intervalRef.current = setInterval(() => {
                setTimerSeconds((prevSeconds) => {
                    if (prevSeconds <= 1) {
                        clearInterval(intervalRef.current);
                        setIsTimerRunning(false);
                        setIsTimerFinished(true);

                        // <<< Play Sound Logic HERE (Using Rotation) >>>
                        // WARNING: Still might be blocked by browser autoplay policy!
                        const soundToPlay = selectNextSound(); // <<< Use the rotation function
                        console.log(`App.jsx: Timer finished. Attempting to play sound #${nextSoundIndexRef.current} (rotated):`, soundToPlay);

                        if (soundToPlay) {
                            try {
                                if (soundRef.current) {
                                    console.log("App.jsx: Stopping/unloading previous sound.");
                                    soundRef.current.stop();
                                    soundRef.current.unload();
                                }
                                console.log("App.jsx: Creating new Howl instance for", soundToPlay);
                                soundRef.current = new Howl({
                                    src: [soundToPlay],
                                    html5: true,
                                    onload: () => {
                                        console.log("App.jsx: Sound loaded successfully, attempting play:", soundToPlay);
                                        soundRef.current.play();
                                    },
                                    onloaderror: (id, err) => {
                                        console.error("App.jsx: Howler load error:", id, err);
                                    },
                                    onplayerror: (id, err) => {
                                        console.error("App.jsx: Howler play error:", id, err);
                                    }
                                });
                            } catch (error) {
                                console.error("App.jsx: Error initializing Howl:", error);
                            }
                        } else {
                            console.warn("App.jsx: No timer sounds found in the 'timerSounds' array.");
                        }
                        // <<< End Sound Logic >>>

                        return 0; // Set timer to 0
                    }
                    return prevSeconds - 1; // Decrement seconds
                });
            }, 1000); // Interval runs every second

        } else if (!isTimerRunning && intervalRef.current) {
            // Clear interval if timer is stopped externally
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        // Cleanup function for this effect: Clear interval on unmount or dependency change
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
        // Dependencies: Re-run effect if running state or seconds change
    }, [isTimerRunning, timerSeconds]);
    // --- End Global Timer Logic Effect ---

     // --- Component Unmount Cleanup ---
     useEffect(() => {
        // Cleanup sound resources when the main App component unmounts
        return () => {
            console.log("App.jsx: Main component unmounting. Unloading sound.");
            soundRef.current?.unload();
        };
    }, []); // Empty dependency array means run only on mount/unmount

    // --- Handlers for Lifted State ---
    const handleSetCurrentTask = (taskId) => {
        setCurrentTaskId(taskId);
    };

    const handleSetTimerSeconds = (seconds) => {
         setTimerSeconds(seconds);
     }

    const handleSetIsTimerRunning = (isRunning) => {
        // When starting the timer, ensure finished flag is false
        if (isRunning) {
            setIsTimerFinished(false);
        }
        setIsTimerRunning(isRunning);
    }

    const handleSetIsTimerFinished = (isFinished) => {
        setIsTimerFinished(isFinished);
        // If marked finished, ensure timer is stopped
        if (isFinished) {
            setIsTimerRunning(false);
        }
    }

    const handleSetPomodoroDurationMinutes = (minutes) => {
        const newDurationSeconds = minutes * 60;
        setPomodoroDurationMinutes(minutes);
        // Only reset timer seconds if timer is not currently running
        if (!isTimerRunning) {
             setTimerSeconds(newDurationSeconds);
             setIsTimerFinished(false); // Reset finished state too
        }
    }

    const handleNavigate = (viewKey) => {
        const targetView = viewKey.toUpperCase();
        if (VIEWS[targetView]) {
             setCurrentView(VIEWS[targetView]);
             console.log(`Navigating to ${VIEWS[targetView]}`);
        } else {
             console.warn(`Attempted to navigate to invalid view key: ${viewKey}`);
        }
    };
    // --- End Handlers ---


    // Function to render the correct view component based on state
    const renderCurrentView = () => {
        switch (currentView) {
            case VIEWS.NOW:
                return <NowView
                            currentTaskId={currentTaskId}
                            onSetCurrentTask={handleSetCurrentTask}
                            pomodoroDurationMinutes={pomodoroDurationMinutes}
                            timerSeconds={timerSeconds}
                            isTimerRunning={isTimerRunning}
                            isTimerFinished={isTimerFinished}
                            onSetPomodoroDurationMinutes={handleSetPomodoroDurationMinutes}
                            onSetTimerSeconds={handleSetTimerSeconds}
                            onSetIsTimerRunning={handleSetIsTimerRunning}
                            onSetIsTimerFinished={handleSetIsTimerFinished}
                        />;
            // ... other cases remain the same
            case VIEWS.DAILY: return <DailyView />;
            case VIEWS.WEEKLY: return <WeeklyView onNavigate={handleNavigate} />;
            case VIEWS.MONTHLY: return <MonthlyView />;
            case VIEWS.YEARLY: return <YearlyView />;
            case VIEWS.PARETO: return <ParetoView />;
            case VIEWS.LIFE: return <LifeMapView />;
            default:
                console.warn("Invalid view selected, defaulting to NOW view.");
                return <NowView
                            currentTaskId={currentTaskId}
                            onSetCurrentTask={handleSetCurrentTask}
                            pomodoroDurationMinutes={pomodoroDurationMinutes}
                            timerSeconds={timerSeconds}
                            isTimerRunning={isTimerRunning}
                            isTimerFinished={isTimerFinished}
                            onSetPomodoroDurationMinutes={handleSetPomodoroDurationMinutes}
                            onSetTimerSeconds={handleSetTimerSeconds}
                            onSetIsTimerRunning={handleSetIsTimerRunning}
                            onSetIsTimerFinished={handleSetIsTimerFinished}
                        />;
        }
    };

    // Button styles...
    const buttonStyle = {
        margin: '0.5rem', padding: '0.5rem 1rem', cursor: 'pointer',
        border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#e7e7e7',
        transition: 'background-color 0.2s ease',
    };
    const activeButtonStyle = {
        ...buttonStyle, backgroundColor: '#a0a0a0',
        fontWeight: 'bold', borderColor: '#888',
    };


    return (
        <div className={styles.appContainer}>
            {/* Navigation Buttons */}
            <div style={{ marginBottom: '1rem', flexWrap: 'wrap', display: 'flex', justifyContent: 'center' }}>
                <button style={currentView === VIEWS.LIFE ? activeButtonStyle : buttonStyle} onClick={() => handleNavigate('LIFE')}>Life Map</button>
                <button style={currentView === VIEWS.PARETO ? activeButtonStyle : buttonStyle} onClick={() => handleNavigate('PARETO')}>Pareto</button>
                <button style={currentView === VIEWS.YEARLY ? activeButtonStyle : buttonStyle} onClick={() => handleNavigate('YEARLY')}>Yearly</button>
                <button style={currentView === VIEWS.MONTHLY ? activeButtonStyle : buttonStyle} onClick={() => handleNavigate('MONTHLY')}>Monthly</button>
                <button style={currentView === VIEWS.WEEKLY ? activeButtonStyle : buttonStyle} onClick={() => handleNavigate('WEEKLY')}>Weekly</button>
                <button style={currentView === VIEWS.DAILY ? activeButtonStyle : buttonStyle} onClick={() => handleNavigate('DAILY')}>Daily</button>
                <button style={currentView === VIEWS.NOW ? activeButtonStyle : buttonStyle} onClick={() => handleNavigate('NOW')}>Now</button>
            </div>

            {/* Content Area */}
            <div className={styles.contentArea}>
                {renderCurrentView()}
            </div>
        </div>
    );
}

export default App;
