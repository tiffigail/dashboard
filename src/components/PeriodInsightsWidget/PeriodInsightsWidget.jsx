import React, { useState, useEffect, useCallback } from 'react';
import styles from './PeriodInsightsWidget.module.css';
import * as physicalGoalsService from '../../services/physicalGoalsService';

const FLOW_LEVELS = ['none', 'spotting', 'light', 'medium', 'heavy'];
const FLOW_LABELS = { none: 'None', spotting: 'Spotting', light: 'Light', medium: 'Medium', heavy: 'Heavy' };
const FLOW_COLORS = { none: '#f5f5f5', spotting: '#fce4ec', light: '#f8bbd0', medium: '#f48fb1', heavy: '#e91e63' };

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

  // Build calendar heatmap data (last 3 months)
  const buildCalendarData = () => {
    const dailyLogs = {};
    for (const cycle of cycleHistory) {
      if (cycle.dailyLogs) {
        for (const [date, data] of Object.entries(cycle.dailyLogs)) {
          dailyLogs[date] = data;
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
        const log = dailyLogs[dateStr];
        days.push({ day: d, date: dateStr, flow: log?.flow || null });
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
            <div>
              <h3>Day {cycleDay}</h3>
              <p>{phase.charAt(0).toUpperCase() + phase.slice(1)} Phase</p>
            </div>
          </div>
          {currentCycle.cycleLengthDays == null && cycleDay > 20 && (
            <div className={styles.predictions}>
              <div className={styles.prediction}>
                <span className={styles.predictionLabel}>Avg cycle:</span>
                <span className={styles.predictionValue}>{avgCycleLength} days</span>
              </div>
              <div className={styles.prediction}>
                <span className={styles.predictionLabel}>Expected next:</span>
                <span className={styles.predictionValue}>~Day {avgCycleLength}</span>
              </div>
            </div>
          )}
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
                  {month.days.map(d => (
                    <span
                      key={d.day}
                      className={styles.calDay}
                      style={{ background: d.flow ? FLOW_COLORS[d.flow] : '#f9f9f9' }}
                      title={d.date + (d.flow ? ` - ${FLOW_LABELS[d.flow]}` : '')}
                    >
                      {d.day}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className={styles.calLegend}>
            {FLOW_LEVELS.map(f => (
              <span key={f} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: FLOW_COLORS[f] }} />
                {FLOW_LABELS[f]}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default PeriodInsightsWidget;
