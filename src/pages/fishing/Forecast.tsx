import { useMarineWeather, getWindDirectionHebrew } from '@/hooks/useMarineWeather';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Waves, Wind, Sun, Clock, Fish, Compass, ThermometerSun, AlertTriangle, Info, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

import { CalendarDays } from "lucide-react";
import { LiveCams } from "@/components/fishing/LiveCams";

// Simulated Solunar logic based on current hour
const getSolunarRating = () => {
  const hour = new Date().getHours();
  // Best fishing times usually at dawn (5-8) and dusk (17-20)
  if ((hour >= 5 && hour <= 8) || (hour >= 17 && hour <= 20)) {
    return { rating: "מצוין", score: 95, color: "text-emerald-500", bg: "bg-emerald-500/10", message: "זמן מעולה לדייג! הדגים בשיא הפעילות." };
  } else if ((hour >= 9 && hour <= 11) || (hour >= 15 && hour <= 16)) {
    return { rating: "טוב", score: 65, color: "text-yellow-500", bg: "bg-yellow-500/10", message: "זמן טוב לדייג. פעילות בינונית צפויה." };
  } else {
    return { rating: "חלש", score: 35, color: "text-rose-500", bg: "bg-rose-500/10", message: "זמן חלש לדייג. מומלץ לחכות לשעות הפעילות." };
  }
};

export default function Forecast() {
  const { data: marineData, loading: marineLoading, lastUpdated } = useMarineWeather();
  const solunar = getSolunarRating();

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 mt-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            תחזית דייג <Sun className="w-6 h-6 text-yellow-500" />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            מצב הים, זמני פעילות (Solunar) ותנאים
          </p>
        </div>
      </div>

      {/* Live Cams */}
      <LiveCams />

      {/* Solunar Fishing Score */}
      <section className="px-4">
        <Card className="border-border/50 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[50px] -z-10" />
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="font-bold text-lg">פעילות הדגים עכשיו</h2>
                <p className="text-sm text-muted-foreground mt-1">{solunar.message}</p>
              </div>
              <Badge variant="outline" className={cn("font-bold px-3 py-1 text-sm border-0", solunar.bg, solunar.color)}>
                {solunar.rating}
              </Badge>
            </div>

            <div className="flex flex-col items-center justify-center">
              <div className="relative w-32 h-32 flex items-center justify-center">
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
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Daily Windows */}
      <section className="px-4">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          חלונות זהב להיום
        </h3>
        <div className="space-y-3">
          <div className="p-4 rounded-2xl border border-border bg-card flex items-center justify-between shadow-sm">
            <div>
              <div className="font-bold text-lg">05:30 - 08:00</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Sun className="w-3.5 h-3.5" /> שעות הזריחה
              </div>
            </div>
            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold">מצוין</Badge>
          </div>
          <div className="p-4 rounded-2xl border border-border bg-card flex items-center justify-between shadow-sm">
            <div>
              <div className="font-bold text-lg">18:15 - 20:30</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Sun className="w-3.5 h-3.5" /> שעות השקיעה
              </div>
            </div>
            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold">מצוין</Badge>
          </div>
        </div>
      </section>

      {/* Sea Conditions */}
      <section className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Waves className="w-5 h-5 text-primary" />
            מצב הים המעודכן
          </h3>
          <span className="text-[10px] text-muted-foreground">
            {lastUpdated.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <div className="p-3 bg-blue-500/10 rounded-full text-blue-500 mb-3">
                <Waves className="w-6 h-6" />
              </div>
              <p className="text-2xl font-black">
                {marineLoading ? "..." : marineData.waveHeight !== null ? marineData.waveHeight.toFixed(1) : "---"}
                <span className="text-sm font-normal text-muted-foreground ms-1">מ'</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">גובה גלים</p>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <div className="p-3 bg-cyan-500/10 rounded-full text-cyan-500 mb-3">
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
          
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <div className="p-3 bg-orange-500/10 rounded-full text-orange-500 mb-3">
                <ThermometerSun className="w-6 h-6" />
              </div>
              <p className="text-2xl font-black">
                {marineLoading ? "..." : marineData.temperature !== null ? Math.round(marineData.temperature) : "---"}
                <span className="text-sm font-normal text-muted-foreground ms-1">°C</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">טמפרטורת אוויר</p>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <div className="p-3 bg-indigo-500/10 rounded-full text-indigo-500 mb-3">
                <Compass className="w-6 h-6" />
              </div>
              <p className="text-base font-bold mt-1 text-muted-foreground">
                {marineLoading ? "..." : marineData.locationName}
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">מיקום מדידה</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Forecast Charts Section */}
      {marineData.hourlyForecast && marineData.hourlyForecast.length > 0 && (
        <section className="px-4 space-y-4">
          <h3 className="font-bold text-lg mb-2">תחזית 24 שעות</h3>
          
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-4">
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

          <div className="grid grid-cols-2 gap-4">
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-1 mb-2">
                  <ThermometerSun className="w-3.5 h-3.5 text-orange-500" />
                  <h4 className="font-bold text-xs">טמפרטורה</h4>
                </div>
                <div className="h-16 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={marineData.hourlyForecast}>
                      <defs>
                        <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Tooltip formatter={(value: number) => [`${value.toFixed(1)}°`, 'מעלות']} />
                      <Area type="monotone" dataKey="temperature" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorTemp)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-1 mb-2">
                  <Wind className="w-3.5 h-3.5 text-cyan-500" />
                  <h4 className="font-bold text-xs">רוח (קמ״ש)</h4>
                </div>
                <div className="h-16 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={marineData.hourlyForecast}>
                      <defs>
                        <linearGradient id="colorWind" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Tooltip formatter={(value: number) => [`${value.toFixed(1)}`, 'קמ״ש']} />
                      <Area type="monotone" dataKey="windSpeed" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorWind)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
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

      {/* 7-Day Forecast */}
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
