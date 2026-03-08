import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getProgramById } from "../data/muscleBuildingPrograms";
import { getStrengthProgramById } from "../data/strengthPrograms";

function getAnyProgramById(templateId) {
  return getProgramById(templateId) || getStrengthProgramById(templateId);
}

// ============================================
// PROGRAM ENROLLMENT
// ============================================

export const startProgram = async (userId, templateId) => {
  const template = getAnyProgramById(templateId);
  if (!template) throw new Error(`Unknown program: ${templateId}`);

  const programId = `${userId}-${templateId}`;
  const payload = {
    userId,
    templateId,
    programId,
    title: template.title,
    emoji: template.emoji,
    bodyPart: template.bodyPart,
    category: template.category || 'muscleBuilding',
    startDate: new Date().toISOString().split('T')[0],
    currentWeek: 1,
    status: 'active',
    sessionsThisWeek: 0,
    sessionsPerWeek: template.sessionsPerWeek,
    duration: template.duration,
    totalSessions: 0,
    lastWorkoutDate: null,
    nextTargets: {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, "muscleBuildingPrograms", programId), payload);
  return { id: programId, ...payload };
};

export const getCurrentPrograms = async (userId) => {
  const q = query(
    collection(db, "muscleBuildingPrograms"),
    where("userId", "==", userId),
    where("status", "==", "active")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getProgramDoc = async (programId) => {
  const snap = await getDoc(doc(db, "muscleBuildingPrograms", programId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

// ============================================
// WORKOUT LOGGING
// ============================================

export const logWorkoutSession = async (programId, userId, sessionData) => {
  // sessionData: { date, workoutName, exercises: [{ exerciseId, sets: [{ reps, weight }] }], notes }
  const logId = `${programId}-${sessionData.date}-${Date.now()}`;

  // Calculate volume per exercise
  const exercisesWithVolume = sessionData.exercises.map(ex => {
    const totalVolume = ex.sets.reduce((sum, s) => sum + (s.reps * s.weight), 0);
    const totalReps = ex.sets.reduce((sum, s) => sum + s.reps, 0);
    return { ...ex, totalVolume, totalReps };
  });

  const totalVolume = exercisesWithVolume.reduce((sum, ex) => sum + ex.totalVolume, 0);

  const logPayload = {
    logId,
    programId,
    userId,
    date: sessionData.date,
    workoutName: sessionData.workoutName || '',
    source: 'muscle',
    exercises: exercisesWithVolume,
    totalVolume,
    duration: sessionData.duration || 0,
    notes: sessionData.notes || '',
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(db, "workoutLogs", logId), logPayload);

  // Update program doc
  const programDoc = await getProgramDoc(programId);
  if (programDoc) {
    const newTotal = (programDoc.totalSessions || 0) + 1;
    const newThisWeek = (programDoc.sessionsThisWeek || 0) + 1;

    // Calculate next targets for each exercise
    const nextTargets = { ...(programDoc.nextTargets || {}) };
    for (const ex of exercisesWithVolume) {
      nextTargets[ex.exerciseId] = calculateNextTarget(ex);
    }

    const updates = {
      totalSessions: newTotal,
      sessionsThisWeek: newThisWeek,
      lastWorkoutDate: sessionData.date,
      nextTargets,
      updatedAt: serverTimestamp(),
    };

    // Auto-advance week if enough sessions
    if (newThisWeek >= (programDoc.sessionsPerWeek || 3) && programDoc.currentWeek < programDoc.duration) {
      updates.currentWeek = programDoc.currentWeek + 1;
      updates.sessionsThisWeek = 0;
    }

    await updateDoc(doc(db, "muscleBuildingPrograms", programId), updates);

    // Check if program is complete
    if (updates.currentWeek && updates.currentWeek >= programDoc.duration && newThisWeek >= (programDoc.sessionsPerWeek || 3)) {
      await updateDoc(doc(db, "muscleBuildingPrograms", programId), {
        status: 'completed',
        completedAt: serverTimestamp(),
      });
    }
  }

  return { id: logId, ...logPayload, nextTargets: programDoc?.nextTargets };
};

export const getWorkoutHistoryForExercise = async (userId, exerciseId, count = 10) => {
  // No orderBy — avoids composite index requirement; sort by date in JS
  const q = query(
    collection(db, "workoutLogs"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  docs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const results = [];
  for (const data of docs) {
    const exercise = data.exercises?.find(ex => ex.exerciseId === exerciseId);
    if (exercise) {
      results.push({ date: data.date, ...exercise });
      if (results.length >= count) break;
    }
  }
  return results;
};

// ============================================
// PROGRESSIVE OVERLOAD
// ============================================

export const calculateNextTarget = (exerciseData) => {
  // exerciseData: { exerciseId, sets: [{ reps, weight }], totalReps }
  // Logic: if all sets hit top of rep range → increase weight 5 lbs, drop to bottom of range
  //        else → keep same weight, try for more reps
  if (!exerciseData.sets || exerciseData.sets.length === 0) return null;

  const lastSet = exerciseData.sets[exerciseData.sets.length - 1];
  const avgReps = Math.round(exerciseData.totalReps / exerciseData.sets.length);
  const maxWeight = Math.max(...exerciseData.sets.map(s => s.weight || 0));

  // If average reps >= 12 (top range), suggest weight increase
  if (avgReps >= 12) {
    return {
      exerciseId: exerciseData.exerciseId,
      suggestedWeight: maxWeight + 5,
      suggestedReps: 8,
      message: `Add 5 lbs (${maxWeight + 5} lbs) and aim for 8 reps`,
    };
  }

  return {
    exerciseId: exerciseData.exerciseId,
    suggestedWeight: maxWeight,
    suggestedReps: avgReps + 1,
    message: `Stay at ${maxWeight} lbs, aim for ${avgReps + 1} reps`,
  };
};

// ============================================
// MEASUREMENTS
// ============================================

export const logMeasurement = async (userId, date, measurements) => {
  // measurements: { calves_left, calves_right, upperArms_left, upperArms_right, forearms_left, forearms_right, weight, bodyFatPercent, notes }
  const measurementId = `${userId}-${date}`;

  // Get previous measurement for comparison
  const previous = await getLatestMeasurement(userId);

  const changes = {};
  if (previous) {
    for (const key of Object.keys(measurements)) {
      if (key === 'notes') continue;
      if (measurements[key] != null && previous[key] != null) {
        changes[key] = +(measurements[key] - previous[key]).toFixed(2);
      }
    }
  }

  const payload = {
    userId,
    date,
    ...measurements,
    changes,
    loggedAt: serverTimestamp(),
  };

  await setDoc(doc(db, "bodyMeasurements", measurementId), payload);

  // Mirror weight & bodyfat to physicalGoalsLogs so PhysicalDashboard sees them
  // physicalGoalsLogs uses doc ID = date, field names: weight, bodyfat
  if (measurements.weight != null || measurements.bodyFatPercent != null) {
    const physLogRef = doc(db, "physicalGoalsLogs", date);
    const physUpdate = {};
    if (measurements.weight != null) physUpdate.weight = measurements.weight;
    if (measurements.bodyFatPercent != null) physUpdate.bodyfat = measurements.bodyFatPercent;
    await setDoc(physLogRef, physUpdate, { merge: true });
  }

  return { id: measurementId, ...payload };
};

export const getLatestMeasurement = async (userId) => {
  // No orderBy — avoids requiring a Firestore composite index; sort in JS instead
  const q = query(
    collection(db, "bodyMeasurements"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  docs.sort((a, b) => b.date.localeCompare(a.date));
  return docs[0];
};

export const getMeasurementHistory = async (userId, count = 100) => {
  const q = query(
    collection(db, "bodyMeasurements"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  docs.sort((a, b) => a.date.localeCompare(b.date)); // ascending for chart
  return docs.slice(-count);
};

// Historical measurements from CSV (Mimechael Jackson Muscles - MuscMeasure.csv)
// Dates converted from M/D/YY → YYYY-MM-DD; values in cm
const HISTORICAL_MEASUREMENTS = [
  { date: '2023-09-26', thighs_right: 67,   thighs_left: 66,   calves_right: 40,   calves_left: 40,   hips: 117.5, waist: 95.5, upperArms_right: 28.2, upperArms_left: 27.2, forearms_right: 24.5, forearms_left: 24.2 },
  { date: '2023-11-12', thighs_right: 66,   thighs_left: 66,   calves_right: 39,   calves_left: 38,   hips: 117,   waist: 90.5, upperArms_right: 30.4, upperArms_left: 30.4, forearms_right: 25.5, forearms_left: 24.2 },
  { date: '2024-01-01', thighs_right: 66,   thighs_left: 64,   calves_right: 39,   calves_left: 39,   hips: 119,   waist: 93.2, upperArms_right: 30,   upperArms_left: 30,   forearms_right: 25,   forearms_left: 24.2 },
  { date: '2024-03-28', thighs_right: 65.6, thighs_left: 65.6, calves_right: 39,   calves_left: 39,   hips: 119.5, waist: 89.5, upperArms_right: 30,   upperArms_left: 30,   forearms_right: 25.5, forearms_left: 25.5 },
  { date: '2024-05-04', thighs_right: 65,   thighs_left: 64,   calves_right: 40.1, calves_left: 39.5, hips: 115,   waist: 90.5, upperArms_right: 30,   upperArms_left: 30.2, forearms_right: 25,   forearms_left: 25   },
  { date: '2024-06-06', thighs_right: 64,   thighs_left: 64,   calves_right: 40,   calves_left: 39,   hips: 115,   waist: 88,   upperArms_right: 31,   upperArms_left: 31,   forearms_right: 25,   forearms_left: 25   },
  { date: '2024-07-02', thighs_right: 64.5, thighs_left: 64.5, calves_right: 40,   calves_left: 40,   hips: 114.5, waist: 88,   upperArms_right: 30.3, upperArms_left: 31,   forearms_right: 24.8, forearms_left: 24.9 },
  { date: '2024-10-26', thighs_right: 66.5, thighs_left: 64.5, calves_right: 40,   calves_left: 39.5, hips: 114.5, waist: 88,   upperArms_right: 30,   upperArms_left: 28,   forearms_right: 25,   forearms_left: 24.5 },
  { date: '2025-02-08', thighs_right: 64,   thighs_left: 64,   calves_right: 38.5, calves_left: 38.5, hips: 113,   waist: 87.4, upperArms_right: 31,   upperArms_left: 31,   forearms_right: 24.5, forearms_left: 24.5 },
  { date: '2025-08-04', thighs_right: 63.5, thighs_left: 64,   calves_right: 39,   calves_left: 38.5, hips: 114,   waist: 91,   upperArms_right: 30.5, upperArms_left: 30.2, forearms_right: 24.8, forearms_left: 25.1 },
];

// Auto-seed historical records on first use — runs once if no measurements exist for this user
export const seedHistoricalMeasurementsIfEmpty = async (userId) => {
  const existing = await getLatestMeasurement(userId);
  if (existing) return; // already has data, skip

  for (const { date, ...measurements } of HISTORICAL_MEASUREMENTS) {
    const measurementId = `${userId}-${date}`;
    const payload = { userId, date, ...measurements, changes: {}, loggedAt: serverTimestamp() };
    await setDoc(doc(db, "bodyMeasurements", measurementId), payload);
  }
};

// ============================================
// WEEK MANAGEMENT
// ============================================

export const advanceWeek = async (programId) => {
  const programDoc = await getProgramDoc(programId);
  if (!programDoc) throw new Error("Program not found");
  if (programDoc.currentWeek >= programDoc.duration) {
    await updateDoc(doc(db, "muscleBuildingPrograms", programId), {
      status: 'completed',
      completedAt: serverTimestamp(),
    });
    return { completed: true };
  }

  await updateDoc(doc(db, "muscleBuildingPrograms", programId), {
    currentWeek: programDoc.currentWeek + 1,
    sessionsThisWeek: 0,
    updatedAt: serverTimestamp(),
  });
  return { currentWeek: programDoc.currentWeek + 1 };
};

// ============================================
// STRENGTH-SPECIFIC PROGRESSION
// ============================================

export const calculateStrengthNextTarget = (exerciseData, isLowerBody = false) => {
  if (!exerciseData.sets || exerciseData.sets.length === 0) return null;

  const targetReps = 5;
  const maxWeight = Math.max(...exerciseData.sets.map(s => s.weight || 0));
  const allSetsCompleted = exerciseData.sets.every(s => s.reps >= targetReps);
  const increment = isLowerBody ? 10 : 5;

  if (allSetsCompleted) {
    return {
      exerciseId: exerciseData.exerciseId,
      suggestedWeight: maxWeight + increment,
      suggestedReps: targetReps,
      message: `All reps completed! Add ${increment} lbs → ${maxWeight + increment} lbs next week`,
    };
  }

  return {
    exerciseId: exerciseData.exerciseId,
    suggestedWeight: maxWeight,
    suggestedReps: targetReps,
    message: `Missed reps — repeat ${maxWeight} lbs next week`,
  };
};
