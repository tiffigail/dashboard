import React, { useState, useEffect, useCallback } from 'react';
import styles from './PeriodQuickLog.module.css';
import { useAuth } from '../../context/AuthContext';
import * as physicalGoalsService from '../../services/physicalGoalsService';

const FLOW_LEVELS = ['none', 'spotting', 'light', 'medium', 'heavy'];
const FLOW_LABELS = { none: 'None', spotting: 'S', light: 'L', medium: 'M', heavy: 'H' };
const FLOW_COLORS = { none: '#BCDDDC', spotting: '#fce4ec', light: '#f8bbd0', medium: '#f48fb1', heavy: '#e91e63' };

const PHASE_COLORS = {
  menstrual: '#e91e63', follicular: '#72B0AB', ovulation: '#355E58', luteal: '#72B0AB',
};
const PHASE_LABELS = { menstrual: 'Menstrual', follicular: 'Follicular', ovulation: 'Ovulation', luteal: 'Luteal' };

// agg: 'peak' uses max value of the day; 'avg' averages all readings
const DIALS = [
  { key: 'irritability',    label: 'Irritability', low: 'Calm',   high: 'Rage',     agg: 'peak' },
  { key: 'energyLevel',     label: 'Energy',       low: 'Low',    high: 'High',     agg: 'avg'  },
  { key: 'moodFluctuation', label: 'Mood Swings',  low: 'Stable', high: 'Variable', agg: 'avg'  },
];

function metricVals(readings, key) {
  return readings.map(r => r[key]).filter(v => v != null);
}
function metricAvg(readings, key) {
  const vals = metricVals(readings, key);
  if (!vals.length) return null;
  return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10;
}
function metricPeak(readings, key) {
  const vals = metricVals(readings, key);
  return vals.length ? Math.max(...vals) : null;
}
function computeDisplay(readings, key, agg) {
  return agg === 'peak' ? metricPeak(readings, key) : metricAvg(readings, key);
}
function countReadings(readings, key) {
  return metricVals(readings, key).length;
}

function getPhase(day) {
  if (!day) return null;
  if (day <= 5) return 'menstrual';
  if (day <= 13) return 'follicular';
  if (day <= 16) return 'ovulation';
  return 'luteal';
}

function PeriodQuickLog() {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;

  const [cycle, setCycle]     = useState(null);
  const [history, setHistory] = useState([]);
  const [loaded, setLoaded]   = useState(false);
  const [todayFlow, setTodayFlow] = useState('none');
  const [readings, setReadings]   = useState([]);
  const [lastTapped, setLastTapped] = useState({ irritability: null, energyLevel: null, moodFluctuation: null });
  const [saving, setSaving]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const fetchData = useCallback(async () => {
    if (!userId) return;
    try {
      const [c, h] = await Promise.all([
        physicalGoalsService.getCurrentPeriodCycle(userId),
        physicalGoalsService.getPeriodHistory(userId, 12),
      ]);
      setCycle(c);
      setHistory(h);
      const log = c?.dailyLogs?.[today];
      if (log) {
        setTodayFlow(log.flow || 'none');
        const savedReadings = log.readings || [];
        setReadings(savedReadings);
        // Restore last tapped from most recent reading per key
        const last = { irritability: null, energyLevel: null, moodFluctuation: null };
        for (const r of savedReadings) {
          if (r.irritability != null) last.irritability = r.irritability;
          if (r.energyLevel != null) last.energyLevel = r.energyLevel;
          if (r.moodFluctuation != null) last.moodFluctuation = r.moodFluctuation;
        }
        setLastTapped(last);
      }
    } catch (e) {
      console.error('PeriodQuickLog fetch error:', e);
    } finally {
      setLoaded(true);
    }
  }, [userId, today]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const cycleDay = cycle?.cycleStart
    ? Math.floor((new Date() - new Date(cycle.cycleStart + 'T12:00:00')) / 86400000) + 1
    : null;
  const phase = getPhase(cycleDay);

  const completedCycles = history.filter(c => c.cycleLengthDays > 0);
  const avgCycleLen = completedCycles.length > 0
    ? Math.round(completedCycles.reduce((s, c) => s + c.cycleLengthDays, 0) / completedCycles.length)
    : 28;
  const nextPeriod = cycle?.cycleStart
    ? new Date(new Date(cycle.cycleStart + 'T12:00:00').getTime() + avgCycleLen * 86400000)
    : null;
  const daysUntilNext = nextPeriod ? Math.round((nextPeriod - new Date()) / 86400000) : null;

  const persistLog = async (flow, newReadings) => {
    setSaving(true);
    try {
      await physicalGoalsService.logDailyPeriodData(userId, today, {
        flow,
        readings: newReadings,
        irritability:    metricPeak(newReadings, 'irritability'),
        energyLevel:     metricAvg(newReadings, 'energyLevel'),
        moodFluctuation: metricAvg(newReadings, 'moodFluctuation'),
        symptoms: [],
        loggedAt: new Date().toISOString(),
      });
      await physicalGoalsService.updateDailyMetricsWithPeriodData(today, {
        periodFlow: flow,
        irritabilityLevel: metricPeak(newReadings, 'irritability'),
        periodSymptoms: [],
      });
    } catch (e) {
      console.error('Error saving period log:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleStartCycle = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const newCycle = await physicalGoalsService.startNewCycle(userId, today);
      setCycle(newCycle);
      setShowConfirm(false);
    } catch (e) {
      console.error('Error starting cycle:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleFlowTap = (f) => {
    setTodayFlow(f);
    persistLog(f, readings);
  };

  const handleDial = (key, val) => {
    const snapshot = { [key]: val, time: new Date().toISOString() };
    const newReadings = [...readings, snapshot];
    setReadings(newReadings);
    setLastTapped(prev => ({ ...prev, [key]: val }));
    persistLog(todayFlow, newReadings);
  };

  if (!loaded) return (
    <div className={styles.widget}>
      <div className={styles.headerBar}><span className={styles.title}>Cycle Tracker</span></div>
      <div className={styles.body}><p className={styles.hint}>Loading…</p></div>
    </div>
  );

  return (
    <div className={styles.widget}>
      <div className={styles.headerBar}>
        <span className={styles.title}>Cycle Tracker</span>
        {phase && (
          <span className={styles.phaseChip} style={{ background: PHASE_COLORS[phase] }}>
            Day {cycleDay} · {PHASE_LABELS[phase]}
          </span>
        )}
      </div>

      <div className={styles.body}>
        {/* No active cycle — show clear prompt */}
        {!cycle && (
          <div className={styles.noCycleBox}>
            <p className={styles.noCycleText}>No active cycle tracked yet.</p>
            {!showConfirm ? (
              <button className={styles.startCycleBtn} onClick={() => setShowConfirm(true)}>
                Start New Cycle Today
              </button>
            ) : (
              <div className={styles.confirmRow}>
                <span className={styles.confirmText}>Start today ({today})?</span>
                <button className={styles.confirmYes} onClick={handleStartCycle} disabled={saving}>
                  {saving ? '…' : 'Yes'}
                </button>
                <button className={styles.confirmNo} onClick={() => setShowConfirm(false)}>No</button>
              </div>
            )}
          </div>
        )}

        {/* Active cycle tracking */}
        {cycle && (
          <>
            {nextPeriod && daysUntilNext !== null && (
              <p className={styles.nextPeriod}>
                {daysUntilNext > 0
                  ? `Next ~${daysUntilNext}d · ${nextPeriod.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  : daysUntilNext === 0 ? 'Period expected today'
                  : `${Math.abs(daysUntilNext)}d overdue`}
              </p>
            )}

            {/* Flow */}
            <div className={styles.section}>
              <span className={styles.sectionLabel}>Flow</span>
              <div className={styles.flowRow}>
                {FLOW_LEVELS.map(f => (
                  <button
                    key={f}
                    className={`${styles.flowBtn} ${todayFlow === f ? styles.flowBtnActive : ''}`}
                    style={todayFlow === f ? { background: FLOW_COLORS[f], borderColor: '#355E58' } : {}}
                    onClick={() => handleFlowTap(f)}
                    disabled={saving}
                    title={f.charAt(0).toUpperCase() + f.slice(1)}
                  >
                    {FLOW_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>

            {/* Dials */}
            {DIALS.map(({ key, label, low, high, agg }) => {
              const display = computeDisplay(readings, key, agg);
              const highlighted = lastTapped[key];
              const count = countReadings(readings, key);
              return (
                <div key={key} className={styles.section}>
                  <div className={styles.dialHeaderRow}>
                    <span className={styles.sectionLabel}>{label}</span>
                    {count > 0 && display != null && (
                      <span className={styles.avgBadge}>
                        {display} {agg} · {count}×
                      </span>
                    )}
                  </div>
                  <div className={styles.endLabels}>
                    <span>{low}</span>
                    <span>{high}</span>
                  </div>
                  <div className={styles.dialRow}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        className={`${styles.dialBtn} ${highlighted === n ? styles.dialBtnActive : ''}`}
                        style={highlighted === n
                          ? { background: `rgba(53,94,88,${0.25 + n * 0.13})`, borderColor: '#355E58', color: 'white' }
                          : {}}
                        onClick={() => handleDial(key, n)}
                        disabled={saving}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Start new cycle */}
            <div className={styles.newCycleRow}>
              {!showConfirm ? (
                <button className={styles.newCycleBtn} onClick={() => setShowConfirm(true)}>
                  + New Cycle
                </button>
              ) : (
                <div className={styles.confirmRow}>
                  <span className={styles.confirmText}>Start today?</span>
                  <button className={styles.confirmYes} onClick={handleStartCycle} disabled={saving}>
                    {saving ? '…' : 'Yes'}
                  </button>
                  <button className={styles.confirmNo} onClick={() => setShowConfirm(false)}>No</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PeriodQuickLog;
