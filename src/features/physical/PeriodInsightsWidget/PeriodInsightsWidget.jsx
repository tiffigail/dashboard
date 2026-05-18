import React, { useState, useEffect, useCallback } from 'react';
import styles from '@/features/physical/PeriodInsightsWidget/PeriodInsightsWidget.module.css';
import * as physicalGoalsService from '@/services/physicalGoalsService';

const FLOW_LEVELS = ['none', 'spotting', 'light', 'medium', 'heavy'];
const FLOW_LABELS = { none: 'None', spotting: 'Spotting', light: 'Light', medium: 'Medium', heavy: 'Heavy' };
const FLOW_COLORS = { none: '#f5f5f5', spotting: '#fce4ec', light: '#f8bbd0', medium: '#f48fb1', heavy: '#e91e63' };

const PHASE_COLORS = {
  menstrual:  '#f48fb1',
  follicular: '#c8e6c9',
  ovulation:  '#fff9c4',
  luteal:     '#ffe0b2',
};
const PHASE_LABELS = { menstrual: 'Menstrual', follicular: 'Follicular', ovulation: 'Ovulation', luteal: 'Luteal' };

const SYMPTOMS = ['Cramps', 'Bloating', 'Headache', 'Mood Swings', 'Fatigue', 'Back Pain', 'Breast Tenderness', 'Acne'];

function PeriodInsightsWidget({ userId }) {
  const [currentCycle, setCurrentCycle] = useState(null);
  const [cycleHistory, setCycleHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const today = new Date().toISOString().split('T')[0];
  const [logDate, setLogDate] = useState(today);
  const [flow, setFlow] = useState('none');
  const [symptoms, setSymptoms] = useState([]);
  const [energy, setEnergy] = useState(3);
  const [notes, setNotes] = useState('');

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const [cycle, history] = await Promise.all([
        physicalGoalsService.getCurrentPeriodCycle(userId),
        physicalGoalsService.getPeriodHistory(userId, 12)
      ]);
      setCurrentCycle(cycle);
      setCycleHistory(history);
    } catch (error) {
      console.error("Error fetching period data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setFlow('none');
    setSymptoms([]);
    setEnergy(3);
    setNotes('');
    setLogDate(today);
  };

  const toggleSymptom = (s) => {
    setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleSaveLog = async () => {
    if (!currentCycle) return;
    setIsSaving(true);
    try {
      await physicalGoalsService.logDailyPeriodData(userId, logDate, {
        flow,
        symptoms,
        energy,
        notes,
        loggedAt: new Date().toISOString()
      });
      await physicalGoalsService.updateDailyMetricsWithPeriodData(logDate, {
        periodFlow: flow,
        periodSymptoms: symptoms,
        irritabilityLevel: symptoms.includes('Mood Swings') ? energy <= 2 ? 3 : 2 : 1,
      });
      resetForm();
      setShowForm(false);
      fetchData();
    } catch (error) {
      console.error("Error saving period log:", error);
      alert("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartNewCycle = async () => {
    setIsSaving(true);
    try {
      await physicalGoalsService.startNewCycle(userId, logDate);
      resetForm();
      setShowForm(false);
      fetchData();
    } catch (error) {
      console.error("Error starting new cycle:", error);
      alert("Failed to start new cycle.");
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate current day of cycle
  const getCycleDay = () => {
    if (!currentCycle?.cycleStart) return null;
    const start = new Date(currentCycle.cycleStart);
    const now = new Date();
    return Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
  };

  const getPhase = (day) => {
    if (!day) return 'unknown';
    if (day <= 5) return 'menstrual';
    if (day <= 13) return 'follicular';
    if (day <= 16) return 'ovulation';
    return 'luteal';
  };

  const cycleDay = getCycleDay();
  const phase = getPhase(cycleDay);

  // Predict next period start from current cycle
  const getNextPeriodDate = () => {
    if (!currentCycle?.cycleStart) return null;
    const start = new Date(currentCycle.cycleStart + 'T12:00:00');
    const next = new Date(start);
    next.setDate(start.getDate() + avgCycleLength);
    return next;
  };

  // Build calendar data with estimated phase bands + logged days overlaid
  const buildCalendarData = () => {
    const dateMap = {};
    const sortedCycles = [...cycleHistory].sort((a, b) =>
      (a.cycleStart || '').localeCompare(b.cycleStart || ''));

    for (let ci = 0; ci < sortedCycles.length; ci++) {
      const cycle = sortedCycles[ci];
      if (!cycle.cycleStart) continue;
      const startDate = new Date(cycle.cycleStart + 'T12:00:00');
      const endStr = cycle.cycleEnd ||
        sortedCycles[ci + 1]?.cycleStart ||
        new Date().toISOString().split('T')[0];
      const endDate = new Date(endStr + 'T12:00:00');
      const cur = new Date(startDate);
      let dayNum = 1;
      while (cur <= endDate) {
        const dateStr = cur.toISOString().split('T')[0];
        let phase;
        if (dayNum <= 5) phase = 'menstrual';
        else if (dayNum <= 13) phase = 'follicular';
        else if (dayNum <= 16) phase = 'ovulation';
        else phase = 'luteal';
        dateMap[dateStr] = { phase, flow: null };
        cur.setDate(cur.getDate() + 1);
        dayNum++;
      }
      if (cycle.dailyLogs) {
        for (const [date, data] of Object.entries(cycle.dailyLogs)) {
          dateMap[date] = { ...(dateMap[date] || {}), flow: data.flow || null };
        }
      }
    }

    const months = [];
    const now = new Date();
    for (let m = 2; m >= 0; m--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDayOfWeek = monthDate.getDay();
      const monthName = monthDate.toLocaleString('default', { month: 'short', year: 'numeric' });
      const days = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const entry = dateMap[dateStr] || {};
        days.push({ day: d, date: dateStr, flow: entry.flow || null, phase: entry.phase || null });
      }
      months.push({ monthName, firstDayOfWeek, days });
    }
    return months;
  };

  // Cycle length chart data
  const completedCycles = cycleHistory.filter(c => c.cycleLengthDays && c.cycleLengthDays > 0).reverse();
  const avgCycleLength = completedCycles.length > 0
    ? Math.round(completedCycles.reduce((s, c) => s + c.cycleLengthDays, 0) / completedCycles.length)
    : 28;
  const maxCycleLen = completedCycles.length > 0 ? Math.max(...completedCycles.map(c => c.cycleLengthDays)) : 35;

  if (isLoading) {
    return <div className={styles.loading}>Loading period data...</div>;
  }

  return (
    <section className={styles.section}>
      <div className={styles.headerRow}>
        <h2 className={styles.sectionTitle}>Period Insights</h2>
        <button onClick={() => setShowForm(!showForm)} className={styles.logToggleButton}>
          {showForm ? 'Close' : 'Log Today'}
        </button>
      </div>

      {/* Current Cycle Status */}
      {currentCycle && cycleDay && (
        <div className={styles.cycleInfo}>
          <div className={styles.currentStatus}>
            <div className={styles.phaseChip} style={{ background: PHASE_COLORS[phase] }}>
              Day {cycleDay} — {PHASE_LABELS[phase]}
            </div>
          </div>
          <div className={styles.phaseBar}>
            {[
              { key: 'menstrual', label: 'M', days: 5 },
              { key: 'follicular', label: 'F', days: 8 },
              { key: 'ovulation', label: 'O', days: 3 },
              { key: 'luteal', label: 'L', days: avgCycleLength - 16 },
            ].map(seg => (
              <div
                key={seg.key}
                className={`${styles.phaseSegment} ${phase === seg.key ? styles.phaseSegmentActive : ''}`}
                style={{ flex: seg.days, background: PHASE_COLORS[seg.key] }}
                title={PHASE_LABELS[seg.key]}
              >
                {seg.label}
              </div>
            ))}
          </div>
          <div className={styles.predictions}>
            <div className={styles.prediction}>
              <span className={styles.predictionLabel}>Avg cycle:</span>
              <span className={styles.predictionValue}>{avgCycleLength} days</span>
            </div>
            {getNextPeriodDate() && (
              <div className={styles.prediction}>
                <span className={styles.predictionLabel}>Next period ~</span>
                <span className={styles.predictionValue}>
                  {getNextPeriodDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {!currentCycle && !showForm && (
        <p className={styles.emptyState}>
          No cycle data yet. Tap "Log Today" and start a new cycle to begin tracking.
        </p>
      )}

      {/* Logging Form */}
      {showForm && (
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label>Date</label>
            <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} className={styles.dateInput} />
          </div>

          <div className={styles.formGroup}>
            <label>Flow</label>
            <div className={styles.flowSelector}>
              {FLOW_LEVELS.map(f => (
                <button
                  key={f}
                  className={`${styles.flowChip} ${flow === f ? styles.flowChipActive : ''}`}
                  style={flow === f ? { background: FLOW_COLORS[f], borderColor: FLOW_COLORS[f] === '#f5f5f5' ? '#ccc' : FLOW_COLORS[f] } : {}}
                  onClick={() => setFlow(f)}
                >
                  {FLOW_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Symptoms</label>
            <div className={styles.symptomChips}>
              {SYMPTOMS.map(s => (
                <button
                  key={s}
                  className={`${styles.symptomChip} ${symptoms.includes(s) ? styles.symptomChipActive : ''}`}
                  onClick={() => toggleSymptom(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Energy Level</label>
            <div className={styles.energySelector}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  className={`${styles.energyBtn} ${energy === n ? styles.energyBtnActive : ''}`}
                  onClick={() => setEnergy(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <span className={styles.energyLabels}>
              <span>Low</span><span>High</span>
            </span>
          </div>

          <div className={styles.formGroup}>
            <label>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="How are you feeling?"
              className={styles.notesInput}
              rows="2"
            />
          </div>

          <div className={styles.formActions}>
            <button onClick={handleStartNewCycle} className={styles.newCycleButton} disabled={isSaving}>
              Start New Cycle
            </button>
            <button onClick={handleSaveLog} className={styles.saveButton} disabled={isSaving || !currentCycle}>
              {isSaving ? 'Saving...' : 'Save Log'}
            </button>
          </div>
          {!currentCycle && (
            <p className={styles.formHint}>Start a new cycle first to begin logging daily data.</p>
          )}
        </div>
      )}

      {/* Cycle Length History Chart */}
      {completedCycles.length > 1 && (
        <div className={styles.chartSection}>
          <h4 className={styles.chartTitle}>Cycle Length History</h4>
          <div className={styles.barChart}>
            {completedCycles.map((c, i) => {
              const height = maxCycleLen > 0 ? (c.cycleLengthDays / (maxCycleLen + 5)) * 100 : 0;
              return (
                <div key={i} className={styles.barCol}>
                  <span className={styles.barLabel}>{c.cycleLengthDays}d</span>
                  <div className={styles.bar} style={{ height: `${height}%` }} />
                  <span className={styles.barDate}>
                    {c.cycleStart ? new Date(c.cycleStart).toLocaleDateString('en-US', { month: 'short' }) : ''}
                  </span>
                </div>
              );
            })}
            {/* Average line */}
            <div
              className={styles.avgLine}
              style={{ bottom: `${(avgCycleLength / (maxCycleLen + 5)) * 100}%` }}
            >
              <span className={styles.avgLabel}>avg {avgCycleLength}d</span>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Heatmap */}
      {cycleHistory.length > 0 && (
        <div className={styles.chartSection}>
          <h4 className={styles.chartTitle}>Flow Calendar</h4>
          <div className={styles.calendarGrid}>
            {buildCalendarData().map((month, mi) => (
              <div key={mi} className={styles.calMonth}>
                <div className={styles.calMonthLabel}>{month.monthName}</div>
                <div className={styles.calDayHeaders}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <span key={i} className={styles.calDayHeader}>{d}</span>
                  ))}
                </div>
                <div className={styles.calDays}>
                  {Array.from({ length: month.firstDayOfWeek }).map((_, i) => (
                    <span key={`e-${i}`} className={styles.calDayEmpty} />
                  ))}
                  {month.days.map(d => {
                    const bg = d.flow && d.flow !== 'none'
                      ? FLOW_COLORS[d.flow]
                      : d.phase
                        ? PHASE_COLORS[d.phase]
                        : '#f9f9f9';
                    const opacity = !d.flow && d.phase ? 0.55 : 1;
                    const label = d.flow
                      ? `${d.date} — ${FLOW_LABELS[d.flow]}`
                      : d.phase
                        ? `${d.date} — est. ${PHASE_LABELS[d.phase]}`
                        : d.date;
                    return (
                      <span
                        key={d.day}
                        className={styles.calDay}
                        style={{ background: bg, opacity }}
                        title={label}
                      >
                        {d.day}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className={styles.calLegend}>
            <span className={styles.legendGroup}>Flow:</span>
            {['spotting','light','medium','heavy'].map(f => (
              <span key={f} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: FLOW_COLORS[f] }} />
                {FLOW_LABELS[f]}
              </span>
            ))}
            <span className={styles.legendGroup}>Phase (est):</span>
            {Object.keys(PHASE_LABELS).map(p => (
              <span key={p} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: PHASE_COLORS[p], opacity: 0.55 }} />
                {PHASE_LABELS[p]}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default PeriodInsightsWidget;
