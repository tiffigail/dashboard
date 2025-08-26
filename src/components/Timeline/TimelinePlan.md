Timeline Feature: Comprehensive Design Blueprint
1. Core Philosophy & Goal
The Timeline Feature serves as a high-level, interactive "Project Map" of the user's life and goals. It is for strategic overview, planning, and review, distinct from the daily "Dashboard" views.

Core Principle 1: One Level of Detail at a Time. Each timeline view is focused on a single type of data (e.g., the Year Timeline shows Milestones, the Milestone Timeline shows Weekly Plans). This prevents cognitive overload.
Core Principle 2: Two Timeline Types. The system distinguishes between timelines based on fixed calendar dates (Calendar Mode) and those based on event/project durations (Project Map Mode).

2. Data Model & Relationships ⛓️
Overview of Data Hierarchy:Task (parentId) → Weekly Plan (milestoneId) → Milestone (goalId) → Goal (axisId) → Axis.
Detailed Field Breakdown:

new_axes
A top-level life category.
axisName: string (e.g., "Physical")
color: string (e.g., "#e7514c")
question: string (The guiding question for the axis)
overview: string (A description of the axis)
values: array (A list of core values for the axis)

new_goals
A high-level objective, linked to one Axis.
axisId: string (Reference to new_axes document ID)
goalId: string (A unique ID for the goal itself, often matching the document ID)
title: string (e.g., "Achieve Target Weight")
type: string (e.g., "yearly", "stretch")
year: number (For yearly goals, e.g., 2025)
dueDate: timestamp (The target completion date)
completionDate: timestamp (The actual completion date, null if incomplete)
status: string (e.g., "completed", "todo")

new_milestones
A significant step toward a Goal, linked to one Goal.
goalId: string (Reference to the goalId field in a new_goals document)
axisId: string (Denormalized for easier querying)
title: string (e.g., "Complete Phase 1 Training")
status: string
dueDate: timestamp
completionDate: timestamp

new_weeklyPlans
A document representing a plan for a specific week. Its ID is the week ID (e.g., "2025-W28").
weekId: string (e.g., "2025-W28")
weeklyGoals: map (An object where keys are axisIds and values are goal objects containing goal, milestoneId, status)

new_tasks
The lowest-level, actionable item.
parentId: string (The week ID, e.g., "2025-W28". Links to new_weeklyPlans)
parentType: string ("weeklyPlan")
axisId: string and/or axisTheme: string
title: string (The actual task text)
status: string
taskType: string ("planned", "ad-hoc")
assignedDate: string ("YYYY-MM-DD")
completedAt: timestamp

dailyMetrics
A document for a specific day ("YYYY-MM-DD").
tasksStatus: map (An object where keys are routine names, e.g., routine_exercise)
completed: boolean
axisTheme: string
completedAt: timestamp

3. Component Architecture
Parent Containers (e.g., YearlyTimelineModal): "Smart" components. Their responsibilities are:

Fetch the necessary data from Firestore for their specific timespan and level.

Define what data represents the items on the timeline.

Handle all save, update, and create logic.

Pass data and callback functions to the Timeline component.
Reusable Timeline Component: A "dumb" presentational component. Its responsibilities are:

Receive data (items, colors, etc.) as props.

Render the timeline UI (tracks, nodes, labels).

Handle user interactions (double-clicking to edit, dragging) and call the appropriate parent functions in response.

4. Zoom Levels & User Flow 🗺️

Universal Styling Levels for Timeline.jsx:
The Timeline component interprets items based on an itemLevel prop (1 or 2) provided by the parent modal:

Level 1 Styling: Most prominent (e.g., larger size, dashed border, exclamation mark).

Level 2 Styling: Less prominent (e.g., slightly smaller size, solid border, no special mark).

Level 1: The Lifemap

Content: Blocks of time representing major life projects.

Interaction: Clicking the "Pareto Project" block opens the Pareto Timeline (Level 2).

Level 2: The Pareto Timeline (5-Year Plan)

Content: Displays new_goals where type is "yearly" or "stretch" on parallel tracks for each Axis.

Data Mapping for Timeline.jsx:

new_goals with type: "stretch" should be indicated as itemLevel={1} to TimelineItem (most prominent goals in this view).

new_goals with type: "yearly" should be indicated as itemLevel={2} to TimelineItem (less prominent goals in this view).

Editability: Items in this view (goals) are generally not inline editable via the TimelineItem form (isEditable={false}).

Interaction: Clicking a year marker on the ruler opens the Year Timeline (Level 3).

Level 3: The Year Timeline

Content: The primary items are Milestones for the selected year. The corresponding Yearly Goal is shown as an endpoint on the track.

Data Logic: On open, fetches all new_goals for that year, collects their goalIds, then fetches all new_milestones where goalId is in that list.

Data Mapping for Timeline.jsx:

The new_goals (endpoint) should be indicated as itemLevel={1} to TimelineItem (the most prominent item for that year).

The new_milestones (primary items on tracks) should be indicated as itemLevel={2} to TimelineItem (less prominent).

Editability: new_milestones are editable via the TimelineItem form (isEditable={true}). new_goals (endpoint) are not inline editable (isEditable={false}).

Interaction: Zooming into a milestone opens the Milestone Timeline (Level 4).

Level 4: The Milestone Timeline / Project Map

Content: The primary items are Weekly Plans linked to the selected milestone. It includes a header with the parent Axis's Overview, Guiding Question, and Core Values.

Interaction: Zooming into a weekly plan opens the Weekly Plan Timeline (Level 5).

Level 5 & 6 (Weekly & Day Timelines): These are the most granular views, showing individual Tasks.

5. Key Features
Rearrangeable Items, CRUD Operations, Toggleable Axis View.
Axis Filter Dropdown: On all Calendar-Based Timelines, a dropdown will allow filtering for "All Axes" or a single, isolated axis.

6. User Interaction Logic
A. CRUD Operations

Create: New items (e.g., milestones) are created via a dedicated "Add [Item]" button within the appropriate modal.

Update: Item details (title, dueDate, completionDate) are edited inline via a pop-up form that appears on double-click. (Note: Only isEditable=true items will show this form).

Delete: A delete button is available for items, which triggers an "Are you sure?" confirmation dialog.
B. Rescheduling an Item

Follows the "User-Confirmed Cascade" model. When a parent item is dragged to a new date, the system asks for confirmation before shifting all child items by the same duration.
C. "Draft Mode" and Saving

All moves and edits on a timeline happen locally in a "draft state." A "Save Changes" button commits all draft changes to Firestore at once.

7. Cross-Component Workflows
A. Auto-Populating the WeeklyPlanner: When the planner opens, it first checks if a new_weeklyPlans document already exists for the upcoming week and auto-populates with that data if found, bridging the gap between long-term and weekly planning.

8. Development Project Map 🚀

Review Existing Prototypes.

Build Core Components: Timeline component and ParetoTimelineModal.

Develop Year Timeline: YearlyTimelineModal.

Develop Milestone Project Map: MilestoneTimelineModal.

Update WeeklyPlanner: Implement auto-population.

Develop Week & Day Timelines: WeekTimelineModal and DayTimelineModal.

9. Open Questions
Cascading Deletes: What is the desired behavior when a parent item (e.g., a Milestone) is deleted? Should its children (Weekly Plans, Tasks) also be deleted, or should they be un-linked? (Decision to be made later).