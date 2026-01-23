import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { HDate } from '@hebcal/core';
import { format, startOfMonth, subMonths, endOfMonth } from 'date-fns';
import { he } from 'date-fns/locale';
import { 
  getHebrewDate, getCurrentParasha, getHebrewDayOfWeek,
  getShabbatTimes, getDailyZmanim, formatTimeOnly, formatCurrency,
  ISRAEL_LOCATIONS, isShabbat, isFriday
} from '@/lib/hebrew-utils';
import { getSpecialTimesData } from '@/lib/holiday-utils';
import { 
  Flame, TrendingUp, TrendingDown, Wallet, Monitor, 
  ChevronLeft, ChevronRight, Pause, Play
} from 'lucide-react';
import vitrageLeft from '@/assets/vitrage-left.png';
import vitrageRight from '@/assets/vitrage-right.png';

type ScreenType = 'general' | 'memorial' | 'finance';

interface ScreenConfig {
  id: ScreenType;
  name: string;
  duration: number; // seconds
}

const SCREENS: ScreenConfig[] = [
  { id: 'general', name: 'לוח כללי', duration: 30 },
  { id: 'memorial', name: 'אזכרות', duration: 20 },
  { id: 'finance', name: 'מצב כספי', duration: 20 },
];

const DEFAULT_DURATIONS = {
  general: 30,
  memorial: 20,
  finance: 20,
};

const DEFAULT_SCREENS_ENABLED = {
  general: true,
  memorial: true,
  finance: true,
};

export default function DisplayTV() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('general');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPaused, setIsPaused] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('akko');
  const [screenDurations, setScreenDurations] = useState(DEFAULT_DURATIONS);
  const [screensEnabled, setScreensEnabled] = useState(DEFAULT_SCREENS_ENABLED);

  // Load location from settings
  const { data: locationSetting } = useQuery({
    queryKey: ['tv-location'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'display_location')
        .single();
      return data?.value || 'akko';
    },
  });

  // Load TV durations from settings
  const { data: tvDurations } = useQuery({
    queryKey: ['tv-durations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['tv_duration_general', 'tv_duration_memorial', 'tv_duration_finance']);
      
      const result = { ...DEFAULT_DURATIONS };
      data?.forEach(item => {
        if (item.key === 'tv_duration_general') result.general = parseInt(item.value) || 30;
        if (item.key === 'tv_duration_memorial') result.memorial = parseInt(item.value) || 20;
        if (item.key === 'tv_duration_finance') result.finance = parseInt(item.value) || 20;
      });
      return result;
    },
    refetchInterval: 60000,
  });

  // Load TV screens enabled settings
  const { data: tvScreensEnabled } = useQuery({
    queryKey: ['tv-screens-enabled'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['tv_screen_general', 'tv_screen_memorial', 'tv_screen_finance']);
      
      const result = { ...DEFAULT_SCREENS_ENABLED };
      data?.forEach(item => {
        if (item.key === 'tv_screen_general') result.general = item.value === 'true';
        if (item.key === 'tv_screen_memorial') result.memorial = item.value === 'true';
        if (item.key === 'tv_screen_finance') result.finance = item.value === 'true';
      });
      return result;
    },
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (locationSetting) setSelectedLocation(locationSetting);
  }, [locationSetting]);

  useEffect(() => {
    if (tvDurations) setScreenDurations(tvDurations);
  }, [tvDurations]);

  useEffect(() => {
    if (tvScreensEnabled) setScreensEnabled(tvScreensEnabled);
  }, [tvScreensEnabled]);

  // Get enabled screens list
  const enabledScreens = (['general', 'memorial', 'finance'] as ScreenType[]).filter(
    screen => screensEnabled[screen]
  );

  // Ensure current screen is enabled, otherwise switch to first enabled
  useEffect(() => {
    if (enabledScreens.length > 0 && !enabledScreens.includes(currentScreen)) {
      setCurrentScreen(enabledScreens[0]);
    }
  }, [enabledScreens, currentScreen]);

  // Clock update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-rotate screens
  useEffect(() => {
    if (isPaused || enabledScreens.length <= 1) return;
    
    const duration = (screenDurations[currentScreen] || 20) * 1000;
    
    const timer = setTimeout(() => {
      const currentIndex = enabledScreens.indexOf(currentScreen);
      const nextIndex = (currentIndex + 1) % enabledScreens.length;
      setCurrentScreen(enabledScreens[nextIndex]);
    }, duration);
    
    return () => clearTimeout(timer);
  }, [currentScreen, isPaused, screenDurations, enabledScreens]);

  // Hide controls after inactivity
  useEffect(() => {
    if (!showControls) return;
    const timer = setTimeout(() => setShowControls(false), 5000);
    return () => clearTimeout(timer);
  }, [showControls]);

  const goToScreen = useCallback((direction: 'prev' | 'next') => {
    if (enabledScreens.length <= 1) return;
    const currentIndex = enabledScreens.indexOf(currentScreen);
    if (direction === 'next') {
      setCurrentScreen(enabledScreens[(currentIndex + 1) % enabledScreens.length]);
    } else {
      setCurrentScreen(enabledScreens[(currentIndex - 1 + enabledScreens.length) % enabledScreens.length]);
    }
  }, [currentScreen, enabledScreens]);

  const handleMouseMove = () => setShowControls(true);

  return (
    <div 
      className="min-h-screen bg-slate-950 overflow-hidden select-none cursor-none"
      onMouseMove={handleMouseMove}
      onClick={() => setShowControls(true)}
    >
      {/* Stained glass vitrage decorations - left side */}
      <div className="fixed right-0 top-0 h-full w-24 z-30 pointer-events-none">
        <img 
          src={vitrageRight} 
          alt="" 
          className="h-full w-full object-cover opacity-80"
          style={{ filter: 'drop-shadow(-4px 0 20px rgba(251, 191, 36, 0.3))' }}
        />
      </div>
      
      {/* Stained glass vitrage decorations - right side */}
      <div className="fixed left-0 top-0 h-full w-24 z-30 pointer-events-none">
        <img 
          src={vitrageLeft} 
          alt="" 
          className="h-full w-full object-cover opacity-80"
          style={{ filter: 'drop-shadow(4px 0 20px rgba(251, 191, 36, 0.3))' }}
        />
      </div>

      <AnimatePresence mode="wait">
        {currentScreen === 'general' && (
          <GeneralScreen 
            key="general" 
            currentTime={currentTime} 
            location={selectedLocation}
          />
        )}
        {currentScreen === 'memorial' && (
          <MemorialScreen key="memorial" currentTime={currentTime} />
        )}
        {currentScreen === 'finance' && (
          <FinanceScreen key="finance" currentTime={currentTime} />
        )}
      </AnimatePresence>

      {/* Screen indicator dots */}
      {enabledScreens.length > 1 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-50">
          {enabledScreens.map((screenId) => {
            const screen = SCREENS.find(s => s.id === screenId);
            return (
              <button
                key={screenId}
                onClick={() => setCurrentScreen(screenId)}
                className={`w-4 h-4 rounded-full transition-all ${
                  currentScreen === screenId 
                    ? 'bg-amber-400 scale-125' 
                    : 'bg-slate-600 hover:bg-slate-500'
                }`}
                title={screen?.name}
              />
            );
          })}
        </div>
      )}

      {/* Control overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 pointer-events-none"
          >
            {/* Navigation arrows */}
            <button
              onClick={() => goToScreen('prev')}
              className="absolute left-8 top-1/2 -translate-y-1/2 p-4 bg-slate-800/80 rounded-full pointer-events-auto hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-10 h-10 text-white" />
            </button>
            <button
              onClick={() => goToScreen('next')}
              className="absolute right-8 top-1/2 -translate-y-1/2 p-4 bg-slate-800/80 rounded-full pointer-events-auto hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-10 h-10 text-white" />
            </button>

            {/* Play/Pause button */}
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="absolute top-8 right-8 p-3 bg-slate-800/80 rounded-full pointer-events-auto hover:bg-slate-700 transition-colors cursor-pointer"
            >
              {isPaused ? (
                <Play className="w-8 h-8 text-white" />
              ) : (
                <Pause className="w-8 h-8 text-white" />
              )}
            </button>

            {/* Screen name */}
            <div className="absolute top-8 left-8 flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-full">
              <Monitor className="w-6 h-6 text-amber-400" />
              <span className="text-white text-lg font-medium">
                {SCREENS.find(s => s.id === currentScreen)?.name}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ====================== General Screen ======================
function GeneralScreen({ currentTime, location }: { currentTime: Date; location: string }) {
  const isShabbatDay = isShabbat(currentTime);
  const isFridayDay = isFriday(currentTime);
  const isShabbatMode = isShabbatDay || isFridayDay;
  
  const shabbatTimes = getShabbatTimes(location, currentTime);
  const dailyZmanim = getDailyZmanim(location, currentTime);
  const specialTimesData = getSpecialTimesData(location, currentTime);

  const { data: synagogueName } = useQuery({
    queryKey: ['synagogue-name'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'synagogue_name')
        .single();
      return data?.value || 'בית הכנסת';
    },
  });

  const { data: prayerTimes = [] } = useQuery({
    queryKey: ['prayer-times-tv'],
    queryFn: async () => {
      const { data } = await supabase
        .from('prayer_times')
        .select('*')
        .eq('is_active', true)
        .order('time');
      return data || [];
    },
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements-tv'],
    queryFn: async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });
      return data || [];
    },
  });

  const weekdayPrayers = prayerTimes.filter((p: any) => p.day_type === 'weekday');
  const shabbatPrayers = prayerTimes.filter((p: any) => p.day_type === 'shabbat');
  const displayPrayers = isShabbatMode ? shabbatPrayers : weekdayPrayers;
  const filteredAnnouncements = isShabbatMode 
    ? announcements.filter((a: any) => a.show_on_shabbat)
    : announcements;

  const hebrewDayName = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'][currentTime.getDay()];

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 p-6 px-32"
      dir="rtl"
    >
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-800 py-5 px-10 rounded-t-2xl flex items-center justify-between">
        <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center border-2 border-amber-500">
          <span className="text-amber-400 text-5xl">✡</span>
        </div>
        <h1 className="text-5xl font-bold text-amber-100 tracking-wide">
          {synagogueName}
        </h1>
        <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center border-2 border-amber-500">
          <span className="text-amber-400 text-5xl">✡</span>
        </div>
      </header>

      {/* Date Bar */}
      <div className="bg-amber-100 py-4 px-10 flex items-center justify-between border-b-2 border-amber-600">
        <div className="text-2xl font-bold text-amber-900">
          יום {hebrewDayName} | {getHebrewDate(currentTime)}
        </div>
        <div className="text-6xl font-bold text-slate-800 bg-white/80 px-10 py-3 rounded-xl border-2 border-amber-500 tabular-nums">
          {currentTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="text-2xl font-bold text-amber-900">
          פרשת {getCurrentParasha()}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-3 gap-6 p-6 bg-gradient-to-b from-amber-100/80 to-orange-100/60 rounded-b-2xl border-4 border-t-0 border-amber-700">
        {/* Prayer Times */}
        <div className="bg-white/90 rounded-xl p-6 border-2 border-amber-600">
          <h2 className="text-3xl font-bold text-center text-amber-800 mb-4 border-b-2 border-dashed border-amber-400 pb-3">
            זמני תפילה
          </h2>
          <div className="space-y-3">
            {displayPrayers.slice(0, 8).map((prayer: any) => (
              <div key={prayer.id} className="flex justify-between items-center text-2xl py-2 border-b border-amber-200 last:border-0">
                <span className="font-medium text-slate-700">{prayer.name}</span>
                <span className="font-bold text-amber-700 tabular-nums">{prayer.time.slice(0, 5)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Zmanim + Shabbat */}
        <div className="space-y-6">
          <div className="bg-white/90 rounded-xl p-6 border-2 border-amber-600">
            <h2 className="text-3xl font-bold text-center text-amber-800 mb-4">זמני היום</h2>
            <div className="space-y-2 text-xl">
              <ZmanRow name="נץ החמה" time={formatTimeOnly(dailyZmanim.sunrise)} />
              <ZmanRow name="סוף זמן ק״ש" time={formatTimeOnly(dailyZmanim.sofZmanShmaGRA)} />
              <ZmanRow name="חצות" time={formatTimeOnly(dailyZmanim.chatzot)} />
              <ZmanRow name="שקיעה" time={formatTimeOnly(dailyZmanim.sunset)} />
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-xl p-6 border-2 border-purple-300">
            <h3 className="text-2xl font-bold text-center text-purple-800 mb-4">זמני שבת</h3>
            <div className="space-y-3 text-xl">
              <div className="flex justify-between">
                <span className="font-bold text-orange-600 tabular-nums">{formatTimeOnly(shabbatTimes.candleLighting)}</span>
                <span className="text-purple-700">🕯️ הדלקת נרות</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-blue-600 tabular-nums">{formatTimeOnly(shabbatTimes.havdalah)}</span>
                <span className="text-purple-700">צאת השבת</span>
              </div>
            </div>
          </div>
        </div>

        {/* Announcements */}
        <div className="bg-white/90 rounded-xl p-6 border-2 border-amber-600">
          <h2 className="text-3xl font-bold text-center text-amber-800 mb-4 border-b-2 border-dashed border-amber-400 pb-3">
            הודעות
          </h2>
          <div className="space-y-4">
            {filteredAnnouncements.slice(0, 5).map((ann: any) => (
              <div key={ann.id} className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xl text-slate-700">{ann.content}</p>
              </div>
            ))}
            {filteredAnnouncements.length === 0 && (
              <p className="text-center text-slate-500 text-xl py-8">אין הודעות</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ====================== Memorial Screen ======================
function MemorialScreen({ currentTime }: { currentTime: Date }) {
  const [currentGroup, setCurrentGroup] = useState(0);
  const NAMES_PER_GROUP = 4;
  
  const todayHebrew = new HDate(currentTime);
  const todayMonth = todayHebrew.getMonth();
  const todayDay = todayHebrew.getDate();

  const { data: todayNames = [] } = useQuery({
    queryKey: ['memorial-names-tv', todayMonth, todayDay],
    queryFn: async () => {
      const { data } = await supabase
        .from('memorial_names')
        .select('*')
        .eq('is_active', true)
        .eq('hebrew_death_month', todayMonth)
        .eq('hebrew_death_day', todayDay)
        .order('deceased_name');
      return data || [];
    },
  });

  useEffect(() => {
    if (todayNames.length <= NAMES_PER_GROUP) return;
    const timer = setInterval(() => {
      setCurrentGroup(prev => {
        const totalGroups = Math.ceil(todayNames.length / NAMES_PER_GROUP);
        return (prev + 1) % totalGroups;
      });
    }, 8000);
    return () => clearInterval(timer);
  }, [todayNames.length]);

  const currentNames = todayNames.slice(
    currentGroup * NAMES_PER_GROUP,
    (currentGroup + 1) * NAMES_PER_GROUP
  );

  const FlickeringCandle = () => (
    <motion.div
      animate={{ scale: [1, 1.1, 0.95, 1.05, 1], opacity: [0.8, 1, 0.9, 1, 0.85] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <Flame className="w-14 h-14 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]" />
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen relative px-32"
      dir="rtl"
      style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 25%, #16213e 50%, #0f0f23 100%)' }}
    >
      {/* Gold borders */}
      <div className="absolute inset-4 border-2 border-amber-600/30 rounded-lg pointer-events-none" />
      <div className="absolute inset-6 border border-amber-500/20 rounded-lg pointer-events-none" />

      {/* Header */}
      <header className="text-center pt-16 pb-10">
        <div className="flex justify-center gap-8 mb-8">
          <FlickeringCandle />
          <FlickeringCandle />
        </div>
        <h1 className="text-7xl font-bold mb-6 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent">
          לזכר נשמות
        </h1>
        <div className="text-4xl text-amber-200/80">
          {getHebrewDate(currentTime)}
        </div>
        <div className="h-1 w-64 mx-auto bg-gradient-to-r from-transparent via-amber-500/50 to-transparent mt-8" />
      </header>

      {/* Names */}
      <div className="flex-1 flex items-center justify-center px-16 py-8">
        <AnimatePresence mode="wait">
          {todayNames.length > 0 ? (
            <motion.div
              key={currentGroup}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="space-y-10 w-full max-w-5xl"
            >
              {currentNames.map((name: any, index: number) => (
                <motion.div
                  key={name.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.3, duration: 1 }}
                  className="flex items-center justify-center gap-10 py-6"
                >
                  <FlickeringCandle />
                  <div className="text-center">
                    <div className="text-5xl font-bold text-amber-100 tracking-wide mb-3">
                      {name.deceased_name}
                    </div>
                    <div className="text-3xl text-amber-300/70">
                      {name.is_male ? 'בן' : 'בת'} {name.father_name}
                    </div>
                  </div>
                  <FlickeringCandle />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
              <FlickeringCandle />
              <div className="text-5xl font-bold text-amber-200/80 mt-10 mb-6">
                זכר צדיק לברכה
              </div>
              <div className="text-3xl text-amber-300/50">
                לזכר קדושי הקהילה
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ====================== Finance Screen ======================
function FinanceScreen({ currentTime }: { currentTime: Date }) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['finance-stats-tv'],
    queryFn: async () => {
      const now = new Date();
      const startOfCurrentMonth = startOfMonth(now);
      
      const [paymentsRes, expensesRes, budgetRes] = await Promise.all([
        supabase.from('payments').select('amount, created_at').eq('status', 'confirmed'),
        supabase.from('expenses').select('amount, expense_date'),
        supabase.from('budget_transactions').select('amount, transaction_date, type'),
      ]);

      // Last 4 months
      const monthlyData = [];
      for (let i = 3; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(subMonths(now, i));
        
        const income = (paymentsRes.data?.filter(p => {
          const d = new Date(p.created_at);
          return d >= monthStart && d <= monthEnd;
        }).reduce((sum, p) => sum + Number(p.amount), 0) || 0) +
        (budgetRes.data?.filter(b => b.type === 'income' && new Date(b.transaction_date) >= monthStart && new Date(b.transaction_date) <= monthEnd)
          .reduce((sum, b) => sum + Number(b.amount), 0) || 0);
        
        const expenses = (expensesRes.data?.filter(e => {
          const d = new Date(e.expense_date);
          return d >= monthStart && d <= monthEnd;
        }).reduce((sum, e) => sum + Number(e.amount), 0) || 0) +
        (budgetRes.data?.filter(b => b.type === 'expense' && new Date(b.transaction_date) >= monthStart && new Date(b.transaction_date) <= monthEnd)
          .reduce((sum, b) => sum + Number(b.amount), 0) || 0);

        monthlyData.push({
          month: format(monthStart, 'MMMM', { locale: he }),
          isCurrent: i === 0,
          balance: income - expenses,
        });
      }

      const thisMonthIncome = (paymentsRes.data?.filter(p => new Date(p.created_at) >= startOfCurrentMonth)
        .reduce((sum, p) => sum + Number(p.amount), 0) || 0) +
        (budgetRes.data?.filter(b => b.type === 'income' && new Date(b.transaction_date) >= startOfCurrentMonth)
        .reduce((sum, b) => sum + Number(b.amount), 0) || 0);

      const thisMonthExpenses = (expensesRes.data?.filter(e => new Date(e.expense_date) >= startOfCurrentMonth)
        .reduce((sum, e) => sum + Number(e.amount), 0) || 0) +
        (budgetRes.data?.filter(b => b.type === 'expense' && new Date(b.transaction_date) >= startOfCurrentMonth)
        .reduce((sum, b) => sum + Number(b.amount), 0) || 0);

      return {
        thisMonthIncome,
        thisMonthExpenses,
        thisMonthBalance: thisMonthIncome - thisMonthExpenses,
        monthlyData,
      };
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const balance = stats?.thisMonthBalance || 0;
  const statusInfo = balance > 0 
    ? { text: 'החודש בעודף', bg: 'bg-emerald-600/20', border: 'border-emerald-500' }
    : balance < 0 
    ? { text: 'החודש בגירעון', bg: 'bg-red-600/20', border: 'border-red-500' }
    : { text: 'החודש מאוזן', bg: 'bg-blue-600/20', border: 'border-blue-500' };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-10 px-32"
      dir="rtl"
    >
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-700/50 pb-8 mb-10">
        <div>
          <h1 className="text-6xl font-bold tracking-tight mb-4">
            בית הכנסת – מצב כספי
          </h1>
          <p className="text-3xl text-slate-300">
            {getHebrewDate(currentTime)} • יום {getHebrewDayOfWeek(currentTime)}
          </p>
        </div>
        <div className="text-left">
          <div className="text-8xl font-bold font-mono tabular-nums">
            {format(currentTime, 'HH:mm')}
          </div>
        </div>
      </header>

      {/* Big Numbers */}
      <div className="grid grid-cols-3 gap-10 mb-10">
        <div className="bg-emerald-950/40 border-2 border-emerald-500/40 rounded-3xl p-12 text-center">
          <TrendingUp className="w-20 h-20 mx-auto mb-6 text-emerald-400" strokeWidth={2} />
          <p className="text-3xl text-emerald-300/80 mb-4">הכנסות החודש</p>
          <p className="text-8xl font-bold text-emerald-400">
            {isLoading ? '...' : formatCurrency(stats?.thisMonthIncome || 0)}
          </p>
        </div>

        <div className="bg-red-950/40 border-2 border-red-500/40 rounded-3xl p-12 text-center">
          <TrendingDown className="w-20 h-20 mx-auto mb-6 text-red-400" strokeWidth={2} />
          <p className="text-3xl text-red-300/80 mb-4">הוצאות החודש</p>
          <p className="text-8xl font-bold text-red-400">
            {isLoading ? '...' : formatCurrency(stats?.thisMonthExpenses || 0)}
          </p>
        </div>

        <div className={`${balance >= 0 ? 'bg-blue-950/40 border-blue-500/40' : 'bg-orange-950/40 border-orange-500/40'} border-2 rounded-3xl p-12 text-center`}>
          <Wallet className={`w-20 h-20 mx-auto mb-6 ${balance >= 0 ? 'text-blue-400' : 'text-orange-400'}`} strokeWidth={2} />
          <p className={`text-3xl ${balance >= 0 ? 'text-blue-300/80' : 'text-orange-300/80'} mb-4`}>יתרת החודש</p>
          <p className={`text-8xl font-bold ${balance >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
            {isLoading ? '...' : formatCurrency(balance)}
          </p>
        </div>
      </div>

      {/* Status Bar */}
      <div className={`${statusInfo.bg} border ${statusInfo.border} rounded-2xl py-6 mb-10`}>
        <p className="text-5xl font-bold text-center">{statusInfo.text}</p>
      </div>

      {/* Monthly History */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-3xl p-10">
        <h2 className="text-4xl font-bold text-center mb-8">היסטוריה חודשית</h2>
        <div className="grid grid-cols-4 gap-8">
          {stats?.monthlyData?.map((month: any, index: number) => (
            <div 
              key={index}
              className={`text-center p-6 rounded-2xl ${
                month.isCurrent ? 'bg-slate-700/50 border-2 border-slate-500' : 'bg-slate-800/40'
              }`}
            >
              <p className={`text-3xl font-semibold mb-4 ${month.isCurrent ? 'text-white' : 'text-slate-400'}`}>
                {month.month}
              </p>
              <p className={`text-5xl font-bold ${month.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(month.balance)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Helper component
function ZmanRow({ name, time }: { name: string; time: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-amber-200 last:border-0">
      <span className="text-slate-700">{name}</span>
      <span className="font-bold text-amber-700 tabular-nums">{time}</span>
    </div>
  );
}
