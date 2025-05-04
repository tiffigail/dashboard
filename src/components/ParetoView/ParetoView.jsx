// src/components/ParetoView/ParetoView.jsx
import React, { useState, useEffect } from 'react';
import styles from './ParetoView.module.css'; // Import styles for this component
import { db } from '../../firebaseConfig'; // Import Firestore db instance
import { collection, getDocs, query, orderBy } from "firebase/firestore"; // Import Firestore functions

// Order of axes for display (matches other views)
// Ensure these names exactly match the 'axisName' field in your Firestore 'axes' collection
const axisDisplayOrder = [
  "Rest and preparation", "Physical", "Financial", "Gear",
  "ON TRACK N+1", "Misdirect", "Environment"
];

function ParetoView() {
  // == State ==
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allAxesData, setAllAxesData] = useState([]); // Array to store fetched axis data

  // == Fetch Data ==
  useEffect(() => {
    const fetchAxesData = async () => {
      setIsLoading(true);
      setError(null);
      console.log("ParetoView: Fetching all axes data...");

      try {
        const axesCollectionRef = collection(db, "axes");
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
        console.log("Sorted Axes Data for Pareto View:", sortedAxes);

      } catch (err) {
        console.error("Error fetching axes data:", err);
        setError("Failed to load Pareto axis data.");
        setAllAxesData([]); // Set empty array on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchAxesData();
  }, []); // Runs once on mount

  return (
    <div className={styles.paretoViewContainer}>
      <h2 className={styles.viewTitle}>Pareto View: The 80/20 Experiment</h2>

      {/* Introduction Text Section */}
      <div className={styles.introSection}>
        <h3>Embracing the 80/20 Rule: A 5-Year Experiment in Intentional Living</h3>
        <p><strong>Purpose:</strong> To navigate feelings of pointlessness and increase motivation and stamina by structuring the next five years around the Pareto principle, identifying the most productive 20% of efforts within chosen life axes, and fostering unexpected insights and a sense of completion. 5 axes where I've identified the 20% most effective actions means 100% of my efforts will be effective.</p>
        <h4>Outline of Method:</h4>
        <ol>
          <li><strong>Establish Five Axes of Focus:</strong> Divide life into five key areas for observation and experimentation:
            <ul>
                <li>Misdirect: Employing strategic distractions to maintain productivity and prevent fatigue.</li>
                <li>Physical (Be a Mime): Achieving mastery of movement and making the body an "optical illusion."</li>
                <li>Financial ($ Money Dollars): Ensuring survival and funding other endeavors, aiming for a shift in perspective towards earning based on value.</li>
                <li>Mental (GearShift): Creating a mental system ("Liahona") for mind control and aligning with personal values.</li>
                <li>Environment: Shaping surroundings as a reflection of the inner mind, fostering a sense of control and ease.</li>
            </ul>
           </li>
          <li><strong>Identify the Productive 20%:</strong> Within each axis, observe efforts and identify the 20% of actions that yield 80% of the desired results. The intention is to eventually prune the less productive 80%.</li>
          <li><strong>Engage Mentors and Protocols:</strong>
            <ul>
                <li>Mentors: Utilize symbolic figures (e.g., Wilfredo Pareto, Mimechael Jackson) as a "Mental Board of Directors" for external perspectives.</li>
                <li>Protocols: Develop recurring processes (e.g., planning, data collection, savoring, resetting space) to automate routine actions and enhance focus.</li>
            </ul>
          </li>
          <li><strong>Define Ultimate Goals for Each Axis:</strong> Establish specific, tangible outputs for each of the five axes to work towards over the five-year period.</li>
          <li><strong>Embrace Misdirects and Redirect:</strong> Recognize the value of distractions for rejuvenation but emphasize the importance of intentional re-orientation to avoid getting lost in loops.</li>
          <li><strong>Focus on Year One (Goldilocks):</strong> Begin by "tuning to just right" within the established framework, exploring the boundaries and finding a balance within each axis.</li>
          <li><strong>Anticipate Unexpected Outcomes:</strong> Acknowledge that the final "proof or sign" of the experiment's value will likely be something unforeseen, a personal "ah-ha" moment that provides a sense of completion and readiness for the next phase of life.</li>
        </ol>
      </div>


      {/* Display Area for Axis Stretch Goals */}
      {isLoading ? (
        <p>Loading axes...</p>
      ) : error ? (
        <p className={styles.errorText}>{error}</p>
      ) : (
        // Use axisGrid for stacking cards
        <div className={styles.axisGrid}>
          {allAxesData.length > 0 ? (
            allAxesData.map((axis) => (
              // Card for each axis
              <div key={axis.id} className={styles.axisCard}>
                {/* Flex container for card content */}
                <div className={styles.cardContent}>
                  {/* Left side: Large Axis Title */}
                  <div className={styles.cardLeft}>
                    <h3 className={styles.axisTitle}>{axis.axisName}</h3>
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

export default ParetoView;
