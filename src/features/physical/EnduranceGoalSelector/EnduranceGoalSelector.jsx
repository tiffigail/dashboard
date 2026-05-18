import React, { useState } from 'react';
import styles from '@/features/physical/EnduranceGoalSelector/EnduranceGoalSelector.module.css';
import { ENDURANCE_JOURNEYS } from '@/data/enduranceJourneys';
import * as enduranceGoalsService from '@/services/enduranceGoalsService';

function EnduranceGoalSelector({ userId, onSave, onBack }) {
  const [isCreating, setIsCreating] = useState(false);

  const handleSelect = async (journey) => {
    if (!userId) {
      alert("Not logged in. Cannot create goal.");
      return;
    }
    setIsCreating(true);
    try {
      await enduranceGoalsService.createEnduranceGoal(userId, journey.id);
      onSave();
    } catch (error) {
      console.error("Error creating endurance goal:", error);
      alert("Failed to create goal. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const getDifficultyColor = (level) => {
    switch (level) {
      case 'beginner': return '#43e97b';
      case 'intermediate': return '#667eea';
      case 'advanced': return '#f093fb';
      case 'legendary': return '#f5576c';
      default: return '#667eea';
    }
  };

  return (
    <div className={styles.selector}>
      <h3 className={styles.heading}>Choose Your Journey</h3>
      <p className={styles.subtitle}>Pick a preset adventure and track your progress with daily steps</p>

      <div className={styles.grid}>
        {ENDURANCE_JOURNEYS.map(journey => (
          <div
            key={journey.id}
            className={styles.card}
            onClick={() => !isCreating && handleSelect(journey)}
            style={{ opacity: isCreating ? 0.6 : 1 }}
          >
            <div className={styles.cardHeader}>
              <span className={styles.emoji}>{journey.emoji}</span>
              <span
                className={styles.difficulty}
                style={{ background: getDifficultyColor(journey.difficultyLevel) }}
              >
                {journey.difficultyLevel}
              </span>
            </div>
            <h4 className={styles.cardTitle}>{journey.title}</h4>
            <p className={styles.cardDesc}>{journey.description}</p>
            <div className={styles.cardStats}>
              {journey.type === 'distance' ? (
                <>
                  <span>{journey.totalDistance.toLocaleString()} miles</span>
                  <span>~{Math.round(journey.estimatedWeeks / 4)} months</span>
                </>
              ) : (
                <>
                  <span>{journey.requiredSessions} sessions</span>
                  <span>Achievement</span>
                </>
              )}
            </div>
            <div className={styles.milestonePreview}>
              {(journey.milestones || []).slice(0, 3).map((ms, i) => (
                <span key={i} className={styles.milestoneChip}>
                  {ms.emoji} {ms.location || ms.name}
                </span>
              ))}
              {journey.milestones.length > 3 && (
                <span className={styles.milestoneMore}>+{journey.milestones.length - 3} more</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <button onClick={onBack} className={styles.backButton}>Back</button>
      </div>
    </div>
  );
}

export default EnduranceGoalSelector;
