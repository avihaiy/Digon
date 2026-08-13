import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Fish, MapPin, Wind, Waves, Camera, Plus, Clock, RefreshCw, Activity, Link2, Settings2, Scale, Radar as RadarIcon, Package, Store as StoreIcon, Video, ShoppingCart } from 'lucide-react';
import { useMarineWeather, getWindDirectionHebrew } from '@/hooks/useMarineWeather';
import { useCatches, getImageUrl } from '@/hooks/useCatches';
import { useTournaments } from '@/hooks/useTournaments';
import { CatchReportDialog } from '@/components/catches/CatchReportDialog';
import { LocationReportDialog } from '@/components/locations/LocationReportDialog';
import { SocialCatchCard } from '@/components/fishing/SocialCatchCard';
import { cn } from '@/lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAppSettings } from '@/hooks/useAppSettings';
import { AlertCircle } from 'lucide-react';
import { useDailyLogin } from '@/hooks/useDailyLogin';
import { DailyLoginModal } from '@/components/home/DailyLoginModal';
import { useNotifications } from '@/hooks/useNotifications';
import { BellRing } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: marineData, loading: marineLoading, refreshData, lastUpdated } = useMarineWeather();
  const { catches, isLoading: catchesLoading } = useCatches();
  const { activeTournaments } = useTournaments();
  
  useEffect(() => {
    // Check for onboarding
    if (!localStorage.getItem("hasSeenOnboarding")) {
      navigate("/fishing/welcome");
    }
  }, [navigate]);
  
  // Get first name or use default
  const firstName = user?.name?.split(' ')[0] || 'דייג';
  
  const { data: appSettings } = useAppSettings();
  const showBanner = appSettings?.global_announcement_active === 'true' && !!appSettings?.global_announcement;

  const { reward, canClaimDaily, potentialReward, claimDaily, clearReward } = useDailyLogin();
  const { permission, requestPermission } = useNotifications();

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto">
      <DailyLoginModal reward={reward} onClose={clearReward} />
      
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

      {/* Global Announcement Banner */}
      {showBanner && (
        <div className="px-4">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-xl shadow-lg flex items-start gap-3 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="bg-white/20 p-2 rounded-full shrink-0 relative z-10">
              <AlertCircle className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div className="relative z-10">
              <h4 className="font-bold text-sm mb-0.5">הודעת מערכת</h4>
              <p className="text-sm font-medium leading-tight">{appSettings.global_announcement}</p>
            </div>
          </div>
        </div>
      )}

      {/* Push Notifications Banner */}
      {permission === 'default' && (
        <div className="px-4">
          <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-center justify-between gap-3 animate-in fade-in zoom-in duration-500">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                <BellRing className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm">התראות דיג</h3>
                <p className="text-xs text-muted-foreground">קבל התראה כששעת הזהב מתקרבת</p>
              </div>
            </div>
            <Button onClick={requestPermission} size="sm" className="rounded-full text-xs h-8">
              הפעל
            </Button>
          </div>
        </div>
      )}

      {/* Main Actions Grid */}
      {/* Daily Bonus Button */}
      {canClaimDaily && potentialReward && (
        <div className="px-4">
          <div className="relative overflow-hidden rounded-3xl animate-in slide-in-from-top-4">
            <button 
              onClick={claimDaily}
              className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-white font-black py-4 shadow-[0_10px_30px_rgba(245,158,11,0.4)] border border-yellow-300/50 flex items-center justify-center gap-3 transition-all active:scale-95 group"
            >
              <span className="text-2xl group-hover:rotate-12 transition-transform">🎁</span>
              <span>אסוף בונוס יומי! (+{potentialReward.earnedPoints} נק')</span>
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
            </button>
          </div>
        </div>
      )}
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

      {/* Sea Conditions Widget */}
      <section className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-200">
            מצב הים כעת <span className="font-normal text-xs text-muted-foreground ml-1">({marineData.locationName?.replace('המיקום שלך - ', '')})</span>
          </h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={refreshData}
              disabled={marineLoading}
              className="text-[10px] text-muted-foreground flex items-center gap-1 hover:text-primary transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3 h-3", marineLoading && "animate-spin")} />
              {marineLoading ? 'מעדכן...' : `עודכן ב-${lastUpdated.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`}
            </button>
            <Link to="/fishing/forecast" className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full hover:bg-primary/20 transition-colors">
              תחזית מלאה &larr;
            </Link>
          </div>
        </div>
        
        <div className="bg-background/40 dark:bg-background/20 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-3xl relative overflow-hidden">
          {marineLoading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-md z-10 flex items-center justify-center">
              <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          )}
          <div className="p-4 flex items-center justify-between relative z-10">
            <div className="flex flex-col items-center justify-center gap-2 flex-1">
              <div className="text-blue-500 dark:text-blue-400">
                <Waves className="w-6 h-6 animate-float opacity-80" />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold opacity-70 mb-0.5">גלים</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100" dir="ltr">
                  {marineData.waveHeight !== null ? `${marineData.waveHeight.toFixed(1)}m` : '---'}
                </p>
              </div>
            </div>
            
            <div className="w-px h-12 bg-slate-400/20 dark:bg-slate-500/20"></div>
            
            <div className="flex flex-col items-center justify-center gap-2 flex-1">
              <div className="text-cyan-500 dark:text-cyan-400">
                <Wind className="w-6 h-6 animate-swim opacity-80" />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold opacity-70 mb-0.5">רוח</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
                  {marineData.windSpeed !== null ? `${Math.round(marineData.windSpeed)} קמ״ש` : '---'}
                  <br/>
                  <span className="text-[9px] font-normal opacity-70">{getWindDirectionHebrew(marineData.windDirection)}</span>
                </p>
              </div>
            </div>
            
            <div className="w-px h-12 bg-slate-400/20 dark:bg-slate-500/20"></div>
            
            <div className="flex flex-col items-center justify-center gap-2 flex-1">
              <div className="text-orange-500 dark:text-orange-400">
                <span className="text-xl font-black opacity-90 tracking-tighter">
                  {marineData.temperature !== null ? `${Math.round(marineData.temperature)}°` : '--°'}
                </span>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold opacity-70 mb-0.5">אוויר</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  מעלות
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Safety Alert directly on Home */}
        {!marineLoading && marineData.waveHeight !== null && (
          <div className="mt-4">
            {marineData.waveHeight > 1.2 ? (
              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-l-4 border-rose-500 p-3 rounded-2xl flex gap-3 items-start shadow-sm">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">זהירות: ים גלי עד רוגש</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    גובה הגלים מעל 1.2 מטר. מומלץ להיזהר בעמידה על שוברי גלים וסלעים קרובים למים.
                  </p>
                </div>
              </div>
            ) : marineData.waveHeight <= 1.2 && marineData.waveHeight > 0 ? (
              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-l-4 border-emerald-500 p-3 rounded-2xl flex gap-3 items-start shadow-sm">
                <div className="p-1 bg-emerald-100 dark:bg-emerald-900/50 rounded-full shrink-0 mt-0.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">תנאי ים בטוחים (נוח)</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    גובה הגלים מאפשר עמידה בטוחה. שים לב שתנאי הים לבדם אינם מבטיחים דיג מוצלח - בדוק את התחזית המלאה.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}
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
      <section className="pt-2 pl-0 pr-4">
        <h2 className="text-sm font-bold tracking-tight mb-3 text-muted-foreground">כלים שימושיים</h2>
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-4 pr-0 pl-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`.hide-scroll::-webkit-scrollbar { display: none; }`}</style>
          <Link to="/fishing/cams" className="bg-card border border-border shadow-sm rounded-2xl p-3 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors shrink-0 w-20 min-w-[5rem] snap-start">
            <div className="bg-red-500/10 p-2.5 rounded-full mb-2">
              <Video className="w-5 h-5 text-red-500 animate-pulse" />
            </div>
            <span className="font-bold text-[11px] leading-tight">מצלמות חוף</span>
          </Link>
          <Link to="/fishing/tackle-box" className="bg-card border border-border shadow-sm rounded-2xl p-3 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors shrink-0 w-20 min-w-[5rem] snap-start">
            <div className="bg-orange-500/10 p-2.5 rounded-full mb-2 animate-float">
              <Package className="w-5 h-5 text-orange-500" />
            </div>
            <span className="font-bold text-[11px] leading-tight">קופסת ציוד</span>
          </Link>
          <Link to="/fishing/wiki" className="bg-card border border-border shadow-sm rounded-2xl p-3 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors shrink-0 w-20 min-w-[5rem] snap-start">
            <div className="bg-primary/10 p-2.5 rounded-full mb-2 animate-swim">
              <Fish className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-[11px] leading-tight">ויקי-דג</span>
          </Link>
          <Link to="/fishing/identify" className="bg-card border border-border shadow-sm rounded-2xl p-3 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors shrink-0 w-20 min-w-[5rem] snap-start">
            <div className="bg-blue-500/10 p-2.5 rounded-full mb-2 animate-pulse-glow">
              <Camera className="w-5 h-5 text-blue-500" />
            </div>
            <span className="font-bold text-[11px] leading-tight">זיהוי AI</span>
          </Link>
          <Link to="/fishing/store" className="bg-card border border-border shadow-sm rounded-2xl p-3 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors shrink-0 w-20 min-w-[5rem] snap-start">
            <div className="bg-yellow-500/10 p-2.5 rounded-full mb-2 animate-float" style={{ animationDelay: "0.5s" }}>
              <StoreIcon className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="font-bold text-[11px] leading-tight">חנות</span>
          </Link>
          <Link to="/fishing/gear" className="bg-card border border-border shadow-sm rounded-2xl p-3 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors shrink-0 w-20 min-w-[5rem] snap-start">
            <div className="bg-orange-500/10 p-2.5 rounded-full mb-2 animate-pulse">
              <ShoppingCart className="w-5 h-5 text-orange-500" />
            </div>
            <span className="font-bold text-[11px] leading-tight">ציוד מומלץ</span>
          </Link>
          <Link to="/fishing/knots" className="bg-card border border-border shadow-sm rounded-2xl p-3 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors shrink-0 w-20 min-w-[5rem] snap-start">
            <div className="bg-emerald-500/10 p-2.5 rounded-full mb-2">
              <Link2 className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="font-bold text-[11px] leading-tight">קשרים</span>
          </Link>
          <Link to="/fishing/analytics" className="bg-card border border-border shadow-sm rounded-2xl p-3 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors shrink-0 w-20 min-w-[5rem] snap-start">
            <div className="bg-purple-500/10 p-2.5 rounded-full mb-2">
              <Activity className="w-5 h-5 text-purple-500" />
            </div>
            <span className="font-bold text-[11px] leading-tight">סטטיסטיקה</span>
          </Link>
          <Link to="/fishing/radar" className="bg-card border border-border shadow-sm rounded-2xl p-3 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors shrink-0 w-20 min-w-[5rem] snap-start">
            <div className="bg-rose-500/10 p-2.5 rounded-full mb-2 animate-pulse-glow" style={{ animationDelay: "1s" }}>
              <RadarIcon className="w-5 h-5 text-rose-500" />
            </div>
            <span className="font-bold text-[11px] leading-tight">ראדאר חם</span>
          </Link>
          <Link to="/fishing/weight-calculator" className="bg-card border border-border shadow-sm rounded-2xl p-3 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors shrink-0 w-20 min-w-[5rem] snap-start">
            <div className="bg-amber-500/10 p-2.5 rounded-full mb-2">
              <Scale className="w-5 h-5 text-amber-500" />
            </div>
            <span className="font-bold text-[11px] leading-tight">מחשבון</span>
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
