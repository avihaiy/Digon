import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { HDate } from '@hebcal/core';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize, Lock, Unlock } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

type DayType = 'weekdays' | 'friday' | 'shabbat';
type StyleType = 'traditional_gold' | 'modern_dark' | 'clean_white' | 'royal_blue';

interface ScheduledAnnouncement {
  id: string;
  title: string;
  content: string;
  day_types: DayType[];
  start_time: string;
  end_time: string;
  style: StyleType;
  is_active: boolean;
  priority: number;
  image_url: string | null;
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
  const isAfterShabbatStart = hour >= 18;
  const isBeforeShabbatEnd = hour < 20;

  if ((day === 5 && isAfterShabbatStart) || (day === 6 && isBeforeShabbatEnd)) {
    return 'shabbat';
  }
  if (day === 5) {
    return 'friday';
  }
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // PWA auto-update - refresh automatically when update is available
  useRegisterSW({
    immediate: true,
    onRegistered(registration) {
      if (registration) {
        // Check for updates every 30 seconds
        setInterval(() => {
          registration.update();
        }, 30 * 1000);
      }
    },
    onNeedRefresh() {
      // Auto-refresh when update is available
      window.location.reload();
    },
  });

  // Fullscreen API handlers
  const enterFullscreen = useCallback(async () => {
    try {
      if (containerRef.current) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    if (!isLocked) {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {
        console.error('Exit fullscreen error:', err);
      }
    }
  }, [isLocked]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Prevent exit when locked
  useEffect(() => {
    if (isLocked && isFullscreen) {
      const preventExit = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
        }
      };
      document.addEventListener('keydown', preventExit, true);
      return () => document.removeEventListener('keydown', preventExit, true);
    }
  }, [isLocked, isFullscreen]);

  // Auto-hide controls after 5 seconds of inactivity
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isFullscreen) {
        setShowControls(false);
      }
    }, 5000);
  }, [isFullscreen]);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [resetControlsTimeout]);

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
      const matchesDay = a.day_types.includes(dayType);
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
      ref={containerRef}
      className={`fixed inset-0 flex flex-col ${styleConfig.bg} overflow-hidden`}
      dir="rtl"
      onMouseMove={resetControlsTimeout}
      onTouchStart={resetControlsTimeout}
    >
      {/* Fullscreen Controls - Only visible when not in fullscreen or controls are shown */}
      <AnimatePresence>
        {(!isFullscreen || showControls) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-4 left-4 z-50 flex gap-2"
          >
            {!isFullscreen ? (
              <button
                onClick={enterFullscreen}
                className={`p-3 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/30 transition-colors ${styleConfig.text}`}
                title="מסך מלא"
              >
                <Maximize className="w-6 h-6" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsLocked(!isLocked)}
                  className={`p-3 rounded-full backdrop-blur-sm transition-colors ${
                    isLocked ? 'bg-red-500/50 hover:bg-red-500/70' : 'bg-black/20 hover:bg-black/30'
                  } ${styleConfig.text}`}
                  title={isLocked ? 'בטל נעילה' : 'נעל מסך'}
                >
                  {isLocked ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
                </button>
                {!isLocked && (
                  <button
                    onClick={exitFullscreen}
                    className={`p-3 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/30 transition-colors ${styleConfig.text}`}
                    title="יציאה ממסך מלא"
                  >
                    <Maximize className="w-6 h-6" />
                  </button>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header with Clock and Hebrew Date - Always visible */}
      <header className="shrink-0 flex items-center justify-between px-[3vw] py-[2vh] border-b border-black/10 bg-inherit z-10">
        <div className="text-center">
          <div
            className={`text-[6vh] md:text-[7vh] font-bold tabular-nums leading-none ${styleConfig.text}`}
            dir="ltr"
          >
            {timeString}
          </div>
        </div>
        <div className="text-center">
          <div className={`text-[3vh] md:text-[4vh] font-semibold ${styleConfig.text}`}>
            {hebrewDate}
          </div>
          <div className={`text-[1.8vh] md:text-[2vh] ${styleConfig.accent}`}>
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
      <main className="flex-1 flex items-center justify-center overflow-hidden relative">
        <AnimatePresence mode="wait">
          {validAnnouncements.length === 0 ? (
            <motion.div
              key="no-announcements"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`text-center ${styleConfig.accent} p-[4vw]`}
            >
              <div className="text-[4vh]">אין הודעות להצגה כרגע</div>
            </motion.div>
          ) : currentAnnouncement ? (
            currentAnnouncement.image_url ? (
              // Fullscreen image mode - takes remaining space below header
              <motion.div
                key={currentAnnouncement.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
                className="absolute inset-0 flex items-center justify-center p-[2vh]"
              >
                <img
                  src={currentAnnouncement.image_url}
                  alt={currentAnnouncement.title}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </motion.div>
            ) : (
              // Text-only mode
              <motion.div
                key={currentAnnouncement.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
                className="text-center max-w-[85vw] flex flex-col items-center p-[4vw]"
              >
                <h1 className={`text-[6vh] md:text-[8vh] font-bold mb-[2vh] leading-tight ${styleConfig.text}`}>
                  {currentAnnouncement.title}
                </h1>
                <p className={`text-[3vh] md:text-[4vh] leading-relaxed ${styleConfig.accent}`}>
                  {currentAnnouncement.content}
                </p>
              </motion.div>
            )
          ) : null}
        </AnimatePresence>
      </main>

      {/* Footer - Progress indicator */}
      {validAnnouncements.length > 1 && (
        <footer className="shrink-0 flex items-center justify-center gap-3 py-[1.5vh] bg-inherit z-10">
          {validAnnouncements.map((_, idx) => (
            <div
              key={idx}
              className={`w-[1.5vh] h-[1.5vh] md:w-[2vh] md:h-[2vh] rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? `${styleConfig.text} scale-125`
                  : `${styleConfig.accent} opacity-50`
              }`}
              style={{
                backgroundColor: 'currentColor',
              }}
            />
          ))}
        </footer>
      )}
    </div>
  );
}
