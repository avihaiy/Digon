import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';
import { Trophy, Star, CheckCircle2, Flame } from 'lucide-react';
import { DailyReward } from '@/hooks/useDailyLogin';
import { cn } from '@/lib/utils';

interface DailyLoginModalProps {
  reward: DailyReward | null;
  onClose: () => void;
}

export function DailyLoginModal({ reward, onClose }: DailyLoginModalProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (reward) {
      setOpen(true);
      // Trigger confetti
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
        });
      }, 300);
    } else {
      setOpen(false);
    }
  }, [reward]);

  const handleClose = () => {
    setOpen(false);
    setTimeout(onClose, 300); // Give time for exit animation
  };

  if (!reward) return null;

  const days = [1, 2, 3, 4, 5, 6, 7];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-gradient-to-b from-blue-900 to-indigo-900 border-indigo-500/30 text-white">
        <DialogTitle className="sr-only">בונוס התחברות יומית</DialogTitle>
        
        {/* Header graphic */}
        <div className="pt-10 pb-6 px-6 text-center relative">
          <div className="absolute top-0 inset-x-0 h-32 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          
          <div className="relative z-10">
            <div className="w-20 h-20 mx-auto bg-gradient-to-tr from-amber-400 to-yellow-200 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.5)] mb-4 animate-bounce-slow">
              <Trophy className="w-10 h-10 text-amber-700" />
            </div>
            
            <h2 className="text-2xl font-black mb-1 text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-400">
              בונוס יומי!
            </h2>
            <p className="text-blue-200 text-sm">
              חזרת אלינו! הנה פינוק על ההתמדה.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-slate-900/50 p-6 rounded-t-3xl backdrop-blur-md border-t border-white/10">
          
          <div className="flex items-center justify-center gap-2 mb-6 text-amber-400 font-bold text-3xl">
            <Star className="w-8 h-8 fill-amber-400" />
            <span>+{reward.earnedPoints}</span>
            <span className="text-lg text-blue-200 font-normal">נק'</span>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-bold text-blue-200 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                רצף התחברות
              </span>
              <span className="text-xs font-bold text-white">{reward.newStreak}/7 ימים</span>
            </div>
            
            <div className="flex justify-between items-center gap-1 relative">
              {/* Progress Line Background */}
              <div className="absolute top-1/2 left-4 right-4 h-1 bg-slate-700 -translate-y-1/2 rounded-full z-0"></div>
              {/* Progress Line Fill */}
              <div 
                className="absolute top-1/2 right-4 h-1 bg-gradient-to-l from-amber-400 to-orange-500 -translate-y-1/2 rounded-full z-0 transition-all duration-1000"
                style={{ width: `calc(${(reward.newStreak - 1) * (100 / 6)}% - 1rem)` }}
              ></div>

              {days.map((day) => {
                const isPast = day < reward.newStreak;
                const isCurrent = day === reward.newStreak;
                const isFuture = day > reward.newStreak;
                const isLastDay = day === 7;

                return (
                  <div key={day} className="relative z-10 flex flex-col items-center gap-1.5">
                    <div 
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500",
                        isPast ? "bg-amber-400 text-amber-900" : 
                        isCurrent ? "bg-white text-blue-900 ring-4 ring-amber-400/30 scale-110" : 
                        "bg-slate-700 text-slate-400 border border-slate-600",
                        isLastDay && (isPast || isCurrent) ? "bg-gradient-to-tr from-amber-400 to-yellow-200 text-amber-900" : ""
                      )}
                    >
                      {isPast ? <CheckCircle2 className="w-4 h-4" /> : isLastDay ? <Trophy className="w-4 h-4" /> : day}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Button 
            onClick={handleClose}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold text-lg shadow-lg"
          >
            איזה כיף! תודה
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
