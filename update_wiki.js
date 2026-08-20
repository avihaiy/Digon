const fs = require('fs');
let code = fs.readFileSync('src/pages/fishing/Wiki.tsx', 'utf8');

// We will just replace the entire FISH_DB array
const newFishDbStr = `const FISH_DB: FishData[] = [
  // Sea Fish
  {
    id: 'locus',
    name: 'locus (grouper)',\n  }`;
