import React, { useState } from 'react';
import styles from '@/features/physical/StrengthProgramSelector/StrengthProgramSelector.module.css';
import { STRENGTH_PROGRAMS } from '@/data/strengthPrograms';
import * as muscleBuildingService from '@/services/muscleBuildingService';

function StrengthProgramSelector({ userId, onSave, onBack }) {
  const [isCreating, setIsCreating] = useState(false);
  const program = STRENGTH_PROGRAMS[0];

  const handleStart = async () => {
    if (!userId) { alert("Not logged in."); return; }
    setIsCreating(true);
    try {
      await muscleBuildingService.startProgram(userId, program.id);
      onSave();
    } catch (error) {
      console.error("Error starting strength program:", error);
      alert("Failed to start program.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className={styles.selector}>
      <h3 className={styles.heading}>Strength Training</h3>
      <p className={styles.subtitle}>Heavy weights, low reps, maximum strength gains</p>

      <div className={styles.card} style={{ opacity: isCreating ? 0.6 : 1 }}>
        <div className={styles.cardHeader}>
          <span className={styles.emoji}>{program.emoji}</span>
          <span className={styles.badge}>5×5</span>
        </div>
        <h4 className={styles.cardTitle}>{program.title}</h4>
        <p className={styles.cardDesc}>{program.description}</p>

        <div className={styles.cardStats}>
          <span>{program.duration} weeks</span>
          <span>{program.sessionsPerWeek}x / week</span>
          <span>{program.exercises.length} lifts</span>
        </div>

        <div className={styles.schedule}>
          <h5 className={styles.scheduleTitle}>Weekly Schedule</h5>
          {Object.values(program.weeklySchedule).map((session, i) => (
            <div key={i} className={styles.sessionRow}>
              <span className={styles.sessionName}>{session.name}</span>
              <span className={styles.sessionExercises}>
                {session.exercises.map(exId => {
                  const ex = program.exercises.find(e => e.exerciseId === exId);
                  return ex?.exerciseName.split('(')[0].trim();
                }).join(' • ')}
              </span>
            </div>
          ))}
        </div>

        <div className={styles.rules}>
          <h5 className={styles.rulesTitle}>Key Rules</h5>
          {program.criticalRules.slice(0, 3).map((rule, i) => (
            <p key={i} className={styles.rule}>{rule}</p>
          ))}
        </div>

        <button
          onClick={handleStart}
          className={styles.startButton}
          disabled={isCreating}
        >
          {isCreating ? 'Starting...' : 'Start 5×5 Program'}
        </button>
      </div>

      <div className={styles.actions}>
        <button onClick={onBack} className={styles.backButton}>Back</button>
      </div>
    </div>
  );
}

export default StrengthProgramSelector;
