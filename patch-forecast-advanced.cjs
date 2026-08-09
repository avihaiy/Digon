const fs = require('fs');
let code = fs.readFileSync('src/pages/fishing/Forecast.tsx', 'utf8');

// 1. Import getSunlightTimes, Sunrise, Sunset icons etc.
code = code.replace(
  "import { getSolunarData, getSmartTargetSpecies, getDynamicGoldWindows, GoldWindow, FishingStyle } from '@/lib/solunar';",
  "import { getSolunarData, getSmartTargetSpecies, getDynamicGoldWindows, GoldWindow, FishingStyle, getSunlightTimes } from '@/lib/solunar';"
);
code = code.replace(
  "import { AlertTriangle, Droplets, MapPin, Activity, Sun, Fish } from 'lucide-react';",
  "import { AlertTriangle, Droplets, MapPin, Activity, Sun, Fish, Wind, Zap, Navigation, Sunrise, Sunset, Clock } from 'lucide-react';"
);

// 2. Fetch Sunlight Times in component
const solunarMemoRegex = /const solunar = useMemo\(\(\) => \{/;
code = code.replace(solunarMemoRegex, `const sunlight = useMemo(() => getSunlightTimes(targetDate), [targetDate]);\n  const solunar = useMemo(() => {`);

// 3. Pass new metrics to getSolunarData
const solunarCallRegex = /marineData\.waveDirection\n      \);/g;
const solunarCallNew = `marineData.waveDirection,
        marineData.windGusts,
        marineData.cape,
        marineData.oceanCurrentVelocity
      );`;
code = code.replace(solunarCallRegex, solunarCallNew);

// 4. Also need to pass them to the daily max call
const dailyCallRegex = /return getSolunarData\(targetDate, fishingStyle, dayData\.waveHeightMax, dayData\.windSpeedMax, dayData\.tempMax\);/;
const dailyCallNew = `return getSolunarData(targetDate, fishingStyle, dayData.waveHeightMax, dayData.windSpeedMax, dayData.tempMax, null, null, null, null, null, false, null, dayData.windGustsMax, dayData.capeMax, null);`;
code = code.replace(dailyCallRegex, dailyCallNew);

// 5. Update UI 
// Before: <div className="mx-4 grid grid-cols-2 gap-3">
// We will replace this whole grid with a new advanced grid that includes currents and gusts
const metricsGridRegex = /\{\/\* Pro Metrics \(Turbidity, Pressure Trend\) \*\/\}\n[\s\S]*?\{\/\* Safety Warning Banner \*\/\}/;
const newMetricsGrid = `{/* Pro Metrics (Advanced Data) */}
      {selectedDayIndex === 0 && (
        <div className="mx-4 grid grid-cols-2 gap-3">
          {marineData.isTurbid && (
             <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-3 flex items-center gap-2">
               <Droplets className="w-5 h-5 text-orange-500" />
               <span className="text-sm font-bold text-orange-700 dark:text-orange-400">מים עכורים</span>
             </div>
          )}
          {marineData.pressureTrend !== null && Math.abs(marineData.pressureTrend) > 1 && (
             <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-center gap-2">
               <Activity className="w-5 h-5 text-blue-500" />
               <div className="flex flex-col">
                 <span className="text-xs text-blue-600 dark:text-blue-400">מגמת לחץ (12 ש')</span>
                 <span className="text-sm font-bold text-blue-800 dark:text-blue-300">
                   {marineData.pressureTrend > 0 ? '↗ עולה' : '↘ צונח'}
                 </span>
               </div>
             </div>
          )}
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
      )}

      {/* CAPE Thunderstorm Warning */}
      {selectedDayIndex === 0 && marineData.cape !== null && marineData.cape > 1000 && (
        <div className="mx-4 bg-red-600 text-white rounded-xl p-4 flex items-start gap-3 shadow-lg animate-bounce">
          <Zap className="w-8 h-8 shrink-0 mt-1 text-yellow-300 fill-yellow-300" />
          <div>
            <h3 className="font-bold text-lg leading-tight">סכנת סופות ברקים! (CAPE: {Math.round(marineData.cape)})</h3>
            <p className="text-sm text-red-100 mt-1 leading-tight">
              סכנת התחשמלות. חכות קרבון מהוות סכנת חיים כעת. לא לצאת לים!
            </p>
          </div>
        </div>
      )}

      {/* Sunlight & Golden Windows Timeline */}
      <section className="px-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-500" /> לוח זמנים (היום)
        </h2>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border shadow-sm space-y-4">
          <div className="flex justify-between items-center text-sm border-b dark:border-slate-700 pb-3">
            <div className="flex flex-col items-center">
              <Sunrise className="w-6 h-6 text-orange-400 mb-1" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">{sunlight.dawn.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="text-xs text-slate-500">אור ראשון</span>
            </div>
            <div className="flex flex-col items-center">
              <Sun className="w-6 h-6 text-yellow-500 mb-1" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">{sunlight.sunrise.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="text-xs text-slate-500">זריחה</span>
            </div>
            <div className="flex flex-col items-center">
              <Sun className="w-6 h-6 text-orange-600 mb-1" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">{sunlight.sunset.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="text-xs text-slate-500">שקיעה</span>
            </div>
            <div className="flex flex-col items-center">
              <Sunset className="w-6 h-6 text-indigo-400 mb-1" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">{sunlight.dusk.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="text-xs text-slate-500">אור אחרון</span>
            </div>
          </div>
          
          <div className="pt-2">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">חלונות זהב (אכילות)</h3>
            <div className="space-y-2">
              {goldWindows.map((w, idx) => (
                <div key={idx} className={cn("flex justify-between items-center px-3 py-2 rounded-lg text-sm", w.type === 'major' ? "bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800" : "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800")}>
                  <span className={cn("font-bold", w.type === 'major' ? "text-emerald-700 dark:text-emerald-400" : "text-blue-700 dark:text-blue-400")}>
                    {w.type === 'major' ? 'חלון ראשי (Major)' : 'חלון משני (Minor)'}
                  </span>
                  <span className="font-mono text-slate-600 dark:text-slate-300">
                    {String(w.startHour).padStart(2, '0')}:00 - {String(w.endHour).padStart(2, '0')}:59
                  </span>
                </div>
              ))}
              {goldWindows.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-2">אין חלונות זהב מיוחדים היום</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Safety Warning Banner */}`;

code = code.replace(metricsGridRegex, newMetricsGrid);

fs.writeFileSync('src/pages/fishing/Forecast.tsx', code);
