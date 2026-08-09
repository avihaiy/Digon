import { useMarineWeather, getWindDirectionHebrew } from '@/hooks/useMarineWeather';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Waves, Wind, Sun, Clock, Fish, Compass, ThermometerSun, AlertTriangle, Info, Droplets, MapPin, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

import { CalendarDays } from "lucide-react";

import { getSolunarData, getSmartTargetSpecies, getDynamicGoldWindows, GoldWindow, FishingStyle, getSunlightTimes } from '@/lib/solunar';
import { getMediterraneanTides } from '@/lib/tides';
import { useMemo, useState } from 'react';

// Generate realistic mock tide data for Mediterranean (semi-diurnal, 2 highs 2 lows per 24h)
const generateTideData = () => {
  const data = [];
  const now = new Date();
  now.setMinutes(0, 0, 0); // Start at top of current hour
  
  // Phase shift to make it look realistic based on current time
  const phaseShift = now.getHours() % 6; 
  
  for (let i = 0; i <= 24; i++) {
    const time = new Date(now.getTime() + i * 60 * 60 * 1000);
    // Sine wave with period ~12.4 hours (typical tide). Amplitude ~0.4m (Med is low tide)
    const rawLevel = Math.sin((i + phaseShift) * (Math.PI / 6.2)) * 0.4; 
    
    data.push({
      time: time.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      level: Number(rawLevel.toFixed(2)),
      isHigh: rawLevel > 0.35,
      isLow: rawLevel < -0.35
    });
  }
  return data;
};

export default function Forecast() {
  const { data: marineData, loading: marineLoading, lastUpdated } = useMarineWeather();
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [fishingStyle, setFishingStyle] = useState<FishingStyle>('lure');

  // Compute solunar based on selected day
  const targetDate = useMemo(() => {
    if (marineData.dailyForecast && marineData.dailyForecast.length > selectedDayIndex) {
      return marineData.dailyForecast[selectedDayIndex].date;
    }
    return new Date();
  }, [marineData.dailyForecast, selectedDayIndex]);

  const sunlight = useMemo(() => getSunlightTimes(targetDate), [targetDate]);
  const solunar = useMemo(() => {
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
      return getSolunarData(targetDate, fishingStyle, dayData.waveHeightMax, dayData.windSpeedMax, dayData.tempMax, null, null, null, null, null, false, null, dayData.windGustsMax, dayData.capeMax, null);
    }
    return getSolunarData(targetDate, fishingStyle);
  }, [targetDate, marineData, selectedDayIndex, fishingStyle]);
  
  const goldWindows = useMemo(() => getDynamicGoldWindows(targetDate), [targetDate]);
  
  const selectedDayHours = useMemo(() => {
    if (marineData.dailyForecast && marineData.dailyForecast.length > selectedDayIndex) {
      return marineData.dailyForecast[selectedDayIndex].hours || [];
    }
    return marineData.hourlyForecast || [];
  }, [marineData, selectedDayIndex]);

  const tideData = useMemo(() => getMediterraneanTides(targetDate), [targetDate]);
  
  const aiRecommendation = useMemo(() => {
    if (selectedDayIndex === 0) {
      return getSmartTargetSpecies(marineData.waveHeight, marineData.temperature, marineData.cloudCover, fishingStyle, marineData.isTurbid);
    }
    if (marineData.dailyForecast && marineData.dailyForecast.length > selectedDayIndex) {
      const dayData = marineData.dailyForecast[selectedDayIndex];
      return getSmartTargetSpecies(dayData.waveHeightMax, dayData.tempMax, null, fishingStyle, false); 
    }
    return getSmartTargetSpecies(null, null, null, fishingStyle, false);
  }, [marineData, selectedDayIndex, fishingStyle]);

  // Safety Warning Logic (only relevant if looking at today)
  const isUnsafe = selectedDayIndex === 0 && (
    (marineData.waveHeight && marineData.waveHeight > 1.5) || 
    (marineData.windSpeed && marineData.windSpeed > 30) // 30 km/h is ~16 knots
  );

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 mt-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            תחזית דייג <Sun className="w-6 h-6 text-yellow-500" />
          </h1>
          <p className="text-sm text-slate-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {marineData.locationName}
          </p>
        </div>
      </div>

      
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

      {/* Safety Warning Banner */}
      {isUnsafe && (
        <div className="mx-4 bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-500 rounded-2xl p-4 flex items-start gap-3 shadow-sm animate-pulse">
          <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-rose-800 dark:text-rose-300">אזהרת ים מסוכן!</h3>
            <p className="text-sm text-rose-700 dark:text-rose-400 leading-tight">
              הגלים והרוחות כרגע גבוהים ומסוכנים. לא מומלץ לצאת לים בקיאק או סירה קטנה. אנא היזהרו!
            </p>
          </div>
        </div>
      )}

      {/* Multi-Day Selector */}
      {marineData.dailyForecast && marineData.dailyForecast.length > 0 && (
        <div className="mx-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
          {marineData.dailyForecast.map((day, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedDayIndex(idx)}
              className={cn(
                "snap-center shrink-0 px-4 py-2 rounded-xl text-sm font-bold border transition-all whitespace-nowrap",
                selectedDayIndex === idx 
                  ? "bg-primary text-primary-foreground border-primary shadow-md scale-105" 
                  : "bg-white dark:bg-slate-800 border-border text-muted-foreground hover:bg-slate-50"
              )}
            >
              {idx === 0 ? "היום" : idx === 1 ? "מחר" : day.dayName}
            </button>
          ))}
        </div>
      )}

      {/* Target Species AI Recommendation */}
      <section className="px-4">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 drop-shadow-sm text-slate-800 dark:text-slate-100">
          <Fish className="w-5 h-5 text-emerald-500" />
          המלצת AI להיום
        </h3>
        <Card className="border-white/20 dark:border-slate-700/50 shadow-lg bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl overflow-hidden relative transition-all hover:shadow-xl">
          <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] -z-10" />
          <CardContent className="p-5">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-black text-lg text-slate-800 dark:text-slate-100">
                    {aiRecommendation.species.join(" / ")}
                  </h4>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                    <Droplets className="w-4 h-4" /> 
                    {aiRecommendation.bestMethod}
                  </p>
                </div>
                {aiRecommendation.iconType === 'lure' && <Badge className="bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-none">ז'רז'ור</Badge>}
                {aiRecommendation.iconType === 'bait' && <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-none">פיתיונות</Badge>}
                {aiRecommendation.iconType === 'squid' && <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-300 border-none">דיונונים</Badge>}
              </div>
              <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 border border-white/30 dark:border-slate-700/50 mt-2">
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-tight">
                  <span className="font-bold text-slate-700 dark:text-slate-200">למה?</span> {aiRecommendation.reasoning}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Solunar Fishing Score */}
      <section className="px-4">
        <Card className="border-white/20 dark:border-slate-700/50 shadow-lg bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl overflow-hidden relative transition-all hover:shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[50px] -z-10" />
          <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full blur-[40px] opacity-20 -z-10", solunar.color.replace('text-', 'bg-'))} />
          <CardContent className="p-5 flex flex-col items-center">
            <h3 className="text-lg font-bold w-full text-right mb-4 flex items-center gap-2 drop-shadow-sm text-slate-800 dark:text-slate-100">
              <span className="text-2xl">{solunar.phaseName.includes('מלא') ? '🌕' : '🌙'}</span> 
              ציון דייג משוקלל
            </h3>
            
            <div className="w-full flex flex-col items-center">
              {/* Circular Score */}
              <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                <svg className="transform -rotate-90 w-32 h-32">
                  <circle cx="64" cy="64" r="54" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted/20" />
                  <circle
                    cx="64" cy="64" r="54"
                    stroke="currentColor" strokeWidth="8" strokeLinecap="round" fill="transparent"
                    strokeDasharray={2 * Math.PI * 54}
                    strokeDashoffset={(2 * Math.PI * 54) - ((solunar.score / 100) * (2 * Math.PI * 54))}
                    className={solunar.color}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className={cn("text-3xl font-black", solunar.color)}>{solunar.score}</span>
                  <span className="text-[10px] text-muted-foreground font-bold">ציון משוקלל</span>
                </div>
              </div>
              
              {/* Score Explanations */}
              {solunar.explanations && solunar.explanations.length > 0 && (
                <div className="w-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 border border-white/30 dark:border-slate-700/50 text-right mt-4">
                  <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1">
                    <Info className="w-3 h-3" /> ממה מורכב הציון?
                  </h4>
                  <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                    {solunar.explanations.map((exp: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-slate-400 mt-1">•</span>
                        <span>{exp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Daily Windows */}
      <section className="px-4">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 drop-shadow-sm text-slate-800 dark:text-slate-100">
          <Clock className="w-5 h-5 text-amber-500" />
          חלונות זהב להיום
        </h3>
        <div className="space-y-3">
          {goldWindows.map((window, idx) => (
            <div key={idx} className="p-4 rounded-2xl border border-white/20 dark:border-slate-700/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl flex items-center justify-between shadow-md hover:scale-[1.02] transition-transform">
              <div>
                <div className="font-black text-lg text-slate-800 dark:text-slate-100">
                  {window.startHour.toString().padStart(2, '0')}:00 - {window.endHour.toString().padStart(2, '0')}:00
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  {window.type === 'major' ? <Fish className="w-3.5 h-3.5 text-amber-500" /> : <Sun className="w-3.5 h-3.5" />} 
                  {window.label}
                </div>
              </div>
              <Badge className={cn("text-white font-bold", window.type === 'major' ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600")}>
                {window.type === 'major' ? "פעילות שיא" : "מצוין"}
              </Badge>
            </div>
          ))}
        </div>
      </section>

      {/* Sea Conditions */}
      <section className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2 drop-shadow-sm text-slate-800 dark:text-slate-100">
            <Waves className="w-5 h-5 text-blue-500" />
            מצב הים המעודכן
          </h3>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-800/50 px-2 py-1 rounded-full backdrop-blur-sm">
            {lastUpdated.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-white/20 dark:border-slate-700/50 shadow-md bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl hover:scale-[1.03] transition-transform">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <div className="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl text-white shadow-inner mb-3">
                <Waves className="w-6 h-6" />
              </div>
              <p className="text-2xl font-black">
                {marineLoading ? "..." : marineData.waveHeight !== null ? marineData.waveHeight.toFixed(1) : "---"}
                <span className="text-sm font-normal text-muted-foreground ms-1">מ'</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                גובה (כל {marineLoading ? "..." : marineData.wavePeriod !== null ? Math.round(marineData.wavePeriod) : "---"} ש')
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-white/20 dark:border-slate-700/50 shadow-md bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl hover:scale-[1.03] transition-transform">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <div className="p-3 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-2xl text-white shadow-inner mb-3">
                <Wind className="w-6 h-6" />
              </div>
              <p className="text-2xl font-black">
                {marineLoading ? "..." : marineData.windSpeed !== null ? Math.round(marineData.windSpeed) : "---"}
                <span className="text-sm font-normal text-muted-foreground ms-1">קמ״ש</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {marineLoading ? "טוען..." : getWindDirectionHebrew(marineData.windDirection)}
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-white/20 dark:border-slate-700/50 shadow-md bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl hover:scale-[1.03] transition-transform">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <div className="p-3 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl text-white shadow-inner mb-3">
                <ThermometerSun className="w-6 h-6" />
              </div>
              <p className="text-2xl font-black">
                {marineLoading ? "..." : marineData.temperature !== null ? Math.round(marineData.temperature) : "---"}
                <span className="text-sm font-normal text-muted-foreground ms-1">°C</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                טמפ' (עננות: {marineLoading ? "..." : marineData.cloudCover !== null ? marineData.cloudCover : "---"}%)
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-white/20 dark:border-slate-700/50 shadow-md bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl hover:scale-[1.03] transition-transform">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <div className="p-3 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-2xl text-white shadow-inner mb-3">
                <Cloud className="w-6 h-6" />
              </div>
              <p className="text-xl font-black mt-1">
                {marineLoading ? "..." : marineData.surfacePressure !== null ? Math.round(marineData.surfacePressure) : "---"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">לחץ ברומטרי</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Forecast Charts Section */}
      {marineData.hourlyForecast && marineData.hourlyForecast.length > 0 && (
        <section className="px-4 space-y-4 mt-6">
          <h3 className="font-bold text-lg mb-2 flex items-center gap-2 drop-shadow-sm text-slate-800 dark:text-slate-100">
            <Clock className="w-5 h-5 text-primary" />
            תחזית 24 שעות
          </h3>
          
          <Card className="border-white/20 dark:border-slate-700/50 shadow-lg bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[50px] -z-10" />
            <CardContent className="p-4 pt-5">
              <div className="flex items-center gap-2 mb-2">
                <Waves className="w-4 h-4 text-blue-500" />
                <h4 className="font-bold text-sm">גובה גלים (מטר)</h4>
              </div>
              <div className="h-32 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={marineData.hourlyForecast}>
                    <defs>
                      <linearGradient id="colorWave" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="time" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(val) => val.split(':')[0] + ':00'}
                      interval="preserveStartEnd"
                      minTickGap={30}
                    />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      labelStyle={{ fontWeight: 'bold', color: '#64748b' }}
                      formatter={(value: number) => [`${value.toFixed(1)}m`, 'גובה']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="waveHeight" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorWave)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Hourly Scrollable List */}
          <section className="px-4 mt-6">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2 drop-shadow-sm text-slate-800 dark:text-slate-100">
              <Clock className="w-5 h-5 text-indigo-500" />
              תחזית לפי שעות
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x">
              {selectedDayHours.map((hour, idx) => (
                <div key={idx} className="snap-center shrink-0 w-[72px] bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[1.2rem] p-3 border border-white/20 dark:border-slate-700/50 shadow-sm flex flex-col items-center text-center hover:bg-white/90 transition-colors">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">{hour.time}</span>
                  
                  {/* Wave */}
                  <Waves className="w-4 h-4 text-blue-500 mb-1" />
                  <span className="text-sm font-black text-blue-600 dark:text-blue-400">{hour.waveHeight.toFixed(1)}m</span>
                  
                  <div className="w-full h-px bg-border my-2" />
                  
                  {/* Wind */}
                  <div className="relative">
                    <Wind 
                      className="w-4 h-4 text-cyan-500 mb-1" 
                      style={{ transform: `rotate(${hour.windDirection || 0}deg)` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">{Math.round(hour.windSpeed)}<span className="text-[9px]">קמש</span></span>
                </div>
              ))}
            </div>
          </section>
          
          {/* TIDE CHART */}
          <Card className="border-white/20 dark:border-slate-700/50 shadow-lg bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl mt-6 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500" />
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-[50px] -z-10" />
            <CardContent className="p-4 pt-5">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-100 dark:bg-indigo-900/30 p-1.5 rounded-lg text-indigo-500">
                    <Droplets className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">גאות ושפל (Tides)</h4>
                    <p className="text-[10px] text-muted-foreground">הערכת מפלס מים (מטרים)</p>
                  </div>
                </div>
              </div>
              
              <div className="h-40 w-full mt-2 relative">
                {/* Zero line indicator */}
                <div className="absolute top-1/2 left-0 w-full border-t border-dashed border-slate-300 dark:border-slate-700 pointer-events-none z-0" />
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={tideData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTide" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="time" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(val) => val.split(':')[0] + ':00'}
                      interval="preserveStartEnd"
                      minTickGap={30}
                    />
                    <YAxis hide domain={[-0.6, 0.6]} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      labelStyle={{ fontWeight: 'bold', color: '#64748b' }}
                      formatter={(value: number) => {
                        const isHigh = value > 0.3;
                        const isLow = value < -0.3;
                        let suffix = '';
                        if (isHigh) suffix = ' (שיא גאות)';
                        if (isLow) suffix = ' (שפל)';
                        return [`${value > 0 ? '+' : ''}${value.toFixed(2)}m${suffix}`, 'מפלס'];
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="level" 
                      stroke="#6366f1" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorTide)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Safety Alert (Example) */}
      <section className="px-4">
        {marineData.waveHeight && marineData.waveHeight > 1.2 && (
          <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-rose-500 text-sm">זהירות: ים גלי עד רוגש</h4>
              <p className="text-xs text-rose-500/80 mt-1">
                גובה הגלים מעל 1.2 מטר. מומלץ להיזהר בעמידה על שוברי גלים וסלעים קרובים למים.
              </p>
            </div>
          </div>
        )}
        {marineData.waveHeight && marineData.waveHeight <= 1.2 && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex gap-3 items-start">
            <Info className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-emerald-500 text-sm">תנאי בטיחות מצוינים</h4>
              <p className="text-xs text-emerald-500/80 mt-1">
                הים נוח יחסית ומתאים גם למתחילים ולדייג משפחתי.
              </p>
            </div>
          </div>
        )}
      </section>


      {/* Hourly Tide & Wave Graph */}
      {marineData.dailyForecast && marineData.dailyForecast.length > 0 && (
        <section className="px-4 space-y-4 pt-4 border-t border-border/50">
          <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            תחזית ל-7 הימים הקרובים
          </h3>
          
          <div className="space-y-3">
            {marineData.dailyForecast.map((day, idx) => {
              // Determine wave condition color
              let waveColor = 'text-emerald-500';
              let waveBg = 'bg-emerald-500/10 border-emerald-500/20';
              if (day.waveHeightMax > 1.5) {
                waveColor = 'text-rose-500';
                waveBg = 'bg-rose-500/10 border-rose-500/20';
              } else if (day.waveHeightMax > 0.8) {
                waveColor = 'text-yellow-500';
                waveBg = 'bg-yellow-500/10 border-yellow-500/20';
              }

              return (
                <Card key={idx} className={`border ${waveBg} shadow-sm overflow-hidden`}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex flex-col w-1/4">
                      <span className="font-bold text-sm">
                        {idx === 0 ? 'היום' : idx === 1 ? 'מחר' : day.dayName}
                      </span>
                      <span className="text-xs text-muted-foreground">{day.date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}</span>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center w-1/4">
                      <div className="flex items-center gap-1">
                        <Waves className={`w-4 h-4 ${waveColor}`} />
                        <span className={`font-black ${waveColor}`}>{day.waveHeightMax.toFixed(1)}m</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5">גובה מקסימלי</span>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center w-1/4 border-r border-l border-border/50 px-2">
                      <div className="flex items-center gap-1">
                        <Wind className="w-4 h-4 text-cyan-500" />
                        <span className="font-bold">{Math.round(day.windSpeedMax)}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5">קמ״ש</span>
                    </div>

                    <div className="flex flex-col items-end justify-center w-1/4">
                      <div className="flex items-center gap-1">
                        <ThermometerSun className="w-4 h-4 text-orange-500" />
                        <span className="font-bold">{Math.round(day.tempMax)}°</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5">{Math.round(day.tempMin)}° min</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
}
