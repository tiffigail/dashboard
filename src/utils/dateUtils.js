// src/utils/dateUtils.js — single source of truth for all date helpers

// Returns "YYYY-MM-DD" in local timezone
export const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Builds "YYYY-MM-DD" from parts (monthIndex is 0-based)
export const formatDateString = (year, monthIndex, day) => {
  const month = String(monthIndex + 1).padStart(2, '0');
  return `${year}-${month}-${String(day).padStart(2, '0')}`;
};

// Converts a Firestore Timestamp or Date to "YYYY-MM-DD" for <input type="date">
export const formatDateForInput = (date) => {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Formats "YYYY-MM-DD" to "M/D" for display
export const formatDateShort = (dateString) => {
  const [, month, day] = dateString.split('-');
  return `${parseInt(month, 10)}/${parseInt(day, 10)}`;
};

// Returns the Sunday that starts the week containing `date` (local timezone)
export const getWeekStartDate = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
};

// Returns "YYYY-W##" week ID (Sunday-anchored, local timezone) — matches Firestore stored format
export const getWeekId = (date = new Date()) => {
  const target = new Date(date);
  target.setHours(12, 0, 0, 0);
  const weekStart = getWeekStartDate(target);
  const year = weekStart.getFullYear();
  const janFirst = new Date(year, 0, 1);
  janFirst.setHours(0, 0, 0, 0);
  const firstSunday = new Date(janFirst);
  firstSunday.setDate(janFirst.getDate() - janFirst.getDay());
  firstSunday.setHours(0, 0, 0, 0);
  const diffDays = Math.round((weekStart.getTime() - firstSunday.getTime()) / 86400000);
  const weekNumber = Math.floor(diffDays / 7) + 1;
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
};

// Returns date string "YYYY-MM-DD" for a specific day offset from a week's start
export const getDateStringForDayInWeek = (weekStartDate, targetDayIndex) => {
  if (!(weekStartDate instanceof Date) || isNaN(weekStartDate)) return null;
  const d = new Date(weekStartDate);
  d.setDate(weekStartDate.getDate() + targetDayIndex);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Legacy alias — kept for kanbanServices compatibility
export const getCurrentWeekId = () => getWeekId();
