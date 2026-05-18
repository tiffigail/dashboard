import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from '@/features/planning/KanbanBoard/Modal.module.css';

function SprintEditModal({ sprint, onClose, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  
  // State for the edit form
  const [startDate, setStartDate] = useState(sprint.startDate);
  const [duration, setDuration] = useState(Math.round((new Date(sprint.endDate) - new Date(sprint.startDate)) / (1000 * 60 * 60 * 24)) + 1);

  useEffect(() => {
    // Reset state if the sprint prop changes (i.e., a new sprint is clicked)
    setStartDate(sprint.startDate);
    setDuration(Math.round((new Date(sprint.endDate) - new Date(sprint.startDate)) / (1000 * 60 * 60 * 24)) + 1);
    setIsEditing(false); // Go back to the initial view
  }, [sprint]);

  const handleUpdate = () => {
    onUpdate(sprint, { newStartDate: startDate, newDuration: duration });
    onClose();
  };
  
  const handleDelete = () => {
      onDelete(sprint);
      onClose();
  };

  if (!sprint) return null;

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>×</button>
        
        {!isEditing ? (
          // Initial View: Options to Edit or Delete
          <div>
            <h2 className={styles.subHeader}>Manage Sprint</h2>
            <p style={{marginBottom: '20px'}}>What would you like to do with the "{sprint.text}" sprint?</p>
            <div className={styles.buttonGroup}>
              <button className={styles.submitButton} onClick={() => setIsEditing(true)}>Edit Sprint</button>
              <button className={`${styles.submitButton} ${styles.deleteButton}`} onClick={handleDelete}>Remove from Calendar</button>
            </div>
          </div>
        ) : (
          // Editing View: Form to change date/duration
          <div>
            <h2 className={styles.subHeader}>Edit Sprint</h2>
            <div className={styles.formGroup}>
              <label className={styles.label}>Start Date:</label>
              <input 
                type="date" 
                className={styles.input}
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Duration:</label>
              <select 
                className={styles.select}
                value={duration}
                onChange={e => setDuration(parseInt(e.target.value, 10))}
              >
                <option value="7">1 Week</option>
                <option value="14">2 Weeks</option>
                <option value="21">3 Weeks</option>
                <option value="30">1 Month</option>
              </select>
            </div>
            <button className={styles.submitButton} onClick={handleUpdate}>Save Changes</button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default SprintEditModal;