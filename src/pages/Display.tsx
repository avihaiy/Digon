import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { HDate, months, gematriya, HebrewCalendar, flags } from '@hebcal/core';
import { getMashivHaruach, getRoshChodesh, getErevRoshChodesh, getBirkatHashanim, getSefiratHaOmer } from '@/lib/hebrew-utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize, Lock, Unlock } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import MemorialDisplaySlide from '@/components/display/MemorialDisplaySlide';
import FinanceDisplaySlide from '@/components/display/FinanceDisplaySlide';
import PrayerTimesSlide from '@/components/display/PrayerTimesSlide';

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

interface MemorialPerson {
  id: string;
  deceased_name: string;
  father_name: string;
  is_male: boolean | null;
  hebrew_date_display: string;
  days_until: number;
}

// Hebrew month names for display
const HEBREW_MONTH_NAMES: Record<number, string> = {
  1: 'ניסן', 2: 'אייר', 3: 'סיוון', 4: 'תמוז', 5: 'אב', 6: 'אלול',
  7: 'תשרי', 8: 'חשוון', 9: 'כסלו', 10: 'טבת', 11: 'שבט', 12: 'אדר', 13: 'אדר ב׳',
};

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

function getTodayHolidayHebrew(): string | null {
  const HOLIDAY_HEBREW: Record<string, string> = {
    'Rosh Hashana': 'ראש השנה', 'Yom Kippur': 'יום כיפור', 'Sukkot': 'סוכות',
    'Shmini Atzeret': 'שמיני עצרת', 'Simchat Torah': 'שמחת תורה', 'Chanukah': 'חנוכה',
    'Tu BiShvat': 'ט״ו בשבט', 'Purim': 'פורים', 'Pesach': 'פסח',
    'Shavuot': 'שבועות', "Lag BaOmer": 'ל״ג בעומר',
    "Yom HaShoah": 'יום השואה', "Yom HaZikaron": 'יום הזיכרון',
    "Yom HaAtzma'ut": 'יום העצמאות', "Yom Yerushalayim": 'יום ירושלים',
    "Tish'a B'Av": 'תשעה באב', "Tu B'Av": 'ט״ו באב',
    "Tzom Gedaliah": 'צום גדליה', "Asara B'Tevet": 'עשרה בטבת',
    "Ta'anit Esther": 'תענית אסתר', "Tzom Tammuz": 'צום י״ז בתמוז',
  };

  try {
    const hdate = new HDate();
    const events = HebrewCalendar.getHolidaysOnDate(hdate, true);
    if (!events || events.length === 0) return null;

    for (const ev of events) {
      const desc = ev.getDesc();
      const evFlags = ev.getFlags();
      // Skip Rosh Chodesh and minor observances like Yom Kippur Katan
      if (evFlags & flags.ROSH_CHODESH) continue;
      if (desc.includes('Katan')) continue;
      // Only show major holidays, fasts
      if (!(evFlags & (flags.CHAG | flags.MAJOR_FAST | flags.MINOR_FAST | flags.LIGHT_CANDLES | flags.CHANUKAH_CANDLES))) continue;
      
      const key = desc.split(':')[0].trim();
      if (HOLIDAY_HEBREW[key]) return HOLIDAY_HEBREW[key];
      // Check partial matches for multi-day holidays (exact word boundary)
      for (const [eng, heb] of Object.entries(HOLIDAY_HEBREW)) {
        if (desc.startsWith(eng) || desc.includes(eng + ':') || desc.includes(eng + ' ')) return heb;
      }
    }
  } catch (e) {
    console.error('Holiday detection error:', e);
  }
  return null;
}

export default function Display() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [announcements, setAnnouncements] = useState<ScheduledAnnouncement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dayType, setDayType] = useState<DayType>(getCurrentDayType());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState(false);
  const [unlockCode, setUnlockCode] = useState('1234');
  const [memorialPeople, setMemorialPeople] = useState<MemorialPerson[]>([]);
  const [showMemorial, setShowMemorial] = useState(true);
  const [showFinance, setShowFinance] = useState(false);
  const [showWeekBefore, setShowWeekBefore] = useState(false);
  const [displayBgUrl, setDisplayBgUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Manifest switching is now handled globally by useManifestSwitcher

  // Fetch unlock code and memorial settings from settings
  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['display_lock_code', 'show_memorial_on_display', 'memorial_show_week_before', 'show_finance_on_display', 'display_background_url']);
      
      if (data) {
        for (const setting of data) {
          if (setting.key === 'display_lock_code' && setting.value) {
            setUnlockCode(setting.value);
          }
          if (setting.key === 'show_memorial_on_display') {
            setShowMemorial(setting.value !== 'false');
          }
          if (setting.key === 'memorial_show_week_before') {
            setShowWeekBefore(setting.value === 'true');
          }
          if (setting.key === 'show_finance_on_display') {
            setShowFinance(setting.value === 'true');
          }
          if (setting.key === 'display_background_url' && setting.value) {
            setDisplayBgUrl(setting.value);
          }
        }
      }
    };
    fetchSettings();

    // Subscribe to settings changes
    const channel = supabase
      .channel('display-settings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_settings',
        },
        (payload: { new: { key?: string; value?: string } }) => {
          if (payload.new?.key === 'display_lock_code' && payload.new?.value) {
            setUnlockCode(payload.new.value);
          }
          if (payload.new?.key === 'show_memorial_on_display') {
            setShowMemorial(payload.new.value !== 'false');
          }
          if (payload.new?.key === 'memorial_show_week_before') {
            setShowWeekBefore(payload.new.value === 'true');
          }
          if (payload.new?.key === 'show_finance_on_display') {
            setShowFinance(payload.new.value === 'true');
          }
          if (payload.new?.key === 'display_background_url') {
            setDisplayBgUrl(payload.new.value || null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch yahrzeits (today + optionally 7 days ahead)
  useEffect(() => {
    const fetchYahrzeits = async () => {
      // Build a set of Hebrew day/month pairs to check
      const hDateToday = new HDate();
      const datePairs: { day: number; month: number }[] = [];
      
      // Always include today
      datePairs.push({ day: hDateToday.getDate(), month: hDateToday.getMonth() });
      
      // If week-before is enabled, add next 7 days
      if (showWeekBefore) {
        for (let i = 1; i <= 7; i++) {
          const futureDate = new HDate(hDateToday.abs() + i);
          datePairs.push({ day: futureDate.getDate(), month: futureDate.getMonth() });
        }
      }

      // Fetch all active memorials and filter client-side
      const { data, error } = await supabase
        .from('memorial_names')
        .select('id, deceased_name, father_name, is_male, hebrew_death_day, hebrew_death_month')
        .eq('is_active', true);

      if (!error && data) {
        const todayAbs = hDateToday.abs();
        const matched = data.filter(p =>
          datePairs.some(dp => dp.day === p.hebrew_death_day && dp.month === p.hebrew_death_month)
        );
        setMemorialPeople(matched.map(p => {
          // Calculate days until yahrzeit
          const matchingPair = datePairs.find(dp => dp.day === p.hebrew_death_day && dp.month === p.hebrew_death_month);
          const matchIndex = matchingPair ? datePairs.indexOf(matchingPair) : 0;
          return {
            id: p.id,
            deceased_name: p.deceased_name,
            father_name: p.father_name,
            is_male: p.is_male,
            hebrew_date_display: `${gematriya(p.hebrew_death_day)} ${HEBREW_MONTH_NAMES[p.hebrew_death_month] || ''}`,
            days_until: matchIndex,
          };
        }));
      }
    };

    fetchYahrzeits();
    const interval = setInterval(fetchYahrzeits, 10 * 60 * 1000);

    const channel = supabase
      .channel('memorial-display')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'memorial_names' },
        () => fetchYahrzeits()
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [showWeekBefore]);

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

  // Handle unlock attempt
  const handleUnlockAttempt = useCallback(() => {
    setShowPinDialog(true);
    setPinValue('');
    setPinError(false);
  }, []);

  // Verify PIN code
  const handlePinComplete = useCallback((value: string) => {
    if (value === unlockCode) {
      setIsLocked(false);
      setShowPinDialog(false);
      setPinValue('');
      setPinError(false);
    } else {
      setPinError(true);
      setPinValue('');
      // Auto-hide error after 2 seconds
      setTimeout(() => setPinError(false), 2000);
    }
  }, [unlockCode]);

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

  // Build slides: announcements + memorial + finance (if applicable)
  const hasMemorial = showMemorial && memorialPeople.length > 0;
  const hasFinance = showFinance;
  
  // Slide order: memorial (0), finance (1 if memorial, 0 if not), then announcements
  const specialSlides: ('memorial' | 'finance')[] = [];
  if (hasMemorial) specialSlides.push('memorial');
  if (hasFinance) specialSlides.push('finance');
  const totalSlides = validAnnouncements.length + specialSlides.length;

  // Carousel rotation every 10 seconds
  useEffect(() => {
    if (totalSlides <= 1) return;

    const rotateInterval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, 10000);

    return () => clearInterval(rotateInterval);
  }, [totalSlides]);

  // Reset index when slides change
  useEffect(() => {
    if (currentIndex >= totalSlides) {
      setCurrentIndex(0);
    }
  }, [totalSlides, currentIndex]);

  // Determine what's showing
  const currentSlideType = currentIndex < specialSlides.length
    ? specialSlides[currentIndex]
    : 'announcement';
  const announcementIndex = currentIndex - specialSlides.length;
  const currentAnnouncement = currentSlideType === 'announcement' ? validAnnouncements[announcementIndex] : null;

  const isPrayerTimesAd = currentAnnouncement?.title === 'זמני תפילה';
  const styleConfig = currentSlideType === 'memorial'
    ? STYLE_CONFIGS.modern_dark
    : currentSlideType === 'finance'
      ? STYLE_CONFIGS.modern_dark
      : isPrayerTimesAd
        ? STYLE_CONFIGS.royal_blue
        : currentAnnouncement
          ? STYLE_CONFIGS[currentAnnouncement.style]
          : STYLE_CONFIGS.traditional_gold;

  const timeString = currentTime.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const hebrewDate = getHebrewDate();
  const mashivHaruach = getMashivHaruach(currentTime);
  const birkatHashanim = getBirkatHashanim(currentTime);
  const roshChodesh = getRoshChodesh(currentTime);
  const erevRoshChodesh = getErevRoshChodesh(currentTime);
  const todayHoliday = getTodayHolidayHebrew();
  const sefiratHaOmer = getSefiratHaOmer(currentTime);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 flex flex-col ${styleConfig.bg} overflow-hidden`}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        ...(displayBgUrl ? {
          backgroundImage: `url(${displayBgUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        } : {}),
      }}
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
                  onClick={isLocked ? handleUnlockAttempt : () => setIsLocked(true)}
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

      {/* PIN Dialog for unlocking */}
      <AnimatePresence>
        {showPinDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setShowPinDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              dir="ltr"
            >
              <h3 className="text-xl font-bold text-center mb-6 text-slate-900">
                הזן קוד לביטול נעילה
              </h3>
              <div className="flex justify-center mb-4">
                <InputOTP
                  maxLength={4}
                  value={pinValue}
                  onChange={setPinValue}
                  onComplete={handlePinComplete}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="w-14 h-14 text-2xl" />
                    <InputOTPSlot index={1} className="w-14 h-14 text-2xl" />
                    <InputOTPSlot index={2} className="w-14 h-14 text-2xl" />
                    <InputOTPSlot index={3} className="w-14 h-14 text-2xl" />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {pinError && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-center font-medium"
                >
                  קוד שגוי, נסה שוב
                </motion.p>
              )}
              <p className="text-slate-500 text-center text-sm mt-4">
                לחץ מחוץ לחלון לביטול
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header with Clock and Hebrew Date - Always visible */}
      <header className="shrink-0 border-b border-black/10 bg-inherit z-10">
        <div className="flex items-center justify-between px-[3vw] py-[1.5vh]">
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
        </div>
        {/* Halachic info bar */}
        <div className={`flex flex-wrap items-center justify-center gap-x-[3vw] gap-y-[0.5vh] px-[2vw] pb-[1vh] text-[1.6vh] md:text-[2vh] ${styleConfig.accent}`}>
          <span className="flex items-center gap-[0.5vw]">
            {mashivHaruach.isGeshem ? '🌧️' : '💧'} {mashivHaruach.text}
          </span>
          <span className="opacity-40">|</span>
          <span className="flex items-center gap-[0.5vw]">
            {birkatHashanim.isTalUmatar ? '🌾' : '☀️'} {birkatHashanim.text}
          </span>
          {roshChodesh && (
            <>
              <span className="opacity-40">|</span>
              <span className="flex items-center gap-[0.5vw]">🌙 {roshChodesh}</span>
            </>
          )}
          {!roshChodesh && erevRoshChodesh && (
            <>
              <span className="opacity-40">|</span>
              <span className="flex items-center gap-[0.5vw]">🌑 {erevRoshChodesh}</span>
            </>
          )}
          {todayHoliday && (
            <>
              <span className="opacity-40">|</span>
              <span className="flex items-center gap-[0.5vw]">⭐ {todayHoliday}</span>
            </>
          )}
          {sefiratHaOmer && (
            <>
              <span className="opacity-40">|</span>
              <span className="flex items-center gap-[0.5vw]">🌾 {sefiratHaOmer}</span>
            </>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center overflow-hidden relative">
        <AnimatePresence mode="wait">
          {totalSlides === 0 ? (
            <motion.div
              key="no-announcements"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`text-center ${styleConfig.accent} p-[4vw]`}
            >
              <div className="text-[4vh]">אין הודעות להצגה כרגע</div>
            </motion.div>
          ) : currentSlideType === 'memorial' ? (
            <MemorialDisplaySlide
              key="memorial"
              people={memorialPeople}
              textClass={styleConfig.text}
              accentClass={styleConfig.accent}
            />
          ) : currentSlideType === 'finance' ? (
            <FinanceDisplaySlide
              key="finance"
              textClass={styleConfig.text}
              accentClass={styleConfig.accent}
            />
          ) : currentAnnouncement ? (
            currentAnnouncement.title === 'זמני תפילה' ? (
              (() => {
                // Try to render structured prayer times slide
                try {
                  JSON.parse(currentAnnouncement.content);
                  return (
                    <PrayerTimesSlide
                      key={currentAnnouncement.id}
                      content={currentAnnouncement.content}
                      isShabbat={dayType === 'shabbat' || dayType === 'friday'}
                    />
                  );
                } catch {
                  // Fallback to normal ad if JSON invalid
                  return (
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
                      <p className={`text-[3vh] md:text-[4vh] leading-relaxed ${styleConfig.accent} whitespace-pre-line`}>
                        {currentAnnouncement.content}
                      </p>
                    </motion.div>
                  );
                }
              })()
            ) : currentAnnouncement.image_url ? (
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
                <p className={`text-[3vh] md:text-[4vh] leading-relaxed ${styleConfig.accent} whitespace-pre-line`}>
                  {currentAnnouncement.content}
                </p>
              </motion.div>
            )
          ) : null}
        </AnimatePresence>
      </main>

      {/* Footer - Progress indicator */}
      {totalSlides > 1 && (
        <footer className="shrink-0 flex items-center justify-center gap-3 py-[1.5vh] bg-inherit z-10">
          {Array.from({ length: totalSlides }).map((_, idx) => (
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
