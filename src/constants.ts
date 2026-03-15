import type { DeadlineColumn, DeadlineState, DeadlineTask } from "./types";

export const STORAGE_FILE = "deadline-board.json";
export const SCHEMA_VERSION = 1;
export const TAB_TYPE = "deadline-board-tab";
export const DOCK_TYPE = "deadline-board-dock";

export const COLUMNS: DeadlineColumn[] = [
  {
    id: "today",
    title: "Due Today",
    accent: "var(--deadline-red)",
    badgeClass: "deadline-badge danger"
  },
  {
    id: "this-week",
    title: "This Week",
    accent: "var(--deadline-amber)",
    badgeClass: "deadline-badge warning"
  },
  {
    id: "upcoming",
    title: "Upcoming",
    accent: "var(--deadline-blue)",
    badgeClass: "deadline-badge info"
  },
  {
    id: "completed",
    title: "Completed",
    accent: "var(--deadline-green)",
    badgeClass: "deadline-badge success"
  }
];

export const INITIAL_TASKS: DeadlineTask[] = [
  {
    id: "t1",
    column: "today",
    title: "Calculus III: Problem Set 4",
    dueDate: "Mar 15",
    dueStatus: "urgent",
    dueText: "Due Tonight at 11:59 PM",
    tags: [{ label: "Math 301", color: "indigo" }],
    pomodoros: 4,
    completed: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: "t2",
    column: "this-week",
    title: "History Term Paper Draft",
    dueDate: "Mar 18",
    dueStatus: "warning",
    dueText: "3 days left",
    priority: "High",
    tags: [{ label: "Hist 105", color: "amber" }],
    completed: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: "t3",
    column: "upcoming",
    title: "Computer Science Group Project",
    dueDate: "Mar 25",
    dueStatus: "normal",
    dueText: "Next week",
    tags: [{ label: "CS 400", color: "blue" }],
    completed: false,
    subtasks: [
      { id: "s1", title: "Setup GitHub repo", completed: true },
      { id: "s2", title: "Draft database schema", completed: false },
      { id: "s3", title: "Write API endpoints", completed: false }
    ],
    progress: 33,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

export const DEFAULT_STATE: DeadlineState = {
  schemaVersion: SCHEMA_VERSION,
  tasks: INITIAL_TASKS,
  view: {
    hideCompleted: false,
    sortBy: "none"
  }
};
