// src/components/Tooltip/Tooltip.jsx
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import styles from '@/components/ui/Tooltip/Tooltip.module.css';

const Tooltip = ({ children, text, className }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      top: rect.top - 10, // Position above the element with a gap
      left: rect.left + rect.width / 2, // Center horizontally
    });
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  return (
    <div 
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave}
      className={`${styles.tooltipWrapper} ${className || ''}`} 
    >
      {children}
      {isVisible && ReactDOM.createPortal(
        <div 
          className={styles.tooltipBox} 
          style={{ top: position.top, left: position.left }}
        >
          {text}
        </div>,
        document.body // This is the 'portal' to the top of the page
      )}
    </div>
  );
};

export default Tooltip;