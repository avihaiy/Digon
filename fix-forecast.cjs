const fs = require('fs');
let code = fs.readFileSync('src/pages/fishing/Forecast.tsx', 'utf8');

const targetStr = `        marineData.cloudCover,
        marineData.pressureTrend,
        marineData.isTurbid,
        marineData.waveDirection
      );`;

const replaceStr = `        marineData.cloudCover,
        marineData.pressureTrend,
        marineData.isTurbid,
        marineData.waveDirection,
        marineData.windGusts,
        marineData.cape,
        marineData.oceanCurrentVelocity
      );`;

code = code.replace(targetStr, replaceStr);

fs.writeFileSync('src/pages/fishing/Forecast.tsx', code);
