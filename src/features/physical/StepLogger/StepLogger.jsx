import React, { useState } from 'react';
import styles from '@/features/physical/StepLogger/StepLogger.module.css';
import * as enduranceGoalsService from '@/services/enduranceGoalsService';
import { stepsToMiles } from '@/data/enduranceJourneys';

function StepLogger({ goal, userId, onClose, onSave }) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [steps, setSteps] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculatedMiles = steps ? stepsToMiles(Number(steps)).toFixed(2) : '0.00';

  const handleSubmit = async () => {
    if (!steps || Number(steps) <= 0) return;
    setIsSubmitting(true);
    try {
      const result = await enduranceGoalsService.logDailySteps(goal.id, userId, date, Number(steps));
      if (result?.newMilestones?.length > 0) {
        alert(`Milestone reached: ${result.newMilestones.map(m => `${m.emoji} ${m.location}`).join(', ')}`);
      }
      onSave();
    } catch (error) {
      console.error("Error logging steps:", error);
      alert("Failed to log steps. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.logger}>
      <h2 className={styles.title}>Log Steps</h2>
      <p className={styles.subtitle}>{goal.emoji} {goal.title}</p>

      <div className={styles.formGroup}>
        <label>Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className={styles.input} />
      </div>

      <div className={styles.formGroup}>
        <label>Step Count</label>
        <input
          type="number"
          value={steps}
          onChange={e => setSteps(e.target.value)}
          placeholder="e.g., 10000"
          className={styles.input}
          min="0"
        />
      </div>

      <div className={styles.preview}>
        <span className={styles.previewLabel}>Distance:</span>
        <span className={styles.previewValue}>{calculatedMiles} miles</span>
      </div>

      <div className={styles.actions}>
        <button onClick={onClose} className={styles.cancelButton}>Cancel</button>
        <button
          onClick={handleSubmit}
          className={styles.submitButton}
          disabled={isSubmitting || !steps || Number(steps) <= 0}
        >
          {isSubmitting ? 'Saving...' : 'Log Steps'}
        </button>
      </div>
    </div>
  );
}

export default StepLogger;
