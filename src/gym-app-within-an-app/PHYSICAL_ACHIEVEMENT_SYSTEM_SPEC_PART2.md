# PHYSICAL ACHIEVEMENT SYSTEM - PART 2: REMAINING COMPONENTS & INTEGRATION

## 🎨 COMPONENT 3: QuickWorkoutLogger.jsx

**Location:** `src/components/QuickWorkoutLogger/QuickWorkoutLogger.jsx`

**Purpose:** Modal for quickly logging workouts with exercises, sets, reps, and weight

**Props:**
```typescript
{
  userId: string,
  goals: array, // Active goals from parent
  onClose: function,
  onSave: function
}
```

**Component Structure:**
```jsx
import React, { useState } from 'react';
import styles from './QuickWorkoutLogger.module.css';
import Modal from '../Modal/Modal';
import * as physicalGoalsService from '../../services/physicalGoalsService';

function QuickWorkoutLogger({ userId, goals, onClose, onSave }) {
  const [workoutName, setWorkoutName] = useState('');
  const [exercises, setExercises] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const addExercise = () => {
    setExercises([
      ...exercises,
      {
        exerciseName: '',
        sets: [{ reps: 0, weight: 0 }],
        relatedGoals: []
      }
    ]);
  };
  
  const removeExercise = (index) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };
  
  const updateExercise = (index, field, value) => {
    const updated = [...exercises];
    updated[index][field] = value;
    setExercises(updated);
  };
  
  const addSet = (exerciseIndex) => {
    const updated = [...exercises];
    updated[exerciseIndex].sets.push({ reps: 0, weight: 0 });
    setExercises(updated);
  };
  
  const updateSet = (exerciseIndex, setIndex, field, value) => {
    const updated = [...exercises];
    updated[exerciseIndex].sets[setIndex][field] = Number(value);
    setExercises(updated);
  };
  
  const calculateExerciseVolume = (sets) => {
    return sets.reduce((sum, set) => sum + (set.reps * set.weight), 0);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const date = physicalGoalsService.getTodayDateString();
      
      const processedExercises = exercises.map(ex => ({
        exerciseName: ex.exerciseName,
        sets: ex.sets,
        totalVolume: calculateExerciseVolume(ex.sets),
        relatedGoals: ex.relatedGoals,
        isPR: false // TODO: Check against previous workouts
      }));
      
      await physicalGoalsService.createWorkoutLog(userId, {
        date,
        workoutName: workoutName || 'Workout',
        exercises: processedExercises,
        duration: 0, // TODO: Track actual duration
        mood: '',
        difficulty: 5
      });
      
      onSave();
    } catch (error) {
      console.error("Error logging workout:", error);
      alert("Failed to log workout. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose}>
      <div className={styles.logger}>
        <h2 className={styles.title}>🏋️ Log Workout</h2>
        
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Workout Name</label>
            <input
              type="text"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              placeholder="e.g., Leg Day, Upper Body"
              className={styles.input}
            />
          </div>
          
          <div className={styles.exercises}>
            <div className={styles.exercisesHeader}>
              <h3>Exercises</h3>
              <button 
                type="button"
                onClick={addExercise}
                className={styles.addButton}
              >
                + Add Exercise
              </button>
            </div>
            
            {exercises.length === 0 ? (
              <p className={styles.emptyState}>No exercises yet. Click "Add Exercise" to start!</p>
            ) : (
              exercises.map((exercise, exIndex) => (
                <div key={exIndex} className={styles.exerciseCard}>
                  <div className={styles.exerciseHeader}>
                    <input
                      type="text"
                      value={exercise.exerciseName}
                      onChange={(e) => updateExercise(exIndex, 'exerciseName', e.target.value)}
                      placeholder="Exercise name (e.g., Seated Calf Raises)"
                      className={styles.input}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => removeExercise(exIndex)}
                      className={styles.removeButton}
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className={styles.sets}>
                    {exercise.sets.map((set, setIndex) => (
                      <div key={setIndex} className={styles.setRow}>
                        <span className={styles.setNumber}>Set {setIndex + 1}</span>
                        <input
                          type="number"
                          value={set.weight}
                          onChange={(e) => updateSet(exIndex, setIndex, 'weight', e.target.value)}
                          placeholder="Weight (lbs)"
                          className={styles.smallInput}
                          required
                        />
                        <span>×</span>
                        <input
                          type="number"
                          value={set.reps}
                          onChange={(e) => updateSet(exIndex, setIndex, 'reps', e.target.value)}
                          placeholder="Reps"
                          className={styles.smallInput}
                          required
                        />
                        <span className={styles.volume}>
                          = {(set.weight * set.reps).toLocaleString()} lbs
                        </span>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addSet(exIndex)}
                      className={styles.addSetButton}
                    >
                      + Add Set
                    </button>
                  </div>
                  
                  <div className={styles.exerciseTotal}>
                    Total Volume: <strong>{calculateExerciseVolume(exercise.sets).toLocaleString()} lbs</strong>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className={styles.actions}>
            <button 
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className={styles.saveButton}
              disabled={isSubmitting || exercises.length === 0}
            >
              {isSubmitting ? 'Saving...' : 'Save Workout'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export default QuickWorkoutLogger;
```

**CSS Module:** `src/components/QuickWorkoutLogger/QuickWorkoutLogger.module.css`

```css
.logger {
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 700px;
  max-height: 80vh;
  overflow-y: auto;
}

.title {
  margin: 0 0 24px 0;
  font-size: 24px;
  font-weight: 700;
  color: #333;
}

.formGroup {
  margin-bottom: 20px;
}

.formGroup label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #555;
  margin-bottom: 8px;
}

.input {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.input:focus {
  outline: none;
  border-color: #667eea;
}

.exercises {
  margin-bottom: 20px;
}

.exercisesHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.exercisesHeader h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.addButton {
  padding: 8px 16px;
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.emptyState {
  text-align: center;
  padding: 40px;
  color: #666;
  background: #f8f9fa;
  border-radius: 8px;
}

.exerciseCard {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  border-left: 4px solid #667eea;
}

.exerciseHeader {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.removeButton {
  padding: 8px 12px;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
}

.sets {
  margin-bottom: 12px;
}

.setRow {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.setNumber {
  font-size: 14px;
  font-weight: 600;
  color: #555;
  min-width: 50px;
}

.smallInput {
  width: 100px;
  padding: 8px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
}

.smallInput:focus {
  outline: none;
  border-color: #667eea;
}

.volume {
  font-size: 14px;
  color: #666;
  margin-left: auto;
}

.addSetButton {
  padding: 6px 12px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.exerciseTotal {
  padding-top: 12px;
  border-top: 1px solid #e0e0e0;
  text-align: right;
  font-size: 14px;
  color: #555;
}

.exerciseTotal strong {
  color: #667eea;
  font-size: 16px;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.cancelButton,
.saveButton {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.cancelButton {
  background: #e0e0e0;
  color: #555;
}

.saveButton {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.saveButton:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

---

## 🎨 COMPONENT 4: PeriodInsightsWidget.jsx

**Location:** `src/components/PeriodInsightsWidget/PeriodInsightsWidget.jsx`

**Purpose:** Display period cycle info and correlations with productivity/mood

**Props:**
```typescript
{
  userId: string
}
```

**Component Structure:**
```jsx
import React, { useState, useEffect } from 'react';
import styles from './PeriodInsightsWidget.module.css';
import * as physicalGoalsService from '../../services/physicalGoalsService';

function PeriodInsightsWidget({ userId }) {
  const [currentCycle, setCurrentCycle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetchCycleData();
  }, [userId]);

  const fetchCycleData = async () => {
    setIsLoading(true);
    try {
      const cycle = await physicalGoalsService.getCurrentPeriodCycle(userId);
      setCurrentCycle(cycle);
    } catch (error) {
      console.error("Error fetching period cycle:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading period data...</div>;
  }

  if (!currentCycle) {
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🩸 Period Insights</h2>
        <p className={styles.emptyState}>
          No period tracking data yet. Start tracking your cycle in the PM Routine!
        </p>
      </section>
    );
  }

  const getPhaseEmoji = (phase) => {
    switch (phase) {
      case 'menstrual': return '🩸';
      case 'follicular': return '💪';
      case 'ovulation': return '✨';
      case 'luteal': return '🌙';
      default: return '📅';
    }
  };

  const daysUntilNext = Math.ceil(
    (new Date(currentCycle.predictions.nextPeriodStart) - new Date()) / (1000 * 60 * 60 * 24)
  );

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>🩸 Period Insights</h2>
      
      <div className={styles.cycleInfo}>
        <div className={styles.currentStatus}>
          <span className={styles.phaseEmoji}>
            {getPhaseEmoji(currentCycle.currentPhase)}
          </span>
          <div>
            <h3>Day {currentCycle.currentDay} of {currentCycle.cycleLengthDays}</h3>
            <p>{currentCycle.currentPhase.charAt(0).toUpperCase() + currentCycle.currentPhase.slice(1)} Phase</p>
          </div>
        </div>
        
        <div className={styles.predictions}>
          <div className={styles.prediction}>
            <span className={styles.predictionLabel}>Next Period:</span>
            <span className={styles.predictionValue}>
              {currentCycle.predictions.nextPeriodStart} ({daysUntilNext} days)
            </span>
          </div>
          <div className={styles.prediction}>
            <span className={styles.predictionLabel}>Ovulation:</span>
            <span className={styles.predictionValue}>
              {currentCycle.predictions.nextOvulation}
            </span>
          </div>
        </div>
      </div>
      
      {currentCycle.insights && (
        <div className={styles.insights}>
          <h4>📊 Your Patterns</h4>
          <div className={styles.insightsList}>
            <div className={styles.insight}>
              <span className={styles.insightIcon}>💪</span>
              <div>
                <strong>Strongest Phase:</strong> Follicular
                <p className={styles.insightDetail}>
                  Your strength is {Math.round(currentCycle.insights.averageStrength.follicular * 100)}% of baseline
                </p>
              </div>
            </div>
            
            <div className={styles.insight}>
              <span className={styles.insightIcon}>📈</span>
              <div>
                <strong>Peak Productivity:</strong> Days {currentCycle.insights.bestWorkoutDays[0]}-{currentCycle.insights.bestWorkoutDays[currentCycle.insights.bestWorkoutDays.length - 1]}
                <p className={styles.insightDetail}>
                  Average productivity score: {currentCycle.insights.averageProductivity.follicular}
                </p>
              </div>
            </div>
            
            {currentCycle.insights.restRecommendedDays.length > 0 && (
              <div className={styles.insight}>
                <span className={styles.insightIcon}>😴</span>
                <div>
                  <strong>Rest Days:</strong> Days {currentCycle.insights.restRecommendedDays.join(', ')}
                  <p className={styles.insightDetail}>
                    Lower energy during menstrual phase - prioritize recovery
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default PeriodInsightsWidget;
```

**CSS Module:** `src/components/PeriodInsightsWidget/PeriodInsightsWidget.module.css`

```css
.section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.sectionTitle {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid #e0e0e0;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #666;
}

.emptyState {
  text-align: center;
  padding: 20px;
  color: #666;
}

.cycleInfo {
  background: linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.currentStatus {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.phaseEmoji {
  font-size: 48px;
}

.currentStatus h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.currentStatus p {
  margin: 4px 0 0 0;
  font-size: 14px;
  color: #555;
}

.predictions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prediction {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.predictionLabel {
  color: #555;
  font-weight: 600;
}

.predictionValue {
  color: #333;
}

.insights {
  margin-top: 20px;
}

.insights h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #333;
}

.insightsList {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.insight {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.insightIcon {
  font-size: 24px;
}

.insight strong {
  display: block;
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.insightDetail {
  margin: 0;
  font-size: 13px;
  color: #666;
}
```

---

## 🎨 COMPONENT 5: GoalCreationWizard.jsx

**Location:** `src/components/GoalCreationWizard/GoalCreationWizard.jsx`

**Purpose:** Wizard-style modal for creating new fitness goals

**Props:**
```typescript
{
  userId: string,
  onClose: function,
  onSave: function
}
```

**Component Structure:**
```jsx
import React, { useState } from 'react';
import styles from './GoalCreationWizard.module.css';
import Modal from '../Modal/Modal';
import * as physicalGoalsService from '../../services/physicalGoalsService';

const CATEGORIES = [
  { id: 'muscleSize', label: 'Muscle Size', emoji: '💪', examples: ['Bigger Calves', 'Defined Abs', 'Bigger Arms'] },
  { id: 'strength', label: 'Strength', emoji: '🏋️', examples: ['Bench 225lbs', 'Squat 315lbs'] },
  { id: 'skill', label: 'Skills', emoji: '🎯', examples: ['10 Pull-ups', 'Handstand', 'Moonwalk'] },
  { id: 'endurance', label: 'Endurance', emoji: '🏃', examples: ['Run 5K', 'Jump Rope 1000x'] }
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
    <Modal isOpen={true} onClose={onClose}>
      <div className={styles.wizard}>
        <h2 className={styles.title}>🎯 Create Fitness Goal</h2>
        
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
                  <span className={styles.categoryEmoji}>{cat.emoji}</span>
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
        
        {step === 2 && (
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
                  placeholder="🦵"
                  className={styles.emojiInput}
                  maxLength="2"
                />
              </div>
            </div>
            <div className={styles.actions}>
              <button onClick={() => setStep(1)} className={styles.backButton}>
                ← Back
              </button>
              <button 
                onClick={() => setStep(3)} 
                className={styles.nextButton}
                disabled={!title}
              >
                Next →
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
            <div className={styles.summary}>
              <p>
                <strong>Goal:</strong> {startValue} {unit} → {targetValue} {unit}
                <br />
                <strong>Change:</strong> +{(parseFloat(targetValue) - parseFloat(startValue)).toFixed(1)} {unit}
              </p>
            </div>
            <div className={styles.actions}>
              <button onClick={() => setStep(2)} className={styles.backButton}>
                ← Back
              </button>
              <button 
                onClick={handleSubmit} 
                className={styles.createButton}
                disabled={isSubmitting || !startValue || !targetValue || !unit}
              >
                {isSubmitting ? 'Creating...' : 'Create Goal 🎯'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default GoalCreationWizard;
```

**CSS Module:** `src/components/GoalCreationWizard/GoalCreationWizard.module.css`

```css
.wizard {
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.title {
  margin: 0 0 24px 0;
  font-size: 24px;
  font-weight: 700;
  color: #333;
  text-align: center;
}

.progress {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
}

.progressStep {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #999;
  transition: all 0.3s ease;
}

.progressStep.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.progressLine {
  width: 80px;
  height: 2px;
  background: #e0e0e0;
}

.step {
  padding: 20px 0;
}

.step h3 {
  margin: 0 0 20px 0;
  font-size: 20px;
  color: #333;
  text-align: center;
}

.categoryGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.categoryCard {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: 2px solid transparent;
}

.categoryCard:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #667eea;
}

.categoryEmoji {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.categoryCard h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #333;
}

.examples {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 12px;
  color: #666;
}

.examples li {
  margin-bottom: 4px;
}

.formGroup {
  margin-bottom: 16px;
}

.formGroup label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #555;
  margin-bottom: 8px;
}

.input,
.textarea {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.input:focus,
.textarea:focus {
  outline: none;
  border-color: #667eea;
}

.emojiInput {
  width: 80px;
  text-align: center;
  font-size: 24px;
}

.formRow {
  display: flex;
  gap: 12px;
}

.formRow .formGroup {
  flex: 1;
}

.summary {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.summary p {
  margin: 0;
  font-size: 14px;
  color: #555;
  line-height: 1.6;
}

.summary strong {
  color: #333;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.backButton,
.nextButton,
.createButton {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.backButton {
  background: #e0e0e0;
  color: #555;
}

.nextButton {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.createButton {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: white;
}

.nextButton:disabled,
.createButton:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

---

## 🔗 PART 4: INTEGRATION INSTRUCTIONS

### STEP 1: Add to NowView Left Panel

**File:** `src/components/NowView/NowView.jsx` (or wherever your left panel is)

**Find the navigation section and add:**
```jsx
<button 
  onClick={() => {
    // Navigate to PhysicalDashboard
    // Use your existing navigation pattern here
    setActiveView('physicalDashboard'); // or however you handle navigation
  }}
  className={styles.navButton}
>
  💪 Physical Dashboard
</button>
```

---

### STEP 2: Add to PmRoutineForm

**File:** `src/components/PmRoutineForm/PmRoutineForm.jsx`

**Add state at the top:**
```jsx
const [isPhysicalDashboardOpen, setIsPhysicalDashboardOpen] = useState(false);
```

**Add import:**
```jsx
import PhysicalDashboard from '../PhysicalDashboard/PhysicalDashboard';
import Modal from '../Modal/Modal';
```

**Add button before the submit button:**
```jsx
<button 
  type="button"
  className={styles.chartButton}
  onClick={() => setIsPhysicalDashboardOpen(true)}
>
  💪 View Physical Progress
</button>
```

**Add modal at the end:**
```jsx
{isPhysicalDashboardOpen && (
  <Modal 
    isOpen={isPhysicalDashboardOpen}
    onClose={() => setIsPhysicalDashboardOpen(false)}
  >
    <PhysicalDashboard />
  </Modal>
)}
```

---

### STEP 3: Add to AmRoutineForm

**File:** `src/components/AmRoutineForm/AmRoutineForm.jsx`

**Same as PmRoutineForm - add the same state, import, button, and modal**

---

## ✅ TESTING CHECKLIST

After implementation, verify:

- [ ] PhysicalDashboard loads without errors
- [ ] Can create a new fitness goal via wizard
- [ ] Goal appears in active goals list
- [ ] Can log a workout via QuickWorkoutLogger
- [ ] Workout appears in recent workouts
- [ ] Goal workout count increments
- [ ] Period insights widget displays (if data exists)
- [ ] Can access dashboard from NowView
- [ ] Can access dashboard from AM Routine
- [ ] Can access dashboard from PM Routine
- [ ] All Firestore writes use serverTimestamp()
- [ ] All field names match existing patterns
- [ ] Service functions return { id, ...data } format

---

## 🚀 PHASE 2 FEATURES (Future)

After Phase 1 is working, add:
- Body measurements logger
- A1C test tracker
- Progress photos
- Exercise library with videos
- PR detection and celebration
- Correlation insights
- Goal recommendations based on progress

---

## 📝 NOTES FOR CLAUDE CODE

**Remember to:**
1. Match existing Firestore patterns exactly
2. Use camelCase for all field names
3. Use serverTimestamp() for all timestamps
4. Use YYYY-MM-DD format for date strings
5. Return { id: doc.id, ...doc.data() } from service functions
6. Follow existing Modal component pattern
7. Match existing CSS module conventions
8. Test thoroughly before marking complete

**Good luck building! 🎯**
