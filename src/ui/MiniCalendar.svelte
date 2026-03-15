<script lang="ts">
  import type { DeadlineTask } from "@/types";
  import { normalizeDueDate } from "@/utils";

  export let tasks: DeadlineTask[] = [];

  let today = new Date();
  $: currentMonth = today.getMonth();
  $: currentYear = today.getFullYear();

  $: firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  $: daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  $: days = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const m = String(currentMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const dateStr = `${currentYear}-${m}-${d}`;
    
    const dayTasks = tasks.filter(t => {
      const dueDate = normalizeDueDate(t.dueDate);
      if (!dueDate) return false;
      return dueDate === dateStr;
    });

    const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

    return { day, dateStr, deadlines: dayTasks, isToday };
  });

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function prevMonth() {
    if (currentMonth === 0) {
      currentMonth = 11;
      currentYear -= 1;
    } else {
      currentMonth -= 1;
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      currentMonth = 0;
      currentYear += 1;
    } else {
      currentMonth += 1;
    }
  }
</script>

<div class="mini-calendar">
  <header class="cal-header">
    <button class="cal-btn" on:click={prevMonth}>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
    </button>
    <div class="cal-month">{monthNames[currentMonth]} {currentYear}</div>
    <button class="cal-btn" on:click={nextMonth}>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </button>
  </header>
  <div class="cal-grid cal-days-head">
    <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
  </div>
  <div class="cal-grid cal-days">
    {#each Array(firstDayOfMonth) as _}
      <div class="cal-day empty"></div>
    {/each}
    {#each days as { day, isToday, deadlines }}
      <div class="cal-day" class:today={isToday}>
        <span class="day-num">{day}</span>
        {#if deadlines.length > 0}
          <div class="dots">
            {#each deadlines.slice(0, 3) as d}
              <div class="dot" class:urgent={d.priority === 'High'}></div>
            {/each}
            {#if deadlines.length > 3}
              <div class="dot-more">+</div>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .mini-calendar {
    background: var(--surface-card, var(--b3-theme-surface, #1a1b1e));
    border: 1px solid transparent;
    border-radius: 12px;
    padding: 18px;
    width: 260px;
    flex-shrink: 0;
    font-family: inherit;
    box-sizing: border-box;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
  }
  .cal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
    color: var(--text-1, var(--b3-theme-on-background, #e5e7eb));
  }
  .cal-month {
    font-size: 0.92rem;
    font-weight: 600;
    line-height: 1.25;
    letter-spacing: 0.01em;
  }
  .cal-btn {
    background: transparent;
    border: none;
    color: var(--text-2, var(--b3-theme-on-surface, #8a8f98));
    cursor: pointer;
    padding: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: all 0.2s;
  }
  .cal-btn:hover {
    background: var(--surface-col, var(--b3-theme-surface-light, #1d222b));
    color: var(--text-1, var(--b3-theme-on-background, #e5e7eb));
  }
  .cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
  }
  .cal-days-head {
    margin-bottom: 10px;
  }
  .cal-days-head span {
    text-align: center;
    font-size: 0.68rem;
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: 0.03em;
    color: var(--text-2, var(--b3-theme-on-surface, #8a8f98));
  }
  .cal-day {
    aspect-ratio: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 0.82rem;
    font-weight: 500;
    line-height: 1.2;
    color: var(--text-1, var(--b3-theme-on-background, #e5e7eb));
    border-radius: 8px;
    position: relative;
    cursor: default;
    transition: background 0.15s;
  }
  .cal-day.empty {
    visibility: hidden;
  }
  .cal-day:not(.empty):hover {
    background: var(--line-faint, var(--b3-border-color-trans, #1e1f22));
  }
  .cal-day.today {
    background: var(--brand-blue-bg, var(--b3-theme-primary-light, #1c2b42));
    color: var(--brand-blue, var(--b3-theme-primary, #60a5fa));
    font-weight: 600;
  }
  .day-num {
    z-index: 1;
    font-variant-numeric: tabular-nums;
  }
  .dots {
    display: flex;
    gap: 3px;
    position: absolute;
    bottom: 3px;
    align-items: center;
  }
  .dot {
    width: 4px;
    height: 4px;
    background: var(--brand-blue, var(--b3-theme-primary, #3b82f6));
    border-radius: 50%;
  }
  .dot.urgent {
    background: var(--dot-urgent, var(--b3-theme-error, #ef4444));
  }
  .dot-more {
    font-size: 8px;
    font-weight: 700;
    line-height: 1;
    color: var(--text-2, var(--b3-theme-on-surface, #8a8f98));
    margin-left: 1px;
    padding-bottom: 2px;
  }

  .cal-btn:focus-visible {
    outline: 2px solid rgba(96, 165, 250, 0.55);
    outline-offset: 1px;
  }
</style>
