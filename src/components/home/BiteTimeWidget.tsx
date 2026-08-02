import { useSolunar } from '@/hooks/useSolunar';
import { Card, CardContent } from '@/components/ui/card';
import { Moon, Clock, Flame } from 'lucide-react';
import { motion } from 'framer-motion';

export function BiteTimeWidget() {
  const { data, loading } = useSolunar();

  if (loading || !data) {
    return (
      <Card className="border-border/50 shadow-sm bg-gradient-to-br from-indigo-500/5 to-purple-500/5 h-24 flex items-center justify-center">
        <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
      </Card>
    );
  }

  // Determine colors based on rating
  let colorClass = 'text-slate-400 bg-slate-400/10';
  let barColor = 'bg-slate-400';
  if (data.rating >= 80) {
    colorClass = 'text-rose-500 bg-rose-500/10';
    barColor = 'bg-rose-500';
  } else if (data.rating >= 60) {
    colorClass = 'text-orange-500 bg-orange-500/10';
    barColor = 'bg-orange-500';
  } else if (data.rating >= 40) {
    colorClass = 'text-yellow-500 bg-yellow-500/10';
    barColor = 'bg-yellow-500';
  }

  // Calculate moon phase icon (simplified)
  // 0 = New, 0.5 = Full, 1 = New
  const getMoonPhaseName = (phase: number) => {
    if (phase < 0.1 || phase > 0.9) return 'ירח חדש';
    if (phase > 0.4 && phase < 0.6) return 'ירח מלא';
    if (phase <= 0.4) return 'ירח מתמלא';
    return 'ירח מתמעט';
  };

  return (
    <Card className="border-border/50 shadow-sm bg-gradient-to-br from-indigo-500/5 to-purple-500/5 overflow-hidden relative group cursor-pointer hover:shadow-md transition-all">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          
          {/* Left Side: Rating */}
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full flex flex-col items-center justify-center min-w-[50px] min-h-[50px] ${colorClass}`}>
              <Flame className={`w-5 h-5 ${data.rating >= 80 ? 'animate-pulse' : ''}`} />
              <span className="text-[10px] font-black mt-0.5">{data.rating}%</span>
            </div>
            
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-sm font-black text-slate-800 dark:text-slate-200">פעילות דגים</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${colorClass}`}>
                  {data.status}
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-24 h-1.5 bg-border rounded-full overflow-hidden mt-1.5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${data.rating}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full ${barColor}`} 
                />
              </div>
            </div>
          </div>

          {/* Right Side: Details */}
          <div className="flex flex-col gap-2 border-r border-border/50 pr-3">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <div className="flex flex-col">
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">שעות אכילה (Major)</span>
                <span className="text-xs font-bold font-mono" dir="ltr">{data.nextMajorTime}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {getMoonPhaseName(data.moonPhase)}
              </span>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
