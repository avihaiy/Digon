import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

interface LiveBiteTickerProps {
  catches: any[];
}

export function LiveBiteTicker({ catches }: LiveBiteTickerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Get the 5 most recent catches that are public
  const recentCatches = catches
    ?.filter((c: any) => c.status === 'approved' && c.visibility !== 'private')
    .slice(0, 5) || [];

  useEffect(() => {
    if (recentCatches.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % recentCatches.length);
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, [recentCatches.length]);

  if (recentCatches.length === 0) return null;

  const currentCatch = recentCatches[currentIndex];
  
  // Format the time text, e.g. "לפני 5 דקות"
  const timeText = currentCatch.$createdAt 
    ? formatDistanceToNow(new Date(currentCatch.$createdAt), { locale: he, addSuffix: true })
    : '';

  // Clean the location string (remove map coordinates if they exist)
  const locationName = currentCatch.location ? currentCatch.location.split('|||')[0].trim() : '';

  // E.g., "אביחי תפס לוקוס (2.5 ק״ג) באשדוד לפני 5 דקות"
  const text = `${currentCatch.user_name || 'דייג'} תפס ${currentCatch.fish_type || 'דג'} ${currentCatch.weight ? `(${currentCatch.weight} ק״ג)` : ''} ${locationName ? `ב${locationName}` : ''} ${timeText}`;

  return (
    <div className="w-full bg-gradient-to-r from-orange-500/10 via-red-500/5 to-transparent border-y border-red-500/20 py-2 px-4 flex items-center overflow-hidden cursor-pointer hover:bg-orange-500/20 transition-colors" onClick={() => {
      // Scroll to feed if they click the ticker
      window.scrollTo({ top: 500, behavior: 'smooth' });
    }}>
      <div className="flex-shrink-0 flex items-center gap-1.5 ml-3 bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
        <Flame className="w-3 h-3 animate-pulse" />
        <span>בשטח כעת</span>
      </div>
      
      <div className="flex-1 relative h-5 flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute left-0 right-0 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 truncate"
          >
            {text}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
