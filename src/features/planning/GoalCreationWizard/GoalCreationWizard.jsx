import React, { useState } from 'react';
import styles from '@/features/planning/GoalCreationWizard/GoalCreationWizard.module.css';
import * as physicalGoalsService from '@/services/physicalGoalsService';
import EnduranceGoalSelector from '@/features/physical/EnduranceGoalSelector/EnduranceGoalSelector';
import MuscleProgramSelector from '@/features/physical/MuscleProgramSelector/MuscleProgramSelector';
import StrengthProgramSelector from '@/features/physical/StrengthProgramSelector/StrengthProgramSelector';
import SkillBadgeSelector from '@/features/gear/SkillBadgeSelector/SkillBadgeSelector';

const CATEGORIES = [
  { id: 'muscleBuilding', label: 'Muscle Building', emoji: 'Muscle Building', examples: ['Bigger Calves', 'Bigger Arms', 'Bigger Forearms'] },
  { id: 'strength', label: 'Strength', emoji: 'Strength', examples: ['Bench 225lbs', 'Squat 315lbs'] },
  { id: 'skill', label: 'Skills', emoji: 'Skills', examples: ['10 Pull-ups', 'Handstand', 'Moonwalk'] },
  { id: 'endurance', label: 'Endurance', emoji: 'Endurance', examples: ['Run 5K', 'Jump Rope 1000x'] }
];

function GoalCreationWizard({ userId, onClose, onSave }) {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('');
  const [description, setDescription] = useState('');
  const [metric, setMetric] = useState('');
  const [startValue, setStartValue] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [unit, setUnit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCategorySelect = (cat) => {
    setCategory(cat.id);
    setEmoji(cat.emoji);
    setStep(2);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const goalData = {
        title,
        emoji,
        category,
        description,
        target: {
          metric,
          startValue: parseFloat(startValue),
          targetValue: parseFloat(targetValue),
          currentValue: parseFloat(startValue),
          unit
        },
        relatedExercises: []
      };

      await physicalGoalsService.createFitnessGoal(userId, goalData);
      onSave();
    } catch (error) {
      console.error("Error creating goal:", error);
      alert("Failed to create goal. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
      <div className={styles.wizard}>
        <h2 className={styles.title}>Create Fitness Goal</h2>

        <div className={styles.progress}>
          <div className={`${styles.progressStep} ${step >= 1 ? styles.active : ''}`}>1</div>
          <div className={styles.progressLine} />
          <div className={`${styles.progressStep} ${step >= 2 ? styles.active : ''}`}>2</div>
          <div className={styles.progressLine} />
          <div className={`${styles.progressStep} ${step >= 3 ? styles.active : ''}`}>3</div>
        </div>

        {step === 1 && (
          <div className={styles.step}>
            <h3>Choose a Category</h3>
            <div className={styles.categoryGrid}>
              {CATEGORIES.map(cat => (
                <div
                  key={cat.id}
                  className={styles.categoryCard}
                  onClick={() => handleCategorySelect(cat)}
                >
                  <h4>{cat.label}</h4>
                  <ul className={styles.examples}>
                    {cat.examples.map((ex, i) => (
                      <li key={i}>{ex}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && category === 'endurance' && (
          <EnduranceGoalSelector userId={userId} onSave={onSave} onBack={() => setStep(1)} />
        )}

        {step === 2 && category === 'muscleBuilding' && (
          <MuscleProgramSelector userId={userId} onSave={onSave} onBack={() => setStep(1)} />
        )}

        {step === 2 && category === 'strength' && (
          <StrengthProgramSelector userId={userId} onSave={onSave} onBack={() => setStep(1)} />
        )}

        {step === 2 && category === 'skill' && (
          <SkillBadgeSelector userId={userId} onClose={() => setStep(1)} onSave={onSave} />
        )}

        {step === 2 && category !== 'endurance' && category !== 'muscleBuilding' && category !== 'strength' && category !== 'skill' && (
          <div className={styles.step}>
            <h3>Goal Details</h3>
            <div className={styles.formGroup}>
              <label>Goal Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Bigger Calves"
                className={styles.input}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Increase calf circumference by 1.5cm"
                className={styles.textarea}
                rows="3"
              />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Emoji</label>
                <input
                  type="text"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  placeholder="e.g., a leg emoji"
                  className={styles.emojiInput}
                  maxLength="4"
                />
              </div>
            </div>
            <div className={styles.actions}>
              <button onClick={() => setStep(1)} className={styles.backButton}>
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className={styles.nextButton}
                disabled={!title}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className={styles.step}>
            <h3>Set Your Target</h3>
            <div className={styles.formGroup}>
              <label>What are you measuring? *</label>
              <input
                type="text"
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                placeholder="e.g., calfCircumference, pullupCount"
                className={styles.input}
                required
              />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Starting Value *</label>
                <input
                  type="number"
                  value={startValue}
                  onChange={(e) => setStartValue(e.target.value)}
                  placeholder="14.0"
                  step="0.1"
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Target Value *</label>
                <input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder="15.5"
                  step="0.1"
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Unit *</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="cm, inches, reps"
                  className={styles.input}
                  required
                />
              </div>
            </div>
            {startValue && targetValue && (
              <div className={styles.summary}>
                <p>
                  <strong>Goal:</strong> {startValue} {unit} &rarr; {targetValue} {unit}
                  <br />
                  <strong>Change:</strong> +{(parseFloat(targetValue) - parseFloat(startValue)).toFixed(1)} {unit}
                </p>
              </div>
            )}
            <div className={styles.actions}>
              <button onClick={() => setStep(2)} className={styles.backButton}>
                Back
              </button>
              <button
                onClick={handleSubmit}
                className={styles.createButton}
                disabled={isSubmitting || !startValue || !targetValue || !unit}
              >
                {isSubmitting ? 'Creating...' : 'Create Goal'}
              </button>
            </div>
          </div>
        )}
      </div>
  );
}

export default GoalCreationWizard;
