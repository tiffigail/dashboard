import React, { useState, useEffect } from 'react';
import styles from '@/features/physical/MeasurementLogger/MeasurementLogger.module.css';
import * as muscleBuildingService from '@/services/muscleBuildingService';

function MeasurementLogger({ userId, onClose, onSave }) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [isSaving, setIsSaving] = useState(false);
  const [lastMeasurement, setLastMeasurement] = useState(null);

  const [measurements, setMeasurements] = useState({
    thighs_left: '', thighs_right: '',
    calves_left: '', calves_right: '',
    hips: '',
    waist: '',
    upperArms_left: '', upperArms_right: '',
    forearms_left: '', forearms_right: '',
    weight: '', bodyFatPercent: '',
    notes: '',
  });

  useEffect(() => {
    muscleBuildingService.getLatestMeasurement(userId).then(m => {
      if (m) setLastMeasurement(m);
    });
  }, [userId]);

  const handleChange = (field, value) => {
    setMeasurements(prev => ({ ...prev, [field]: value }));
  };

  const getChange = (field) => {
    if (!lastMeasurement || lastMeasurement[field] == null || measurements[field] === '') return null;
    const diff = parseFloat(measurements[field]) - parseFloat(lastMeasurement[field]);
    if (isNaN(diff)) return null;
    return diff;
  };

  const formatChange = (diff, unit) => {
    if (diff === null) return '';
    const sign = diff > 0 ? '+' : '';
    return `${sign}${diff.toFixed(1)} ${unit}`;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const data = {};
      for (const [key, val] of Object.entries(measurements)) {
        if (key === 'notes') {
          data.notes = val;
        } else if (val !== '' && val !== null) {
          data[key] = parseFloat(val);
        }
      }
      await muscleBuildingService.logMeasurement(userId, date, data);
      onSave();
    } catch (error) {
      console.error("Error saving measurement:", error);
      alert("Failed to save measurement.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (label, field, unit) => {
    const change = getChange(field);
    const last = lastMeasurement?.[field];
    return (
      <div className={styles.fieldRow} key={field}>
        <label className={styles.fieldLabel}>{label}</label>
        <div className={styles.fieldInput}>
          <input
            type="number"
            value={measurements[field]}
            onChange={e => handleChange(field, e.target.value)}
            className={styles.input}
            placeholder={last != null ? String(last) : '0'}
            step="0.1"
          />
          <span className={styles.unit}>{unit}</span>
        </div>
        {change !== null && (
          <span className={`${styles.change} ${change > 0 ? styles.changePositive : change < 0 ? styles.changeNegative : ''}`}>
            {formatChange(change, unit)}
          </span>
        )}
        {last != null && measurements[field] === '' && (
          <span className={styles.lastValue}>Last: {last}</span>
        )}
      </div>
    );
  };

  return (
    <div className={styles.logger}>
      <div className={styles.headerRow}>
        <h3 className={styles.heading}>Log Measurements</h3>
        <button onClick={onClose} className={styles.closeButton}>×</button>
      </div>

      <div className={styles.formGroup}>
        <label>Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className={styles.dateInput} />
      </div>

      {lastMeasurement && (
        <p className={styles.lastMeasuredNote}>Last measured: {lastMeasurement.date} — only fill in what changed</p>
      )}

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Thighs</h4>
        {renderField('Left Thigh', 'thighs_left', 'cm')}
        {renderField('Right Thigh', 'thighs_right', 'cm')}
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Calves</h4>
        {renderField('Left Calf', 'calves_left', 'cm')}
        {renderField('Right Calf', 'calves_right', 'cm')}
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Torso</h4>
        {renderField('Hips', 'hips', 'cm')}
        {renderField('Waist', 'waist', 'cm')}
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Arms</h4>
        {renderField('Left Upper Arm', 'upperArms_left', 'cm')}
        {renderField('Right Upper Arm', 'upperArms_right', 'cm')}
        {renderField('Left Forearm', 'forearms_left', 'cm')}
        {renderField('Right Forearm', 'forearms_right', 'cm')}
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>General</h4>
        {renderField('Weight', 'weight', 'lbs')}
        {renderField('Body Fat', 'bodyFatPercent', '%')}
      </div>

      <div className={styles.formGroup}>
        <label>Notes (optional)</label>
        <textarea
          value={measurements.notes}
          onChange={e => handleChange('notes', e.target.value)}
          placeholder="Any notes..."
          className={styles.notesInput}
          rows="2"
        />
      </div>

      <div className={styles.actions}>
        <button onClick={onClose} className={styles.cancelButton}>Cancel</button>
        <button onClick={handleSave} className={styles.saveButton} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Measurements'}
        </button>
      </div>
    </div>
  );
}

export default MeasurementLogger;
