import React, { useState, useEffect } from 'react';
import styles from './SkillPerformanceTracker.module.css';
import * as skillBadgeService from '../../services/skillBadgeService';

function SkillPerformanceTracker({ badge, userId, onClose }) {
  const [performances, setPerformances] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    durationSeconds: '',
    setting: '',
    audienceType: '',
    audienceSize: '',
    feedback: '',
    videoUrl: '',
    spatialConsistency: '',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadPerformances();
  }, [userId, badge.skillId]);

  const loadPerformances = async () => {
    setIsLoading(true);
    try {
      const data = await skillBadgeService.getPerformanceHistory(userId, badge.skillId, 20);
      setPerformances(data);
    } catch (error) {
      console.error('Error loading performances:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await skillBadgeService.logPerformance(userId, badge.skillId, {
        ...formData,
        durationSeconds: parseInt(formData.durationSeconds) || 0,
        audienceSize: parseInt(formData.audienceSize) || 0,
        spatialConsistency: formData.spatialConsistency ? parseInt(formData.spatialConsistency) : null,
      });
      setFormData({
        title: '',
        description: '',
        durationSeconds: '',
        setting: '',
        audienceType: '',
        audienceSize: '',
        feedback: '',
        videoUrl: '',
        spatialConsistency: '',
        notes: '',
      });
      setShowAddForm(false);
      loadPerformances();
    } catch (error) {
      console.error('Error logging performance:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    return `${secs}s`;
  };

  const isMime = badge.skillId === 'invisible-wall-mastery';

  return (
    <div className={styles.tracker}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.heading}>{badge.emoji} Performance History</h2>
          <p className={styles.subtitle}>{badge.skillName}</p>
        </div>
        <button className={styles.closeButton} onClick={onClose}>&times;</button>
      </div>

      {isLoading ? (
        <p className={styles.loading}>Loading performances...</p>
      ) : (
        <>
          {performances.length === 0 && !showAddForm && (
            <div className={styles.emptyState}>
              <p>No performances logged yet.</p>
              <p className={styles.emptyHint}>Track your performances and get feedback!</p>
            </div>
          )}

          {performances.length > 0 && (
            <div className={styles.stats}>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{performances.length}</span>
                <span className={styles.statLabel}>Performances</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>
                  {formatDuration(Math.max(...performances.map(p => p.durationSeconds || 0)))}
                </span>
                <span className={styles.statLabel}>Longest</span>
              </div>
            </div>
          )}

          <div className={styles.performancesList}>
            {performances.map(perf => (
              <div key={perf.id} className={styles.perfCard}>
                <div className={styles.perfHeader}>
                  <span className={styles.perfTitle}>{perf.title || 'Untitled Performance'}</span>
                  <span className={styles.perfDate}>{perf.date}</span>
                </div>
                <div className={styles.perfMeta}>
                  <span>{formatDuration(perf.durationSeconds)}</span>
                  {perf.setting && <span>{perf.setting}</span>}
                  {perf.audienceSize > 0 && <span>{perf.audienceSize} viewers</span>}
                </div>
                {perf.description && (
                  <p className={styles.perfDesc}>{perf.description}</p>
                )}
                {perf.feedback && (
                  <div className={styles.perfFeedback}>
                    <span className={styles.feedbackLabel}>Feedback:</span> {perf.feedback}
                  </div>
                )}
                {isMime && perf.spatialConsistency && (
                  <div className={styles.spatialScore}>
                    Spatial Consistency: {perf.spatialConsistency}%
                  </div>
                )}
                {perf.videoUrl && (
                  <a href={perf.videoUrl} target="_blank" rel="noopener noreferrer" className={styles.videoLink}>
                    Watch Video
                  </a>
                )}
              </div>
            ))}
          </div>

          {showAddForm ? (
            <div className={styles.addForm}>
              <h3 className={styles.formTitle}>Log Performance</h3>
              <div className={styles.formGroup}>
                <label>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., The Windy Day"
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What was the story/scene?"
                  className={styles.textarea}
                  rows="2"
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Duration (seconds)</label>
                  <input
                    type="number"
                    value={formData.durationSeconds}
                    onChange={(e) => setFormData({ ...formData, durationSeconds: e.target.value })}
                    placeholder="90"
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Setting</label>
                  <input
                    type="text"
                    value={formData.setting}
                    onChange={(e) => setFormData({ ...formData, setting: e.target.value })}
                    placeholder="e.g., Park, Home"
                    className={styles.input}
                  />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Audience Type</label>
                  <input
                    type="text"
                    value={formData.audienceType}
                    onChange={(e) => setFormData({ ...formData, audienceType: e.target.value })}
                    placeholder="e.g., Family, Public"
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Audience Size</label>
                  <input
                    type="number"
                    value={formData.audienceSize}
                    onChange={(e) => setFormData({ ...formData, audienceSize: e.target.value })}
                    placeholder="10"
                    className={styles.input}
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Feedback Received</label>
                <textarea
                  value={formData.feedback}
                  onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                  placeholder="What did the audience say?"
                  className={styles.textarea}
                  rows="2"
                />
              </div>
              {isMime && (
                <div className={styles.formGroup}>
                  <label>Spatial Consistency (%)</label>
                  <input
                    type="number"
                    value={formData.spatialConsistency}
                    onChange={(e) => setFormData({ ...formData, spatialConsistency: e.target.value })}
                    placeholder="90"
                    min="0"
                    max="100"
                    className={styles.input}
                  />
                </div>
              )}
              <div className={styles.formGroup}>
                <label>Video URL (optional)</label>
                <input
                  type="text"
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  placeholder="https://..."
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="What worked? What to improve?"
                  className={styles.textarea}
                  rows="2"
                />
              </div>
              <div className={styles.formActions}>
                <button className={styles.cancelBtn} onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
                <button
                  className={styles.saveBtn}
                  onClick={handleSubmit}
                  disabled={isSaving || !formData.title}
                >
                  {isSaving ? 'Saving...' : 'Log Performance'}
                </button>
              </div>
            </div>
          ) : (
            <button className={styles.addButton} onClick={() => setShowAddForm(true)}>
              + Log New Performance
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default SkillPerformanceTracker;
