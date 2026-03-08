import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebaseConfig";

// ============================================
// FITNESS GOALS
// ============================================

/**
 * Create a new fitness goal
 * @param {string} userId - User ID
 * @param {object} goalData - Goal data (title, emoji, category, target, etc.)
 * @returns {Promise<object>} Created goal with ID
 */
export const createFitnessGoal = async (userId, goalData) => {
  const payload = {
    userId,
    ...goalData,
    progress: 0,
    badge: "bronze",
    status: "active",
    workoutCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    achievedAt: null
  };

  const newDocRef = await addDoc(collection(db, "fitnessGoals"), payload);
  return { id: newDocRef.id, ...payload };
};

/**
 * Get all active goals for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of goals
 */
export const getActiveFitnessGoals = async (userId) => {
  // No orderBy — avoids composite index requirement; filter and sort in JS
  const q = query(
    collection(db, "fitnessGoals"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return docs
    .filter(d => d.status === "active")
    .sort((a, b) => {
      const aTime = a.createdAt?.seconds ?? 0;
      const bTime = b.createdAt?.seconds ?? 0;
      return bTime - aTime;
    });
};

/**
 * Update goal progress
 * @param {string} goalId - Goal ID
 * @param {object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateFitnessGoal = async (goalId, updates) => {
  const goalRef = doc(db, "fitnessGoals", goalId);
  await updateDoc(goalRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

/**
 * Mark goal as achieved
 * @param {string} goalId - Goal ID
 * @returns {Promise<void>}
 */
export const achieveFitnessGoal = async (goalId) => {
  const goalRef = doc(db, "fitnessGoals", goalId);
  await updateDoc(goalRef, {
    status: "achieved",
    badge: "platinum",
    progress: 100,
    achievedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

/**
 * Increment workout count for a goal
 * @param {string} goalId - Goal ID
 * @returns {Promise<void>}
 */
export const incrementGoalWorkoutCount = async (goalId) => {
  const goalRef = doc(db, "fitnessGoals", goalId);
  const goalSnap = await getDoc(goalRef);

  if (goalSnap.exists()) {
    const currentCount = goalSnap.data().workoutCount || 0;
    await updateDoc(goalRef, {
      workoutCount: currentCount + 1,
      updatedAt: serverTimestamp()
    });
  }
};

// ============================================
// WORKOUT LOGS
// ============================================

/**
 * Create a new workout log
 * @param {string} userId - User ID
 * @param {object} workoutData - Workout data
 * @returns {Promise<object>} Created workout with ID
 */
export const createWorkoutLog = async (userId, workoutData) => {
  const { date, workoutName, exercises, duration } = workoutData;

  // Calculate total volume
  const totalVolume = exercises.reduce((sum, ex) => sum + (ex.totalVolume || 0), 0);

  // Extract goals from exercises
  const contributesToGoals = [...new Set(
    exercises.flatMap(ex => ex.relatedGoals || [])
  )];

  // Session ID: date + timestamp to avoid duplicate count query
  const sessionId = `${date}-${Date.now()}`;

  const payload = {
    userId,
    sessionId,
    date,
    workoutName: workoutName || "Workout",
    source: 'quick',
    duration: duration || 0,
    exercises,
    totalVolume,
    volumePR: false,
    contributesToGoals,
    createdAt: serverTimestamp()
  };

  const docRef = doc(db, "workoutLogs", sessionId);
  await setDoc(docRef, payload);

  // Update workout count for related goals
  for (const goalId of contributesToGoals) {
    await incrementGoalWorkoutCount(goalId);
  }

  return { id: sessionId, ...payload };
};

/**
 * Get recent workouts for a user
 * @param {string} userId - User ID
 * @param {number} limitCount - Number of workouts to return
 * @returns {Promise<Array>} Array of workouts
 */
export const getRecentWorkouts = async (userId, limitCount = 10) => {
  // No orderBy — avoids composite index requirement; sort by date in JS instead
  const q = query(
    collection(db, "workoutLogs"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  // Sort by date desc — works for both physicalGoalsService and muscleBuildingService logs
  docs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return docs.slice(0, limitCount);
};

/**
 * Get workouts for a specific date
 * @param {string} userId - User ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of workouts
 */
export const getWorkoutsForDate = async (userId, date) => {
  const workoutsCollection = collection(db, "workoutLogs");
  const q = query(
    workoutsCollection,
    where("userId", "==", userId),
    where("date", "==", date)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ============================================
// BODY MEASUREMENTS
// ============================================

/**
 * Log body measurements
 * @param {string} userId - User ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {object} measurements - Measurement data
 * @param {number} weight - Current weight
 * @param {number} bodyFat - Current body fat percentage
 * @returns {Promise<object>} Created measurement
 */
// Delegates to muscleBuildingService so both paths write the same flat schema.
// Import is dynamic to avoid circular dependency.
export const logBodyMeasurements = async (userId, date, measurements, weight, bodyFat) => {
  const { logMeasurement } = await import('./muscleBuildingService');
  return logMeasurement(userId, date, {
    ...measurements,
    weight: weight || null,
    bodyFatPercent: bodyFat || null,
  });
};

/**
 * Get latest body measurements
 * @param {string} userId - User ID
 * @returns {Promise<object|null>} Latest measurements or null
 */
export const getLatestMeasurements = async (userId) => {
  // No orderBy — avoids composite index requirement; sort by date in JS
  const q = query(
    collection(db, "bodyMeasurements"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  docs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return docs[0];
};

// ============================================
// PERIOD TRACKING
// ============================================

/**
 * Create or update period cycle
 * @param {string} userId - User ID
 * @param {string} cycleId - Cycle ID (e.g., "cycle-2026-01")
 * @param {object} cycleData - Cycle data
 * @returns {Promise<object>} Created/updated cycle
 */
export const updatePeriodCycle = async (userId, cycleId, cycleData) => {
  const payload = {
    userId,
    cycleId,
    ...cycleData,
    lastUpdated: serverTimestamp()
  };

  const docRef = doc(db, "periodTracking", cycleId);
  await setDoc(docRef, payload, { merge: true });

  return { id: cycleId, ...payload };
};

/**
 * Get current period cycle
 * @param {string} userId - User ID
 * @returns {Promise<object|null>} Current cycle or null
 */
export const getCurrentPeriodCycle = async (userId) => {
  // No orderBy — avoids composite index requirement; sort by cycleStart in JS
  const q = query(
    collection(db, "periodTracking"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  docs.sort((a, b) => (b.cycleStart || '').localeCompare(a.cycleStart || ''));
  return docs[0];
};

/**
 * Log daily period data
 * @param {string} userId - User ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {object} dailyData - Daily period data (flow, symptoms, etc.)
 * @returns {Promise<void>}
 */
export const logDailyPeriodData = async (userId, date, dailyData) => {
  const currentCycle = await getCurrentPeriodCycle(userId);

  if (!currentCycle) {
    throw new Error("No active period cycle found. Please start a new cycle.");
  }

  const cycleRef = doc(db, "periodTracking", currentCycle.id);
  const updatePath = `dailyLogs.${date}`;

  await updateDoc(cycleRef, {
    [updatePath]: dailyData,
    lastUpdated: serverTimestamp()
  });
};

/**
 * Update dailyMetrics with period data
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {object} periodData - Period data (periodDay, periodFlow, irritabilityLevel, symptoms)
 * @returns {Promise<void>}
 */
export const updateDailyMetricsWithPeriodData = async (date, periodData) => {
  const dailyMetricsRef = doc(db, "dailyMetrics", date);

  await setDoc(dailyMetricsRef, {
    periodDay: periodData.periodDay || null,
    periodFlow: periodData.periodFlow || null,
    irritabilityLevel: periodData.irritabilityLevel || null,
    periodSymptoms: periodData.periodSymptoms || [],
    lastUpdated: serverTimestamp()
  }, { merge: true });
};

/**
 * Get period tracking history (multiple cycles)
 * @param {string} userId - User ID
 * @param {number} count - Number of cycles to fetch
 * @returns {Promise<Array>} Array of cycle objects
 */
export const getPeriodHistory = async (userId, count = 12) => {
  // No orderBy — avoids composite index requirement; sort by cycleStart in JS
  const q = query(
    collection(db, "periodTracking"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  docs.sort((a, b) => (b.cycleStart || '').localeCompare(a.cycleStart || ''));
  return docs.slice(0, count);
};

/**
 * Start a new period cycle. Closes the previous cycle by calculating its length.
 * @param {string} userId - User ID
 * @param {string} date - Start date in YYYY-MM-DD format
 * @returns {Promise<object>} The new cycle document
 */
export const startNewCycle = async (userId, date) => {
  // Close previous cycle
  const prevCycle = await getCurrentPeriodCycle(userId);
  if (prevCycle && prevCycle.cycleStart) {
    const prevStart = new Date(prevCycle.cycleStart);
    const newStart = new Date(date);
    const cycleLengthDays = Math.round((newStart - prevStart) / (1000 * 60 * 60 * 24));
    if (cycleLengthDays > 0) {
      await updateDoc(doc(db, "periodTracking", prevCycle.id), {
        cycleLengthDays,
        cycleEnd: date,
        lastUpdated: serverTimestamp()
      });
    }
  }

  // Create new cycle
  const cycleId = `cycle-${date}`;
  const payload = {
    userId,
    cycleId,
    cycleStart: date,
    cycleLengthDays: null,
    cycleEnd: null,
    currentDay: 1,
    currentPhase: 'menstrual',
    dailyLogs: {},
    lastUpdated: serverTimestamp()
  };
  await setDoc(doc(db, "periodTracking", cycleId), payload);
  return { id: cycleId, ...payload };
};

// ============================================
// A1C TRACKING
// ============================================

/**
 * Log A1C test result
 * @param {string} userId - User ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {number} a1cLevel - A1C percentage
 * @param {object} additionalData - Additional test data
 * @returns {Promise<object>} Created A1C log
 */
export const logA1CTest = async (userId, date, a1cLevel, additionalData = {}) => {
  const testId = `a1c-${date}`;

  let status = "excellent";
  if (a1cLevel >= 6.5) status = "diabetic";
  else if (a1cLevel >= 5.7) status = "prediabetic";

  const payload = {
    userId,
    testId,
    date,
    a1cLevel,
    status,
    ...additionalData,
    createdAt: serverTimestamp()
  };

  const docRef = doc(db, "a1cTracking", testId);
  await setDoc(docRef, payload);

  return { id: testId, ...payload };
};

/**
 * Get A1C history
 * @param {string} userId - User ID
 * @param {number} limitCount - Number of results to return
 * @returns {Promise<Array>} Array of A1C tests
 */
export const getA1CHistory = async (userId, limitCount = 10) => {
  // No orderBy — avoids composite index requirement; sort by date in JS
  const q = query(
    collection(db, "a1cTracking"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  docs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return docs.slice(0, limitCount);
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate goal progress based on current vs target value
 * @param {number} startValue - Starting value
 * @param {number} currentValue - Current value
 * @param {number} targetValue - Target value
 * @returns {number} Progress percentage (0-100)
 */
export const calculateGoalProgress = (startValue, currentValue, targetValue) => {
  if (targetValue === startValue) return 100;
  const progress = ((currentValue - startValue) / (targetValue - startValue)) * 100;
  return Math.max(0, Math.min(100, Math.round(progress)));
};

/**
 * Determine badge level based on progress
 * @param {number} progress - Progress percentage (0-100)
 * @returns {string} Badge level
 */
export const getBadgeLevel = (progress) => {
  if (progress >= 100) return "platinum";
  if (progress >= 75) return "gold";
  if (progress >= 50) return "silver";
  return "bronze";
};

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string} Date string
 */
export const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
