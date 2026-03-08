import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { createFitnessGoal, updateFitnessGoal, achieveFitnessGoal, calculateGoalProgress, getBadgeLevel } from "./physicalGoalsService";
import { getJourneyById, stepsToMiles } from "../data/enduranceJourneys";

/**
 * Create a new endurance goal from a journey template
 */
export const createEnduranceGoal = async (userId, journeyId) => {
  const journey = getJourneyById(journeyId);
  if (!journey) throw new Error(`Journey not found: ${journeyId}`);

  const isDistance = journey.type === 'distance';

  // Total milestones for session-based goals
  const totalMilestones = journey.milestones ? journey.milestones.length : 3;

  const goalData = {
    title: journey.title,
    emoji: journey.emoji,
    category: 'endurance',
    description: journey.description,
    journeyId: journey.id,
    journeyType: journey.type,
    totalSteps: 0,
    totalMiles: 0,
    milestonesReached: [],
    target: isDistance
      ? { metric: 'miles', startValue: 0, targetValue: journey.totalDistance, currentValue: 0, unit: 'mi' }
      : { metric: 'milestones', startValue: 0, targetValue: totalMilestones, currentValue: 0, unit: 'milestones' },
    qualifyingSessions: [],
    allSessions: [],
    relatedExercises: [],
    // Runner's High specific fields
    ...(journey.id === 'runners-high' && {
      age: null,
      maxHR: null,
      baselineRHR: null,
      currentPhase: 'baseline',
      phaseProgress: { baseline: 0, build: 0, push: 0, chase: 0 },
    }),
  };

  return createFitnessGoal(userId, goalData);
};

/**
 * Log daily steps for a specific endurance goal
 */
export const logDailySteps = async (goalId, userId, date, steps) => {
  const miles = stepsToMiles(steps);

  // Write to subcollection
  const stepLogRef = doc(db, "fitnessGoals", goalId, "stepLogs", date);
  await setDoc(stepLogRef, {
    userId,
    date,
    steps,
    miles: parseFloat(miles.toFixed(2)),
    loggedAt: serverTimestamp(),
  }, { merge: true });

  // Get current goal state
  const goalRef = doc(db, "fitnessGoals", goalId);
  const goalSnap = await getDoc(goalRef);
  if (!goalSnap.exists()) return null;
  const goal = { id: goalSnap.id, ...goalSnap.data() };

  // Recalculate totals from all step logs
  const logsSnap = await getDocs(collection(db, "fitnessGoals", goalId, "stepLogs"));
  let totalSteps = 0;
  logsSnap.forEach(d => { totalSteps += d.data().steps || 0; });
  const totalMiles = parseFloat(stepsToMiles(totalSteps).toFixed(2));

  // Check milestones
  const journey = getJourneyById(goal.journeyId);
  const reachedIds = (goal.milestonesReached || []).map(m => m.mile || m.level);
  const newMilestones = [];
  if (journey) {
    for (const ms of journey.milestones) {
      const msKey = ms.mile;
      if (msKey && totalMiles >= msKey && !reachedIds.includes(msKey)) {
        newMilestones.push({ mile: msKey, location: ms.location, emoji: ms.emoji, reachedOn: date, stepCount: totalSteps });
      }
    }
  }

  const allMilestonesReached = [...(goal.milestonesReached || []), ...newMilestones];
  const progress = calculateGoalProgress(0, totalMiles, goal.target.targetValue);
  const badge = getBadgeLevel(progress);

  const updates = {
    totalSteps,
    totalMiles,
    progress,
    badge,
    milestonesReached: allMilestonesReached,
    'target.currentValue': totalMiles,
  };

  await updateFitnessGoal(goalId, updates);

  // Auto-achieve if complete
  if (progress >= 100) {
    await achieveFitnessGoal(goalId);
  }

  return { newMilestones, totalMiles, progress };
};

/**
 * Update all active distance-type endurance goals for a user with daily steps.
 * Called from PmRoutineForm after steps are saved.
 */
export const updateActiveDistanceGoals = async (userId, date, steps) => {
  if (!steps || steps <= 0) return [];

  const q = query(
    collection(db, "fitnessGoals"),
    where("userId", "==", userId),
    where("status", "==", "active"),
    where("category", "==", "endurance")
  );
  const snap = await getDocs(q);
  const results = [];

  for (const d of snap.docs) {
    const goal = { id: d.id, ...d.data() };
    if (goal.journeyType === 'distance') {
      const result = await logDailySteps(goal.id, userId, date, steps);
      results.push({ goalId: goal.id, ...result });
    }
  }
  return results;
};

/**
 * Set age for a Runner's High goal (called once from the logger UI)
 */
export const setRunnerAge = async (goalId, age) => {
  const maxHR = 220 - age;
  await updateFitnessGoal(goalId, { age, maxHR });
  return maxHR;
};

/**
 * Calculate HR metrics from raw session inputs
 */
const calculateSessionMetrics = (sessionData, goal) => {
  const maxHR = goal.maxHR || (220 - (goal.age || 30));
  const restingHR = sessionData.restingHR;
  const peakHR = sessionData.peakHR;
  const postHR = sessionData.postExerciseHR;

  const heartRateReserve = maxHR - restingHR;
  const hrrPercent = heartRateReserve > 0
    ? Math.round(((peakHR - restingHR) / heartRateReserve) * 100)
    : 0;
  const recoveryDelta = peakHR - postHR;

  return { maxHR, heartRateReserve, hrrPercent, recoveryDelta };
};

/**
 * Determine which phase a session qualifies for
 */
const getPhaseQualification = (session, journey) => {
  if (!journey?.phases) return null;
  const { hrrPercent, duration } = session;

  // Check phases in reverse order (hardest first) so we credit the highest phase
  for (let i = journey.phases.length - 1; i >= 0; i--) {
    const phase = journey.phases[i];
    if (phase.id === 'baseline') continue; // baseline always qualifies
    const durOk = !phase.durationTarget || duration >= phase.durationTarget;
    const hrrOk = !phase.hrrTarget || (hrrPercent >= phase.hrrTarget.min && hrrPercent <= phase.hrrTarget.max);
    if (durOk && hrrOk) return phase.id;
  }
  return 'baseline';
};

/**
 * Log a cardio session for Runner's High achievement.
 * Inputs: restingHR, peakHR, postExerciseHR, duration, rpe (1-10), feltEuphoria ('no'|'maybe'|'yes'), date
 * App calculates: maxHR, HRR, HRR%, recoveryDelta, phase qualification
 */
export const logCardioSession = async (goalId, userId, sessionData) => {
  const goalRef = doc(db, "fitnessGoals", goalId);
  const goalSnap = await getDoc(goalRef);
  if (!goalSnap.exists()) return null;
  const goal = { id: goalSnap.id, ...goalSnap.data() };
  const journey = getJourneyById(goal.journeyId);

  // Calculate HR metrics
  const metrics = calculateSessionMetrics(sessionData, goal);

  const session = {
    date: sessionData.date,
    duration: sessionData.duration,
    restingHR: sessionData.restingHR,
    peakHR: sessionData.peakHR,
    postExerciseHR: sessionData.postExerciseHR,
    rpe: sessionData.rpe,
    feltEuphoria: sessionData.feltEuphoria || 'no',
    notes: sessionData.notes || '',
    // Auto-calculated
    ...metrics,
    hrrPercent: metrics.hrrPercent,
    loggedAt: new Date().toISOString(),
  };

  // Determine which phase this session qualifies for
  session.qualifiesForPhase = getPhaseQualification(session, journey);

  const allSessions = [...(goal.allSessions || []), session];

  // Recalculate phase progress from all sessions
  const phaseProgress = { baseline: 0, build: 0, push: 0, chase: 0 };
  for (const s of allSessions) {
    const p = s.qualifiesForPhase || 'baseline';
    // Sessions qualifying for higher phases also count for lower ones
    if (p === 'chase') { phaseProgress.chase++; phaseProgress.push++; phaseProgress.build++; phaseProgress.baseline++; }
    else if (p === 'push') { phaseProgress.push++; phaseProgress.build++; phaseProgress.baseline++; }
    else if (p === 'build') { phaseProgress.build++; phaseProgress.baseline++; }
    else { phaseProgress.baseline++; }
  }

  // Determine current phase based on completion
  let currentPhase = 'baseline';
  const phases = journey?.phases || [];
  for (const phase of phases) {
    const required = phase.sessionsRequired;
    if (required && phaseProgress[phase.id] >= required) {
      // This phase is complete, move to next
      const idx = phases.indexOf(phase);
      if (idx < phases.length - 1) currentPhase = phases[idx + 1].id;
      else currentPhase = phase.id; // last phase
    } else {
      currentPhase = phase.id;
      break;
    }
  }

  // Calculate baseline RHR (average resting HR from baseline sessions)
  const baselineSessions = allSessions.slice(0, Math.min(3, allSessions.length));
  const baselineRHR = baselineSessions.length > 0
    ? Math.round(baselineSessions.reduce((sum, s) => sum + (s.restingHR || 0), 0) / baselineSessions.length)
    : null;

  // Check milestones
  const reachedLevels = (goal.milestonesReached || []).map(m => m.level);
  const newMilestones = [];
  if (journey) {
    for (const ms of journey.milestones) {
      if (reachedLevels.includes(ms.level)) continue;
      if (ms.phase === 'baseline' && phaseProgress.baseline >= 3) {
        newMilestones.push({ level: ms.level, name: ms.name, emoji: ms.emoji, reachedOn: sessionData.date });
      } else if (ms.phase === 'build' && phaseProgress.build >= 3) {
        newMilestones.push({ level: ms.level, name: ms.name, emoji: ms.emoji, reachedOn: sessionData.date });
      } else if (ms.phase === 'push' && phaseProgress.push >= 3) {
        newMilestones.push({ level: ms.level, name: ms.name, emoji: ms.emoji, reachedOn: sessionData.date });
      } else if (ms.phase === 'chase' && sessionData.feltEuphoria === 'yes') {
        newMilestones.push({ level: ms.level, name: ms.name, emoji: ms.emoji, reachedOn: sessionData.date });
      }
    }
  }

  const allMilestonesReached = [...(goal.milestonesReached || []), ...newMilestones];
  const milestonesCompleted = allMilestonesReached.length;
  const progress = calculateGoalProgress(0, milestonesCompleted, goal.target.targetValue);
  const badge = getBadgeLevel(progress);

  await updateFitnessGoal(goalId, {
    allSessions,
    qualifyingSessions: allSessions.filter(s => s.qualifiesForPhase !== 'baseline'),
    milestonesReached: allMilestonesReached,
    phaseProgress,
    currentPhase,
    baselineRHR,
    progress,
    badge,
    'target.currentValue': milestonesCompleted,
    workoutCount: allSessions.length,
  });

  if (progress >= 100) {
    await achieveFitnessGoal(goalId);
  }

  // Also write a unified workoutLog entry so "Recent Workouts" can show cardio sessions
  await addDoc(collection(db, "workoutLogs"), {
    userId,
    date: sessionData.date,
    workoutName: goal.title || 'Cardio',
    source: 'cardio',
    duration: sessionData.duration || 0,
    exercises: [],
    totalVolume: 0,
    goalId,
    peakHR: sessionData.peakHR || null,
    hrrPercent: metrics.hrrPercent || null,
    createdAt: serverTimestamp(),
  });

  return { session, currentPhase, phaseProgress, newMilestones, progress };
};

/**
 * Sync a distance-based endurance goal's progress from physicalGoalsLogs.
 * Reads all daily step logs since the goal was created and recalculates totals.
 * Called when the dashboard loads to keep progress current.
 */
export const syncDistanceGoalFromDailyLogs = async (goal) => {
  if (!goal || goal.journeyType !== 'distance' || goal.status !== 'active') return null;

  // Get the goal's start date from createdAt
  let startDate;
  if (goal.createdAt?.toDate) {
    startDate = goal.createdAt.toDate().toISOString().split('T')[0];
  } else if (goal.createdAt?.seconds) {
    startDate = new Date(goal.createdAt.seconds * 1000).toISOString().split('T')[0];
  } else {
    startDate = '2020-01-01'; // fallback
  }

  // Query physicalGoalsLogs for all dates >= startDate
  const logsQuery = query(
    collection(db, "physicalGoalsLogs"),
    where("__name__", ">=", startDate),
    orderBy("__name__")
  );
  const logsSnap = await getDocs(logsQuery);

  let totalSteps = 0;
  logsSnap.forEach(d => {
    totalSteps += Number(d.data().steps) || 0;
  });

  const totalMiles = parseFloat(stepsToMiles(totalSteps).toFixed(2));

  // Check milestones
  const journey = getJourneyById(goal.journeyId);
  const reachedIds = (goal.milestonesReached || []).map(m => m.mile);
  const newMilestones = [];
  if (journey) {
    for (const ms of journey.milestones) {
      if (ms.mile && totalMiles >= ms.mile && !reachedIds.includes(ms.mile)) {
        const today = new Date().toISOString().split('T')[0];
        newMilestones.push({ mile: ms.mile, location: ms.location, emoji: ms.emoji, reachedOn: today, stepCount: totalSteps });
      }
    }
  }

  const allMilestonesReached = [...(goal.milestonesReached || []), ...newMilestones];
  const progress = calculateGoalProgress(0, totalMiles, goal.target.targetValue);
  const badge = getBadgeLevel(progress);

  // Only update if something changed
  if (totalSteps !== (goal.totalSteps || 0) || newMilestones.length > 0) {
    await updateFitnessGoal(goal.id, {
      totalSteps,
      totalMiles,
      progress,
      badge,
      milestonesReached: allMilestonesReached,
      'target.currentValue': totalMiles,
    });

    if (progress >= 100) {
      await achieveFitnessGoal(goal.id);
    }
  }

  return { totalSteps, totalMiles, progress, badge, milestonesReached: allMilestonesReached };
};

/**
 * Sync all active distance endurance goals for a user from physicalGoalsLogs.
 * Called when the FitnessAchievementDashboard loads.
 */
export const syncAllDistanceGoals = async (goals) => {
  const distanceGoals = goals.filter(g => g.category === 'endurance' && g.journeyType === 'distance' && g.status === 'active');
  for (const goal of distanceGoals) {
    await syncDistanceGoalFromDailyLogs(goal);
  }
};

/**
 * Get step history for a goal
 */
export const getStepHistory = async (goalId) => {
  const logsSnap = await getDocs(
    query(collection(db, "fitnessGoals", goalId, "stepLogs"), orderBy("date", "desc"))
  );
  return logsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
};
