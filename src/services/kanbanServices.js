import {
  collection,
  doc,
  writeBatch,
  query,
  where,
  getDocs,
  serverTimestamp,
  addDoc,
  deleteDoc,
  setDoc,
  updateDoc,
  limit,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getCurrentWeekId, getTodayDateString } from "../utils/dateUtils";

/**
 * Fetches the active goal for a given axis and year.
 */
export const getActiveYearlyGoal = async (axisId, year) => {
    const goalsCollection = collection(db, "new_goals");
    const q = query(
        goalsCollection,
        where("axisId", "==", axisId.toLowerCase()),
        where("year", "==", year),
        where("status", "==", "todo"),
        limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        console.warn(`No active goal found for axis '${axisId}' and year ${year}`);
        return null;
    }
    const goalDoc = querySnapshot.docs[0];
    return { id: goalDoc.id, ...goalDoc.data() };
};

/**
 * Creates a new project document with an 'active' status.
 */
export const createProject = async (projectName, axisId, vision) => {
  const payload = {
    projectName,
    axisId,
    vision,
    status: "active", // Default status for all new projects
    createdAt: serverTimestamp(),
  };
  const newDocRef = await addDoc(collection(db, "projects"), payload);
  return { id: newDocRef.id, ...payload };
};

/**
 * Fetches only active projects for a specific axis.
 */
export const getProjectsForAxis = async (axisId) => {
  const projectsCollection = collection(db, "projects");
  const q = query(
      projectsCollection, 
      where("axisId", "==", axisId),
      where("status", "==", "active")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Gets all completed projects regardless of axis.
 */
export const getAllCompletedProjects = async () => {
    const projectsCollection = collection(db, "projects");
    const q = query(projectsCollection, where("status", "==", "completed"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Updates a project's status to 'active' or 'completed'.
 */
export const updateProjectStatus = async (projectId, status) => {
    const projectRef = doc(db, "projects", projectId);
    await updateDoc(projectRef, { status: status });
};

/**
 * Marks a project as complete.
 * Updates the project status to 'completed' and adds completedAt timestamp.
 * @param {string} projectId - The ID of the project to mark complete
 * @returns {Promise<void>}
 */
export const markProjectComplete = async (projectId) => {
    if (!projectId) {
        throw new Error("Project ID is required");
    }

    try {
        const projectRef = doc(db, "projects", projectId);
        await updateDoc(projectRef, {
            status: 'completed',
            completedAt: serverTimestamp()
        });
        console.log(`Project ${projectId} marked as complete`);
    } catch (error) {
        console.error("Error marking project complete:", error);
        throw error;
    }
};

/**
 * Creates a new card document in the kanbanCards collection.
 */
export const createKanbanCard = async (cardData) => {
  const payload = {
    ...cardData,
    status: "productBacklog",
    priority: Date.now(),
    createdAt: serverTimestamp(),
  };
  const newDocRef = await addDoc(collection(db, "kanbanCards"), payload);
  return newDocRef;
};

/**
 * Fetches all Kanban cards for a specific project.
 */
export const getKanbanCardsForProject = async (projectId) => {
  if (!projectId) return [];
  const q = query(collection(db, "kanbanCards"), where("projectId", "==", projectId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

/**
 * Alias for getKanbanCardsForProject to match MonthlyView usage
 */
export const getKanbanCards = async (projectId) => {
  return await getKanbanCardsForProject(projectId);
};

/**
 * Updates a card's status and priority in Firestore.
 */
export const updateCardStatus = async (cardId, status, priority) => {
  const cardRef = doc(db, "kanbanCards", cardId);
  await updateDoc(cardRef, { status, priority });
};

/**
 * Deletes a kanban card.
 * @param {string} cardId - The ID of the card to delete
 * @returns {Promise<void>}
 */
export const deleteKanbanCard = async (cardId) => {
    if (!cardId) {
        throw new Error("Card ID is required");
    }

    try {
        const cardRef = doc(db, "kanbanCards", cardId);
        await deleteDoc(cardRef);
        console.log(`Card ${cardId} deleted successfully`);
    } catch (error) {
        console.error("Error deleting kanban card:", error);
        throw error;
    }
};

/**
 * Creates tasks in the `new_tasks` collection from a Kanban card.
 */
export const createTasksFromCard = async (card, stage = 'all') => {
  const batch = writeBatch(db);
  const cardRef = doc(db, "kanbanCards", card.id);
  const newAcceptanceCriteria = [...(card.acceptanceCriteria || [])];
  let tasksWereCreated = false;

  const weekId = `${new Date().getFullYear()}-${getCurrentWeekId()}`;
  const assignedDate = getTodayDateString();

  const taskPayloadBase = {
    axisTheme: card.axisId,
    goalId: card.goalId,
    projectId: card.projectId,
    status: "todo",
    taskType: "planned",
    parentType: "kanban",
    parentID: weekId,
    assignedDate: assignedDate,
    createdAt: serverTimestamp(),
  };

  if ((stage === 'all' || stage === 'main') && !card.mainTaskCreatedId) {
    const mainTaskRef = doc(collection(db, 'new_tasks'));
    batch.set(mainTaskRef, { ...taskPayloadBase, title: card.title });
    batch.update(cardRef, { mainTaskCreatedId: mainTaskRef.id });
    tasksWereCreated = true;
  }

  if (stage === 'all' || stage === 'criteria') {
    for (let i = 0; i < newAcceptanceCriteria.length; i++) {
      const criterion = newAcceptanceCriteria[i];
      if (!criterion.createdTaskId) {
        const subTaskRef = doc(collection(db, 'new_tasks'));
        const formattedTitle = `${card.title} - ${criterion.text}`;
        batch.set(subTaskRef, { ...taskPayloadBase, title: formattedTitle });
        newAcceptanceCriteria[i].createdTaskId = subTaskRef.id;
        tasksWereCreated = true;
      }
    }
  }

  if (tasksWereCreated) {
    batch.update(cardRef, { acceptanceCriteria: newAcceptanceCriteria });
  }
  
  if (batch._mutations.length > 0) {
      await batch.commit();
  }
};

/**
 * Deletes all tasks associated with a Kanban card.
 */
export const deleteTasksForCard = async (card) => {
  const batch = writeBatch(db);
  const cardRef = doc(db, "kanbanCards", card.id);
  const newAcceptanceCriteria = (card.acceptanceCriteria || []).map(ac => ({ ...ac }));

  if (card.mainTaskCreatedId) {
    batch.delete(doc(db, "new_tasks", card.mainTaskCreatedId));
  }

  for (let i = 0; i < newAcceptanceCriteria.length; i++) {
    if (newAcceptanceCriteria[i].createdTaskId) {
      batch.delete(doc(db, "new_tasks", newAcceptanceCriteria[i].createdTaskId));
      delete newAcceptanceCriteria[i].createdTaskId;
    }
  }

  batch.update(cardRef, {
    mainTaskCreatedId: null,
    acceptanceCriteria: newAcceptanceCriteria
  });

  await batch.commit();
};

/**
 * Updates specific fields on a Kanban card document.
 */
export const updateKanbanCard = async (cardId, dataToUpdate) => {
  const cardRef = doc(db, "kanbanCards", cardId);
  await updateDoc(cardRef, dataToUpdate);
};

/**
 * Adds a new log entry for the daily scrum.
 */
export const addSprintLog = async (projectId, logData) => {
    const payload = {
        ...logData,
        projectId,
        createdAt: serverTimestamp(),
    };
    await addDoc(collection(db, "sprintLogs"), payload);
};

/**
 * Fetches all sprint logs for a given project.
 */
export const getSprintLogsForProject = async (projectId) => {
    if (!projectId) return [];
    const q = query(collection(db, "sprintLogs"), where("projectId", "==", projectId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Saves a sprint review record.
 */
export const saveSprintReview = async (projectId, reviewData) => {
    const payload = {
        ...reviewData,
        projectId,
        sprintEndDate: serverTimestamp(),
    };
    await addDoc(collection(db, "sprintReviews"), payload);
};

/**
 * Saves a sprint retrospective record.
 */
export const saveSprintRetrospective = async (projectId, retroData) => {
    const payload = {
        ...retroData,
        projectId,
        sprintEndDate: serverTimestamp(),
    };
    await addDoc(collection(db, "sprintRetrospectives"), payload);
};

/**
 * Adds or updates the sprint schedule for a project.
 */
export const scheduleSprintInFirestore = async (projectId, scheduleData) => {
  const projectRef = doc(db, "projects", projectId);
  await updateDoc(projectRef, {
    sprintSchedule: scheduleData,
    lastUpdated: serverTimestamp()
  });
};