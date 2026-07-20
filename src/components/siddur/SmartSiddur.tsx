import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Check, X, AlertCircle, Info, ChevronRight } from 'lucide-react';
import { getSiddurAlerts, SiddurAlert } from '@/lib/siddur-utils';
import { HDate } from '@hebcal/core';
import { toast } from 'sonner';

export type PrayerType = 'shacharit' | 'mincha' | 'arvit' | 'tehillim' | 'birkat_hashachar' | 'birkat_hamazon';

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
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('siddur_fontSize');
    return saved ? parseFloat(saved) : 1.4;
  });
  
  const alerts = useMemo(() => getSiddurAlerts(new Date()), []);
  
  useEffect(() => {
    localStorage.setItem('siddur_fontSize', fontSize.toString());
  }, [fontSize]);

  const hdate = useMemo(() => new HDate(), []);
  const dateString = hdate.renderGematriya(true);

  const increaseFont = () => setFontSize(prev => Math.min(prev + 0.2, 3.0));
  const decreaseFont = () => setFontSize(prev => Math.max(prev - 0.2, 1.0));

  const getPrayerTitle = () => {
    switch (prayer) {
      case 'shacharit': return 'תפילת שחרית';
      case 'mincha': return 'תפילת מנחה';
      case 'arvit': return 'תפילת ערבית';
      case 'tehillim': return 'תהילים יומי';
      case 'birkat_hashachar': return 'ברכות השחר';
      case 'birkat_hamazon': return 'ברכת המזון';
    }
  };

  useEffect(() => {
    const fetchPrayer = async () => {
      try {
        setLoading(true);
        setError('');
        
        let endpoints: string[] = [];
        if (prayer === 'tehillim') {
          const dayOfMonth = hdate.getDate();
          const range = TEHILLIM_MONTHLY[dayOfMonth === 30 ? 30 : dayOfMonth] || "1-9";
          endpoints = [`Psalms.${range}`];
        } else if (prayer === 'birkat_hamazon') {
          endpoints = ['Siddur_Edot_HaMizrach,_Post_Meal_Blessing'];
        } else {
          const base = 'Siddur_Edot_HaMizrach,_Weekday_';
          if (prayer === 'birkat_hashachar') {
            const prepNodes = ["Modeh Ani", "Morning Blessings", "Torah Blessings"];
            endpoints = prepNodes.map(n => `Siddur_Edot_HaMizrach,_Preparatory_Prayers,_${n.replace(/ /g, '_')}`);
          } else if (prayer === 'shacharit') {
            const shacharitNodes = ["Petichat Eliyahu","Order of Talit","Order of Tefillin","Hanna's Prayer","Morning Prayer","Incense Offering","Hodu","Pesukei D'Zimra","The Shema","Amida","Vidui","Torah Reading","Ashrei","Uva LeSion","Beit Yaakov","Song of the Day","Kaveh","Alenu"];
            endpoints = shacharitNodes.map(n => `${base}Shacharit,_${n.replace(/ /g, '_')}`);
          } else if (prayer === 'mincha') {
            const nodes = ["Offerings","Amida","Vidui","Alenu"];
            endpoints = nodes.map(n => `${base}Mincha,_${n.replace(/ /g, '_')}`);
          } else if (prayer === 'arvit') {
            const nodes = ["Barchu","The Shema","Amidah","Alenu"];
            endpoints = nodes.map(n => `${base}Arvit,_${n.replace(/ /g, '_')}`);
          }
        }

        const responses = await Promise.all(
          endpoints.map(ep => fetch(`https://www.sefaria.org/api/texts/${ep}?context=0&he=1`))
        );
        
        const dataArr = await Promise.all(responses.map(res => {
          if (!res.ok) throw new Error("Failed to fetch prayer data");
          return res.json();
        }));
        
        const flattenDeep = (arr: any[]): string[] => {
          return arr.reduce((acc, val) => 
            Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), []);
        };

        let verses: string[] = [];
        for (const data of dataArr) {
          if (data.he) {
            if (Array.isArray(data.he)) {
              verses = verses.concat(flattenDeep(data.he));
            } else if (typeof data.he === 'string') {
              verses.push(data.he);
            }
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
    <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-zinc-950 flex flex-col h-[100dvh] animate-in slide-in-from-bottom-full duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] flex items-center justify-between shrink-0 z-10 shadow-sm">
        <div className="min-w-[70px] flex justify-start">
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>
        <div className="text-center flex-1">
          <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100">{getPrayerTitle()}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{dateString}</p>
        </div>
        <div className="min-w-[70px] flex items-center justify-end gap-1" dir="ltr">
          <Button variant="ghost" size="sm" onClick={increaseFont} className="text-lg font-bold h-8 w-8 p-0 text-slate-600 dark:text-slate-400" title="הגדל טקסט">
            A+
          </Button>
          <Button variant="ghost" size="sm" onClick={decreaseFont} className="text-sm font-bold h-8 w-8 p-0 text-slate-600 dark:text-slate-400" title="הקטן טקסט">
            A-
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6" dir="rtl">
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
            <>
              <style>{`
                .siddur-text-container small {
                  font-size: 0.8em;
                  color: #64748b;
                }
                .dark .siddur-text-container small {
                  color: #94a3b8;
                }
                .siddur-text-container big {
                  font-size: 1.4em;
                  color: #1e40af;
                  font-weight: 800;
                }
                .dark .siddur-text-container big {
                  color: #93c5fd;
                }
                .siddur-text-container > div > big,
                .siddur-text-container > div > b > big:only-child {
                  display: block;
                  text-align: center;
                  margin-top: 1.5rem;
                  margin-bottom: 0.5rem;
                }
              `}</style>
              <div 
                className="siddur-text-container text-right text-slate-800 dark:text-slate-200 break-words space-y-4 md:space-y-5" 
                style={{ 
                  fontFamily: '"Frank Ruhl Libre", "David Libre", "Times New Roman", serif',
                  fontSize: `${fontSize}rem`, 
                  lineHeight: '1.8',
                }}
              >
                {textBlocks.map((block, idx) => {
                  // Bold the names of God
                  let formattedBlock = block.replace(/(יהוה|אדני)/g, '<b>$1</b>');
                  
                  // Smart highlighting
                  const stripNikud = (str: string) => str.replace(/[\u0591-\u05C7]/g, '');
                  const stripped = stripNikud(formattedBlock.replace(/<[^>]*>?/gm, ''));
                  
                  const hasYaaleh = alerts.some(a => a.id === 'yaaleh-veyavo');
                  if (hasYaaleh && stripped.includes('יעלה ויבא')) {
                    formattedBlock = formattedBlock.replace(/<small>(.*?)<\/small>/, '<div class="bg-amber-100/80 dark:bg-amber-900/40 p-4 rounded-xl border-2 border-amber-400 dark:border-amber-600 my-4 shadow-sm text-amber-900 dark:text-amber-100 text-[1.2em] font-medium block !leading-relaxed">$1</div>');
                  }

                  const hasFastDay = alerts.some(a => a.id === 'fast-day');
                  if (hasFastDay && stripped.includes('עננו אבינו עננו')) {
                    formattedBlock = formattedBlock.replace(/<small>(.*?)<\/small>/, '<div class="bg-red-100/80 dark:bg-red-900/40 p-4 rounded-xl border-2 border-red-400 dark:border-red-600 my-4 shadow-sm text-red-900 dark:text-red-100 text-[1.2em] font-medium block !leading-relaxed">$1</div>');
                  }

                  const hasChanukah = alerts.some(a => a.id === 'al-hanissim-chanukah');
                  if (hasChanukah && stripped.includes('בימי מתתיהו')) {
                    formattedBlock = formattedBlock.replace(/<small>(.*?)<\/small>/, '<div class="bg-blue-100/80 dark:bg-blue-900/40 p-4 rounded-xl border-2 border-blue-400 dark:border-blue-600 my-4 shadow-sm text-blue-900 dark:text-blue-100 text-[1.2em] font-medium block !leading-relaxed">$1</div>');
                  }

                  const hasPurim = alerts.some(a => a.id === 'al-hanissim-purim');
                  if (hasPurim && stripped.includes('בימי מרדכי ואסתר')) {
                    formattedBlock = formattedBlock.replace(/<small>(.*?)<\/small>/, '<div class="bg-purple-100/80 dark:bg-purple-900/40 p-4 rounded-xl border-2 border-purple-400 dark:border-purple-600 my-4 shadow-sm text-purple-900 dark:text-purple-100 text-[1.2em] font-medium block !leading-relaxed">$1</div>');
                  }

                  const hasRain = alerts.some(a => a.title.includes('משיב הרוח'));
                  if (hasRain && stripped.includes('משיב הרוח ומוריד הגשם')) {
                    formattedBlock = formattedBlock.replace(/<small>(.*?מַשִּׁיב הָרֽוּחַ.*?)<\/small>/, '<span class="bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded-md border border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300 font-bold">$1</span>');
                  }

                  const hasDew = alerts.some(a => a.title.includes('מוריד הטל'));
                  if (hasDew && stripped.includes('מוריד הטל')) {
                    formattedBlock = formattedBlock.replace(/<small>(.*?מוֹרִיד הַטָּל.*?)<\/small>/, '<span class="bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded-md border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 font-bold">$1</span>');
                  }

                  // Kaddish Separation
                  const isKaddish = stripped.includes('יתגדל ויתקדש');
                  if (isKaddish) {
                    return (
                      <div key={idx} className="bg-slate-50 dark:bg-zinc-900/50 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 my-8 shadow-sm">
                        <div className="text-slate-400 dark:text-slate-500 text-sm font-bold mb-2 text-center">קדיש</div>
                        <div className="leading-relaxed text-center">
                          <span dangerouslySetInnerHTML={{ __html: formattedBlock }} />
                        </div>
                      </div>
                    );
                  }

                  // Modim Derabanan Separation
                  const isModimDerabanan = stripped.includes('מודים אנחנו לך') && formattedBlock.includes('<small>');
                  if (isModimDerabanan) {
                    return (
                      <div key={idx} className="bg-slate-100 dark:bg-zinc-800/80 p-5 rounded-2xl border border-slate-200 dark:border-zinc-700 my-6 shadow-sm">
                        <div className="text-slate-500 dark:text-slate-400 text-sm font-bold mb-2">מודים דרבנן:</div>
                        <div className="leading-relaxed text-[0.9em]">
                          <span dangerouslySetInnerHTML={{ __html: formattedBlock }} />
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={idx} className="leading-relaxed">
                      <span dangerouslySetInnerHTML={{ __html: formattedBlock }} />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer / Finish Button */}
      {!loading && !error && textBlocks.length > 0 && (
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-t border-slate-200 dark:border-zinc-800 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0 z-20">
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
