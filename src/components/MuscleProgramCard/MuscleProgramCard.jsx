import React from 'react';
import styles from './MuscleProgramCard.module.css';
import { getProgramById, getScheduleForDay } from '../../data/muscleBuildingPrograms';

function MuscleProgramCard({ program, onLogWorkout, onLogMeasurement }) {
  const template = getProgramById(program.templateId);
  const weekProgress = Math.min((program.currentWeek / program.duration) * 100, 100);
  const isDeloadWeek = template?.deloadWeek === program.currentWeek;

  // Get today's scheduled workout
  const dayOfWeek = new Date().getDay(); // 0=Sun
  const sessionNum = (program.sessionsThisWeek || 0) + 1;
  const scheduleKeys = template ? Object.keys(template.weeklySchedule) : [];
  const todayScheduleKey = scheduleKeys.length > 0
    ? scheduleKeys[((sessionNum - 1) % scheduleKeys.length)]
    : null;
  const todaySchedule = todayScheduleKey ? template.weeklySchedule[todayScheduleKey] : null;

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
          <h4 className={styles.workoutName}>{todaySchedule.name}</h4>
          <div className={styles.exerciseList}>
            {todaySchedule.exercises.map(exId => {
              const ex = template.exercises.find(e => e.exerciseId === exId);
              if (!ex) return null;
              const weekTarget = ex.weeklyProgression[program.currentWeek];
              return (
                <div key={exId} className={styles.exerciseRow}>
                  <span className={styles.exerciseName}>{ex.exerciseName}</span>
                  {weekTarget && (
                    <span className={styles.exerciseTarget}>
                      {weekTarget.sets}×{weekTarget.reps} @ {weekTarget.weight}
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

      <div className={styles.actions}>
        <button onClick={onLogWorkout} className={styles.logButton}>
          Log Workout
        </button>
        <button onClick={onLogMeasurement} className={styles.measureButton}>
          Log Measurements
        </button>
      </div>
    </div>
  );
}

export default MuscleProgramCard;
