// src/components/Modal/Modal.jsx
import React from 'react';
import styles from './Modal.module.css';

// Props:
// - isOpen: boolean - Controls if the modal is visible
// - onClose: function - Called when the modal should be closed (e.g., clicking backdrop or close button)
// - children: ReactNode - The content to display inside the modal
function Modal({ isOpen, onClose, children }) {
  // If the modal isn't open, don't render anything
  if (!isOpen) {
    return null;
  }

  // Prevent clicks inside the modal content from closing the modal
  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  return (
    // The modal backdrop (semi-transparent background)
    // Clicking the backdrop calls the onClose function
    <div className={styles.modalBackdrop} onClick={onClose}>
      {/* The modal content area */}
      <div className={styles.modalContent} onClick={handleContentClick}>
        {/* A simple close button */}
        <button className={styles.closeButton} onClick={onClose}>
          &times; {/* HTML entity for 'X' */}
        </button>
        {/* Render the content passed into the modal */}
        {children}
      </div>
    </div>
  );
}

export default Modal;
