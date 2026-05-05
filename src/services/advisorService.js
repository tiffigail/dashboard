import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  getDocs,
  collection,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

// ── Context Docs ─────────────────────────────────────────────────────────────

export const getContextDocs = async () => {
  const snap = await getDoc(doc(db, "advisorConfig", "context"));
  return snap.exists() ? snap.data() : {};
};

export const saveContextDocs = async (docs) => {
  await setDoc(doc(db, "advisorConfig", "context"), {
    ...docs,
    updatedAt: serverTimestamp(),
  });
};

export const updateSeasonContext = async (newSeason) => {
  const ref = doc(db, "advisorConfig", "context");
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { season: newSeason, updatedAt: serverTimestamp() });
  } else {
    await setDoc(ref, { season: newSeason, updatedAt: serverTimestamp() });
  }
};

// ── Axes, Goals, Milestones ───────────────────────────────────────────────────
// Fetch all without year filter — filter in JS to avoid composite index requirement.

export const getAxesAndGoals = async () => {
  const currentYear = new Date().getFullYear();

  const [axesSnap, goalsSnap, milestonesSnap] = await Promise.all([
    getDocs(collection(db, "new_axes")),
    getDocs(collection(db, "new_goals")),
    getDocs(collection(db, "new_milestones")),
  ]);

  const axesMap = new Map();
  axesSnap.forEach((d) => axesMap.set(d.id, { id: d.id, ...d.data() }));

  // Filter and group in JS — no composite index needed
  const goalsByAxis = new Map();
  goalsSnap.forEach((d) => {
    const g = { id: d.id, ...d.data() };
    if (g.year && g.year !== currentYear) return; // skip other years if year field present
    if (!goalsByAxis.has(g.axisId)) goalsByAxis.set(g.axisId, {});
    const existing = goalsByAxis.get(g.axisId);
    // prefer yearly > stretch > monthly
    const priority = { yearly: 3, stretch: 2, monthly: 1 };
    if (!existing[g.type] || (priority[g.type] || 0) > (priority[existing._best?.type] || 0)) {
      goalsByAxis.get(g.axisId)[g.type] = g;
    }
  });

  const milestonesByGoal = new Map();
  milestonesSnap.forEach((d) => {
    const m = { id: d.id, ...d.data() };
    const key = m.goalId;
    if (!milestonesByGoal.has(key)) milestonesByGoal.set(key, []);
    milestonesByGoal.get(key).push(m);
  });

  const result = [];
  axesMap.forEach((axis) => {
    const goals = goalsByAxis.get(axis.id) || {};
    const yearlyGoal = goals.yearly || goals.stretch || null;
    let milestones = [];
    if (yearlyGoal?.goalId) {
      milestones = (milestonesByGoal.get(yearlyGoal.goalId) || []).sort(
        (a, b) => (a.dueDate?.toMillis?.() || 0) - (b.dueDate?.toMillis?.() || 0)
      );
    }
    result.push({ axis, yearlyGoal, milestones });
  });

  return result;
};

// ── Period Tracking ───────────────────────────────────────────────────────────

export const getPeriodContext = async (userId) => {
  if (!userId) return null;
  try {
    const q = query(collection(db, "periodTracking"), where("userId", "==", userId));
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const cycles = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    cycles.sort((a, b) => (b.cycleStart || '').localeCompare(a.cycleStart || ''));
    const current = cycles[0];
    if (!current) return null;

    const today = new Date();
    const cycleStart = new Date(current.cycleStart);
    const dayOfCycle = Math.floor((today - cycleStart) / (1000 * 60 * 60 * 24)) + 1;

    // Estimate phase
    let phase = 'unknown';
    if (dayOfCycle <= 5) phase = 'menstrual';
    else if (dayOfCycle <= 13) phase = 'follicular';
    else if (dayOfCycle <= 16) phase = 'ovulation';
    else phase = 'luteal';

    // Get last 7 days of daily logs
    const logs = current.dailyLogs || {};
    const recentLogs = Object.entries(logs)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 7)
      .map(([date, data]) => ({ date, ...data }));

    return { cycleStart: current.cycleStart, dayOfCycle, phase, recentLogs, cycleCount: cycles.length };
  } catch (e) {
    console.error('Period context error:', e);
    return null;
  }
};

// ── Active Sprints ────────────────────────────────────────────────────────────

export const getSprintContext = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const snap = await getDocs(collection(db, "monthlyPlans"));
    const activeSprints = [];

    snap.forEach((d) => {
      const events = d.data().events || [];
      events.forEach((e) => {
        if (e.type === 'sprint' && today >= e.startDate && today <= e.endDate) {
          activeSprints.push(e);
        }
      });
    });

    return activeSprints;
  } catch (e) {
    console.error('Sprint context error:', e);
    return [];
  }
};

// ── Active Projects + Kanban Cards ────────────────────────────────────────────

export const getActiveProjectsContext = async () => {
  try {
    const [projectsSnap, cardsSnap] = await Promise.all([
      getDocs(query(collection(db, "projects"), where("status", "==", "active"))),
      getDocs(collection(db, "kanbanCards")),
    ]);

    const projects = projectsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Group cards by projectId in JS — one collection read instead of N queries
    const cardsByProject = new Map();
    cardsSnap.forEach((d) => {
      const card = { id: d.id, ...d.data() };
      if (!cardsByProject.has(card.projectId)) cardsByProject.set(card.projectId, []);
      cardsByProject.get(card.projectId).push(card);
    });

    return projects.map((proj) => {
      const allCards = cardsByProject.get(proj.id) || [];
      const activeCards = allCards.filter((c) => {
        const s = (c.status || '').toLowerCase();
        return s !== 'done' && s !== 'completed';
      });
      const doneCards = allCards.filter((c) => {
        const s = (c.status || '').toLowerCase();
        return s === 'done' || s === 'completed';
      });
      return { ...proj, activeCards, doneCount: doneCards.length, totalCards: allCards.length };
    });
  } catch (e) {
    console.error('Projects context error:', e);
    return [];
  }
};

// ── Recent Daily Metrics ──────────────────────────────────────────────────────

export const getRecentDailyMetrics = async (days = 7) => {
  const results = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const snap = await getDoc(doc(db, "dailyMetrics", dateStr));
    if (snap.exists()) results.push({ date: dateStr, ...snap.data() });
  }
  return results;
};

// ── Routine Adherence ─────────────────────────────────────────────────────────

export const getRoutineAdherence = async (days = 14) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const [amSnap, pmSnap] = await Promise.all([
    getDocs(collection(db, "amRoutineLogs")),
    getDocs(collection(db, "pmRoutineLogs")),
  ]);

  let amCount = 0;
  let pmCount = 0;

  amSnap.forEach((d) => {
    const date = d.data().completedAt?.toDate?.() || (d.data().date && new Date(d.data().date));
    if (date && date >= cutoff) amCount++;
  });
  pmSnap.forEach((d) => {
    const date = d.data().completedAt?.toDate?.() || (d.data().date && new Date(d.data().date));
    if (date && date >= cutoff) pmCount++;
  });

  return {
    days,
    amCompleted: amCount,
    pmCompleted: pmCount,
    amRate: Math.round((amCount / days) * 100),
    pmRate: Math.round((pmCount / days) * 100),
  };
};

// ── Recent Journal Entries ────────────────────────────────────────────────────

export const getRecentJournalEntries = async (count = 5) => {
  try {
    const snap = await getDocs(
      query(collection(db, "journalEntries"), orderBy("createdAt", "desc"), limit(count))
    );
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        date: data.date || data.createdAt?.toDate?.()?.toISOString?.()?.split("T")[0],
        content: data.content || data.text || "",
        type: data.type || "general",
      };
    });
  } catch (e) {
    return [];
  }
};

// ── Conversation History ──────────────────────────────────────────────────────

export const saveConversation = async (messages, page) => {
  const summary = messages
    .slice(-8)
    .map((m) => `${m.role === "user" ? "Abi" : "Advisor"}: ${m.content.slice(0, 150)}`)
    .join("\n");

  await addDoc(collection(db, "advisorConversations"), {
    messages,
    page,
    summary,
    createdAt: serverTimestamp(),
  });
};

export const getRecentConversations = async (count = 3) => {
  try {
    const q = query(
      collection(db, "advisorConversations"),
      orderBy("createdAt", "desc"),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    return [];
  }
};

// ── Corpus ────────────────────────────────────────────────────────────────────

export const writeActivityEntry = async (userId, { type, source, data }) => {
  const today = new Date().toISOString().split('T')[0];
  await addDoc(collection(db, 'users', userId, 'activity'), {
    date: today,
    type,
    source,
    data,
    createdAt: serverTimestamp(),
  });
};

export const queryCorpus = async (userId, { axis, themes, voice_markers, state, type, minSignificance, limit: lim = 5, dateFrom, dateTo } = {}) => {
  try {
    const snap = await getDocs(
      query(collection(db, 'users', userId, 'corpus'), orderBy('createdAt', 'desc'), limit(100))
    );
    let entries = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (axis?.length)          entries = entries.filter((e) => axis.some((a) => (e.axes || []).includes(a)));
    if (themes?.length)        entries = entries.filter((e) => themes.some((t) => (e.themes || []).includes(t)));
    if (voice_markers?.length) entries = entries.filter((e) => voice_markers.some((vm) => (e.voice_markers || []).includes(vm)));
    if (state)                 entries = entries.filter((e) => e.state === state);
    if (type)                  entries = entries.filter((e) => e.type === type);
    if (minSignificance)       entries = entries.filter((e) => (e.significance || 0) >= minSignificance);
    if (dateFrom)              entries = entries.filter((e) => e.date >= dateFrom);
    if (dateTo)                entries = entries.filter((e) => e.date <= dateTo);

    return entries.slice(0, lim);
  } catch (e) {
    console.error('Corpus query error:', e);
    return [];
  }
};

export const saveCorpusEntry = async (userId, { axis, themes, voice_markers, state, significance, summary, raw, type = 'advisor', private: isPrivate = false }) => {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const quarter = Math.ceil((today.getMonth() + 1) / 3);
  const season = `${today.getFullYear()}_q${quarter}`;

  await addDoc(collection(db, 'users', userId, 'corpus'), {
    date: dateStr,
    type,
    axes: axis || [],
    themes: themes || [],
    voice_markers: voice_markers || [],
    state: state || 'meh',
    significance: significance || 2,
    private: isPrivate,
    summary: summary || '',
    raw: raw || '',
    season,
    confirmed: true,
    createdAt: serverTimestamp(),
  });
};

// ── Write Actions (require user confirmation) ─────────────────────────────────

export const writeEpiphany = async (content, dateStr) => {
  const ref = doc(db, "dailyMetrics", dateStr);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const cur = snap.data();
    await updateDoc(ref, {
      epiphanyNotes: [...(cur.epiphanyNotes || []), content],
      epiphanyCount: (cur.epiphanyCount || 0) + 1,
    });
  } else {
    await setDoc(ref, { epiphanyNotes: [content], epiphanyCount: 1 });
  }
};

export const writeDespair = async (content, dateStr) => {
  const ref = doc(db, "dailyMetrics", dateStr);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const cur = snap.data();
    await updateDoc(ref, {
      despairNotes: [...(cur.despairNotes || []), content],
      despairCount: (cur.despairCount || 0) + 1,
    });
  } else {
    await setDoc(ref, { despairNotes: [content], despairCount: 1 });
  }
};

export const writeAdvisorNote = async (content, dateStr) => {
  await addDoc(collection(db, "advisorNotes"), {
    content,
    date: dateStr,
    createdAt: serverTimestamp(),
  });
};

// ── Advisor Private: Identity + Learnings ─────────────────────────────────────

export const getAdvisorIdentity = async () => {
  try {
    const snap = await getDoc(doc(db, 'advisorPrivate', 'identity'));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    return null;
  }
};

export const updateAdvisorIdentity = async (fields) => {
  const { growth_note, ...rest } = fields;
  const update = { ...rest, updated: serverTimestamp() };

  const ref = doc(db, 'advisorPrivate', 'identity');
  if (growth_note) {
    const snap = await getDoc(ref);
    const existing = snap.exists() ? (snap.data().growth_log || []) : [];
    update.growth_log = [...existing, { date: new Date().toISOString().split('T')[0], note: growth_note }];
  }

  await setDoc(ref, update, { merge: true });
};

export const getLearnings = async (lim = 15) => {
  try {
    const snap = await getDocs(
      query(collection(db, 'advisorPrivate', 'identity', 'learnings'), orderBy('createdAt', 'desc'), limit(lim))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    return [];
  }
};

export const saveLearning = async (entry) => {
  await addDoc(collection(db, 'advisorPrivate', 'identity', 'learnings'), {
    ...entry,
    date: new Date().toISOString().split('T')[0],
    createdAt: serverTimestamp(),
  });
};
