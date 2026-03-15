import re

with open('src/ui/MiniCalendar.svelte', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace JS script
content = content.replace(
    'const hasDeadline = tasks.some(t => {',
    'const dayTasks = tasks.filter(t => {'
)
content = content.replace(
    'return { day, dateStr, hasDeadline, isToday };',
    'return { day, dateStr, deadlines: dayTasks, isToday };'
)

# Replace HTML
content = content.replace(
    '''        {#if hasDeadline}
          <div class="dot"></div>
        {/if}''',
    '''        {#if deadlines.length > 0}
          <div class="dots">
            {#each deadlines.slice(0, 3) as d}
              <div class="dot" class:urgent={d.priority === 'High'}></div>
            {/each}
            {#if deadlines.length > 3}
              <div class="dot-more">+</div>
            {/if}
          </div>
        {/if}'''
)

# Replace CSS
content = content.replace(
    '''.dot {
    width: 4px;
    height: 4px;
    background: var(--dot-urgent, var(--b3-theme-error, #ef4444));
    border-radius: 50%;
    position: absolute;
    bottom: 4px;
  }''',
    '''.dots {
    display: flex;
    gap: 2px;
    position: absolute;
    bottom: 2px;
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
    font-weight: 800;
    line-height: 4px;
    color: var(--text-2, var(--b3-theme-on-surface, #8a8f98));
    margin-left: 1px;
    padding-bottom: 2px;
  }'''
)

with open('src/ui/MiniCalendar.svelte', 'w', encoding='utf-8') as f:
    f.write(content)
