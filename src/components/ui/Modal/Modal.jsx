import React from 'react';
import styles from '@/components/ui/Modal/Modal.module.css';

// Props:
// - isOpen: boolean - Controls if the modal is visible
// - onClose: function - Called when the modal should be closed
// - children: ReactNode - The content to display inside the modal
// - closeOnClickOutside: boolean (optional, default: false) - If true, clicking backdrop closes modal

// --- THE ONLY CHANGE IS HERE: The default value is now `false` ---
function Modal({ isOpen, onClose, children, closeOnClickOutside = false, zIndex }) {
  if (!isOpen) {
    return null;
  }

  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className={styles.modalBackdrop} style={{ zIndex: zIndex }} onClick={closeOnClickOutside ? onClose : null}>
      <div className={styles.modalContent} onClick={handleContentClick}>
        <button className={styles.closeButton} onClick={onClose}>
          &times;
        </button>
        {children}
      </div>
    </div>
  );
}

export default Modal;