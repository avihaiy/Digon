const fs=require('fs'); 
let c = fs.readFileSync('src/pages/Home.tsx', 'utf8'); 
const oldCard = `<div className="flex flex-col items-center justify-center gap-2 flex-1">
                <div className="text-blue-500 dark:text-blue-400">
                  <Waves className="w-6 h-6 animate-float opacity-80" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold opacity-70 mb-0.5">גלים</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100" dir="ltr">
                    {marineData.waveHeight !== null ? \`\${marineData.waveHeight.toFixed(1)}m\` : '---'}
                  </p>
                </div>
              </div>`; 
const newCard = `<div className="flex flex-col items-center justify-center gap-2 flex-1">
                {waterType === 'saltwater' ? (
                  <>
                    <div className="text-blue-500 dark:text-blue-400">
                      <Waves className="w-6 h-6 animate-float opacity-80" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold opacity-70 mb-0.5">גלים</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100" dir="ltr">
                        {marineData.waveHeight !== null ? \`\${marineData.waveHeight.toFixed(1)}m\` : '---'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-emerald-500 dark:text-emerald-400">
                      <CloudRain className="w-6 h-6 animate-float opacity-80" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold opacity-70 mb-0.5">גשם</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100" dir="ltr">
                        {marineData.dailyForecast?.[0]?.rainProbMax || 0}%
                      </p>
                    </div>
                  </>
                )}
              </div>`; 
if(c.includes(oldCard)) { 
  fs.writeFileSync('src/pages/Home.tsx', c.replace(oldCard, newCard)); 
  console.log('success'); 
} else { 
  console.log('failed to find old string! Dumping around line 179:');
  const lines = c.split('\\n');
  console.log(lines.slice(175, 185).join('\\n'));
}
