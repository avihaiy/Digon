const fs = require('fs');
let code = fs.readFileSync('src/pages/fishing/Radar.tsx', 'utf8');

code = code.replace(
  /<iframe \n/g,
  `<iframe key={\`\${viewMode}-\${filter}\`} \n`
);

fs.writeFileSync('src/pages/fishing/Radar.tsx', code);
