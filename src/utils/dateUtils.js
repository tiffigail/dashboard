// src/utils/dateUtils.js

/**
 * Gets the current week number in ISO 8601 format (e.g., "2025-W31").
 * This is timezone-safe.
 */
export const getCurrentWeekId = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return `W${Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7) + 1}`;
};

/**
 * Gets the current date in YYYY-MM-DD format based on the user's local timezone.
 * This is the corrected, timezone-safe version.
 */
export const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};