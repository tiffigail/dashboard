// src/components/EditMilestoneForm/EditMilestoneForm.jsx
import React, { useState, useEffect } from 'react';
import styles from './EditMilestoneForm.module.css';
import { Timestamp } from "firebase/firestore"; // Import Timestamp for date conversion

// Helper function to convert Firestore Timestamp to 'YYYY-MM-DD' string
const formatTimestampForInput = (timestamp) => {
  if (!timestamp || !timestamp.toDate) return '';
  return timestamp.toDate().toISOString().split('T')[0];
};

// Props:
// - milestoneData: object - The milestone object being edited { text, dueDate, completionDate }
// - onSave: function - Called with the updated milestone object when saved
// - onClose: function - Called to close the modal
function EditMilestoneForm({ milestoneData, onSave, onClose }) {

  // State for form inputs, initialized from props
  const [editText, setEditText] = useState('');
  const [editDueDateStr, setEditDueDateStr] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [editCompletionDateStr, setEditCompletionDateStr] = useState('');

  // Populate state when milestoneData prop changes (when modal opens)
  useEffect(() => {
    if (milestoneData) {
      setEditText(milestoneData.text || '');
      setEditDueDateStr(formatTimestampForInput(milestoneData.dueDate));
      const hasCompletionDate = !!milestoneData.completionDate;
      setIsCompleted(hasCompletionDate);
      setEditCompletionDateStr(hasCompletionDate ? formatTimestampForInput(milestoneData.completionDate) : '');
    }
  }, [milestoneData]); // Re-run effect if milestoneData changes

  const handleSave = (event) => {
    event.preventDefault();

    // Prepare updated data, converting dates back
    let newCompletionDate = null;
    if (isCompleted) {
      // If completed checkbox is checked, try to use the date input value,
      // otherwise use the current time as a fallback if date input is empty/invalid
      try {
        newCompletionDate = editCompletionDateStr
          ? Timestamp.fromDate(new Date(editCompletionDateStr + 'T00:00:00')) // Ensure correct date parsing
          : Timestamp.now(); // Use now() if date input is empty but box checked
      } catch (e) {
        console.error("Invalid completion date string, using current time:", e);
        newCompletionDate = Timestamp.now();
      }
    }

    let newDueDate = null;
    if (editDueDateStr) {
       try {
         newDueDate = Timestamp.fromDate(new Date(editDueDateStr + 'T00:00:00'));
       } catch (e) {
         console.error("Invalid due date string:", e);
         // Keep original due date or set null? Let's keep original for now if invalid.
         newDueDate = milestoneData.dueDate;
       }
    }

    const updatedMilestone = {
      ...milestoneData, // Keep any other existing fields
      text: editText.trim(),
      dueDate: newDueDate,
      completionDate: newCompletionDate // Set to Timestamp or null
    };

    console.log("Saving updated milestone:", updatedMilestone);
    onSave(updatedMilestone); // Pass updated object back to parent
    // onClose(); // Parent component (AxisEditor) will handle closing
  };

  // Handle change for the 'Mark as Complete' checkbox
  const handleCompletionToggle = (event) => {
    const checked = event.target.checked;
    setIsCompleted(checked);
    // If marking as complete and no date is set, default to today
    if (checked && !editCompletionDateStr) {
      setEditCompletionDateStr(new Date().toISOString().split('T')[0]);
    }
    // If unchecking, clear the date
    if (!checked) {
      setEditCompletionDateStr('');
    }
  };

  return (
    <form onSubmit={handleSave} className={styles.form}>
      <h4 className={styles.formTitle}>Edit Milestone</h4>

      {/* Edit Text */}
      <div className={styles.inputField}>
        <label htmlFor="editText">Milestone Text:</label>
        <textarea
          id="editText"
          rows="3"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          required
        />
      </div>

      {/* Edit Due Date */}
      <div className={styles.inputField}>
        <label htmlFor="editDueDate">Due Date:</label>
        <input
          type="date"
          id="editDueDate"
          value={editDueDateStr}
          onChange={(e) => setEditDueDateStr(e.target.value)}
        />
      </div>

      {/* Edit Completion Status */}
      <div className={styles.checkField}>
         <input
           type="checkbox"
           id="isCompletedCheck"
           checked={isCompleted}
           onChange={handleCompletionToggle}
           className={styles.checkbox}
         />
         <label htmlFor="isCompletedCheck">Mark as Complete</label>
      </div>

      {/* Edit Completion Date (conditionally shown) */}
      {isCompleted && (
        <div className={styles.inputField}>
          <label htmlFor="editCompletionDate">Completion Date:</label>
          <input
            type="date"
            id="editCompletionDate"
            value={editCompletionDateStr}
            onChange={(e) => setEditCompletionDateStr(e.target.value)}
            required // Require date if marked complete
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className={styles.buttonGroup}>
        <button type="button" onClick={onClose} className={`${styles.button} ${styles.cancelButton}`}>
          Cancel
        </button>
        <button type="submit" className={`${styles.button} ${styles.saveButton}`}>
          Save Changes
        </button>
      </div>
    </form>
  );
}

export default EditMilestoneForm;
