// src/components/Timeline/Subcomponents/TimelineItem/TimelineItem.jsx
import React, { useEffect } from 'react'; // <--- ADDED useEffect here
import styles from './TimelineItem.module.css';

// A simple, local component to render a single weekly plan card
const WeeklyPlanCard = React.memo(({ plan, axisName, milestoneIndex, subIndex }) => {
    const toDate = (d) => {
        if (!d) return null;
        if (d instanceof Date) return d;
        const date = d.seconds ? new Date(d.seconds * 1000) : new Date(d);
        return isNaN(date.getTime()) ? null : date;
    };
    
    let goalText = 'No goal set.';
    const goalData = plan.axisGoals && axisName ? plan.axisGoals[axisName] : null;

    if (typeof goalData === 'string') {
        goalText = goalData;
    } else if (typeof goalData === 'object' && goalData !== null && goalData.goal) {
        goalText = goalData.goal;
    }

    const createdAt = toDate(plan.createdAt);

    // DEBUG LOG: What WeeklyPlanCard is rendering
    // console.log(`[WeeklyPlanCard Debug] Milestone: ${milestoneIndex}.${subIndex + 1}, Plan ID: ${plan.id}, Goal: "${goalText}"`);

    return (
        <div className={styles.weeklyPlanCard}>
            <div className={styles.weeklyPlanHeader}>
                <span className={styles.weeklyPlanNumber}>{milestoneIndex}.{subIndex + 1}</span>
                <span className={styles.weeklyPlanDate}>{createdAt?.toLocaleDateString()}</span>
            </div>
            <p className={styles.weeklyPlanGoal}>{goalText}</p>
        </div>
    );
});


const TimelineItem = React.memo(({
    item,
    index,
    level2Children = [], // This is the array of weekly plans coming from the parent
    axisName,
    isExpanded,
    onToggleExpand,
}) => {
    
    const toDate = (d) => {
        if (!d) return null;
        if (d instanceof Date) return d;
        const date = d.seconds ? new Date(d.seconds * 1000) : new Date(d);
        return isNaN(date.getTime()) ? null : date;
    };
    const isCompleted = !!item.completionDate;
    const iconClasses = `${styles.milestoneIcon} ${isCompleted ? styles.completed : ''}`;
    const dueDate = toDate(item.dueDate);
    const completionDate = toDate(item.completionDate);

    // DEBUG LOG: What TimelineItem receives as level2Children
    // This useEffect was for debugging, commented out for cleaner code as requested previously.
    // If you need it back, uncomment it and its console.log lines.
    /*
    useEffect(() => {
        if (isExpanded) {
            console.log(`[TimelineItem Debug] Milestone "${item.text}" (ID: ${item.id}) - received ${level2Children.length} level2Children:`);
            level2Children.forEach((child, i) => {
                console.log(`  Child ${i}: ID=${child.id}, CreatedAt=${toDate(child.createdAt)?.toLocaleDateString()}, Goal=${child.axisGoals?.[axisName]?.goal || child.axisGoals?.[axisName]}`);
            });
            const uniqueChildIds = new Set(level2Children.map(c => c.id).filter(id => id !== undefined && id !== null));
            if (uniqueChildIds.size !== level2Children.length) {
                console.warn(`[TimelineItem Debug] WARNING: Duplicate or missing IDs detected among level2Children for Milestone ID ${item.id}. Unique IDs found: ${uniqueChildIds.size}/${level2Children.length}`);
            }
        }
    }, [level2Children, isExpanded, item.id, item.text, axisName]);
    */


    return (
        <div className={styles.timelineItemGroup}>
            
            <div className={`${styles.level2Container} ${isExpanded ? styles.expanded : ''}`}>
                {isExpanded && level2Children.length > 0 ? (
                    level2Children.map((child, subIndex) => (
                        // Fallback key added for robustness if child.id is ever missing/null
                        <React.Fragment key={child.id || `wp-fallback-${child.createdAt?.seconds || 'no-date'}-${subIndex}`}>
                            <WeeklyPlanCard 
                                plan={child} 
                                axisName={axisName} 
                                milestoneIndex={index + 1}
                                subIndex={subIndex}
                            />
                            {subIndex < level2Children.length - 1 && <div className={styles.miniLine}></div>}
                        </React.Fragment>
                    ))
                    ) : isExpanded ? (
                    <div className={styles.noSubItems}>No weekly plans for this period.</div>
                    ) : null}
            </div>

            <div className={styles.milestoneNode}>
                <div className={styles.milestoneIconWrapper}>
                    <div className={iconClasses}>{index + 1}</div>
                     <button onClick={onToggleExpand} className={styles.expandButton}>
                        {isExpanded ? '−' : '+'}
                    </button>
                </div>
                
                <div className={styles.milestoneDetails}>
                    <p className={`${styles.milestoneText} ${isCompleted ? styles.completedText : ''}`}>
                        {item.text || "No text provided"}
                    </p>
                    {isCompleted ? (
                        <p className={`${styles.milestoneDate} ${styles.completedDate}`}>
                            Completed: {completionDate?.toLocaleDateString()}
                        </p>
                    ) : (
                        dueDate && (
                            <p className={`${styles.milestoneDate}`}>
                                Due: {dueDate?.toLocaleDateString()}
                            </p>
                        )
                    )}
                </div>
            </div>
        </div>
    );
});

export default TimelineItem;