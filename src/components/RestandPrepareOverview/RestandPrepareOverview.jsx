import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto'; // Using 'chart.js/auto' for automatic registration of controllers, elements, and scales

const RestandPrepareOverview = () => {
    const survivalKitChartRef = useRef(null);
    const readinessChecklistChartRef = useRef(null);
    let survivalKitChartInstance = null;
    let readinessChecklistChartInstance = null;

    // Color Palette: Lighter Peacock & Arctic
    const colors = {
        deepBlue: '#1A3A7A',
        icyBlue: '#C2E0F7',
        mutedBlueGreen: '#4A6382',
        darkCoolGrayBlue: '#6F8CA0',
        vibrantTeal: '#00C2B8',
        lighterCoolTone: '#93BCE1',
        white: '#FFFFFF',
    };

    const chartColors = {
        background: `rgba(0, 194, 184, 0.2)`, // Lighter Transparent Vibrant Teal
        border: colors.icyBlue,
        grid: colors.darkCoolGrayBlue,
        ticks: colors.icyBlue,
        pointBg: colors.white,
        pointBorder: colors.deepBlue,
    };

    const wrapLabel = (str, max_width) => {
        if (str.length <= max_width) {
            return str;
        }
        const words = str.split(' ');
        const lines = [];
        let current_line = '';
        for (const word of words) {
            if ((current_line + ' ' + word).trim().length > max_width && current_line.length > 0) {
                lines.push(current_line);
                current_line = word;
            } else {
                current_line = (current_line + ' ' + word).trim();
            }
        }
        if (current_line.length > 0) {
            lines.push(current_line);
        }
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
    
    const sharedChartOptions = {
        plugins: {
            legend: {
                labels: {
                    color: chartColors.ticks,
                    font: {
                        family: "'Roboto Condensed', sans-serif",
                        size: 14
                    }
                }
            },
            tooltip: {
                callbacks: {
                    title: tooltipTitleCallback
                },
                backgroundColor: colors.deepBlue,
                titleFont: {
                    family: "'Roboto Condensed', sans-serif",
                    size: 16,
                    weight: 'bold'
                },
                bodyFont: {
                    family: "'Roboto Condensed', sans-serif",
                    size: 14
                }
            }
        }
    };

    useEffect(() => {
        // Destroy existing chart instances if they exist
        if (survivalKitChartInstance) {
            survivalKitChartInstance.destroy();
        }
        if (readinessChecklistChartInstance) {
            readinessChecklistChartInstance.destroy();
        }

        const survivalKitLabels = [
            'Proactive Confidence', 'Peace of Mind', 'Sustainability', 'Strategic Foresight', 
            'Resource Cultivation', 'Personal Sovereignty', 'Inner Alignment', 'Embracing Discomfort'
        ];
        
        const survivalKitCtx = survivalKitChartRef.current.getContext('2d');
        survivalKitChartInstance = new Chart(survivalKitCtx, {
            type: 'radar',
            data: {
                labels: survivalKitLabels.map(label => wrapLabel(label, 16)), // Apply wrapping
                datasets: [{
                    label: 'Readiness Level',
                    data: [85, 90, 75, 80, 95, 70, 88, 65],
                    backgroundColor: chartColors.background,
                    borderColor: chartColors.border,
                    borderWidth: 2,
                    pointBackgroundColor: chartColors.pointBg,
                    pointBorderColor: chartColors.pointBorder,
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgb(255, 99, 132)'
                }]
            },
            options: {
                ...sharedChartOptions,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: chartColors.grid },
                        grid: { color: chartColors.grid },
                        pointLabels: { 
                            color: chartColors.ticks,
                            font: { family: "'Roboto Condensed', sans-serif", size: 12 } 
                        },
                        ticks: {
                            color: chartColors.ticks,
                            backdropColor: 'transparent',
                            stepSize: 25
                        }
                    }
                }
            }
        });

        const checklistLabels = [
            'Savoring', 'Reset Protocols', 'Environmental Control', 
            'Intentional Exposure', 'Planned Misdirects', 'Regular Reflection'
        ];
        
        const readinessChecklistCtx = readinessChecklistChartRef.current.getContext('2d');
        readinessChecklistChartInstance = new Chart(readinessChecklistCtx, {
            type: 'doughnut',
            data: {
                labels: checklistLabels.map(label => wrapLabel(label, 16)),
                datasets: [{
                    label: 'Readiness Activities',
                    data: [1, 1, 1, 1, 1, 1],
                    backgroundColor: [
                        colors.vibrantTeal,
                        colors.icyBlue,
                        colors.mutedBlueGreen,
                        colors.lighterCoolTone,
                        colors.deepBlue,
                        colors.darkCoolGrayBlue
                    ],
                    borderColor: colors.deepBlue,
                    borderWidth: 3,
                    hoverOffset: 4
                }]
            },
            options: {
                ...sharedChartOptions,
                 maintainAspectRatio: false,
                 cutout: '50%',
            }
        });

        // Cleanup function
        return () => {
            if (survivalKitChartInstance) {
                survivalKitChartInstance.destroy();
            }
            if (readinessChecklistChartInstance) {
                readinessChecklistChartInstance.destroy();
            }
        };
    }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount

    return (
        <div className="font-['Roboto_Condensed'] antialiased bg-[#1A3A7A] text-[#C2E0F7]">
            <main className="container mx-auto p-4 md:p-8">

                <header className="text-center mb-12">
                    <h1 className="font-['Teko'] text-5xl md:text-7xl font-semibold text-white uppercase tracking-wider">The Rest & Prepare Axis</h1>
                    <p className="text-xl md:text-2xl text-[#C2E0F7] mt-2">A Bear Grylls Inspired Guide to Inner Fortitude</p>
                </header>

                <section id="why" className="mb-16">
                    <div className="text-center max-w-3xl mx-auto mb-10">
                        <h2 className="font-['Teko'] text-4xl md:text-5xl text-white uppercase">The Philosophy of Readiness</h2>
                        <p className="mt-2 text-lg">Survival isn't just about the immediate challenge; it's about what you do to prepare for the next one. By mastering the principles of rest and preparation, you build an unshakable core of resilience. It's about turning potential anxiety into confident readiness.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-[#4A6382] border border-[#6F8CA0] rounded-lg shadow-xl p-6 text-center flex flex-col items-center">
                            <span className="text-5xl mb-3">⚡</span>
                            <h3 className="font-['Teko'] text-3xl text-white uppercase">Proactive Confidence</h3>
                            <p className="mt-2 text-base">Every deliberate pause, every moment of self-care is a push-up for your mind. It's how you build an unshakeable belief in your ability to face anything.</p>
                        </div>
                        <div className="bg-[#4A6382] border border-[#6F8CA0] rounded-lg shadow-xl p-6 text-center flex flex-col items-center">
                            <span className="text-5xl mb-3">✨</span>
                            <h3 className="font-['Teko'] text-3xl text-white uppercase">Peace of Mind</h3>
                            <p className="mt-2 text-base">Chaos strikes, but inner calm endures. Preparation is your mental shelter, providing a shield of tranquility against the storm of life.</p>
                        </div>
                        <div className="bg-[#4A6382] border border-[#6F8CA0] rounded-lg shadow-xl p-6 text-center flex flex-col items-center">
                            <span className="text-5xl mb-3">⚙️</span>
                            <h3 className="font-['Teko'] text-3xl text-white uppercase">Personal Power</h3>
                            <p className="mt-2 text-base">Feeling in control isn't magic; it's earned. When you master your rest and readiness, you master yourself. That's real power.</p>
                        </div>
                    </div>
                </section>

                <section id="how" className="mb-16">
                    <div className="text-center max-w-3xl mx-auto mb-10">
                        <h2 className="font-['Teko'] text-4xl md:text-5xl text-white uppercase">The Strategic Tools</h2>
                        <p className="mt-2 text-lg">Effective preparation involves a dynamic process and a toolkit of core values. The "Misdirect Loop" illustrates the cyclical nature of effort and recovery, while your "Survival Kit" values provide the foundation for resilience.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="bg-[#4A6382] border border-[#6F8CA0] rounded-lg shadow-xl p-6">
                            <h3 className="font-['Teko'] text-3xl text-white uppercase text-center mb-4">The Misdirect Loop</h3>
                            <div className="relative w-full aspect-square flex items-center justify-center p-4">
                                <div className="absolute inset-0 border-4 border-dashed border-[#C2E0F7] rounded-full"></div>
                                
                                <div className="bg-[#00C2B8] text-[#1A3A7A] border-2 border-[#1A3A7A] absolute top-0 -mt-6 rounded-full w-32 h-16 flex items-center justify-center text-center p-1 text-sm font-bold">1. Focused Effort</div>
                                <div className="text-[#C2E0F7] absolute top-10 right-10 text-4xl transform -rotate-45">⤵</div>
                                
                                <div className="bg-[#00C2B8] text-[#1A3A7A] border-2 border-[#1A3A7A] absolute right-0 -mr-8 rounded-full w-32 h-16 flex items-center justify-center text-center p-1 text-sm font-bold">2. Stagnation Point</div>
                                <div className="text-[#C2E0F7] absolute bottom-10 right-10 text-4xl transform rotate-45">↙</div>
                                
                                <div className="bg-[#00C2B8] text-[#1A3A7A] border-2 border-[#1A3A7A] absolute bottom-0 -mb-6 rounded-full w-32 h-16 flex items-center justify-center text-center p-1 text-sm font-bold">3. Embrace Misdirect!</div>
                                <div className="text-[#C2E0F7] absolute bottom-10 left-10 text-4xl transform rotate-135">↖</div>

                                <div className="bg-[#00C2B8] text-[#1A3A7A] border-2 border-[#1A3A7A] absolute left-0 -ml-8 rounded-full w-32 h-16 flex items-center justify-center text-center p-1 text-sm font-bold">4. Rejuvenate & Gain Perspective</div>
                                <div className="text-[#C2E0F7] absolute top-10 left-10 text-4xl transform -rotate-135">↗</div>
                                
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                                     <div className="bg-[#00C2B8] text-[#1A3A7A] border-2 border-[#1A3A7A] rounded-full w-32 h-16 flex items-center justify-center text-center p-1 text-sm font-bold">5. Reorient & Plan</div>
                                     <div className="text-[#C2E0F7] text-4xl mt-1">↓</div>
                                     <div className="bg-[#00C2B8] text-[#1A3A7A] border-2 border-[#1A3A7A] rounded-full w-32 h-16 flex items-center justify-center text-center p-1 text-sm font-bold">6. Renewed Vigor</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#4A6382] border border-[#6F8CA0] rounded-lg shadow-xl p-6">
                             <h3 className="font-['Teko'] text-3xl text-white uppercase text-center mb-4">Your Survival Kit</h3>
                            <div className="relative w-full mx-auto h-[300px] max-h-[400px] md:h-[350px]">
                                <canvas ref={survivalKitChartRef}></canvas>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="what" className="mb-12">
                    <div className="text-center max-w-3xl mx-auto mb-10">
                        <h2 className="font-['Teko'] text-4xl md:text-5xl text-white uppercase">The Readiness Checklist</h2>
                        <p className="mt-2 text-lg">Preparedness is built through consistent, practical action. These six key activities form a comprehensive checklist. Each contributes equally to your overall state of readiness, creating a well-rounded and robust inner fortitude.</p>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="bg-[#4A6382] border border-[#6F8CA0] rounded-lg shadow-xl p-6">
                            <h3 className="font-['Teko'] text-3xl text-white uppercase text-center mb-4">Total Readiness Kit</h3>
                            <div className="relative w-full mx-auto h-[300px] max-h-[400px] md:h-[350px]">
                                <canvas ref={readinessChecklistChartRef}></canvas>
                            </div>
                        </div>
                        <div className="bg-[#4A6382] border border-[#6F8CA0] rounded-lg shadow-xl p-8">
                            <ul className="space-y-4">
                                <li className="flex items-start">
                                    <span className="text-2xl mr-4 text-[#C2E0F7]">👁️</span>
                                    <div>
                                        <h4 className="font-bold text-lg text-white">Savoring</h4>
                                        <p>Your mental rehydration break. Engage senses to ground yourself in the present moment.</p>
                                    </div>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-2xl mr-4 text-[#C2E0F7]">🔄</span>
                                    <div>
                                        <h4 className="font-bold text-lg text-white">Reset Protocols</h4>
                                        <p>Clear the path for new insights. Shake the Etch-a-Sketch of your mind to see new patterns.</p>
                                    </div>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-2xl mr-4 text-[#C2E0F7]">🏠</span>
                                    <div>
                                        <h4 className="font-bold text-lg text-white">Environmental Control</h4>
                                        <p>Secure your base camp. An organized space leads to optimal and clearer thinking.</p>
                                    </div>
                                </li>
                                <li className="flex items-start">
                                     <span className="text-2xl mr-4 text-[#C2E0F7]">🌡️</span>
                                    <div>
                                        <h4 className="font-bold text-lg text-white">Intentional Exposure</h4>
                                        <p>Build resilience for any climate. Embrace discomfort to expand your limits.</p>
                                    </div>
                                </li>
                                 <li className="flex items-start">
                                     <span className="text-2xl mr-4 text-[#C2E0F7]">💡</span>
                                    <div>
                                        <h4 className="font-bold text-lg text-white">Planned Misdirects</h4>
                                        <p>Venture off-trail. Pursue a whimsical interest to find new perspectives and energy.</p>
                                    </div>
                                </li>
                                 <li className="flex items-start">
                                     <span className="text-2xl mr-4 text-[#C2E0F7]">📝</span>
                                    <div>
                                        <h4 className="font-bold text-lg text-white">Regular Reflection</h4>
                                        <p>Review your mental maps. Journaling and meditation help adjust your course with intention.</p>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                <footer className="text-center mt-16 pt-8 border-t border-[#6F8CA0]">
                    <p className="text-lg text-[#C2E0F7] font-bold">What's in *your* 'Rest & Prepare' kit today?</p>
                    <p className="text-sm text-[#93BCE1]">Start building your inner fortitude.</p>
                </footer>

            </main>
        </div>
    );
};

export default RestandPrepareOverview;
