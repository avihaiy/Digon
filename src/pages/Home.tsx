import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Fish, MapPin, Wind, Waves, Camera, Plus, Clock, RefreshCw, Activity, Link2, Settings2, Scale, Radar as RadarIcon, Package, Store as StoreIcon } from 'lucide-react';
import { useMarineWeather, getWindDirectionHebrew } from '@/hooks/useMarineWeather';
import { useCatches, getImageUrl } from '@/hooks/useCatches';
import { useTournaments } from '@/hooks/useTournaments';
import { CatchReportDialog } from '@/components/catches/CatchReportDialog';
import { LocationReportDialog } from '@/components/locations/LocationReportDialog';
import { SocialCatchCard } from '@/components/fishing/SocialCatchCard';
import { cn } from '@/lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { LiveBiteTicker } from '@/components/home/LiveBiteTicker';
import { CatchStories } from '@/components/home/CatchStories';
import { BiteTimeWidget } from '@/components/home/BiteTimeWidget';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: marineData, loading: marineLoading, refreshData, lastUpdated } = useMarineWeather();
  const { catches, isLoading: catchesLoading } = useCatches();
  const { activeTournaments } = useTournaments();
  
  // Get first name or use default
  const firstName = user?.name?.split(' ')[0] || 'דייג';

  return (
    <div className="space-y-4 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto">
      
      {/* Header / Welcome */}
      <div className="flex items-center justify-between px-4 mt-2">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            שלום, {firstName} <span className="animate-wave inline-block origin-bottom-right">👋</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            מוכן לזרוק חכה למים?
          </p>
        </div>
      </div>

      {/* Live Bite Ticker */}
      {catches && !catchesLoading && <LiveBiteTicker catches={catches} />}

      {/* Global Search Bar */}
      {user && (
        <div className="relative mt-2 px-4">
          <form onSubmit={(e) => { e.preventDefault(); if (searchQuery) navigate(`/fishing/search?q=${encodeURIComponent(searchQuery)}`); }}>
            <div className="relative flex items-center w-full">
              <Search className="absolute right-4 w-5 h-5 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="חפש דייגים אחרים..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pr-12 pl-4 rounded-2xl bg-white dark:bg-white/5 border border-border/50 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                dir="rtl"
              />
              <Button type="submit" size="sm" className="absolute left-2 h-8 rounded-xl bg-cyan-600 hover:bg-cyan-700">
                חפש
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Stories Row */}
      {catches && !catchesLoading && <CatchStories catches={catches} />}

      {/* Active Tournament Banner */}
      {activeTournaments && activeTournaments.length > 0 && (
        <div className="px-4">
          <Link to="/fishing/tournaments" className="block">
            <div className="bg-gradient-to-r from-yellow-500 to-amber-600 rounded-2xl p-3 shadow-lg shadow-yellow-500/20 text-white relative overflow-hidden group">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <div className="absolute -right-4 -top-4 bg-white/20 w-12 h-12 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <div className="flex items-center gap-1 text-yellow-100 text-xs font-bold mb-1 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span> פעיל עכשיו
                  </div>
                  <h3 className="font-black text-lg">{activeTournaments[0].title}</h3>
                  <p className="text-sm text-yellow-100 font-medium mt-0.5 opacity-90">{activeTournaments[0].prize_points} נקודות למנצח!</p>
                </div>
                <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                  <span className="text-2xl">🏆</span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Bite Time Widget */}
      <section className="px-4">
        <BiteTimeWidget />
      </section>

      {/* Sea Conditions Widget */}
      <section className="px-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight">מצב הים כעת</h2>
            <Link to="/fishing/forecast" className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full hover:bg-primary/20 transition-colors">
              תחזית מלאה &larr;
            </Link>
          </div>
          <button 
            onClick={refreshData}
            disabled={marineLoading}
            className="text-xs text-muted-foreground flex items-center gap-1 hover:text-primary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3 h-3", marineLoading && "animate-spin")} />
            {marineLoading ? 'מעדכן...' : `עודכן ב-${lastUpdated.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`}
          </button>
        </div>
        <Card className="border-border/50 shadow-sm bg-gradient-to-br from-blue-500/5 to-cyan-500/5 relative overflow-hidden">
          {marineLoading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
              <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          )}
          <CardContent className="p-3 py-2 flex items-center justify-between">
            <div className="flex flex-col items-center justify-center gap-1">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-full text-blue-600 dark:text-blue-400 animate-float">
                <Waves className="w-5 h-5" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">גובה גלים</p>
                <p className="text-xs text-muted-foreground" dir="ltr">
                  {marineData.waveHeight !== null ? `${marineData.waveHeight.toFixed(1)}m` : '---'}
                </p>
              </div>
            </div>
            
            <div className="w-px h-10 bg-border/50"></div>
            
            <div className="flex flex-col items-center justify-center gap-1">
              <div className="p-1.5 bg-cyan-100 dark:bg-cyan-900/50 rounded-full text-cyan-600 dark:text-cyan-400 animate-swim">
                <Wind className="w-5 h-5" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">רוח</p>
                <p className="text-xs text-muted-foreground">
                  {marineData.windSpeed !== null ? `${Math.round(marineData.windSpeed)} קמ״ש` : '---'}
                  <br/>
                  <span className="text-[10px]">{getWindDirectionHebrew(marineData.windDirection)}</span>
                </p>
              </div>
            </div>
            
            <div className="w-px h-10 bg-border/50"></div>
            
            <div className="flex flex-col items-center justify-center gap-1">
              <div className="p-1.5 bg-orange-100 dark:bg-orange-900/50 rounded-full text-orange-600 dark:text-orange-400 animate-pulse-glow">
                <span className="text-lg font-bold leading-none">
                  {marineData.temperature !== null ? `${Math.round(marineData.temperature)}°` : '--°'}
                </span>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">טמפ׳ אוויר</p>
                <p className="text-xs text-muted-foreground">מעלות</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Main CTA */}
      <section className="pt-1 px-4">
        <div className="flex gap-2">
          <CatchReportDialog>
            <Button size="default" className="flex-1 h-12 text-base font-bold rounded-xl shadow-lg shadow-primary/20 gap-2 group">
              <Camera className="w-5 h-5 group-hover:scale-110 transition-transform animate-float" />
              דיווח תפיסה
            </Button>
          </CatchReportDialog>

          <LocationReportDialog>
            <Button size="default" variant="outline" className="flex-1 h-12 text-base font-bold rounded-xl shadow-md gap-2 group bg-background/50 backdrop-blur-md border-primary/20 hover:bg-primary/5">
              <MapPin className="w-5 h-5 text-primary group-hover:scale-110 transition-transform animate-float" style={{ animationDelay: "1s" }} />
              דיווח מיקום
            </Button>
          </LocationReportDialog>
        </div>
      </section>

      {/* Useful Tools */}
      <section className="pt-1 px-4">
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          <Link to="/fishing/tackle-box" className="bg-card border border-border shadow-sm rounded-xl p-2.5 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
            <div className="bg-orange-500/10 p-2 rounded-full mb-1 animate-float">
              <Package className="w-4 h-4 text-orange-500" />
            </div>
            <span className="font-bold text-[11px]">קופסת ציוד</span>
          </Link>
          <Link to="/fishing/wiki" className="bg-card border border-border shadow-sm rounded-xl p-2.5 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
            <div className="bg-primary/10 p-2 rounded-full mb-1 animate-swim">
              <Fish className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-[11px]">ויקי-דג</span>
          </Link>
          <Link to="/fishing/identify" className="bg-card border border-border shadow-sm rounded-xl p-2.5 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
            <div className="bg-blue-500/10 p-2 rounded-full mb-1 animate-pulse-glow">
              <Camera className="w-4 h-4 text-blue-500" />
            </div>
            <span className="font-bold text-[11px]">זיהוי AI</span>
          </Link>
          <Link to="/fishing/store" className="bg-card border border-border shadow-sm rounded-xl p-2.5 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
            <div className="bg-yellow-500/10 p-2 rounded-full mb-1 animate-float" style={{ animationDelay: "0.5s" }}>
              <StoreIcon className="w-4 h-4 text-yellow-600" />
            </div>
            <span className="font-bold text-[11px]">חנות</span>
          </Link>
          <Link to="/fishing/knots" className="bg-card border border-border shadow-sm rounded-xl p-2.5 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
            <div className="bg-emerald-500/10 p-2 rounded-full mb-1">
              <Link2 className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="font-bold text-[11px]">קשרים</span>
          </Link>
          <Link to="/fishing/analytics" className="bg-card border border-border shadow-sm rounded-xl p-2.5 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
            <div className="bg-purple-500/10 p-2 rounded-full mb-1">
              <Activity className="w-4 h-4 text-purple-500" />
            </div>
            <span className="font-bold text-[11px]">סטטיסטיקה</span>
          </Link>
          <Link to="/fishing/radar" className="bg-card border border-border shadow-sm rounded-xl p-2.5 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
            <div className="bg-rose-500/10 p-2 rounded-full mb-1 animate-pulse-glow" style={{ animationDelay: "1s" }}>
              <RadarIcon className="w-4 h-4 text-rose-500" />
            </div>
            <span className="font-bold text-[11px]">ראדאר חם</span>
          </Link>
          <Link to="/fishing/weight-calculator" className="bg-card border border-border shadow-sm rounded-xl p-2.5 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
            <div className="bg-amber-500/10 p-2 rounded-full mb-1">
              <Scale className="w-4 h-4 text-amber-500" />
            </div>
            <span className="font-bold text-[11px]">משקל דג</span>
          </Link>
        </div>
      </section>

      {/* Recent Catches Feed */}
      <section className="pt-2 px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold tracking-tight">תפיסות אחרונות בשטח</h2>
          <Button variant="link" className="text-xs h-auto p-0 text-primary">צפה בהכל</Button>
        </div>
        
        <div className="space-y-4">
          {catchesLoading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : catches && catches.length > 0 ? (
            catches.map((report) => (
              <SocialCatchCard key={report.$id} report={report} />
            ))
          ) : (
            <div className="text-center p-8 bg-muted/20 rounded-xl border border-dashed">
              <p className="text-sm text-muted-foreground">עדיין אין תפיסות היום.</p>
              <p className="text-xs text-muted-foreground mt-1">תהיה הראשון לדווח!</p>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
