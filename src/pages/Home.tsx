import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Fish, MapPin, Wind, Waves, Camera, Plus, Clock, RefreshCw } from 'lucide-react';
import { useMarineWeather, getWindDirectionHebrew } from '@/hooks/useMarineWeather';
import { cn } from '@/lib/utils';

export default function Home() {
  const { user } = useAuth();
  const { data: marineData, loading: marineLoading, refreshData, lastUpdated } = useMarineWeather();
  
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
        <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
          <Fish className="w-6 h-6 text-primary" />
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
        </Card>
      </section>

      {/* Main CTA */}
      <section className="pt-2">
        <Button size="lg" className="w-full h-16 text-lg rounded-2xl shadow-lg shadow-primary/20 gap-3 group">
          <Camera className="w-6 h-6 group-hover:scale-110 transition-transform" />
          דיווח על תפיסה חדשה
          <div className="absolute right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Plus className="w-5 h-5 text-white" />
          </div>
        </Button>
      </section>

      {/* Recent Catches Feed */}
      <section className="pt-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold tracking-tight">תפיסות אחרונות בשטח</h2>
          <Button variant="link" className="text-xs h-auto p-0 text-primary">צפה בהכל</Button>
        </div>
        
        <div className="space-y-4">
          {[
            { id: 1, name: "יוסי כהן", fish: "דניס", weight: "1.2 ק״ג", location: "מרינה אשדוד", time: "לפני 10 דק׳", img: "https://images.unsplash.com/photo-1595183888365-9509df636eb0?auto=format&fit=crop&q=80&w=200&h=200" },
            { id: 2, name: "אביחי יוספוביץ׳", fish: "לוקוס", weight: "3 ק״ג", location: "שובר גלים חיפה", time: "לפני חצי שעה", img: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=200&h=200" },
            { id: 3, name: "דניאל", fish: "בורי", weight: "400 גרם", location: "נמל יפו", time: "לפני שעתיים", img: "https://images.unsplash.com/photo-1524334228333-0f6db392f8a1?auto=format&fit=crop&q=80&w=200&h=200" },
          ].map((report) => (
            <Card key={report.id} className="overflow-hidden border-border/50 shadow-sm">
              <div className="flex p-3 gap-4 items-center">
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-border">
                  <img src={report.img} alt={report.fish} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold truncate">{report.name}</p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{report.time}</span>
                  </div>
                  <p className="text-sm font-bold text-primary mb-1">
                    {report.fish} <span className="text-xs font-normal text-muted-foreground ml-1">({report.weight})</span>
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {report.location}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

    </div>
  );
}
