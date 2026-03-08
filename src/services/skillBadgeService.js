import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getSkillBadgeTemplateById, getFirstLevelNumber } from "../data/skillBadgeTemplates";

// ============================================
// SKILL BADGE ENROLLMENT
// ============================================

export const startSkillBadge = async (userId, templateId) => {
  const template = getSkillBadgeTemplateById(templateId);
  if (!template) throw new Error(`Unknown skill badge: ${templateId}`);

  const badgeId = `${userId}-${templateId}`;
  const firstLevel = getFirstLevelNumber(templateId);

  const levels = template.levels.map((level, idx) => ({
    levelNumber: level.levelNumber,
    levelName: level.name,
    badgeEmoji: level.emoji,
    status: idx === 0 ? 'in-progress' : 'locked',
    ...(idx === 0 ? { startedDate: new Date().toISOString().slice(0, 10) } : {}),
    drills: level.drills.map(d => ({
      name: d.name,
      completed: false,
      practiceCount: 0,
    })),
  }));

  const badgeDoc = {
    userId,
    skillId: templateId,
    skillName: template.title,
    category: 'skill',
    subcategory: template.subcategory,
    emoji: template.emoji,
    currentLevel: firstLevel,
    totalLevels: template.totalLevels,
    levels,
    totalPracticeSessions: 0,
    totalPracticeMinutes: 0,
    lastPracticeDate: null,
    currentStreak: 0,
    longestStreak: 0,
    createdAt: serverTimestamp(),
    lastUpdated: serverTimestamp(),
  };

  await setDoc(doc(db, "skillBadges", badgeId), badgeDoc);
  return { id: badgeId, ...badgeDoc };
};

// ============================================
// FETCHING BADGES
// ============================================

export const getActiveSkillBadges = async (userId) => {
  const q = query(
    collection(db, "skillBadges"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getSkillBadge = async (userId, skillId) => {
  const badgeId = `${userId}-${skillId}`;
  const snap = await getDoc(doc(db, "skillBadges", badgeId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

// ============================================
// PRACTICE LOGGING
// ============================================

export const logPracticeSession = async (userId, skillId, sessionData) => {
  const badgeId = `${userId}-${skillId}`;
  const badgeRef = doc(db, "skillBadges", badgeId);
  const badgeSnap = await getDoc(badgeRef);
  if (!badgeSnap.exists()) throw new Error("Skill badge not found");
  const badge = badgeSnap.data();

  const today = new Date().toISOString().slice(0, 10);

  // Save practice log
  const logDoc = {
    userId,
    skillId,
    date: sessionData.date || today,
    levelNumber: badge.currentLevel,
    drillsPracticed: sessionData.drillsPracticed || [],
    totalDuration: sessionData.totalDuration || 0,
    energyLevel: sessionData.energyLevel || 'medium',
    breakthroughs: sessionData.breakthroughs || '',
    challenges: sessionData.challenges || '',
    nextFocus: sessionData.nextFocus || '',
    videoUrl: sessionData.videoUrl || '',
    notes: sessionData.notes || '',
    // Skill-specific fields
    ...(sessionData.musicUsed ? { musicUsed: sessionData.musicUsed } : {}),
    ...(sessionData.spatialConsistency != null ? { spatialConsistency: sessionData.spatialConsistency } : {}),
    ...(sessionData.newPRs ? { newPRs: sessionData.newPRs } : {}),
    createdAt: serverTimestamp(),
  };

  await addDoc(collection(db, "skillPracticeLogs"), logDoc);

  // Update badge stats
  const practiceDate = sessionData.date || today;
  const streakUpdate = calculateStreakUpdate(badge, practiceDate);

  // Update drill practice counts on badge
  const updatedLevels = [...badge.levels];
  const currentLevelIdx = updatedLevels.findIndex(l => l.levelNumber === badge.currentLevel);
  if (currentLevelIdx !== -1 && sessionData.drillsPracticed) {
    sessionData.drillsPracticed.forEach(dp => {
      const drillIdx = updatedLevels[currentLevelIdx].drills.findIndex(d => d.name === dp.drillName);
      if (drillIdx !== -1) {
        updatedLevels[currentLevelIdx].drills[drillIdx].practiceCount =
          (updatedLevels[currentLevelIdx].drills[drillIdx].practiceCount || 0) + 1;
      }
    });
  }

  await updateDoc(badgeRef, {
    totalPracticeSessions: (badge.totalPracticeSessions || 0) + 1,
    totalPracticeMinutes: (badge.totalPracticeMinutes || 0) + (sessionData.totalDuration || 0),
    lastPracticeDate: practiceDate,
    currentStreak: streakUpdate.currentStreak,
    longestStreak: streakUpdate.longestStreak,
    levels: updatedLevels,
    lastUpdated: serverTimestamp(),
  });

  return logDoc;
};

function calculateStreakUpdate(badge, practiceDate) {
  const lastDate = badge.lastPracticeDate;
  let currentStreak = badge.currentStreak || 0;
  let longestStreak = badge.longestStreak || 0;

  if (!lastDate) {
    currentStreak = 1;
  } else {
    const last = new Date(lastDate);
    const current = new Date(practiceDate);
    const diffMs = current - last;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak += 1;
    } else if (diffDays > 1) {
      currentStreak = 1;
    }
    // Same day: no change
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  return { currentStreak, longestStreak };
}

// ============================================
// DRILL COMPLETION
// ============================================

export const completeDrill = async (userId, skillId, levelNumber, drillName) => {
  const badgeId = `${userId}-${skillId}`;
  const badgeRef = doc(db, "skillBadges", badgeId);
  const badgeSnap = await getDoc(badgeRef);
  if (!badgeSnap.exists()) throw new Error("Skill badge not found");
  const badge = badgeSnap.data();

  const updatedLevels = [...badge.levels];
  const levelIdx = updatedLevels.findIndex(l => l.levelNumber === levelNumber);
  if (levelIdx === -1) throw new Error("Level not found");

  const drillIdx = updatedLevels[levelIdx].drills.findIndex(d => d.name === drillName);
  if (drillIdx === -1) throw new Error("Drill not found");

  updatedLevels[levelIdx].drills[drillIdx].completed = true;
  updatedLevels[levelIdx].drills[drillIdx].completedDate = new Date().toISOString().slice(0, 10);

  await updateDoc(badgeRef, {
    levels: updatedLevels,
    lastUpdated: serverTimestamp(),
  });
};

// ============================================
// LEVEL COMPLETION
// ============================================

export const completeLevel = async (userId, skillId, levelNumber) => {
  const badgeId = `${userId}-${skillId}`;
  const badgeRef = doc(db, "skillBadges", badgeId);
  const badgeSnap = await getDoc(badgeRef);
  if (!badgeSnap.exists()) throw new Error("Skill badge not found");
  const badge = badgeSnap.data();

  const template = getSkillBadgeTemplateById(skillId);
  const updatedLevels = [...badge.levels];
  const levelIdx = updatedLevels.findIndex(l => l.levelNumber === levelNumber);
  if (levelIdx === -1) throw new Error("Level not found");

  // Complete current level
  updatedLevels[levelIdx].status = 'completed';
  updatedLevels[levelIdx].completedDate = new Date().toISOString().slice(0, 10);

  // Unlock next level
  let nextLevel = badge.currentLevel;
  if (levelIdx + 1 < updatedLevels.length) {
    updatedLevels[levelIdx + 1].status = 'in-progress';
    updatedLevels[levelIdx + 1].startedDate = new Date().toISOString().slice(0, 10);
    nextLevel = updatedLevels[levelIdx + 1].levelNumber;
  }

  await updateDoc(badgeRef, {
    currentLevel: nextLevel,
    levels: updatedLevels,
    lastUpdated: serverTimestamp(),
  });

  // Return completion message
  const messages = template?.levelCompletionMessages || {};
  return {
    message: messages[levelNumber] || `Level ${levelNumber} complete!`,
    nextLevel,
    isLastLevel: levelIdx + 1 >= updatedLevels.length,
  };
};

export const checkAllDrillsComplete = (badge) => {
  const currentLevelData = badge.levels?.find(l => l.levelNumber === badge.currentLevel);
  if (!currentLevelData) return false;
  return currentLevelData.drills.every(d => d.completed);
};

// ============================================
// PERSONAL RECORDS
// ============================================

export const logPersonalRecord = async (userId, skillId, recordType, value, notes = '') => {
  const recordDoc = {
    userId,
    skillId,
    recordType,
    value,
    date: new Date().toISOString().slice(0, 10),
    notes,
    createdAt: serverTimestamp(),
  };

  await addDoc(collection(db, "skillPersonalRecords"), recordDoc);
  return recordDoc;
};

export const getPersonalRecords = async (userId, skillId) => {
  const q = query(
    collection(db, "skillPersonalRecords"),
    where("userId", "==", userId),
    where("skillId", "==", skillId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ============================================
// PRACTICE HISTORY
// ============================================

export const getPracticeHistory = async (userId, skillId, count = 10) => {
  const q = query(
    collection(db, "skillPracticeLogs"),
    where("userId", "==", userId),
    where("skillId", "==", skillId),
    orderBy("createdAt", "desc"),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ============================================
// PERFORMANCE LOGGING (mime/moonwalk)
// ============================================

export const logPerformance = async (userId, skillId, performanceData) => {
  const perfDoc = {
    userId,
    skillId,
    date: performanceData.date || new Date().toISOString().slice(0, 10),
    title: performanceData.title || '',
    description: performanceData.description || '',
    durationSeconds: performanceData.durationSeconds || 0,
    setting: performanceData.setting || '',
    storyArc: performanceData.storyArc || [],
    techniquesUsed: performanceData.techniquesUsed || [],
    audienceType: performanceData.audienceType || '',
    audienceSize: performanceData.audienceSize || 0,
    feedback: performanceData.feedback || '',
    videoUrl: performanceData.videoUrl || '',
    spatialConsistency: performanceData.spatialConsistency || null,
    notes: performanceData.notes || '',
    createdAt: serverTimestamp(),
  };

  await addDoc(collection(db, "skillPerformances"), perfDoc);
  return perfDoc;
};

export const getPerformanceHistory = async (userId, skillId, count = 10) => {
  const q = query(
    collection(db, "skillPerformances"),
    where("userId", "==", userId),
    where("skillId", "==", skillId),
    orderBy("createdAt", "desc"),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};
