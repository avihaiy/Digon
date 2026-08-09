const fs = require('fs');
let code = fs.readFileSync('src/pages/fishing/Forecast.tsx', 'utf8');

// 1. Import getMediterraneanTides and FishingStyle
code = code.replace(
  "import { getSolunarData, getSmartTargetSpecies, getDynamicGoldWindows, GoldWindow } from '@/lib/solunar';",
  "import { getSolunarData, getSmartTargetSpecies, getDynamicGoldWindows, GoldWindow, FishingStyle } from '@/lib/solunar';\nimport { getMediterraneanTides } from '@/lib/tides';"
);

// 2. Remove mock generateTideData
code = code.replace(/\/\/ Generate realistic mock tide data[\s\S]*?return data;\n};\n/, '');

// 3. Add FishingStyle state
code = code.replace(
  "const [selectedDayIndex, setSelectedDayIndex] = useState(0);",
  "const [selectedDayIndex, setSelectedDayIndex] = useState(0);\n  const [fishingStyle, setFishingStyle] = useState<FishingStyle>('lure');"
);

// 4. Update getSolunarData and getSmartTargetSpecies calls
code = code.replace(
  /const solunar = useMemo\(\(\) => \{[\s\S]*?\}, \[targetDate, marineData, selectedDayIndex\]\);/,
  `const solunar = useMemo(() => {
    if (selectedDayIndex === 0) {
      return getSolunarData(
        targetDate,
        fishingStyle,
        marineData.waveHeight, 
        marineData.windSpeed, 
        marineData.temperature,
        marineData.wavePeriod,
        marineData.surfacePressure,
        marineData.windDirection,
        marineData.cloudCover,
        marineData.pressureTrend,
        marineData.isTurbid,
        marineData.waveDirection
      );
    }
    if (marineData.dailyForecast && marineData.dailyForecast.length > selectedDayIndex) {
      const dayData = marineData.dailyForecast[selectedDayIndex];
      return getSolunarData(targetDate, fishingStyle, dayData.waveHeightMax, dayData.windSpeedMax, dayData.tempMax);
    }
    return getSolunarData(targetDate, fishingStyle);
  }, [targetDate, marineData, selectedDayIndex, fishingStyle]);`
);

code = code.replace(
  /const aiRecommendation = useMemo\(\(\) => \{[\s\S]*?\}, \[marineData, selectedDayIndex\]\);/,
  `const aiRecommendation = useMemo(() => {
    if (selectedDayIndex === 0) {
      return getSmartTargetSpecies(marineData.waveHeight, marineData.temperature, marineData.cloudCover, fishingStyle, marineData.isTurbid);
    }
    if (marineData.dailyForecast && marineData.dailyForecast.length > selectedDayIndex) {
      const dayData = marineData.dailyForecast[selectedDayIndex];
      return getSmartTargetSpecies(dayData.waveHeightMax, dayData.tempMax, null, fishingStyle, false); 
    }
    return getSmartTargetSpecies(null, null, null, fishingStyle, false);
  }, [marineData, selectedDayIndex, fishingStyle]);`
);

// 5. Update TideData usage
code = code.replace(
  "const tideData = useMemo(() => generateTideData(), [targetDate]); // Keep mock for Med tide shape",
  "const tideData = useMemo(() => getMediterraneanTides(targetDate), [targetDate]);"
);

// 6. Insert UI for FishingStyle, Turbidity, Pressure Trend right before "Safety Warning Banner"
const uiCode = `
      {/* Fishing Style Selector */}
      <div className="mx-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
        <button onClick={() => setFishingStyle('lure')} className={cn("snap-center shrink-0 px-4 py-2 rounded-xl text-sm font-bold border transition-all whitespace-nowrap", fishingStyle === 'lure' ? "bg-primary text-primary-foreground border-primary shadow-md scale-105" : "bg-white dark:bg-slate-800 border-border text-muted-foreground hover:bg-slate-50")}>🎣 ז'רז'ור</button>
        <button onClick={() => setFishingStyle('bait')} className={cn("snap-center shrink-0 px-4 py-2 rounded-xl text-sm font-bold border transition-all whitespace-nowrap", fishingStyle === 'bait' ? "bg-primary text-primary-foreground border-primary shadow-md scale-105" : "bg-white dark:bg-slate-800 border-border text-muted-foreground hover:bg-slate-50")}>🪱 פיתיונות</button>
        <button onClick={() => setFishingStyle('kayak')} className={cn("snap-center shrink-0 px-4 py-2 rounded-xl text-sm font-bold border transition-all whitespace-nowrap", fishingStyle === 'kayak' ? "bg-primary text-primary-foreground border-primary shadow-md scale-105" : "bg-white dark:bg-slate-800 border-border text-muted-foreground hover:bg-slate-50")}>🛶 קיאק/סירה</button>
        <button onClick={() => setFishingStyle('ultralight')} className={cn("snap-center shrink-0 px-4 py-2 rounded-xl text-sm font-bold border transition-all whitespace-nowrap", fishingStyle === 'ultralight' ? "bg-primary text-primary-foreground border-primary shadow-md scale-105" : "bg-white dark:bg-slate-800 border-border text-muted-foreground hover:bg-slate-50")}>🪶 אולטרה-לייט</button>
      </div>

      {/* Pro Metrics (Turbidity, Pressure Trend) */}
      {selectedDayIndex === 0 && (
        <div className="mx-4 grid grid-cols-2 gap-3">
          {marineData.isTurbid && (
             <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-3 flex items-center gap-2">
               <Droplets className="w-5 h-5 text-orange-500" />
               <span className="text-sm font-bold text-orange-700 dark:text-orange-400">מים עכורים!</span>
             </div>
          )}
          {marineData.pressureTrend !== null && Math.abs(marineData.pressureTrend) > 1 && (
             <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-center gap-2">
               <Activity className="w-5 h-5 text-blue-500" />
               <div className="flex flex-col">
                 <span className="text-xs text-blue-600 dark:text-blue-400">מגמת לחץ (12 ש')</span>
                 <span className="text-sm font-bold text-blue-800 dark:text-blue-300">
                   {marineData.pressureTrend > 0 ? '↗ מרוסן (עולה)' : '↘ צונח (מומלץ)'}
                 </span>
               </div>
             </div>
          )}
        </div>
      )}

      {/* Safety Warning Banner */}`;

code = code.replace("{/* Safety Warning Banner */}", uiCode);

fs.writeFileSync('src/pages/fishing/Forecast.tsx', code);
