import {
  Custom,
  Dialog,
  Menu,
  Plugin,
  getFrontend,
  openMobileFileById,
  openTab,
  showMessage
} from "siyuan";

import "./index.css";
import BoardTab from "./ui/BoardTab.svelte";
import { COLUMNS, DEFAULT_STATE, DOCK_TYPE, STORAGE_FILE, TAB_TYPE } from "./constants";
import type { DeadlineState, DeadlineTask } from "./types";
import {
  buildDueText,
  createTaskId,
  deriveColumnFromDueDate,
  deriveDueStatus,
  formatDueSchedule,
  normalizeDueDate,
  normalizeDueTime,
  normalizeState,
  normalizeTask,
  summarizeUpcoming,
  todayIsoDate
} from "./utils";

export default class CalendarDeadlinesPlugin extends Plugin {
  private state: DeadlineState = JSON.parse(JSON.stringify(DEFAULT_STATE));
  private boardApp: BoardTab | null = null;
  private dockElement: HTMLElement | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private isMobile = false;

  async onload(): Promise<void> {
    this.isMobile = getFrontend().endsWith("mobile");
    await this.loadState();

    this.registerTab();
    this.registerDock();
    this.registerCommands();
    this.registerSlashCommands();

    this.addIcons(`<symbol id="iconDeadlineCalendar" viewBox="0 0 1024 1024"><path d="M810.7 170.7h-85.4V85.3c0-23.5-19.2-42.7-42.7-42.7-23.5 0-42.7 19.2-42.7 42.7v85.4H384V85.3c0-23.5-19.2-42.7-42.7-42.7s-42.7 19.2-42.7 42.7v85.4H213.3c-70.4 0-128 57.6-128 128v512c0 70.4 57.6 128 128 128h597.3c70.4 0 128-57.6 128-128v-512c0-70.4-57.6-128-128-128zM213.3 256h597.3c23 0 42.7 19.7 42.7 42.7V384H170.7v-85.3c0-23 19.7-42.7 42.6-42.7zm597.4 597.3H213.3c-23 0-42.7-19.7-42.7-42.7V469.3h682.7v341.3c0 23-19.7 42.7-42.6 42.7z"></path></symbol>`);
  }

  onLayoutReady(): void {
    const topBar = this.addTopBar({
      icon: "iconDeadlineCalendar",
      title: this.i18n.openBoard ?? "Open Deadline Board",
      position: "right",
      callback: () => {
        const rect = topBar.getBoundingClientRect();
        this.openTopbarMenu(rect);
      }
    });

    void topBar;
  }

  async onunload(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    await this.saveState();
  }

  private registerCommands(): void {
    this.addCommand({
      langKey: "openBoard",
      langText: this.i18n.openBoard,
      hotkey: "⇧⌘K",
      callback: () => this.openBoardTab()
    });

    this.addCommand({
      langKey: "newTask",
      langText: this.i18n.newTask,
      hotkey: "⇧⌘J",
      callback: () => this.quickAddTask()
    });
  }

  private registerSlashCommands(): void {
    this.protyleSlash = [
      {
        filter: ["deadlines", "ddl", "deadline-check"],
        html: `<span>${this.i18n.slashCheckLabel ?? "Insert deadlines checklist"}</span>`,
        id: `${this.name}-deadlines-check`,
        callback: (protyle) => {
          const markdown = this.buildDeadlineChecklistMarkdown();
          protyle.insert(markdown, false);
        }
      },
      {
        filter: ["deadlineadd", "ddladd", "deadline-add"],
        html: `<span>${this.i18n.slashAddLabel ?? "Quick add deadline"}</span>`,
        id: `${this.name}-deadlines-add`,
        callback: (protyle) => {
          const task = this.promptTaskInput();
          if (!task) {
            return;
          }

          this.insertTask(task);
          showMessage(this.i18n.createdTask ?? "Task created");
          protyle.insert(`- [ ] ${task.title} (${formatDueSchedule(task.dueDate, task.dueTime)})`, false);
        }
      },
      {
        filter: ["deadlineview", "ddlview", "deadline-inspect"],
        html: `<span>${this.i18n.slashInspectLabel ?? "Open deadline inspector"}</span>`,
        id: `${this.name}-deadlines-inspect`,
        callback: (protyle) => {
          protyle.insert(window.Lute.Caret, false);
          this.openDeadlineInspectorDialog();
        }
      }
    ];
  }

  private registerTab(): void {
    const plugin = this;
    this.addTab({
      type: TAB_TYPE,
      init(this: Custom): void {
        const host = document.createElement("div");
        host.className = "deadline-board-host";
        this.element.appendChild(host);

        plugin.boardApp = new BoardTab({
          target: host,
          props: {
            tasks: plugin.state.tasks,
            columns: COLUMNS,
            hideCompleted: plugin.state.view.hideCompleted,
            sortBy: plugin.state.view.sortBy,
            onTasksChange: (tasks: DeadlineTask[]) => plugin.updateTasks(tasks),
            onOpenTask: (task: DeadlineTask) => plugin.openTask(task),
            onQuickAdd: () => plugin.quickAddTask(),
            onToggleHideCompleted: () => plugin.toggleHideCompleted(),
            onChangeSort: (next: "none" | "due" | "updated") => plugin.changeSort(next)
          }
        });
      },
      destroy(): void {
        plugin.boardApp?.$destroy();
        plugin.boardApp = null;
      }
    });
  }

  private registerDock(): void {
    this.addDock({
      type: DOCK_TYPE,
      config: {
        position: "RightBottom",
        size: {
          width: 280,
          height: 0
        },
        icon: "iconDeadlineCalendar",
        title: this.i18n.dockTitle ?? "Deadlines"
      },
      data: {},
      init: (dock) => {
        this.dockElement = dock.element as HTMLElement;
        this.renderDock();
      },
      update: () => {
        this.renderDock();
      },
      destroy: () => {
        this.dockElement = null;
      }
    });
  }

  private openTopbarMenu(rect: DOMRect): void {
    const menu = new Menu("calendar-deadlines-topbar");
    menu.addItem({
      icon: "iconDeadlineCalendar",
      label: this.i18n.openBoard ?? "Open Deadline Board",
      click: () => this.openBoardTab()
    });
    menu.addItem({
      icon: "iconAdd",
      label: this.i18n.newTask ?? "New Task",
      click: () => this.quickAddTask()
    });

    menu.open({
      x: rect.right,
      y: rect.bottom,
      isLeft: true
    });
  }

  private openBoardTab(): void {
    openTab({
      app: this.app,
      custom: {
        id: `${this.name}${TAB_TYPE}`,
        icon: "iconDeadlineCalendar",
        title: this.i18n.boardTitle ?? "Deadline Board",
        data: {}
      }
    });
  }

  private quickAddTask(): void {
    const task = this.promptTaskInput();
    if (!task) {
      return;
    }

    this.insertTask(task);
    showMessage(this.i18n.createdTask ?? "Task created");
  }

  private promptTaskInput(): DeadlineTask | null {
    const title = window.prompt(this.i18n.newTaskPrompt ?? "Task title");
    if (!title || !title.trim()) {
      return null;
    }

    const dueInput = window.prompt(
      this.i18n.newTaskDuePrompt ?? "Due date (optional, YYYY-MM-DD)",
      todayIsoDate()
    );

    let dueDate: string | undefined;
    if (dueInput !== null && dueInput.trim()) {
      dueDate = normalizeDueDate(dueInput);
      if (!dueDate) {
        showMessage(this.i18n.invalidDueDate ?? "Invalid due date. Use YYYY-MM-DD.");
        return null;
      }
    }

    const timeInput = window.prompt(
      this.i18n.newTaskTimePrompt ?? "Due time (optional, HH:mm)",
      ""
    );

    let dueTime: string | undefined;
    if (timeInput !== null && timeInput.trim()) {
      dueTime = normalizeDueTime(timeInput);
      if (!dueTime) {
        showMessage(this.i18n.invalidDueTime ?? "Invalid time. Use HH:mm.");
        return null;
      }
    }

    const now = Date.now();
    return normalizeTask({
      id: createTaskId(),
      title: title.trim(),
      column: dueDate ? deriveColumnFromDueDate(dueDate) : "today",
      dueDate,
      dueTime,
      completed: false,
      tags: [],
      dueStatus: deriveDueStatus(dueDate),
      dueText: buildDueText(dueDate, dueTime),
      createdAt: now,
      updatedAt: now
    });
  }

  private insertTask(task: DeadlineTask): void {
    this.state.tasks = [task, ...this.state.tasks];
    this.afterStateMutate();
  }

  private buildDeadlineChecklistMarkdown(): string {
    const tasks = summarizeUpcoming(this.state.tasks);
    if (!tasks.length) {
      return `- [ ] ${this.i18n.emptyDock ?? "No active tasks"}`;
    }

    const lines = tasks.map((task) => {
      const due = formatDueSchedule(task.dueDate, task.dueTime);
      const extra = task.dueText ? ` - ${task.dueText}` : "";
      return `- [ ] ${task.title} (${due})${extra}`;
    });
    return lines.join("\n");
  }

  private openDeadlineInspectorDialog(): void {
    const tasks = summarizeUpcoming(this.state.tasks);
    const listContent = tasks.length
      ? tasks
          .map((task) => {
            const schedule = this.escapeHtml(formatDueSchedule(task.dueDate, task.dueTime));
            const title = this.escapeHtml(task.title);
            const extra = task.dueText ? this.escapeHtml(task.dueText) : "";
            return `
              <li class="deadline-inspector__item">
                <div class="deadline-inspector__title">${title}</div>
                <div class="deadline-inspector__meta">${schedule}${extra ? ` | ${extra}` : ""}</div>
              </li>
            `;
          })
          .join("")
      : `<li class="deadline-inspector__item">${this.escapeHtml(this.i18n.emptyDock ?? "No active tasks")}</li>`;

    const activeCount = `${tasks.length} ${this.i18n.activeDeadlineCount ?? "active deadlines"}`;

    const dialog = new Dialog({
      title: this.i18n.deadlineInspectorTitle ?? "Deadline Inspector",
      content: `
        <div class="b3-dialog__content">
          <div class="deadline-inspector">
            <div class="deadline-inspector__summary">${this.escapeHtml(activeCount)}</div>
            <ul class="deadline-inspector__list">${listContent}</ul>
          </div>
        </div>
      `,
      width: "560px",
      height: "420px"
    });

    void dialog;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  private toggleHideCompleted(): void {
    this.state.view.hideCompleted = !this.state.view.hideCompleted;
    this.afterStateMutate();
  }

  private changeSort(next: "none" | "due" | "updated"): void {
    this.state.view.sortBy = next;
    this.afterStateMutate();
  }

  private openTask(task: DeadlineTask): void {
    const targetId = task.linkedDocId ?? task.linkedBlockId;
    if (!targetId) {
      showMessage(this.i18n.linkHint ?? "This task is not linked to a SiYuan document/block yet.");
      return;
    }

    if (this.isMobile) {
      openMobileFileById(this.app, targetId);
      return;
    }

    openTab({
      app: this.app,
      doc: {
        id: targetId
      }
    });
  }

  private updateTasks(tasks: DeadlineTask[]): void {
    this.state.tasks = tasks.map((task) => normalizeTask(task));
    this.afterStateMutate();
  }

  private afterStateMutate(): void {
    this.syncBoard();
    this.renderDock();
    this.scheduleSave();
  }

  private syncBoard(): void {
    this.boardApp?.$set({
      tasks: this.state.tasks,
      hideCompleted: this.state.view.hideCompleted,
      sortBy: this.state.view.sortBy
    });
  }

  private renderDock(): void {
    if (!this.dockElement) {
      return;
    }

    const upcoming = summarizeUpcoming(this.state.tasks);

    this.dockElement.innerHTML = `
      <section class="deadline-dock">
        <header class="deadline-dock__head">
          <span class="deadline-dock__title">${this.i18n.dockTitle ?? "Deadlines"}</span>
          <button class="deadline-dock__open" data-role="open-board">${this.i18n.openBoard ?? "Open"}</button>
        </header>
        <ul class="deadline-dock__list">
          ${
            upcoming.length
              ? upcoming
                  .map(
                    (task) => `
              <li class="deadline-dock__item">
                <strong>${this.escapeHtml(task.title)}</strong>
                <div class="deadline-dock__meta">${this.escapeHtml(formatDueSchedule(task.dueDate, task.dueTime))}${task.dueText ? ` | ${this.escapeHtml(task.dueText)}` : ""}</div>
              </li>
            `
                  )
                  .join("")
              : `<li class="deadline-dock__item">${this.i18n.emptyDock ?? "No active tasks"}</li>`
          }
        </ul>
      </section>
    `;

    const openButton = this.dockElement.querySelector<HTMLButtonElement>("[data-role='open-board']");
    openButton?.addEventListener("click", () => this.openBoardTab(), { once: true });
  }

  private scheduleSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(() => {
      void this.saveState();
    }, 800);
  }

  private async loadState(): Promise<void> {
    const loaded = await this.loadData(STORAGE_FILE);
    this.state = normalizeState(loaded);
  }

  private async saveState(): Promise<void> {
    await this.saveData(STORAGE_FILE, this.state);
  }
}
