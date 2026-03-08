import React from 'react';
import styles from './EnduranceGoalCard.module.css';
import { getJourneyById } from '../../data/enduranceJourneys';

function EnduranceGoalCard({ goal, onLogSession }) {
  const journey = getJourneyById(goal.journeyId);
  const isDistance = goal.journeyType === 'distance';
  const isSession = goal.journeyType === 'session';
  const milestonesReached = goal.milestonesReached || [];
  const allMilestones = journey?.milestones || [];
  const phases = journey?.phases || [];
  const phaseProgress = goal.phaseProgress || {};
  const currentPhase = goal.currentPhase || 'baseline';

  const getBadgeColor = (badge) => {
    switch (badge) {
      case 'platinum': return '#e5e4e2';
      case 'gold': return '#ffd700';
      case 'silver': return '#c0c0c0';
      case 'bronze': return '#cd7f32';
      default: return '#cd7f32';
    }
  };

  const badgeColor = getBadgeColor(goal.badge);

  const isMilestoneReached = (ms) => {
    if (isDistance) return milestonesReached.some(r => r.mile === ms.mile);
    return milestonesReached.some(r => r.level === ms.level);
  };

  const getPhaseStatus = (phase) => {
    const count = phaseProgress[phase.id] || 0;
    const required = phase.sessionsRequired;
    if (!required) return currentPhase === phase.id ? 'active' : (count > 0 ? 'active' : 'upcoming');
    if (count >= required) return 'complete';
    if (currentPhase === phase.id) return 'active';
    return 'upcoming';
  };

  return (
    <div className={styles.card} style={{ borderColor: badgeColor }}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.emoji}>{goal.emoji}</span>
          <h3 className={styles.title}>{goal.title}</h3>
        </div>
        <span className={styles.badge} style={{ background: badgeColor }}>
          {(goal.badge || 'bronze').toUpperCase()}
        </span>
      </div>

      <div className={styles.progressSection}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{
              width: `${Math.min(goal.progress || 0, 100)}%`,
              background: `linear-gradient(90deg, ${badgeColor}dd, ${badgeColor})`
            }}
          />
        </div>
        <span className={styles.progressText}>{Math.round(goal.progress || 0)}%</span>
      </div>

      {isDistance && (
        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{(goal.totalMiles || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
            <span className={styles.statLabel}>/ {(goal.target?.targetValue || 0).toLocaleString()} mi</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{(goal.totalSteps || 0).toLocaleString()}</span>
            <span className={styles.statLabel}>total steps</span>
          </div>
        </div>
      )}

      {isSession && phases.length > 0 && (
        <>
          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{(goal.allSessions || []).length}</span>
              <span className={styles.statLabel}>total sessions</span>
            </div>
            {goal.baselineRHR && (
              <div className={styles.stat}>
                <span className={styles.statValue}>{goal.baselineRHR}</span>
                <span className={styles.statLabel}>baseline RHR</span>
              </div>
            )}
            {goal.maxHR && (
              <div className={styles.stat}>
                <span className={styles.statValue}>{goal.maxHR}</span>
                <span className={styles.statLabel}>max HR</span>
              </div>
            )}
          </div>

          <div className={styles.phaseTracker}>
            <h4 className={styles.milestonesTitle}>Phase Progress</h4>
            {phases.map((phase) => {
              const status = getPhaseStatus(phase);
              const count = phaseProgress[phase.id] || 0;
              const required = phase.sessionsRequired;
              return (
                <div key={phase.id} className={`${styles.phaseRow} ${styles[`phase_${status}`]}`}>
                  <span className={styles.phaseEmoji}>{phase.emoji}</span>
                  <div className={styles.phaseInfo}>
                    <span className={styles.phaseName}>{phase.name}</span>
                    <span className={styles.phaseCount}>
                      {required ? `${Math.min(count, required)}/${required} sessions` : (count > 0 ? `${count} sessions` : 'Ongoing')}
                    </span>
                  </div>
                  <span className={styles.phaseStatus}>
                    {status === 'complete' ? '✅' : status === 'active' ? '🔵' : '⏳'}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {isDistance && (
        <div className={styles.milestones}>
          <h4 className={styles.milestonesTitle}>Milestones</h4>
          {allMilestones.map((ms, i) => {
            const reached = isMilestoneReached(ms);
            return (
              <div key={i} className={`${styles.milestone} ${reached ? styles.milestoneReached : ''}`}>
                <span className={styles.milestoneCheck}>{reached ? '✅' : '⏳'}</span>
                <span className={styles.milestoneEmoji}>{ms.emoji}</span>
                <div className={styles.milestoneInfo}>
                  <span className={styles.milestoneName}>{ms.location || ms.name}</span>
                  {ms.mile && (
                    <span className={styles.milestoneDist}>{ms.mile.toLocaleString()} mi</span>
                  )}
                </div>
                {reached && (
                  <span className={styles.milestoneDate}>
                    {milestonesReached.find(r => (r.mile === ms.mile) || (r.level === ms.level))?.reachedOn || ''}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isDistance ? (
        <p className={styles.autoSyncNote}>Steps sync automatically from your PM routine</p>
      ) : (
        <button onClick={onLogSession} className={styles.logButton}>
          Log Session
        </button>
      )}
    </div>
  );
}

export default EnduranceGoalCard;
