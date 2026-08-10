const fs = require('fs');

let identifyCode = fs.readFileSync('src/pages/fishing/Identify.tsx', 'utf8');

// Replace model strings to use -latest suffix to avoid 404s
identifyCode = identifyCode.replace(
  /model: "gemini-1\.5-pro"/g,
  'model: "gemini-1.5-pro-latest"'
);

identifyCode = identifyCode.replace(
  /model: "gemini-1\.5-flash"/g,
  'model: "gemini-1.5-flash-latest"'
);

fs.writeFileSync('src/pages/fishing/Identify.tsx', identifyCode);
