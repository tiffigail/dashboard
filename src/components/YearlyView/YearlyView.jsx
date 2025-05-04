// src/components/YearlyView/YearlyView.jsx
import React, { useState, useEffect } from 'react';
import styles from './YearlyView.module.css'; // Import styles for this component
import { db } from '../../firebaseConfig'; // Import Firestore db instance
import { collection, getDocs, query, orderBy } from "firebase/firestore"; // Import Firestore functions

// Order of axes for display (matches planner/daily view)
// Ensure these names exactly match the 'axisName' field in your Firestore 'axes' collection
const axisDisplayOrder = [
  "Rest and preparation", "Physical", "Financial", "Gear",
  "ON TRACK N+1", "Misdirect", "Environment"
];

function YearlyView() {
  // == State ==
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allAxesData, setAllAxesData] = useState([]); // Array to store fetched axis data

  // == Fetch Data ==
  useEffect(() => {
    const fetchAxesData = async () => {
      setIsLoading(true);
      setError(null);
      console.log("YearlyView: Fetching all axes data...");

      try {
        const axesCollectionRef = collection(db, "axes");
        // Optional: Order by name if needed, though we use axisDisplayOrder later
        // const q = query(axesCollectionRef, orderBy("axisName"));
        const querySnapshot = await getDocs(axesCollectionRef);

        const fetchedAxes = {};
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.axisName) {
                 // Store data keyed by axisName for easy lookup and ordering
                fetchedAxes[data.axisName] = { id: doc.id, ...data };
            } else {
                console.warn(`Document ${doc.id} in 'axes' collection is missing 'axisName'.`);
            }
        });

        // Sort the fetched data according to the defined display order
        const sortedAxes = axisDisplayOrder
            .map(name => fetchedAxes[name]) // Get data object for each name in order
            .filter(axis => axis !== undefined); // Filter out any axes not found in Firestore

        setAllAxesData(sortedAxes);
        console.log("Sorted Axes Data:", sortedAxes);

      } catch (err) {
        console.error("Error fetching axes data:", err);
        setError("Failed to load yearly axis data.");
        setAllAxesData([]); // Set empty array on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchAxesData();
  }, []); // Runs once on mount

  return (
    <div className={styles.yearlyViewContainer}>
      <h2 className={styles.viewTitle}>Yearly Dashboard</h2>

      {isLoading ? (
        <p>Loading axes...</p>
      ) : error ? (
        <p className={styles.errorText}>{error}</p>
      ) : (
        // Grid container for the axis cards
        <div className={styles.axisGrid}>
          {allAxesData.length > 0 ? (
            allAxesData.map((axis) => (
              // Card for each axis
              <div key={axis.id} className={styles.axisCard}>
                {/* Flex container for card content (left/right) */}
                <div className={styles.cardContent}>
                  {/* Left side: Large Axis Title */}
                  <div className={styles.cardLeft}>
                    <h3 className={styles.axisTitleLg}>{axis.axisName}</h3>
                  </div>
                  {/* Right side: Goals */}
                  <div className={styles.cardRight}>
                    {/* Stretch Goal (Smaller, Spruce) */}
                    <p className={styles.stretchGoalText}>
                      {axis.stretchGoal || <i className={styles.notSet}>Stretch goal not set</i>}
                    </p>
                    {/* Yearly Goal (Larger, Peacock) */}
                    <p className={styles.yearlyGoalText}>
                      {axis.yearlyGoal || <i className={styles.notSet}>Yearly goal not set</i>}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p>No axis data found in Firestore.</p> // Message if no axes were loaded
          )}
        </div>
      )}
    </div>
  );
}

export default YearlyView;
