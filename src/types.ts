export type DeadlineColumnId = "today" | "this-week" | "upcoming" | "completed";

export type DueStatus = "urgent" | "warning" | "normal";

export interface DeadlineTag {
  label: string;
  color: string;
}

export interface DeadlineSubtask {
  id: string;
  title: string;
  completed: boolean;
  date?: string;
}

export interface DeadlineTask {
  id: string;
  column: DeadlineColumnId;
  title: string;
  dueDate?: string;
  dueTime?: string;
  dueStatus?: DueStatus;
  dueText?: string;
  tags: DeadlineTag[];
  pomodoros?: number;
  completed: boolean;
  priority?: "High" | "Medium" | "Low";
  progress?: number;
  subtasks?: DeadlineSubtask[];
  linkedDocId?: string;
  linkedBlockId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DeadlineColumn {
  id: DeadlineColumnId;
  title: string;
  accent: string;
  badgeClass: string;
}

export interface DeadlineState {
  schemaVersion: number;
  tasks: DeadlineTask[];
  view: {
    hideCompleted: boolean;
    sortBy: "none" | "due" | "updated";
  };
}
