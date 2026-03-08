import React, { useState } from 'react';
import styles from './QuickWorkoutLogger.module.css';
import * as physicalGoalsService from '../../services/physicalGoalsService';

function QuickWorkoutLogger({ userId, goals, onClose, onSave }) {
  const [workoutName, setWorkoutName] = useState('');
  const [duration, setDuration] = useState('');
  const [exercises, setExercises] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addExercise = () => {
    setExercises([
      ...exercises,
      {
        exerciseName: '',
        sets: [{ reps: 0, weight: 0 }],
        relatedGoals: []
      }
    ]);
  };

  const removeExercise = (index) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const updateExercise = (index, field, value) => {
    const updated = [...exercises];
    updated[index][field] = value;
    setExercises(updated);
  };

  const addSet = (exerciseIndex) => {
    const updated = [...exercises];
    updated[exerciseIndex].sets.push({ reps: 0, weight: 0 });
    setExercises(updated);
  };

  const updateSet = (exerciseIndex, setIndex, field, value) => {
    const updated = [...exercises];
    updated[exerciseIndex].sets[setIndex][field] = Number(value);
    setExercises(updated);
  };

  const calculateExerciseVolume = (sets) => {
    return sets.reduce((sum, set) => sum + (set.reps * set.weight), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const date = physicalGoalsService.getTodayDateString();

      const processedExercises = exercises.map(ex => ({
        exerciseName: ex.exerciseName,
        sets: ex.sets,
        totalVolume: calculateExerciseVolume(ex.sets),
        relatedGoals: ex.relatedGoals,
        isPR: false
      }));

      await physicalGoalsService.createWorkoutLog(userId, {
        date,
        workoutName: workoutName || 'Workout',
        exercises: processedExercises,
        duration: Number(duration) || 0,
      });

      onSave();
    } catch (error) {
      console.error("Error logging workout:", error);
      alert("Failed to log workout. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
      <div className={styles.logger}>
        <h2 className={styles.title}>Log Workout</h2>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Workout Name</label>
            <input
              type="text"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              placeholder="e.g., Leg Day, Upper Body"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Duration (minutes, optional)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g., 45"
              className={styles.input}
              min="0"
            />
          </div>

          <div className={styles.exercises}>
            <div className={styles.exercisesHeader}>
              <h3>Exercises</h3>
              <button
                type="button"
                onClick={addExercise}
                className={styles.addButton}
              >
                + Add Exercise
              </button>
            </div>

            {exercises.length === 0 ? (
              <p className={styles.emptyState}>No exercises yet. Click "Add Exercise" to start!</p>
            ) : (
              exercises.map((exercise, exIndex) => (
                <div key={exIndex} className={styles.exerciseCard}>
                  <div className={styles.exerciseHeader}>
                    <input
                      type="text"
                      value={exercise.exerciseName}
                      onChange={(e) => updateExercise(exIndex, 'exerciseName', e.target.value)}
                      placeholder="Exercise name (e.g., Seated Calf Raises)"
                      className={styles.input}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => removeExercise(exIndex)}
                      className={styles.removeButton}
                    >
                      X
                    </button>
                  </div>

                  <div className={styles.sets}>
                    {exercise.sets.map((set, setIndex) => (
                      <div key={setIndex} className={styles.setRow}>
                        <span className={styles.setNumber}>Set {setIndex + 1}</span>
                        <input
                          type="number"
                          value={set.weight}
                          onChange={(e) => updateSet(exIndex, setIndex, 'weight', e.target.value)}
                          placeholder="Weight (lbs)"
                          className={styles.smallInput}
                          required
                        />
                        <span>x</span>
                        <input
                          type="number"
                          value={set.reps}
                          onChange={(e) => updateSet(exIndex, setIndex, 'reps', e.target.value)}
                          placeholder="Reps"
                          className={styles.smallInput}
                          required
                        />
                        <span className={styles.volume}>
                          = {(set.weight * set.reps).toLocaleString()} lbs
                        </span>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addSet(exIndex)}
                      className={styles.addSetButton}
                    >
                      + Add Set
                    </button>
                  </div>

                  <div className={styles.exerciseTotal}>
                    Total Volume: <strong>{calculateExerciseVolume(exercise.sets).toLocaleString()} lbs</strong>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.saveButton}
              disabled={isSubmitting || exercises.length === 0}
            >
              {isSubmitting ? 'Saving...' : 'Save Workout'}
            </button>
          </div>
        </form>
      </div>
  );
}

export default QuickWorkoutLogger;
