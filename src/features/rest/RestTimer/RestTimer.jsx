import React, { useState, useEffect, useRef } from 'react';
import styles from '@/features/rest/RestTimer/RestTimer.module.css';

function RestTimer({ seconds = 180, onComplete, onSkip }) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [seconds, onComplete]);

  const handleSkip = () => {
    clearInterval(intervalRef.current);
    onSkip?.();
  };

  const progress = 1 - remaining / seconds;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  // SVG circle
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className={styles.timer}>
      <div className={styles.ringContainer}>
        <svg viewBox="0 0 120 120" className={styles.ring}>
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#e0e0e0" strokeWidth="6" />
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke="#e7514c"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 60 60)"
            className={styles.progressRing}
          />
        </svg>
        <div className={styles.timeDisplay}>
          <span className={styles.time}>{mins}:{secs.toString().padStart(2, '0')}</span>
          <span className={styles.label}>REST</span>
        </div>
      </div>
      <button onClick={handleSkip} className={styles.skipButton}>
        Skip Rest
      </button>
    </div>
  );
}

export default RestTimer;
