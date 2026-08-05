import fs from 'fs'; const content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8'); console.log(content.match(/try \{[\s\S]*?\} catch/)[0]);
