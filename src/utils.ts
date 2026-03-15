import type { DeadlineColumnId, DeadlineState, DeadlineTask, DueStatus } from "./types";
import { DEFAULT_STATE, SCHEMA_VERSION } from "./constants";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (ISO_DATE_RE.test(trimmed)) {
    const parsed = new Date(`${trimmed}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const withCurrentYear = new Date(`${trimmed} ${new Date().getFullYear()}`);
  return Number.isNaN(withCurrentYear.getTime()) ? null : withCurrentYear;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function normalizeDueDate(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = parseDateInput(value);
  if (!parsed) {
    return undefined;
  }
  return toIsoDate(parsed);
}

export function normalizeDueTime(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return TIME_RE.test(trimmed) ? trimmed : undefined;
}

export function toDueTimestamp(dueDate?: string, dueTime?: string): number {
  const normalized = normalizeDueDate(dueDate);
  if (!normalized) {
    return Number.MAX_SAFE_INTEGER;
  }
  const normalizedTime = normalizeDueTime(dueTime) ?? "00:00";
  const parsed = Date.parse(`${normalized}T${normalizedTime}:00`);
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

export function getDueDiffDays(value?: string): number | null {
  const normalized = normalizeDueDate(value);
  if (!normalized) {
    return null;
  }
  const dueDate = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(dueDate.getTime())) {
    return null;
  }
  const diffMs = dueDate.getTime() - startOfToday().getTime();
  return Math.round(diffMs / 86400000);
}

export function deriveDueStatus(value?: string): DueStatus {
  const diff = getDueDiffDays(value);
  if (diff === null || diff > 7) {
    return "normal";
  }
  if (diff <= 1) {
    return "urgent";
  }
  return "warning";
}

export function deriveColumnFromDueDate(value?: string): DeadlineColumnId {
  const diff = getDueDiffDays(value);
  if (diff === null || diff > 7) {
    return "upcoming";
  }
  if (diff <= 1) {
    return "today";
  }
  return "this-week";
}

export function buildDueText(value?: string, dueTime?: string): string | undefined {
  const diff = getDueDiffDays(value);
  if (diff === null) {
    return undefined;
  }

  const normalizedTime = normalizeDueTime(dueTime);
  const timeSuffix = normalizedTime ? ` at ${normalizedTime}` : "";

  if (diff < 0) {
    return `${Math.abs(diff)} day(s) overdue${timeSuffix}`;
  }
  if (diff === 0) {
    return `Due today${timeSuffix}`;
  }
  if (diff === 1) {
    return `Due tomorrow${timeSuffix}`;
  }
  return `${diff} day(s) left${timeSuffix}`;
}

export function formatDueSchedule(dueDate?: string, dueTime?: string): string {
  const normalizedDate = normalizeDueDate(dueDate);
  if (!normalizedDate) {
    return "No date";
  }
  const normalizedTime = normalizeDueTime(dueTime);
  return normalizedTime ? `${normalizedDate} ${normalizedTime}` : normalizedDate;
}

export function todayIsoDate(): string {
  return toIsoDate(startOfToday());
}

export function createTaskId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeTask(task: DeadlineTask): DeadlineTask {
  const dueDate = normalizeDueDate(task.dueDate);
  const dueTime = normalizeDueTime(task.dueTime);
  return {
    ...task,
    dueDate,
    dueTime,
    dueStatus: task.dueStatus ?? deriveDueStatus(dueDate),
    dueText: task.dueText ?? buildDueText(dueDate, dueTime),
    tags: task.tags ?? [],
    subtasks: task.subtasks ?? [],
    completed: task.column === "completed" ? true : task.completed,
    updatedAt: task.updatedAt ?? Date.now(),
    createdAt: task.createdAt ?? Date.now()
  };
}

export function normalizeState(input: unknown): DeadlineState {
  if (!input || typeof input !== "object") {
    return structuredClone(DEFAULT_STATE);
  }

  const data = input as Partial<DeadlineState>;
  const tasks = Array.isArray(data.tasks) ? data.tasks.map((task) => normalizeTask(task as DeadlineTask)) : DEFAULT_STATE.tasks;

  const hideCompleted = typeof data.view?.hideCompleted === "boolean" ? data.view.hideCompleted : DEFAULT_STATE.view.hideCompleted;
  const sortBy = data.view?.sortBy === "due" || data.view?.sortBy === "updated" ? data.view.sortBy : "none";

  return {
    schemaVersion: data.schemaVersion === SCHEMA_VERSION ? SCHEMA_VERSION : SCHEMA_VERSION,
    tasks,
    view: {
      hideCompleted,
      sortBy
    }
  };
}

export function summarizeUpcoming(tasks: DeadlineTask[]): DeadlineTask[] {
  const active = tasks.filter((task) => !task.completed);
  return active
    .slice()
    .sort((a, b) => toDueTimestamp(a.dueDate, a.dueTime) - toDueTimestamp(b.dueDate, b.dueTime));
}
