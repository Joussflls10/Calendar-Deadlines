<script lang="ts">
  import type { DeadlineColumn, DeadlineTask } from "@/types";
  import { formatDueSchedule, toDueTimestamp } from "@/utils";
  import MiniCalendar from "./MiniCalendar.svelte";

  export let tasks: DeadlineTask[] = [];
  export let columns: DeadlineColumn[] = [];
  export let hideCompleted = false;
  export let sortBy: "none" | "due" | "updated" = "none";

  export let onTasksChange: (tasks: DeadlineTask[]) => void;
  export let onOpenTask: (task: DeadlineTask) => void;
  export let onQuickAdd: () => void;
  export let onToggleHideCompleted: () => void;
  export let onChangeSort: (next: "none" | "due" | "updated") => void;

  let draggedTaskId: string | null = null;

  const statusToClass = {
    urgent: "due urgent",
    warning: "due warning",
    normal: "due normal"
  } as const;

  function parseDue(task: DeadlineTask): number {
    return toDueTimestamp(task.dueDate, task.dueTime);
  }

  function getSorted(list: DeadlineTask[]): DeadlineTask[] {
    if (sortBy === "updated") {
      return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
    }
    if (sortBy === "due") {
      return [...list].sort((a, b) => parseDue(a) - parseDue(b));
    }
    return list;
  }

  $: visibleTasks = tasks.filter((task) => !(hideCompleted && task.completed));

  $: groupedByColumn = columns.map((column) => ({
    ...column,
    tasks: getSorted(visibleTasks.filter((task) => task.column === column.id))
  }));

  function updateTasks(next: DeadlineTask[]): void {
    onTasksChange(next);
  }

  function toggleTaskCompletion(id: string): void {
    const next = tasks.map((task) => {
      if (task.id !== id) {
        return task;
      }
      const completed = !task.completed;
      const nextColumn: DeadlineColumn["id"] = completed
        ? "completed"
        : task.column === "completed"
          ? "today"
          : task.column;
      return {
        ...task,
        completed,
        column: nextColumn,
        updatedAt: Date.now()
      };
    });
    updateTasks(next);
  }

  function cycleSort(): void {
    const order: Array<"none" | "due" | "updated"> = ["none", "due", "updated"];
    const currentIndex = order.indexOf(sortBy);
    const next = order[(currentIndex + 1) % order.length];
    onChangeSort(next);
  }

  function handleDragStart(id: string): void {
    draggedTaskId = id;
  }

  function handleDrop(columnId: DeadlineColumn["id"]): void {
    if (!draggedTaskId) {
      return;
    }

    const next = tasks.map((task) => {
      if (task.id !== draggedTaskId) {
        return task;
      }
      const completed = columnId === "completed";
      return {
        ...task,
        column: columnId,
        completed,
        updatedAt: Date.now()
      };
    });

    draggedTaskId = null;
    updateTasks(next);
  }

  function toggleSubtask(taskId: string, subtaskId: string): void {
    const next = tasks.map((task) => {
      if (task.id !== taskId || !task.subtasks?.length) {
        return task;
      }

      const subtasks = task.subtasks.map((subtask) =>
        subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask
      );

      const completedCount = subtasks.filter((subtask) => subtask.completed).length;
      const progress = Math.round((completedCount / subtasks.length) * 100);

      return {
        ...task,
        subtasks,
        progress,
        updatedAt: Date.now()
      };
    });

    updateTasks(next);
  }

  function dueClass(task: DeadlineTask): string {
    if (!task.dueStatus) {
      return "due normal";
    }
    return statusToClass[task.dueStatus] ?? "due normal";
  }

  function editTask(taskId: string): void {
    const current = tasks.find((task) => task.id === taskId);
    if (!current) {
      return;
    }

    const nextTitle = window.prompt("Task title", current.title);
    if (!nextTitle || !nextTitle.trim()) {
      return;
    }

    const next = tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            title: nextTitle.trim(),
            updatedAt: Date.now()
          }
        : task
    );

    updateTasks(next);
  }

  function deleteTask(taskId: string): void {
    const confirmed = window.confirm("Delete this task?");
    if (!confirmed) {
      return;
    }

    const next = tasks.filter((task) => task.id !== taskId);
    updateTasks(next);
  }

  function linkTask(taskId: string): void {
    const current = tasks.find((task) => task.id === taskId);
    if (!current) {
      return;
    }

    const currentId = current.linkedDocId ?? current.linkedBlockId ?? "";
    const linkedId = window.prompt("Linked document or block ID", currentId);
    if (linkedId === null) {
      return;
    }

    const trimmed = linkedId.trim();
    const next = tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            linkedDocId: trimmed || undefined,
            linkedBlockId: undefined,
            updatedAt: Date.now()
          }
        : task
    );

    updateTasks(next);
  }
</script>
<div class="board-shell">
  <header class="board-header">
    <div class="header-left">
      <div class="board-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      </div>
      <h1><span>Student Hub</span><span class="divider">|</span><span class="subtitle">Deadline Tracker</span></h1>
    </div>
    <div class="actions">
      <button class="btn primary" on:click={onQuickAdd}>
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="css-i6dzq1"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        New Task
      </button>
      <button class="btn secondary">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
        Paste List
      </button>
      <div class="header-icons">
        <button class="btn icon-only" on:click={onToggleHideCompleted} title={hideCompleted ? 'Show Completed' : 'Hide Completed'}>
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle><line x1="1" y1="1" x2="23" y2="23"></line></svg>
        </button>
        <button class="btn icon-only" title={`Sort: ${sortBy}`} on:click={cycleSort}>
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
        </button>
        <button class="btn icon-only" title="Refresh">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
        </button>
      </div>
    </div>
  </header>

  
  <div class="board-body-wrap">
    <main class="board-grid">
    {#each groupedByColumn as column}
      <section class="column" role="list" aria-label={column.title} on:dragover|preventDefault on:drop={() => handleDrop(column.id)}>
        <header class="column-head">
          <div class="col-title-wrap">
            <span class="status-dot {column.id}"></span>
            <h2>{column.title}</h2>
          </div>
          <span class="col-badge">{column.tasks.length}</span>
        </header>

        <div class="cards">
          {#if column.tasks.length === 0}
            <div class="empty">Drop tasks here</div>
          {/if}

          {#each column.tasks as task}
            <article class:done={task.completed} class="card" draggable="true" on:dragstart={() => handleDragStart(task.id)} on:dragend={() => (draggedTaskId = null)}>
              <div class="card-left">
                <button class="circle-check" class:checked={task.completed} on:click={() => toggleTaskCompletion(task.id)}>
                   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>
                </button>
              </div>
              <div class="card-content">
                <div class="card-header">
                  <button class="title-btn" on:click={() => editTask(task.id)} title="Edit task title">{task.title}</button>
                  <button class="card-open" on:click={() => onOpenTask(task)} title="Open linked document or block" aria-label="Open linked document or block">
                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3h7v7"></path><path d="M10 14 21 3"></path><path d="M21 14v7h-7"></path><path d="M3 10V3h7"></path><path d="M3 21l11-11"></path></svg>
                  </button>
                </div>

                <div class="card-meta">
                  {#if task.dueDate}
                    <div class="due-pill {dueClass(task).includes('urgent') ? 'urgent' : dueClass(task).includes('warning') ? 'warning' : 'normal'}">
                      <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                      {formatDueSchedule(task.dueDate, task.dueTime)}
                    </div>
                  {/if}

                  {#if task.priority === "High"}
                    <div class="priority-text">&bull; High Priority</div>
                  {/if}
                </div>

                {#if task.tags && task.tags.length > 0}
                  <div class="tags">
                    {#each task.tags as tag}
                      <span class="tag">{tag.label}</span>
                    {/each}
                  </div>
                {/if}

              </div>
            </article>
          {/each}
        </div>
      </section>
    {/each}
  
    </main>
    <aside class="board-sidebar">
      <MiniCalendar {tasks} />
    </aside>
  </div>
</div>

<style>
  :global(.deadline-board-host) {
    height: 100%;
    overflow: auto;
    color-scheme: dark light;
    background: #0e0e0e;
  }

  :global(.deadline-board-host *) {
    box-sizing: border-box;
  }

  .board-shell {
    --bg-main: var(--b3-theme-background-light, var(--b3-theme-background, #101319));
    --surface-col: var(--b3-theme-surface-light, #141922);
    --surface-card: var(--b3-theme-surface, #181d26);
    --text-1: var(--b3-theme-on-background, #e5e7eb);
    --text-2: var(--b3-theme-on-surface-light, var(--b3-theme-on-surface, #b1b8c5));
    --line: var(--b3-border-color, rgba(148, 163, 184, 0.22));
    --line-faint: var(--b3-border-color-trans, rgba(148, 163, 184, 0.14));
    
    /* Brand Colors */
    --brand-blue: var(--b3-theme-primary, #3b82f6);
    --brand-blue-bg: var(--b3-theme-primary-light, #1c2b42);
    --dot-urgent: var(--b3-theme-error, #ef4444);
    --dot-warning: var(--b3-theme-warning, #f59e0b);
    --dot-info: var(--b3-theme-info, #3b82f6);

    /* Pills - Fallback somewhat to base theme */
    --pill-urgent-bg: var(--b3-theme-error-light, #2d1616);
    --pill-urgent-text: var(--b3-theme-error, #fca5a5);
    --pill-warning-bg: var(--b3-theme-warning-light, #2c2410);
    --pill-warning-text: var(--b3-theme-warning, #fcd34d);
    --pill-info-bg: var(--b3-theme-info-light, #152538);
    --pill-info-text: var(--b3-theme-info, #93c5fd);

    min-height: 100%;
    background: var(--bg-main);
    color: var(--text-1);
    padding: 0;
    display: flex;
    flex-direction: column;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }

  .board-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    border-bottom: 1px solid var(--line-faint);
    background: var(--bg-main);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .board-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: var(--brand-blue-bg);
    color: var(--brand-blue);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(96, 165, 250, 0.28);
  }

  h1 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  h1 span:first-child {
    color: var(--brand-blue);
  }

  .divider {
    color: var(--text-2);
    opacity: 0.65;
    font-weight: 300;
  }

  .subtitle {
    color: var(--text-2);
  }

  .actions {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    padding: 6px 12px;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.15s ease;
  }

  .btn.primary {
    background: #192a47;
    color: #60a5fa;
    border-color: #233a60;
  }

  .btn.primary:hover {
    background: #203558;
  }

  .btn.secondary {
    background: var(--surface-col);
    border-color: transparent;
    color: var(--text-2);
  }

  .btn.secondary:hover {
    background: var(--surface-card);
    color: var(--text-1);
  }

  .header-icons {
    display: flex;
    gap: 4px;
    margin-left: 8px;
  }

  .btn.icon-only {
    padding: 6px;
    color: var(--text-2);
    background: var(--surface-col);
  }

  .btn.icon-only:hover {
    color: var(--text-1);
    background: var(--surface-card);
  }


  .board-body-wrap {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
  
  .board-sidebar {
    padding: 20px 24px 24px 4px;
    overflow-y: auto;
    display: flex;
    align-items: flex-start;
  }
  
.board-grid {
    flex: 1;
    display: flex;
    gap: 20px;
    padding: 24px;
    overflow-x: auto;
    align-items: flex-start;
  }

  .column {
    min-width: 320px;
    width: 320px;
    background: var(--surface-col);
    border: 1px solid transparent;
    border-radius: 12px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .column-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .col-title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .status-dot.today { background: var(--dot-urgent); }
  .status-dot.week { background: var(--dot-warning); }
  .status-dot.upcoming { background: var(--dot-info); }
  .status-dot.completed { background: #10b981; }

  .column-head h2 {
    margin: 0;
    font-size: 0.92rem;
    font-weight: 600;
    line-height: 1.25;
    letter-spacing: 0.01em;
    color: var(--text-1);
  }

  .col-badge {
    font-size: 0.72rem;
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: 0.015em;
    color: var(--text-2);
    background: var(--surface-card);
    padding: 3px 7px;
    border-radius: 4px;
    border: none;
  }

  .cards {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .card {
    background: var(--surface-card);
    border: 1px solid transparent;
    border-radius: 10px;
    padding: 15px 14px;
    display: flex;
    gap: 13px;
    cursor: grab;
    transition: background 0.2s ease;
  }

  .card:hover {
    background: #1f242d;
  }

  .card.done {
    opacity: 0.65;
  }

  .card-left {
    flex-shrink: 0;
    margin-top: 1px;
  }

  .circle-check {
    background: transparent;
    border: none;
    color: #52525b;
    padding: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s;
  }

  .circle-check:hover {
    color: #a1a1aa;
  }

  .circle-check.checked {
    color: #10b981;
  }

  .card-content {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    gap: 11px;
    min-width: 0;
  }

  .card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }

  .title-btn {
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    text-align: left;
    font-size: 0.93rem;
    font-weight: 580;
    color: var(--text-1);
    line-height: 1.45;
    letter-spacing: 0.005em;
    cursor: pointer;
    flex: 1;
  }

  .title-btn:hover {
    color: #f8fafc;
  }

  .card-open {
    border: none;
    background: var(--surface-col);
    color: var(--text-2);
    border-radius: 7px;
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
  }

  .card-open:hover {
    color: var(--text-1);
    background: var(--line);
  }

  .card-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .due-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 9px;
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 600;
    line-height: 1.25;
    letter-spacing: 0.015em;
  }

  .due-pill.urgent {
    background: var(--pill-urgent-bg);
    color: var(--pill-urgent-text);
  }

  .due-pill.warning {
    background: var(--pill-warning-bg);
    color: var(--pill-warning-text);
  }

  .due-pill.normal {
    background: var(--pill-info-bg);
    color: var(--pill-info-text);
  }

  .priority-text {
    font-size: 0.72rem;
    line-height: 1.3;
    letter-spacing: 0.02em;
    color: var(--pill-urgent-text);
    font-weight: 600;
  }

  .tags {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .tag {
    background: var(--line-faint);
    border: none;
    color: var(--text-2);
    font-size: 0.68rem;
    font-weight: 500;
    line-height: 1.3;
    letter-spacing: 0.01em;
    padding: 3px 7px;
    border-radius: 5px;
  }

  .empty {
    border: 1px dashed var(--line-faint);
    background: var(--surface-col);
    border-radius: 10px;
    padding: 34px 16px;
    text-align: center;
    color: var(--text-2);
    font-size: 0.82rem;
    line-height: 1.45;
    letter-spacing: 0.01em;
  }

  .title-btn:focus-visible,
  .card-open:focus-visible,
  .circle-check:focus-visible {
    outline: 2px solid rgba(96, 165, 250, 0.55);
    outline-offset: 1px;
  }
</style>
