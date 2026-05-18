import React from 'react';
import styles from '@/features/gear/SkillBadgeCard/SkillBadgeCard.module.css';
import { getSkillBadgeTemplateById } from '@/data/skillBadgeTemplates';

function SkillBadgeCard({ badge, onLogPractice, onViewProgress }) {
  const template = getSkillBadgeTemplateById(badge.skillId);
  const currentLevelData = badge.levels?.find(l => l.levelNumber === badge.currentLevel);
  const templateLevel = template?.levels?.find(l => l.levelNumber === badge.currentLevel);

  const completedLevels = badge.levels?.filter(l => l.status === 'completed').length || 0;
  const totalLevels = badge.totalLevels || template?.totalLevels || 5;
  const progressPercent = Math.round((completedLevels / totalLevels) * 100);

  const drillsCompleted = currentLevelData?.drills?.filter(d => d.completed).length || 0;
  const drillsTotal = currentLevelData?.drills?.length || 0;

  const formatMinutes = (mins) => {
    if (!mins) return '0m';
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.emoji}>{badge.emoji}</span>
        <span className={styles.level}>Level {badge.currentLevel}/{totalLevels}</span>
      </div>

      <h3 className={styles.title}>{badge.skillName}</h3>

      <div className={styles.levelName}>
        {currentLevelData?.badgeEmoji} {currentLevelData?.levelName}
      </div>

      <div className={styles.progressSection}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className={styles.progressText}>{progressPercent}% Complete</span>
      </div>

      {templateLevel && (
        <div className={styles.currentGoal}>
          <span className={styles.goalLabel}>Current Goal:</span>
          <span className={styles.goalText}>
            {templateLevel.skillsRequired?.[0] || 'Complete all drills'}
          </span>
        </div>
      )}

      <div className={styles.drillsProgress}>
        <span className={styles.drillsLabel}>Drills Progress:</span>
        <span className={styles.drillsCount}>{drillsCompleted}/{drillsTotal} completed</span>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{badge.currentStreak || 0}</span>
          <span className={styles.statLabel}>Day Streak</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{formatMinutes(badge.totalPracticeMinutes)}</span>
          <span className={styles.statLabel}>Total Time</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{badge.totalPracticeSessions || 0}</span>
          <span className={styles.statLabel}>Sessions</span>
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.primaryButton} onClick={onLogPractice}>
          Log Practice
        </button>
        <button className={styles.secondaryButton} onClick={onViewProgress}>
          View Progress
        </button>
      </div>
    </div>
  );
}

export default SkillBadgeCard;
