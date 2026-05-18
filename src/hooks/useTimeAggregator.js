// src/hooks/useTimeAggregator.js
import { useEffect } from 'react';

// Helper function to get today's date in YYYY-MM-DD format.
// This ensures the timer resets automatically each day.
const getTodayString = () => {
    const now = new Date();
    // Adjust for timezone to prevent date from changing at UTC midnight
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    const localDate = new Date(now - timezoneOffset);
    return localDate.toISOString().split('T')[0];
};

/**
 * A custom hook to continuously track and aggregate the time a component is mounted.
 * It saves the total seconds to localStorage.
 * @param {string} trackerId - A unique ID for localStorage (e.g., 'studyModalTime').
 */
export const useTimeAggregator = (trackerId) => {
    useEffect(() => {
        const today = getTodayString();
        const storageKey = `${trackerId}_${today}`;
        const intervalInSeconds = 5; // How often to save progress


        const intervalId = setInterval(() => {
            const currentSeconds = Number(localStorage.getItem(storageKey) || 0);
            localStorage.setItem(storageKey, currentSeconds + intervalInSeconds);
        }, intervalInSeconds * 1000);

        // This is the cleanup function. It runs when the component unmounts (modal closes).
        return () => {
            clearInterval(intervalId);
        };
    }, [trackerId]); // Effect dependency array
};