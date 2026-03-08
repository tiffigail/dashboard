// src/services/sprintService.js (FIXED VERSION)
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from '../firebaseConfig';

/**
 * Get the date string for today in YYYY-MM-DD format
 */
function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Normalize axis name for matching
 * Handles variations like "Physical" vs "physical" vs "Rest and preparation" vs "rest-and-preparation"
 */
function normalizeAxisName(axis) {
    if (!axis) return '';
    return axis.toLowerCase().trim();
}

/**
 * Find all active sprints for today
 * Returns an array of sprint objects with axis, projectName, startDate, endDate
 */
export async function getActiveSprintsToday() {
    const today = getTodayDateString();
    const allSprints = [];

    try {
        const monthlyPlansRef = collection(db, "monthlyPlans");
        const querySnapshot = await getDocs(monthlyPlansRef);

        querySnapshot.forEach(doc => {
            const data = doc.data();
            const events = data.events || [];

            const activeSprints = events.filter(event => {
                if (event.type !== 'sprint') return false;
                return today >= event.startDate && today <= event.endDate;
            });

            allSprints.push(...activeSprints);
        });

        return allSprints;
    } catch (error) {
        console.error("Error fetching active sprints:", error);
        return [];
    }
}

/**
 * Get the primary active sprint (first one found, or highest priority axis)
 * Returns a single sprint object or null
 */
export async function getPrimaryActiveSprint() {
    const activeSprints = await getActiveSprintsToday();
    
    if (activeSprints.length === 0) return null;
    
    const axisPriority = [
        'Physical',
        'Gear', 
        'Financial',
        'Environment',
        'On Track N+1',
        'Misdirect',
        'Rest and preparation'
    ];
    
    activeSprints.sort((a, b) => {
        const aIndex = axisPriority.indexOf(a.axis);
        const bIndex = axisPriority.indexOf(b.axis);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
    
    return activeSprints[0];
}

/**
 * Calculate sprint progress stats
 */
export function calculateSprintProgress(startDate, endDate) {
    const today = new Date(getTodayDateString());
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const daysElapsed = Math.ceil((today - start) / (1000 * 60 * 60 * 24)) + 1;
    const daysRemaining = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    const percentComplete = Math.round((daysElapsed / totalDays) * 100);
    
    return {
        totalDays,
        daysElapsed: Math.max(0, daysElapsed),
        daysRemaining: Math.max(0, daysRemaining),
        percentComplete: Math.min(100, Math.max(0, percentComplete))
    };
}

/**
 * Get habit completion stats for a date range
 */
export async function getHabitCompletionStats(startDate, endDate) {
    try {
        const amLogsRef = collection(db, "amRoutineLogs");
        const pmLogsRef = collection(db, "pmRoutineLogs");
        
        const [amSnapshot, pmSnapshot] = await Promise.all([
            getDocs(amLogsRef),
            getDocs(pmLogsRef)
        ]);
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        let amCount = 0;
        let pmCount = 0;
        const totalExpectedDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        
        amSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.completedAt) {
                const logDate = data.completedAt.toDate();
                if (logDate >= start && logDate <= end) {
                    amCount++;
                }
            }
        });
        
        pmSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.completedAt) {
                const logDate = data.completedAt.toDate();
                if (logDate >= start && logDate <= end) {
                    pmCount++;
                }
            }
        });
        
        return {
            amCompletionRate: totalExpectedDays > 0 ? Math.round((amCount / totalExpectedDays) * 100) : 0,
            pmCompletionRate: totalExpectedDays > 0 ? Math.round((pmCount / totalExpectedDays) * 100) : 0,
            totalDaysLogged: Math.max(amCount, pmCount),
            amDaysLogged: amCount,
            pmDaysLogged: pmCount
        };
    } catch (error) {
        console.error("Error fetching habit stats:", error);
        return {
            amCompletionRate: 0,
            pmCompletionRate: 0,
            totalDaysLogged: 0,
            amDaysLogged: 0,
            pmDaysLogged: 0
        };
    }
}

/**
 * Extract project name from sprint text
 * Sprint text format: "Sprint: ProjectName"
 */
function extractProjectNameFromSprint(sprintText) {
    if (!sprintText) return null;
    const match = sprintText.match(/Sprint:\s*(.+)/i);
    return match ? match[1].trim() : null;
}

/**
 * Get project ID by matching project name and axis
 * FIXED: Uses axisId field and normalizes axis names for matching
 */
export async function getProjectIdByNameAndAxis(projectName, sprintAxis) {
    if (!projectName || !sprintAxis) return null;

    try {
        const projectsRef = collection(db, "projects");
        const querySnapshot = await getDocs(projectsRef);

        const normalizedSprintAxis = normalizeAxisName(sprintAxis);
        let matchedProjectId = null;

        querySnapshot.forEach(doc => {
            const data = doc.data();
            const normalizedProjectAxis = normalizeAxisName(data.axisId);
            if (data.projectName === projectName && normalizedProjectAxis === normalizedSprintAxis) {
                matchedProjectId = doc.id;
            }
        });

        return matchedProjectId;
    } catch (error) {
        console.error("Error finding project:", error);
        return null;
    }
}

/**
 * Get project ID from sprint object
 */
export async function getProjectIdFromSprint(sprint) {
    if (!sprint) return null;
    const projectName = extractProjectNameFromSprint(sprint.text);
    if (!projectName) return null;
    return await getProjectIdByNameAndAxis(projectName, sprint.axis);
}

/**
 * Get kanban progress for a project
 * FIXED: Uses correct status values from your Firestore
 */
export async function getProjectKanbanStats(projectId) {
    if (!projectId) {
        console.log('No projectId provided to getProjectKanbanStats');
        return {
            total: 0,
            productBacklog: 0,
            sprintBacklog: 0,
            inProgress: 0,
            done: 0
        };
    }
    
    try {
        console.log('Fetching kanban cards for project:', projectId);
        const cardsRef = collection(db, "kanbanCards");
        const q = query(cardsRef, where("projectId", "==", projectId));
        const querySnapshot = await getDocs(q);
        
        const stats = {
            total: 0,
            productBacklog: 0,
            sprintBacklog: 0,
            inProgress: 0,
            done: 0
        };
        
        querySnapshot.forEach(doc => {
            const data = doc.data();
            stats.total++;
            const status = data.status || 'productBacklog';
            
            console.log('Card status:', {
                id: doc.id,
                title: data.title,
                status: status
            });
            
            if (stats.hasOwnProperty(status)) {
                stats[status]++;
            } else {
                console.warn('Unknown status:', status);
            }
        });
        
        console.log('Kanban stats:', stats);
        return stats;
    } catch (error) {
        console.error("Error fetching kanban stats:", error);
        return {
            total: 0,
            productBacklog: 0,
            sprintBacklog: 0,
            inProgress: 0,
            done: 0
        };
    }
}