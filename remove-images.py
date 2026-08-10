import re

with open('src/pages/fishing/Wiki.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Make image optional in interface
code = code.replace('image: string;', 'image?: string;')

# 2. Remove all image: "..." lines from FISH_DB
# The regex looks for `image: "something",` and removes it
code = re.sub(r'\s*image:\s*"[^"]+",', '', code)

# 3. Remove the <img> tag in the JSX
# We'll use a regex to remove the <img ... /> tag inside the card
img_pattern = r'<img\s+src=\{fish\.image\}[^>]+/>'
code = re.sub(img_pattern, '', code)

with open('src/pages/fishing/Wiki.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
