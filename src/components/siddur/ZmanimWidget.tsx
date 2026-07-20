import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Sunrise, Sunset, Clock, Sun, Moon } from 'lucide-react';

interface ZmanimData {
  times: {
    alotHaShachar: string;
    sunrise: string;
    sofZmanShma: string;
    chatzot: string;
    sunset: string;
    tzeit7083deg: string;
  };
}

export function ZmanimWidget() {
  const [data, setData] = useState<ZmanimData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Default to Jerusalem (geonameid=281184). In a real app we'd use geolocation.
    fetch('https://www.hebcal.com/zmanim?cfg=json&geonameid=281184')
      .then(res => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch zmanim:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex gap-3 overflow-hidden p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm mb-6">
        <Skeleton className="h-16 w-24 shrink-0 rounded-xl bg-slate-100 dark:bg-zinc-800" />
        <Skeleton className="h-16 w-24 shrink-0 rounded-xl bg-slate-100 dark:bg-zinc-800" />
        <Skeleton className="h-16 w-24 shrink-0 rounded-xl bg-slate-100 dark:bg-zinc-800" />
      </div>
    );
  }

  if (!data || !data.times) return null;

  const formatTime = (isoString: string) => {
    if (!isoString) return '--:--';
    const d = new Date(isoString);
    return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  };

  const zmanimList = [
    { label: 'עלות השחר', time: data.times.alotHaShachar, icon: <Moon className="w-4 h-4 text-slate-400" /> },
    { label: 'נץ החמה', time: data.times.sunrise, icon: <Sunrise className="w-4 h-4 text-amber-500" /> },
    { label: 'סוף זמן ק"ש', time: data.times.sofZmanShma, icon: <Clock className="w-4 h-4 text-blue-500" /> },
    { label: 'חצות', time: data.times.chatzot, icon: <Sun className="w-4 h-4 text-orange-500" /> },
    { label: 'שקיעה', time: data.times.sunset, icon: <Sunset className="w-4 h-4 text-pink-500" /> },
    { label: 'צאת הכוכבים', time: data.times.tzeit7083deg, icon: <Moon className="w-4 h-4 text-indigo-400" /> },
  ];

  return (
    <div className="mb-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-2 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">זמני היום</h3>
        <span className="text-xs text-slate-400">אופק ירושלים</span>
      </div>
      <div className="grid grid-cols-3 gap-2 p-3" dir="rtl">
        {zmanimList.map((z, idx) => (
          <div key={idx} className="flex flex-col items-center justify-center p-2 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-100 dark:border-zinc-800">
            <div className="mb-1">{z.icon}</div>
            <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mb-0.5">{z.label}</div>
            <div className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">{formatTime(z.time)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
