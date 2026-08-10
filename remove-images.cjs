const fs = require('fs');

let code = fs.readFileSync('src/pages/fishing/Wiki.tsx', 'utf8');

// 1. Make image optional in interface
code = code.replace('image: string;', 'image?: string;');

// 2. Remove all image: "..." lines from FISH_DB
code = code.replace(/\s*image:\s*"[^"]+",/g, '');

// 3. Remove the <img> tag in the JSX
// We'll replace the exact <img ... /> block with nothing.
const imgRegex = /<img\s+src=\{fish\.image\}[^>]+onError=\{[^}]+\}\s*\/>/g;
code = code.replace(imgRegex, '');

fs.writeFileSync('src/pages/fishing/Wiki.tsx', code);
