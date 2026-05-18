import React, { useState, useEffect } from 'react';
import styles from '@/features/gear/SkillPersonalRecords/SkillPersonalRecords.module.css';
import { getSkillBadgeTemplateById } from '@/data/skillBadgeTemplates';
import * as skillBadgeService from '@/services/skillBadgeService';

function SkillPersonalRecords({ badge, userId, onClose }) {
  const template = getSkillBadgeTemplateById(badge.skillId);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecord, setNewRecord] = useState({ type: '', value: '', notes: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadRecords();
  }, [userId, badge.skillId]);

  const loadRecords = async () => {
    setIsLoading(true);
    try {
      const data = await skillBadgeService.getPersonalRecords(userId, badge.skillId);
      setRecords(data);
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRecord = async () => {
    if (!newRecord.type || !newRecord.value) return;
    setIsSaving(true);
    try {
      await skillBadgeService.logPersonalRecord(
        userId,
        badge.skillId,
        newRecord.type,
        newRecord.value,
        newRecord.notes
      );
      setNewRecord({ type: '', value: '', notes: '' });
      setShowAddForm(false);
      loadRecords();
    } catch (error) {
      console.error('Error adding record:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Group records by type
  const recordsByType = records.reduce((acc, record) => {
    const type = record.recordType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(record);
    return acc;
  }, {});

  // Get best record for each type
  const bestRecords = Object.entries(recordsByType).map(([type, recs]) => {
    const sorted = [...recs].sort((a, b) => {
      const aVal = parseFloat(a.value) || 0;
      const bVal = parseFloat(b.value) || 0;
      return bVal - aVal;
    });
    return { type, best: sorted[0], history: sorted };
  });

  const prTypes = template?.prTypes || [];

  return (
    <div className={styles.records}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.heading}>{badge.emoji} Personal Records</h2>
          <p className={styles.subtitle}>{badge.skillName}</p>
        </div>
        <button className={styles.closeButton} onClick={onClose}>&times;</button>
      </div>

      {isLoading ? (
        <p className={styles.loading}>Loading records...</p>
      ) : (
        <>
          {bestRecords.length === 0 && !showAddForm && (
            <div className={styles.emptyState}>
              <p>No personal records logged yet.</p>
              <p className={styles.emptyHint}>Track your progress by adding PRs!</p>
            </div>
          )}

          <div className={styles.recordsList}>
            {bestRecords.map(({ type, best, history }) => {
              const prDef = prTypes.find(p => p.key === type || p.label === type);
              const unit = prDef?.unit || '';

              return (
                <div key={type} className={styles.recordCard}>
                  <div className={styles.recordHeader}>
                    <span className={styles.recordType}>{prDef?.label || type}</span>
                    <span className={styles.recordBest}>
                      {best.value} {unit}
                    </span>
                  </div>
                  <div className={styles.recordMeta}>
                    <span>Achieved: {best.date}</span>
                  </div>
                  {best.notes && (
                    <p className={styles.recordNotes}>"{best.notes}"</p>
                  )}
                  {history.length > 1 && (
                    <div className={styles.historySection}>
                      <span className={styles.historyLabel}>History:</span>
                      <div className={styles.historyList}>
                        {history.slice(1, 4).map((rec, i) => (
                          <span key={i} className={styles.historyItem}>
                            {rec.date}: {rec.value} {unit}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {showAddForm ? (
            <div className={styles.addForm}>
              <h3 className={styles.formTitle}>Add Personal Record</h3>
              <div className={styles.formGroup}>
                <label>Record Type</label>
                <select
                  value={newRecord.type}
                  onChange={(e) => setNewRecord({ ...newRecord, type: e.target.value })}
                  className={styles.select}
                >
                  <option value="">Select type...</option>
                  {prTypes.map(pr => (
                    <option key={pr.key} value={pr.key}>{pr.label}</option>
                  ))}
                  <option value="custom">Custom...</option>
                </select>
              </div>
              {newRecord.type === 'custom' && (
                <div className={styles.formGroup}>
                  <label>Custom Type Name</label>
                  <input
                    type="text"
                    value={newRecord.customType || ''}
                    onChange={(e) => setNewRecord({ ...newRecord, customType: e.target.value, type: e.target.value })}
                    className={styles.input}
                    placeholder="e.g., Longest Performance"
                  />
                </div>
              )}
              <div className={styles.formGroup}>
                <label>Value</label>
                <input
                  type="text"
                  value={newRecord.value}
                  onChange={(e) => setNewRecord({ ...newRecord, value: e.target.value })}
                  className={styles.input}
                  placeholder="e.g., 10"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Notes (optional)</label>
                <input
                  type="text"
                  value={newRecord.notes}
                  onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
                  className={styles.input}
                  placeholder="e.g., New PR! Felt great"
                />
              </div>
              <div className={styles.formActions}>
                <button
                  className={styles.cancelBtn}
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </button>
                <button
                  className={styles.saveBtn}
                  onClick={handleAddRecord}
                  disabled={isSaving || !newRecord.type || !newRecord.value}
                >
                  {isSaving ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </div>
          ) : (
            <button
              className={styles.addButton}
              onClick={() => setShowAddForm(true)}
            >
              + Add Personal Record
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default SkillPersonalRecords;
