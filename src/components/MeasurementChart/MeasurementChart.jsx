import React, { useState, useEffect } from 'react';
import styles from './MeasurementChart.module.css';
import * as muscleBuildingService from '../../services/muscleBuildingService';

const BODY_PART_OPTIONS = [
  { value: 'thighs_left',    label: 'Left Thigh',       unit: 'cm' },
  { value: 'thighs_right',   label: 'Right Thigh',      unit: 'cm' },
  { value: 'calves_left',    label: 'Left Calf',        unit: 'cm' },
  { value: 'calves_right',   label: 'Right Calf',       unit: 'cm' },
  { value: 'hips',           label: 'Hips',             unit: 'cm' },
  { value: 'waist',          label: 'Waist',            unit: 'cm' },
  { value: 'upperArms_left', label: 'Left Upper Arm',   unit: 'cm' },
  { value: 'upperArms_right',label: 'Right Upper Arm',  unit: 'cm' },
  { value: 'forearms_left',  label: 'Left Forearm',     unit: 'cm' },
  { value: 'forearms_right', label: 'Right Forearm',    unit: 'cm' },
  { value: 'weight',         label: 'Weight',           unit: 'lbs' },
  { value: 'bodyFatPercent', label: 'Body Fat %',       unit: '%' },
];

function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${month}/${day}/${String(year).slice(2)}`;
}

function MeasurementChart({ userId }) {
  const [history, setHistory] = useState([]);
  const [selectedPart, setSelectedPart] = useState('thighs_left');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setIsLoading(true);
    muscleBuildingService.getMeasurementHistory(userId, 100).then(data => {
      setHistory(data);
      setIsLoading(false);
    });
  }, [userId]);

  const selectedOption = BODY_PART_OPTIONS.find(o => o.value === selectedPart);
  const unit = selectedOption?.unit || '';

  const dataPoints = history
    .filter(m => m[selectedPart] != null)
    .map(m => ({ date: m.date, value: m[selectedPart] }));

  const isEmpty = dataPoints.length === 0;

  return (
    <div className={styles.section}>
      <div className={styles.headerRow}>
        <h4 className={styles.title}>Measurement Progress</h4>
        <select
          value={selectedPart}
          onChange={e => setSelectedPart(e.target.value)}
          className={styles.select}
        >
          {BODY_PART_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className={styles.empty}>Loading...</p>
      ) : isEmpty ? (
        <p className={styles.empty}>No measurements logged yet for this body part.</p>
      ) : (
        <Chart dataPoints={dataPoints} unit={unit} />
      )}
    </div>
  );
}

function Chart({ dataPoints, unit }) {
  const values = dataPoints.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const chartHeight = 140;
  const chartWidth = 400;
  const padX = 36;
  const padY = 20;

  const points = dataPoints.map((d, i) => {
    const x = padX + (i / Math.max(dataPoints.length - 1, 1)) * (chartWidth - padX - 12);
    const y = chartHeight - padY - ((d.value - minVal) / range) * (chartHeight - padY * 2);
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const first = dataPoints[0];
  const last = dataPoints[dataPoints.length - 1];
  const totalChange = last.value - first.value;

  // Y-axis tick values
  const yTicks = [minVal, (minVal + maxVal) / 2, maxVal];

  return (
    <>
      <div className={styles.summary}>
        <span className={styles.summaryRange}>
          {formatShortDate(first.date)} → {formatShortDate(last.date)}
        </span>
        <span className={styles.summaryValues}>
          {first.value} → {last.value} {unit}
        </span>
        <span className={`${styles.summaryChange} ${totalChange > 0 ? styles.positive : totalChange < 0 ? styles.negative : ''}`}>
          {totalChange > 0 ? '+' : ''}{totalChange.toFixed(1)} {unit}
        </span>
      </div>

      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className={styles.chart}>
        {/* Y-axis grid lines */}
        {yTicks.map((tick, i) => {
          const y = chartHeight - padY - ((tick - minVal) / range) * (chartHeight - padY * 2);
          return (
            <g key={i}>
              <line x1={padX} x2={chartWidth - 12} y1={y} y2={y} stroke="#f0f0f0" strokeWidth="1" />
              <text x={padX - 4} y={y + 3} fontSize="8" fill="#bbb" textAnchor="end">{tick.toFixed(1)}</text>
            </g>
          );
        })}

        {/* Line */}
        <path d={pathD} fill="none" stroke="#e7514c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#e7514c" />
        ))}
      </svg>

      <div className={styles.dateLabels}>
        <span>{formatShortDate(first.date)}</span>
        {dataPoints.length > 2 && (
          <span>{formatShortDate(dataPoints[Math.floor(dataPoints.length / 2)].date)}</span>
        )}
        <span>{formatShortDate(last.date)}</span>
      </div>
    </>
  );
}

export default MeasurementChart;
