const fs = require('fs');
let code = fs.readFileSync('src/pages/fishing/Forecast.tsx', 'utf8');

const oldStr = `{marineData.cape !== null && marineData.cape > 1000 && selectedDayIndex === 0 && (
        <div className="mx-4 bg-yellow-400 dark:bg-yellow-500/90`;
const newStr = `{marineData.cape !== null && marineData.cape > 1000 && marineData.cloudCover !== null && marineData.cloudCover > 40 && selectedDayIndex === 0 && (
        <div className="mx-4 bg-yellow-400 dark:bg-yellow-500/90`;

if (code.includes(oldStr)) {
  code = code.replace(oldStr, newStr);
  fs.writeFileSync('src/pages/fishing/Forecast.tsx', code);
  console.log('success');
} else {
  console.log('failed');
}
