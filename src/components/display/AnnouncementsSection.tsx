import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Announcement {
  id: string;
  content: string;
  priority: number;
}

interface AnnouncementsSectionProps {
  announcements: Announcement[];
  scrollInterval?: number;
}

export function AnnouncementsSection({ announcements, scrollInterval = 5000 }: AnnouncementsSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const shouldScroll = announcements.length > 3;
  
  useEffect(() => {
    if (!shouldScroll) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, scrollInterval);
    
    return () => clearInterval(timer);
  }, [announcements.length, scrollInterval, shouldScroll]);

  // Show 3 announcements at a time, cycling through
  const getVisibleAnnouncements = () => {
    if (!shouldScroll) return announcements;
    
    const visible = [];
    for (let i = 0; i < 3; i++) {
      const idx = (currentIndex + i) % announcements.length;
      visible.push(announcements[idx]);
    }
    return visible;
  };

  const visibleAnnouncements = getVisibleAnnouncements();

  return (
    <div className="bg-white/90 rounded-xl p-5 border-2 border-amber-600 shadow-lg flex-1 flex flex-col">
      <h2 className="text-4xl font-bold text-center text-amber-800 mb-4 bg-amber-100 py-3 rounded-lg border border-amber-300">
        הודעות
      </h2>
      
      <div className="flex-1 overflow-hidden relative">
        {announcements.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {visibleAnnouncements.map((ann, idx) => (
                <motion.div
                  key={`${ann.id}-${shouldScroll ? currentIndex : idx}`}
                  initial={shouldScroll ? { opacity: 0, y: 20 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldScroll ? { opacity: 0, y: -20 } : undefined}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  className="text-lg text-slate-700 py-3 px-4 border-b border-dotted border-amber-300 last:border-0 bg-amber-50/50 rounded-lg"
                >
                  {ann.content}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-4">אין הודעות</div>
        )}
      </div>
      
      {/* Scroll indicators */}
      {shouldScroll && (
        <div className="flex justify-center gap-2 mt-4 pt-2 border-t border-amber-200">
          {announcements.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx >= currentIndex && idx < currentIndex + 3 
                  ? 'bg-amber-500' 
                  : 'bg-amber-200'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
