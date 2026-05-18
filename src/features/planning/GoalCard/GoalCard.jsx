import React from 'react';
import styles from '@/features/planning/GoalCard/GoalCard.module.css';

function GoalCard({ goal, onQuickLog }) {
  const {
    emoji,
    title,
    target,
    progress,
    badge,
    workoutCount,
    relatedExercises
  } = goal;

  const getBadgeColor = (badgeLevel) => {
    switch (badgeLevel) {
      case 'platinum': return '#e5e4e2';
      case 'gold': return '#ffd700';
      case 'silver': return '#c0c0c0';
      case 'bronze': return '#cd7f32';
      default: return '#cd7f32';
    }
  };

  const badgeColor = getBadgeColor(badge);

  return (
    <div className={styles.goalCard} style={{ borderColor: badgeColor }}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.emoji}>{emoji}</span>
          <h3 className={styles.title}>{title}</h3>
        </div>
        <span className={styles.badge} style={{ background: badgeColor }}>
          {badge.toUpperCase()}
        </span>
      </div>

      <div className={styles.progressSection}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${badgeColor}dd, ${badgeColor})`
            }}
          />
        </div>
        <span className={styles.progressText}>{progress}%</span>
      </div>

      <div className={styles.targetInfo}>
        <span>{target.startValue} {target.unit}</span>
        <span>&rarr;</span>
        <span className={styles.currentValue}>
          {target.currentValue} {target.unit}
        </span>
        <span>&rarr;</span>
        <span>{target.targetValue} {target.unit}</span>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Workouts</span>
          <span className={styles.statValue}>{workoutCount}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Remaining</span>
          <span className={styles.statValue}>
            {(target.targetValue - target.currentValue).toFixed(1)} {target.unit}
          </span>
        </div>
      </div>

      {relatedExercises && relatedExercises.length > 0 && (
        <div className={styles.exercises}>
          <span className={styles.exercisesLabel}>Related exercises:</span>
          <div className={styles.exercisesList}>
            {relatedExercises.map((ex, idx) => (
              <span key={idx} className={styles.exerciseTag}>{ex}</span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onQuickLog}
        className={styles.logButton}
      >
        Log Workout
      </button>
    </div>
  );
}

export default GoalCard;
