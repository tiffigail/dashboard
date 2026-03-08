import React, { useState } from 'react';
import styles from './MuscleProgramSelector.module.css';
import { MUSCLE_BUILDING_PROGRAMS } from '../../data/muscleBuildingPrograms';
import * as muscleBuildingService from '../../services/muscleBuildingService';

function MuscleProgramSelector({ userId, onSave, onBack }) {
  const [isCreating, setIsCreating] = useState(false);

  const handleSelect = async (program) => {
    if (!program.available) return;
    if (!userId) {
      alert("Not logged in.");
      return;
    }
    setIsCreating(true);
    try {
      await muscleBuildingService.startProgram(userId, program.id);
      onSave();
    } catch (error) {
      console.error("Error starting muscle program:", error);
      alert("Failed to start program. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className={styles.selector}>
      <h3 className={styles.heading}>Choose a Program</h3>
      <p className={styles.subtitle}>Progressive overload programs for targeted muscle growth</p>

      <div className={styles.grid}>
        {MUSCLE_BUILDING_PROGRAMS.map(program => (
          <div
            key={program.id}
            className={`${styles.card} ${!program.available ? styles.cardDisabled : ''}`}
            onClick={() => !isCreating && handleSelect(program)}
            style={{ opacity: isCreating ? 0.6 : 1 }}
          >
            <div className={styles.cardHeader}>
              <span className={styles.emoji}>{program.emoji}</span>
              {!program.available && (
                <span className={styles.comingSoon}>COMING SOON</span>
              )}
              {program.available && (
                <span className={styles.available}>AVAILABLE</span>
              )}
            </div>
            <h4 className={styles.cardTitle}>{program.title}</h4>
            <p className={styles.cardDesc}>{program.description}</p>
            <div className={styles.cardStats}>
              <span>{program.duration} weeks</span>
              <span>{program.sessionsPerWeek}x / week</span>
              <span>{program.exercises.length} exercises</span>
            </div>
            {program.available && (
              <div className={styles.exercisePreview}>
                {program.exercises.slice(0, 3).map(ex => (
                  <span key={ex.exerciseId} className={styles.exerciseChip}>
                    {ex.exerciseName}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <button onClick={onBack} className={styles.backButton}>Back</button>
      </div>
    </div>
  );
}

export default MuscleProgramSelector;
