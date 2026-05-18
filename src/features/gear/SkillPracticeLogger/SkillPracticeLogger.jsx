import React, { useState } from 'react';
import styles from '@/features/gear/SkillPracticeLogger/SkillPracticeLogger.module.css';
import { getSkillBadgeTemplateById } from '@/data/skillBadgeTemplates';
import * as skillBadgeService from '@/services/skillBadgeService';
import { saveCorpusEntry } from '@/services/advisorService';

function SkillPracticeLogger({ badge, userId, onClose, onSave }) {
  const template = getSkillBadgeTemplateById(badge.skillId);
  const currentLevelData = badge.levels?.find(l => l.levelNumber === badge.currentLevel);
  const templateLevel = template?.levels?.find(l => l.levelNumber === badge.currentLevel);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [duration, setDuration] = useState('');
  const [energyLevel, setEnergyLevel] = useState('medium');
  const [drillsPracticed, setDrillsPracticed] = useState({});
  const [breakthroughs, setBreakthroughs] = useState('');
  const [challenges, setChallenges] = useState('');
  const [nextFocus, setNextFocus] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [spatialConsistency, setSpatialConsistency] = useState('');
  const [musicUsed, setMusicUsed] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isMime = badge.skillId === 'invisible-wall-mastery';
  const isMoonwalk = badge.skillId === 'moonwalk-mastery';
  const isPullups = badge.skillId === 'pullups-mastery';

  const handleDrillToggle = (drillName) => {
    setDrillsPracticed(prev => ({
      ...prev,
      [drillName]: {
        ...prev[drillName],
        practiced: !prev[drillName]?.practiced,
      }
    }));
  };

  const handleDrillNote = (drillName, note) => {
    setDrillsPracticed(prev => ({
      ...prev,
      [drillName]: {
        ...prev[drillName],
        notes: note,
      }
    }));
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const practicedDrills = Object.entries(drillsPracticed)
        .filter(([_, data]) => data.practiced)
        .map(([drillName, data]) => ({
          drillName,
          notes: data.notes || '',
        }));

      const sessionData = {
        date,
        totalDuration: parseInt(duration) || 0,
        energyLevel,
        drillsPracticed: practicedDrills,
        breakthroughs,
        challenges,
        nextFocus,
        videoUrl,
        notes,
        ...(isMime && spatialConsistency ? { spatialConsistency: parseInt(spatialConsistency) } : {}),
        ...(isMoonwalk && musicUsed ? { musicUsed } : {}),
      };

      await skillBadgeService.logPracticeSession(userId, badge.skillId, sessionData);
      if (userId && (sessionData.breakthroughs || sessionData.challenges || sessionData.nextFocus)) {
        const rawParts = [
          sessionData.breakthroughs && `Breakthroughs: ${sessionData.breakthroughs}`,
          sessionData.challenges && `Challenges: ${sessionData.challenges}`,
          sessionData.nextFocus && `Next focus: ${sessionData.nextFocus}`,
        ].filter(Boolean);
        const stateMap = { high: 'flow', medium: 'settled', low: 'depleted' };
        saveCorpusEntry(userId, {
          type: 'study',
          axis: ['physical'],
          themes: ['gym'],
          voice_markers: sessionData.breakthroughs ? ['breakthrough'] : [],
          state: stateMap[sessionData.energyLevel] || 'settled',
          significance: sessionData.breakthroughs ? 3 : 2,
          summary: `${badge.title || 'Skill'} practice. ${sessionData.breakthroughs || ''}`.trim().slice(0, 150),
          raw: rawParts.join('\n\n'),
        }).catch(() => {});
      }
      onSave && onSave();
    } catch (error) {
      console.error('Error logging practice:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.logger}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.heading}>Log Practice Session</h2>
          <p className={styles.subtitle}>
            {badge.emoji} {badge.skillName} - Level {badge.currentLevel}: {currentLevelData?.levelName}
          </p>
        </div>
        <button className={styles.closeButton} onClick={onClose}>&times;</button>
      </div>

      <div className={styles.formSection}>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Duration (minutes)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="30"
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Energy Level</label>
          <div className={styles.energyOptions}>
            {['low', 'medium', 'high'].map(level => (
              <button
                key={level}
                className={`${styles.energyBtn} ${energyLevel === level ? styles.energyActive : ''}`}
                onClick={() => setEnergyLevel(level)}
                type="button"
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.drillsSection}>
        <h3 className={styles.sectionTitle}>Drills Practiced</h3>
        {templateLevel?.drills?.map(drill => {
          const badgeDrill = currentLevelData?.drills?.find(d => d.name === drill.name);
          const isCompleted = badgeDrill?.completed;

          return (
            <div key={drill.name} className={styles.drillItem}>
              <div className={styles.drillHeader}>
                <label className={styles.drillLabel}>
                  <input
                    type="checkbox"
                    checked={drillsPracticed[drill.name]?.practiced || false}
                    onChange={() => handleDrillToggle(drill.name)}
                    className={styles.checkbox}
                  />
                  <span className={styles.drillName}>
                    {drill.name}
                    {isCompleted && <span className={styles.completedTag}>Completed</span>}
                  </span>
                </label>
                <span className={styles.drillFreq}>{drill.frequency}</span>
              </div>
              {drillsPracticed[drill.name]?.practiced && (
                <input
                  type="text"
                  placeholder="Notes for this drill..."
                  value={drillsPracticed[drill.name]?.notes || ''}
                  onChange={(e) => handleDrillNote(drill.name, e.target.value)}
                  className={styles.drillNotes}
                />
              )}
            </div>
          );
        })}
      </div>

      {isMime && (
        <div className={styles.formGroup}>
          <label>Spatial Consistency (%)</label>
          <input
            type="number"
            value={spatialConsistency}
            onChange={(e) => setSpatialConsistency(e.target.value)}
            placeholder="85"
            min="0"
            max="100"
            className={styles.input}
          />
          <span className={styles.hint}>How well did you maintain fixed points today?</span>
        </div>
      )}

      {isMoonwalk && (
        <div className={styles.formGroup}>
          <label>Music Used</label>
          <input
            type="text"
            value={musicUsed}
            onChange={(e) => setMusicUsed(e.target.value)}
            placeholder="Billie Jean - Michael Jackson"
            className={styles.input}
          />
        </div>
      )}

      <div className={styles.formSection}>
        <h3 className={styles.sectionTitle}>Reflections</h3>
        <div className={styles.formGroup}>
          <label>Breakthroughs</label>
          <textarea
            value={breakthroughs}
            onChange={(e) => setBreakthroughs(e.target.value)}
            placeholder="What clicked today? Any new skills unlocked?"
            className={styles.textarea}
            rows="2"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Challenges</label>
          <textarea
            value={challenges}
            onChange={(e) => setChallenges(e.target.value)}
            placeholder="What was difficult? What needs more work?"
            className={styles.textarea}
            rows="2"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Next Focus</label>
          <input
            type="text"
            value={nextFocus}
            onChange={(e) => setNextFocus(e.target.value)}
            placeholder="What to focus on next session"
            className={styles.input}
          />
        </div>
      </div>

      <div className={styles.formGroup}>
        <label>Video URL (optional)</label>
        <input
          type="text"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://..."
          className={styles.input}
        />
      </div>

      <div className={styles.formGroup}>
        <label>Additional Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any other observations..."
          className={styles.textarea}
          rows="2"
        />
      </div>

      <button
        className={styles.saveButton}
        onClick={handleSubmit}
        disabled={isSaving || !duration}
      >
        {isSaving ? 'Saving...' : 'Save Practice Log'}
      </button>
    </div>
  );
}

export default SkillPracticeLogger;
