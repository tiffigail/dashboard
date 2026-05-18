// src/components/Timeline/Subcomponents/TimelineEditor/TimelineEditor.jsx
import React, { useState } from 'react';
import editorStyles from '@/components/timeline/Timeline/Subcomponents/TimelineEditor/TimelineEditor.module.css';
import TimelineItem from '@/components/timeline/Timeline/Subcomponents/TimelineItem/TimelineItem'; // Corrected path

const TimelineEditor = ({ 
    items = [], 
    onSaveItem, 
    onMarkComplete,
    onDeleteItem,
    renderSubItems,
    isLoading,
    expandedItems,
    onToggleExpand,
}) => {
    const [editingItemId, setEditingItemId] = useState(null);
    const [currentEditText, setCurrentEditText] = useState('');
    const [currentEditDueDate, setCurrentEditDueDate] = useState('');
    const [currentEditCompletionDate, setCurrentEditCompletionDate] = useState('');
    
    const [justCompletedId, setJustCompletedId] = useState(null);

    const handleEditClick = (item) => {
        // --- THIS IS THE CRITICAL FIX from our last good session ---
        // If the item is not currently expanded, expand it first.
        if (expandedItems && onToggleExpand && !expandedItems.has(item.id)) {
            // If it's not expanded, call the function to expand it.
            onToggleExpand(item.id);
        }

        // AFTER ensuring it's expanded, set the local state to show the edit form.
        setEditingItemId(item.id);
        setCurrentEditText(item.text);
        const dueDate = item.dueDate?.seconds ? new Date(item.dueDate.seconds * 1000) : (item.dueDate ? new Date(item.dueDate) : null);
        setCurrentEditDueDate(dueDate ? dueDate.toISOString().split('T')[0] : '');
        const completionDate = item.completionDate?.seconds ? new Date(item.completionDate.seconds * 1000) : (item.completionDate ? new Date(item.completionDate) : null);
        setCurrentEditCompletionDate(completionDate ? completionDate.toISOString().split('T')[0] : '');
    };

    const handleCancelEdit = () => setEditingItemId(null);

    const handleSaveClick = () => {
        if (onSaveItem) {
            onSaveItem(editingItemId, currentEditText, currentEditDueDate, currentEditCompletionDate);
        }
        handleCancelEdit(); 
    };

    const handleDeleteClick = () => {
        if (onDeleteItem) {
            onDeleteItem(editingItemId);
        }
        handleCancelEdit();
    };

    const handleMarkCompleteClick = (itemId) => {
        const item = items.find(i => i.id === itemId);
        if (item && !item.completionDate) {
            setJustCompletedId(itemId);
            setTimeout(() => setJustCompletedId(null), 1000);
        }
        if (onMarkComplete) onMarkComplete(itemId);
    };

    return (
        <div className={editorStyles.timelineWrapper}>
            {items.length > 0 ? (
                <div className={editorStyles.timeline}>
                    {items.map((item, index) => {
                        const isEditing = editingItemId === item.id;
                        const isExpanded = expandedItems.has(item.id);

                        return (
                            <React.Fragment key={item.id}>
                                <TimelineItem
                                    item={item}
                                    index={index}
                                    isExpanded={isExpanded}
                                    onToggleExpand={() => onToggleExpand(item.id)}
                                    onEditClick={() => handleEditClick(item)} 
                                    onMarkComplete={handleMarkCompleteClick}
                                    isLoading={isLoading}
                                    isEditing={isEditing}
                                >
                                    {/* This is the content that goes inside the expanded node */}
                                    {isExpanded ? (
                                        isEditing ? (
                                            <div className={editorStyles.editForm}>
                                                <textarea value={currentEditText} onChange={(e) => setCurrentEditText(e.target.value)} autoFocus />
                                                <label>Due Date:</label>
                                                <input type="date" value={currentEditDueDate} onChange={(e) => setCurrentEditDueDate(e.target.value)} />
                                                {item.completionDate && (
                                                    <>
                                                        <label>Completed Date:</label>
                                                        <input type="date" value={currentEditCompletionDate} onChange={(e) => setCurrentEditCompletionDate(e.target.value)} />
                                                    </>
                                                )}
                                                <div className={editorStyles.editActions}>
                                                    <button onClick={handleSaveClick} disabled={isLoading} className={editorStyles.saveButton}>Save</button>
                                                    <button onClick={handleCancelEdit} className={editorStyles.cancelButton}>Cancel</button>
                                                    <button onClick={handleDeleteClick} disabled={isLoading} className={editorStyles.deleteButton}>Delete</button>
                                                </div>
                                            </div>
                                        ) : (
                                            renderSubItems && renderSubItems(item.id)
                                        )
                                    ) : null}
                                </TimelineItem>
                                {index < items.length - 1 && <div className={editorStyles.line}></div>}
                            </React.Fragment>
                        );
                    })}
                </div>
            ) : (
                <div className={editorStyles.emptyState}>
                    <p>No items to display.</p>
                </div>
            )}
        </div>
    );
};

export default TimelineEditor;
