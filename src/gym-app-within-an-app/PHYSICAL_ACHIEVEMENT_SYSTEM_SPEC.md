# PHYSICAL ACHIEVEMENT SYSTEM - IMPLEMENTATION SPEC

## 🎯 OVERVIEW

Build a standalone fitness tracking system with achievement-based goals, workout logging, and period tracking. This system integrates with existing AM/PM routines and NowView but maintains separate data structures.

---

## ⚠️ CRITICAL: MATCH EXISTING PATTERNS

**BEFORE YOU START - EXAMINE THESE FILES:**
- `src/components/PmRoutineForm/PmRoutineForm.jsx`
- `src/components/AmRoutineForm/AmRoutineForm.jsx`
- `src/services/kanbanServices.js`

**YOUR PATTERNS TO FOLLOW:**
✅ Use `addDoc()` for auto-generated IDs
✅ Use `setDoc(docRef, data, { merge: true })` for specific document IDs
✅ Use `serverTimestamp()` for all timestamps
✅ Use `collection()` and `doc()` from Firestore
✅ Return `{ id: doc.id, ...doc.data() }` from service functions
✅ Use camelCase for all field names
✅ Use `YYYY-MM-DD` format for date strings as document IDs

---

## 📊 PART 1: FIRESTORE COLLECTIONS

### Collection 1: `fitnessGoals` (NEW)

**Purpose:** Store user's fitness achievement goals (e.g., "Bigger Calves", "10 Pull-ups")

**Document Structure:**
```javascript
{
  // Identity
  userId: "abc123", // string - from auth
  goalId: "bigger-calves-001", // string - auto-generated document ID
  
  // Basic Info
  title: "Bigger Calves", // string
  emoji: "🦵", // string
  category: "muscleSize", // string - "muscleSize", "strength", "skill", "endurance"
  description: "Increase calf circumference by 1.5cm", // string
  
  // Target Tracking
  target: {
    metric: "calfCircumference", // string - what we're measuring
    startValue: 14.0, // number - starting measurement
    targetValue: 15.5, // number - goal measurement
    currentValue: 14.5, // number - updated as measurements are logged
    unit: "cm" // string - "cm", "inches", "lbs", "reps", "seconds"
  },
  
  // Progress
  progress: 80, // number - percentage (0-100), auto-calculated
  badge: "silver", // string - "bronze", "silver", "gold", "platinum"
  status: "active", // string - "active", "achieved", "abandoned"
  
  // Tracking
  workoutCount: 12, // number - how many workouts contributed to this goal
  relatedExercises: ["calf-raises", "jump-rope"], // array of strings
  
  // Milestones (for skill-based goals)
  milestones: [ // array of objects (optional, for skills like moonwalk)
    {
      name: "First 3 steps backward", // string
      achieved: true, // boolean
      achievedAt: serverTimestamp() // timestamp or null
    },
    {
      name: "Smooth 10-step sequence", // string
      achieved: false, // boolean
      achievedAt: null // timestamp or null
    }
  ],
  
  // Metadata
  createdAt: serverTimestamp(), // timestamp
  updatedAt: serverTimestamp(), // timestamp
  achievedAt: null // timestamp or null (set when status becomes "achieved")
}
```

**Example Documents:**
```javascript
// Muscle Size Goal
{
  userId: "abc123",
  goalId: "bigger-calves-001",
  title: "Bigger Calves",
  emoji: "🦵",
  category: "muscleSize",
  description: "Increase calf circumference by 1.5cm",
  target: {
    metric: "calfCircumference",
    startValue: 14.0,
    targetValue: 15.5,
    currentValue: 14.5,
    unit: "cm"
  },
  progress: 80,
  badge: "silver",
  status: "active",
  workoutCount: 12,
  relatedExercises: ["calf-raises", "jump-rope"],
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  achievedAt: null
}

// Skill Goal
{
  userId: "abc123",
  goalId: "pullups-10",
  title: "10 Unassisted Pull-ups",
  emoji: "💪",
  category: "skill",
  description: "Build up to 10 consecutive unassisted pull-ups",
  target: {
    metric: "pullupCount",
    startValue: 0,
    targetValue: 10,
    currentValue: 3,
    unit: "reps"
  },
  progress: 30,
  badge: "bronze",
  status: "active",
  workoutCount: 8,
  relatedExercises: ["pull-ups", "negative-pull-ups", "assisted-pull-ups"],
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  achievedAt: null
}
```

---

### Collection 2: `workoutLogs` (NEW)

**Purpose:** Store workout session data with exercises, sets, reps, and weight

**Document ID:** Use `YYYY-MM-DD-###` format (e.g., "2026-01-27-001")

**Document Structure:**
```javascript
{
  // Identity
  userId: "abc123", // string
  sessionId: "2026-01-27-001", // string - document ID
  date: "2026-01-27", // string - YYYY-MM-DD format
  
  // Session Info
  workoutName: "Leg Day", // string - "Leg Day", "Dance Practice", "Upper Body", etc.
  startTime: serverTimestamp(), // timestamp
  endTime: serverTimestamp(), // timestamp
  duration: 45, // number - minutes (can be auto-calculated or manual)
  
  // Exercises
  exercises: [ // array of objects
    {
      exerciseId: "calf-raises-seated", // string
      exerciseName: "Seated Calf Raises", // string
      muscleGroup: "legs-calves", // string
      relatedGoals: ["bigger-calves-001"], // array of goalIds
      
      sets: [ // array of objects
        {
          setNumber: 1, // number
          reps: 15, // number
          weight: 225, // number (lbs)
          restTime: 60 // number - seconds (optional)
        },
        {
          setNumber: 2,
          reps: 15,
          weight: 225,
          restTime: 60
        },
        {
          setNumber: 3,
          reps: 12,
          weight: 225,
          restTime: 60
        }
      ],
      
      totalVolume: 11925, // number - sum of (reps × weight) for all sets
      
      // Personal Record Tracking
      isPR: true, // boolean - is this a new PR?
      personalRecord: { // object (optional, only if isPR is true)
        previousBest: {
          weight: 200, // number
          reps: 15, // number
          date: "2026-01-20" // string
        }
      },
      
      notes: "Felt strong today, could go heavier next time", // string (optional)
      formVideoUrl: "" // string (optional) - YouTube link for form reference
    }
  ],
  
  // Session Totals
  totalVolume: 23400, // number - sum of all exercise volumes
  volumePR: false, // boolean - is this a total volume PR?
  
  // Session Feedback
  mood: "energized", // string - how you felt
  difficulty: 7, // number - 1-10 scale
  
  // Goal Contributions
  contributesToGoals: ["bigger-calves-001"], // array - auto-calculated from exercises
  
  // Metadata
  createdAt: serverTimestamp() // timestamp
}
```

**Example Document:**
```javascript
{
  userId: "abc123",
  sessionId: "2026-01-27-001",
  date: "2026-01-27",
  workoutName: "Leg Day",
  startTime: serverTimestamp(),
  endTime: serverTimestamp(),
  duration: 45,
  exercises: [
    {
      exerciseId: "calf-raises-seated",
      exerciseName: "Seated Calf Raises",
      muscleGroup: "legs-calves",
      relatedGoals: ["bigger-calves-001"],
      sets: [
        { setNumber: 1, reps: 15, weight: 225, restTime: 60 },
        { setNumber: 2, reps: 15, weight: 225, restTime: 60 },
        { setNumber: 3, reps: 12, weight: 225, restTime: 60 }
      ],
      totalVolume: 11925,
      isPR: true,
      personalRecord: {
        previousBest: { weight: 200, reps: 15, date: "2026-01-20" }
      },
      notes: "Felt strong today"
    }
  ],
  totalVolume: 23400,
  volumePR: false,
  mood: "energized",
  difficulty: 7,
  contributesToGoals: ["bigger-calves-001"],
  createdAt: serverTimestamp()
}
```

---

### Collection 3: `bodyMeasurements` (NEW)

**Purpose:** Store body measurements for tracking muscle growth

**Document ID:** Use `YYYY-MM-DD` format (date of measurement)

**Document Structure:**
```javascript
{
  // Identity
  userId: "abc123", // string
  date: "2026-01-27", // string - YYYY-MM-DD (also document ID)
  
  // Measurements (all in inches or cm - be consistent)
  measurements: {
    // Upper Body
    chest: 42, // number
    leftArm: 15.5, // number
    rightArm: 15.3, // number
    leftForearm: 12.1, // number
    rightForearm: 12.0, // number
    
    // Core
    waist: 34, // number
    hips: 38, // number
    
    // Lower Body
    leftThigh: 24.5, // number
    rightThigh: 24.3, // number
    leftCalf: 14.5, // number
    rightCalf: 14.4 // number
  },
  
  // Calculated Fields
  calculated: {
    lbsOfMuscle: 112, // number - weight × (1 - bodyFat/100)
    totalInchesGained: 2.3 // number - compared to baseline measurement
  },
  
  // Progress Photos
  photoUrls: [ // array of strings
    "storage/measurements/2026-01-27-front.jpg",
    "storage/measurements/2026-01-27-side.jpg"
  ],
  
  // Notes
  notes: "Arms looking bigger after 4 weeks of training!", // string (optional)
  
  // Metadata
  createdAt: serverTimestamp() // timestamp
}
```

---

### Collection 4: `periodTracking` (NEW)

**Purpose:** Track menstrual cycle for correlations with productivity/mood/strength

**Document ID:** Use `cycle-YYYY-MM` format (e.g., "cycle-2026-01")

**Document Structure:**
```javascript
{
  // Identity
  userId: "abc123", // string
  cycleId: "cycle-2026-01", // string - document ID
  
  // Cycle Dates
  cycleStart: "2026-01-14", // string - first day of period
  cycleEnd: "2026-02-11", // string - predicted or actual
  cycleLengthDays: 28, // number
  
  // Period Dates
  periodStart: "2026-01-14", // string - first day of bleeding
  periodEnd: "2026-01-19", // string - last day of bleeding (actual or predicted)
  periodLengthDays: 5, // number
  
  // Current Status
  currentPhase: "luteal", // string - "menstrual", "follicular", "ovulation", "luteal"
  currentDay: 14, // number - day of cycle (1-28)
  
  // Daily Logs (keyed by date)
  dailyLogs: {
    "2026-01-14": {
      flow: "heavy", // string - "none", "spotting", "light", "medium", "heavy"
      symptoms: ["cramps-severe", "fatigue", "bloating"], // array of strings
      irritabilityLevel: 7, // number - 1-10
      painLevel: 7, // number - 1-10
      tamponChanges: 6, // number (optional)
      spotting: false // boolean
    },
    "2026-01-15": {
      flow: "medium",
      symptoms: ["cramps-mild", "mood-swings"],
      irritabilityLevel: 5,
      painLevel: 4
    }
  },
  
  // Predictions
  predictions: {
    nextPeriodStart: "2026-02-11", // string
    nextOvulation: "2026-01-28", // string
    fertileWindowStart: "2026-01-26", // string
    fertileWindowEnd: "2026-01-30" // string
  },
  
  // Insights (calculated from historical data)
  insights: {
    averageStrength: { // relative to baseline (1.0)
      menstrual: 0.88, // number - 88% of baseline
      follicular: 1.12, // number - 112% - STRONGEST!
      ovulation: 1.05, // number
      luteal: 0.95 // number
    },
    averageProductivity: { // average productivity score by phase
      menstrual: 85, // number
      follicular: 135, // number - PEAK!
      ovulation: 110, // number
      luteal: 95 // number
    },
    bestWorkoutDays: [7, 8, 9, 10, 11, 12, 13, 14], // array - days of cycle
    restRecommendedDays: [1, 2, 3] // array - days of cycle
  },
  
  // Metadata
  createdAt: serverTimestamp(), // timestamp
  lastUpdated: serverTimestamp() // timestamp
}
```

---

### Collection 5: `dailyMetrics` (ENHANCE EXISTING)

**Purpose:** Add period tracking fields to existing daily metrics

**IMPORTANT:** This collection already exists! You are ADDING fields, not replacing.

**NEW FIELDS TO ADD:**
```javascript
{
  // ... ALL EXISTING FIELDS REMAIN ...
  
  // NEW: Period Tracking (add these to existing structure)
  periodDay: 14, // number or null - day of cycle (1-28), null if not tracking
  periodFlow: "medium", // string or null - "none", "spotting", "light", "medium", "heavy"
  irritabilityLevel: 3, // number or null - 1-10 scale
  periodSymptoms: ["cramps-mild"], // array or null - list of symptoms for the day
  
  // EXISTING FIELDS (do not modify):
  // date, axisTaskCounts, productivityScore, epiphanyCount, despairCount, etc.
}
```

**Example Enhanced Document:**
```javascript
{
  // EXISTING FIELDS
  date: "2026-01-27",
  axisTaskCounts: {
    Physical: 36,
    Gear: 60,
    Financial: 12,
    Environment: 1,
    Misdirect: 1,
    "On Track N+1": 4,
    "Rest and preparation": 6
  },
  productivityScore: 120,
  epiphanyCount: 2,
  despairCount: 0,
  lastUpdated: serverTimestamp(),
  
  // NEW FIELDS (ADD THESE)
  periodDay: 14,
  periodFlow: "medium",
  irritabilityLevel: 3,
  periodSymptoms: ["mild-cramps", "fatigue"]
}
```

---

### Collection 6: `a1cTracking` (NEW)

**Purpose:** Track A1C test results over time

**Document ID:** Use `a1c-YYYY-MM-DD` format (date of test)

**Document Structure:**
```javascript
{
  // Identity
  userId: "abc123", // string
  testId: "a1c-2026-01-27", // string - document ID
  date: "2026-01-27", // string - YYYY-MM-DD
  
  // Test Results
  a1cLevel: 5.4, // number - percentage
  fastingGlucose: 95, // number - mg/dL (optional)
  
  // Status
  status: "excellent", // string - "excellent" (<5.7), "prediabetic" (5.7-6.4), "diabetic" (≥6.5)
  
  // Comparison
  previousTest: { // object (optional)
    date: "2025-10-27", // string
    a1cLevel: 5.7, // number
    change: -0.3 // number - improvement!
  },
  
  trend: "improving", // string - "improving", "stable", "worsening"
  
  // Correlations (calculated from physicalGoalsLogs over last 90 days)
  correlations: {
    workoutsPerWeek: 4.5, // number
    avgStepsPerDay: 9800, // number
    avgWeight: 186, // number
    legDayFrequency: 2 // number - per week
  },
  
  // Notes
  notes: "After 3 months of consistent training", // string (optional)
  labFileUrl: "storage/labs/a1c-2026-01.pdf", // string (optional)
  
  // Metadata
  createdAt: serverTimestamp() // timestamp
}
```

---

## 🛠️ PART 2: SERVICE LAYER

Create a new file: `src/services/physicalGoalsService.js`

```javascript
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
  orderBy,
  limit,
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
  const goalsCollection = collection(db, "fitnessGoals");
  const q = query(
    goalsCollection,
    where("userId", "==", userId),
    where("status", "==", "active"),
    orderBy("createdAt", "desc")
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
  const { date, workoutName, exercises, duration, mood, difficulty } = workoutData;
  
  // Calculate total volume
  const totalVolume = exercises.reduce((sum, ex) => sum + (ex.totalVolume || 0), 0);
  
  // Extract goals from exercises
  const contributesToGoals = [...new Set(
    exercises.flatMap(ex => ex.relatedGoals || [])
  )];
  
  // Generate session ID
  const existingLogsQuery = query(
    collection(db, "workoutLogs"),
    where("userId", "==", userId),
    where("date", "==", date)
  );
  const existingLogs = await getDocs(existingLogsQuery);
  const sessionNumber = existingLogs.size + 1;
  const sessionId = `${date}-${String(sessionNumber).padStart(3, '0')}`;
  
  const payload = {
    userId,
    sessionId,
    date,
    workoutName: workoutName || "Workout",
    startTime: serverTimestamp(),
    endTime: serverTimestamp(),
    duration: duration || 0,
    exercises,
    totalVolume,
    volumePR: false, // TODO: Check if this is a volume PR
    mood: mood || "",
    difficulty: difficulty || 5,
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
  const workoutsCollection = collection(db, "workoutLogs");
  const q = query(
    workoutsCollection,
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
export const logBodyMeasurements = async (userId, date, measurements, weight, bodyFat) => {
  const lbsOfMuscle = weight * (1 - bodyFat / 100);
  
  const payload = {
    userId,
    date,
    measurements,
    calculated: {
      lbsOfMuscle,
      totalInchesGained: 0 // TODO: Calculate vs baseline
    },
    photoUrls: [],
    notes: "",
    createdAt: serverTimestamp()
  };
  
  const docRef = doc(db, "bodyMeasurements", date);
  await setDoc(docRef, payload, { merge: true });
  
  return { id: date, ...payload };
};

/**
 * Get latest body measurements
 * @param {string} userId - User ID
 * @returns {Promise<object|null>} Latest measurements or null
 */
export const getLatestMeasurements = async (userId) => {
  const measurementsCollection = collection(db, "bodyMeasurements");
  const q = query(
    measurementsCollection,
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(1)
  );
  
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  
  const doc = querySnapshot.docs[0];
  return { id: doc.id, ...doc.data() };
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
  const cyclesCollection = collection(db, "periodTracking");
  const q = query(
    cyclesCollection,
    where("userId", "==", userId),
    orderBy("cycleStart", "desc"),
    limit(1)
  );
  
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  
  const doc = querySnapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

/**
 * Log daily period data
 * @param {string} userId - User ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {object} dailyData - Daily period data (flow, symptoms, etc.)
 * @returns {Promise<void>}
 */
export const logDailyPeriodData = async (userId, date, dailyData) => {
  // Get current cycle
  const currentCycle = await getCurrentPeriodCycle(userId);
  
  if (!currentCycle) {
    throw new Error("No active period cycle found. Please start a new cycle.");
  }
  
  // Update the dailyLogs map
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
  
  // Determine status
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
  const a1cCollection = collection(db, "a1cTracking");
  const q = query(
    a1cCollection,
    where("userId", "==", userId),
    orderBy("date", "desc"),
    limit(limitCount)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
```

---

## 🎨 PART 3: COMPONENTS

### Component 1: PhysicalDashboard.jsx

**Location:** `src/components/PhysicalDashboard/PhysicalDashboard.jsx`

**Purpose:** Main dashboard showing all fitness goals, recent workouts, measurements, and period insights

**Props:** None (will use Firebase auth for userId)

**Component Structure:**
```jsx
import React, { useState, useEffect } from 'react';
import styles from './PhysicalDashboard.module.css';
import { getAuth } from 'firebase/auth';
import * as physicalGoalsService from '../../services/physicalGoalsService';
import GoalCard from '../GoalCard/GoalCard';
import QuickWorkoutLogger from '../QuickWorkoutLogger/QuickWorkoutLogger';
import PeriodInsightsWidget from '../PeriodInsightsWidget/PeriodInsightsWidget';
import GoalCreationWizard from '../GoalCreationWizard/GoalCreationWizard';

function PhysicalDashboard() {
  const [activeGoals, setActiveGoals] = useState([]);
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [latestMeasurements, setLatestMeasurements] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorkoutLoggerOpen, setIsWorkoutLoggerOpen] = useState(false);
  const [isGoalWizardOpen, setIsGoalWizardOpen] = useState(false);
  
  const auth = getAuth();
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!userId) return;
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [goals, workouts, measurements] = await Promise.all([
        physicalGoalsService.getActiveFitnessGoals(userId),
        physicalGoalsService.getRecentWorkouts(userId, 5),
        physicalGoalsService.getLatestMeasurements(userId)
      ]);
      
      setActiveGoals(goals);
      setRecentWorkouts(workouts);
      setLatestMeasurements(measurements);
    } catch (error) {
      console.error("Error fetching physical dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkoutLogged = () => {
    setIsWorkoutLoggerOpen(false);
    fetchData(); // Refresh data
  };
  
  const handleGoalCreated = () => {
    setIsGoalWizardOpen(false);
    fetchData(); // Refresh data
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading your physical dashboard...</div>;
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>💪 Physical Dashboard</h1>
        <div className={styles.headerActions}>
          <button 
            onClick={() => setIsGoalWizardOpen(true)}
            className={styles.createGoalButton}
          >
            🎯 Create New Goal
          </button>
          <button 
            onClick={() => setIsWorkoutLoggerOpen(true)}
            className={styles.logWorkoutButton}
          >
            🏋️ Log Workout
          </button>
        </div>
      </div>

      {/* Active Goals Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🎯 Active Goals</h2>
        {activeGoals.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No active goals yet!</p>
            <button 
              onClick={() => setIsGoalWizardOpen(true)}
              className={styles.createFirstGoalButton}
            >
              Create Your First Goal
            </button>
          </div>
        ) : (
          <div className={styles.goalsGrid}>
            {activeGoals.map(goal => (
              <GoalCard 
                key={goal.id}
                goal={goal}
                onQuickLog={() => setIsWorkoutLoggerOpen(true)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Period Insights Widget */}
      <PeriodInsightsWidget userId={userId} />

      {/* Recent Workouts Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🏋️ Recent Workouts</h2>
        {recentWorkouts.length === 0 ? (
          <p className={styles.emptyState}>No workouts logged yet</p>
        ) : (
          <div className={styles.workoutsList}>
            {recentWorkouts.map(workout => (
              <div key={workout.id} className={styles.workoutCard}>
                <div className={styles.workoutHeader}>
                  <h3>{workout.workoutName}</h3>
                  <span className={styles.workoutDate}>{workout.date}</span>
                </div>
                <div className={styles.workoutStats}>
                  <span>⏱️ {workout.duration} mins</span>
                  <span>💪 {workout.totalVolume.toLocaleString()} lbs</span>
                  {workout.volumePR && <span className={styles.prBadge}>🎉 PR!</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Body Measurements Section */}
      {latestMeasurements && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>📏 Latest Measurements</h2>
          <div className={styles.measurementsCard}>
            <p>Last measured: {latestMeasurements.date}</p>
            {/* Display key measurements */}
            <div className={styles.measurementsGrid}>
              <div>Calves (L): {latestMeasurements.measurements.leftCalf}"</div>
              <div>Calves (R): {latestMeasurements.measurements.rightCalf}"</div>
              <div>Arms (L): {latestMeasurements.measurements.leftArm}"</div>
              <div>Arms (R): {latestMeasurements.measurements.rightArm}"</div>
            </div>
          </div>
        </section>
      )}

      {/* Modals */}
      {isWorkoutLoggerOpen && (
        <QuickWorkoutLogger 
          userId={userId}
          goals={activeGoals}
          onClose={() => setIsWorkoutLoggerOpen(false)}
          onSave={handleWorkoutLogged}
        />
      )}
      
      {isGoalWizardOpen && (
        <GoalCreationWizard 
          userId={userId}
          onClose={() => setIsGoalWizardOpen(false)}
          onSave={handleGoalCreated}
        />
      )}
    </div>
  );
}

export default PhysicalDashboard;
```

**CSS Module:** `src/components/PhysicalDashboard/PhysicalDashboard.module.css`

```css
.dashboard {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  background: #f8f9fa;
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.title {
  font-size: 32px;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.headerActions {
  display: flex;
  gap: 12px;
}

.createGoalButton,
.logWorkoutButton {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.createGoalButton {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.logWorkoutButton {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: white;
}

.createGoalButton:hover,
.logWorkoutButton:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.sectionTitle {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid #e0e0e0;
}

.goalsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.emptyState {
  text-align: center;
  padding: 40px;
  color: #666;
}

.createFirstGoalButton {
  margin-top: 16px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.workoutsList {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.workoutCard {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #43e97b;
}

.workoutHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.workoutHeader h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.workoutDate {
  font-size: 14px;
  color: #666;
}

.workoutStats {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #555;
}

.prBadge {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.measurementsCard {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.measurementsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.loading {
  text-align: center;
  padding: 40px;
  font-size: 18px;
  color: #666;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .goalsGrid {
    grid-template-columns: 1fr;
  }
}
```

---

### Component 2: GoalCard.jsx

**Location:** `src/components/GoalCard/GoalCard.jsx`

**Purpose:** Display a single fitness goal with progress bar, stats, and quick actions

**Props:**
```typescript
{
  goal: object, // Goal object from Firestore
  onQuickLog: function // Callback to open workout logger
}
```

**Component Structure:**
```jsx
import React from 'react';
import styles from './GoalCard.module.css';

function GoalCard({ goal, onQuickLog }) {
  const {
    emoji,
    title,
    target,
    progress,
    badge,
    workoutCount,
    relatedExercises
  } = goal;

  const getBadgeColor = (badgeLevel) => {
    switch (badgeLevel) {
      case 'platinum': return '#e5e4e2';
      case 'gold': return '#ffd700';
      case 'silver': return '#c0c0c0';
      case 'bronze': return '#cd7f32';
      default: return '#cd7f32';
    }
  };

  const badgeColor = getBadgeColor(badge);

  return (
    <div className={styles.goalCard} style={{ borderColor: badgeColor }}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.emoji}>{emoji}</span>
          <h3 className={styles.title}>{title}</h3>
        </div>
        <span className={styles.badge} style={{ background: badgeColor }}>
          {badge.toUpperCase()}
        </span>
      </div>

      <div className={styles.progressSection}>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill}
            style={{ 
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${badgeColor}dd, ${badgeColor})`
            }}
          />
        </div>
        <span className={styles.progressText}>{progress}%</span>
      </div>

      <div className={styles.targetInfo}>
        <span>{target.startValue} {target.unit}</span>
        <span>→</span>
        <span className={styles.currentValue}>
          {target.currentValue} {target.unit}
        </span>
        <span>→</span>
        <span>{target.targetValue} {target.unit}</span>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Workouts</span>
          <span className={styles.statValue}>{workoutCount}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Remaining</span>
          <span className={styles.statValue}>
            {(target.targetValue - target.currentValue).toFixed(1)} {target.unit}
          </span>
        </div>
      </div>

      {relatedExercises && relatedExercises.length > 0 && (
        <div className={styles.exercises}>
          <span className={styles.exercisesLabel}>Related exercises:</span>
          <div className={styles.exercisesList}>
            {relatedExercises.map((ex, idx) => (
              <span key={idx} className={styles.exerciseTag}>{ex}</span>
            ))}
          </div>
        </div>
      )}

      <button 
        onClick={onQuickLog}
        className={styles.logButton}
      >
        🏋️ Log Workout
      </button>
    </div>
  );
}

export default GoalCard;
```

**CSS Module:** `src/components/GoalCard/GoalCard.module.css`

```css
.goalCard {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border-left: 6px solid;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.goalCard:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.titleRow {
  display: flex;
  align-items: center;
  gap: 8px;
}

.emoji {
  font-size: 32px;
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.badge {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.progressSection {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.progressBar {
  flex: 1;
  height: 12px;
  background: #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
}

.progressFill {
  height: 100%;
  transition: width 0.3s ease;
  border-radius: 6px;
}

.progressText {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  min-width: 50px;
  text-align: right;
}

.targetInfo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 14px;
  color: #555;
  margin-bottom: 12px;
}

.currentValue {
  font-weight: 700;
  color: #667eea;
  font-size: 16px;
}

.stats {
  display: flex;
  justify-content: space-around;
  padding: 12px 0;
  border-top: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 12px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.statLabel {
  font-size: 12px;
  color: #666;
}

.statValue {
  font-size: 18px;
  font-weight: 700;
  color: #333;
}

.exercises {
  margin-bottom: 16px;
}

.exercisesLabel {
  font-size: 12px;
  color: #666;
  display: block;
  margin-bottom: 8px;
}

.exercisesList {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.exerciseTag {
  padding: 4px 10px;
  background: #e3f2fd;
  border-radius: 12px;
  font-size: 12px;
  color: #1976d2;
}

.logButton {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.logButton:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(67, 233, 123, 0.3);
}
```

---

[CONTINUING IN NEXT MESSAGE DUE TO LENGTH...]

Would you like me to continue with the remaining components (QuickWorkoutLogger, PeriodInsightsWidget, GoalCreationWizard) and integration instructions?