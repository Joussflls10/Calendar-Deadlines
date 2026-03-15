import re

with open('src/ui/MiniCalendar.svelte', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('{#each days as { day, isToday, hasDeadline }}', '{#each days as { day, isToday, deadlines }}')

with open('src/ui/MiniCalendar.svelte', 'w', encoding='utf-8') as f:
    f.write(c)
