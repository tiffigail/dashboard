// src/components/AxisEditor/AxisEditor.jsx
import React, { useState, useEffect, useCallback } from 'react';
import styles from './AxisEditor.module.css';
import { db } from '../../firebaseConfig';
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import Modal from '../Modal/Modal'; // Import Modal
import EditMilestoneForm from '../EditMilestoneForm/EditMilestoneForm'; // Import Edit Form

function AxisEditor() {
  const [axisIdToLoad, setAxisIdToLoad] = useState('gear');
  const [currentAxisId, setCurrentAxisId] = useState('');
  const [axisData, setAxisData] = useState({
    axisName: '',
    yearlyGoal: '',
    question: '',
    milestones: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false); // Tracks overall edits to the axis
  const [newMilestoneText, setNewMilestoneText] = useState('');

  // == State for Edit Milestone Modal ==
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMilestoneIndex, setEditingMilestoneIndex] = useState(null); // Index of milestone being edited

  // Fetch data function (no changes needed here)
  const fetchAxisData = useCallback(async (id) => {
    // ... (fetch logic remains the same as previous version) ...
     if (!id) {
      setCurrentAxisId('');
      setAxisData({ axisName: '', yearlyGoal: '', question: '', milestones: [] });
      setError(null);
      setIsLoading(false);
      setIsEditing(false);
      return;
    }
    const finalId = id.toLowerCase();
    setIsLoading(true);
    setError(null);
    setIsEditing(false);
    setCurrentAxisId(finalId);

    try {
      const axisDocRef = doc(db, "axes", finalId);
      const axisDocSnap = await getDoc(axisDocRef);

      if (axisDocSnap.exists()) {
        const data = axisDocSnap.data();
        console.log(`Fetched data for axis: ${finalId}`, data);
        setAxisData({
          axisName: data.axisName || finalId.charAt(0).toUpperCase() + finalId.slice(1),
          yearlyGoal: data.yearlyGoal || '',
          question: data.question || '',
          milestones: Array.isArray(data.milestones) ? data.milestones : []
        });
      } else {
        console.log(`No document found for axis: ${finalId}`);
        setError(`Data for axis '${finalId}' not found. You can create it by entering data and saving.`);
        setAxisData({ axisName: finalId.charAt(0).toUpperCase() + finalId.slice(1), yearlyGoal: '', question: '', milestones: [] });
      }
    } catch (err) {
      console.error("Error fetching axis document: ", err);
      setError("Failed to load axis data.");
      setAxisData({ axisName: '', yearlyGoal: '', question: '', milestones: [] });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle clicking the load button
  const handleLoadClick = () => {
    fetchAxisData(axisIdToLoad);
  };

  // Handle changes to the input field where user types the axis ID
  const handleIdInputChange = (event) => {
    setAxisIdToLoad(event.target.value);
  };

  // Handle changes in the textareas (Yearly Goal, Question)
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setAxisData(prevData => ({ ...prevData, [name]: value }));
    setIsEditing(true);
  };

  // == Milestone Management Handlers ==
  const handleNewMilestoneTextChange = (event) => {
    setNewMilestoneText(event.target.value);
  };

  const handleAddMilestone = () => {
    if (!newMilestoneText.trim()) return;
    const newMilestone = {
      text: newMilestoneText.trim(),
      dueDate: null,
      completionDate: null
    };
    setAxisData(prevData => ({
      ...prevData,
      milestones: [...prevData.milestones, newMilestone]
    }));
    setNewMilestoneText('');
    setIsEditing(true);
  };

  // --- Handlers for Editing Milestones ---
  const handleOpenEditModal = (index) => {
    setEditingMilestoneIndex(index); // Store the index of the milestone to edit
    setIsEditModalOpen(true); // Open the modal
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingMilestoneIndex(null); // Clear the index when modal closes
  };

  // Called when the EditMilestoneForm saves changes
  const handleUpdateMilestone = (updatedMilestoneData) => {
    if (editingMilestoneIndex === null) return; // Should not happen, but safety check

    // Create a new milestones array with the updated item
    const newMilestonesArray = axisData.milestones.map((item, index) => {
      if (index === editingMilestoneIndex) {
        return updatedMilestoneData; // Replace the item at the editing index
      }
      return item; // Keep other items the same
    });

    // Update the main axisData state
    setAxisData(prevData => ({
      ...prevData,
      milestones: newMilestonesArray
    }));

    setIsEditing(true); // Mark that overall axis data has been edited
    handleCloseEditModal(); // Close the modal
  };

  // TODO: Add handleDeleteMilestone later

  // Handle saving ALL changes (including milestones) to Firestore
  const handleSave = async () => {
    // ... (Save logic remains the same - it saves the entire axisData object) ...
     const idToSave = currentAxisId || axisIdToLoad;
    if (!idToSave) {
      setError("Please enter an Axis ID before saving.");
      return;
    }
    const finalAxisId = idToSave.toLowerCase();

    setIsLoading(true);
    setError(null);

    // Prepare the full data object to save, including the updated milestones array
    const dataToSave = {
      ...axisData, // Include existing goal, question, milestones array
      axisName: axisData.axisName || finalAxisId.charAt(0).toUpperCase() + finalAxisId.slice(1),
    };

    console.log("Saving data for axis:", finalAxisId, dataToSave);

    try {
      // Use setDoc WITHOUT merge to overwrite the entire document
      // This ensures the milestones array is saved correctly with additions/edits/deletions
      await setDoc(doc(db, "axes", finalAxisId), dataToSave);

      console.log("Axis data saved successfully!");
      setIsEditing(false);
      setCurrentAxisId(finalAxisId);
    } catch (err) {
      console.error("Error saving axis data:", err);
      setError("Failed to save data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className={styles.editorContainer}>
      <h3 className={styles.editorTitle}>Axis Editor</h3>

      {/* Axis Selection */}
      <div className={styles.inputGroup}>
        <label htmlFor="axisIdInput">Load/Edit/Create Axis ID:</label>
        <div className={styles.loadControls}>
          <input
            type="text"
            id="axisIdInput"
            value={axisIdToLoad}
            onChange={handleIdInputChange}
            placeholder="e.g., gear (use lowercase)"
          />
          <button onClick={handleLoadClick} disabled={isLoading || !axisIdToLoad}>
            {isLoading && currentAxisId === axisIdToLoad.toLowerCase() ? 'Loading...' : 'Load Axis'}
          </button>
        </div>
      </div>

      {/* Display Area */}
      {isLoading && currentAxisId && <p>Loading {currentAxisId}...</p>}
      {error && <p className={styles.errorText}>{error}</p>}

      {(currentAxisId || axisIdToLoad) && !isLoading && (
        <>
          <h4>Editing Axis: {axisData.axisName || (currentAxisId || axisIdToLoad)}</h4>

          {/* Yearly Goal Input */}
          <div className={styles.inputGroup}>
            <label htmlFor="yearlyGoal">Yearly Goal:</label>
            <textarea
              id="yearlyGoal"
              name="yearlyGoal"
              rows="3"
              value={axisData.yearlyGoal}
              onChange={handleInputChange}
              placeholder="Enter the main goal for this axis for the year"
            />
          </div>

          {/* Question Input */}
          <div className={styles.inputGroup}>
            <label htmlFor="question">Question to Ponder:</label>
            <textarea
              id="question"
              name="question"
              rows="2"
              value={axisData.question}
              onChange={handleInputChange}
              placeholder="Enter the guiding question for this axis"
            />
          </div>

          {/* Milestones Section */}
          <div className={styles.milestonesSection}>
            <label>Milestones:</label>
            {/* Display List */}
            {axisData.milestones.length === 0 ? (
              <p className={styles.noMilestones}>No milestones defined yet.</p>
            ) : (
              <ul className={styles.milestoneList}>
                {axisData.milestones.map((milestone, index) => (
                  <li key={milestone.text || index} className={styles.milestoneItem}>
                    {/* Milestone details */}
                    <div className={styles.milestoneInfo}>
                      <span className={styles.milestoneText}>{milestone.text || 'N/A'}</span>
                      <span className={styles.milestoneDate}>
                        Due: {milestone.dueDate?.toDate ? milestone.dueDate.toDate().toLocaleDateString() : 'N/A'}
                      </span>
                      <span className={styles.milestoneDate}>
                        Completed: {milestone.completionDate ? (milestone.completionDate.toDate ? milestone.completionDate.toDate().toLocaleDateString() : 'Yes') : 'No'}
                      </span>
                    </div>
                     {/* Edit Button */}
                    <button
                      onClick={() => handleOpenEditModal(index)} // Pass index to identify milestone
                      className={styles.editButton}
                    >
                      Edit
                    </button>
                     {/* TODO: Add Delete button here later */}
                  </li>
                ))}
              </ul>
            )}
             {/* Add New Milestone Input */}
             <div className={styles.addMilestoneForm}>
               <input
                 type="text"
                 value={newMilestoneText}
                 onChange={handleNewMilestoneTextChange}
                 placeholder="Enter new milestone text"
                 className={styles.addMilestoneInput}
               />
               <button
                 onClick={handleAddMilestone}
                 disabled={!newMilestoneText.trim()}
                 className={styles.addMilestoneButton}
               >
                 Add Milestone
               </button>
             </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isLoading || !isEditing}
            className={styles.saveButton}
          >
            {isLoading ? 'Saving...' : 'Save Axis Changes'}
          </button>
        </>
      )}

      {/* Edit Milestone Modal - Conditionally Rendered */}
      {isEditModalOpen && editingMilestoneIndex !== null && (
         <Modal isOpen={isEditModalOpen} onClose={handleCloseEditModal}>
           <EditMilestoneForm
             // Pass the specific milestone object being edited
             milestoneData={axisData.milestones[editingMilestoneIndex]}
             // Pass the handler function to save the update
             onSave={(updatedData) => handleUpdateMilestone(updatedData)} // Removed index passing, form returns full object
             // Pass the close handler
             onClose={handleCloseEditModal}
           />
         </Modal>
       )}

    </div> // End editorContainer
  );
}

export default AxisEditor;
