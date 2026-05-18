import React, { useState } from 'react';
import styles from '@/features/gear/SkillLevelView/SkillLevelView.module.css';
import { getSkillBadgeTemplateById } from '@/data/skillBadgeTemplates';
import * as skillBadgeService from '@/services/skillBadgeService';

function SkillLevelView({ badge, userId, onClose, onRefresh }) {
  const template = getSkillBadgeTemplateById(badge.skillId);
  const [expandedLevel, setExpandedLevel] = useState(badge.currentLevel);
  const [isCompletingLevel, setIsCompletingLevel] = useState(false);

  const handleCompleteLevel = async (levelNumber) => {
    setIsCompletingLevel(true);
    try {
      const result = await skillBadgeService.completeLevel(userId, badge.skillId, levelNumber);
      alert(result.message);
      onRefresh && onRefresh();
    } catch (error) {
      console.error('Error completing level:', error);
    } finally {
      setIsCompletingLevel(false);
    }
  };

  const handleCompleteDrill = async (levelNumber, drillName) => {
    try {
      await skillBadgeService.completeDrill(userId, badge.skillId, levelNumber, drillName);
      onRefresh && onRefresh();
    } catch (error) {
      console.error('Error completing drill:', error);
    }
  };

  const canCompleteLevel = (levelData) => {
    return levelData?.drills?.every(d => d.completed);
  };

  return (
    <div className={styles.view}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.heading}>{badge.emoji} {badge.skillName}</h2>
          <p className={styles.subtitle}>Level Progression</p>
        </div>
        <button className={styles.closeButton} onClick={onClose}>&times;</button>
      </div>

      <div className={styles.levelsList}>
        {template?.levels?.map((templateLevel, idx) => {
          const badgeLevel = badge.levels?.[idx];
          const isCompleted = badgeLevel?.status === 'completed';
          const isInProgress = badgeLevel?.status === 'in-progress';
          const isLocked = badgeLevel?.status === 'locked';
          const isExpanded = expandedLevel === templateLevel.levelNumber;

          return (
            <div
              key={templateLevel.levelNumber}
              className={`${styles.levelCard} ${isCompleted ? styles.completed : ''} ${isInProgress ? styles.inProgress : ''} ${isLocked ? styles.locked : ''}`}
            >
              <div
                className={styles.levelHeader}
                onClick={() => !isLocked && setExpandedLevel(isExpanded ? null : templateLevel.levelNumber)}
              >
                <div className={styles.levelInfo}>
                  <span className={styles.levelStatus}>
                    {isCompleted && '✅'}
                    {isInProgress && '⏳'}
                    {isLocked && '🔒'}
                  </span>
                  <div>
                    <span className={styles.levelTitle}>
                      Level {templateLevel.levelNumber}: {templateLevel.name} {templateLevel.emoji}
                    </span>
                    <span className={styles.levelMeta}>
                      {isCompleted && badgeLevel?.completedDate && `Completed ${badgeLevel.completedDate}`}
                      {isInProgress && `In Progress • ${templateLevel.expectedTimeline}`}
                      {isLocked && 'Complete previous level to unlock'}
                    </span>
                  </div>
                </div>
                {!isLocked && (
                  <span className={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
                )}
              </div>

              {isExpanded && !isLocked && (
                <div className={styles.levelContent}>
                  <div className={styles.skillsRequired}>
                    <h4 className={styles.subheading}>Skills Required</h4>
                    <ul className={styles.skillsList}>
                      {templateLevel.skillsRequired?.map((skill, i) => (
                        <li key={i}>{skill}</li>
                      ))}
                    </ul>
                  </div>

                  <div className={styles.drillsSection}>
                    <h4 className={styles.subheading}>Drills</h4>
                    {templateLevel.drills?.map(drill => {
                      const badgeDrill = badgeLevel?.drills?.find(d => d.name === drill.name);
                      const isDrillCompleted = badgeDrill?.completed;

                      return (
                        <div key={drill.name} className={styles.drillCard}>
                          <div className={styles.drillHeader}>
                            <span className={styles.drillName}>
                              {isDrillCompleted ? '✅' : '⬜'} {drill.name}
                            </span>
                            <span className={styles.drillFreq}>{drill.frequency}</span>
                          </div>
                          <p className={styles.drillDesc}>{drill.description}</p>
                          {badgeDrill && (
                            <div className={styles.drillStats}>
                              <span>Practice count: {badgeDrill.practiceCount || 0}</span>
                              {!isDrillCompleted && isInProgress && (
                                <button
                                  className={styles.markCompleteBtn}
                                  onClick={() => handleCompleteDrill(templateLevel.levelNumber, drill.name)}
                                >
                                  Mark Complete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {templateLevel.tips && (
                    <div className={styles.tipsSection}>
                      <h4 className={styles.subheading}>Tips</h4>
                      <ul className={styles.tipsList}>
                        {templateLevel.tips.map((tip, i) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {isInProgress && canCompleteLevel(badgeLevel) && (
                    <button
                      className={styles.completeLevelBtn}
                      onClick={() => handleCompleteLevel(templateLevel.levelNumber)}
                      disabled={isCompletingLevel}
                    >
                      {isCompletingLevel ? 'Completing...' : `Complete Level ${templateLevel.levelNumber}`}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SkillLevelView;
