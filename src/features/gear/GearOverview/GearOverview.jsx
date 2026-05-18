import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

// Axis colors from the provided map
const axisColorMap = {
    "Physical": { light: '#FDC1B4', medium: '#f59284', dark: '#e7514c' },
    "Financial": { light: '#e9def4', medium: '#beaccf', dark: '#927aaa' },
    "Gear": { light: '#c9ebf4', medium: '#7ebde0', dark: '#3280a7' },
    "ON TRACK N+1": { light: '#BCDDDC', medium: '#618882', dark: '#053229' },
    "Environment": { light: '#efe5c3', medium: '#e3d295', dark: '#d8bf67' },
    "Misdirect": { light: '#b0e8d7', medium: '#78bfa1', dark: '#409c7c' },
    "Rest and preparation": { light: '#eaf1fa', medium: '#cbdbe7', dark: '#aec6de' },
    "default": { light: '#F1F5F9', medium: '#abb5c2', dark: '#64748B' }
};

const App = () => {
    const paretoChartRef = useRef(null);
    const axesChartRef = useRef(null);
    const paretoChartInstance = useRef(null);
    const axesChartInstance = useRef(null);

    useEffect(() => {
        // Destroy existing chart instances before creating new ones
        if (paretoChartInstance.current) {
            paretoChartInstance.current.destroy();
        }
        if (axesChartInstance.current) {
            axesChartInstance.current.destroy();
        }

        const tooltipTitleCallback = (tooltipItems) => {
            const item = tooltipItems[0];
            let label = item.chart.data.labels[item.dataIndex];
            if (Array.isArray(label)) {
                return label.join(' ');
            } else {
                return label;
            }
        };

        // Pareto Chart
        if (paretoChartRef.current) {
            const paretoCtx = paretoChartRef.current.getContext('2d');
            paretoChartInstance.current = new Chart(paretoCtx, {
                type: 'doughnut',
                data: {
                    labels: ['20% of Efforts', '80% of Results'],
                    datasets: [{
                        label: 'Pareto Principle',
                        data: [20, 80],
                        backgroundColor: ['#00897B', '#B2DFDB'],
                        borderColor: '#fff',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                font: {
                                    size: 14
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    label += context.formattedValue + '%';
                                    return label;
                                },
                                title: tooltipTitleCallback
                            }
                        }
                    }
                }
            });
        }

        // Axes Chart
        if (axesChartRef.current) {
            const axesCtx = axesChartRef.current.getContext('2d');
            axesChartInstance.current = new Chart(axesCtx, {
                type: 'bar',
                data: {
                    labels: ['Physical', 'Financial', ['Strategic', 'Misdirection'], 'Mental', 'Environmental'],
                    datasets: [{
                        label: '% Time Allocation',
                        data: [20, 25, 15, 20, 20],
                        backgroundColor: [
                            axisColorMap.Physical.medium,
                            axisColorMap.Financial.medium,
                            axisColorMap.Misdirect.medium,
                            axisColorMap.Gear.medium,
                            axisColorMap.Environment.medium
                        ],
                        borderColor: [
                            axisColorMap.Physical.medium,
                            axisColorMap.Financial.medium,
                            axisColorMap.Misdirect.medium,
                            axisColorMap.Gear.medium,
                            axisColorMap.Environment.medium
                        ],
                        borderWidth: 1,
                        borderRadius: 5
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: function(value) {
                                    return value + "%"
                                },
                                font: {
                                    size: 12
                                }
                            },
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            ticks: {
                                font: {
                                    size: 12
                                }
                            },
                            grid: {
                                display: false
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                title: tooltipTitleCallback
                            }
                        }
                    }
                }
            });
        }

        // Cleanup on component unmount
        return () => {
            if (paretoChartInstance.current) {
                paretoChartInstance.current.destroy();
            }
            if (axesChartInstance.current) {
                axesChartInstance.current.destroy();
            }
        };
    }, []);

    // Inline SVG Icons
    const PauseCircleIcon = ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 17V7m4 10V7m-2 15a10 10 0 110-20 10 10 0 010 20z" />
        </svg>
    );

    const PlayCircleIcon = ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197 2.132A1 1 0 0110 14.82V9.18a1 1 0 011.555-.832l3.197 2.132a1 1 0 010 1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );

    const IdeaIcon = ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 20v-3m0 0l.688-.688c.64-.64 1.166-1.356 1.503-2.115C14.503 13.43 15 12.748 15 12a3 3 0 00-3-3V5a2 2 0 10-4 0v4a3 3 0 00-3 3c0 .748.497 1.43 1.003 2.115.337.759.863 1.475 1.503 2.115L9.663 17z" />
        </svg>
    );

    const CodeIcon = ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
    );

    const TestIcon = ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );

    const CheckCircleIcon = ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );

    const CalendarDaysIcon = ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    );

    const TimerIcon = ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );

    const FeatherIcon = ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
    );


    return (
        <div className="container mx-auto p-4 md:p-8 max-w-5xl">
            <style jsx="true">{`
                body {
                    font-family: 'Inter', sans-serif;
                    background-color: #F8FAFC;
                    color: #1A202C;
                    line-height: 1.6;
                }

                h1, h2, h3, h4 {
                    font-weight: 700;
                    color: #00897B; /* Primary teal */
                }

                .section-container {
                    padding: 4rem 2rem;
                    margin-bottom: 2rem;
                    border-radius: 1.5rem;
                    overflow: hidden;
                    position: relative;
                    z-index: 1;
                }

                /* Adjusted section backgrounds for no diagonal breaks and new colors */
                .section-philosophy-bg {
                    background: radial-gradient(circle at top left, #E0F2F1 0%, transparent 50%),
                                radial-gradient(circle at bottom right, #B2DFDB 0%, transparent 50%),
                                #FFFFFF;
                    box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05);
                    border-radius: 1.5rem; /* Ensure consistent border radius */
                }

                .section-axes-bg {
                    background: linear-gradient(150deg, #00796B 0%, #26A69A 100%); /* Peacock gradient */
                    box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.08);
                    border-radius: 1.5rem; /* No clip-path */
                }

                .section-architecture-bg {
                    background: #FFFFFF;
                    box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05);
                    border-radius: 1.5rem;
                }

                .section-data-ai-bg {
                    background: linear-gradient(-150deg, #E0F2F1 0%, #F8FAFC 100%);
                    box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.08);
                    border-radius: 1.5rem; /* No clip-path */
                }

                .section-datamodel-bg {
                    background: #FFFFFF;
                    box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05);
                    border-radius: 1.5rem;
                }

                .card {
                    background-color: white;
                    border-radius: 0.75rem;
                    padding: 1.5rem;
                    box-shadow: 0 5px 15px -3px rgba(0, 0, 0, 0.05);
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                }

                .card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 15px 30px -8px rgba(0, 0, 0, 0.1);
                }

                .flow-arrow {
                    font-size: 2rem;
                    line-height: 1;
                    color: #A0AEC0;
                }

                /* Chart.js container styling */
                .chart-container {
                    position: relative;
                    width: 100%;
                    max-width: 600px;
                    margin-left: auto;
                    margin-right: auto;
                    height: 300px;
                    max-height: 400px;
                }
                @media (min-width: 768px) {
                    .chart-container {
                        height: 350px;
                    }
                }

                /* Unique layout elements */
                .hero-section {
                    background: linear-gradient(135deg, #00897B 0%, #4DB6AC 100%);
                    color: white;
                    padding: 6rem 2rem;
                    border-radius: 1.5rem;
                    margin-bottom: 3rem;
                    text-align: center;
                    box-shadow: 0 15px 40px -10px rgba(0, 0, 0, 0.2);
                    position: relative;
                    overflow: hidden;
                }
                .hero-section h1 {
                    color: white;
                    font-size: 3.5rem;
                    line-height: 1.1;
                    margin-bottom: 1rem;
                }
                .hero-section p {
                    font-size: 1.5rem;
                    font-weight: 300;
                    max-width: 700px;
                    margin: 0 auto;
                    opacity: 0.9;
                }
                .hero-section::before {
                    content: '';
                    position: absolute;
                    top: -50px;
                    left: -50px;
                    width: 200px;
                    height: 200px;
                    background-color: rgba(255, 255, 255, 0.1);
                    border-radius: 50%;
                    filter: blur(50px);
                }
                .hero-section::after {
                    content: '';
                    position: absolute;
                    bottom: -50px;
                    right: -50px;
                    width: 150px;
                    height: 150px;
                    background-color: rgba(255, 255, 255, 0.1);
                    border-radius: 50%;
                    filter: blur(40px);
                }

                /* New axis card styling */
                .axis-card {
                    background-color: #F7F9FC; /* Arctic light background */
                    color: #2D3748; /* Dark text */
                    border-radius: 0.75rem;
                    padding: 1.5rem;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
                    transition: all 0.2s ease-in-out;
                    border-left: 8px solid transparent; /* Accent border */
                }
                .axis-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 20px rgba(0,0,0,0.1);
                }

                .zoom-level-box {
                    border-width: 3px;
                    border-style: solid;
                    border-radius: 0.75rem;
                    padding: 1rem;
                    margin-top: 1rem;
                    text-align: center;
                    transition: all 0.3s ease;
                }
                .zoom-level-box:last-child {
                    margin-bottom: 0;
                }
                .zoom-level-box-outer { border-color: #E2E8F0; background-color: #F8FAFC; }
                .zoom-level-box-inner-1 { border-color: #CBD5E0; background-color: #EDF2F7; }
                .zoom-level-box-inner-2 { border-color: #A0AEC0; background-color: #E2E8F0; }
                .zoom-level-box-inner-3 { border-color: #718096; background-color: #CBD5E0; }
                .zoom-level-box-inner-4 { border-color: #4A5568; background-color: #A0AEC0; }
                .zoom-level-box-now { border-color: #00897B; background-color: #E0F2F1; color: #00897B; }
                .zoom-level-box-now h4 { color: #00897B; }

                /* Specific styles for data collection icons */
                .icon-list-item {
                    display: flex;
                    align-items: center;
                    margin-bottom: 0.75rem;
                    font-size: 1.1rem;
                    color: #374151; /* Dark gray for text */
                }
                .icon-list-item svg {
                    flex-shrink: 0;
                    margin-right: 12px;
                    width: 24px;
                    height: 24px;
                    color: #00897B; /* Teal accent */
                }

            `}</style>

            <header className="hero-section">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4">Gearshift: Your OS for Intentional Living</h1>
                <p className="text-xl md:text-2xl font-light">Transforming your long-term vision into daily, meaningful action.</p>
            </header>

            <section id="philosophy" className="section-container section-philosophy-bg">
                <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center">Core Philosophy</h2>
                <div className="grid md:grid-cols-2 gap-12 px-4 md:px-8">
                    <div className="card">
                        <h3 className="text-2xl font-bold mb-3 text-teal-700">The Pareto Principle (80/20)</h3>
                        <p className="text-gray-700">Gearshift helps you identify and concentrate on the **20% of efforts** that yield **80% of your results**. It's not about working harder, but working smarter, turning every effort into effective, meaningful progress.</p>
                        <div className="chart-container relative h-64 w-full mx-auto mt-6">
                            <canvas ref={paretoChartRef}></canvas>
                        </div>
                    </div>
                    <div className="card">
                        <h3 className="text-2xl font-bold mb-3 text-teal-700">Strategic Misdirection</h3>
                        <p className="text-gray-700">Embrace the power of planned breaks and context-switching. "Misdirects" are not failures but strategic tools to **recharge, prevent burnout, and sustain long-term focus**, allowing your mind to work on problems in the background.</p>
                        <div className="flex justify-center items-center mt-8 space-x-6 text-gray-500">
                            <div className="flex flex-col items-center">
                                <PauseCircleIcon className="w-12 h-12 text-gray-500" />
                                <p className="text-sm mt-2">Strategic Pause</p>
                            </div>
                            <span className="text-4xl font-bold text-gray-400">&rarr;</span>
                            <div className="flex flex-col items-center">
                                <PlayCircleIcon className="w-12 h-12 text-gray-500" />
                                <p className="text-sm mt-2">Renewed Flow</p>
                            </div>
                        </div>
                        <p className="text-center mt-6 text-gray-600 italic font-medium">"Leave so you can come back again."</p>
                    </div>
                </div>
            </section>

            <section id="axes" className="section-container section-axes-bg">
                <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center text-white">The Five Axes of Focus</h2>
                <p className="text-center mb-12 max-w-3xl mx-auto text-white px-4 md:px-0 opacity-90">Life is multifaceted. Gearshift helps you balance your efforts across five core areas, ensuring holistic growth and preventing any single aspect from dominating your life.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4 md:px-8">
                    <div className="axis-card" style={{ borderLeftColor: axisColorMap.Physical.dark }}>
                        <h4 className="text-xl font-bold" style={{ color: axisColorMap.Physical.dark }}>Physical: Mastery of Movement</h4>
                        <p className="mt-2 text-gray-800"><b>Purpose:</b> Achieve mastery of your body, valuing it for its capability, not just its appearance.</p>
                        <p className="mt-2 text-sm" style={{ color: axisColorMap.Physical.dark, opacity: 0.9 }}>"Master Puppeteering my Body. Learn to move like an optical illusion."</p>
                    </div>
                    <div className="axis-card" style={{ borderLeftColor: axisColorMap.Financial.dark }}>
                        <h4 className="text-xl font-bold" style={{ color: axisColorMap.Financial.dark }}>Financial: Create Abundance</h4>
                        <p className="mt-2 text-gray-800"><b>Purpose:</b> Ensure security and fund your passions by understanding and controlling your financial reality.</p>
                        <p className="mt-2 text-sm" style={{ color: axisColorMap.Financial.dark, opacity: 0.9 }}>"Win the Lottery on purpose."</p>
                    </div>
                    <div className="axis-card" style={{ borderLeftColor: axisColorMap.Gear.dark }}>
                        <h4 className="text-xl font-bold" style={{ color: axisColorMap.Gear.dark }}>Mental: GearShift</h4>
                        <p className="mt-2 text-gray-800"><b>Purpose:</b> Achieve self-mastery over your own mind, learning to direct your focus and motivation intentionally.</p>
                        <p className="mt-2 text-sm" style={{ color: axisColorMap.Gear.dark, opacity: 0.9 }}>"Create a system of mind control that allows me to maximize the brain I have."</p>
                    </div>
                    <div className="axis-card" style={{ borderLeftColor: axisColorMap.Environment.dark }}>
                        <h4 className="text-xl font-bold" style={{ color: axisColorMap.Environment.dark }}>Environmental: Shape Your Space</h4>
                        <p className="mt-2 text-gray-800"><b>Purpose:</b> Demonstrate and experience personal power by consciously shaping your surroundings.</p>
                        <p className="mt-2 text-sm" style={{ color: axisColorMap.Environment.dark, opacity: 0.9 }}>"Create a space that is a reflection of my inner mind."</p>
                    </div>
                    <div className="axis-card md:col-span-2 lg:col-span-1" style={{ borderLeftColor: axisColorMap.Misdirect.dark }}>
                        <h4 className="text-xl font-bold" style={{ color: axisColorMap.Misdirect.dark }}>Misdirection: Strategic Rest</h4>
                        <p className="mt-2 text-gray-800"><b>Purpose:</b> Use strategic distractions to maintain productivity and prevent burnout.</p>
                        <p className="mt-2 text-sm" style={{ color: axisColorMap.Misdirect.dark, opacity: 0.9 }}>"Use Misdirects to recharge, to shift, to surf the Ebbs and Flows of Reality."</p>
                    </div>
                    <div className="card md:col-span-2 lg:col-span-2" style={{ backgroundColor: '#F7F9FC', padding: '1.5rem' }}> {/* Simplified background */}
                        <h4 className="text-xl font-bold text-teal-700">Weekly Focus Distribution</h4>
                        <p className="text-sm text-gray-700 mb-4">Gearshift helps visualize how your time and energy are allocated across your life's axes, ensuring a balanced approach.</p>
                        <div className="chart-container relative h-64 w-full mx-auto">
                            <canvas ref={axesChartRef}></canvas>
                        </div>
                    </div>
                </div>
            </section>

            <section id="architecture" className="section-container section-architecture-bg">
                <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center">From Big Picture to Fine Detail</h2>
                <p className="text-center max-w-3xl mx-auto mb-12 text-gray-700 px-4 md:px-0">Gearshift's unique interface allows you to zoom seamlessly between different levels of your life, from a decades-long vision to the task you're working on right now. This keeps your daily actions connected to your ultimate purpose.</p>
                <div className="card p-8 flex flex-col items-center">
                    <div className="zoom-level-box zoom-level-box-outer w-full max-w-lg">
                        <h4 className="font-bold text-gray-600">Level -1: Life Map (Decades)</h4>
                        <div className="zoom-level-box zoom-level-box-inner-1 w-11/12 mt-4 mx-auto">
                            <h4 className="font-bold text-gray-700">Level 0: 5-Year Pareto View</h4>
                            <div className="zoom-level-box zoom-level-box-inner-2 w-10/12 mt-4 mx-auto">
                                <h4 className="font-bold text-gray-800">Level 1: Yearly Axis Timeline</h4>
                                <div className="zoom-level-box zoom-level-box-inner-3 w-9/12 mt-4 mx-auto">
                                    <h4 className="font-bold text-gray-800">Level 2: Milestone Timeline</h4>
                                    <div className="zoom-level-box zoom-level-box-inner-4 w-8/12 mt-4 mx-auto">
                                        <h4 className="font-bold text-gray-800">Level 3: Weekly Timeline</h4>
                                        <div className="zoom-level-box zoom-level-box-now w-7/12 mt-4 mx-auto">
                                            <h4 className="font-bold">Level 4: The "Now" View (Hour-by-Hour)</h4>
                                            <p className="text-sm text-gray-700">Your immediate, focused task.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="data-ai" className="section-container section-data-ai-bg">
                <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center text-white">Data-Driven Growth & The Role of AI</h2>
                <div className="grid md:grid-cols-2 gap-12 px-4 md:px-8">
                    <div className="card">
                        <h3 className="text-2xl font-bold mb-3 text-teal-700">Intentional Data Collection</h3>
                        <p className="text-gray-700">Through simple, focused modals, Gearshift encourages you to reflect on your progress, mood, and productivity. This isn't just data entry; it's a ritual of self-awareness that turns your personal experience into actionable insights.</p>
                        <ul className="mt-4 space-y-2 text-gray-700">
                            <li className="icon-list-item"><CheckCircleIcon className="w-6 h-6" />AM/PM Routine Checklists</li>
                            <li className="icon-list-item"><CalendarDaysIcon className="w-6 h-6" />Weekly Planning & Review</li>
                            <li className="icon-list-item"><TimerIcon className="w-6 h-6" />Pomodoro Break Reflections</li>
                            <li className="icon-list-item"><FeatherIcon className="w-6 h-6" />Quick Thoughts & Epiphanies</li>
                        </ul>
                    </div>
                    <div className="card">
                        <h3 className="text-2xl font-bold mb-3 text-teal-700">Why AI?</h3>
                        <p className="text-gray-700">This project explores a symbiotic relationship with AI. It's not about replacing human intuition, but augmenting it. AI is a powerful partner used to accelerate development, refactor complex code, and maintain a high standard of quality, freeing up human creativity to focus on the core vision and user experience.</p>
                        <div className="mt-8 flex justify-around items-center text-center space-x-4">
                            <div className="flex flex-col items-center">
                                <IdeaIcon className="w-12 h-12 text-gray-500" />
                                <p className="text-sm mt-2 text-gray-600">Idea Generation</p>
                            </div>
                            <div className="flex flex-col items-center">
                                <CodeIcon className="w-12 h-12 text-gray-500" />
                                <p className="text-sm mt-2 text-gray-600">Code Assistance</p>
                            </div>
                            <div className="flex flex-col items-center">
                                <TestIcon className="w-12 h-12 text-gray-500" />
                                <p className="text-sm mt-2 text-gray-600">Systematic Testing</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="datamodel" className="section-container section-datamodel-bg">
                <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center">A Coherent Data Structure</h2>
                <p className="text-center max-w-3xl mx-auto mb-12 text-gray-700 px-4 md:px-0">The application's power comes from its structured data, creating a clear hierarchy from your highest-level goals down to your daily tasks. This ensures every action is connected to a larger purpose.</p>
                <div className="card p-8 flex justify-center">
                    <div className="flex flex-col items-center p-4">
                        <div className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg shadow-md">Axis</div>
                        <div className="flow-arrow text-gray-500">↓</div>
                        <div className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg shadow-md">Goal</div>
                        <div className="flow-arrow text-gray-500">↓</div>
                        <div className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg shadow-md">Milestone</div>
                        <div className="flow-arrow text-gray-500">↓</div>
                        <div className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg shadow-md">Weekly Plan</div>
                        <div className="flow-arrow text-gray-500">↓</div>
                        <div className="bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md">Task</div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default App;
