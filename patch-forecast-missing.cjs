const fs = require('fs');

let code = fs.readFileSync('src/pages/fishing/Forecast.tsx', 'utf8');

if (!code.includes('Zap')) {
  code = code.replace(/import {([^}]+)} from 'lucide-react';/, "import {$1, Zap, Navigation} from 'lucide-react';");
} else if (!code.includes('Navigation')) {
  code = code.replace(/import {([^}]+)} from 'lucide-react';/, "import {$1, Navigation} from 'lucide-react';");
}

const safetyWarningStr = `{/* Safety Warning Banner */}`;
const capeBanner = `{/* CAPE Warning Banner */}
      {marineData.cape !== null && marineData.cape > 1000 && selectedDayIndex === 0 && (
        <div className="mx-4 bg-yellow-400 dark:bg-yellow-500/90 border-2 border-yellow-600 rounded-2xl p-4 flex items-start gap-3 shadow-lg animate-pulse text-yellow-950 dark:text-yellow-950 mb-4 mt-2">
          <Zap className="w-6 h-6 shrink-0 mt-0.5 fill-current" />
          <div>
            <h3 className="font-black text-lg">סכנת סופות רעמים (CAPE גבוה)</h3>
            <p className="text-sm font-bold leading-tight mt-1">
              ישנו סיכון גבוה לברקים! סכנת התחשמלות לחכות קרבון. לא לדוג!
            </p>
          </div>
        </div>
      )}

      {/* Safety Warning Banner */}`;

if (!code.includes('סכנת סופות רעמים')) {
  code = code.replace(safetyWarningStr, capeBanner);
}

const proMetricsEnd = `          )}
        </div>
      )}`;
const advancedMetrics = `          )}
          {marineData.windGusts !== null && (
             <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center gap-2">
               <Wind className="w-5 h-5 text-slate-500 dark:text-slate-400" />
               <div className="flex flex-col">
                 <span className="text-xs text-slate-500 dark:text-slate-400">משבי רוח</span>
                 <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{marineData.windGusts.toFixed(0)} קמ"ש</span>
               </div>
             </div>
          )}
          {marineData.oceanCurrentVelocity !== null && (
             <div className="bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 rounded-xl p-3 flex items-center gap-2">
               <Navigation className="w-5 h-5 text-cyan-500" style={{ transform: \`rotate(\${marineData.oceanCurrentDirection || 0}deg)\` }} />
               <div className="flex flex-col">
                 <span className="text-xs text-cyan-600 dark:text-cyan-400">זרם ימי</span>
                 <span className="text-sm font-bold text-cyan-800 dark:text-cyan-300">{marineData.oceanCurrentVelocity.toFixed(1)} קמ"ש</span>
               </div>
             </div>
          )}
        </div>
      )}`;

if (!code.includes('משבי רוח')) {
  code = code.replace(proMetricsEnd, advancedMetrics);
}

fs.writeFileSync('src/pages/fishing/Forecast.tsx', code);
