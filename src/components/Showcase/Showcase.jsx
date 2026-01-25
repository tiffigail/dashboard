import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // No longer need useNavigate
import styles from './Showcase.module.css';

const slidesData = [
  {
    image: '/portfolio/lifemap.png',
    title: 'The Life Map: A 10,000-Foot View',
    description: 'This zoomable timeline connects long-term personal eras to tangible project outcomes, demonstrating the ability to maintain a high-level strategic vision.'
  },
  {
    image: '/portfolio/timeline.png',
    title: 'Zoomable Timelines: From Vision to Action',
    description: 'The core architecture uses a "modal-within-a-modal" system, allowing users to dive deep into a specific goal and manage tasks without ever losing the broader context.'
  },
  {
    image: '/portfolio/processingmodals.png',
    title: 'Guided Processing & Data Collection',
    description: 'Modals are used strategically to guide habit formation, process user experience through structured reflection, and act as a primary data-gathering portal for later analysis.'
  },
  {
    image: '/portfolio/monthkanban.png',
    title: 'Integrated Project Management',
    description: 'Users can organize complex projects using a Kanban-style board. Each project is fully integrated with the larger goal and tasking system, ensuring tactical work aligns with strategic objectives.'
  },
  {
    image: '/portfolio/month.png',
    title: 'Thematic Sprint Planning',
    description: 'The Month View pairs time with themes, allowing users to schedule focused sprints and visualize them alongside concurrent events. This ensures a balanced allocation of effort across all life axes.'
  },
  {
    image: '/portfolio/weekplanmodal.png',
    title: 'Dynamic Weekly Planning & Goal Setting',
    description: 'Beyond project management, the system enables dynamic weekly goal generation, directly aligning with upcoming milestones and clearly defining actionable next steps.'
  },
  {
    image: '/portfolio/Daily.png',
    title: 'Multi-Scope Dashboards & Progress Analysis',
    description: 'Each dashboard provides a unique scope of time and a tailored analysis of progress from that perspective, offering comprehensive insights.'
  }
];

const Showcase = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = () => {
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? slidesData.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  const goToNext = () => {
    const isLastSlide = currentIndex === slidesData.length - 1;
    // We no longer navigate programmatically from here
    if (!isLastSlide) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToSlide = (slideIndex) => {
    setCurrentIndex(slideIndex);
  };

  const isLastSlide = currentIndex === slidesData.length - 1;

  return (
    <div className={styles.showcaseContainer}>
        <h1 className={styles.headline}>Key Architectural Features</h1>
        <p className={styles.intro}>
            The application is a series of interconnected dashboards, allowing the user to seamlessly zoom from a high-level life map all the way down to the focus of a single hour.
        </p>
        <div className={styles.carouselContainer}>
            <div className={styles.leftArrow} onClick={goToPrevious}>❮</div>
            
            {/* --- NEW: Conditional Right Arrow / Final Link --- */}
            {isLastSlide ? (
              <Link to="/demo" className={styles.finalLink}>
                Next: Try the Demo!
              </Link>
            ) : (
              <div className={styles.rightArrow} onClick={goToNext}>❯</div>
            )}
            
            <div className={styles.slider} style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
                {slidesData.map((slide, index) => (
                    <div className={styles.slide} key={index}>
                        <div className={styles.imageContainer}>
                          <img src={slide.image} alt={slide.title} className={styles.screenshotImage} />
                        </div>
                        <div className={styles.textContainer}>
                            <h2 className={styles.screenshotTitle}>{slide.title}</h2>
                            <p className={styles.caption}>{slide.description}</p>
                        </div>
                    </div>
                ))}
            </div>
            <div className={styles.dotsContainer}>
                {slidesData.map((slide, slideIndex) => (
                    <div
                        key={slideIndex}
                        className={`${styles.dot} ${currentIndex === slideIndex ? styles.activeDot : ''}`}
                        onClick={() => goToSlide(slideIndex)}
                    ></div>
                ))}
            </div>
        </div>
    </div>
  );
};

export default Showcase;