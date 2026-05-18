import React, { useState } from 'react';
import styles from '@/features/planning/KanbanBoard/AddCardForm.module.css';

function AddCardForm({ onSave, onCancel }) {
  const [title, setTitle] = useState('');
  const [criteria, setCriteria] = useState('');

  const handleSave = () => {
    if (!title.trim()) {
      alert('Title is required.');
      return;
    }
    // Split criteria by new lines and filter out empty lines
    const acceptanceCriteria = criteria.split('\n')
      .filter(line => line.trim() !== '')
      .map(text => ({ text, isCompleted: false }));

    onSave({ title, acceptanceCriteria });
    setTitle('');
    setCriteria('');
  };

  return (
    <div className={styles.formContainer}>
      <input
        type="text"
        className={styles.input}
        placeholder="Enter a title for this card..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <textarea
        className={styles.textarea}
        placeholder="Acceptance Criteria (one per line)"
        rows="4"
        value={criteria}
        onChange={(e) => setCriteria(e.target.value)}
      />
      <div className={styles.buttonGroup}>
        <button onClick={handleSave} className={styles.saveButton}>Add Card</button>
        <button onClick={onCancel} className={styles.cancelButton}>Cancel</button>
      </div>
    </div>
  );
}

export default AddCardForm;