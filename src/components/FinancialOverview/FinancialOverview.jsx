// src/components/FinancialOverview/FinancialOverview.jsx
// IMPORTANT: Please ensure this file is saved exactly as:
// your-project-root/src/components/FinancialOverview/FinancialOverview.jsx

import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto'; // Import Chart.js

const FinancialOverview = ({ isOpen, onClose }) => {
  // Refs to hold the canvas DOM elements
  const attitudeChartRef = useRef(null);
  const urgentTaskChartRef = useRef(null);
  const newStoreChartRef = useRef(null);

  // Refs to hold the Chart.js instances - CORRECTED: These are now explicitly declared
  const attitudeChartInstanceRef = useRef(null);
  const urgentTaskChartInstanceRef = useRef(null);
  const newStoreChartInstanceRef = useRef(null);

  useEffect(() => {
    // Helper functions for chart labels and tooltips (defined here as they don't depend on component state/props)
    const wrapLabel = (label, maxWidth) => {
      const words = label.split(' ');
      const lines = [];
      let currentLine = '';
      for (const word of words) {
        if ((currentLine + ' ' + word).length > maxWidth) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine += (currentLine === '' ? '' : ' ') + word;
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
      }
      return label;
    };

    const defaultChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#4A5568',
            font: { size: 12 }
          }
        },
        tooltip: {
          callbacks: {
            title: tooltipTitleCallback
          }
        }
      }
    };

    if (isOpen) {
      // --- Chart Initialization ---

      // Attitude Chart (Donut)
      if (attitudeChartRef.current) {
        // Destroy existing instance before creating a new one
        if (attitudeChartInstanceRef.current) {
          attitudeChartInstanceRef.current.destroy();
        }
        const attitudeCtx = attitudeChartRef.current.getContext('2d');
        attitudeChartInstanceRef.current = new Chart(attitudeCtx, {
          type: 'doughnut',
          data: {
            labels: ['Compassion', 'Professionalism', 'Focus', 'Boundaries'],
            datasets: [{
              label: 'Attitude Mix',
              data: [25, 30, 25, 20],
              backgroundColor: ['#F08A4B', '#EA5F5F', '#A3C940', '#F5B82E'],
              borderColor: '#FFFFFF',
              borderWidth: 2
            }]
          },
          options: {
            ...defaultChartOptions,
            plugins: { ...defaultChartOptions.plugins, legend: { position: 'bottom' } }
          }
        });
      }

      // Urgent Task Chart (Bar)
      if (urgentTaskChartRef.current) {
        // Destroy existing instance before creating a new one
        if (urgentTaskChartInstanceRef.current) {
          urgentTaskChartInstanceRef.current.destroy();
        }
        const urgentTaskCtx = urgentTaskChartRef.current.getContext('2d');
        urgentTaskChartInstanceRef.current = new Chart(urgentTaskCtx, { // Assigned to the ref
          type: 'bar',
          data: {
            labels: ['Phase 1: Assessment', 'Phase 2: Acquisition', 'Phase 3: Creation'],
            datasets: [{
              label: 'Effort Allocation (%)',
              data: [30, 45, 25],
              backgroundColor: ['#F5B82E', '#F08A4B', '#EA5F5F'],
              borderColor: '#2D2D2D',
              borderWidth: 1
            }]
          },
          options: {
            ...defaultChartOptions,
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Percentage of Effort'
                }
              },
            },
            indexAxis: 'y',
          }
        });
      }

      // New Store Chart (Polar Area)
      if (newStoreChartRef.current) {
        // Destroy existing instance before creating a new one
        if (newStoreChartInstanceRef.current) {
          newStoreChartInstanceRef.current.destroy();
        }
        const newStoreCtx = newStoreChartRef.current.getContext('2d');
        newStoreChartInstanceRef.current = new Chart(newStoreCtx, {
          type: 'polarArea',
          data: {
            labels: [
              wrapLabel('Document Current Workflow', 16),
              wrapLabel('Identify Data Sources', 16),
              wrapLabel('Understand Change Mechanisms', 16),
              wrapLabel('Interview Stakeholders', 16),
              wrapLabel('Gather Existing Docs', 16)
            ],
            datasets: [{
              label: 'Discovery Phase Focus',
              data: [25, 30, 20, 15, 10],
              backgroundColor: [
                'rgba(240, 138, 75, 0.7)',
                'rgba(234, 95, 95, 0.7)',
                'rgba(163, 201, 64, 0.7)',
                'rgba(245, 184, 46, 0.7)',
                'rgba(221, 44, 44, 0.7)'
              ],
              borderWidth: 1
            }]
          },
          options: {
            ...defaultChartOptions,
            plugins: { ...defaultChartOptions.plugins, legend: { display: false } },
            scales: {
              r: {
                ticks: {
                  backdropColor: 'transparent'
                }
              }
            }
          }
        });
      }
    }

    // --- Cleanup Function ---
    // This runs when the component unmounts OR when `isOpen` changes
    return () => {
      if (attitudeChartInstanceRef.current) {
        attitudeChartInstanceRef.current.destroy();
        attitudeChartInstanceRef.current = null;
      }
      if (urgentTaskChartInstanceRef.current) {
        urgentTaskChartInstanceRef.current.destroy();
        urgentTaskChartInstanceRef.current = null;
      }
      if (newStoreChartInstanceRef.current) {
        newStoreChartInstanceRef.current.destroy();
        newStoreChartInstanceRef.current = null;
      }
    };
  }, [isOpen]); // Only isOpen as a dependency, as chart instances are managed via refs

  if (!isOpen) return null;

  return (
    <>
      <style>
        {`
        /* Modal Overlay */
        .financial-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7); /* Black with 70% opacity */
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10;
          backdrop-filter: blur(5px); /* Equivalent to backdrop-blur-sm */
          -webkit-backdrop-filter: blur(5px); /* For Safari compatibility */
        }

        /* Modal Content Container */
        .financial-modal-content {
          background-color: #f3f4f6; /* bg-gray-100 */
          padding: 1rem; /* p-4 */
          border-radius: 0.5rem; /* rounded-lg */
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); /* shadow-lg */
          max-width: 72rem; /* max-w-6xl (1152px) */
          width: 100%; /* w-full */
          margin-left: auto; /* mx-auto */
          margin-right: auto; /* mx-auto */
          margin-top: 2rem; /* my-8 */
          margin-bottom: 2rem; /* my-8 */
          overflow-y: auto;
          position: relative;
          height: 90vh; /* h-[90vh] */
          font-family: 'Inter', sans-serif;
        }

        @media (min-width: 768px) { /* md breakpoint */
          .financial-modal-content {
            padding: 2rem; /* md:p-8 */
          }
        }

        /* Close Button */
        .financial-modal-close-button {
          position: absolute;
          top: 1rem; /* top-4 */
          right: 1rem; /* right-4 */
          background-color: #d1d5db; /* bg-gray-300 */
          color: #1f2937; /* text-gray-800 */
          font-weight: bold;
          padding: 0.5rem 1rem; /* py-2 px-4 */
          border-radius: 9999px; /* rounded-full */
          border: none;
          cursor: pointer;
          transition: background-color 0.2s ease-in-out;
        }

        .financial-modal-close-button:hover {
          background-color: #9ca3af; /* hover:bg-gray-400 */
        }

        /* Header */
        .financial-header {
          background-color: #2D2D2D;
          color: #FFFFFF;
          padding: 1.5rem; /* p-6 */
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); /* shadow-md */
          border-top-left-radius: 0.5rem; /* rounded-t-lg */
          border-top-right-radius: 0.5rem; /* rounded-t-lg */
        }

        .financial-header-container {
          max-width: 72rem; /* container */
          margin-left: auto; /* mx-auto */
          margin-right: auto; /* mx-auto */
        }

        .financial-header-title {
          font-size: 1.875rem; /* text-3xl */
          font-weight: 800; /* font-extrabold */
          color: #FFFFFF;
        }

        .financial-header-subtitle {
          margin-top: 0.25rem; /* mt-1 */
          font-size: 1.125rem; /* text-lg */
          color: #F5B82E;
        }

        /* Main Content */
        .financial-main-content {
          max-width: 72rem; /* container */
          margin-left: auto; /* mx-auto */
          margin-right: auto; /* mx-auto */
          padding: 1rem; /* p-4 */
        }
        @media (min-width: 768px) { /* md breakpoint */
          .financial-main-content {
            padding: 2rem; /* md:p-8 */
          }
        }

        /* Sections */
        .financial-section {
          margin-bottom: 3rem; /* mb-12 */
        }

        .financial-section h2 {
          font-size: 1.5rem; /* text-2xl */
          font-weight: bold;
          color: #2D2D2D;
          margin-bottom: 1rem; /* mb-4 */
        }

        /* Grid Layouts */
        .financial-grid-cols-3 {
          display: grid;
          grid-template-columns: 1fr; /* grid-cols-1 */
          gap: 2rem; /* gap-8 */
        }
        @media (min-width: 768px) { /* md breakpoint */
          .financial-grid-cols-3 {
            grid-template-columns: repeat(3, minmax(0, 1fr)); /* md:grid-cols-3 */
          }
        }

        .financial-grid-cols-2 {
            display: grid;
            grid-template-columns: 1fr; /* grid-cols-1 */
            gap: 2rem; /* gap-8 */
        }
        @media (min-width: 768px) { /* md breakpoint */
            .financial-grid-cols-2 {
                grid-template-columns: repeat(2, minmax(0, 1fr)); /* md:grid-cols-2 */
            }
        }

        .financial-grid-cols-5-sm {
          display: grid;
          grid-template-columns: 1fr; /* grid-cols-1 */
          gap: 1rem; /* gap-4 */
          align-items: center;
        }
        @media (min-width: 640px) { /* sm breakpoint */
          .financial-grid-cols-5-sm {
            grid-template-columns: repeat(5, minmax(0, 1fr)); /* sm:grid-cols-5 */
          }
        }

        .financial-col-span-md-2 {
            /* No direct effect on single column, but important for larger screens */
        }
        @media (min-width: 768px) {
            .financial-col-span-md-2 {
                grid-column: span 2 / span 2; /* md:col-span-2 */
            }
        }

        .financial-col-span-lg-1 {
            /* No direct effect, useful if this was a larger col span on md */
        }
        @media (min-width: 1024px) { /* lg breakpoint */
            .financial-col-span-lg-1 {
                grid-column: span 1 / span 1; /* lg:col-span-1 */
            }
        }


        /* Cards */
        .financial-card {
          background-color: #ffffff;
          border-radius: 0.5rem; /* rounded-lg */
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05); /* shadow-lg */
          padding: 1.5rem; /* p-6 */
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          transform: scale(1);
          transition: transform 0.3s ease-in-out; /* transition-transform duration-300 */
        }

        .financial-card:hover {
          transform: scale(1.05); /* hover:scale-105 */
        }

        .financial-card-emoji {
          font-size: 3.125rem; /* text-5xl */
          margin-bottom: 0.75rem; /* mb-3 */
        }

        .financial-card-title {
          font-size: 1.25rem; /* text-xl */
          font-weight: bold;
          color: #2D2D2D;
          margin-bottom: 0.5rem; /* mb-2 */
        }

        .financial-card-text {
          color: #4a5568; /* text-gray-700 */
        }

        /* Chart Containers */
        .financial-chart-container {
          height: 16rem; /* h-64 */
          width: 100%;
        }
        @media (min-width: 768px) { /* md breakpoint */
            .financial-chart-container {
                height: 18rem; /* md:h-72 */
            }
        }
        .financial-chart-container.h-80 { /* Specific height for charts from user's code */
            height: 20rem; /* h-80 */
        }

        /* Flowchart Steps */
        .financial-flowchart-step {
            padding: 0.75rem; /* p-3 */
            border-radius: 0.5rem; /* rounded-lg */
            font-size: 0.875rem; /* text-sm */
            font-weight: bold;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 70px; /* Ensure some height for content */
        }

        .financial-flowchart-arrow {
            font-size: 1.25rem; /* text-xl */
            color: #6b7280; /* text-gray-500 */
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* Utility/Spacing Recreations (as needed for layout) */
        .financial-mb-12 { margin-bottom: 3rem; }
        .financial-mb-4 { margin-bottom: 1rem; }
        .financial-mb-3 { margin-bottom: 0.75rem; }
        .financial-mt-1 { margin-top: 0.25rem; }
        .financial-text-lg { font-size: 1.125rem; line-height: 1.75rem; }
        .financial-text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
        .financial-text-xl { font-size: 1.25rem; line-height: 1.75rem; }
        .financial-font-extrabold { font-weight: 800; }
        .financial-font-bold { font-weight: 700; }
        .financial-mx-auto { margin-left: auto; margin-right: auto; }
        .financial-text-center { text-align: center; }
        .financial-max-w-4xl { max-width: 56rem; }
        .financial-space-y-2 > *:not([hidden]) ~ *:not([hidden]) { margin-top: 0.5rem; }
        .financial-list-disc { list-style-type: disc; }
        .financial-list-inside { list-style-position: inside; }
        .financial-text-gray-700 { color: #4a5568; }
        .financial-border-t { border-top-width: 1px; border-color: #e5e7eb; }
        .financial-py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
        .financial-absolute { position: absolute; }

        /* Specific color definitions for flowchart steps */
        .financial-bg-\[\#F5B82E\] { background-color: #F5B82E; }
        .financial-text-\[\#2D2D2D\] { color: #2D2D2D; }
        .financial-bg-\[\#F08A4B\] { background-color: #F08A4B; }
        .financial-text-white { color: white; }
        .financial-bg-\[\#EA5F5F\] { background-color: #EA5F5F; }
        .financial-bg-\[\#DD2C2C\] { background-color: #DD2C2C; }
        .financial-bg-\[\#A3C940\] { background-color: #A3C940; }
        .financial-bg-\[\#4CAF50\] { background-color: #4CAF50; }
        .financial-text-gray-500 { color: #6b7280; } /* For arrows */
        .financial-my-4 { margin-top: 1rem; margin-bottom: 1rem; }
        .financial-col-start-5 { grid-column-start: 5; }

        `}
      </style>

      <div className="financial-modal-overlay">
        <div className="financial-modal-content">
          <button
            onClick={onClose}
            className="financial-modal-close-button"
          >
            X
          </button>

          <header className="financial-header">
            <div className="financial-header-container">
              <h1 className="financial-header-title">Financial Overview: Abi's Way of Working</h1>
              <p className="financial-header-subtitle">Thriving Amidst Uncertainty: A Personal Framework</p>
            </div>
          </header>

          <main className="financial-main-content">
            <section id="mindset" className="financial-section">
              <h2 className="financial-section-h2">My Core Principles & Mindset</h2>
              <div className="financial-grid-cols-3">
                <div className="financial-card">
                  <span className="financial-card-emoji">🌌</span>
                  <h3 className="financial-card-title">My Driving Vision (N+2)</h3>
                  <p className="financial-card-text">"I am a collaborator in shaping the collective conscious. I cultivate environments where individuals feel empowered, processes flow with ease, and success is a joyful journey."</p>
                </div>

                <div className="financial-card">
                  <span className="financial-card-emoji">🚀</span>
                  <h3 className="financial-card-title">My Personal Mission (N+1)</h3>
                  <p className="financial-card-text">"I transform challenges into opportunities. My positive outlook is a deliberate choice, fueling my resilience and efficiency. Human connection through helping others is my vital energy source."</p>
                </div>

                <div className="financial-card">
                  <span className="financial-card-emoji">🎯</span>
                  <h3 className="financial-card-title">My Daily Intent (N)</h3>
                  <p className="financial-card-text">"Today, I choose ease over overwhelm, clarity over confusion, and contribution over complaint. I find joy in collaborative problem-solving and build my foundation for thriving."</p>
                </div>
              </div>
            </section>

            <section id="engagement" className="financial-section">
              <h2 className="financial-section-h2">My Rules of Engagement</h2>
              <div className="financial-grid-cols-2">
                <div className="financial-card financial-col-span-md-2 financial-col-span-lg-1">
                  <h3 className="financial-card-title">Attitude & Boundaries</h3>
                  <div className="financial-chart-container financial-chart-container-h-64 financial-chart-container-md-h-72">
                    <canvas ref={attitudeChartRef}></canvas>
                  </div>
                  <p className="financial-card-text financial-mt-4">My attitude is a strategic balance of compassion, professionalism, and focus. I protect my energy with firm time, emotional, and workload boundaries to ensure I can operate from a place of strength.</p>
                </div>

                <div className="financial-card financial-col-span-md-2">
                  <h3 className="financial-card-title">The Communication Flowchart: A Script for Success</h3>
                  <p className="financial-card-text financial-mb-4">When faced with a difficult interaction, I follow a structured path to ensure a calm, professional, and productive outcome. This maintains my composure and focuses on solutions.</p>
                  <div className="financial-grid-cols-5-sm">
                    <div className="financial-flowchart-step financial-bg-\[\#F5B82E\] financial-text-\[\#2D2D2D\]"><strong>Input:</strong><br/>A challenging interaction occurs</div>
                    <div className="financial-flowchart-arrow">→</div>
                    <div className="financial-flowchart-step financial-bg-\[\#F08A4B\] financial-text-white"><strong>Action:</strong><br/>Pause &amp; Acknowledge</div>
                    <div className="financial-flowchart-arrow">→</div>
                    <div className="financial-flowchart-step financial-bg-\[\#EA5F5F\] financial-text-white"><strong>Decision:</strong><br/>Is it mine to own?</div>
                  </div>
                  <div className="financial-grid-cols-5-sm financial-my-4">
                    <div className="financial-col-start-5 financial-flowchart-arrow">↓</div>
                  </div>
                  <div className="financial-grid-cols-5-sm">
                    <div></div>
                    <div className="financial-flowchart-step financial-bg-\[\#EA5F5F\] financial-text-white"><strong>No:</strong><br/>Not my circus, not my monkeys.</div>
                    <div className="financial-flowchart-arrow">←</div>
                    <div></div>
                    <div className="financial-flowchart-step financial-bg-\[\#A3C940\] financial-text-white"><strong>Yes:</strong><br/>Engage with scripted phrase.</div>
                  </div>
                  <div className="financial-grid-cols-5-sm financial-my-4">
                    <div className="financial-col-start-5 financial-flowchart-arrow">↓</div>
                  </div>
                  <div className="financial-grid-cols-5-sm">
                    <div className="financial-flowchart-step financial-bg-\[\#DD2C2C\] financial-text-white"><strong>Output:</strong><br/>Politely Disengage or Defer</div>
                    <div className="financial-flowchart-arrow">←</div>
                    <div></div>
                    <div></div>
                    <div className="financial-flowchart-step financial-bg-\[\#4CAF50\] financial-text-white"><strong>Output:</strong><br/>Focus on solution &amp; collaborative action.</div>
                  </div>
                </div>
              </div>
            </section>

            <section id="projects" className="financial-section">
              <h2 className="financial-section-h2">My Strategic Projects</h2>
              <p className="financial-card-text financial-max-w-4xl financial-mx-auto financial-text-center financial-mb-8">My work is organized into manageable projects, each with clear phases. This transforms overwhelming tasks into structured plans, allowing for focused execution and measurable progress.</p>
              <div className="financial-grid-cols-2">
                <div className="financial-card">
                  <h3 className="financial-card-title">Project: Urgent Item Setup</h3>
                  <p className="financial-card-text financial-mb-4">A time-sensitive task to create 11 item setup documents, complicated by missing data. The focus is on rapid assessment, clear communication, and parallel processing.</p>
                  <div className="financial-chart-container financial-chart-container-h-80">
                    <canvas ref={urgentTaskChartRef}></canvas>
                  </div>
                </div>
                <div className="financial-card">
                  <h3 className="financial-card-title">Captainship: New Store Opening</h3>
                  <p className="financial-card-text financial-mb-4">My long-term project to master the unpredictable process of new store openings. The initial phase is dedicated entirely to deep research and discovery to build a solid foundation.</p>
                  <div className="financial-chart-container financial-chart-container-h-80">
                    <canvas ref={newStoreChartRef}></canvas>
                  </div>
                </div>
              </div>
            </section>

            <section id="office-etiquette" className="financial-section">
              <h2 className="financial-section-h2">Basic Office Etiquette & Video Chat Best Practices</h2>
              <div className="financial-grid-cols-2">
                <div className="financial-card">
                  <h3 className="financial-card-title">Basic Office Etiquette</h3>
                  <ul className="financial-list-disc financial-list-inside financial-text-gray-700 financial-space-y-2">
                    <li><strong>Punctuality:</strong> Be on time for meetings and appointments.</li>
                    <li><strong>Respect Shared Spaces:</strong> Keep common areas clean and tidy.</li>
                    <li><strong>Professional Communication:</strong> Use clear, concise, and timely communication.</li>
                    <li><strong>Active Listening:</strong> Give full attention in conversations; avoid interrupting.</li>
                    <li><strong>Confidentiality:</strong> Respect sensitive company or team member information.</li>
                    <li><strong>Dress Code:</strong> Adhere to company standards.</li>
                    <li><strong>Take Ownership of Mistakes:</strong> Acknowledge, learn, and focus on solutions.</li>
                  </ul>
                </div>
                <div className="financial-card">
                  <h3 className="financial-card-title">Video Chat Best Practices</h3>
                  <ul className="financial-list-disc financial-list-inside financial-text-gray-700 financial-space-y-2">
                    <li><strong>Preparation:</strong> Test tech, choose quiet space, check background & lighting.</li>
                    <li><strong>Camera On (Default):</strong> Foster connection, make eye contact with camera.</li>
                    <li><strong>Mute When Not Speaking:</strong> Prevent background noise.</li>
                    <li><strong>Active Participation:</strong> Engage with comments, use reactions.</li>
                    <li><strong>Clear Communication:</strong> Speak clearly, be concise.</li>
                    <li><strong>Raise Hand/Chat:</strong> Manage conversation flow in groups.</li>
                    <li><strong>Professional Attire:</strong> Dress as for in-person meetings.</li>
                    <li><strong>Follow Up:</strong> Send summary notes/action items if responsible.</li>
                  </ul>
                </div>
              </div>
            </section>
          </main>

          <footer className="financial-text-center financial-text-gray-500 financial-mt-12 financial-py-6 financial-border-t">
            <p>&copy; 2025 Abi Harrison. Built for purpose, designed for clarity.</p>
          </footer>
        </div>
      </div>
    </>
  );
};

export default FinancialOverview;
