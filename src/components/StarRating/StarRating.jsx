// src/components/StarRating/StarRating.jsx
import React from 'react';
import styles from './StarRating.module.css'; // Create this CSS file

// Reusable Star Rating Component
// Props: rating (current rating), setRating (function to update rating), disabled (boolean)
function StarRating({ rating, setRating, disabled = false, maxRating = 5 }) {
    return (
        <div className={styles.starRating}>
            {[...Array(maxRating)].map((star, index) => {
                const ratingValue = index + 1;
                return (
                    <button
                        type="button"
                        key={ratingValue}
                        className={ratingValue <= rating ? styles.on : styles.off}
                        onClick={() => !disabled && setRating(ratingValue)}
                        disabled={disabled}
                        aria-label={`Rate ${ratingValue} out of ${maxRating} stars`}
                    >
                        <span className={styles.star}>&#9733;</span> {/* Star character */}
                    </button>
                );
            })}
        </div>
    );
}

export default StarRating;
