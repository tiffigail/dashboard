import React, { useState, useEffect } from 'react';
import styles from './ScrapPaper.module.css';

// Import services and components
import * as kanbanService from '../../services/kanbanServices';
import ThemedChartView from '../ThemedChartView/ThemedChartView';
import KanbanBoard from '../KanbanBoard/KanbanBoard';

const getTodayDateString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};

function ScrapPaper({ onNavigate }) {
    const [selectedAxis, setSelectedAxis] = useState('Physical');
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectVision, setNewProjectVision] = useState('');
    const [isLoadingProjects, setIsLoadingProjects] = useState(false);
    const [isCreatingProject, setIsCreatingProject] = useState(false);
    // --- NEW: State to toggle the form's visibility ---
    const [isProjectFormVisible, setIsProjectFormVisible] = useState(false);
    
    const [activeGoalId, setActiveGoalId] = useState('');
    
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(getTodayDateString());
    const availableAxes = ["Physical", "Financial", "Gear", "On Track N+1", "Environment", "Misdirect", "Rest and preparation"];

    useEffect(() => {
        if (!selectedAxis) return;
        const currentYear = new Date().getFullYear();
        const fetchProjectsAndGoal = async () => {
            setIsLoadingProjects(true);
            const [fetchedProjects, goal] = await Promise.all([
                kanbanService.getProjectsForAxis(selectedAxis),
                kanbanService.getActiveYearlyGoal(selectedAxis, currentYear)
            ]);
            setProjects(fetchedProjects);
            setActiveGoalId(goal ? goal.goalId : '');
            const lastProjectId = localStorage.getItem(`lastProject_${selectedAxis}`);
            if (lastProjectId && fetchedProjects.some(p => p.id === lastProjectId)) {
                setSelectedProjectId(lastProjectId);
            } else if (fetchedProjects.length > 0) {
                setSelectedProjectId(fetchedProjects[0].id);
            } else {
                setSelectedProjectId('');
            }
            setIsLoadingProjects(false);
        };
        fetchProjectsAndGoal();
    }, [selectedAxis]);

    useEffect(() => {
        if (selectedProjectId && selectedAxis) {
            localStorage.setItem(`lastProject_${selectedAxis}`, selectedProjectId);
        }
    }, [selectedProjectId, selectedAxis]);

    const handleCreateProject = async () => {
        if (!newProjectName.trim() || isCreatingProject) return;
        setIsCreatingProject(true);
        try {
            const newProject = await kanbanService.createProject(newProjectName, selectedAxis, newProjectVision);
            setProjects(prev => [...prev, newProject]);
            setSelectedProjectId(newProject.id);
            setNewProjectName('');
            setNewProjectVision('');
            setIsProjectFormVisible(false); // Hide form on success
        } catch (error) {
            console.error("Error creating project:", error);
            alert("Failed to create project.");
        } finally {
            setIsCreatingProject(false);
        }
    };

    const selectedProject = projects.find(p => p.id === selectedProjectId);

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Scrap Paper</h1>
            
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Controls</h2>
                <div className={styles.controlsContainer}>
                    <div className={styles.controlRow}>
                        <div className={styles.controlGroup}>
                            <label htmlFor="axis-select" className={styles.label}>Axis:</label>
                            <select id="axis-select" value={selectedAxis} onChange={(e) => setSelectedAxis(e.target.value)} className={styles.select}>
                                {availableAxes.map(axis => (<option key={axis} value={axis}>{axis}</option>))}
                            </select>
                        </div>
                        <div className={styles.controlGroup}>
                            <label htmlFor="project-select" className={styles.label}>Project:</label>
                            <select id="project-select" value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className={styles.select} disabled={isLoadingProjects || projects.length === 0}>
                                {isLoadingProjects && <option>Loading...</option>}
                                {!isLoadingProjects && projects.length === 0 && <option>No projects yet</option>}
                                {projects.map(proj => (<option key={proj.id} value={proj.id}>{proj.projectName}</option>))}
                            </select>
                        </div>
                    </div>
                    
                    {/* --- UPDATED: Collapsible Project Form --- */}
                    <div>
                        <button onClick={() => setIsProjectFormVisible(prev => !prev)} className={styles.toggleButton}>
                            {isProjectFormVisible ? 'Cancel' : '+ New Project'}
                        </button>
                        <div className={`${styles.createProjectForm} ${isProjectFormVisible ? styles.isOpen : ''}`}>
                            <div className={styles.controlGroup}>
                                <label htmlFor="new-project" className={styles.label}>New Project Name:</label>
                                <input type="text" id="new-project" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} className={styles.input} style={{flexGrow: 1}} placeholder="e.g., Scrum Certification" />
                            </div>
                            <div className={styles.controlGroup} style={{marginTop: '10px'}}>
                                <label htmlFor="new-vision" className={styles.label}>Project Vision:</label>
                                <textarea id="new-vision" value={newProjectVision} onChange={e => setNewProjectVision(e.target.value)} className={styles.textarea} placeholder="The long-term objective for this project..." />
                            </div>
                            <button onClick={handleCreateProject} className={styles.button} style={{marginTop: '10px'}} disabled={isCreatingProject}>
                                {isCreatingProject ? 'Creating...' : 'Create Project'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Kanban Board: {selectedProject?.projectName || 'Select a project'}</h2>
                <KanbanBoard
                    key={selectedProjectId}
                    axisId={selectedAxis}
                    project={selectedProject}
                    goalId={activeGoalId}
                />
            </div>
            
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Themed Chart View</h2>
                <div className={styles.controlRow}>
                    <div className={styles.controlGroup}>
                        <label htmlFor="start-date" className={styles.label}>Start Date:</label>
                        <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className={styles.input} />
                    </div>
                    <div className={styles.controlGroup}>
                        <label htmlFor="end-date" className={styles.label}>End Date:</label>
                        <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className={styles.input} />
                    </div>
                </div>
                <ThemedChartView 
                    theme={selectedAxis}
                    dateRange={{ startDate: new Date(startDate), endDate: new Date(endDate) }}
                    containerSize="large" 
                />
            </div>
        </div>
    );
}

export default ScrapPaper;