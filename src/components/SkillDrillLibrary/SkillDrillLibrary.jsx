import React, { useState } from 'react';
import styles from './SkillDrillLibrary.module.css';
import { getSkillBadgeTemplateById } from '../../data/skillBadgeTemplates';

function SkillDrillLibrary({ badge, onClose }) {
  const template = getSkillBadgeTemplateById(badge.skillId);
  const [selectedLevel, setSelectedLevel] = useState(badge.currentLevel);
  const [expandedDrill, setExpandedDrill] = useState(null);

  const currentTemplateLevel = template?.levels?.find(l => l.levelNumber === selectedLevel);
  const badgeLevel = badge.levels?.find(l => l.levelNumber === selectedLevel);

  return (
    <div className={styles.library}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.heading}>{badge.emoji} Drill Library</h2>
          <p className={styles.subtitle}>{badge.skillName} Reference Guide</p>
        </div>
        <button className={styles.closeButton} onClick={onClose}>&times;</button>
      </div>

      <div className={styles.levelTabs}>
        {template?.levels?.map(level => {
          const isLocked = badge.levels?.find(l => l.levelNumber === level.levelNumber)?.status === 'locked';
          return (
            <button
              key={level.levelNumber}
              className={`${styles.levelTab} ${selectedLevel === level.levelNumber ? styles.activeTab : ''} ${isLocked ? styles.lockedTab : ''}`}
              onClick={() => !isLocked && setSelectedLevel(level.levelNumber)}
              disabled={isLocked}
            >
              {level.levelNumber}
            </button>
          );
        })}
      </div>

      {currentTemplateLevel && (
        <div className={styles.levelInfo}>
          <span className={styles.levelEmoji}>{currentTemplateLevel.emoji}</span>
          <span className={styles.levelName}>{currentTemplateLevel.name}</span>
        </div>
      )}

      <div className={styles.drillsList}>
        {currentTemplateLevel?.drills?.map(drill => {
          const badgeDrill = badgeLevel?.drills?.find(d => d.name === drill.name);
          const isExpanded = expandedDrill === drill.name;
          const isCompleted = badgeDrill?.completed;

          return (
            <div key={drill.name} className={styles.drillCard}>
              <div
                className={styles.drillHeader}
                onClick={() => setExpandedDrill(isExpanded ? null : drill.name)}
              >
                <div className={styles.drillTitleRow}>
                  <span className={styles.drillName}>
                    {isCompleted ? '✅' : '📖'} {drill.name}
                  </span>
                  {isCompleted && <span className={styles.completedBadge}>Completed</span>}
                </div>
                <span className={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
              </div>

              {isExpanded && (
                <div className={styles.drillContent}>
                  <p className={styles.drillDesc}>{drill.description}</p>

                  <div className={styles.drillMeta}>
                    <span className={styles.metaItem}>
                      <strong>Frequency:</strong> {drill.frequency}
                    </span>
                    {drill.trackingType && (
                      <span className={styles.metaItem}>
                        <strong>Tracking:</strong> {drill.trackingType}
                      </span>
                    )}
                  </div>

                  {drill.steps && drill.steps.length > 0 && (
                    <div className={styles.stepsSection}>
                      <h4 className={styles.sectionTitle}>Step-by-Step</h4>
                      <ol className={styles.stepsList}>
                        {drill.steps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {drill.formCues && drill.formCues.length > 0 && (
                    <div className={styles.cuesSection}>
                      <h4 className={styles.sectionTitle}>Form Cues</h4>
                      <ul className={styles.cuesList}>
                        {drill.formCues.map((cue, i) => (
                          <li key={i}>{cue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {drill.progression && typeof drill.progression === 'object' && (
                    <div className={styles.progressionSection}>
                      <h4 className={styles.sectionTitle}>Progression</h4>
                      <div className={styles.progressionGrid}>
                        {Object.entries(drill.progression).map(([key, value]) => (
                          <div key={key} className={styles.progressionItem}>
                            <span className={styles.progressionKey}>{key.replace(/_/g, ' ')}</span>
                            <span className={styles.progressionValue}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {badgeDrill && (
                    <div className={styles.practiceStats}>
                      <span>Practice count: <strong>{badgeDrill.practiceCount || 0}</strong></span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {currentTemplateLevel?.tips && (
        <div className={styles.tipsBox}>
          <h4 className={styles.tipsTitle}>Level {selectedLevel} Tips</h4>
          <ul className={styles.tipsList}>
            {currentTemplateLevel.tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default SkillDrillLibrary;
