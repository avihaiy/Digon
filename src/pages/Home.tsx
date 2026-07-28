import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Fish, MapPin, Wind, Waves, Camera, Plus, Clock, RefreshCw, Activity, Link2, Settings2, Scale, Radar as RadarIcon } from 'lucide-react';
import { useMarineWeather, getWindDirectionHebrew } from '@/hooks/useMarineWeather';
import { useCatches, getImageUrl } from '@/hooks/useCatches';
import { CatchReportDialog } from '@/components/catches/CatchReportDialog';
import { LocationReportDialog } from '@/components/locations/LocationReportDialog';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export default function Home() {
  const { user } = useAuth();
  const { data: marineData, loading: marineLoading, refreshData, lastUpdated } = useMarineWeather();
  const { catches, isLoading: catchesLoading } = useCatches();
  
  // Get first name or use default
  const firstName = user?.name?.split(' ')[0] || 'דייג';

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto">
      
      {/* Header / Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            שלום, {firstName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            מוכן לזרוק חכה למים?
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/fishing/settings" className="h-12 w-12 bg-muted rounded-full flex items-center justify-center hover:bg-muted/80 transition-colors">
            <Settings2 className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Fish className="w-6 h-6 text-primary" />
          </div>
        </div>
      </div>

      {/* Sea Conditions Widget */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">מצב הים כעת</h2>
            <Badge variant="outline" className="text-[10px] font-normal">{marineData.locationName}</Badge>
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
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          )}
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-full text-blue-600 dark:text-blue-400">
                <Waves className="w-5 h-5" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">גובה גלים</p>
                <p className="text-xs text-muted-foreground" dir="ltr">
                  {marineData.waveHeight !== null ? `${marineData.waveHeight.toFixed(1)}m` : '---'}
                </p>
              </div>
            </div>
            
            <div className="w-px h-12 bg-border/50"></div>
            
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="p-2 bg-cyan-100 dark:bg-cyan-900/50 rounded-full text-cyan-600 dark:text-cyan-400">
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
            
            <div className="w-px h-12 bg-border/50"></div>
            
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-full text-orange-600 dark:text-orange-400">
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
          <div className="mt-4 pt-4 border-t border-border/50">
            <Link to="/fishing/forecast" className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
              לתחזית המלאה
              <span className="text-xs">→</span>
            </Link>
          </div>
        </Card>
      </section>

      {/* Main CTA */}
      <section className="pt-2">
        <div className="flex gap-2">
          <CatchReportDialog>
            <Button size="lg" className="flex-1 h-16 text-lg rounded-2xl shadow-lg shadow-primary/20 gap-3 group">
              <Camera className="w-6 h-6 group-hover:scale-110 transition-transform" />
              דיווח תפיסה
            </Button>
          </CatchReportDialog>

          <LocationReportDialog>
            <Button size="lg" variant="outline" className="flex-1 h-16 text-lg rounded-2xl shadow-lg gap-3 group bg-background/50 backdrop-blur-md border-primary/20 hover:bg-primary/5">
              <MapPin className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
              דיווח מיקום
            </Button>
          </LocationReportDialog>
        </div>
      </section>

      {/* Useful Tools */}
      <section className="pt-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Link to="/fishing/wiki" className="bg-card border border-border shadow-sm rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
            <div className="bg-primary/10 p-3 rounded-full mb-2">
              <Fish className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-sm">ויקי-דג</span>
          </Link>
          <Link to="/fishing/identify" className="bg-card border border-border shadow-sm rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
            <div className="bg-blue-500/10 p-3 rounded-full mb-2">
              <Camera className="w-5 h-5 text-blue-500" />
            </div>
            <span className="font-bold text-sm">זיהוי AI</span>
          </Link>
          <Link to="/fishing/knots" className="bg-card border border-border shadow-sm rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
            <div className="bg-emerald-500/10 p-3 rounded-full mb-2">
              <Link2 className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="font-bold text-sm">מדריך קשרים</span>
          </Link>
          <Link to="/fishing/analytics" className="bg-card border border-border shadow-sm rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
            <div className="bg-purple-500/10 p-3 rounded-full mb-2">
              <Activity className="w-5 h-5 text-purple-500" />
            </div>
            <span className="font-bold text-sm">סטטיסטיקות</span>
          </Link>
          <Link to="/fishing/radar" className="bg-card border border-border shadow-sm rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
            <div className="bg-rose-500/10 p-3 rounded-full mb-2">
              <RadarIcon className="w-5 h-5 text-rose-500" />
            </div>
            <span className="font-bold text-sm">ראדאר חם</span>
          </Link>
          <Link to="/fishing/weight-calculator" className="bg-card border border-border shadow-sm rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
            <div className="bg-amber-500/10 p-3 rounded-full mb-2">
              <Scale className="w-5 h-5 text-amber-500" />
            </div>
            <span className="font-bold text-sm">מחשבון משקל</span>
          </Link>
        </div>
      </section>

      {/* Recent Catches Feed */}
      <section className="pt-2">
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
              <Card key={report.$id} className="overflow-hidden border-border/50 shadow-sm">
                <div className="flex p-3 gap-4 items-center">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-border">
                    <img src={getImageUrl(report.image_id)} alt={report.fish_type} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold truncate">{report.user_name}</p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(report.$createdAt).toLocaleDateString('he-IL')}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-primary mb-1">
                      {report.fish_type} {report.weight && <span className="text-xs font-normal text-muted-foreground ml-1">({report.weight})</span>}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {report.location}
                    </p>
                  </div>
                </div>
              </Card>
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
