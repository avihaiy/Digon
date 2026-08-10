const fs = require('fs');

let code = fs.readFileSync('src/pages/fishing/Forecast.tsx', 'utf8');

const targetRegex = /\{\/\* Pro Metrics \(Turbidity, Pressure Trend\) \*\/\}\s*\{selectedDayIndex === 0 && \(\s*<div className="mx-4 grid grid-cols-2 gap-3">\s*\{marineData\.isTurbid && \([\s\S]*?\{marineData\.pressureTrend !== null && Math\.abs\(marineData\.pressureTrend\) > 1 && \([\s\S]*?\n\s*\)\}\n\s*<\/div>\n\s*\)\}/m;

const replacement = `{/* Pro Metrics (Turbidity, Pressure Trend, Gusts, Currents) */}
      {selectedDayIndex === 0 && (
        <div className="mx-4 grid grid-cols-2 gap-3">
          {marineData.isTurbid && (
             <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-3 flex items-center gap-2 shadow-sm hover:scale-105 transition-transform">
               <Droplets className="w-5 h-5 text-orange-500" />
               <span className="text-sm font-bold text-orange-700 dark:text-orange-400">מים עכורים!</span>
             </div>
          )}
          {marineData.pressureTrend !== null && Math.abs(marineData.pressureTrend) > 1 && (
             <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-center gap-2 shadow-sm hover:scale-105 transition-transform">
               <Activity className="w-5 h-5 text-blue-500" />
               <div className="flex flex-col">
                 <span className="text-xs text-blue-600 dark:text-blue-400">מגמת לחץ (12 ש')</span>
                 <span className="text-sm font-bold text-blue-800 dark:text-blue-300">
                   {marineData.pressureTrend > 0 ? '↗ מרוסן (עולה)' : '↘ צונח (מומלץ)'}
                 </span>
               </div>
             </div>
          )}
          
          {marineData.windGusts !== null && (
             <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center gap-2 shadow-sm hover:scale-105 transition-transform">
               <Wind className="w-5 h-5 text-slate-500 dark:text-slate-400" />
               <div className="flex flex-col">
                 <span className="text-xs text-slate-500 dark:text-slate-400">משבי רוח קרובים</span>
                 <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{marineData.windGusts.toFixed(0)} קמ"ש</span>
               </div>
             </div>
          )}
          
          {marineData.oceanCurrentVelocity !== null && (
             <div className="bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 rounded-xl p-3 flex items-center gap-2 shadow-sm hover:scale-105 transition-transform">
               <Navigation className="w-5 h-5 text-cyan-500" style={{ transform: \`rotate(\${marineData.oceanCurrentDirection || 0}deg)\` }} />
               <div className="flex flex-col">
                 <span className="text-xs text-cyan-600 dark:text-cyan-400">זרם ים היקפי</span>
                 <span className="text-sm font-bold text-cyan-800 dark:text-cyan-300">{marineData.oceanCurrentVelocity.toFixed(1)} קמ"ש</span>
               </div>
             </div>
          )}
        </div>
      )}`;

if (targetRegex.test(code)) {
  code = code.replace(targetRegex, replacement);
  fs.writeFileSync('src/pages/fishing/Forecast.tsx', code);
  console.log("Successfully replaced!");
} else {
  console.log("Could not find target block to replace.");
}
