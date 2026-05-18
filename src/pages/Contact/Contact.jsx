import React from 'react';
import styles from '@/pages/Contact/Contact.module.css';

const Contact = () => {
  return (
    <div className={styles.contactContainer}>
      <div className={styles.contentCard}>
        <h1 className={styles.headline}>Thank You</h1>
        <p className={styles.textBlock}>
          This project was a deep dive into building human-centric systems with AI as a strategic partner. If my mission-driven approach and technical skills align with your team's goals, I would be thrilled to discuss the opportunity further.
        </p>
        <div className={styles.buttonContainer}>
          <a href="https://www.linkedin.com/in/abigail-harrison-209b9938/" target="_blank" rel="noopener noreferrer" className={styles.primaryButton}>
            View on LinkedIn
          </a>
          <a href="https://github.com/Abi-Harrison/dashboard" target="_blank" rel="noopener noreferrer" className={styles.secondaryButton}>
            View Code on GitHub
          </a>
          <a href="https://firebasestorage.googleapis.com/v0/b/dashboard-bb237.firebasestorage.app/o/Financial%2FPortfolio%2FAbi.Harrison%20Resume%209.19%202025.pdf?alt=media&token=56168fe0-e89d-471a-afcc-ba3553e26872" download="Abigail Harrison - Resume.pdf" className={styles.secondaryButton}>
            Download Resume
          </a>
          <a href="https://firebasestorage.googleapis.com/v0/b/dashboard-bb237.firebasestorage.app/o/Financial%2FPortfolio%2FManaging%20Ambiguity.pdf?alt=media&token=3a7cb761-bee3-448f-93bd-71b87dc6b454" download="Project Documentation Example.pdf" className={styles.secondaryButton}>
            Preview Documentation Sample
          </a>
        </div>
      </div>
    </div>
  );
};

export default Contact;