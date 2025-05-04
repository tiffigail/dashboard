// src/components/LifeMapView/LifeMapView.jsx
import React, { useState, useEffect } from 'react';
import styles from './LifeMapView.module.css';

// --- Helper Functions ---
function calculatePosition(date, startDate, endDate) {
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    const eventTime = date.getTime();
    const totalDuration = endTime - startTime;

    if (totalDuration <= 0) {
        console.warn("Timeline total duration is zero or negative.");
        return 50;
    }
    const clampedEventTime = Math.max(startTime, Math.min(eventTime, endTime));
    const positionPercentage = ((clampedEventTime - startTime) / totalDuration) * 100;
    return positionPercentage;
}

function formatDate(date) {
    if (!date) return '';
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(date) {
     if (!date) return '';
     return date.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}
// --- End Helper Functions ---

function LifeMapView() {
    // --- Define Timeline Boundaries ---
    const birthDate = new Date(1987, 4, 2); // May 2, 1987
    const now = new Date();
    const endDate = new Date(birthDate.getFullYear() + 100, birthDate.getMonth(), birthDate.getDate()); // Extend to 100 years

    // --- Define Life Events and Spans ---
    const lifeEvents = [
        { id: 1, type: 'event', date: new Date(1987, 4, 2), title: '1. Born', description: 'Richmond, Indiana' },
        { id: 2, type: 'span', startDate: new Date(2001, 4, 2), endDate: new Date(2003, 4, 2), title: '2. Age 14-16', description: '' },
        { id: 3, type: 'span', startDate: new Date(2008, 4, 2), endDate: new Date(2011, 4, 2), title: '3. Age 21-24', description: '' },
        { id: 'izi', type: 'event', date: new Date(2012, 3, 18), title: 'Izi Born', description: '' },
        { id: 4, type: 'span', startDate: new Date(2015, 4, 2), endDate: new Date(2019, 4, 2), title: '4. Age 28-32', description: 'Beginning of the end' },
        { id: 5, type: 'span', startDate: new Date(birthDate.getFullYear() + 35, 4, 2), endDate: new Date(birthDate.getFullYear() + 40, 4, 2), title: '5. Age 35-40', description: '' },
        { id: 6, type: 'span', startDate: new Date(birthDate.getFullYear() + 42, 4, 2), endDate: new Date(birthDate.getFullYear() + 48, 4, 2), title: '6. Age 42-48', description: '' },
        { id: 7, type: 'span', startDate: new Date(birthDate.getFullYear() + 49, 4, 2), endDate: new Date(birthDate.getFullYear() + 56, 4, 2), title: '7. Age 49-56', description: '' },
        { id: 8, type: 'span', startDate: new Date(birthDate.getFullYear() + 56, 4, 2), endDate: new Date(birthDate.getFullYear() + 64, 4, 2), title: '8. Age 56-64', description: '' },
    ];

    // --- Define Project Events/Spans ---
    const projectEvents = [
        { id: 'pareto', type: 'span', startDate: new Date(2024, 0, 1), endDate: new Date(2029, 11, 31), title: 'Pareto Project', description: '' },
        // Add more projects here later, fetched from Firestore perhaps
    ];

    // Calculate position for the "Now" indicator
    const nowPosition = calculatePosition(now, birthDate, endDate);

    // --- Generate Year Markers ---
    const startYear = birthDate.getFullYear();
    const endYear = endDate.getFullYear();
    const yearMarkers = [];
    const yearInterval = 5;
    for (let year = startYear + (yearInterval - (startYear % yearInterval)); year < endYear; year += yearInterval) {
        const yearDate = new Date(year, 0, 1);
        const position = calculatePosition(yearDate, birthDate, endDate);
        if (position !== null) {
            yearMarkers.push({ year, position });
        }
    }

    return (
        <div className={styles.lifeMapViewContainer}>
            <h2 className={styles.viewTitle}>Life Map Timeline</h2>

            {/* --- Life Timeline --- */}
            <div className={styles.timelineWrapper}>
                <div className={styles.timeline}>
                    {/* Start Circle */}
                    <div className={`${styles.timelineMarker} ${styles.timelineEndpoint} ${styles.startPoint}`} style={{ left: '0%' }} title={`Born: ${formatDate(birthDate)}`}>
                         <span className={`${styles.markerLabel} ${styles.endpointLabel}`}>{birthDate.getFullYear()}</span>
                    </div>
                    {/* Year Markers */}
                    {yearMarkers.map(marker => ( <div key={`year-${marker.year}`} className={styles.yearMarkerContainer} style={{ left: `${marker.position}%` }}> <div className={styles.yearMarkerTick}></div> <span className={styles.yearMarkerLabel}>{marker.year}</span> </div> ))}
                    {/* Life Events and Spans */}
                    {lifeEvents.map((event) => {
                        if (event.type === 'event') {
                            const position = calculatePosition(event.date, birthDate, endDate);
                            if (position === null) return null;
                            return ( <div key={`event-${event.id}`} className={`${styles.timelineMarker} ${styles.eventMarker}`} style={{ left: `${position}%` }} title={`${event.title} (${formatDate(event.date)})${event.description ? `: ${event.description}` : ''}`}></div> );
                        } else if (event.type === 'span') {
                            const startPos = calculatePosition(event.startDate, birthDate, endDate);
                            const endPos = calculatePosition(event.endDate, birthDate, endDate);
                            if (startPos === null || endPos === null || endPos <= startPos) return null;
                            const width = endPos - startPos;
                            return ( <div key={`span-${event.id}`} className={`${styles.timelineSpan}`} style={{ left: `${startPos}%`, width: `${width}%` }} title={`${event.title}${event.description ? ` ${event.description}` : ''} (${formatDate(event.startDate)} - ${formatDate(event.endDate)})`}> <span className={styles.spanLabel}>{event.title}</span> </div> );
                        }
                        return null;
                    })}
                    {/* "Now" Indicator */}
                    {nowPosition !== null && ( <div className={`${styles.timelineMarker} ${styles.nowMarker}`} style={{ left: `${nowPosition}%` }} title={`Now: ${formatDateTime(now)}`}> <span className={styles.nowTooltip}>Now: {formatDateTime(now)}</span> </div> )}
                    {/* End Circle */}
                    <div className={`${styles.timelineMarker} ${styles.timelineEndpoint} ${styles.endPoint}`} style={{ left: '100%' }} title={`Future...?`}> <span className={`${styles.markerLabel} ${styles.endpointLabel}`}>?</span> </div>
                </div>
            </div>
            {/* --- End Life Timeline --- */}


            {/* --- Project Timeline --- */}
            <div className={styles.projectTimelineWrapper}> {/* Use a different wrapper class */}
                 <h3 className={styles.projectTimelineTitle}>Project Timeline</h3>
                 <div className={styles.projectTimeline}> {/* Use a different timeline class */}
                    {/* Project Spans */}
                    {projectEvents.map((event) => {
                         if (event.type === 'span') {
                            const startPos = calculatePosition(event.startDate, birthDate, endDate); // Use same scale
                            const endPos = calculatePosition(event.endDate, birthDate, endDate); // Use same scale
                            if (startPos === null || endPos === null || endPos <= startPos) return null;
                            const width = endPos - startPos;
                            return (
                                <div
                                    key={`project-${event.id}`}
                                    className={`${styles.projectTimelineSpan}`} // Use specific class
                                    style={{ left: `${startPos}%`, width: `${width}%` }}
                                    title={`${event.title} (${formatDate(event.startDate)} - ${formatDate(event.endDate)})`}
                                >
                                    <span className={styles.projectSpanLabel}>{event.title}</span>
                                </div>
                            );
                        }
                        // Add rendering for project 'event' markers if needed later
                        return null;
                    })}
                 </div>
            </div>
             {/* --- End Project Timeline --- */}

        </div>
    );
}

export default LifeMapView;
