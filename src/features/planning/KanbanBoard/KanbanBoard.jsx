import React, { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from '@/firebaseConfig';

import * as kanbanService from '@/services/kanbanServices';
import styles from '@/features/planning/KanbanBoard/KanbanBoard.module.css';
import AddCardForm from '@/features/planning/KanbanBoard/AddCardForm';
import EndSprintModal from '@/features/planning/KanbanBoard/EndSprintModal';
import ImageUploader from '@/components/ui/ImageUploader/ImageUploader';

const axisColorMap = {
    "Physical": { light: '#FDC1B4', medium: '#f59284', dark: '#e7514c' },
    "Financial": { light: '#e9def4', medium: '#beaccf', dark: '#927aaa' },
    "Gear": { light: '#c9ebf4', medium: '#7ebde0', dark: '#3280a7' },
    "On Track N+1": { light: '#BCDDDC', medium: '#618882', dark: '#053229' },
    "Environment": { light: '#efe5c3', medium: '#e3d295', dark: '#d8bf67' },
    "Misdirect": { light: '#b0e8d7', medium: '#78bfa1', dark: '#409c7c' },
    "Rest and preparation": { light: '#eaf1fa', medium: '#cbdbe7', dark: '#aec6de' },
};

function KanbanCard({ card, onUpdateCard }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(card.title);
  const [editedCriteria, setEditedCriteria] = useState(
    (card.acceptanceCriteria || []).map(c => c.text).join('\n')
  );

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleToggleExpand = (e) => {
    if (e.target.closest(`.${styles.editButton}`)) return;
    if (isEditing) return;
    setIsExpanded(prev => !prev);
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    setEditedTitle(card.title);
    setEditedCriteria((card.acceptanceCriteria || []).map(c => c.text).join('\n'));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    const updatedCriteria = editedCriteria.split('\n')
      .filter(line => line.trim() !== '')
      .map(text => ({ text, isCompleted: false }));
    
    onUpdateCard(card.id, { title: editedTitle, acceptanceCriteria: updatedCriteria });
    setIsEditing(false);
  };
  
  if (isEditing) {
    return (
        <div ref={setNodeRef} style={style} className={styles.card}>
            <div className={styles.editForm}>
                <input type="text" value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} className={styles.editInput} autoFocus/>
                <textarea value={editedCriteria} onChange={(e) => setEditedCriteria(e.target.value)} className={styles.editTextArea} rows="5"/>
                <div className={styles.editControls}>
                    <button onClick={handleSaveEdit} className={styles.saveButton}>Save</button>
                    <button onClick={handleCancelEdit} className={styles.cancelButton}>Cancel</button>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div className={styles.card} onClick={handleToggleExpand}>
        <div className={styles.cardHeader}>
            <span>{card.title}</span>
            <button onClick={handleEditClick} className={styles.editButton}>✎</button>
        </div>
        {isExpanded && (
            <div className={styles.cardContent}>
                <h5 className={styles.acceptanceTitle}>Acceptance Criteria</h5>
                <ul className={styles.acceptanceList}>
                    {(card.acceptanceCriteria || []).map((item, index) => (
                    <li key={index}>{item.text}</li>
                    ))}
                </ul>
            </div>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({ title, columnId, cards, onAddCard, onUpdateCard, tooltip }) {
  const [isAdding, setIsAdding] = useState(false);
  const { setNodeRef } = useDroppable({ id: columnId });

  const handleSaveCard = (cardData) => {
    onAddCard(cardData, columnId);
    setIsAdding(false);
  };

  return (
    <div className={styles.column}>
      <h3 className={styles.columnHeader} title={tooltip}>{title}</h3>
      <div ref={setNodeRef} className={styles.cardList}>
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard key={card.id} card={card} onUpdateCard={onUpdateCard} />
          ))}
        </SortableContext>
      </div>
      <div className={styles.columnFooter}>
        {isAdding ? (
          <AddCardForm onSave={handleSaveCard} onCancel={() => setIsAdding(false)} />
        ) : (
          <button className={styles.addCardButton} onClick={() => setIsAdding(true)}>
            + Add a card
          </button>
        )}
      </div>
    </div>
  );
}

function KanbanBoard({ axisId, goalId, project }) {
  const projectId = project?.id;
  const [cards, setCards] = useState([]);
  const [activeCard, setActiveCard] = useState(null);
  const [isEndSprintOpen, setIsEndSprintOpen] = useState(false);
  const [isDailyScrumOpen, setIsDailyScrumOpen] = useState(false);
  const [yesterday, setYesterday] = useState('');
  const [today, setToday] = useState('');
  const [impediments, setImpediments] = useState('');
  const [isSavingLog, setIsSavingLog] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 8,
        },
    })
  );

  const colors = axisColorMap[axisId] || axisColorMap["Physical"];

  useEffect(() => {
    const fetchCards = async () => {
      if (!projectId) {
        setCards([]);
        return;
      }
      const fetchedCards = await kanbanService.getKanbanCardsForProject(projectId);
      setCards(fetchedCards);
    };
    
    fetchCards();
  }, [projectId]);

  const handleAddCard = async (newCardData, columnId) => {
    const cardPayload = {
      ...newCardData,
      axisId,
      goalId,
      projectId,
      status: columnId,
    };
    try {
      const newDocRef = await kanbanService.createKanbanCard(cardPayload);
      const newCardObject = {
        id: newDocRef.id,
        ...cardPayload,
        priority: Date.now(),
      };
      setCards(prevCards => [...prevCards, newCardObject]);
    } catch (error) {
      console.error("Error creating card:", error);
    }
  };

  const handleUpdateCard = async (cardId, dataToUpdate) => {
    try {
        await kanbanService.updateKanbanCard(cardId, dataToUpdate);
        setCards(prevCards => prevCards.map(card => 
            card.id === cardId ? { ...card, ...dataToUpdate } : card
        ));
    } catch (error) {
        console.error("Error updating card:", error);
    }
  };

  const handleImageUploadSuccess = async (downloadURL, fileName) => {
    if (!axisId || !projectId) {
        alert("Please select an Axis and a Project before uploading an image.");
        return;
    }
    try {
        await addDoc(collection(db, "images"), {
            axisId: axisId,
            projectId: projectId,
            imageUrl: downloadURL,
            title: fileName,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error saving image document to Firestore:", error);
        alert("Image uploaded, but failed to save details to the database.");
    }
  };

  const handleSaveLog = async () => {
    if (!yesterday.trim() && !today.trim() && !impediments.trim()) {
      alert("Please fill out at least one field.");
      return;
    }
    setIsSavingLog(true);
    const logData = { yesterday, today, impediments };
    try {
      await kanbanService.addSprintLog(projectId, logData);
      setYesterday('');
      setToday('');
      setImpediments('');
      setIsDailyScrumOpen(false);
    } catch (error) {
      console.error("Error saving sprint log:", error);
      alert("Failed to save log. Please try again.");
    } finally {
      setIsSavingLog(false);
    }
  };

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveCard(cards.find(card => card.id === active.id));
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveCard(null);
    if (!over) return;
    const activeCard = cards.find(card => card.id === active.id);
    if (!activeCard) return;
    const activeContainer = activeCard.status;
    const overCard = cards.find(card => card.id === over.id);
    const overContainer = overCard ? overCard.status : over.id;
    if (!overContainer || activeContainer === overContainer) return;
    const newStatus = overContainer;
    try {
        if (newStatus === 'productBacklog') {
            await kanbanService.deleteTasksForCard(activeCard);
        }
        if (newStatus === 'sprintBacklog' && activeCard.status === 'productBacklog') {
            await kanbanService.createTasksFromCard(activeCard, 'main');
        }
        if (newStatus === 'inProgress') {
            await kanbanService.createTasksFromCard(activeCard, 'main'); 
            await kanbanService.createTasksFromCard(activeCard, 'criteria');
        }
    } catch (error) {
        alert(`Error while creating tasks: ${error.message}`);
        console.error("Task creation failed:", error);
    }
    setCards(prevCards => {
        const activeIndex = prevCards.findIndex(c => c.id === active.id);
        if (activeIndex === -1) return prevCards;
        const updatedCards = [...prevCards];
        updatedCards[activeIndex] = { ...updatedCards[activeIndex], status: newStatus };
        return updatedCards;
    });
    await kanbanService.updateCardStatus(active.id, newStatus, Date.now());
    const freshCards = await kanbanService.getKanbanCardsForProject(projectId);
    setCards(freshCards);
  };

  const columns = useMemo(() => {
    const initialColumns = {
        productBacklog: [], sprintBacklog: [], inProgress: [], done: []
    };
    const populatedColumns = cards.reduce((acc, card) => {
        const status = card.status || 'productBacklog';
        if (acc[status]) { acc[status].push(card); }
        return acc;
    }, initialColumns);
    for (const key in populatedColumns) {
        populatedColumns[key].sort((a, b) => a.priority - b.priority);
    }
    return populatedColumns;
  }, [cards]);

  const boardStyle = {
    '--axis-color-light': colors.light,
    '--axis-color-medium': colors.medium,
    '--axis-color-dark': colors.dark,
  };

  const tooltips = {
    productBacklog: "Your master to-do list for the project. It's a prioritized list of everything you need to achieve your Project Vision.",
    sprintBacklog: "The set of items you've committed to completing in the current Sprint. You pull these from the top of the Product Backlog during Sprint Planning.",
    inProgress: "The item(s) you are actively working on right now.",
    done: "Completed items that are potentially ready to be part of a valuable Increment.",
    dailyScrum: "Click to open your daily log. Use this 5-minute event to inspect progress toward your Sprint Goal and plan your day.",
    endSprint: "Click to begin your Sprint Review (what did you accomplish?) and Sprint Retrospective (how can you improve the process?)."
  };

  return (
    <>
      <div className={styles.boardHeader} style={{'--axis-color-dark': colors.dark}}>
        <div className={styles.headerControls}>
          <button 
            className={styles.headerButton} 
            onClick={() => setIsDailyScrumOpen(prev => !prev)}
            disabled={!projectId}
            title={tooltips.dailyScrum}
          >
            Daily Scrum
          </button>
          <button 
            className={styles.headerButton} 
            onClick={() => setIsEndSprintOpen(true)} 
            disabled={!projectId}
            title={tooltips.endSprint}
          >
            End Sprint
          </button>
          <ImageUploader 
            onUploadSuccess={handleImageUploadSuccess}
            axisId={axisId}
            projectId={projectId}
          />
        </div>
        {project?.vision && (
            <div className={styles.visionDisplay}>
                <strong>Vision:</strong> {project.vision}
            </div>
        )}
      </div>

      <div className={`${styles.dailyScrumPanel} ${isDailyScrumOpen ? styles.isOpen : ''}`} style={boardStyle}>
        <div className={styles.formGroup}>
            <label className={styles.label}>What did I accomplish yesterday?</label>
            <textarea className={styles.textarea} rows="3" value={yesterday} onChange={(e) => setYesterday(e.target.value)} />
        </div>
        <div className={styles.formGroup}>
            <label className={styles.label}>What will I do today?</label>
            <textarea className={styles.textarea} rows="3" value={today} onChange={(e) => setToday(e.target.value)} />
        </div>
        <div className={styles.formGroup}>
            <label className={styles.label}>What impediments are in my way?</label>
            <textarea className={styles.textarea} rows="3" value={impediments} onChange={(e) => setImpediments(e.target.value)} />
        </div>
        <button className={styles.submitButton} onClick={handleSaveLog} disabled={isSavingLog}>
            {isSavingLog ? 'Saving...' : 'Save Log'}
        </button>
      </div>

      <div className={styles.boardContainer} style={boardStyle}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <KanbanColumn title="Product Backlog" columnId="productBacklog" cards={columns.productBacklog} onAddCard={handleAddCard} onUpdateCard={handleUpdateCard} tooltip={tooltips.productBacklog} />
            <KanbanColumn title="Sprint Backlog" columnId="sprintBacklog" cards={columns.sprintBacklog} onAddCard={handleAddCard} onUpdateCard={handleUpdateCard} tooltip={tooltips.sprintBacklog} />
            <KanbanColumn title="In Progress" columnId="inProgress" cards={columns.inProgress} onAddCard={handleAddCard} onUpdateCard={handleUpdateCard} tooltip={tooltips.inProgress} />
            <KanbanColumn title="Done" columnId="done" cards={columns.done} onAddCard={handleAddCard} onUpdateCard={handleUpdateCard} tooltip={tooltips.done} />
            <DragOverlay>
                {activeCard ? <KanbanCard card={activeCard} onUpdateCard={() => {}} /> : null}
            </DragOverlay>
        </DndContext>
      </div>

      <EndSprintModal
        isOpen={isEndSprintOpen}
        onClose={() => setIsEndSprintOpen(false)}
        projectId={projectId}
        cards={cards}
      />
    </>
  );
}

export default KanbanBoard;