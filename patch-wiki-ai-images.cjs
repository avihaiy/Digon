const fs = require('fs');
let code = fs.readFileSync('src/pages/fishing/Wiki.tsx', 'utf8');

const updatedFish = ['locus', 'denis', 'sargus', 'aras', 'avo-nafha'];

for (const id of updatedFish) {
  const regex = new RegExp(\`(id:\\s*"\${id}",[\\s\\S]*?image:\\s*)"[^"]+"\`, 'g');
  code = code.replace(regex, \`$1"/fish/\${id}.jpg"\`);
}

fs.writeFileSync('src/pages/fishing/Wiki.tsx', code);
