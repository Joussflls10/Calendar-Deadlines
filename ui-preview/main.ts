import BoardTab from "@/ui/BoardTab.svelte";
import { COLUMNS, DEFAULT_STATE } from "@/constants";
import type { DeadlineTask } from "@/types";
import {
  buildDueText,
  deriveColumnFromDueDate,
  deriveDueStatus,
  normalizeDueDate,
  normalizeDueTime,
  todayIsoDate
} from "@/utils";

const host = document.getElementById("app");
if (!host) {
  throw new Error("Preview host #app not found");
}

const state = structuredClone(DEFAULT_STATE);

let app: BoardTab;

function rerender(): void {
  app.$set({
    tasks: state.tasks,
    hideCompleted: state.view.hideCompleted,
    sortBy: state.view.sortBy
  });
}

function createTask(title: string, dueDate?: string, dueTime?: string): DeadlineTask {
  const now = Date.now();
  return {
    id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    column: dueDate ? deriveColumnFromDueDate(dueDate) : "today",
    dueDate,
    dueTime,
    tags: [],
    completed: false,
    dueStatus: deriveDueStatus(dueDate),
    dueText: buildDueText(dueDate, dueTime),
    createdAt: now,
    updatedAt: now
  };
}

app = new BoardTab({
  target: host,
  props: {
    tasks: state.tasks,
    columns: COLUMNS,
    hideCompleted: state.view.hideCompleted,
    sortBy: state.view.sortBy,
    onTasksChange: (tasks: DeadlineTask[]) => {
      state.tasks = tasks;
      rerender();
    },
    onOpenTask: (task: DeadlineTask) => {
      const linked = task.linkedDocId ?? task.linkedBlockId ?? "(none)";
      window.alert(`Open requested for task: ${task.title}\nLinked ID: ${linked}`);
    },
    onQuickAdd: () => {
      const title = window.prompt("Task title");
      if (!title || !title.trim()) {
        return;
      }

      const dueInput = window.prompt("Due date (optional, YYYY-MM-DD)", todayIsoDate());
      let dueDate: string | undefined;
      if (dueInput !== null && dueInput.trim()) {
        dueDate = normalizeDueDate(dueInput);
        if (!dueDate) {
          window.alert("Invalid due date. Use YYYY-MM-DD.");
          return;
        }
      }

      const timeInput = window.prompt("Due time (optional, HH:mm)", "");
      let dueTime: string | undefined;
      if (timeInput !== null && timeInput.trim()) {
        dueTime = normalizeDueTime(timeInput);
        if (!dueTime) {
          window.alert("Invalid time. Use HH:mm.");
          return;
        }
      }

      state.tasks = [createTask(title.trim(), dueDate, dueTime), ...state.tasks];
      rerender();
    },
    onToggleHideCompleted: () => {
      state.view.hideCompleted = !state.view.hideCompleted;
      rerender();
    },
    onChangeSort: (next: "none" | "due" | "updated") => {
      state.view.sortBy = next;
      rerender();
    }
  }
});
