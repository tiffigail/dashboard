import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from '@/features/planning/KanbanBoard/Modal.module.css';
import * as kanbanService from '@/services/kanbanServices';

function EndSprintModal({ isOpen, onClose, projectId, cards }) {
  const [step, setStep] = useState('review'); // 'review' or 'retrospective'
  const [sprintLogs, setSprintLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // State for Review form
  const [weight, setWeight] = useState('');
  const [examScore, setExamScore] = useState('');
  const [summary, setSummary] = useState('');

  // State for Retrospective form
  const [wentWell, setWentWell] = useState('');
  const [couldBeImproved, setCouldBeImproved] = useState('');
  const [actionItems, setActionItems] = useState('');
  const [markProjectComplete, setMarkProjectComplete] = useState(false);

  useEffect(() => {
    if (isOpen && projectId) {
      setIsLoading(true);
      setStep('review'); 
      kanbanService.getSprintLogsForProject(projectId)
        .then(logs => {
          const sortedLogs = logs.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());
          setSprintLogs(sortedLogs);
          setIsLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch sprint logs:", err);
          setIsLoading(false);
        });
    }
  }, [isOpen, projectId]);

  const handleCompleteReview = async () => {
    const reviewData = {
        completedCards: cards.filter(c => c.status === 'done').map(c => c.title),
        quantitativeResults: { weight, examScore },
        summary,
    };
    try {
        await kanbanService.saveSprintReview(projectId, reviewData);
        setStep('retrospective');
    } catch (error) {
        console.error("Failed to save Sprint Review:", error);
        alert("Could not save review. Please try again.");
    }
  };

    const handleFinishSprint = async () => {
    const retroData = { wentWell, couldBeImproved, actionItems };
    try {
        await kanbanService.saveSprintRetrospective(projectId, retroData);
        // Pass the checkbox state back to the parent component
        onClose({ markComplete: markProjectComplete }); 
    } catch (error) {
        console.error("Failed to save Sprint Retrospective:", error);
        alert("Could not save retrospective. Please try again.");
    }
  };
  
  const doneCards = cards.filter(card => card.status === 'done');

  if (!isOpen) return null;

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modalContent} ${styles.largeModal}`} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>×</button>
        
        {step === 'review' && (
            <div>
                <h2>Sprint Review</h2>
                <div className={styles.reviewGrid}>
                    <div className={styles.reviewSection}>
                        <h4 className={styles.subHeader}>Completed Cards</h4>
                        <ul className={styles.logList}>
                            {doneCards.length > 0 ? doneCards.map(card => <li key={card.id}>{card.title}</li>) : <li>No cards were completed this sprint.</li>}
                        </ul>
                    </div>
                    <div className={styles.reviewSection}>
                        <h4 className={styles.subHeader}>Quantitative Results</h4>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Weight</label>
                            <input type="text" className={styles.input} value={weight} onChange={e => setWeight(e.target.value)} />
                        </div>
                         <div className={styles.formGroup}>
                            <label className={styles.label}>Practice Exam Score</label>
                            <input type="text" className={styles.input} value={examScore} onChange={e => setExamScore(e.target.value)} />
                        </div>
                    </div>
                    <div className={`${styles.reviewSection} ${styles.fullWidth}`}>
                        <h4 className={styles.subHeader}>Sprint Logs</h4>
                        <div className={styles.logContainer}>
                            {isLoading ? <p>Loading logs...</p> : sprintLogs.map(log => (
                                <div key={log.id} className={styles.logItem}>
                                    <strong>{log.createdAt.toDate().toLocaleDateString()}:</strong>
                                    {log.yesterday && <p><em>Yesterday:</em> {log.yesterday}</p>}
                                    {log.today && <p><em>Today:</em> {log.today}</p>}
                                    {log.impediments && <p><em>Impediments:</em> {log.impediments}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={`${styles.reviewSection} ${styles.fullWidth}`}>
                        <h4 className={styles.subHeader}>Key Takeaways</h4>
                        <textarea className={styles.textarea} rows="3" value={summary} onChange={e => setSummary(e.target.value)} />
                    </div>
                </div>
                <button className={styles.submitButton} onClick={handleCompleteReview}>Complete Review & Start Retrospective →</button>
            </div>
        )}

        {step === 'retrospective' && (
            <div>
                <h2>Sprint Retrospective</h2>
                <div className={styles.retroGrid}>
                    <div className={styles.retroColumn}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>What went well?</label>
                            <textarea className={styles.textarea} rows="6" value={wentWell} onChange={e => setWentWell(e.target.value)} />
                        </div>
                         <div className={styles.formGroup}>
                            <label className={styles.label}>What could be improved?</label>
                            <textarea className={styles.textarea} rows="6" value={couldBeImproved} onChange={e => setCouldBeImproved(e.target.value)} />
                        </div>
                         <div className={styles.formGroup}>
                            <label className={styles.label}>Action Items for Next Sprint</label>
                            <textarea className={styles.textarea} rows="6" value={actionItems} onChange={e => setActionItems(e.target.value)} />
                        </div>
                    </div>
                    <div className={styles.retroColumn}>
                        <h4 className={styles.subHeader}>Sprint Logs for Reference</h4>
                        <div className={styles.logContainer}>
                           {isLoading ? <p>Loading logs...</p> : sprintLogs.map(log => (
                                <div key={log.id} className={styles.logItem}>
                                    <strong>{log.createdAt.toDate().toLocaleDateString()}:</strong>
                                    {log.yesterday && <p><em>Yesterday:</em> {log.yesterday}</p>}
                                    {log.today && <p><em>Today:</em> {log.today}</p>}
                                    {log.impediments && <p><em>Impediments:</em> {log.impediments}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className={styles.roadmapPrompt}>
                    <h4 className={styles.subHeader}>Next Step: Update Roadmaps</h4>
                    <p>
                        Based on this sprint's outcome and your action items, consider updating your long-term plans. Does this change anything on your Yearly, Pareto, or Life Map views?
                    </p>
                </div>
                <button className={styles.submitButton} onClick={handleFinishSprint}>Finish Sprint</button>
                <div className={styles.completeProjectSection}>
                    <input 
                        type="checkbox"
                        id="markProjectComplete"
                        checked={markProjectComplete}
                        onChange={(e) => setMarkProjectComplete(e.target.checked)}
                    />
                    <label htmlFor="markProjectComplete">
                        Mark this project as complete
                    </label>
                </div>
            </div>
            
        )}

      </div>
    </div>,
    document.body
  );
}

export default EndSprintModal;