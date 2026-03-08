import React, { useState } from 'react';
import styles from './SkillBadgeSelector.module.css';
import { SKILL_BADGE_TEMPLATES } from '../../data/skillBadgeTemplates';
import * as skillBadgeService from '../../services/skillBadgeService';

function SkillBadgeSelector({ userId, onClose, onSave }) {
  const [isSaving, setIsSaving] = useState(false);

  const handleStartBadge = async (templateId) => {
    setIsSaving(true);
    try {
      await skillBadgeService.startSkillBadge(userId, templateId);
      onSave && onSave();
    } catch (error) {
      console.error('Error starting skill badge:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.selector}>
      <h2 className={styles.heading}>Choose a Skill Badge</h2>
      <p className={styles.subtitle}>Master a new physical skill through progressive training</p>

      <div className={styles.grid}>
        {SKILL_BADGE_TEMPLATES.map(template => (
          <div key={template.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.emoji}>{template.emoji}</span>
              <span className={styles.badge}>{template.difficulty}</span>
            </div>
            <h3 className={styles.cardTitle}>{template.title}</h3>
            <p className={styles.cardDesc}>{template.description}</p>
            <div className={styles.cardStats}>
              <span>{template.totalLevels} Levels</span>
              <span>{template.subcategory}</span>
            </div>
            <div className={styles.levelPreview}>
              <span className={styles.levelPreviewLabel}>Levels:</span>
              <div className={styles.levelDots}>
                {template.levels.slice(0, 5).map((level, idx) => (
                  <span key={idx} className={styles.levelDot} title={level.name}>
                    {level.emoji}
                  </span>
                ))}
                {template.levels.length > 5 && (
                  <span className={styles.moreLevels}>+{template.levels.length - 5}</span>
                )}
              </div>
            </div>
            <button
              className={styles.startButton}
              onClick={() => handleStartBadge(template.id)}
              disabled={isSaving}
            >
              {isSaving ? 'Starting...' : 'Start This Badge'}
            </button>
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <button className={styles.backButton} onClick={onClose}>
          Back
        </button>
      </div>
    </div>
  );
}

export default SkillBadgeSelector;
