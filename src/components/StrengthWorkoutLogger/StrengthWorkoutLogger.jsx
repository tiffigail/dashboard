import React, { useState, useEffect, useCallback } from 'react';
import styles from './StrengthWorkoutLogger.module.css';
import { getStrengthProgramById, getStrengthScheduleForSession } from '../../data/strengthPrograms';
import * as muscleBuildingService from '../../services/muscleBuildingService';
import RestTimer from '../RestTimer/RestTimer';

function StrengthWorkoutLogger({ program, userId, onClose, onSave }) {
  const template = getStrengthProgramById(program.templateId);
  const today = new Date().toISOString().split('T')[0];
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');
  const [currentExIndex, setCurrentExIndex] = useState(0);
  const [showTimer, setShowTimer] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(180);

  const sessionNum = (program.sessionsThisWeek || 0) + 1;
  const schedule = getStrengthScheduleForSession(program.templateId, sessionNum);

  const [exerciseData, setExerciseData] = useState([]);

  useEffect(() => {
    if (!template || !schedule) return;
    const data = schedule.exercises.map(exId => {
      const ex = template.exercises.find(e => e.exerciseId === exId);
      if (!ex) return null;
      const weekTarget = ex.weeklyProgression[program.currentWeek] || {};
      const nextTarget = program.nextTargets?.[exId];
      const numSets = weekTarget.sets || 5;
      const suggestedWeight = nextTarget?.suggestedWeight || 0;

      const sets = Array.from({ length: numSets }, () => ({
        reps: 0,
        weight: suggestedWeight,
        rpe: 0,
      }));

      return {
        exerciseId: exId,
        exerciseName: ex.exerciseName,
        primaryMuscle: ex.primaryMuscle,
        isLowerBody: ex.isLowerBody || false,
        formCues: ex.formCues || [],
        weekTarget,
        nextTarget,
        sets,
        restSeconds: weekTarget.restSeconds || 180,
      };
    }).filter(Boolean);

    setExerciseData(data);
  }, [template, schedule, program.currentWeek, program.nextTargets]);

  const currentEx = exerciseData[currentExIndex];

  const updateSet = (setIndex, field, value) => {
    setExerciseData(prev => {
      const updated = [...prev];
      const ex = { ...updated[currentExIndex] };
      const sets = [...ex.sets];
      sets[setIndex] = { ...sets[setIndex], [field]: parseFloat(value) || 0 };
      ex.sets = sets;
      updated[currentExIndex] = ex;
      return updated;
    });
  };

  const completeSet = (setIndex) => {
    if (currentEx.sets[setIndex].reps > 0) {
      setTimerSeconds(currentEx.restSeconds);
      setShowTimer(true);
    }
  };

  const handleTimerDone = useCallback(() => {
    setShowTimer(false);
  }, []);

  const handleNextExercise = () => {
    setShowTimer(false);
    if (currentExIndex < exerciseData.length - 1) {
      setCurrentExIndex(currentExIndex + 1);
    }
  };

  const handlePrevExercise = () => {
    setShowTimer(false);
    if (currentExIndex > 0) {
      setCurrentExIndex(currentExIndex - 1);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const sessionData = {
        date: today,
        workoutName: schedule?.name || 'Strength Workout',
        exercises: exerciseData.map(ex => ({
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          isLowerBody: ex.isLowerBody,
          sets: ex.sets.filter(s => s.reps > 0),
        })),
        duration: Number(duration) || 0,
        notes,
      };

      await muscleBuildingService.logWorkoutSession(
        program.programId || program.id,
        userId,
        sessionData
      );

      // Build strength-specific feedback
      const feedbackItems = exerciseData.map(ex => {
        const completedSets = ex.sets.filter(s => s.reps > 0);
        if (completedSets.length === 0) return null;
        const result = muscleBuildingService.calculateStrengthNextTarget(
          { exerciseId: ex.exerciseId, sets: completedSets },
          ex.isLowerBody
        );
        return result ? `${ex.exerciseName.split('(')[0].trim()}: ${result.message}` : null;
      }).filter(Boolean);

      setFeedback(feedbackItems);
    } catch (error) {
      console.error("Error saving strength workout:", error);
      alert("Failed to save workout.");
    } finally {
      setIsSaving(false);
    }
  };

  if (feedback) {
    return (
      <div className={styles.logger}>
        <h3 className={styles.heading}>Workout Complete!</h3>
        <div className={styles.feedbackSection}>
          <h4 className={styles.feedbackTitle}>Next Week&apos;s Targets</h4>
          {feedback.map((msg, i) => (
            <div key={i} className={styles.feedbackItem}>{msg}</div>
          ))}
        </div>
        <button onClick={onSave} className={styles.doneButton}>Done</button>
      </div>
    );
  }

  if (!currentEx) {
    return <div className={styles.logger}><p>No exercises scheduled.</p></div>;
  }

  const completedSetsCount = currentEx.sets.filter(s => s.reps > 0).length;

  return (
    <div className={styles.logger}>
      <div className={styles.headerRow}>
        <div>
          <h3 className={styles.heading}>
            {schedule?.name} — Week {program.currentWeek}
          </h3>
          <p className={styles.subtitle}>
            Exercise {currentExIndex + 1} of {exerciseData.length}
          </p>
        </div>
        <button onClick={onClose} className={styles.closeButton}>×</button>
      </div>

      {/* Exercise nav */}
      <div className={styles.exerciseNav}>
        {exerciseData.map((ex, i) => (
          <button
            key={ex.exerciseId}
            className={`${styles.navDot} ${i === currentExIndex ? styles.navDotActive : ''} ${ex.sets.some(s => s.reps > 0) ? styles.navDotDone : ''}`}
            onClick={() => { setCurrentExIndex(i); setShowTimer(false); }}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className={styles.exerciseBlock}>
        <h4 className={styles.exerciseName}>{currentEx.exerciseName}</h4>
        <span className={styles.target}>
          Target: {currentEx.weekTarget.sets}×{currentEx.weekTarget.reps} @ {currentEx.nextTarget?.suggestedWeight || currentEx.weekTarget.weight}
          {currentEx.nextTarget?.suggestedWeight ? ' lbs' : ''}
        </span>
        <span className={styles.restInfo}>Rest: {Math.floor(currentEx.restSeconds / 60)}:{(currentEx.restSeconds % 60).toString().padStart(2, '0')} between sets</span>

        {/* Form cues - always visible for strength */}
        <div className={styles.cuesBox}>
          <h5 className={styles.cuesTitle}>Form Cues</h5>
          <ul className={styles.cuesList}>
            {currentEx.formCues.map((cue, i) => <li key={i}>{cue}</li>)}
          </ul>
        </div>

        {/* Rest timer */}
        {showTimer && (
          <RestTimer
            seconds={timerSeconds}
            onComplete={handleTimerDone}
            onSkip={handleTimerDone}
          />
        )}

        {/* Sets */}
        {!showTimer && (
          <>
            <div className={styles.setsHeader}>
              <span className={styles.setLabel}>Set</span>
              <span className={styles.setLabel}>Weight (lbs)</span>
              <span className={styles.setLabel}>Reps</span>
              <span className={styles.setLabel}></span>
            </div>

            {currentEx.sets.map((set, setIndex) => (
              <div key={setIndex} className={`${styles.setRow} ${set.reps > 0 ? styles.setDone : ''}`}>
                <span className={styles.setNum}>{setIndex + 1}</span>
                <input
                  type="number"
                  value={set.weight || ''}
                  onChange={e => updateSet(setIndex, 'weight', e.target.value)}
                  className={styles.setInput}
                  placeholder="0"
                  step="2.5"
                  min="0"
                />
                <input
                  type="number"
                  value={set.reps || ''}
                  onChange={e => updateSet(setIndex, 'reps', e.target.value)}
                  className={styles.setInput}
                  placeholder="0"
                  min="0"
                />
                <button
                  onClick={() => completeSet(setIndex)}
                  className={styles.completeSetBtn}
                  disabled={set.reps <= 0}
                >
                  {set.reps > 0 ? '✓' : '—'}
                </button>
              </div>
            ))}

            <div className={styles.volumeRow}>
              Volume: {currentEx.sets.reduce((s, set) => s + (set.reps * set.weight), 0).toLocaleString()} lbs
              &nbsp;|&nbsp;
              {completedSetsCount}/{currentEx.sets.length} sets
            </div>
          </>
        )}
      </div>

      <div className={styles.navActions}>
        <button
          onClick={handlePrevExercise}
          className={styles.navButton}
          disabled={currentExIndex === 0}
        >
          ← Prev
        </button>

        {currentExIndex < exerciseData.length - 1 ? (
          <button onClick={handleNextExercise} className={styles.navButton}>
            Next →
          </button>
        ) : (
          <button onClick={handleSave} className={styles.saveButton} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Finish Workout'}
          </button>
        )}
      </div>

      <div className={styles.notesGroup}>
        <label>Duration (minutes, optional)</label>
        <input
          type="number"
          value={duration}
          onChange={e => setDuration(e.target.value)}
          placeholder="e.g., 75"
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
          placeholder="How did it feel? Energy level?"
          className={styles.notesInput}
          rows="2"
        />
      </div>
    </div>
  );
}

export default StrengthWorkoutLogger;
