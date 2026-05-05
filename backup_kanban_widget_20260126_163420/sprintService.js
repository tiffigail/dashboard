// src/services/sprintService.js
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
 * Find all active sprints for today
 * Returns an array of sprint objects with axis, projectName, startDate, endDate
 */
export async function getActiveSprintsToday() {
    const today = getTodayDateString();
    const allSprints = [];

    try {
        // Get all monthlyPlans documents
        const monthlyPlansRef = collection(db, "monthlyPlans");
        const querySnapshot = await getDocs(monthlyPlansRef);

        querySnapshot.forEach(doc => {
            const data = doc.data();
            const events = data.events || [];

            // Filter for sprint events that are active today
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
    
    // If multiple sprints, prioritize by axis order
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
 * @param {string} startDate - Sprint start date (YYYY-MM-DD)
 * @param {string} endDate - Sprint end date (YYYY-MM-DD)
 * @returns {object} - { totalDays, daysElapsed, daysRemaining, percentComplete }
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
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {object} - { amCompletionRate, pmCompletionRate, totalDaysLogged }
 */
export async function getHabitCompletionStats(startDate, endDate) {
    try {
        const amLogsRef = collection(db, "amRoutineLogs");
        const pmLogsRef = collection(db, "pmRoutineLogs");
        
        // For now, get all logs and filter by date in memory
        // (In production, you'd want to add createdAt timestamps and use where() queries)
        const [amSnapshot, pmSnapshot] = await Promise.all([
            getDocs(amLogsRef),
            getDocs(pmLogsRef)
        ]);
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Count logs within date range
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
 * Get kanban progress for a project
 * @param {string} projectId - The project ID
 * @returns {object} - { total, productBacklog, sprintBacklog, inProgress, done }
 */
export async function getProjectKanbanStats(projectId) {
    try {
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
            if (stats.hasOwnProperty(status)) {
                stats[status]++;
            }
        });
        
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
