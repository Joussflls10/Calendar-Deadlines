import re

with open('src/ui/BoardTab.svelte', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import MiniCalendar
content = content.replace(
    'import type { DeadlineColumn, DeadlineTask } from "@/types";',
    'import type { DeadlineColumn, DeadlineTask } from "@/types";\n  import MiniCalendar from "./MiniCalendar.svelte";'
)

# 2. Wrap main with a body layout and add sidebar
body_start_html = '''
  <div class="board-body-wrap">
    <main class="board-grid">'''

body_end_html = '''
    </main>
    <aside class="board-sidebar">
      <MiniCalendar {tasks} />
    </aside>
  </div>
</div>'''

content = content.replace('<main class="board-grid">', body_start_html)
content = content.replace('</main>\n</div>', body_end_html)

# 3. Update CSS Variables for SiYuan
# In .board-shell style
siyuan_vars = '''
    --bg-main: var(--b3-theme-background-light, var(--b3-theme-background, #0e0e0e));
    --surface-col: transparent;
    --surface-card: var(--b3-theme-surface, #1a1b1e);
    --text-1: var(--b3-theme-on-background, #ffffff);
    --text-2: var(--b3-theme-on-surface-light, var(--b3-theme-on-surface, #8a8f98));
    --line: var(--b3-border-color, #2a2b2f);
    --line-faint: var(--b3-border-color-trans, #1e1f22);
    
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
'''

# We need to replace the variables block safely
old_vars_pattern = r'--bg-main: #0e0e0e;.*?--pill-info-text: #93c5fd;'
content = re.sub(old_vars_pattern, siyuan_vars.strip(), content, flags=re.DOTALL)

# Add .board-body-wrap and .board-sidebar to styles
new_styles = '''
  .board-body-wrap {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
  
  .board-sidebar {
    padding: 24px 24px 24px 0;
    overflow-y: auto;
  }
  
  .board-grid {
    flex: 1;
    display: flex;
    gap: 20px;
    padding: 24px;
    overflow-x: auto;
    align-items: flex-start;
  }
'''
content = content.replace('  .board-grid {', new_styles.replace('  .board-grid {', '/* .board-grid */', 1) + '.board-grid {')

# Let's fix the header background color, replacing #111111 with Siyuan surface/background overlay
content = content.replace('background: #111111;', 'background: var(--b3-theme-background, #111111);')

# Write back
with open('src/ui/BoardTab.svelte', 'w', encoding='utf-8') as f:
    f.write(content)
