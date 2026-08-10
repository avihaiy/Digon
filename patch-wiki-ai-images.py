import re

with open('src/pages/fishing/Wiki.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

updated_fish = ['locus', 'denis', 'sargus', 'aras', 'avo-nafha']

for fish_id in updated_fish:
    pattern = r'(id:\s*"' + fish_id + r'",[\s\S]*?image:\s*)"[^"]+"'
    replacement = r'\1"/fish/' + fish_id + r'.jpg"'
    code = re.sub(pattern, replacement, code)

with open('src/pages/fishing/Wiki.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
