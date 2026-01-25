import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { Howl } from 'howler';
import { useAuth } from './AuthContext.jsx';

// --- Constants and Helpers ---
const DEFAULT_POMODORO_MINUTES = 20;

const LS_KEYS = {
    POMODORO_DURATION: 'productivityApp_pomodoroDurationMinutes',
    TIMER_SECONDS: 'productivityApp_timerSeconds',
    IS_TIMER_RUNNING: 'productivityApp_isTimerRunning',
};

const timerSounds = [
    '/sounds/082569_robot-voice-let39s-get-it-on-82780.mp3',
    '/sounds/applause-2-31567.mp3',
    '/sounds/Yeahoh.mp3'
];

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

// --- Context Definition ---
const TimerContext = createContext();
export const useTimer = () => useContext(TimerContext);

// --- Provider Component ---
export const TimerProvider = ({ children }) => {
    const { currentUser } = useAuth(); // <-- Checks if a user is logged in

    const [pomodoroDurationMinutes, setPomodoroDurationMinutes] = useState(() => loadState(LS_KEYS.POMODORO_DURATION, DEFAULT_POMODORO_MINUTES));
    const [timerSeconds, setTimerSeconds] = useState(() => loadState(LS_KEYS.TIMER_SECONDS, loadState(LS_KEYS.POMODORO_DURATION, DEFAULT_POMODORO_MINUTES) * 60));
    const [isTimerRunning, setIsTimerRunning] = useState(() => loadState(LS_KEYS.IS_TIMER_RUNNING, false));
    const [isTimerFinished, setIsTimerFinished] = useState(false);

    const intervalRef = useRef(null);
    const soundRef = useRef(null);
    const nextSoundIndexRef = useRef(0);

    useEffect(() => {
        localStorage.setItem(LS_KEYS.POMODORO_DURATION, String(pomodoroDurationMinutes));
    }, [pomodoroDurationMinutes]);

    useEffect(() => {
        localStorage.setItem(LS_KEYS.TIMER_SECONDS, String(timerSeconds));
    }, [timerSeconds]);

    useEffect(() => {
        localStorage.setItem(LS_KEYS.IS_TIMER_RUNNING, String(isTimerRunning));
    }, [isTimerRunning]);

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
                        
                        // --- MODIFIED: Only play sound if a user is logged in ---
                        if (currentUser && soundToPlay) {
                            soundRef.current = new Howl({ src: [soundToPlay], html5: true });
                            soundRef.current.play();
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
    }, [isTimerRunning, timerSeconds, currentUser]); // Added currentUser as a dependency

    useEffect(() => {
        return () => {
            soundRef.current?.unload();
        };
    }, []);

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

    const value = {
        pomodoroDurationMinutes,
        onSetPomodoroDurationMinutes: handleSetPomodoroDurationMinutes,
        timerSeconds,
        onSetTimerSeconds: handleSetTimerSeconds,
        isTimerRunning,
        onSetIsTimerRunning: handleSetIsTimerRunning,
        isTimerFinished,
        onSetIsTimerFinished: handleSetIsTimerFinished,
    };

    return (
        <TimerContext.Provider value={value}>
            {children}
        </TimerContext.Provider>
    );
};