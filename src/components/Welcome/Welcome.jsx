import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Welcome.module.css';

const Welcome = () => {
  return (
    <div className={styles.welcomeContainer}>
      <div className={styles.contentCard}>
        <h1 className={styles.headline}>Architecting a Framework for Excellence</h1>
        
        <p className={styles.subheadline}>
          A planning and analysis tool with a systematic approach to personal growth and intentional living.
        </p>

        <div className={styles.textBlock}>
          <p>
            I built this project to manage ambitious, long-term goals and create a framework for building something truly significant. It's a digital ecosystem where I apply professional project management and data analysis concepts to personal development, allowing me to see tangible results and more effectively utilize my own mental capabilities.
          </p>
          <p>
            This entire application was built as a partnership with AI, demonstrating a strategic, iterative process to translate a complex vision into a functional, human-centric tool.
          </p>
        </div>

        <div className={styles.buttonContainer}>
          <Link to="/concepts" className={styles.primaryButton}>Start Guided Tour</Link>
          <Link to="/login" className={styles.secondaryButton}>Personal Login</Link>
        </div>
      </div>
    </div>
  );
};

export default Welcome;