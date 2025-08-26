import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const App = () => {
    const radarChartRef = useRef(null);
    const chartInstanceRef = useRef(null);

    const axisColors = {
        "Physical": { light: '#FDC1B4', medium: '#f59284', dark: '#e7514c' },
        "Financial": { light: '#e9def4', medium: '#beaccf', dark: '#927aaa' },
        "Gear": { light: '#c9ebf4', medium: '#7ebde0', dark: '#3280a7' },
        "ON TRACK N+1": { light: '#BCDDDC', medium: '#618882', dark: '#053229' },
        "Environment": { light: '#efe5c3', medium: '#e3d295', dark: '#d8bf67' },
        "Misdirect": { light: '#b0e8d7', medium: '#78bfa1', dark: '#409c7c' },
        "Rest and preparation": { light: '#eaf1fa', medium: '#cbdbe7', dark: '#aec6de' },
        "default": { light: '#F1F5F9', medium: '#abb5c2', dark: '#64748B' }
    };

    const getAxisColor = (axisName, shade = 'medium') => {
        return axisColors[axisName]?.[shade] || axisColors.default[shade];
    };

    useEffect(() => {
        const wrapText = (text, maxLen) => {
            if (text.length <= maxLen) {
                return text;
            }
            const words = text.split(' ');
            const lines = [];
            let currentLine = '';
            for (const word of words) {
                if ((currentLine + ' ' + word).length > maxLen) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = currentLine ? currentLine + ' ' + word : word;
                }
            }
            lines.push(currentLine);
            return lines;
        };

        const tooltipTitleCallback = (tooltipItems) => {
            const item = tooltipItems[0];
            let label = item.chart.data.labels[item.dataIndex];
            if (Array.isArray(label)) {
                return label.join(' ');
            } else {
                return label;
            }
        };

        if (radarChartRef.current) {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }

            const ctx = radarChartRef.current.getContext('2d');

            const protocolsRadarData = {
                labels: [
                    wrapText('Physical', 16),
                    wrapText('Financial', 16),
                    wrapText('Gear', 16),
                    wrapText('ON TRACK N+1', 16),
                    wrapText('Environment', 16),
                    wrapText('Misdirect', 16),
                    wrapText('Rest and preparation', 16)
                ],
                datasets: [
                    {
                        label: 'Planning Protocol',
                        data: [8, 9, 7, 8, 6, 7, 8], // Updated data for 7 axes
                        fill: true,
                        backgroundColor: 'rgba(0, 160, 176, 0.2)',
                        borderColor: '#00A0B0',
                        pointBackgroundColor: '#00A0B0',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: '#00A0B0'
                    },
                    {
                        label: 'Data Collection Protocol',
                        data: [9, 8, 8, 7, 7, 8, 7], // Updated data for 7 axes
                        fill: true,
                        backgroundColor: 'rgba(235, 104, 65, 0.2)',
                        borderColor: '#EB6841',
                        pointBackgroundColor: '#EB6841',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: '#EB6841'
                    },
                    {
                        label: 'Savoring Protocol',
                        data: [6, 5, 9, 8, 8, 6, 9], // Updated data for 7 axes
                        fill: true,
                        backgroundColor: 'rgba(204, 51, 63, 0.2)',
                        borderColor: '#CC333F',
                        pointBackgroundColor: '#CC333F',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: '#CC333F'
                    }
                ]
            };

            chartInstanceRef.current = new Chart(ctx, {
                type: 'radar',
                data: protocolsRadarData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    elements: {
                        line: {
                            borderWidth: 3
                        }
                    },
                    scales: {
                        r: {
                            angleLines: {
                                color: '#e0e0e0'
                            },
                            grid: {
                                color: '#e0e0e0'
                            },
                            pointLabels: {
                                font: {
                                    size: 12,
                                    weight: 'bold'
                                },
                                color: '#6A4A3C'
                            },
                            ticks: {
                                display: false,
                                stepSize: 2
                            },
                            suggestedMin: 0,
                            suggestedMax: 10
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#6A4A3C',
                                font: {
                                    size: 14
                                }
                            }
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

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };
    }, []);

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl">
            background-color: #f0f4f8;

            <header className="text-center my-12">
                <h1 className="text-4xl md:text-6xl font-black text-[#00A0B0]">Pareto View</h1>
                <p className="text-xl md:text-2xl font-bold text-[#6A4A3C] mt-2">A 5-Year Experiment in Intentional Living</p>
            </header>

            <section id="intro" className="my-16">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="text-center md:text-left">
                        <h2 className="text-3xl font-bold text-[#CC333F] mb-4">The Premise</h2>
                        <p className="text-lg text-[#6A4A3C] leading-relaxed">By dividing a life into portions we can maintain focus and identify our most effective actions. A small, targeted portion of our efforts (the vital 20%) creates the vast majority of our successes.</p>
                    </div>
                    <div className="flex justify-center items-center p-8">
                        <div className="text-8xl md:text-9xl font-black text-[#EB6841] flex items-center">
                            <span>80</span>
                            <span className="text-6xl md:text-7xl text-[#00A0B0] mx-4">/</span>
                            <span>20</span>
                        </div>
                    </div>
                </div>
            </section>

            <section id="axes" className="my-20 bg-white rounded-lg shadow-lg p-8">
                <h2 className="text-3xl font-bold text-center text-[#CC333F] mb-8">The Seven Axes of Focus</h2>
                <p className="text-center text-lg text-[#6A4A3C] mb-12 max-w-3xl mx-auto">Life is divided into seven key areas for observation. By identifying the most effective 20% of actions in each, 100% of total effort becomes highly effective.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6 text-center">
                    <div className="bg-slate-100 p-6 rounded-lg border-b-4" style={{ borderColor: getAxisColor("Misdirect") }}>
                        <div className="text-4xl mb-3">🌪️</div>
                        <h3 className="font-bold text-lg" style={{ color: getAxisColor("Misdirect") }}>Misdirect</h3>
                        <p className="text-sm text-[#6A4A3C]">Strategic distractions to maintain productivity and prevent fatigue.</p>
                    </div>
                    <div className="bg-slate-100 p-6 rounded-lg border-b-4" style={{ borderColor: getAxisColor("Physical") }}>
                        <div className="text-4xl mb-3">🤸</div>
                        <h3 className="font-bold text-lg" style={{ color: getAxisColor("Physical") }}>Physical</h3>
                        <p className="text-sm text-[#6A4A3C]">Mastering movement to make the body an "optical illusion."</p>
                    </div>
                    <div className="bg-slate-100 p-6 rounded-lg border-b-4" style={{ borderColor: getAxisColor("Financial") }}>
                        <div className="text-4xl mb-3">💰</div>
                        <h3 className="font-bold text-lg" style={{ color: getAxisColor("Financial") }}>Financial</h3>
                        <p className="text-sm text-[#6A4A3C]">Ensuring survival and funding other endeavors through value-based earning.</p>
                    </div>
                    <div className="bg-slate-100 p-6 rounded-lg border-b-4" style={{ borderColor: getAxisColor("Gear") }}>
                        <div className="text-4xl mb-3">⚙️</div>
                        <h3 className="font-bold text-lg" style={{ color: getAxisColor("Gear") }}>Gear</h3>
                        <p className="text-sm text-[#6A4A3C]">Creating a mental system ("Liahona") for mind control.</p>
                    </div>
                    <div className="bg-slate-100 p-6 rounded-lg border-b-4" style={{ borderColor: getAxisColor("ON TRACK N+1") }}>
                        <div className="text-4xl mb-3">🎯</div>
                        <h3 className="font-bold text-lg" style={{ color: getAxisColor("ON TRACK N+1") }}>ON TRACK N+1</h3>
                        <p className="text-sm text-[#6A4A3C]">Aligning with personal values and future goals.</p>
                    </div>
                    <div className="bg-slate-100 p-6 rounded-lg border-b-4" style={{ borderColor: getAxisColor("Environment") }}>
                        <div className="text-4xl mb-3">🏡</div>
                        <h3 className="font-bold text-lg" style={{ color: getAxisColor("Environment") }}>Environment</h3>
                        <p className="text-sm text-[#6A4A3C]">Shaping surroundings to reflect the inner mind and foster ease.</p>
                    </div>
                    <div className="bg-slate-100 p-6 rounded-lg border-b-4" style={{ borderColor: getAxisColor("Rest and preparation") }}>
                        <div className="text-4xl mb-3">🛌</div>
                        <h3 className="font-bold text-lg" style={{ color: getAxisColor("Rest and preparation") }}>Rest and preparation</h3>
                        <p className="text-sm text-[#6A4A3C]">Crucial for rejuvenation and sustained productivity.</p>
                    </div>
                </div>
            </section>

            <section id="methodology" className="my-20">
                <h2 className="text-3xl font-bold text-center text-[#CC333F] mb-8">The Methodology</h2>
                <p className="text-center text-lg text-[#6A4A3C] mb-12 max-w-3xl mx-auto">A simple, repeatable process is used to refine focus over time. This creates a loop of continuous improvement, pruning ineffective actions and automating routines.</p>
                <div className="flex flex-col md:flex-row justify-center items-center gap-4 text-center">
                    <div className="bg-white p-6 rounded-lg shadow-md w-full md:w-1/4">
                        <h3 className="font-bold text-xl text-[#00A0B0]">1. Observe</h3>
                        <p className="text-[#6A4A3C]">Track actions and outcomes across all seven axes.</p>
                    </div>
                    <div className="flow-arrow hidden md:block">&rarr;</div>
                    <div className="flow-arrow md:hidden">&darr;</div>
                    <div className="bg-white p-6 rounded-lg shadow-md w-full md:w-1/4">
                        <h3 className="font-bold text-xl text-[#EB6841]">2. Identify & Prune</h3>
                        <p className="text-[#6A4A3C]">Isolate the vital 20% of actions and discard the trivial 80%.</p>
                    </div>
                    <div className="flow-arrow hidden md:block">&rarr;</div>
                    <div className="flow-arrow md:hidden">&darr;</div>
                    <div className="bg-white p-6 rounded-lg shadow-md w-full md:w-1/4">
                        <h3 className="font-bold text-xl text-[#CC333F]">3. Automate</h3>
                        <p className="text-[#6A4A3C]">Develop protocols and engage mentors to make excellence a habit.</p>
                    </div>
                </div>
            </section>

            <section id="roadmap" className="my-20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-[#CC333F] mb-4">The 5-Year Roadmap</h2>
                        <p className="text-lg text-[#6A4A3C] leading-relaxed">This is not a short-term fix, but a long-term journey of discovery. The path is structured yet flexible, allowing for calibration and embracing the unexpected.</p>
                    </div>
                    <div className="relative pl-12 border-l-4 border-[#00A0B0]">
                        <div className="timeline-item mb-12">
                            <h4 className="font-bold text-xl text-[#00A0B0]">Year 1: The Goldilocks Phase</h4>
                            <p className="text-[#6A4A3C]">The initial focus is on "tuning to just right." This involves exploring the boundaries of each axis, finding a sustainable balance, and establishing foundational protocols and data collection methods.</p>
                        </div>
                        <div className="timeline-item mb-12">
                            <h4 className="font-bold text-xl text-[#EB6841]">Years 2-4: Deep Focus & Pruning</h4>
                            <p className="text-[#6A4A3C]">With a calibrated system, these years are dedicated to rigorously applying the 80/20 rule, systematically eliminating low-impact activities, and doubling down on what works.</p>
                        </div>
                        <div className="timeline-item">
                            <h4 className="font-bold text-xl text-[#CC333F]">Year 5: The Unforeseen Outcome</h4>
                            <p className="text-[#6A4A3C]">The ultimate proof of the experiment's success will be an unexpected "ah-ha" moment—a sense of completion that provides clarity and readiness for the next phase of life.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section id="tools" className="my-20 bg-white rounded-lg shadow-lg p-8">
                <h2 className="text-3xl font-bold text-center text-[#CC333F] mb-8">Key Tools for the Journey</h2>
                <p className="text-center text-lg text-[#6A4A3C] mb-12 max-w-3xl mx-auto">To aid the process, two key concepts are employed: Mentors provide external perspective, while Protocols automate and reinforce effective behaviors across all axes.</p>
                <div className="chart-container h-[400px] md:h-[500px] max-h-[500px]">
                    <canvas ref={radarChartRef}></canvas>
                </div>
                <p className="text-center text-sm text-[#6A4A3C] mt-4">This chart shows how core protocols like Planning, Data Collection, and Savoring provide balanced support across all seven life axes, forming a strong foundation for the experiment.</p>
            </section>
        </div>
    );
};

export default App;
