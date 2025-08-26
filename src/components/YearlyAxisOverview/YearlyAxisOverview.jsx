// src/components/YearlyAxisOverview/YearlyAxisOverview.jsx

import React, { useState, useEffect } from 'react';
import { db } from '../../firebaseConfig';
import { doc, updateDoc, addDoc, collection } from "firebase/firestore";

// --- UTILITY FUNCTIONS ---
const formatTitle = (id) => {
  if (!id) return '';
  return id
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getAxisColor = (axisId) => {
    const colors = {
        'physical': '#ef4444', 
        'financial': '#8b5cf6',
        'gear': '#3b82f6',
        'environment': '#10b981',
        'misdirect': '#f97316',
        'rest-and-preparation': '#14b8a6',
        'on-track-n+1': '#6b7280',
        'default': '#6b7280'
    };
    return colors[axisId] || colors['default'];
};

// --- YEARLY AXIS OVERVIEW COMPONENT ---
const YearlyAxisOverview = ({ isOpen, onClose, axisData, onDataUpdated, onOpenTimeline }) => {
  const [localMilestones, setLocalMilestones] = useState([]);
  const [editingMilestoneId, setEditingMilestoneId] = useState(null);
  const [currentEditText, setCurrentEditText] = useState('');
  const [currentEditDueDate, setCurrentEditDueDate] = useState('');
  const [newMilestoneText, setNewMilestoneText] = useState('');
  const [newMilestoneDueDate, setNewMilestoneDueDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // When the modal opens or data changes, sync milestones to local state.
  useEffect(() => {
    setLocalMilestones(axisData?.milestones || []);
  }, [axisData]);

  if (!isOpen) {
    return null;
  }

  const handleOpenTimelineModal = () => {
    if (onOpenTimeline) onOpenTimeline();
  };

  const handleEditClick = (milestone) => {
    setEditingMilestoneId(milestone.id); // Use the document ID
    setCurrentEditText(milestone.title); // Field is `title`
    if (milestone.dueDate?.toDate) {
      setCurrentEditDueDate(milestone.dueDate.toDate().toISOString().split('T')[0]);
    } else {
      setCurrentEditDueDate('');
    }
  };

  const handleCancelEdit = () => {
    setEditingMilestoneId(null);
    setCurrentEditText('');
    setCurrentEditDueDate('');
  };

  const handleSaveMilestone = async () => {
    if (!editingMilestoneId) return;
    setIsSaving(true);
    const milestoneRef = doc(db, 'new_milestones', editingMilestoneId);
    try {
      await updateDoc(milestoneRef, {
        title: currentEditText,
        dueDate: currentEditDueDate ? new Date(currentEditDueDate) : null
      });
      if (onDataUpdated) onDataUpdated();
      handleCancelEdit();
    } catch (error) { console.error("Error saving milestone:", error); }
    finally { setIsSaving(false); }
  };

  const handleAddMilestone = async () => {
    if (!newMilestoneText.trim() || !axisData?.yearlyGoal?.id) return;
    setIsSaving(true);
    const newMilestone = {
      axisId: axisData.id,
      goalId: axisData.yearlyGoal.id,
      title: newMilestoneText,
      dueDate: newMilestoneDueDate ? new Date(newMilestoneDueDate) : null,
      completionDate: null,
      status: 'incomplete',
    };
    try {
      await addDoc(collection(db, 'new_milestones'), newMilestone);
      setNewMilestoneText('');
      setNewMilestoneDueDate('');
      if (onDataUpdated) onDataUpdated();
    } catch (error) { console.error("Error adding milestone:", error); }
    finally { setIsSaving(false); }
  };

  const handleMarkComplete = async (milestoneId) => {
    const milestone = localMilestones.find(m => m.id === milestoneId);
    if (!milestone) return;
    const milestoneRef = doc(db, 'new_milestones', milestoneId);
    const newCompletionDate = milestone.completionDate ? null : new Date();
    try {
      await updateDoc(milestoneRef, { completionDate: newCompletionDate });
      if (onDataUpdated) onDataUpdated();
    } catch (error) { console.error("Error marking milestone complete:", error); }
  };

  const formatDateForDisplay = (date) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString();
  };

  const accentColor = getAxisColor(axisData.id);
  const styles = `
    .axis-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(17, 24, 39, 0.8); backdrop-filter: blur(8px); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 1rem; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; --accent-color: ${accentColor}; }
    .axis-modal-content { background-color: #f3f4f6; border-radius: 1rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4); width: 100%; max-width: 90%; max-height: 90vh; overflow-y: auto; position: relative; display: flex; flex-direction: column; }
    .axis-modal-close-button { position: absolute; top: 0.75rem; right: 0.75rem; background: #e5e7eb; border: none; border-radius: 9999px; width: 2.25rem; height: 2.25rem; font-size: 1.5rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background-color 0.2s, transform 0.2s; z-index: 20; }
    .axis-modal-close-button:hover { background: #d1d5db; transform: rotate(90deg); }
    .axis-modal-header { padding: 2rem 2.5rem; background: white; border-bottom: 1px solid #e5e7eb; border-top-left-radius: 1rem; border-top-right-radius: 1rem; text-align: left; }
    .axis-modal-title { font-size: 2.5rem; font-weight: 800; color: var(--accent-color); line-height: 1.1; }
    .header-info { margin-top: 1rem; color: #4b5563; font-size: 1rem; }
    .navigateToTimelineButton { margin-top: 1.5rem; padding: 0.5rem 1rem; border-radius: 0.5rem; border: 1px solid #d1d5db; background-color: #f9fafb; color: #374151; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .navigateToTimelineButton:hover { background-color: #f3f4f6; border-color: #9ca3af; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1); }
    .axis-modal-body { padding: 2.5rem; background-color: #f3f4f6; flex-grow: 1; }
    .card { background: white; padding: 1.5rem; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .card-title { font-size: 1.25rem; font-weight: 700; color: #1f2937; margin-bottom: 1rem; }
    .milestone-path-horizontal { display: flex; align-items: flex-start; }
    .milestone-node-horizontal { display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1; min-width: 150px; }
    .milestone-icon { width: 3rem; height: 3rem; border-radius: 50%; background-color: white; border: 4px solid var(--accent-color); display: flex; align-items: center; justify-content: center; font-weight: bold; color: var(--accent-color); font-size: 1.25rem; flex-shrink: 0; margin-bottom: 0.5rem; position: relative; }
    .milestone-text-container { font-size: 0.8rem; color: #4b5563; min-height: 4rem; width: 100%; cursor: pointer; padding: 0 0.5rem; }
    .milestone-date-display { font-size: 0.75rem; font-weight: 600; color: #6b7280; margin-top: 0.25rem; }
    .milestone-completed-date { color: #15803d; font-weight: bold; }
    .milestone-input-area { width: 100%; }
    .milestone-textarea { width: 100%; box-sizing: border-box; font-size: 0.8rem; padding: 0.5rem; border: 2px solid var(--accent-color); border-radius: 0.25rem; text-align: center; min-height: 60px; }
    .milestone-date-input { width: 100%; box-sizing: border-box; font-size: 0.75rem; padding: 0.25rem; border: 1px solid #ccc; border-radius: 0.25rem; margin-top: 0.5rem; text-align: center; }
    .milestone-actions { margin-top: 0.5rem; display: flex; gap: 0.5rem; justify-content: center; }
    .milestone-actions button { border: none; padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: bold; cursor: pointer; }
    .complete-button { position: absolute; top: -0.5rem; right: -0.5rem; width: 1.5rem; height: 1.5rem; border-radius: 50%; background-color: #e5e7eb; color: #6b7280; border: 2px solid white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; transition: background-color 0.2s; }
    .complete-button.completed { background-color: #22c55e; color: white; }
    .milestone-line-horizontal { height: 4px; background-color: #d1d5db; flex-grow: 1; margin: 1.25rem -1rem 0 -1rem; position: relative; z-index: -1; }
    .goal-node-horizontal { display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1; min-width: 120px; }
    .goal-icon { width: 3rem; height: 3rem; border-radius: 50%; background: var(--accent-color); border: 4px solid white; box-shadow: 0 0 0 4px var(--accent-color); display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem; margin-bottom: 0.5rem; }
    .goal-text { font-weight: bold; font-size: 0.9rem; }
    .add-milestone-form { display: flex; gap: 0.5rem; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb;}
    .add-milestone-input { flex-grow: 1; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.25rem; }
  `;

  return (
    <div className="axis-modal-overlay" onClick={onClose}>
      <style>{styles}</style>
      <div className="axis-modal-content" onClick={e => e.stopPropagation()}>
        <button className="axis-modal-close-button" onClick={onClose}>&times;</button>
        <header className="axis-modal-header">
          <h2 className="axis-modal-title">{formatTitle(axisData.id)}</h2>
          <div className="header-info">
            <p><strong>Guiding Question:</strong> <em>{axisData.question}</em></p>
          </div>
          <button className="navigateToTimelineButton" onClick={handleOpenTimelineModal}>Zoom In to Full Timeline</button>
        </header>
        <div className="axis-modal-body">
            <div className="card infographic-container">
              <h3 className="card-title" style={{textAlign: 'center'}}>Yearly Goal & Milestones</h3>
              <div className="milestone-path-horizontal">
                {localMilestones.map((milestone, i) => (
                  <React.Fragment key={milestone.id}>
                    <div className="milestone-node-horizontal">
                      <div className="milestone-icon">
                        {i + 1}
                        <button onClick={() => handleMarkComplete(milestone.id)} className={`complete-button ${milestone.completionDate ? 'completed' : ''}`} title={milestone.completionDate ? "Mark as Incomplete" : "Mark as Complete"}>✓</button>
                      </div>
                      {editingMilestoneId === milestone.id ? (
                        <div className="milestone-input-area">
                          <textarea className="milestone-textarea" value={currentEditText} onChange={(e) => setCurrentEditText(e.target.value)} autoFocus />
                          <input type="date" className="milestone-date-input" value={currentEditDueDate} onChange={(e) => setCurrentEditDueDate(e.target.value)} />
                          <div className="milestone-actions">
                            <button onClick={handleSaveMilestone} disabled={isSaving} style={{backgroundColor: '#22c55e', color: 'white'}}>Save</button>
                            <button onClick={handleCancelEdit} style={{backgroundColor: '#6b7280', color: 'white'}}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="milestone-text-container" onClick={() => handleEditClick(milestone)}>
                          <p style={milestone.completionDate ? {textDecoration: 'line-through', color: '#9ca3af'} : {}}>{milestone.title}</p>
                          {milestone.completionDate ? 
                            <p className="milestone-date-display milestone-completed-date">Completed: {formatDateForDisplay(milestone.completionDate)}</p> 
                            :
                            milestone.dueDate && <p className="milestone-date-display">Due: {formatDateForDisplay(milestone.dueDate)}</p>
                          }
                        </div>
                      )}
                    </div>
                    { i < localMilestones.length - 1 && <div className="milestone-line-horizontal"></div> }
                  </React.Fragment>
                ))}
                <div className="milestone-line-horizontal"></div>
                <div className="goal-node-horizontal">
                  <div className="goal-icon">🎯</div>
                  <p className="goal-text">{axisData.yearlyGoal?.title || 'Goal Not Set'}</p>
                </div>
              </div>
              <div className="add-milestone-form">
                <input className="add-milestone-input" type="text" placeholder="New milestone text..." value={newMilestoneText} onChange={e => setNewMilestoneText(e.target.value)} />
                <input className="add-milestone-input" type="date" value={newMilestoneDueDate} onChange={e => setNewMilestoneDueDate(e.target.value)} />
                <button onClick={handleAddMilestone} disabled={isSaving}>Add Milestone</button>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default YearlyAxisOverview;