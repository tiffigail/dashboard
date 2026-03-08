import { useState } from 'react';
import styles from './CardioSessionLogger.module.css';
import * as enduranceGoalsService from '../../services/enduranceGoalsService';
import { getJourneyById } from '../../data/enduranceJourneys';

function CardioSessionLogger({ goal, userId, onClose, onSave }) {
  const today = new Date().toISOString().split('T')[0];
  const journey = getJourneyById(goal.journeyId);
  const currentPhase = goal.currentPhase || 'baseline';
  const phaseObj = journey?.phases?.find(p => p.id === currentPhase);

  // Age setup (only needed once)
  const [age, setAge] = useState(goal.age || '');
  const needsAge = !goal.age;

  // Session inputs
  const [date, setDate] = useState(today);
  const [duration, setDuration] = useState('');
  const [restingHR, setRestingHR] = useState('');
  const [peakHR, setPeakHR] = useState('');
  const [postExerciseHR, setPostExerciseHR] = useState('');
  const [rpe, setRpe] = useState('6');
  const [feltEuphoria, setFeltEuphoria] = useState('no');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calculated values
  const ageNum = Number(age) || 30;
  const maxHR = goal.maxHR || (220 - ageNum);
  const restingNum = Number(restingHR) || 0;
  const peakNum = Number(peakHR) || 0;
  const postNum = Number(postExerciseHR) || 0;
  const durationNum = Number(duration) || 0;
  const heartRateReserve = maxHR - restingNum;
  const hrrPercent = heartRateReserve > 0 ? Math.round(((peakNum - restingNum) / heartRateReserve) * 100) : 0;
  const recoveryDelta = peakNum - postNum;

  // Phase qualification check
  const getZoneStatus = () => {
    if (!phaseObj || currentPhase === 'baseline') return { label: 'Baseline — just record data', color: '#667eea' };
    const durOk = !phaseObj.durationTarget || durationNum >= phaseObj.durationTarget;
    const hrrOk = !phaseObj.hrrTarget || (hrrPercent >= phaseObj.hrrTarget.min && hrrPercent <= phaseObj.hrrTarget.max);
    if (durOk && hrrOk) return { label: `Qualifies for ${phaseObj.name} phase`, color: '#2e7d32' };
    const issues = [];
    if (!durOk) issues.push(`Need ${phaseObj.durationTarget}+ min (got ${durationNum})`);
    if (!hrrOk) issues.push(`Need ${phaseObj.hrrTarget.min}-${phaseObj.hrrTarget.max}% HRR (got ${hrrPercent}%)`);
    return { label: issues.join(' | '), color: '#e65100' };
  };

  const zoneStatus = (restingNum > 0 && peakNum > 0 && durationNum > 0) ? getZoneStatus() : null;

  const canSubmit = durationNum > 0 && restingNum > 0 && peakNum > 0 && postNum > 0 && (!needsAge || Number(age) > 0);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      // Set age if first time
      if (needsAge && Number(age) > 0) {
        await enduranceGoalsService.setRunnerAge(goal.id, Number(age));
      }

      const result = await enduranceGoalsService.logCardioSession(goal.id, userId, {
        date,
        duration: durationNum,
        restingHR: restingNum,
        peakHR: peakNum,
        postExerciseHR: postNum,
        rpe: Number(rpe),
        feltEuphoria,
        notes,
      });

      if (result?.newMilestones?.length > 0) {
        alert(`Milestone reached: ${result.newMilestones.map(m => `${m.emoji} ${m.name}`).join(', ')}`);
      }
      onSave();
    } catch (error) {
      console.error("Error logging session:", error);
      alert("Failed to log session. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.logger}>
      <h2 className={styles.title}>Log Cardio Session</h2>
      <div className={styles.phaseInfo}>
        <span className={styles.phaseEmoji}>{phaseObj?.emoji || '📊'}</span>
        <span>Current Phase: <strong>{phaseObj?.name || 'Baseline'}</strong></span>
      </div>
      {phaseObj?.description && <p className={styles.phaseDesc}>{phaseObj.description}</p>}

      {needsAge && (
        <div className={styles.formGroup}>
          <label>Your Age (needed once to calculate max heart rate)</label>
          <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="e.g., 30" className={styles.input} min="10" max="100" />
          {Number(age) > 0 && <p className={styles.calc}>Estimated Max HR: <strong>{220 - Number(age)} bpm</strong></p>}
        </div>
      )}

      <div className={styles.formGroup}>
        <label>Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className={styles.input} />
      </div>

      <div className={styles.formGroup}>
        <label>Duration (minutes)</label>
        <input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g., 45" className={styles.input} min="0" />
      </div>

      <div className={styles.hrRow}>
        <div className={styles.formGroup}>
          <label>Resting HR</label>
          <input type="number" value={restingHR} onChange={e => setRestingHR(e.target.value)} placeholder="bpm" className={styles.input} min="30" max="200" />
          <span className={styles.inputHint}>Before exercise</span>
        </div>
        <div className={styles.formGroup}>
          <label>Peak HR</label>
          <input type="number" value={peakHR} onChange={e => setPeakHR(e.target.value)} placeholder="bpm" className={styles.input} min="30" max="250" />
          <span className={styles.inputHint}>Max during</span>
        </div>
        <div className={styles.formGroup}>
          <label>Post HR</label>
          <input type="number" value={postExerciseHR} onChange={e => setPostExerciseHR(e.target.value)} placeholder="bpm" className={styles.input} min="30" max="250" />
          <span className={styles.inputHint}>1 min after stop</span>
        </div>
      </div>

      {/* Auto-calculated metrics */}
      {restingNum > 0 && peakNum > 0 && (
        <div className={styles.metricsCard}>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Max HR (est.)</span>
            <span className={styles.metricValue}>{maxHR} bpm</span>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Heart Rate Reserve</span>
            <span className={styles.metricValue}>{heartRateReserve} bpm</span>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>HRR %</span>
            <span className={styles.metricValue} style={{ color: hrrPercent >= 70 && hrrPercent <= 80 ? '#2e7d32' : '#333', fontWeight: hrrPercent >= 70 && hrrPercent <= 80 ? 700 : 400 }}>
              {hrrPercent}%
            </span>
          </div>
          {postNum > 0 && (
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Recovery (1 min)</span>
              <span className={styles.metricValue}>-{recoveryDelta} bpm</span>
            </div>
          )}
        </div>
      )}

      {zoneStatus && (
        <div className={styles.zoneBanner} style={{ background: zoneStatus.color + '18', borderColor: zoneStatus.color }}>
          {zoneStatus.label}
        </div>
      )}

      <div className={styles.hrRow}>
        <div className={styles.formGroup}>
          <label>RPE (1-10)</label>
          <select value={rpe} onChange={e => setRpe(e.target.value)} className={styles.input}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <option key={n} value={n}>{n}{n === 6 ? ' — sweet spot' : n === 7 ? ' — sweet spot' : ''}</option>
            ))}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label>Felt Euphoria?</label>
          <select value={feltEuphoria} onChange={e => setFeltEuphoria(e.target.value)} className={styles.input}>
            <option value="no">No</option>
            <option value="maybe">Maybe</option>
            <option value="yes">Yes!</option>
          </select>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label>Notes (optional)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="How did you feel? Did time fly by?" className={styles.textarea} rows="2" />
      </div>

      <div className={styles.actions}>
        <button onClick={onClose} className={styles.cancelButton}>Cancel</button>
        <button onClick={handleSubmit} className={styles.submitButton} disabled={isSubmitting || !canSubmit}>
          {isSubmitting ? 'Saving...' : 'Log Session'}
        </button>
      </div>
    </div>
  );
}

export default CardioSessionLogger;
