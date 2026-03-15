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
  getDueDiffDays,
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
      title: this.i18n.openInspector ?? "Open Inspector",
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
      langKey: "openInspector",
      langText: this.i18n.openInspector ?? "Open Inspector",
      hotkey: "⇧⌘K",
      callback: () => this.openDeadlineInspectorDialog()
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
        html: `<span>${this.i18n.slashCheckLabel ?? "Open deadline inspector"}</span>`,
        id: `${this.name}-deadlines-check`,
        callback: (protyle) => {
          protyle.insert(window.Lute.Caret, false);
          this.openDeadlineInspectorDialog();
        }
      },
      {
        filter: ["deadlineadd", "ddladd", "deadline-add"],
        html: `<span>${this.i18n.slashAddLabel ?? "Quick add deadline"}</span>`,
        id: `${this.name}-deadlines-add`,
        callback: (protyle) => {
          protyle.insert(window.Lute.Caret, false);
          this.openQuickAddDialog();
        }
      },
      {
        filter: ["deadlinelink", "ddllink", "deadline-link"],
        html: `<span>${this.i18n.slashLinkLabel ?? "Insert board link"}</span>`,
        id: `${this.name}-deadlines-link`,
        callback: (protyle) => {
          const linkText = this.i18n.boardTitle ?? "Deadline Board";
          protyle.insert(`[${linkText}](${this.getBoardDeepLink()})`, false);
          showMessage(this.i18n.insertedBoardLink ?? "Board link inserted");
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
      icon: "iconAdd",
      label: this.i18n.newTask ?? "New Task",
      click: () => this.quickAddTask()
    });
    menu.addItem({
      icon: "iconList",
      label: this.i18n.openInspector ?? "Inspector",
      click: () => this.openDeadlineInspectorDialog()
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
    this.openQuickAddDialog();
  }

  private createTaskFromInput(args: {
    title: string;
    dueDateValue?: string;
    dueTimeValue?: string;
    priorityValue?: string;
  }): DeadlineTask | null {
    const title = args.title.trim();
    if (!title) {
      showMessage(this.i18n.newTaskPrompt ?? "Task title");
      return null;
    }

    const dueDateRaw = args.dueDateValue?.trim();
    let dueDate: string | undefined;
    if (dueDateRaw) {
      dueDate = normalizeDueDate(dueDateRaw);
      if (!dueDate) {
        showMessage(this.i18n.invalidDueDate ?? "Invalid due date. Use YYYY-MM-DD.");
        return null;
      }
    }

    const dueTimeRaw = args.dueTimeValue?.trim();
    let dueTime: string | undefined;
    if (dueTimeRaw) {
      dueTime = normalizeDueTime(dueTimeRaw);
      if (!dueTime) {
        showMessage(this.i18n.invalidDueTime ?? "Invalid time. Use HH:mm.");
        return null;
      }
    }

    const priority =
      args.priorityValue === "High" || args.priorityValue === "Medium" || args.priorityValue === "Low"
        ? args.priorityValue
        : undefined;

    const now = Date.now();
    return normalizeTask({
      id: createTaskId(),
      title,
      column: dueDate ? deriveColumnFromDueDate(dueDate) : "today",
      dueDate,
      dueTime,
      completed: false,
      tags: [],
      priority,
      dueStatus: deriveDueStatus(dueDate),
      dueText: buildDueText(dueDate, dueTime),
      createdAt: now,
      updatedAt: now
    });
  }

  private openQuickAddDialog(): void {
    const dialog = new Dialog({
      title: this.i18n.quickAddDialogTitle ?? "Quick Add Deadline",
      content: `
        <div class="b3-dialog__content">
          <div class="deadline-quickadd">
            <label class="deadline-quickadd__label" for="deadline-title">${this.escapeHtml(this.i18n.newTaskPrompt ?? "Task title")}</label>
            <input id="deadline-title" class="b3-text-field" type="text" placeholder="${this.escapeHtml(this.i18n.newTaskPrompt ?? "Task title")}" />
            <div class="deadline-quickadd__grid">
              <div class="deadline-quickadd__field">
                <label class="deadline-quickadd__label" for="deadline-date">${this.escapeHtml(this.i18n.newTaskDuePrompt ?? "Due date (optional, YYYY-MM-DD)")}</label>
                <input id="deadline-date" class="b3-text-field" type="date" value="${todayIsoDate()}" />
              </div>
              <div class="deadline-quickadd__field">
                <label class="deadline-quickadd__label" for="deadline-time">${this.escapeHtml(this.i18n.newTaskTimePrompt ?? "Due time (optional, HH:mm)")}</label>
                <input id="deadline-time" class="b3-text-field" type="time" />
              </div>
            </div>
            <div class="deadline-quickadd__field">
              <label class="deadline-quickadd__label" for="deadline-priority">${this.escapeHtml(this.i18n.priorityLabel ?? "Priority")}</label>
              <select id="deadline-priority" class="b3-select">
                <option value="">${this.escapeHtml(this.i18n.priorityAuto ?? "Auto")}</option>
                <option value="High">${this.escapeHtml(this.i18n.priorityHigh ?? "High")}</option>
                <option value="Medium">${this.escapeHtml(this.i18n.priorityMedium ?? "Medium")}</option>
                <option value="Low">${this.escapeHtml(this.i18n.priorityLow ?? "Low")}</option>
              </select>
            </div>
          </div>
        </div>
        <div class="b3-dialog__action">
          <button class="b3-button b3-button--cancel" data-role="cancel">${this.escapeHtml(this.i18n.cancelLabel ?? "Cancel")}</button>
          <div class="fn__space"></div>
          <button class="b3-button b3-button--text" data-role="save">${this.escapeHtml(this.i18n.saveLabel ?? "Save")}</button>
        </div>
      `,
      width: "560px",
      height: "360px"
    });

    const titleInput = dialog.element.querySelector<HTMLInputElement>("#deadline-title");
    const dateInput = dialog.element.querySelector<HTMLInputElement>("#deadline-date");
    const timeInput = dialog.element.querySelector<HTMLInputElement>("#deadline-time");
    const priorityInput = dialog.element.querySelector<HTMLSelectElement>("#deadline-priority");
    const cancelButton = dialog.element.querySelector<HTMLButtonElement>("[data-role='cancel']");
    const saveButton = dialog.element.querySelector<HTMLButtonElement>("[data-role='save']");

    const saveTask = (): void => {
      const task = this.createTaskFromInput({
        title: titleInput?.value ?? "",
        dueDateValue: dateInput?.value,
        dueTimeValue: timeInput?.value,
        priorityValue: priorityInput?.value
      });

      if (!task) {
        return;
      }

      this.insertTask(task);
      showMessage(this.i18n.createdTask ?? "Task created");
      dialog.destroy();
      this.openDeadlineInspectorDialog();
    };

    cancelButton?.addEventListener("click", () => dialog.destroy(), { once: true });
    saveButton?.addEventListener("click", saveTask, { once: true });
    titleInput?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        saveTask();
      }
    });
    titleInput?.focus();
  }

  private insertTask(task: DeadlineTask): void {
    this.state.tasks = [task, ...this.state.tasks];
    this.afterStateMutate();
  }

  private completeTask(taskId: string): void {
    const next = this.state.tasks.map((task) =>
      task.id === taskId
        ? normalizeTask({
            ...task,
            completed: true,
            column: "completed",
            updatedAt: Date.now()
          })
        : task
    );
    this.updateTasks(next);
    showMessage(this.i18n.completedTask ?? "Task completed");
  }

  private openTaskFromDock(taskId: string): void {
    const task = this.state.tasks.find((item) => item.id === taskId);
    if (!task) {
      return;
    }
    this.openTask(task);
  }

  private getBoardDeepLink(): string {
    return `siyuan://plugins/${this.name}`;
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
    const urgentTasks = upcoming.filter((task) => (task.dueStatus ?? "normal") === "urgent");
    const warningTasks = upcoming.filter((task) => (task.dueStatus ?? "normal") === "warning");
    const normalTasks = upcoming.filter((task) => (task.dueStatus ?? "normal") === "normal");
    const criticalCount = upcoming.filter((task) => {
      const diff = getDueDiffDays(task.dueDate);
      return diff !== null && diff <= 0;
    }).length;
    const weekCount = upcoming.filter((task) => {
      const diff = getDueDiffDays(task.dueDate);
      return diff !== null && diff > 0 && diff <= 7;
    }).length;
    const laterCount = Math.max(upcoming.length - criticalCount - weekCount, 0);

    const groupHtml = (title: string, tone: "urgent" | "warning" | "normal", tasks: DeadlineTask[]): string => {
      if (!tasks.length) {
        return "";
      }

      return `
        <section class="deadline-dock__group ${tone}">
          <header class="deadline-dock__group-head">
            <span>${this.escapeHtml(title)}</span>
            <span class="deadline-dock__group-count">${tasks.length}</span>
          </header>
          <ul class="deadline-dock__group-list">
            ${tasks
              .map(
                (task) => `
                  <li class="deadline-dock__item ${this.escapeHtml(task.dueStatus ?? "normal")}">
                    <div class="deadline-dock__item-top">
                      <strong class="deadline-dock__task-title">${this.escapeHtml(task.title)}</strong>
                      <span class="deadline-dock__pill ${this.escapeHtml(task.dueStatus ?? "normal")}">${this.escapeHtml(
                        task.dueStatus === "urgent"
                          ? this.i18n.urgencyUrgent ?? "Urgent"
                          : task.dueStatus === "warning"
                            ? this.i18n.urgencySoon ?? "Soon"
                            : this.i18n.urgencyNormal ?? "Normal"
                      )}</span>
                    </div>
                    <div class="deadline-dock__meta">${this.escapeHtml(formatDueSchedule(task.dueDate, task.dueTime))}${task.dueText ? ` | ${this.escapeHtml(task.dueText)}` : ""}</div>
                    ${
                      task.priority
                        ? `<div class="deadline-dock__priority ${this.escapeHtml(task.priority.toLowerCase())}">${this.escapeHtml(task.priority)} ${this.escapeHtml(this.i18n.priorityLabel ?? "Priority")}</div>`
                        : ""
                    }
                    <div class="deadline-dock__task-actions">
                      <button class="deadline-dock__task-btn" data-role="task-open" data-task-id="${this.escapeHtml(task.id)}">${this.escapeHtml(this.i18n.openAction ?? "Open")}</button>
                      <button class="deadline-dock__task-btn success" data-role="task-done" data-task-id="${this.escapeHtml(task.id)}">${this.escapeHtml(this.i18n.doneAction ?? "Done")}</button>
                    </div>
                  </li>
                `
              )
              .join("")}
          </ul>
        </section>
      `;
    };

    this.dockElement.innerHTML = `
      <section class="deadline-dock">
        <header class="deadline-dock__head">
          <span class="deadline-dock__title">${this.i18n.dockTitle ?? "Deadlines"}</span>
          <div class="deadline-dock__actions">
            <button class="deadline-dock__btn" data-role="quick-add">${this.i18n.newTask ?? "New"}</button>
            <button class="deadline-dock__btn" data-role="open-inspector">${this.i18n.openInspector ?? "Inspector"}</button>
          </div>
        </header>
        <div class="deadline-dock__stats">
          <div class="deadline-dock__stat urgent">
            <span>${this.escapeHtml(this.i18n.statsCritical ?? "Critical")}</span>
            <strong>${criticalCount}</strong>
          </div>
          <div class="deadline-dock__stat warning">
            <span>${this.escapeHtml(this.i18n.statsThisWeek ?? "This Week")}</span>
            <strong>${weekCount}</strong>
          </div>
          <div class="deadline-dock__stat normal">
            <span>${this.escapeHtml(this.i18n.statsLater ?? "Later")}</span>
            <strong>${laterCount}</strong>
          </div>
        </div>
        <div class="deadline-dock__list">
          ${
            upcoming.length
              ? `${groupHtml(this.i18n.groupUrgent ?? "Urgent", "urgent", urgentTasks)}${groupHtml(this.i18n.groupSoon ?? "Soon", "warning", warningTasks)}${groupHtml(this.i18n.groupUpcoming ?? "Upcoming", "normal", normalTasks)}`
              : `<div class="deadline-dock__item">${this.i18n.emptyDock ?? "No active tasks"}</div>`
          }
        </div>
      </section>
    `;

    const addButton = this.dockElement.querySelector<HTMLButtonElement>("[data-role='quick-add']");
    const inspectButton = this.dockElement.querySelector<HTMLButtonElement>("[data-role='open-inspector']");
    const doneButtons = this.dockElement.querySelectorAll<HTMLButtonElement>("[data-role='task-done']");
    const openButtons = this.dockElement.querySelectorAll<HTMLButtonElement>("[data-role='task-open']");

    addButton?.addEventListener("click", () => this.openQuickAddDialog(), { once: true });
    inspectButton?.addEventListener("click", () => this.openDeadlineInspectorDialog(), { once: true });
    doneButtons.forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const taskId = button.dataset.taskId;
          if (taskId) {
            this.completeTask(taskId);
          }
        },
        { once: true }
      );
    });
    openButtons.forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const taskId = button.dataset.taskId;
          if (taskId) {
            this.openTaskFromDock(taskId);
          }
        },
        { once: true }
      );
    });
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
