import React, { useState, useEffect } from 'react';
import styles from './WorkoutSessionLogger.module.css';
import { getProgramById } from '../../data/muscleBuildingPrograms';
import * as muscleBuildingService from '../../services/muscleBuildingService';

function WorkoutSessionLogger({ program, userId, onClose, onSave }) {
  const template = getProgramById(program.templateId);
  const today = new Date().toISOString().split('T')[0];
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');
  const [expandedCues, setExpandedCues] = useState({});

  // Determine which workout to show
  const sessionNum = (program.sessionsThisWeek || 0) + 1;
  const scheduleKeys = template ? Object.keys(template.weeklySchedule) : [];
  const scheduleKey = scheduleKeys.length > 0
    ? scheduleKeys[((sessionNum - 1) % scheduleKeys.length)]
    : null;
  const schedule = scheduleKey ? template.weeklySchedule[scheduleKey] : null;

  // Build exercise data with sets
  const [exerciseData, setExerciseData] = useState([]);

  useEffect(() => {
    if (!template || !schedule) return;
    const data = schedule.exercises.map(exId => {
      const ex = template.exercises.find(e => e.exerciseId === exId);
      if (!ex) return null;
      const weekTarget = ex.weeklyProgression[program.currentWeek] || {};
      const nextTarget = program.nextTargets?.[exId];
      const numSets = weekTarget.sets || 3;
      const suggestedWeight = nextTarget?.suggestedWeight || 0;

      const sets = Array.from({ length: numSets }, () => ({
        reps: 0,
        weight: suggestedWeight,
      }));

      return {
        exerciseId: exId,
        exerciseName: ex.exerciseName,
        targetMuscle: ex.targetMuscle,
        formCues: ex.formCues || [],
        weekTarget,
        nextTarget,
        sets,
      };
    }).filter(Boolean);

    setExerciseData(data);
  }, [template, schedule, program.currentWeek, program.nextTargets]);

  const updateSet = (exIndex, setIndex, field, value) => {
    setExerciseData(prev => {
      const updated = [...prev];
      const ex = { ...updated[exIndex] };
      const sets = [...ex.sets];
      sets[setIndex] = { ...sets[setIndex], [field]: parseFloat(value) || 0 };
      ex.sets = sets;
      updated[exIndex] = ex;
      return updated;
    });
  };

  const addSet = (exIndex) => {
    setExerciseData(prev => {
      const updated = [...prev];
      const ex = { ...updated[exIndex] };
      const lastSet = ex.sets[ex.sets.length - 1] || { reps: 0, weight: 0 };
      ex.sets = [...ex.sets, { ...lastSet }];
      updated[exIndex] = ex;
      return updated;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const sessionData = {
        date: today,
        workoutName: schedule?.name || 'Workout',
        exercises: exerciseData.map(ex => ({
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          sets: ex.sets.filter(s => s.reps > 0),
        })),
        duration: Number(duration) || 0,
        notes,
      };

      const result = await muscleBuildingService.logWorkoutSession(
        program.programId || program.id,
        userId,
        sessionData
      );

      // Build feedback from next targets
      const feedbackItems = exerciseData.map(ex => {
        const next = result.nextTargets?.[ex.exerciseId];
        return next ? `${ex.exerciseName}: ${next.message}` : null;
      }).filter(Boolean);

      if (feedbackItems.length > 0) {
        setFeedback(feedbackItems);
      } else {
        onSave();
      }
    } catch (error) {
      console.error("Error saving workout:", error);
      alert("Failed to save workout.");
    } finally {
      setIsSaving(false);
    }
  };

  if (feedback) {
    return (
      <div className={styles.logger}>
        <h3 className={styles.heading}>Workout Logged!</h3>
        <div className={styles.feedbackSection}>
          <h4 className={styles.feedbackTitle}>Next Session Targets</h4>
          {feedback.map((msg, i) => (
            <div key={i} className={styles.feedbackItem}>{msg}</div>
          ))}
        </div>
        <button onClick={onSave} className={styles.doneButton}>Done</button>
      </div>
    );
  }

  return (
    <div className={styles.logger}>
      <div className={styles.headerRow}>
        <div>
          <h3 className={styles.heading}>
            {schedule?.name || 'Workout'} — Week {program.currentWeek}
          </h3>
          <p className={styles.subtitle}>{schedule?.focus || ''}</p>
        </div>
        <button onClick={onClose} className={styles.closeButton}>×</button>
      </div>

      {exerciseData.map((ex, exIndex) => (
        <div key={ex.exerciseId} className={styles.exerciseBlock}>
          <div className={styles.exerciseHeader}>
            <div>
              <h4 className={styles.exerciseName}>{ex.exerciseName}</h4>
              <span className={styles.target}>
                Target: {ex.weekTarget.sets}×{ex.weekTarget.reps} @ {ex.weekTarget.weight}
              </span>
            </div>
            {ex.nextTarget && (
              <span className={styles.suggestion}>{ex.nextTarget.message}</span>
            )}
          </div>

          {ex.formCues.length > 0 && (
            <div className={styles.cuesSection}>
              <button
                className={styles.cuesToggle}
                onClick={() => setExpandedCues(prev => ({ ...prev, [ex.exerciseId]: !prev[ex.exerciseId] }))}
              >
                {expandedCues[ex.exerciseId] ? 'Hide' : 'Show'} Form Cues
              </button>
              {expandedCues[ex.exerciseId] && (
                <ul className={styles.cuesList}>
                  {ex.formCues.map((cue, i) => <li key={i}>{cue}</li>)}
                </ul>
              )}
            </div>
          )}

          <div className={styles.setsHeader}>
            <span className={styles.setLabel}>Set</span>
            <span className={styles.setLabel}>Reps</span>
            <span className={styles.setLabel}>Weight (lbs)</span>
          </div>

          {ex.sets.map((set, setIndex) => (
            <div key={setIndex} className={styles.setRow}>
              <span className={styles.setNum}>{setIndex + 1}</span>
              <input
                type="number"
                value={set.reps || ''}
                onChange={e => updateSet(exIndex, setIndex, 'reps', e.target.value)}
                className={styles.setInput}
                placeholder="0"
                min="0"
              />
              <input
                type="number"
                value={set.weight || ''}
                onChange={e => updateSet(exIndex, setIndex, 'weight', e.target.value)}
                className={styles.setInput}
                placeholder="0"
                step="2.5"
                min="0"
              />
            </div>
          ))}

          <button onClick={() => addSet(exIndex)} className={styles.addSetButton}>+ Add Set</button>

          <div className={styles.volumeRow}>
            <span>Volume: {ex.sets.reduce((s, set) => s + (set.reps * set.weight), 0).toLocaleString()} lbs</span>
          </div>
        </div>
      ))}

      <div className={styles.notesGroup}>
        <label>Duration (minutes, optional)</label>
        <input
          type="number"
          value={duration}
          onChange={e => setDuration(e.target.value)}
          placeholder="e.g., 60"
          className={styles.notesInput}
          min="0"
          style={{ fontFamily: 'inherit', fontSize: 16 }}
        />
      </div>

      <div className={styles.notesGroup}>
        <label>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="How did it feel?"
          className={styles.notesInput}
          rows="2"
        />
      </div>

      <div className={styles.actions}>
        <button onClick={onClose} className={styles.cancelButton}>Cancel</button>
        <button onClick={handleSave} className={styles.saveButton} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Workout'}
        </button>
      </div>
    </div>
  );
}

export default WorkoutSessionLogger;
