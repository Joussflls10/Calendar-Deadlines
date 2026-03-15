import re

with open('src/ui/BoardTab.svelte', 'r', encoding='utf-8') as f:
    text = f.read()

bad_css = '''/* .board-grid */
    flex: 1;
    display: flex;
    gap: 20px;
    padding: 24px;
    overflow-x: auto;
    align-items: flex-start;
  }
.board-grid {
    display: flex;'''

good_css = '''.board-grid {
    flex: 1;
    display: flex;'''

text = text.replace(bad_css, good_css)

with open('src/ui/BoardTab.svelte', 'w', encoding='utf-8') as f:
    f.write(text)
