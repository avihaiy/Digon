const fs = require('fs');

// Patch useCatches.ts
let useCatchesCode = fs.readFileSync('src/hooks/useCatches.ts', 'utf8');
if (!useCatchesCode.includes('text: data.text')) {
  useCatchesCode = useCatchesCode.replace(
    /is_flared: data\.isFlared \|\| false/g,
    'is_flared: data.isFlared || false,\n        text: data.text || null'
  );
  fs.writeFileSync('src/hooks/useCatches.ts', useCatchesCode);
}

// Patch CatchReportDialog.tsx
let dialogCode = fs.readFileSync('src/components/catches/CatchReportDialog.tsx', 'utf8');

if (!dialogCode.includes('useMarineWeather')) {
  dialogCode = dialogCode.replace(
    /import \{ useAuth \} from "@\/hooks\/useAuth";/,
    `import { useAuth } from "@/hooks/useAuth";\nimport { useMarineWeather } from "@/hooks/useMarineWeather";`
  );
  
  dialogCode = dialogCode.replace(
    /const \{ activeTournaments \} = useTournaments\(\);/,
    `const { activeTournaments } = useTournaments();\n  const { data: marineData } = useMarineWeather();`
  );
  
  dialogCode = dialogCode.replace(
    /isFlared: useFlare/g,
    `isFlared: useFlare,\n        text: (marineData && marineData.waveHeight !== null) ? \`תנאי הים בעת התפיסה: גלים \${marineData.waveHeight} מ', טמפ' מים \${marineData.temperature || '?'}°, רוח \${marineData.windSpeed || '?'} קמ"ש, לחץ אוויר \${marineData.surfacePressure || '?'} hPa\` : ''`
  );
  
  fs.writeFileSync('src/components/catches/CatchReportDialog.tsx', dialogCode);
}
