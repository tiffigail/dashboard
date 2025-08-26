import React, { useState, useEffect, useMemo, useRef } from 'react';
import styles from './LifeMapView.module.css';
import ParetoTimelineModal from '../Timeline/ParetoTimelineModal/ParetoTimelineModal';

// --- HELPER FUNCTIONS ---
const calculatePosition = (date, startDate, endDate) => {
    const totalDuration = endDate.getTime() - startDate.getTime();
    if (totalDuration <= 0) return 0;
    const eventTime = date.getTime();
    const clampedTime = Math.max(startDate.getTime(), Math.min(eventTime, endDate.getTime()));
    return ((clampedTime - startDate.getTime()) / totalDuration) * 100;
};

// --- VISUALIZATION COMPONENTS ---
const SunOrbitVisual = () => (
    <div className={styles.sunOrbit}>
        <div className={styles.sun} />
        <div className={styles.orbitPath} /> {/* The visible oval path */}
        <div className={styles.earthOrbit}>  {/* The invisible rotating container */}
            <div className={styles.earth} />  {/* The planet itself */}
        </div>
    </div>
);
const AnatomicalHeartVisual = () => (<svg viewBox="0 0 100 100" className={styles.anatomicalHeart}><path d="M50 25 C 20 5, 5 40, 50 90 C 95 40, 80 5, 50 25 Z" /><path d="M40 15 Q 45 5, 50 5 T 60 15" className={styles.heartVein} /><path d="M60 15 A 15 15 0 0 1 75 25" className={styles.heartVein} /></svg>);
const HeartbeatMonitorVisual = () => (<svg viewBox="0 0 120 40" className={styles.heartbeatSvg} preserveAspectRatio="none"><path d="M0,20 L20,20 L25,10 L35,30 L40,20 L45,25 L50,20 L120,20" className={styles.heartbeatPath} /></svg>);
const AtomVisual = () => (<div className={styles.atom}><div className={styles.electronPath} style={{'--angle': '45deg', '--duration': '3s'}}><div className={styles.electron}></div></div><div className={styles.electronPath} style={{'--angle': '-45deg', '--duration': '4s'}}><div className={styles.electron}></div></div><div className={styles.electronPath} style={{'--angle': '90deg', '--duration': '3.5s'}}><div className={styles.electron}></div></div></div>);

const TimelineEvent = ({ event, startDate, endDate, onClick }) => {
    const classNames = [styles.timelineEvent];
    if (onClick) {
        classNames.push(styles.clickable);
    }

    if (event.type === 'span') {
        const startPos = calculatePosition(event.startDate, startDate, endDate);
        const width = calculatePosition(event.endDate, startDate, endDate) - startPos;
        return (
            <div className={`${classNames.join(' ')} ${styles.timelineSpan}`} style={{ left: `${startPos}%`, width: `${width}%` }} onClick={onClick}>
                <div className={styles.spanCard}>{event.title}</div>
            </div>
        );
    }

    const position = calculatePosition(event.date, startDate, endDate);
    return (
        <div className={classNames.join(' ')} style={{ left: `${position}%` }} onClick={onClick}>
            <div className={styles.pointConnector}></div>
            <div className={styles.pointDot}></div>
            <div className={styles.pointCard}>{event.title}</div>
        </div>
    );
};

function LifeMapView() {
    const [isParetoModalOpen, setIsParetoModalOpen] = useState(false);
    const birthDate = useMemo(() => new Date(1987, 4, 2), []);
    const [now, setNow] = useState(new Date());
    const timelineContainerRef = useRef(null); // Ref for the timeline container

    useEffect(() => {
        const timerId = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    // --- Data Calculations ---
    const totalMsAlive = now.getTime() - birthDate.getTime();
    const totalDaysAlive = totalMsAlive / (1000 * 60 * 60 * 24);
    const rotations = totalMsAlive / 31557600000;
    const heartbeats = Math.floor(totalMsAlive / 1000 * (79 / 60));
    const breaths = Math.floor(totalMsAlive / 1000 * (16 / 60));
    const oxygenAtomsRecycled = (breaths > 0) ? (4 * breaths * 0.21 * 1.429 / 32) * (6.022e23 * 2) : 0;
    const menarcheDate = new Date(birthDate.getFullYear() + 12, birthDate.getMonth(), birthDate.getDate());
    const daysSinceMenarche = (now > menarcheDate) ? (now.getTime() - menarcheDate.getTime()) / (1000 * 60 * 60 * 24) : 0;
    const cycles = Math.floor(daysSinceMenarche / 28);
    const daysSpentMenstruating = cycles * 5;
    const percentLifeMenstruating = (totalDaysAlive > 0) ? (daysSpentMenstruating / totalDaysAlive) * 100 : 0;
    const menopauseDate = new Date(birthDate.getFullYear() + 42, birthDate.getMonth(), birthDate.getDate());
    const msToMenopause = menopauseDate.getTime() - now.getTime();
    const yearsToMenopause = Math.floor(msToMenopause / 31557600000);
    const monthsToMenopause = Math.floor((msToMenopause % 31557600000) / (1000 * 60 * 60 * 24 * 30.44));
    const daysToMenopause = Math.floor((msToMenopause % (1000 * 60 * 60 * 24 * 30.44)) / (1000 * 60 * 60 * 24));

    const lifeEvents = useMemo(() => {
        const bd = birthDate;
        const year = bd.getFullYear();
        const month = bd.getMonth();
        const day = bd.getDate();
        return [
            { id: 1, type: 'event', date: bd, title: 'Born'},
            { id: 'izi', type: 'event', date: new Date(2012, 3, 18), title: 'Izi Born' },
            { id: 2, type: 'span', startDate: new Date(year + 14, month, day), endDate: new Date(year + 17, month, day), title: 'Ages 14-17' },
            { id: 3, type: 'span', startDate: new Date(year + 21, month, day), endDate: new Date(year + 24, month, day), title: 'Ages 21-24' },
            { id: 4, type: 'span', startDate: new Date(year + 28, month, day), endDate: new Date(year + 32, month, day), title: 'Ages 28-32' },
            { id: 5, type: 'span', startDate: new Date(year + 35, month, day), endDate: new Date(year + 40, month, day), title: 'Ages 35-40' },
            { id: 6, type: 'span', startDate: new Date(year + 42, month, day), endDate: new Date(year + 48, month, day), title: 'Ages 42-48' },
            { id: 7, type: 'span', startDate: new Date(year + 49, month, day), endDate: new Date(year + 56, month, day), title: 'Ages 49-56' },
            { id: 8, type: 'span', startDate: new Date(year + 56, month, day), endDate: new Date(year + 64, month, day), title: 'Ages 56-64' },
        ];
    }, [birthDate]);
    
    const projectEvents = useMemo(() => [
        { id: 'pareto', type: 'span', startDate: new Date(2024, 0, 1), endDate: new Date(2029, 11, 31), title: 'Pareto Project', isModal: true }
    ], []);

    const timelineStartDate = birthDate;
    const timelineEndDate = useMemo(() => new Date(birthDate.getFullYear() + 100, birthDate.getMonth(), birthDate.getDate()), [birthDate]);
    const nowPosition = calculatePosition(now, timelineStartDate, timelineEndDate);

    const yearMarkers = useMemo(() => {
        const markers = [];
        const startYear = Math.ceil(timelineStartDate.getFullYear() / 5) * 5;
        const endYear = timelineEndDate.getFullYear();
        for (let year = startYear; year <= endYear; year += 5) {
            markers.push(year);
        }
        return markers;
    }, [timelineStartDate, timelineEndDate]);
    
    // Effect to scroll the timeline to the 'NOW' marker on load
    useEffect(() => {
        if (timelineContainerRef.current) {
            const container = timelineContainerRef.current;
            const contentWidth = container.scrollWidth;
            const containerWidth = container.clientWidth;
            const scrollTarget = (nowPosition / 100) * contentWidth - (containerWidth / 2);
            container.scrollLeft = scrollTarget;
        }
    }, []);

    return (
        <div><h2 className={styles.Title}>Timeline</h2>
        <div className={styles.mainLayout}>
            {/* Left Column for Stat Cards */}
            <div className={styles.statsColumn}>
                <div className={styles.statGroup}>
                    <h3 className={styles.groupTitle}>Cosmic Scale & Vitals</h3>
                    <div className={styles.cosmicGrid}>
                        <div className={styles.statCard}><h2 className={styles.cardTitle}>Rotations Around the Sun</h2><SunOrbitVisual /><div className={styles.rotationsValue}>{rotations.toFixed(8)}</div></div>
                        <div className={styles.statCard}><h2 className={styles.cardTitle}>Heartbeats</h2><div className={styles.heartbeatContent}><AnatomicalHeartVisual /><span>{heartbeats.toLocaleString()}</span></div><HeartbeatMonitorVisual /></div>
                        <div className={styles.statCard}><h2 className={styles.cardTitle}>Breaths Taken</h2><div className={styles.breathsValue}>{breaths.toLocaleString()}</div></div>
                        <div className={`${styles.statCard} ${styles.atomCard}`}>
                            <h2 className={styles.cardTitle}>Oxygen Atoms Recycled</h2>
                            <AtomVisual />
                            <div className={styles.atomValue}>{oxygenAtomsRecycled.toExponential(2)}</div>
                        </div>
                    </div>
                </div>
                
                <div className={styles.statGroup}>
                    <h3 className={styles.groupTitle}>Life Milestones</h3>
                    <div className={styles.milestonesGrid}>
                        <div className={`${styles.statCard} ${styles.menopauseCard}`}><h2 className={styles.cardTitle}>Doomsday Countdown</h2><div className={styles.countdownValue}>{msToMenopause > 0 ? `${yearsToMenopause}y ${monthsToMenopause}m ${daysToMenopause}d` : "NOW"}</div></div>
                        <div className={styles.statCard}><h2 className={styles.cardTitle}>Offspring</h2><div className={styles.offspringValue}>1</div></div>
                        <div className={styles.statCard}><h2 className={styles.cardTitle}>Bones Broken</h2><div className={styles.bonesValue}>18</div></div>
                        <div className={styles.statCard}><div className={styles.menstruatingValue}>{percentLifeMenstruating.toFixed(2)}%</div><h2 className={styles.cardTitle}>Life Spent Menstruating</h2></div>
                    </div>
                </div>
            </div>

            {/* Right Column for Timelines */}
            <div className={styles.timelineTracksWrapper}>
                
            <div className={styles.timelineColumn}>
                <div className={styles.timelinesContainer} ref={timelineContainerRef}>
                    <div className={styles.timelinesContent}>
                        <div className={styles.nowMarker} style={{ left: `${nowPosition}%` }}>
                            <div className={styles.nowLabel}>NOW</div>
                        </div>
                        {yearMarkers.map(year => (
                            <div key={year} className={styles.yearMarker} style={{ left: `${calculatePosition(new Date(year, 0, 1), timelineStartDate, timelineEndDate)}%` }}>
                                <div className={styles.yearMarkerLabel}>{year}</div>
                                <div className={styles.yearMarkerLine}></div>
                            </div>
                        ))}
                        <div className={styles.timeline}>
                            <h3 className={styles.timelineTitle}>Life & Being</h3>
                            <div className={styles.timelineTrack}></div>
                            <div className={styles.endpointCircle} style={{ left: '0%' }}></div>
                            <div className={styles.endpointCircle} style={{ left: '100%' }}></div>
                            {lifeEvents.map(event => (
                                <TimelineEvent key={`life-${event.id}`} event={event} startDate={timelineStartDate} endDate={timelineEndDate} />
                            ))}
                        </div>
                        <div className={`${styles.timeline} ${styles.projectTimeline}`}>
                            <h3 className={styles.timelineTitle}>Projects & Becoming</h3>
                            <div className={styles.timelineTrack}></div>
                            <div className={styles.endpointCircle} style={{ left: '0%' }}></div>
                            <div className={styles.endpointCircle} style={{ left: '100%' }}></div>
                            {projectEvents.map(event => (
                                <TimelineEvent key={`proj-${event.id}`} event={event} startDate={timelineStartDate} endDate={timelineEndDate} onClick={event.isModal ? () => setIsParetoModalOpen(true) : null} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            </div>
            </div>

            <ParetoTimelineModal isOpen={isParetoModalOpen} onClose={() => setIsParetoModalOpen(false)} />
        </div>
    );
}

export default LifeMapView;