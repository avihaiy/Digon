import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Flame, CheckCircle2, BookOpen } from 'lucide-react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

export function DailyLearningTracker() {
  const [streak, setStreak] = useState(0);
  const [learnedToday, setLearnedToday] = useState(false);
  
  useEffect(() => {
    // Load from local storage
    const dataStr = localStorage.getItem('daily_learning_tracker');
    if (dataStr) {
      try {
        const data = JSON.parse(dataStr);
        const today = new Date().toDateString();
        
        // Calculate if learned today
        if (data.lastLearned === today) {
          setLearnedToday(true);
        }
        
        // Check if streak is broken (if last learned was not today and not yesterday)
        const lastLearnedDate = new Date(data.lastLearned);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (data.lastLearned === today || lastLearnedDate.toDateString() === yesterday.toDateString()) {
          setStreak(data.streak || 0);
        } else {
          // Streak broken
          setStreak(0);
          localStorage.setItem('daily_learning_tracker', JSON.stringify({
            ...data,
            streak: 0
          }));
        }
      } catch (e) {}
    }
  }, []);

  const handleLearnClick = () => {
    if (learnedToday) return;

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([30, 50, 30]);
    }

    confetti({
      particleCount: 100,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#f97316', '#ef4444', '#f59e0b']
    });

    toast.success("אשריך! זכות הלימוד תעמוד לך!", {
      icon: "🔥"
    });

    const newStreak = streak + 1;
    setStreak(newStreak);
    setLearnedToday(true);
    
    localStorage.setItem('daily_learning_tracker', JSON.stringify({
      lastLearned: new Date().toDateString(),
      streak: newStreak
    }));
  };

  return (
    <div className="mb-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm p-5 relative overflow-hidden">
      {/* Decorative background flame glow */}
      {streak > 0 && (
        <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-orange-500/10 dark:bg-orange-500/20 blur-3xl rounded-full pointer-events-none"></div>
      )}
      
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-xl text-orange-600 dark:text-orange-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">הלימוד היומי שלי</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">קביעת עיתים לתורה</p>
          </div>
        </div>
        
        {streak > 0 && (
          <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 px-3 py-1.5 rounded-full border border-orange-200 dark:border-orange-800/50 animate-in zoom-in">
            <Flame className="w-4 h-4 fill-orange-500 text-orange-500" />
            <span className="font-black text-sm">{streak} ימים</span>
          </div>
        )}
      </div>

      <Button 
        onClick={handleLearnClick}
        disabled={learnedToday}
        className={`w-full h-12 text-base font-bold transition-all duration-300 ${
          learnedToday 
            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400 opacity-100 border border-emerald-200 dark:border-emerald-800/50' 
            : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-md hover:shadow-lg'
        }`}
      >
        {learnedToday ? (
          <>
            <CheckCircle2 className="w-5 h-5 ml-2" />
            זכית! נתראה מחר
          </>
        ) : (
          <>
            <Flame className="w-5 h-5 ml-2" />
            סיימתי ללמוד היום!
          </>
        )}
      </Button>
    </div>
  );
}
