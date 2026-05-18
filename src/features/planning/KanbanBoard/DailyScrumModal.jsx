import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '@/features/planning/KanbanBoard/Modal.module.css';
import * as kanbanService from '@/services/kanbanServices';

function DailyScrumModal({ isOpen, onClose, projectId }) {
  const [yesterday, setYesterday] = useState('');
  const [today, setToday] = useState('');
  const [impediments, setImpediments] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!yesterday.trim() && !today.trim() && !impediments.trim()) {
        alert("Please fill out at least one field.");
        return;
    }
    setIsSaving(true);
    const logData = { yesterday, today, impediments };
    try {
        await kanbanService.addSprintLog(projectId, logData);
        setYesterday('');
        setToday('');
        setImpediments('');
        onClose();
    } catch (error) {
        console.error("Error saving sprint log:", error);
        alert("Failed to save log. Please try again.");
    } finally {
        setIsSaving(false);
    }
  };

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>×</button>
        <h2>Daily Scrum Log</h2>
        
        <div className={styles.formGroup}>
            <label className={styles.label}>What did I accomplish yesterday?</label>
            <textarea 
                className={styles.textarea}
                rows="4"
                value={yesterday}
                onChange={(e) => setYesterday(e.target.value)}
                placeholder="e.g., Completed my 45-minute workout..."
            />
        </div>

        <div className={styles.formGroup}>
            <label className={styles.label}>What will I do today?</label>
            <textarea 
                className={styles.textarea}
                rows="4"
                value={today}
                onChange={(e) => setToday(e.target.value)}
                placeholder="e.g., Focus on meal prep..."
            />
        </div>

        <div className={styles.formGroup}>
            <label className={styles.label}>What impediments are in my way?</label>
            <textarea 
                className={styles.textarea}
                rows="4"
                value={impediments}
                onChange={(e) => setImpediments(e.target.value)}
                placeholder="e.g., Feeling tired in the evenings..."
            />
        </div>

        <button className={styles.submitButton} onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Log'}
        </button>

      </div>
    </div>,
    document.body
  );
}

export default DailyScrumModal;