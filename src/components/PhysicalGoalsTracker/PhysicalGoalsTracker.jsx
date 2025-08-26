// src/components/PhysicalGoalsTracker/PhysicalGoalsTracker.jsx
import React, { useState, useEffect } from 'react';
import styles from './PhysicalGoalsTracker.module.css';

// Meal names for easy mapping
const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

// Props: onDataChange, initialData, disabled
function PhysicalGoalsTracker({ onDataChange, initialData, disabled }) {
  // State for steps remains the same
  const [steps, setSteps] = useState(initialData.steps || '');

  // NEW: State for water is now a count from 0-3
  const [waterCount, setWaterCount] = useState(initialData.waterCount || 0);

  // NEW: State for meals is now an object of booleans
  const [meals, setMeals] = useState(
    initialData.meals || {
      Breakfast: false,
      Lunch: false,
      Dinner: false,
      Snacks: false,
    }
  );
  
  // State for the gym checkbox
  const [wentToGym, setWentToGym] = useState(initialData.wentToGym || false);

  // This effect reports all data changes back to the parent component
  useEffect(() => {
    onDataChange({
      steps,
      waterCount,
      meals,
      wentToGym,
    });
  }, [steps, waterCount, meals, wentToGym, onDataChange]);

  // NEW: Handler for water drop clicks
  const handleWaterClick = (count) => {
    setWaterCount(count === waterCount ? count - 1 : count);
  };

  // NEW: Handler for meal checkbox changes
  const handleMealChange = (event) => {
    const { name, checked } = event.target;
    setMeals((prevMeals) => ({
      ...prevMeals,
      [name]: checked,
    }));
  };

  return (
    <div className={styles.container}>
      <h4 className={styles.sectionTitle}>Physical Goals Tracker</h4>

      {/* Steps Input */}
      <div className={styles.inputGroup}>
        <label htmlFor="steps">Steps Today:</label>
        <input
          type="number"
          id="steps"
          name="steps"
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          placeholder="e.g., 10000"
          className={styles.inputField}
          disabled={disabled}
        />
      </div>

      {/* NEW: Water Tracker with clickable drops */}
      <div className={styles.inputGroup}>
        <label>Water Drank:</label>
        <div className={styles.waterDropsContainer}>
          {[1, 2, 3].map((count) => (
            <span
              key={count}
              className={`${styles.waterDrop} ${waterCount >= count ? styles.filled : ''} ${disabled ? styles.disabled : ''}`}
              onClick={() => !disabled && handleWaterClick(count)}
            >
              💧
            </span>
          ))}
        </div>
      </div>

      {/* NEW: Meals tracked with individual checkboxes */}
      <div className={styles.inputGroup}>
        <label>Meals Tracked:</label>
        <div className={styles.mealCheckGroup}>
          {mealTypes.map((meal) => (
            <div className={styles.checkItem} key={meal}>
              <input
                type="checkbox"
                id={`meal-${meal}`}
                name={meal}
                checked={!!meals[meal]}
                onChange={handleMealChange}
                className={styles.checkbox}
                disabled={disabled}
              />
              <label htmlFor={`meal-${meal}`}>{meal}</label>
            </div>
          ))}
        </div>
      </div>
        
      {/* Gym Checkbox */}
      <div className={styles.inputGroup}>
         <div className={styles.checkItem}>
          <input
            type="checkbox"
            id="wentToGym"
            name="wentToGym"
            checked={wentToGym}
            onChange={(e) => setWentToGym(e.target.checked)}
            className={styles.checkbox}
            disabled={disabled}
          />
          <label htmlFor="wentToGym">Went to the Gym?</label>
        </div>
      </div>
    </div>
  );
}

export default PhysicalGoalsTracker;