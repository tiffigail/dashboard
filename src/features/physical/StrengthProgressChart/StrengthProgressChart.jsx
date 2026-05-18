import React, { useState, useEffect } from 'react';
import styles from '@/features/physical/StrengthProgressChart/StrengthProgressChart.module.css';
import { getStrengthProgramById, estimateOneRepMax } from '@/data/strengthPrograms';
import * as muscleBuildingService from '@/services/muscleBuildingService';

function StrengthProgressChart({ userId, program }) {
  const template = getStrengthProgramById(program.templateId);
  const [selectedExercise, setSelectedExercise] = useState(template?.exercises[0]?.exerciseId || '');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!userId || !selectedExercise) return;
    muscleBuildingService.getWorkoutHistoryForExercise(userId, selectedExercise, 20)
      .then(h => setHistory(h.reverse()));
  }, [userId, selectedExercise]);

  if (!template) return null;

  // Get max weight per session for chart
  const dataPoints = history.map(h => {
    const maxWeight = Math.max(...(h.sets || []).map(s => s.weight || 0), 0);
    return { date: h.date, weight: maxWeight };
  }).filter(d => d.weight > 0);

  const exerciseOptions = template.exercises.map(ex => ({
    value: ex.exerciseId,
    label: ex.exerciseName.split('(')[0].trim(),
  }));

  if (dataPoints.length === 0) {
    return (
      <div className={styles.section}>
        <div className={styles.headerRow}>
          <h4 className={styles.title}>Strength Progress</h4>
          <select
            value={selectedExercise}
            onChange={e => setSelectedExercise(e.target.value)}
            className={styles.select}
          >
            {exerciseOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <p className={styles.empty}>No workout data yet for this exercise.</p>
      </div>
    );
  }

  const weights = dataPoints.map(d => d.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 10;
  const chartH = 120;
  const chartW = 300;
  const pad = 20;

  const points = dataPoints.map((d, i) => {
    const x = pad + (i / Math.max(dataPoints.length - 1, 1)) * (chartW - pad * 2);
    const y = chartH - pad - ((d.weight - minW) / range) * (chartH - pad * 2);
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const first = dataPoints[0];
  const last = dataPoints[dataPoints.length - 1];
  const totalGain = last.weight - first.weight;
  const est1RM = estimateOneRepMax(last.weight);

  return (
    <div className={styles.section}>
      <div className={styles.headerRow}>
        <h4 className={styles.title}>Strength Progress</h4>
        <select
          value={selectedExercise}
          onChange={e => setSelectedExercise(e.target.value)}
          className={styles.select}
        >
          {exerciseOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{last.weight} lbs</span>
          <span className={styles.statLabel}>Working Weight</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{est1RM} lbs</span>
          <span className={styles.statLabel}>Est. 1RM</span>
        </div>
        <div className={styles.stat}>
          <span className={`${styles.statValue} ${totalGain > 0 ? styles.positive : ''}`}>
            {totalGain > 0 ? '+' : ''}{totalGain} lbs
          </span>
          <span className={styles.statLabel}>Total Gain</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${chartW} ${chartH}`} className={styles.chart}>
        <path d={pathD} fill="none" stroke="#e7514c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#e7514c" />
        ))}
        <text x="2" y={pad} fontSize="8" fill="#999">{maxW} lbs</text>
        <text x="2" y={chartH - pad + 10} fontSize="8" fill="#999">{minW} lbs</text>
      </svg>

      <div className={styles.dateLabels}>
        <span>{first.date}</span>
        <span>{last.date}</span>
      </div>
    </div>
  );
}

export default StrengthProgressChart;
