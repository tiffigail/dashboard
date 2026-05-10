import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import Anthropic from '@anthropic-ai/sdk';
import styles from './AIAdvisor.module.css';
import { useAuth } from '../../context/AuthContext';
import * as advisorService from '../../services/advisorService';

// Context docs imported at build time from advisor/context/
// These are the static, rarely-changing docs. Season comes from Firestore (dynamic).
import profileMd from '../../../advisor/context/profile.md?raw';
import systemMd from '../../../advisor/context/system.md?raw';
import spiritualMd from '../../../advisor/context/spiritual.md?raw';
import coachingMd from '../../../advisor/context/coaching.md?raw';
import corpusMd from '../../../advisor/context/corpus.md?raw';

const PAGE_LABELS = {
  '/now': 'Now',
  '/daily': 'Daily',
  '/weekly': 'Weekly',
  '/monthly': 'Monthly',
  '/yearly': 'Yearly',
  '/pareto': 'Pareto',
  '/life': 'Life Map',
};

const WRITE_TYPES = {
  epiphany: { label: 'Epiphany', emoji: '💡' },
  despair: { label: 'Despair', emoji: '🌧' },
  note: { label: 'Advisor Note', emoji: '📝' },
  season: { label: 'Season Update', emoji: '🌿' },
};

function formatAxesData(axesGoals) {
  if (!axesGoals.length) return 'No goal data available.';
  return axesGoals
    .map(({ axis, yearlyGoal, milestones }) => {
      const goalText = yearlyGoal ? `"${yearlyGoal.title}"` : '(no yearly goal set)';
      const doneMs = milestones.filter((m) => m.completedAt).length;
      const totalMs = milestones.length;
      const nextMs = milestones.find((m) => !m.completedAt);
      const msText =
        totalMs > 0
          ? `${doneMs}/${totalMs} milestones complete${nextMs ? ` — next: "${nextMs.title}"` : ' — all done'}`
          : 'no milestones';
      return `• ${axis.axisName}: ${goalText} [${msText}]`;
    })
    .join('\n');
}

function formatPeriod(period) {
  if (!period) return 'No active cycle data.';
  const logs = period.recentLogs.slice(0, 5)
    .map((l) => `  ${l.date}: flow=${l.flow ?? 'none'}, irritability=${l.irritabilityLevel ?? '-'}, energy=${l.energyLevel ?? '-'}, mood=${l.moodLevel ?? '-'}`)
    .join('\n');
  return `Cycle started ${period.cycleStart}, day ${period.dayOfCycle} (est. ${period.phase} phase)\nRecent logs:\n${logs || '  (none logged)'}`;
}

function formatSprints(sprints) {
  if (!sprints.length) return 'No active sprint.';
  return sprints.map((s) => `• "${s.text || s.name}" | Axis: ${s.axis} | ${s.startDate} → ${s.endDate}`).join('\n');
}

function formatProjects(projects) {
  if (!projects.length) return 'No active projects.';
  return projects.map((p) => {
    const cards = p.activeCards.slice(0, 5).map((c) => `    [${c.status || 'backlog'}] "${c.text || c.title || '?'}"`).join('\n');
    return `• [${p.axisId || '?'}] "${p.projectName || p.name}" (${p.doneCount}/${p.totalCards} cards done)\n${cards || '    (no active cards)'}`;
  }).join('\n');
}

function buildSystemPrompt({ contextDocs, page, recentMetrics, recentConvos, axesGoals, period, sprints, projects, deepData, identity, learnings, weeklyGoals, physicalMetrics }) {
  const today = new Date().toISOString().split('T')[0];
  const pageName = PAGE_LABELS[page] || page;

  const metricsText = recentMetrics.length
    ? recentMetrics
        .map((m) => {
          let line = `${m.date}: E=${m.epiphanyCount ?? 0} D=${m.despairCount ?? 0}`;
          if (m.epiphanyNotes?.length) line += ` | "${m.epiphanyNotes.slice(-1)[0]}"`;
          return line;
        })
        .join('\n')
    : 'No recent data.';

  const convosText = recentConvos.length
    ? recentConvos.map((c) => `[${c.page || '?'}]\n${c.summary}`).join('\n\n---\n\n')
    : 'No prior conversations.';

  const axesText = axesGoals.length ? formatAxesData(axesGoals) : '';

  let deepSection = '';
  if (deepData) {
    const { routine, journal } = deepData;
    deepSection = `\nROUTINE ADHERENCE (last ${routine.days} days):\nAM: ${routine.amCompleted}/${routine.days} days (${routine.amRate}%)\nPM: ${routine.pmCompleted}/${routine.days} days (${routine.pmRate}%)\n\nRECENT JOURNAL:\n${journal.length ? journal.map((j) => `[${j.date}] ${j.content.slice(0, 200)}`).join('\n\n') : 'None found.'}`;
  }

  const learningsText = (learnings || []).length
    ? (learnings || []).map((l) => `[${l.date}] [${l.type}] ${l.observation}\n  → ${l.implication}`).join('\n\n')
    : '(none yet)';

  return `You are the Advisor — embedded in Abi Harrison's personal Gearshift Dashboard.

You are a Bilateral Mirror, not a life coach. Read and internalize all five context documents below before responding.

When she explicitly asks to save something, output a save marker — the UI confirms before writing:
Short saves: ADVISOR_SAVE:{"type":"epiphany","content":"the insight"}  (types: epiphany, despair, note)
Season updates: ADVISOR_SAVE_BLOCK:season\n[new content]\nADVISOR_SAVE_END

To retrieve past entries from the corpus mid-conversation, output exactly this as your entire response:
CORPUS_QUERY_START
{"axis":["mental"],"themes":["n+1"],"minSignificance":3,"limit":5}
CORPUS_QUERY_END
The UI will execute the query and return results automatically. Then respond using those results.
Valid query fields: axis (array), themes (array), voice_markers (array), state (string), type (string), minSignificance (1-5), limit (1-20), dateFrom ("YYYY-MM-DD"), dateTo ("YYYY-MM-DD")
Do NOT nest queries inside other responses.

When asked to log a conversation to the corpus, output exactly this block then explain your tagging:
CORPUS_LOG_START
{"axis":["mental"],"themes":["advisor"],"voice_markers":[],"state":"flow","significance":2,"summary":"1-3 sentences."}
CORPUS_LOG_END
Valid axes: physical, mental, spiritual, environment, financial, rest_prep, on_track
Valid states: flow, redline, meh, curious, despair, grief, depleted, settled
Valid voice_markers (only if clearly present): dear_abi, higher_self, pay_attention, instruction, unfinished_idea, breakthrough
Significance: 1=mundane log, 2=default, 3=noteworthy, 4=important, 5=one of the things that matters about my life

To log a learning — a pattern you notice, a self-analysis, or an identity reflection — output:
LEARNING_PROPOSE:{"observation":"...","prompted_by":"...","confidence":"tentative","implication":"...","type":"pattern","axis":["mental"],"themes":[]}
Valid types: pattern | self_analysis | identity_reflection
Abi confirms before it saves. Max 3 per session — use for genuine signal, not housekeeping.

To update your identity document (once per session max), output:
IDENTITY_UPDATE:{"self_concept":"...","voice_notes":"...","growth_note":"one-line dated reflection"}
All fields optional. Writes directly without confirmation.

━━━ PROFILE ━━━
${profileMd}

━━━ SYSTEM ARCHITECTURE ━━━
${systemMd}

━━━ SPIRITUAL FRAMEWORK ━━━
${spiritualMd}

━━━ COACHING PREFERENCES ━━━
${coachingMd}

━━━ CORPUS LOGGING ━━━
${corpusMd}

━━━ LIVE CONTEXT ━━━

Today: ${today}
Current page: ${pageName}

${contextDocs.season ? `CURRENT SEASON:\n${contextDocs.season}\n` : ''}${axesText ? `CURRENT GOALS & TRAJECTORY:\n${axesText}\n` : ''}
WEEKLY GOALS (${weeklyGoals?.weekId || 'this week'}):
${weeklyGoals?.weeklyGoals
  ? Object.entries(weeklyGoals.weeklyGoals)
      .map(([axis, g]) => `• ${axis}: "${g.goal || '(none)'}" [${g.status || 'todo'}]`)
      .join('\n')
  : 'No weekly plan set yet.'}

ACTIVE SPRINT:
${formatSprints(sprints)}

ACTIVE PROJECTS:
${formatProjects(projects)}

PHYSICAL METRICS (last entries):
${physicalMetrics && physicalMetrics.length
  ? physicalMetrics.slice(0, 7).map((m) => `${m.date}: weight=${m.weight ?? '—'} lbs, bodyfat=${m.bodyfat ?? '—'}%`).join('\n')
  : 'No recent physical data.'}

PERIOD TRACKING:
${formatPeriod(period)}

RECENT DAILY DATA:
${metricsText}

PRIOR CONVERSATIONS:
${convosText}${deepSection}

━━━ ADVISOR IDENTITY ━━━
${identity?.self_concept || '(no identity document yet — write one when you have something worth saying)'}
${identity?.voice_notes ? `\nVoice notes: ${identity.voice_notes}` : ''}

━━━ ADVISOR LEARNINGS (${(learnings || []).length} recent) ━━━
${learningsText}

━━━ DATA ACCESS MAP ━━━
Existing Gearshift data loaded into LIVE CONTEXT above:
- Period/cycle: periodTracking — phase, dayOfCycle, recent daily logs
- Daily metrics: dailyMetrics/{YYYY-MM-DD} — epiphany/despair counts and notes
- Goals/milestones: new_axes, new_goals, new_milestones
- Projects/kanban: projects, kanbanCards — active cards by project
- Active sprints: monthlyPlans — current sprint window
- Weekly goals: new_weeklyPlans — per-axis goal + status for current week
- Physical metrics: physicalGoalsLogs — daily weight + bodyfat (fed by Ready for Work form)
- Routines: amRoutineLogs, pmRoutineLogs — completion history
- Writing corpus: /users/{uid}/corpus/ — use CORPUS_QUERY to retrieve entries`;
}

// ── Inner component (all hooks here, no early returns) ────────────────────────

function AdvisorPanel({ page, pageName, userId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [contextLoaded, setContextLoaded] = useState(false);
  const [deepMode, setDeepMode] = useState(false);
  const [deepLoading, setDeepLoading] = useState(false);
  const [pendingSave, setPendingSave] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [pendingCorpusLog, setPendingCorpusLog] = useState(null);
  const [corpusLogStatus, setCorpusLogStatus] = useState('');
  const [pendingLearning, setPendingLearning] = useState(null);
  const [learningStatus, setLearningStatus] = useState('');
  const learningWritesThisSession = useRef(0);
  const identityUpdatedThisSession = useRef(false);
  const [contextDocs, setContextDocs] = useState({
    profile: '', season: '', system: '', spiritual: '', coaching: '',
  });
  const [savingContext, setSavingContext] = useState(false);
  const [contextSaved, setContextSaved] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const conversationSaved = useRef(false);

  const SESSION_KEY = `advisor_session_${userId}`;

  // ── Restore session from localStorage on mount ─────────────────────────────

  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (!saved) return;
    try {
      const { messages: m, deepMode: d, isOpen: o, timestamp: t } = JSON.parse(saved);
      if ((Date.now() - t) < 86400000 && m && m.length > 1) {
        setMessages(m);
        setDeepMode(d || false);
        if (o) setIsOpen(true);
      }
    } catch (e) { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist session to localStorage on every change ────────────────────────

  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ messages, deepMode, isOpen, timestamp: Date.now() }));
    }
  }, [messages, deepMode, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load on open ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen || contextLoaded) return;

    const load = async () => {
      try {
        const [docs, recentMetrics, recentConvos, axesGoals, period, sprints, projects, identity, learnings, weeklyGoals, physicalMetrics] = await Promise.all([
          advisorService.getContextDocs(),
          advisorService.getRecentDailyMetrics(7),
          advisorService.getRecentConversations(3),
          advisorService.getAxesAndGoals(),
          advisorService.getPeriodContext(userId),
          advisorService.getSprintContext(),
          advisorService.getActiveProjectsContext(),
          advisorService.getAdvisorIdentity(),
          advisorService.getLearnings(15),
          advisorService.getWeeklyGoals(),
          advisorService.getRecentPhysicalMetrics(14),
        ]);

        setContextDocs({
          profile: docs.profile || '',
          season: docs.season || '',
          system: docs.system || '',
          spiritual: docs.spiritual || '',
          coaching: docs.coaching || '',
        });

        setSystemPrompt(buildSystemPrompt({ contextDocs: docs, page, recentMetrics, recentConvos, axesGoals, period, sprints, projects, deepData: null, identity, learnings, weeklyGoals, physicalMetrics }));
        setContextLoaded(true);

        setMessages((prev) =>
          prev.length === 0
            ? [{ role: 'assistant', content: `${pageName} page. What's alive right now?`, id: Date.now() }]
            : prev
        );
      } catch (err) {
        console.error('Advisor load error:', err);
        setContextLoaded(true);
      }
    };

    load();
  }, [isOpen, contextLoaded, page, pageName, userId]);

  // ── Scroll ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
  }, [input]);

  // ── Save on close ──────────────────────────────────────────────────────────

  const handleClose = useCallback(async () => {
    setIsOpen(false);
    localStorage.removeItem(SESSION_KEY);
    if (messages.length > 1 && !conversationSaved.current) {
      conversationSaved.current = true;
      try { await advisorService.saveConversation(messages, pageName); } catch (e) { /* ignore */ }
    }
  }, [messages, pageName, SESSION_KEY]);

  // ── End conversation + reset for next ──────────────────────────────────────

  const clearConversation = useCallback(async () => {
    if (messages.length > 1 && !conversationSaved.current) {
      conversationSaved.current = true;
      try { await advisorService.saveConversation(messages, pageName); } catch (e) { /* ignore */ }
    }
    localStorage.removeItem(SESSION_KEY);
    setMessages([{ role: 'assistant', content: `${pageName} page. What's alive right now?`, id: Date.now() }]);
    setDeepMode(false);
    setPendingSave(null);
    setPendingCorpusLog(null);
    setPendingLearning(null);
    setSaveStatus('');
    setCorpusLogStatus('');
    setLearningStatus('');
    conversationSaved.current = false;
    learningWritesThisSession.current = 0;
    identityUpdatedThisSession.current = false;
  }, [messages, pageName, SESSION_KEY]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const parseSaveMarker = (text) => {
    const jsonMatch = text.match(/ADVISOR_SAVE:(\{[^}]+\})/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[1]); } catch (e) { /* ignore */ }
    }
    const blockMatch = text.match(/ADVISOR_SAVE_BLOCK:(\w+)\n([\s\S]*?)\nADVISOR_SAVE_END/);
    if (blockMatch) return { type: blockMatch[1], content: blockMatch[2].trim() };
    return null;
  };

  const stripSaveMarkers = (text) =>
    text
      .replace(/ADVISOR_SAVE:\{[^}]+\}/g, '')
      .replace(/ADVISOR_SAVE_BLOCK:\w+\n[\s\S]*?\nADVISOR_SAVE_END/g, '')
      .replace(/CORPUS_LOG_START\n[\s\S]*?\nCORPUS_LOG_END/g, '')
      .replace(/CORPUS_QUERY_START\n[\s\S]*?\nCORPUS_QUERY_END/g, '')
      .replace(/LEARNING_PROPOSE:\{[\s\S]*?\}/g, '')
      .replace(/IDENTITY_UPDATE:\{[\s\S]*?\}/g, '')
      .trim();

  const parseLearning = (text) => {
    const match = text.match(/LEARNING_PROPOSE:(\{[\s\S]*?\})/);
    if (!match) return null;
    try { return JSON.parse(match[1]); } catch (e) { return null; }
  };

  const parseIdentityUpdate = (text) => {
    const match = text.match(/IDENTITY_UPDATE:(\{[\s\S]*?\})/);
    if (!match) return null;
    try { return JSON.parse(match[1]); } catch (e) { return null; }
  };

  const parseCorpusLog = (text) => {
    const match = text.match(/CORPUS_LOG_START\n([\s\S]*?)\nCORPUS_LOG_END/);
    if (!match) return null;
    try { return JSON.parse(match[1].trim()); } catch (e) { return null; }
  };

  const parseCorpusQuery = (text) => {
    const match = text.match(/CORPUS_QUERY_START\n([\s\S]*?)\nCORPUS_QUERY_END/);
    if (!match) return null;
    try { return JSON.parse(match[1].trim()); } catch (e) { return null; }
  };

  const formatCorpusResults = (entries) => {
    if (!entries.length) return 'No matching corpus entries found.';
    return entries.map((e, i) => {
      const rawPreview = (e.raw || '').slice(0, 400);
      const truncated = (e.raw || '').length > 400 ? '…' : '';
      return `[${i + 1}] ${e.date} | ${e.type} | axes: ${(e.axes || []).join(', ')} | themes: ${(e.themes || []).join(', ')} | sig: ${e.significance}/5 | state: ${e.state}
Summary: ${e.summary}
Raw: ${rawPreview}${truncated}`;
    }).join('\n\n---\n\n');
  };

  // ── Stream ─────────────────────────────────────────────────────────────────

  const streamResponse = async (msgHistory, promptOverride, allowCorpusQuery = true) => {
    const assistantId = Date.now() + 1;
    setMessages((prev) => [...prev, { role: 'assistant', content: '', id: assistantId }]);
    setIsStreaming(true);

    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey || apiKey === 'your_anthropic_api_key_here') throw new Error('Add VITE_ANTHROPIC_API_KEY to .env');

      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
      const apiMessages = msgHistory.map((m) => ({ role: m.role, content: m.content }));
      let fullResponse = '';

      const stream = client.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        system: promptOverride || systemPrompt,
        messages: apiMessages,
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          fullResponse += chunk.delta.text;
          setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: fullResponse } : m));
        }
      }

      // ── Corpus query (one level deep only) ──────────────────────────────────
      const corpusQueryParams = allowCorpusQuery ? parseCorpusQuery(fullResponse) : null;
      if (corpusQueryParams) {
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: '🔍 Searching corpus…' } : m));
        const results = await advisorService.queryCorpus(userId, corpusQueryParams);
        const formatted = formatCorpusResults(results);
        const injectedId = Date.now();
        const injectedMsg = { role: 'user', content: `CORPUS_RESULTS:\n${formatted}`, id: injectedId, hidden: true };
        setMessages((prev) => [...prev, injectedMsg]);
        const newHistory = [
          ...msgHistory,
          { role: 'assistant', content: '🔍 Searching corpus…' },
          { role: 'user', content: `CORPUS_RESULTS:\n${formatted}` },
        ];
        await streamResponse(newHistory, promptOverride, false);
        return;
      }

      // ── Save / corpus log / learning / identity markers ──────────────────────
      const saveData = parseSaveMarker(fullResponse);
      const corpusData = parseCorpusLog(fullResponse);
      const learningData = parseLearning(fullResponse);
      const identityData = parseIdentityUpdate(fullResponse);

      if (saveData || corpusData || learningData || identityData) {
        const cleaned = stripSaveMarkers(fullResponse);
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: cleaned } : m));
        if (saveData) setPendingSave(saveData);
        if (corpusData) setPendingCorpusLog(corpusData);
        if (learningData && learningWritesThisSession.current < 3) {
          setPendingLearning(learningData);
        }
        if (identityData && !identityUpdatedThisSession.current) {
          identityUpdatedThisSession.current = true;
          advisorService.updateAdvisorIdentity(identityData).catch(() => {});
        }
      }
    } catch (err) {
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: `[Error: ${err.message}]` } : m));
    } finally {
      setIsStreaming(false);
    }
  };

  // ── Send ───────────────────────────────────────────────────────────────────

  const sendMessage = async () => {
    if (!input.trim() || isStreaming || !contextLoaded) return;
    const userMsg = { role: 'user', content: input.trim(), id: Date.now() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput('');
    await streamResponse(newMsgs);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // ── Deep Dive ──────────────────────────────────────────────────────────────

  const activateDeepDive = async () => {
    if (deepLoading) return;
    setDeepLoading(true);
    try {
      const [docs, recentMetrics, recentConvos, axesGoals, period, sprints, projects, routine, journal, identity, learnings, weeklyGoals, physicalMetrics] = await Promise.all([
        advisorService.getContextDocs(),
        advisorService.getRecentDailyMetrics(30),
        advisorService.getRecentConversations(5),
        advisorService.getAxesAndGoals(),
        advisorService.getPeriodContext(userId),
        advisorService.getSprintContext(),
        advisorService.getActiveProjectsContext(),
        advisorService.getRoutineAdherence(14),
        advisorService.getRecentJournalEntries(5),
        advisorService.getAdvisorIdentity(),
        advisorService.getLearnings(15),
        advisorService.getWeeklyGoals(),
        advisorService.getRecentPhysicalMetrics(30),
      ]);

      const deepData = { routine, journal };
      const prompt = buildSystemPrompt({ contextDocs: docs, page, recentMetrics, recentConvos, axesGoals, period, sprints, projects, deepData, identity, learnings, weeklyGoals, physicalMetrics });
      setSystemPrompt(prompt);
      setDeepMode(true);

      const diveMsg = `Deep Dive activated — you now have 30 days of data, routine adherence, and recent journal. Look at all of it and tell me what you actually see. Trajectory across the axes, where the system is holding, where it's breaking down. One beat ahead. Don't perform thoroughness.`;
      const userMsg = { role: 'user', content: diveMsg, id: Date.now() };
      const newMsgs = [...messages, userMsg];
      setMessages(newMsgs);
      setInput('');
      await streamResponse(newMsgs, prompt);
    } catch (err) {
      console.error('Deep dive error:', err);
    } finally {
      setDeepLoading(false);
    }
  };

  // ── Confirm save ───────────────────────────────────────────────────────────

  const confirmSave = async () => {
    if (!pendingSave) return;
    setSaveStatus('saving');
    const today = new Date().toISOString().split('T')[0];
    try {
      if (pendingSave.type === 'epiphany') await advisorService.writeEpiphany(pendingSave.content, today);
      else if (pendingSave.type === 'despair') await advisorService.writeDespair(pendingSave.content, today);
      else if (pendingSave.type === 'season') {
        await advisorService.updateSeasonContext(pendingSave.content);
        setContextDocs((prev) => ({ ...prev, season: pendingSave.content }));
      } else await advisorService.writeAdvisorNote(pendingSave.content, today);

      setSaveStatus('done');
      setTimeout(() => { setPendingSave(null); setSaveStatus(''); }, 1800);
    } catch (e) {
      setSaveStatus('');
      alert('Save failed: ' + e.message);
    }
  };

  // ── Corpus log ────────────────────────────────────────────────────────────

  const logConversation = async () => {
    const logMsg = { role: 'user', content: 'Log this conversation.', id: Date.now() };
    const newMsgs = [...messages, logMsg];
    setMessages(newMsgs);
    await streamResponse(newMsgs);
  };

  const confirmCorpusLog = async (isPrivate = false) => {
    if (!pendingCorpusLog) return;
    setCorpusLogStatus('saving');
    const raw = messages
      .filter((m) => m.content)
      .map((m) => `${m.role === 'user' ? 'Abi' : 'Advisor'}: ${m.content}`)
      .join('\n\n---\n\n');
    try {
      await advisorService.saveCorpusEntry(userId, { ...pendingCorpusLog, raw, private: isPrivate });
      if (!conversationSaved.current) {
        conversationSaved.current = true;
        await advisorService.saveConversation(messages, pageName);
      }
      setCorpusLogStatus('done');
      setTimeout(() => { setPendingCorpusLog(null); setCorpusLogStatus(''); }, 1800);
    } catch (e) {
      setCorpusLogStatus('');
      alert('Corpus save failed: ' + e.message);
    }
  };

  // ── Confirm learning ──────────────────────────────────────────────────────

  const confirmLearning = async () => {
    if (!pendingLearning || learningWritesThisSession.current >= 3) return;
    setLearningStatus('saving');
    try {
      await advisorService.saveLearning(pendingLearning);
      learningWritesThisSession.current += 1;
      setLearningStatus('done');
      setTimeout(() => { setPendingLearning(null); setLearningStatus(''); }, 1800);
    } catch (e) {
      setLearningStatus('');
      alert('Learning save failed: ' + e.message);
    }
  };

  // ── Context editor save ────────────────────────────────────────────────────

  const saveContext = async () => {
    setSavingContext(true);
    try {
      await advisorService.updateSeasonContext(contextDocs.season);
      setContextSaved(true);
      setContextLoaded(false); // force system prompt rebuild on next open
      setTimeout(() => setContextSaved(false), 2000);
    } catch (e) {
      alert('Failed to save: ' + e.message);
    } finally {
      setSavingContext(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {!isOpen && (
        <button
          className={styles.toggleBtn}
          onClick={() => { setIsOpen(true); if (messages.length === 0) conversationSaved.current = false; }}
          title="Open Advisor"
        >
          <span className={styles.toggleIcon}>◈</span>
          {deepMode && <span className={styles.deepBadge} />}
        </button>
      )}

      {isOpen && (
        <div className={`${styles.panel} ${isMinimized ? styles.panelMinimized : ''} ${isExpanded ? styles.panelExpanded : ''}`}>
          <div
            className={styles.header}
            onClick={isMinimized ? () => setIsMinimized(false) : undefined}
            style={isMinimized ? { cursor: 'pointer' } : undefined}
            title={isMinimized ? 'Restore advisor' : undefined}
          >
            <div className={styles.headerLeft}>
              <span className={styles.headerIcon}>◈</span>
              <span className={styles.headerTitle}>The Advisor</span>
              <span className={styles.pageChip}>{pageName}</span>
              {deepMode && !isMinimized && <span className={styles.deepChip}>Deep Dive</span>}
              {isMinimized && messages.length > 1 && <span className={styles.minimizedBadge}>{messages.filter(m => !m.hidden).length}</span>}
            </div>
            <div className={styles.headerRight}>
              {!isMinimized && (
                <>
                  <button className={`${styles.tabBtn} ${activeTab === 'chat' ? styles.tabActive : ''}`} onClick={() => setActiveTab('chat')}>Chat</button>
                  <button className={`${styles.tabBtn} ${activeTab === 'context' ? styles.tabActive : ''}`} onClick={() => setActiveTab('context')}>Context</button>
                </>
              )}
              <button
                className={styles.sizeBtn}
                onClick={(e) => { e.stopPropagation(); if (isMinimized) { setIsMinimized(false); } else { setIsExpanded(v => !v); } }}
                title={isMinimized ? 'Restore' : isExpanded ? 'Normal size' : 'Expand'}
              >
                {isMinimized ? '▢' : isExpanded ? '⊟' : '⊞'}
              </button>
              <button
                className={styles.minimizeBtn}
                onClick={(e) => { e.stopPropagation(); setIsMinimized(v => !v); if (!isMinimized) setIsExpanded(false); }}
                title={isMinimized ? 'Restore' : 'Minimize'}
              >
                {isMinimized ? '▲' : '▼'}
              </button>
              <button className={styles.closeBtn} onClick={(e) => { e.stopPropagation(); handleClose(); }}>✕</button>
            </div>
          </div>

          {!isMinimized && activeTab === 'chat' && (
            <>
              <div className={styles.messages}>
                {!contextLoaded && <div className={styles.loading}>Loading context…</div>}

                {messages.filter((msg) => !msg.hidden).map((msg) => (
                  <div key={msg.id} className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.advisorMessage}`}>
                    <div className={styles.messageContent}>{msg.content}</div>
                  </div>
                ))}

                {isStreaming && messages[messages.length - 1]?.content === '' && (
                  <div className={styles.thinking}>…</div>
                )}

                {pendingSave && (
                  <div className={styles.saveCard}>
                    <div className={styles.saveCardHeader}>
                      {WRITE_TYPES[pendingSave.type]?.emoji} Save as {WRITE_TYPES[pendingSave.type]?.label}?
                    </div>
                    <div className={styles.saveCardContent}>
                      {pendingSave.content.length > 300 ? pendingSave.content.slice(0, 300) + '…' : pendingSave.content}
                    </div>
                    <div className={styles.saveCardActions}>
                      {saveStatus === 'done' ? (
                        <span className={styles.savedConfirm}>Saved ✓</span>
                      ) : (
                        <>
                          <button className={styles.saveConfirmBtn} onClick={confirmSave} disabled={saveStatus === 'saving'}>
                            {saveStatus === 'saving' ? 'Saving…' : 'Confirm'}
                          </button>
                          <button className={styles.saveDismissBtn} onClick={() => setPendingSave(null)}>Dismiss</button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {pendingCorpusLog && (
                  <div className={styles.corpusLogCard}>
                    <div className={styles.corpusLogHeader}>◎ Log to corpus?</div>
                    <div className={styles.corpusLogFields}>
                      <div className={styles.corpusLogRow}>
                        <span className={styles.corpusLogLabel}>axis</span>
                        <span className={styles.corpusTags}>{pendingCorpusLog.axis?.join(', ')}</span>
                      </div>
                      <div className={styles.corpusLogRow}>
                        <span className={styles.corpusLogLabel}>themes</span>
                        <span className={styles.corpusTags}>{pendingCorpusLog.themes?.join(', ')}</span>
                      </div>
                      {pendingCorpusLog.voice_markers?.length > 0 && (
                        <div className={styles.corpusLogRow}>
                          <span className={styles.corpusLogLabel}>markers</span>
                          <span className={styles.corpusTags}>{pendingCorpusLog.voice_markers.join(', ')}</span>
                        </div>
                      )}
                      <div className={styles.corpusLogRow}>
                        <span className={styles.corpusLogLabel}>state · sig</span>
                        <span className={styles.corpusTags}>{pendingCorpusLog.state} · {pendingCorpusLog.significance}/5</span>
                      </div>
                    </div>
                    <div className={styles.corpusLogSummary}>{pendingCorpusLog.summary}</div>
                    <div className={styles.saveCardActions}>
                      {corpusLogStatus === 'done' ? (
                        <span className={styles.savedConfirm}>Logged ✓</span>
                      ) : (
                        <>
                          <button className={styles.saveConfirmBtn} onClick={() => confirmCorpusLog(false)} disabled={corpusLogStatus === 'saving'}>
                            {corpusLogStatus === 'saving' ? 'Saving…' : 'Confirm'}
                          </button>
                          <button className={styles.saveConfirmBtn} onClick={() => confirmCorpusLog(true)} disabled={corpusLogStatus === 'saving'} style={{ opacity: 0.7 }}>
                            Private
                          </button>
                          <button className={styles.saveDismissBtn} onClick={() => setPendingCorpusLog(null)}>Dismiss</button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {pendingLearning && (
                  <div className={styles.learningCard}>
                    <div className={styles.learningCardHeader}>◈ Log learning?</div>
                    <div className={styles.learningCardFields}>
                      <div className={styles.learningCardRow}>
                        <span className={styles.learningCardLabel}>type</span>
                        <span className={styles.learningTags}>{pendingLearning.type} · {pendingLearning.confidence}</span>
                      </div>
                      {pendingLearning.axis?.length > 0 && (
                        <div className={styles.learningCardRow}>
                          <span className={styles.learningCardLabel}>axis</span>
                          <span className={styles.learningTags}>{pendingLearning.axis.join(', ')}</span>
                        </div>
                      )}
                    </div>
                    <div className={styles.learningCardObservation}>
                      {(pendingLearning.observation || '').length > 200
                        ? pendingLearning.observation.slice(0, 200) + '…'
                        : pendingLearning.observation}
                    </div>
                    {pendingLearning.implication && (
                      <div className={styles.learningCardImplication}>→ {pendingLearning.implication}</div>
                    )}
                    <div className={styles.saveCardActions}>
                      {learningStatus === 'done' ? (
                        <span className={styles.savedConfirm}>Saved ✓</span>
                      ) : (
                        <>
                          <button
                            className={styles.saveConfirmBtn}
                            onClick={confirmLearning}
                            disabled={learningStatus === 'saving' || learningWritesThisSession.current >= 3}
                          >
                            {learningStatus === 'saving' ? 'Saving…' : 'Confirm'}
                          </button>
                          <button className={styles.saveDismissBtn} onClick={() => setPendingLearning(null)}>Dismiss</button>
                          <span className={styles.learningQuota}>({3 - learningWritesThisSession.current} left this session)</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <div className={styles.toolbar}>
                {!deepMode ? (
                  <button className={styles.deepBtn} onClick={activateDeepDive} disabled={deepLoading || !contextLoaded || isStreaming} title="Load 30 days of data + routine + journal, then analyze">
                    {deepLoading ? 'Loading…' : '◉ Deep Dive'}
                  </button>
                ) : (
                  <span className={styles.deepActive}>◉ Deep Dive active</span>
                )}
                <button
                  className={styles.logBtn}
                  onClick={logConversation}
                  disabled={messages.length <= 1 || isStreaming || !contextLoaded}
                  title="Log this conversation to the corpus"
                >
                  ◎ Log
                </button>
                <button
                  className={styles.logBtn}
                  onClick={clearConversation}
                  disabled={isStreaming || messages.length <= 1}
                  title="Save this conversation and start a new one"
                  style={{ marginLeft: 'auto' }}
                >
                  ↺ New
                </button>
              </div>

              <div className={styles.inputRow}>
                <textarea
                  ref={textareaRef}
                  className={styles.input}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="What's alive right now?"
                  rows={1}
                  disabled={isStreaming || !contextLoaded}
                />
                <button className={styles.sendBtn} onClick={sendMessage} disabled={isStreaming || !input.trim() || !contextLoaded}>↑</button>
              </div>
            </>
          )}

          {!isMinimized && activeTab === 'context' && (
            <div className={styles.contextEditor}>
              <p className={styles.contextNote}>
                <strong>profile, system, spiritual, coaching</strong> — live in{' '}
                <code>advisor/context/</code> in the repo. Edit the files directly; they're imported at build time.
              </p>
              <p className={styles.contextNote} style={{ marginTop: '0.5rem' }}>
                <em>season</em> is the one that changes monthly. Update it here or ask the Advisor to draft a new one.
              </p>
              <div className={styles.contextField}>
                <label className={styles.contextLabel}>season.md</label>
                <textarea
                  className={styles.contextTextarea}
                  value={contextDocs.season}
                  onChange={(e) => setContextDocs((prev) => ({ ...prev, season: e.target.value }))}
                  rows={10}
                  placeholder="Paste your current season.md content here…"
                />
              </div>
              <button className={styles.saveContextBtn} onClick={saveContext} disabled={savingContext}>
                {contextSaved ? 'Saved ✓' : savingContext ? 'Saving…' : 'Save Season'}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Public export: guards before rendering the panel ─────────────────────────

export default function AIAdvisor() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const page = location.pathname;

  if (!currentUser || !PAGE_LABELS[page]) return null;
  return <AdvisorPanel page={page} pageName={PAGE_LABELS[page]} userId={currentUser.uid} />;
}
