import React from 'react';
import styles from '@/features/physical/StrengthProgramCard/StrengthProgramCard.module.css';
import { getStrengthProgramById, getStrengthScheduleForSession, estimateOneRepMax } from '@/data/strengthPrograms';

function StrengthProgramCard({ program, onStartWorkout, onViewProgress }) {
  const template = getStrengthProgramById(program.templateId);
  const weekProgress = Math.min((program.currentWeek / program.duration) * 100, 100);
  const isDeloadWeek = template?.deloadWeek === program.currentWeek;

  const sessionNum = (program.sessionsThisWeek || 0) + 1;
  const todaySchedule = getStrengthScheduleForSession(program.templateId, sessionNum);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.emoji}>{program.emoji}</span>
          <div>
            <h3 className={styles.title}>{program.title}</h3>
            <span className={styles.weekLabel}>
              Week {program.currentWeek} of {program.duration}
              {isDeloadWeek && <span className={styles.deloadBadge}>DELOAD</span>}
            </span>
          </div>
        </div>
        <span className={styles.sessionCount}>
          {program.sessionsThisWeek || 0}/{program.sessionsPerWeek}
        </span>
      </div>

      <div className={styles.progressSection}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${weekProgress}%` }} />
        </div>
        <span className={styles.progressText}>{Math.round(weekProgress)}%</span>
      </div>

      {todaySchedule && (
        <div className={styles.todayWorkout}>
          <div className={styles.workoutHeader}>
            <h4 className={styles.workoutName}>{todaySchedule.name}</h4>
            <span className={styles.duration}>{todaySchedule.estDuration}</span>
          </div>
          <p className={styles.workoutFocus}>{todaySchedule.focus}</p>
          <div className={styles.exerciseList}>
            {todaySchedule.exercises.map(exId => {
              const ex = template.exercises.find(e => e.exerciseId === exId);
              if (!ex) return null;
              const weekTarget = ex.weeklyProgression[program.currentWeek];
              const nextTarget = program.nextTargets?.[exId];
              const displayWeight = nextTarget?.suggestedWeight || weekTarget?.weight;
              return (
                <div key={exId} className={styles.exerciseRow}>
                  <div className={styles.exerciseInfo}>
                    <span className={styles.exerciseName}>{ex.exerciseName.split('(')[0].trim()}</span>
                    <span className={styles.exerciseTarget}>
                      {weekTarget?.sets}×{weekTarget?.reps} @ {displayWeight}{typeof displayWeight === 'number' ? ' lbs' : ''}
                    </span>
                  </div>
                  {nextTarget?.suggestedWeight && (
                    <span className={styles.estimated1rm}>
                      Est 1RM: {estimateOneRepMax(nextTarget.suggestedWeight)} lbs
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{program.totalSessions || 0}</span>
          <span className={styles.statLabel}>total sessions</span>
        </div>
        {program.lastWorkoutDate && (
          <div className={styles.stat}>
            <span className={styles.statValue}>
              {new Date(program.lastWorkoutDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <span className={styles.statLabel}>last workout</span>
          </div>
        )}
      </div>

      {isDeloadWeek && (
        <div className={styles.deloadNotice}>
          Deload week — reduce all weights to Week 3 levels. Workouts should feel easy. Your CNS needs rest.
        </div>
      )}

      <div className={styles.actions}>
        <button onClick={onStartWorkout} className={styles.workoutButton}>
          Start Workout
        </button>
        {onViewProgress && (
          <button onClick={onViewProgress} className={styles.progressButton}>
            View Progress
          </button>
        )}
      </div>
    </div>
  );
}

export default StrengthProgramCard;
