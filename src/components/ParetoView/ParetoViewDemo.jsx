import React, { useState, useEffect, useCallback, useRef } from 'react';
import Chart from 'chart.js/auto';
import styles from './ParetoView.module.css';
import appStyles from '../../App.module.css';
import { Link } from 'react-router-dom'; 
import Tooltip from '../Tooltip/Tooltip.jsx';
import demoAxes from '../../../data/demo-axes.json';
import demoGoals from '../../../data/demo-goals.json';

import AxisOverview from '../AxisOverview/AxisOverview';
import FinancialOverview from '../FinancialOverview/FinancialOverview';

function ParetoViewDemo() {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [allAxesData, setAllAxesData] = useState([]);
    const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);
    const [selectedAxis, setSelectedAxis] = useState(null);
    const [expandedCards, setExpandedCards] = useState({});

    const radarChartRef = useRef(null);
    const chartInstanceRef = useRef(null);

    const axisColors = {
        'physical': { light: '#FDC1B4', medium: '#f59284', dark: '#e7514c' },
        'financial': { light: '#e9def4', medium: '#beaccf', dark: '#927aaa' },
        'gear': { light: '#c9ebf4', medium: '#7ebde0', dark: '#3280a7' },
        'On Track N+1': { light: '#BCDDDC', medium: '#618882', dark: '#053229' },
        'environment': { light: '#efe5c3', medium: '#e3d295', dark: '#d8bf67' },
        'misdirect': { light: '#b0e8d7', medium: '#78bfa1', dark: '#409c7c' },
        'rest-and-preparation': { light: '#eaf1fa', medium: '#cbdbe7', dark: '#aec6de' },
        'default': { light: '#F1F5F9', medium: '#abb5c2', dark: '#64748B' }
    };
    
    const axisSubtexts = {
        'misdirect': 'Strategic distractions to maintain productivity and prevent fatigue.',
        'physical': 'Mastering the body to move like an "optical illusion."',
        'financial': 'Ensuring survival and funding other endeavors.',
        'gear': 'Creating a system for mental control.',
        'On Track N+1': 'Aligning with personal values and future goals. Again and Again',
        'environment': 'Shaping surroundings to reflect the inner mind and foster ease.',
        'rest-and-preparation': 'Crucial for rejuvenation and sustained productivity.'
    };

    const axisDisplayOrder = [ "rest-and-preparation", "physical", "financial", "gear", "On Track N+1", "misdirect", "environment" ];

    const formatTitle = (id) => {
        if (!id) return '';
        if (id === 'on-track-n+1') return 'ON TRACK N+1';
        return id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    // --- MODIFIED: This function now reads from the imported JSON files ---
    const fetchRefactoredParetoData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const axesSnapshot = demoAxes.new_axes;
            const goalsSnapshot = demoGoals.new_goals;

            const goalsByAxis = new Map();
            goalsSnapshot.forEach(goalDoc => {
                if (!goalsByAxis.has(goalDoc.axisId)) { 
                    goalsByAxis.set(goalDoc.axisId, {}); 
                }
                goalsByAxis.get(goalDoc.axisId)[goalDoc.type] = goalDoc;
            });
            
            let combinedData = [];
            axesSnapshot.forEach(axisDoc => {
                combinedData.push({ ...axisDoc, goals: goalsByAxis.get(axisDoc.id) || {} });
            });

            const sortedAxes = axisDisplayOrder.map(id => combinedData.find(axis => axis.id === id)).filter(Boolean);
            setAllAxesData(sortedAxes);

        } catch (err) {
            console.error("Error processing demo data:", err);
            setError("Failed to load Pareto axis data.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchRefactoredParetoData(); }, [fetchRefactoredParetoData]);

    useEffect(() => {
        if (isLoading) return;
        const wrapText = (text, maxLen) => {
            if (text.length <= maxLen) return text;
            const words = text.split(' ');
            let lines = [];
            let currentLine = '';
            for (const word of words) {
                if ((currentLine + ' ' + word).length > maxLen) { lines.push(currentLine); currentLine = word; } 
                else { currentLine = currentLine ? `${currentLine} ${word}` : word; }
            }
            lines.push(currentLine);
            return lines;
        };
        const tooltipTitleCallback = (tooltipItems) => {
            const item = tooltipItems[0];
            let label = item.chart.data.labels[item.dataIndex];
            return Array.isArray(label) ? label.join(' ') : label;
        };
        if (radarChartRef.current) {
            if (chartInstanceRef.current) chartInstanceRef.current.destroy();
            const ctx = radarChartRef.current.getContext('2d');
            chartInstanceRef.current = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: axisDisplayOrder.map(id => wrapText(formatTitle(id), 16)),
                    datasets: [
                        { label: 'Planning Protocol', data: [8, 9, 7, 8, 6, 7, 8], fill: true, backgroundColor: 'rgba(0, 160, 176, 0.2)', borderColor: '#00A0B0', pointBackgroundColor: '#00A0B0', pointBorderColor: '#fff', pointHoverBackgroundColor: '#fff', pointHoverBorderColor: '#00A0B0' },
                        { label: 'Data Collection Protocol', data: [9, 8, 8, 7, 7, 8, 7], fill: true, backgroundColor: 'rgba(235, 104, 65, 0.2)', borderColor: '#EB6841', pointBackgroundColor: '#EB6841', pointBorderColor: '#fff', pointHoverBackgroundColor: '#fff', pointHoverBorderColor: '#EB6841' },
                        { label: 'Savoring Protocol', data: [6, 5, 9, 8, 8, 6, 9], fill: true, backgroundColor: 'rgba(204, 51, 63, 0.2)', borderColor: '#CC333F', pointBackgroundColor: '#CC333F', pointBorderColor: '#fff', pointHoverBackgroundColor: '#fff', pointHoverBorderColor: '#CC333F' }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, elements: { line: { borderWidth: 3 } },
                    scales: { r: { angleLines: { color: '#e0e0e0' }, grid: { color: '#e0e0e0' }, pointLabels: { font: { size: 12, weight: 'bold' }, color: '#6A4A3C' }, ticks: { display: false, stepSize: 2 }, suggestedMin: 0, suggestedMax: 10 } },
                    plugins: { legend: { position: 'bottom', labels: { color: '#6A4A3C', font: { size: 14 } } }, tooltip: { callbacks: { title: tooltipTitleCallback } } }
                }
            });
        }
        return () => { if (chartInstanceRef.current) chartInstanceRef.current.destroy(); };
    }, [isLoading]);

    const handleOpenFinancialModal = () => setIsFinancialModalOpen(true);
    const handleCloseFinancialModal = () => setIsFinancialModalOpen(false);
    const handleOpenAxisModal = (axis) => setSelectedAxis(axis);
    const handleCloseAxisModal = () => setSelectedAxis(null);

    const toggleCardExpansion = (e, axisId) => {
        e.stopPropagation();
        setExpandedCards(prev => ({ ...prev, [axisId]: !prev[axisId] }));
    };

    const supportAxisIds = ['On Track N+1', 'rest-and-preparation'];
    const mainAxes = allAxesData.filter(axis => !supportAxisIds.includes(axis.id));
    const supportAxes = allAxesData.filter(axis => supportAxisIds.includes(axis.id));

    const AxisCard = ({ axis }) => {
        const displayName = axis.axisName || formatTitle(axis.id);
        const color = (axisColors[axis.id] || axisColors.default).medium;
        const isExpanded = !!expandedCards[axis.id];

        return (
            <div className={styles.axisCard} style={{ borderLeft: `5px solid ${color}` }}>
                <div className={styles.cardContent}>
                    <div className={styles.titleContainer}>
                        <span className={styles.colorSwatch} style={{ backgroundColor: color }}></span>
                        <h3 className={styles.axisTitle} onClick={() => handleOpenAxisModal(axis)}>{displayName}</h3>
                        <p className={styles.axisSubtext}>{axisSubtexts[axis.id]}</p>
                    </div>
                    <div className={`${styles.collapsibleContent} ${isExpanded ? styles.expanded : ''}`}>
                        <p className={styles.axisDescription}>{axis.overview || 'No description available.'}</p>
                    </div>
                    <div className={styles.goalContainer}>
                        <p className={styles.stretchGoalText}>
                            <strong>5 Year Stretch Goal: </strong>
                            {axis.goals.stretch?.title || <i className={styles.notSet}>Not set</i>}
                        </p>
                        <span 
    className={`${styles.carrotToggle} ${isExpanded ? styles.expanded : ''}`} 
    onClick={(e) => toggleCardExpansion(e, axis.id)}
    style={{'--text-accent': color}}
>
    ▼
</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={styles.paretoViewContainer}>
            <div className={styles.contentGrid}>

                <header className={`${styles.infographicHeaderLeft} ${styles.gridRow1Left}`}>
                    <div className={styles.mainTitleRow}>
                        <h1 className={styles.mainTitle}>Pareto</h1>
                        <div className={styles.eightyTwentyVisual}>
                            <span>80</span><span className={styles.eightyTwentySlash}>/</span><span>20</span>
                        </div>
                    </div>
                    <p className={styles.subTitle}>A 5-Year Experiment in Intentional Living</p>
                </header>
                
                <section id="intro" className={`${styles.gridSection} ${styles.gridRow1Right}`}>
                    <div className={styles.premiseTextContainer}>
                        <h2 className={styles.premiseHeading}>The Premise</h2>
                        <p className={styles.premiseText}>By dividing a life into portions we can maintain focus and identify our most effective actions. A small, targeted portion of our efforts (the vital 20%) creates the vast majority of our successes.</p>
                    </div>
                </section>

                <div className={styles.section2Wrapper}>
                    <section id="methodology" className={`${styles.gridSection} ${styles.gridRow2Left}`}>
                        <div className={styles.gridSectionHeaderLeft}>
                            <h2 className={styles.sectionTitle}>The Methodology</h2>
                            <p className={styles.sectionSubtext}>A simple, repeatable process is used to refine focus over time. This creates a loop of continuous improvement, pruning ineffective actions and automating routines.</p>
                        </div>
                        <div className={styles.methodologyStepsContainer}>
                            <div className={styles.methodologyStep}><h3 style={{color: '#00A0B0'}}>1. Observe</h3><p>Track actions and outcomes across all seven axes.</p></div>
                            <div className={`${styles.flowArrow} ${styles.arrowVertical}`}>⬇</div>
                            <div className={styles.methodologyStep}><h3 style={{color: '#EB6841'}}>2. Identify & Prune</h3><p>Isolate the vital 20% of actions and discard the trivial 80%.</p></div>
                            <div className={`${styles.flowArrow} ${styles.arrowVertical}`}>⬇</div>
                            <div className={styles.methodologyStep}><h3 style={{color: '#CC333F'}}>3. Automate</h3><p>Develop protocols and engage mentors to make excellence a habit.</p></div>
                        </div>
                    </section>

                    <section id="roadmap" className={`${styles.gridSection} ${styles.gridRow2Right}`}>
                        <div className={styles.gridSectionHeaderCenter}>
                            <h2 className={styles.roadmapTitle}>The 5-Year Roadmap</h2>
                            <p className={styles.roadmapIntroText}>This is not a short-term fix, but a long-term journey of discovery. The path is structured yet flexible, allowing for calibration and embracing the unexpected.</p>
                        </div>
                        <div className={styles.timeline}>
                            <div className={styles.timelineItem}>
                                <div className={styles.timelineDot}></div>
                                <div className={styles.timelineTextContent}>
                                    <h4>Year 1: The Goldilocks Phase</h4>
                                    <p>The initial focus is on "tuning to just right." This involves exploring the boundaries of each axis, finding a sustainable balance, and establishing foundational protocols and data collection methods.</p>
                                </div>
                            </div>
                            <div className={styles.timelineItem}>
                                <div className={styles.timelineDot}></div>
                                <div className={styles.timelineTextContent}>
                                    <h4>Years 2-4: Deep Focus & Pruning</h4>
                                    <p>With a calibrated system, these years are dedicated to rigorously applying the 80/20 rule, systematically eliminating low-impact activities, and doubling down on what works.</p>
                                </div>
                            </div>
                            <div className={styles.timelineItem}>
                                <div className={styles.timelineDot}></div>
                                <div className={styles.timelineTextContent}>
                                    <h4>Year 5: The Unforeseen Outcome</h4>
                                    <p>The ultimate proof of the experiment's success will be an unexpected "ah-ha" moment—a sense of completion that provides clarity and readiness for the next phase of life.</p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <section id="tools" className={`${styles.gridSection} ${styles.toolsSection} ${styles.gridRow3Left}`}>
                    <div className={styles.gridSectionHeaderCenter}>
                        <h2 className={styles.sectionTitle}>Key Tools for the Journey</h2>
                        <p className={styles.sectionSubtext}>To aid the process, two key concepts are employed: Mentors provide external perspective, while Protocols automate and reinforce effective behaviors across all axes.</p>
                    </div>
                    <div className={styles.chartContainer}><canvas ref={radarChartRef}></canvas></div>
                    <p className={styles.chartCaption}>This chart shows how core protocols like Planning, Data Collection, and Savoring provide balanced support across all seven life axes, forming a strong foundation for the experiment.</p>
                </section>

                <section id="axes" className={`${styles.gridSection} ${styles.axesSection} ${styles.gridRow3Right}`}>
                    <div className={styles.gridSectionHeaderCenter}>
                        <h2 className={styles.sectionTitle}>The Five Axes of Focus</h2>
                        <p className={styles.sectionSubtext}>Life is divided into five key areas for observation. By identifying the most effective 20% of actions in each, 100% of total effort becomes highly effective.</p>
                    </div>
                    {isLoading ? <p className={styles.loadingText}>Loading axes...</p> : error ? <p className={styles.errorText}>{error}</p> :
                        <div>
                            <div className={styles.axisGrid}>{mainAxes.map(axis => <AxisCard key={axis.id} axis={axis} />)}</div>
                            <h3 className={styles.groupTitle}>Two Support Axes</h3>
                            <p className={styles.sectionSubtext}>These axes were created to ensure success.</p>
                            <div className={styles.axisGrid}>{supportAxes.map(axis => <AxisCard key={axis.id} axis={axis} />)}</div>
                        </div>
                    }
                </section>

            </div>

            <FinancialOverview isOpen={isFinancialModalOpen} onClose={handleCloseFinancialModal} color={axisColors.financial.medium} />
            <AxisOverview isOpen={selectedAxis !== null} onClose={handleCloseAxisModal} axisData={selectedAxis} onDataUpdated={fetchRefactoredParetoData} axisColor={(axisColors[selectedAxis?.id] || axisColors.default).medium} />
         <div className={styles.tourNavigation}>
            <Link to="/showcase" className={appStyles.tourButton}>Next: See the Dashboards</Link>
        </div>
    </div>
        
    );
}

export default ParetoViewDemo;