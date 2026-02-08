import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { HDate, HebrewCalendar, Locale } from '@hebcal/core';
import { motion, AnimatePresence } from 'framer-motion';

type DayType = 'weekdays' | 'friday' | 'shabbat';
type StyleType = 'traditional_gold' | 'modern_dark' | 'clean_white' | 'royal_blue';

interface ScheduledAnnouncement {
  id: string;
  title: string;
  content: string;
  day_type: DayType;
  start_time: string;
  end_time: string;
  style: StyleType;
  is_active: boolean;
  priority: number;
}

// Style configurations for each theme
const STYLE_CONFIGS: Record<StyleType, { bg: string; text: string; accent: string }> = {
  traditional_gold: {
    bg: 'bg-gradient-to-br from-amber-100 via-amber-50 to-amber-200',
    text: 'text-amber-950',
    accent: 'text-amber-700',
  },
  modern_dark: {
    bg: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950',
    text: 'text-white',
    accent: 'text-slate-400',
  },
  clean_white: {
    bg: 'bg-gradient-to-br from-white via-slate-50 to-slate-100',
    text: 'text-slate-900',
    accent: 'text-slate-500',
  },
  royal_blue: {
    bg: 'bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800',
    text: 'text-white',
    accent: 'text-blue-200',
  },
};

function getCurrentDayType(): DayType {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const isAfterShabbatStart = hour >= 18; // Approximate candle lighting
  const isBeforeShabbatEnd = hour < 20; // Approximate havdalah

  // Friday after 18:00 or Saturday before 20:00
  if ((day === 5 && isAfterShabbatStart) || (day === 6 && isBeforeShabbatEnd)) {
    return 'shabbat';
  }
  // Friday before Shabbat
  if (day === 5) {
    return 'friday';
  }
  // Sunday through Thursday
  return 'weekdays';
}

function isTimeInRange(startTime: string, endTime: string): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

function getHebrewDate(): string {
  const hDate = new HDate();
  return hDate.renderGematriya(true);
}

export default function Display() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [announcements, setAnnouncements] = useState<ScheduledAnnouncement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dayType, setDayType] = useState<DayType>(getCurrentDayType());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check day type and time every 30 seconds
  useEffect(() => {
    const checkInterval = setInterval(() => {
      setDayType(getCurrentDayType());
    }, 30000);
    return () => clearInterval(checkInterval);
  }, []);

  // Fetch announcements with real-time subscription
  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data, error } = await supabase
        .from('scheduled_announcements')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (!error && data) {
        setAnnouncements(data as ScheduledAnnouncement[]);
      }
    };

    fetchAnnouncements();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('scheduled-announcements-display')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_announcements',
        },
        () => {
          fetchAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter announcements based on current day and time
  const validAnnouncements = useMemo(() => {
    return announcements.filter((a) => {
      const matchesDay = a.day_type === dayType;
      const matchesTime = isTimeInRange(a.start_time, a.end_time);
      return matchesDay && matchesTime;
    });
  }, [announcements, dayType, currentTime]);

  // Carousel rotation every 10 seconds
  useEffect(() => {
    if (validAnnouncements.length <= 1) return;

    const rotateInterval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % validAnnouncements.length);
    }, 10000);

    return () => clearInterval(rotateInterval);
  }, [validAnnouncements.length]);

  // Reset index when announcements change
  useEffect(() => {
    if (currentIndex >= validAnnouncements.length) {
      setCurrentIndex(0);
    }
  }, [validAnnouncements.length, currentIndex]);

  const currentAnnouncement = validAnnouncements[currentIndex];
  const styleConfig = currentAnnouncement
    ? STYLE_CONFIGS[currentAnnouncement.style]
    : STYLE_CONFIGS.traditional_gold;

  const timeString = currentTime.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const hebrewDate = getHebrewDate();

  return (
    <div
      className={`fixed inset-0 flex flex-col ${styleConfig.bg} overflow-hidden`}
      dir="rtl"
    >
      {/* Header with Clock and Hebrew Date */}
      <header className="flex items-center justify-between px-[4vw] py-[3vh] border-b border-black/10">
        <div className="text-center">
          <div
            className={`text-[8vh] font-bold tabular-nums leading-none ${styleConfig.text}`}
            dir="ltr"
          >
            {timeString}
          </div>
        </div>
        <div className="text-center">
          <div className={`text-[4vh] font-semibold ${styleConfig.text}`}>
            {hebrewDate}
          </div>
          <div className={`text-[2vh] ${styleConfig.accent}`}>
            {currentTime.toLocaleDateString('he-IL', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-[4vw]">
        <AnimatePresence mode="wait">
          {validAnnouncements.length === 0 ? (
            <motion.div
              key="no-announcements"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`text-center ${styleConfig.accent}`}
            >
              <div className="text-[4vh]">אין הודעות להצגה כרגע</div>
            </motion.div>
          ) : currentAnnouncement ? (
            <motion.div
              key={currentAnnouncement.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              className="text-center max-w-[80vw]"
            >
              <h1 className={`text-[8vh] font-bold mb-[4vh] leading-tight ${styleConfig.text}`}>
                {currentAnnouncement.title}
              </h1>
              <p className={`text-[4vh] leading-relaxed ${styleConfig.accent}`}>
                {currentAnnouncement.content}
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      {/* Footer - Progress indicator */}
      {validAnnouncements.length > 1 && (
        <footer className="flex items-center justify-center gap-3 py-[2vh]">
          {validAnnouncements.map((_, idx) => (
            <div
              key={idx}
              className={`w-[2vh] h-[2vh] rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? `${styleConfig.text} scale-125`
                  : `${styleConfig.accent} opacity-50`
              }`}
              style={{
                backgroundColor: idx === currentIndex ? 'currentColor' : 'currentColor',
              }}
            />
          ))}
        </footer>
      )}
    </div>
  );
}
