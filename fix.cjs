const fs = require('fs');
let c = fs.readFileSync('src/pages/fishing/Wiki.tsx', 'utf8');
c = c.replace(/\\`/g, '`');
fs.writeFileSync('src/pages/fishing/Wiki.tsx', c);
