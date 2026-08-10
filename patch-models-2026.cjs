const fs = require('fs');

let identifyCode = fs.readFileSync('src/pages/fishing/Identify.tsx', 'utf8');

// Upgrade to 2026 models
identifyCode = identifyCode.replace(
  /model: "gemini-1\.5-pro-latest"/g,
  'model: "gemini-3.6-flash"'
);

identifyCode = identifyCode.replace(
  /model: "gemini-1\.5-flash-latest"/g,
  'model: "gemini-3.5-flash-lite"'
);

fs.writeFileSync('src/pages/fishing/Identify.tsx', identifyCode);
