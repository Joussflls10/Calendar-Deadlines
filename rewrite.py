import re

with open('src/ui/BoardTab.svelte', 'r', encoding='utf-8') as f:
    content = f.read()

script_end = content.find('</script>') + len('</script>\n\n')

new_html_css = \`
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
        <button class="btn icon-only" title="Sort">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
        </button>
        <button class="btn icon-only" title="Refresh">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
        </button>
      </div>
    </div>
  </header>

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
                  <h3>{task.title}</h3>
                </div>

                <div class="card-meta">
                  {#if task.dueDate}
                    <div class="due-pill {dueClass(task).includes('urgent') ? 'urgent' : dueClass(task).includes('warning') ? 'warning' : 'normal'}">
                      <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                      {task.dueDate}{#if task.dueText}&nbsp;&bull;&nbsp;{task.dueText}{/if}
                    </div>
                  {/if}

                  {#if task.priority === "High"}
                    <div class="priority-text">&bull; High Priority</div>
                  {/if}
                </div>

                {#if task.tags.length > 0}
                  <div class="tags">
                    {#each task.tags as tag}
                      <span class="tag">{tag.label}</span>
                    {/each}
                  </div>
                {/if}

                {#if task.subtasks?.length}
                  <details>
                    <summary class="subtasks-toggle">
                      <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                      Subtasks ({task.subtasks.length})
                    </summary>
                    <div class="progress-wrap">
                      <div class="progress-bar" style="width: {task.progress ?? 0}%"></div>
                    </div>
                    <ul class="subtasks">
                      {#each task.subtasks as subtask}
                        <li>
                          <label class="subtask-label">
                            <input type="checkbox" checked={subtask.completed} on:change={() => toggleSubtask(task.id, subtask.id)} />
                            <span class:line={subtask.completed}>{subtask.title}</span>
                          </label>
                        </li>
                      {/each}
                    </ul>
                  </details>
                {/if}
              </div>
            </article>
          {/each}
        </div>
      </section>
    {/each}
  </main>
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
    --bg-main: #0e0e0e;
    --surface-col: transparent;
    --surface-card: #1a1b1e;
    --text-1: #ffffff;
    --text-2: #8a8f98;
    --line: #2a2b2f;
    --line-faint: #1e1f22;
    
    /* Brand Colors */
    --brand-blue: #3b82f6;
    --brand-blue-bg: #1c2b42;
    --dot-urgent: #ef4444;
    --dot-warning: #f59e0b;
    --dot-info: #3b82f6;

    /* Pills */
    --pill-urgent-bg: #2d1616;
    --pill-urgent-text: #fca5a5;
    --pill-warning-bg: #2c2410;
    --pill-warning-text: #fcd34d;
    --pill-info-bg: #152538;
    --pill-info-text: #93c5fd;

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
    border-bottom: 1px solid var(--line);
    background: #111111;
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
    border: 1px solid #233654;
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
    color: #333;
    font-weight: 300;
  }

  .subtitle {
    color: #e5e5e5;
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
    background: transparent;
    border-color: var(--line);
    color: #a1a1aa;
  }

  .btn.secondary:hover {
    background: #191919;
    color: #e4e4e7;
  }

  .header-icons {
    display: flex;
    gap: 4px;
    margin-left: 8px;
  }

  .btn.icon-only {
    padding: 6px;
    color: #71717a;
    background: transparent;
  }

  .btn.icon-only:hover {
    color: #a1a1aa;
  }

  .board-grid {
    display: flex;
    gap: 20px;
    padding: 24px;
    overflow-x: auto;
    align-items: flex-start;
  }

  .column {
    min-width: 320px;
    width: 320px;
    background: transparent;
    border: 1px solid var(--line-faint);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
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
    font-size: 0.95rem;
    font-weight: 600;
    color: #f4f4f5;
  }

  .col-badge {
    font-size: 0.75rem;
    color: #a1a1aa;
    background: #1f1f22;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid #2a2a2d;
  }

  .cards {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .card {
    background: var(--surface-card);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 14px;
    display: flex;
    gap: 12px;
    cursor: grab;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .card:hover {
    border-color: #3f3f46;
  }

  .card.done {
    opacity: 0.5;
  }

  .card-left {
    flex-shrink: 0;
    margin-top: 2px;
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
    gap: 10px;
    min-width: 0;
  }

  .card-header h3 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 500;
    color: #f4f4f5;
    line-height: 1.3;
  }

  .card-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .due-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 500;
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
    font-size: 0.75rem;
    color: var(--pill-urgent-text);
    font-weight: 500;
  }

  .tags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .tag {
    background: #222225;
    border: 1px solid #333336;
    color: #a1a1aa;
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 4px;
  }

  details {
    margin-top: 4px;
    border-top: 1px solid var(--line-faint);
    padding-top: 10px;
  }

  .subtasks-toggle {
    cursor: pointer;
    font-size: 0.75rem;
    color: #71717a;
    display: flex;
    align-items: center;
    gap: 6px;
    list-style: none; /* Hide default triangle */
  }

  .subtasks-toggle::-webkit-details-marker {
    display: none;
  }

  .subtasks-toggle svg {
    transition: transform 0.2s;
  }

  details[open] .subtasks-toggle svg {
    transform: rotate(90deg);
  }

  .progress-wrap {
    margin: 8px 0;
    height: 4px;
    background: #27272a;
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: #3b82f6;
  }

  .subtasks {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 0.8rem;
  }

  .subtask-label {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #a1a1aa;
    cursor: pointer;
  }

  .line {
    text-decoration: line-through;
    opacity: 0.6;
  }

  .empty {
    border: 1px dashed #2a2b2f;
    border-radius: 8px;
    padding: 30px 16px;
    text-align: center;
    color: var(--text-2);
    font-size: 0.85rem;
  }
</style>
\\\`

with open('src/ui/BoardTab.svelte', 'w', encoding='utf-8') as f:
    f.write(content[:script_end] + new_html_css.replace('\\\', ''))
