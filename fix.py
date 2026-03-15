with open('src/ui/BoardTab.svelte', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
'''  /* .board-grid */
    flex: 1;
    display: flex;
    gap: 20px;
    padding: 24px;
    overflow-x: auto;
    align-items: flex-start;
  }
  .board-grid {''',
'''  /* updated body wrap */
  .board-grid {
    flex: 1;
    display: flex;
    gap: 20px;
    padding: 24px;
    overflow-x: auto;
    align-items: flex-start;
  }'''
)

with open('src/ui/BoardTab.svelte', 'w', encoding='utf-8') as f:
    f.write(text)
