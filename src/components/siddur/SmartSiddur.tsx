import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Check, X, AlertCircle, Info, ChevronRight } from 'lucide-react';
import { getSiddurAlerts, SiddurAlert } from '@/lib/siddur-utils';
import { HDate } from '@hebcal/core';
import { toast } from 'sonner';

export type PrayerType = 'shacharit' | 'mincha' | 'arvit' | 'tehillim';

interface SmartSiddurProps {
  prayer: PrayerType;
  onClose: () => void;
  onFinish: () => void;
}

const TEHILLIM_MONTHLY: Record<number, string> = {
  1: "1-9", 2: "10-17", 3: "18-22", 4: "23-28", 5: "29-34",
  6: "35-38", 7: "39-43", 8: "44-48", 9: "49-54", 10: "55-59",
  11: "60-65", 12: "66-68", 13: "69-71", 14: "72-76", 15: "77-78",
  16: "79-82", 17: "83-87", 18: "88-89", 19: "90-96", 20: "97-103",
  21: "104-105", 22: "106-107", 23: "108-112", 24: "113-118",
  25: "119.1-96", 26: "119.97-176", 27: "120-134", 28: "135-139",
  29: "140-144", 30: "145-150"
};

export function SmartSiddur({ prayer, onClose, onFinish }: SmartSiddurProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [textBlocks, setTextBlocks] = useState<string[]>([]);
  const alerts = useMemo(() => getSiddurAlerts(new Date()), []);
  
  const hdate = useMemo(() => new HDate(), []);
  const dateString = hdate.renderGematriya(true);

  const getPrayerTitle = () => {
    switch (prayer) {
      case 'shacharit': return 'תפילת שחרית';
      case 'mincha': return 'תפילת מנחה';
      case 'arvit': return 'תפילת ערבית';
      case 'tehillim': return 'תהילים יומי';
    }
  };

  useEffect(() => {
    const fetchPrayer = async () => {
      try {
        setLoading(true);
        setError('');
        
        let endpoint = '';
        if (prayer === 'tehillim') {
          const dayOfMonth = hdate.getDate();
          const range = TEHILLIM_MONTHLY[dayOfMonth === 30 ? 30 : dayOfMonth] || "1-9";
          endpoint = `Psalms.${range}`;
        } else {
          // Edot HaMizrach Siddur paths on Sefaria
          const base = 'Siddur_Edot_HaMizrach,_Weekday_';
          if (prayer === 'shacharit') endpoint = `${base}Shacharit`;
          if (prayer === 'mincha') endpoint = `${base}Mincha`;
          if (prayer === 'arvit') endpoint = `${base}Arvit`;
        }

        const res = await fetch(`https://www.sefaria.org/api/texts/${endpoint}?context=0&he=1`);
        if (!res.ok) throw new Error("Failed to fetch prayer data");
        const data = await res.json();
        
        // Flatten the Sefaria text array
        const flattenDeep = (arr: any[]): string[] => {
          return arr.reduce((acc, val) => 
            Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), []);
        };

        let verses: string[] = [];
        if (data.he) {
          if (Array.isArray(data.he)) {
            verses = flattenDeep(data.he);
          } else if (typeof data.he === 'string') {
            verses = [data.he];
          }
        }
        
        setTextBlocks(verses.filter(v => typeof v === 'string' && v.trim().length > 0));
      } catch (err) {
        console.error("Error fetching prayer:", err);
        setError("שגיאה בטעינת התפילה. ייתכן שאין חיבור לרשת או שהשרת עמוס.");
      } finally {
        setLoading(false);
      }
    };
    fetchPrayer();
  }, [prayer, hdate]);

  const handleFinish = async () => {
    onFinish();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-zinc-950 flex flex-col animate-in slide-in-from-bottom-full duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
          <ChevronRight className="w-6 h-6" />
        </Button>
        <div className="text-center">
          <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100">{getPrayerTitle()}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{dateString}</p>
        </div>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      <ScrollArea className="flex-1 px-4 py-6" dir="rtl">
        <div className="max-w-2xl mx-auto space-y-6 pb-24">
          
          {/* Smart Alerts */}
          {alerts.length > 0 && !loading && !error && (
            <div className="space-y-3 mb-8">
              {alerts.map((alert, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-start gap-3 p-4 rounded-2xl border ${
                    alert.type === 'critical' ? 'bg-red-50/80 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-800 dark:text-red-300' :
                    alert.type === 'warning' ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300' :
                    'bg-blue-50/80 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300'
                  }`}
                >
                  <span className="text-2xl leading-none">{alert.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm mb-0.5">{alert.title}</h4>
                    <p className="text-sm opacity-90 leading-snug">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="space-y-4 pt-4">
              <Skeleton className="h-8 w-3/4 mx-auto rounded-full bg-slate-200 dark:bg-zinc-800" />
              <Skeleton className="h-4 w-full rounded-full bg-slate-200 dark:bg-zinc-800" />
              <Skeleton className="h-4 w-5/6 mx-auto rounded-full bg-slate-200 dark:bg-zinc-800" />
              <Skeleton className="h-4 w-full rounded-full bg-slate-200 dark:bg-zinc-800 mt-8" />
              <Skeleton className="h-4 w-4/6 mx-auto rounded-full bg-slate-200 dark:bg-zinc-800" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500 font-medium">
              {error}
            </div>
          ) : (
            <div 
              className="text-center text-slate-800 dark:text-slate-200" 
              style={{ 
                fontFamily: '"Frank Ruhl Libre", "David Libre", "Times New Roman", serif',
                fontSize: '1.4rem', 
                lineHeight: '2.2',
              }}
            >
              {textBlocks.map((block, idx) => {
                const isBreak = block.includes('{פ}') || block.includes('{ס}');
                // Small trick to make Hebrew names of God bold if present in Sefaria text
                const formattedBlock = block.replace(/(יהוה|אדני)/g, '<b>$1</b>');
                
                return (
                  <span key={idx}>
                    <span dangerouslySetInnerHTML={{ __html: formattedBlock }} />
                    {isBreak ? (
                      <div className="h-6 w-full" />
                    ) : (
                      <span className="mx-1.5 text-slate-300 dark:text-slate-700">♦</span>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer / Finish Button */}
      {!loading && !error && textBlocks.length > 0 && (
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-t border-slate-200 dark:border-zinc-800 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sticky bottom-0 z-20">
          <Button 
            onClick={handleFinish}
            className="w-full rounded-full py-6 h-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-lg shadow-lg shadow-emerald-500/30 transition-transform active:scale-[0.98]"
          >
            <Check className="w-6 h-6 ml-2 stroke-[3px]" />
            סיימתי להתפלל
          </Button>
        </div>
      )}
    </div>
  );
}
