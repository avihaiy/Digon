import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HDate, months, gematriya, HebrewCalendar, flags } from "@hebcal/core";
import {
  getMashivHaruach,
  getRoshChodesh,
  getErevRoshChodesh,
  getBirkatHashanim,
  getSefiratHaOmer,
  getCurrentParasha,
} from "@/lib/hebrew-utils";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize, Lock, Unlock } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import MemorialDisplaySlide from "@/components/display/MemorialDisplaySlide";
import ZmanimDisplaySlide from "@/components/display/ZmanimDisplaySlide";
import HeichalDisplaySlide from "@/components/display/HeichalDisplaySlide";
import FinanceDisplaySlide from "@/components/display/FinanceDisplaySlide";
import PrayerTimesSlide from "@/components/display/PrayerTimesSlide";

type DayType = "weekdays" | "friday" | "shabbat";
type StyleType = "traditional_gold" | "modern_dark" | "clean_white" | "royal_blue";

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

const HEBREW_MONTH_NAMES: Record<number, string> = {
  1: "ניסן",
  2: "אייר",
  3: "סיוון",
  4: "תמוז",
  5: "אב",
  6: "אלול",
  7: "תשרי",
  8: "חשוון",
  9: "כסלו",
  10: "טבת",
  11: "שבט",
  12: "אדר",
  13: "אדר ב׳",
};

const STYLE_CONFIGS: Record<StyleType, { bg: string; text: string; accent: string }> = {
  traditional_gold: {
    bg: "bg-gradient-to-br from-amber-100 via-amber-50 to-amber-200",
    text: "text-amber-950",
    accent: "text-amber-700",
  },
  modern_dark: {
    bg: "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950",
    text: "text-white",
    accent: "text-slate-400",
  },
  clean_white: {
    bg: "bg-gradient-to-br from-white via-slate-50 to-slate-100",
    text: "text-slate-900",
    accent: "text-slate-500",
  },
  royal_blue: {
    bg: "bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800",
    text: "text-white",
    accent: "text-blue-200",
  },
};

function getCurrentDayType(): DayType {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  if ((day === 5 && hour >= 18) || (day === 6 && hour < 20)) return "shabbat";
  if (day === 5) return "friday";
  return "weekdays";
}

function isTimeInRange(startTime: string, endTime: string): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  return currentMinutes >= startH * 60 + startM && currentMinutes <= endH * 60 + endM;
}

function getHebrewDate(): string {
  return new HDate().renderGematriya(true);
}

function getTodayHolidayHebrew(): string | null {
  const HOLIDAY_HEBREW: Record<string, string> = {
    "Rosh Hashana": "ראש השנה",
    "Yom Kippur": "יום כיפור",
    Sukkot: "סוכות",
    "Shmini Atzeret": "שמיני עצרת",
    "Simchat Torah": "שמחת תורה",
    Chanukah: "חנוכה",
    "Tu BiShvat": "ט״ו בשבט",
    Purim: "פורים",
    Pesach: "פסח",
    Shavuot: "שבועות",
    "Lag BaOmer": "ל״ג בעומר",
    "Yom HaShoah": "יום השואה",
    "Yom HaZikaron": "יום הזיכרון",
    "Yom HaAtzma'ut": "יום העצמאות",
    "Yom Yerushalayim": "יום ירושלים",
    "Tish'a B'Av": "תשעה באב",
    "Tu B'Av": "ט״ו באב",
    "Tzom Gedaliah": "צום גדליה",
    "Asara B'Tevet": "עשרה בטבת",
    "Ta'anit Esther": "תענית אסתר",
    "Tzom Tammuz": "צום י״ז בתמוז",
  };
  try {
    const hdate = new HDate();
    const events = HebrewCalendar.getHolidaysOnDate(hdate, true);
    if (!events || events.length === 0) return null;
    for (const ev of events) {
      const desc = ev.getDesc();
      const evFlags = ev.getFlags();
      if (evFlags & flags.ROSH_CHODESH) continue;
      if (desc.includes("Katan")) continue;
      if (
        !(evFlags & (flags.CHAG | flags.MAJOR_FAST | flags.MINOR_FAST | flags.LIGHT_CANDLES | flags.CHANUKAH_CANDLES))
      )
        continue;
      const key = desc.split(":")[0].trim();
      if (HOLIDAY_HEBREW[key]) return HOLIDAY_HEBREW[key];
      for (const [eng, heb] of Object.entries(HOLIDAY_HEBREW)) {
        if (desc.startsWith(eng) || desc.includes(eng + ":") || desc.includes(eng + " ")) return heb;
      }
    }
  } catch (e) {
    console.error("Holiday detection error:", e);
  }
  return null;
}

// האם מודעה היא מסוג זמני תפילה (חול או שבת)
function isPrayerTimesAnnouncement(title: string): boolean {
  return title === "זמני תפילה" || title === "זמני תפילה שבת";
}

// האם להציג מצב שבת ב-PrayerTimesSlide
// "זמני תפילה שבת" — תמיד שבת
// "זמני תפילה" — רק בשישי/שבת
function getPrayerIsShabbat(title: string, dayType: DayType): boolean {
  if (title === "זמני תפילה שבת") return true;
  return dayType === "shabbat" || dayType === "friday";
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
  const [pinValue, setPinValue] = useState("");
  const [pinError, setPinError] = useState(false);
  const [unlockCode, setUnlockCode] = useState("1234");
  const [memorialPeople, setMemorialPeople] = useState<MemorialPerson[]>([]);
  const [showMemorial, setShowMemorial] = useState(true);
  const [showFinance, setShowFinance] = useState(false);
  const [showWeekBefore, setShowWeekBefore] = useState(false);
  const [showHeichal, setShowHeichal] = useState(false);
  const [displayBgUrl, setDisplayBgUrl] = useState<string | null>(null);
  const [slideOrder, setSlideOrder] = useState<("heichal" | "memorial" | "zmanim" | "finance" | "announcements")[]>([
    "heichal",
    "memorial",
    "zmanim",
    "finance",
    "announcements",
  ]);
  const [slideDurations, setSlideDurations] = useState<Record<string, number>>({
    heichal: 10,
    memorial: 15,
    zmanim: 20,
    finance: 10,
    announcements: 10,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", [
          "display_lock_code",
          "show_memorial_on_display",
          "memorial_show_week_before",
          "show_finance_on_display",
          "display_background_url",
          "show_heichal_on_display",
          "display_slide_order",
          "display_slide_durations",
        ]);
      if (data) {
        for (const setting of data) {
          if (setting.key === "display_lock_code" && setting.value) setUnlockCode(setting.value);
          if (setting.key === "show_memorial_on_display") setShowMemorial(setting.value !== "false");
          if (setting.key === "memorial_show_week_before") setShowWeekBefore(setting.value === "true");
          if (setting.key === "show_finance_on_display") setShowFinance(setting.value === "true");
          if (setting.key === "display_background_url" && setting.value) setDisplayBgUrl(setting.value);
          if (setting.key === "show_heichal_on_display") setShowHeichal(setting.value === "true");
          if (setting.key === "display_slide_durations" && setting.value) {
            try {
              setSlideDurations((prev) => ({ ...prev, ...JSON.parse(setting.value) }));
            } catch {}
          }
          if (setting.key === "display_slide_order" && setting.value) {
            try {
              setSlideOrder(JSON.parse(setting.value));
            } catch {}
          }
        }
      }
    };
    fetchSettings();
    const channel = supabase
      .channel("display-settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        (payload: { new: { key?: string; value?: string } }) => {
          if (payload.new?.key === "display_lock_code" && payload.new?.value) setUnlockCode(payload.new.value);
          if (payload.new?.key === "show_memorial_on_display") setShowMemorial(payload.new.value !== "false");
          if (payload.new?.key === "memorial_show_week_before") setShowWeekBefore(payload.new.value === "true");
          if (payload.new?.key === "show_finance_on_display") setShowFinance(payload.new.value === "true");
          if (payload.new?.key === "display_background_url") setDisplayBgUrl(payload.new.value || null);
          if (payload.new?.key === "show_heichal_on_display") setShowHeichal(payload.new.value === "true");
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const fetchYahrzeits = async () => {
      const hDateToday = new HDate();
      const datePairs: { day: number; month: number }[] = [];
      datePairs.push({ day: hDateToday.getDate(), month: hDateToday.getMonth() });
      if (showWeekBefore) {
        for (let i = 1; i <= 7; i++) {
          const futureDate = new HDate(hDateToday.abs() + i);
          datePairs.push({ day: futureDate.getDate(), month: futureDate.getMonth() });
        }
      }
      const { data, error } = await supabase
        .from("memorial_names")
        .select("id, deceased_name, father_name, is_male, hebrew_death_day, hebrew_death_month")
        .eq("is_active", true);
      if (!error && data) {
        const matched = data.filter((p) =>
          datePairs.some((dp) => dp.day === p.hebrew_death_day && dp.month === p.hebrew_death_month),
        );
        setMemorialPeople(
          matched.map((p) => {
            const matchingPair = datePairs.find(
              (dp) => dp.day === p.hebrew_death_day && dp.month === p.hebrew_death_month,
            );
            return {
              id: p.id,
              deceased_name: p.deceased_name,
              father_name: p.father_name,
              is_male: p.is_male,
              hebrew_date_display: `${gematriya(p.hebrew_death_day)} ${HEBREW_MONTH_NAMES[p.hebrew_death_month] || ""}`,
              days_until: matchingPair ? datePairs.indexOf(matchingPair) : 0,
            };
          }),
        );
      }
    };
    fetchYahrzeits();
    const interval = setInterval(fetchYahrzeits, 10 * 60 * 1000);
    const channel = supabase
      .channel("memorial-display")
      .on("postgres_changes", { event: "*", schema: "public", table: "memorial_names" }, () => fetchYahrzeits())
      .subscribe();
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [showWeekBefore]);

  useRegisterSW({
    immediate: true,
    onRegistered(registration) {
      if (registration) setInterval(() => registration.update(), 30 * 1000);
    },
    onNeedRefresh() {
      window.location.reload();
    },
  });

  const enterFullscreen = useCallback(async () => {
    try {
      if (containerRef.current) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    if (!isLocked) {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {
        console.error("Exit fullscreen error:", err);
      }
    }
  }, [isLocked]);

  const handleUnlockAttempt = useCallback(() => {
    setShowPinDialog(true);
    setPinValue("");
    setPinError(false);
  }, []);

  const handlePinComplete = useCallback(
    (value: string) => {
      if (value === unlockCode) {
        setIsLocked(false);
        setShowPinDialog(false);
        setPinValue("");
        setPinError(false);
      } else {
        setPinError(true);
        setPinValue("");
        setTimeout(() => setPinError(false), 2000);
      }
    },
    [unlockCode],
  );

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (isLocked && isFullscreen) {
      const preventExit = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
        }
      };
      document.addEventListener("keydown", preventExit, true);
      return () => document.removeEventListener("keydown", preventExit, true);
    }
  }, [isLocked, isFullscreen]);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isFullscreen) setShowControls(false);
    }, 5000);
  }, [isFullscreen]);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [resetControlsTimeout]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // רענון נתונים כל 3 דקות — בלי reload, שומר מסך מלא ונעילה
  useEffect(() => {
    const pollInterval = setInterval(
      async () => {
        const { data: settingsData } = await supabase
          .from("app_settings")
          .select("key, value")
          .in("key", [
            "display_lock_code",
            "show_memorial_on_display",
            "memorial_show_week_before",
            "show_finance_on_display",
            "display_background_url",
            "show_heichal_on_display",
            "display_slide_order",
            "display_slide_durations",
          ]);
        if (settingsData) {
          for (const setting of settingsData) {
            if (setting.key === "display_lock_code" && setting.value) setUnlockCode(setting.value);
            if (setting.key === "show_memorial_on_display") setShowMemorial(setting.value !== "false");
            if (setting.key === "memorial_show_week_before") setShowWeekBefore(setting.value === "true");
            if (setting.key === "show_finance_on_display") setShowFinance(setting.value === "true");
            if (setting.key === "display_background_url") setDisplayBgUrl(setting.value || null);
            if (setting.key === "show_heichal_on_display") setShowHeichal(setting.value === "true");
            if (setting.key === "display_slide_order" && setting.value) {
              try {
                setSlideOrder(JSON.parse(setting.value));
              } catch {}
            }
            if (setting.key === "display_slide_durations" && setting.value) {
              try {
                setSlideDurations((prev) => ({ ...prev, ...JSON.parse(setting.value) }));
              } catch {}
            }
          }
        }
        const { data: adsData, error: adsError } = await supabase
          .from("scheduled_announcements")
          .select("*")
          .eq("is_active", true)
          .order("priority", { ascending: false });
        if (!adsError && adsData) setAnnouncements(adsData as ScheduledAnnouncement[]);
      },
      3 * 60 * 1000,
    );
    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    const checkInterval = setInterval(() => setDayType(getCurrentDayType()), 30000);
    return () => clearInterval(checkInterval);
  }, []);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data, error } = await supabase
        .from("scheduled_announcements")
        .select("*")
        .eq("is_active", true)
        .order("priority", { ascending: false });
      if (!error && data) setAnnouncements(data as ScheduledAnnouncement[]);
    };
    fetchAnnouncements();
    const channel = supabase
      .channel("scheduled-announcements-display")
      .on("postgres_changes", { event: "*", schema: "public", table: "scheduled_announcements" }, () =>
        fetchAnnouncements(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // מחושב כל דקה — לא תלוי ב-currentTime (שמשתנה כל שניה)
  const [timeKey, setTimeKey] = useState(() => Math.floor(Date.now() / 60000));
  useEffect(() => {
    const t = setInterval(() => setTimeKey(Math.floor(Date.now() / 60000)), 30000);
    return () => clearInterval(t);
  }, []);

  const validAnnouncements = useMemo(() => {
    return announcements.filter((a) => a.day_types.includes(dayType) && isTimeInRange(a.start_time, a.end_time));
  }, [announcements, dayType, timeKey]);

  // בניית רשימת סליידים מסודרת לפי slideOrder
  type Slide =
    | { type: "heichal" }
    | { type: "memorial" }
    | { type: "zmanim" }
    | { type: "finance" }
    | { type: "announcement"; announcement: ScheduledAnnouncement };

  const orderedSlides = useMemo<Slide[]>(() => {
    const result: Slide[] = [];
    for (const id of slideOrder) {
      if (id === "heichal" && showHeichal) {
        result.push({ type: "heichal" });
      } else if (id === "memorial" && showMemorial && memorialPeople.length > 0) {
        result.push({ type: "memorial" });
      } else if (id === "zmanim") {
        result.push({ type: "zmanim" });
      } else if (id === "finance" && showFinance) {
        result.push({ type: "finance" });
      } else if (id === "announcements") {
        for (const a of validAnnouncements) {
          result.push({ type: "announcement", announcement: a });
        }
      }
    }
    return result;
  }, [slideOrder, showHeichal, showMemorial, memorialPeople, showFinance, validAnnouncements]);

  const totalSlides = orderedSlides.length;

  useEffect(() => {
    if (totalSlides <= 1) return;
    const slideId = orderedSlides[currentIndex];
    let ms = 10000;
    if (slideId) {
      if (slideId.type === "announcement") {
        const dur = (slideId.announcement as ScheduledAnnouncement & { duration_seconds?: number }).duration_seconds;
        ms = (dur ?? slideDurations["announcements"] ?? 10) * 1000;
      } else {
        ms = (slideDurations[slideId.type] ?? 10) * 1000;
      }
    }
    const t = setTimeout(() => setCurrentIndex((prev) => (prev + 1) % totalSlides), ms);
    return () => clearTimeout(t);
  }, [totalSlides, currentIndex, slideDurations, orderedSlides]);

  useEffect(() => {
    if (currentIndex >= totalSlides) setCurrentIndex(0);
  }, [totalSlides, currentIndex]);

  const currentSlide = orderedSlides[currentIndex] ?? null;
  const currentSlideType = currentSlide?.type ?? "announcement";
  const currentAnnouncement = currentSlide?.type === "announcement" ? currentSlide.announcement : null;
  const isPrayerAd = currentAnnouncement ? isPrayerTimesAnnouncement(currentAnnouncement.title) : false;

  const styleConfig =
    currentSlideType === "memorial"
      ? STYLE_CONFIGS.modern_dark
      : currentSlideType === "zmanim"
        ? STYLE_CONFIGS.modern_dark
        : currentSlideType === "heichal"
          ? STYLE_CONFIGS.modern_dark
          : currentSlideType === "finance"
            ? STYLE_CONFIGS.modern_dark
            : isPrayerAd
              ? STYLE_CONFIGS.royal_blue
              : currentAnnouncement
                ? STYLE_CONFIGS[currentAnnouncement.style]
                : STYLE_CONFIGS.traditional_gold;

  const timeString = currentTime.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const hebrewDate = getHebrewDate();
  const mashivHaruach = getMashivHaruach(currentTime);
  const birkatHashanim = getBirkatHashanim(currentTime);
  const roshChodesh = getRoshChodesh(currentTime);
  const erevRoshChodesh = getErevRoshChodesh(currentTime);
  const todayHoliday = getTodayHolidayHebrew();
  const sefiratHaOmer = getSefiratHaOmer(currentTime);
  const parasha = getCurrentParasha();

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 flex flex-col overflow-hidden ${!displayBgUrl ? styleConfig.bg : ""}`}
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
        paddingBottom: "env(safe-area-inset-bottom)",
        ...(displayBgUrl
          ? {
              backgroundImage: `url(${displayBgUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }
          : {}),
      }}
      dir="rtl"
      onMouseMove={resetControlsTimeout}
      onTouchStart={resetControlsTimeout}
    >
      {displayBgUrl && <div className="absolute inset-0 bg-black/50 z-0" />}

      {/* Fullscreen Controls */}
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
                  className={`p-3 rounded-full backdrop-blur-sm transition-colors ${isLocked ? "bg-red-500/50 hover:bg-red-500/70" : "bg-black/20 hover:bg-black/30"} ${styleConfig.text}`}
                  title={isLocked ? "בטל נעילה" : "נעל מסך"}
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

      {/* PIN Dialog */}
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
              <h3 className="text-xl font-bold text-center mb-6 text-slate-900">הזן קוד לביטול נעילה</h3>
              <div className="flex justify-center mb-4">
                <InputOTP maxLength={4} value={pinValue} onChange={setPinValue} onComplete={handlePinComplete}>
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
              <p className="text-slate-500 text-center text-sm mt-4">לחץ מחוץ לחלון לביטול</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <header className="shrink-0 z-10 relative">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-md border-b border-white/10" />
        <div className="relative flex items-center justify-between px-[3vw] py-[1.5vh]" dir="rtl">
          {/* תאריך — ימין */}
          <div className="text-right">
            <div
              className="font-bold text-white"
              style={{
                fontSize: "clamp(24px, 4.5vh, 56px)",
                textShadow: "0 2px 12px rgba(0,0,0,0.9)",
                lineHeight: 1.1,
              }}
            >
              {hebrewDate}
            </div>
            <div
              className="text-white/85"
              style={{ fontSize: "clamp(13px, 2vh, 24px)", textShadow: "0 1px 8px rgba(0,0,0,0.9)", marginTop: "2px" }}
            >
              {currentTime.toLocaleDateString("he-IL", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
          {/* קו מפריד */}
          <div
            style={{
              width: "2px",
              height: "clamp(40px, 6vh, 72px)",
              background:
                "linear-gradient(to bottom, transparent, rgba(255,255,255,0.5) 30%, rgba(255,255,255,0.5) 70%, transparent)",
              borderRadius: "2px",
              flexShrink: 0,
              margin: "0 clamp(8px, 2vw, 24px)",
            }}
          />
          {/* שעה — שמאל */}
          <div dir="ltr">
            <div
              className="font-bold tabular-nums leading-none text-white"
              style={{
                fontSize: "clamp(44px, 9vh, 100px)",
                textShadow: "0 2px 24px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.4)",
                letterSpacing: "-0.02em",
              }}
            >
              {timeString}
            </div>
          </div>
        </div>
        <div className="relative flex flex-wrap items-center justify-center gap-x-[2vw] gap-y-[0.5vh] px-[2vw] pb-[1.2vh]">
          {[
            { icon: mashivHaruach.isGeshem ? "🌧️" : "💧", text: mashivHaruach.text },
            { icon: birkatHashanim.isTalUmatar ? "🌾" : "☀️", text: birkatHashanim.text },
            roshChodesh ? { icon: "🌙", text: roshChodesh } : null,
            !roshChodesh && erevRoshChodesh ? { icon: "🌑", text: erevRoshChodesh } : null,
            todayHoliday ? { icon: "⭐", text: todayHoliday } : null,
            sefiratHaOmer ? { icon: "🌾", text: sefiratHaOmer } : null,
            parasha ? { icon: "📖", text: `פרשת ${parasha}` } : null,
          ]
            .filter(Boolean)
            .map((item, i) => (
              <span
                key={i}
                className="flex items-center gap-[0.5vw] bg-black/30 backdrop-blur-sm rounded-full text-white/90 border border-white/10"
                style={{
                  fontSize: "clamp(13px, 2vh, 22px)",
                  padding: "clamp(4px, 0.6vh, 8px) clamp(10px, 1.5vw, 20px)",
                  textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                }}
              >
                {item!.icon} {item!.text}
              </span>
            ))}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex items-center justify-center overflow-hidden relative z-10 h-full">
        <AnimatePresence mode="wait">
          {totalSlides === 0 ? (
            <motion.div
              key="no-announcements"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center p-[4vw]"
            >
              <div
                className="text-[4vh] text-white bg-black/40 backdrop-blur-sm rounded-2xl px-[4vw] py-[3vh] border border-white/10"
                style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}
              >
                אין הודעות להצגה כרגע
              </div>
            </motion.div>
          ) : currentSlideType === "heichal" ? (
            <HeichalDisplaySlide key="heichal" />
          ) : currentSlideType === "memorial" ? (
            <div
              key="memorial"
              style={{
                width: "100%",
                height: "100%",
                maxHeight: "100%",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <MemorialDisplaySlide
                people={memorialPeople}
                textClass={styleConfig.text}
                accentClass={styleConfig.accent}
              />
            </div>
          ) : currentSlideType === "zmanim" ? (
            <ZmanimDisplaySlide key="zmanim" />
          ) : currentSlideType === "finance" ? (
            <FinanceDisplaySlide key="finance" textClass={styleConfig.text} accentClass={styleConfig.accent} />
          ) : currentAnnouncement ? (
            isPrayerTimesAnnouncement(currentAnnouncement.title) ? (
              (() => {
                try {
                  JSON.parse(currentAnnouncement.content);
                  return (
                    <PrayerTimesSlide
                      key={currentAnnouncement.id}
                      content={currentAnnouncement.content}
                      isShabbat={getPrayerIsShabbat(currentAnnouncement.title, dayType)}
                    />
                  );
                } catch {
                  return (
                    <motion.div
                      key={currentAnnouncement.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                      className="text-center max-w-[85vw] flex flex-col items-center p-[4vw]"
                    >
                      <h1
                        className="text-[6vh] md:text-[8vh] font-bold mb-[2vh] leading-tight text-white"
                        style={{ textShadow: "0 3px 20px rgba(0,0,0,0.9)" }}
                      >
                        {currentAnnouncement.title}
                      </h1>
                      <p
                        className="text-[3vh] md:text-[4vh] leading-relaxed text-white/85 whitespace-pre-line"
                        style={{ textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}
                      >
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
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="absolute inset-0 flex items-center justify-center p-[2vh]"
              >
                <img
                  src={currentAnnouncement.image_url}
                  alt={currentAnnouncement.title}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                />
              </motion.div>
            ) : (
              <motion.div
                key={currentAnnouncement.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="text-center max-w-[85vw] flex flex-col items-center p-[4vw]"
              >
                {/* רקע קלף לתוכן הודעה */}
                <div
                  className="rounded-3xl px-[5vw] py-[4vh] shadow-2xl"
                  style={{
                    background: "rgba(245, 230, 190, 0.50)",
                    backdropFilter: "blur(10px)",
                    border: "1.5px solid rgba(160, 110, 40, 0.5)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.6)",
                  }}
                >
                  <h1
                    className="text-[6vh] md:text-[8vh] font-bold mb-[2vh] leading-tight text-amber-950"
                    style={{ textShadow: "0 2px 8px rgba(160,100,0,0.3)" }}
                  >
                    {currentAnnouncement.title}
                  </h1>
                  <p
                    className="text-[3vh] md:text-[4vh] leading-relaxed text-amber-800 whitespace-pre-line"
                    style={{ textShadow: "0 1px 4px rgba(160,100,0,0.2)" }}
                  >
                    {currentAnnouncement.content}
                  </p>
                </div>
              </motion.div>
            )
          ) : null}
        </AnimatePresence>
      </main>

      {/* FOOTER */}
      {totalSlides > 1 && (
        <footer className="shrink-0 flex items-center justify-center gap-3 py-[1.5vh] z-10 relative">
          {Array.from({ length: totalSlides }).map((_, idx) => (
            <div
              key={idx}
              className={`rounded-full transition-all duration-500 ${idx === currentIndex ? "w-[3vh] h-[1.5vh] bg-white shadow-lg" : "w-[1.5vh] h-[1.5vh] bg-white/30"}`}
            />
          ))}
        </footer>
      )}
    </div>
  );
}
