import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { HDate } from '@hebcal/core';
import { 
  getHebrewDate, getCurrentParasha, getNextShabbat, ALIYA_TYPES, formatCurrency,
  getShabbatTimes, getDailyZmanim, formatTimeOnly, ISRAEL_LOCATIONS, HEBREW_MONTHS
} from '@/lib/hebrew-utils';

interface PrayerTime {
  id: string;
  name: string;
  time: string;
  day_type: string;
  is_active: boolean;
}

interface Announcement {
  id: string;
  content: string;
  priority: number;
}

interface MemorialName {
  id: string;
  deceased_name: string;
  father_name: string;
  is_male: boolean;
  hebrew_death_day: number;
  hebrew_death_month: number;
}

export default function DisplayGeneral() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedLocation, setSelectedLocation] = useState('akko');
  const today = new Date();
  const isFriday = today.getDay() === 5;
  const isShabbat = today.getDay() === 6;
  const isShabbatMode = isFriday || isShabbat;

  // Load location from app_settings
  const { data: locationSetting } = useQuery({
    queryKey: ['app-settings-location'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'display_location')
        .single();
      return data?.value || 'akko';
    },
  });

  useEffect(() => {
    if (locationSetting) {
      setSelectedLocation(locationSetting);
    }
  }, [locationSetting]);

  // Calculate times
  const shabbatTimes = useMemo(() => {
    return getShabbatTimes(selectedLocation, currentTime);
  }, [selectedLocation, currentTime.toDateString()]);

  const dailyZmanim = useMemo(() => {
    return getDailyZmanim(selectedLocation, currentTime);
  }, [selectedLocation, currentTime.toDateString()]);

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch prayer times
  const { data: prayerTimes = [] } = useQuery({
    queryKey: ['prayer-times-display'],
    queryFn: async () => {
      const { data } = await supabase
        .from('prayer_times')
        .select('*')
        .eq('is_active', true)
        .order('time');
      return data || [];
    },
  });

  // Fetch announcements
  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements-display'],
    queryFn: async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });
      return data || [];
    },
  });

  // Fetch today's yahrzeits
  const { data: todayYahrzeits = [] } = useQuery({
    queryKey: ['yahrzeits-today'],
    queryFn: async () => {
      const hdate = new HDate(new Date());
      const hebrewDay = hdate.getDate();
      const hebrewMonth = hdate.getMonth();
      
      const { data } = await supabase
        .from('memorial_names')
        .select('*')
        .eq('hebrew_death_day', hebrewDay)
        .eq('hebrew_death_month', hebrewMonth)
        .eq('is_active', true);
      return data || [];
    },
  });

  // Real-time subscriptions
  useEffect(() => {
    const channels = [
      supabase.channel('prayer-times-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'prayer_times' }, () => {})
        .subscribe(),
      supabase.channel('announcements-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {})
        .subscribe(),
      supabase.channel('memorial-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'memorial_names' }, () => {})
        .subscribe(),
    ];
    
    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, []);

  const weekdayPrayers = prayerTimes.filter((p: PrayerTime) => p.day_type === 'weekday');
  const shabbatPrayers = prayerTimes.filter((p: PrayerTime) => p.day_type === 'shabbat');

  const hebrewDayName = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'][currentTime.getDay()];

  return (
    <div className="min-h-screen bg-[#d4c8a8] p-3 overflow-hidden" dir="rtl">
      {/* Decorative Frame */}
      <div className="h-full bg-[#c5b896] rounded-lg border-4 border-[#8b7355] shadow-2xl overflow-hidden">
        
        {/* Header */}
        <header className="bg-gradient-to-r from-[#2d5016] via-[#3d6b1e] to-[#2d5016] py-3 px-6 flex items-center justify-between">
          {/* Star of David Left */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center border-2 border-amber-600 shadow-lg">
            <div className="text-amber-400 text-3xl">✡</div>
          </div>
          
          {/* Synagogue Name */}
          <h1 className="text-4xl font-bold text-amber-100 tracking-wider" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
            בית הכנסת
          </h1>
          
          {/* Star of David Right */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center border-2 border-amber-600 shadow-lg">
            <div className="text-amber-400 text-3xl">✡</div>
          </div>
        </header>

        {/* Date Bar */}
        <div className="bg-[#e8dfc4] py-2 px-6 flex items-center justify-between border-b-2 border-[#8b7355]">
          <div className="text-xl font-bold text-[#8b2500]">
            יום {hebrewDayName} {getHebrewDate(currentTime)}
          </div>
          <div className="text-4xl font-bold text-[#2d3748] bg-[#f5f0e1] px-6 py-1 rounded-lg border-2 border-[#8b7355]">
            {currentTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="text-xl font-bold text-[#8b2500]">
            פרשת השבוע {getCurrentParasha()}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-3 gap-3 p-3 h-[calc(100vh-180px)]">
          
          {/* Left Column - Prayer Times */}
          <div className="space-y-3">
            {/* Weekday Prayers */}
            <div className="bg-[#f5f0e1] rounded-xl p-4 border-2 border-[#8b7355] shadow-lg">
              <h2 className="text-2xl font-bold text-center text-[#8b2500] mb-2 border-b-2 border-dashed border-[#8b7355] pb-2">
                זמני תפילה
              </h2>
              <h3 className="text-xl font-bold text-center text-[#c41e3a] mb-3">יום חול</h3>
              <div className="space-y-3">
                {weekdayPrayers.length > 0 ? weekdayPrayers.map((prayer: PrayerTime) => (
                  <div key={prayer.id} className="flex justify-between items-center text-xl">
                    <span className="font-bold text-[#2d3748]">{prayer.time.slice(0, 5).split(':').reverse().join(' : ')}</span>
                    <span className="font-semibold text-[#1a365d]">{prayer.name}</span>
                  </div>
                )) : (
                  <>
                    <div className="flex justify-between items-center text-xl">
                      <span className="font-bold text-[#2d3748]">00 : 07</span>
                      <span className="font-semibold text-[#1a365d]">שחרית</span>
                    </div>
                    <div className="flex justify-between items-center text-xl">
                      <span className="font-bold text-[#2d3748]">00 : 13</span>
                      <span className="font-semibold text-[#1a365d]">מנחה</span>
                    </div>
                    <div className="flex justify-between items-center text-xl">
                      <span className="font-bold text-[#2d3748]">00 : 19</span>
                      <span className="font-semibold text-[#1a365d]">ערבית</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Shabbat Times */}
            <div className="bg-[#fdf6e3] rounded-xl p-4 border-2 border-[#8b7355] shadow-lg">
              <h3 className="text-xl font-bold text-center text-[#1a365d] mb-3 bg-[#d4a574] py-1 rounded-lg">
                שבת ויום טוב
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xl">
                  <span className="font-bold text-[#2d3748]">{formatTimeOnly(shabbatTimes.candleLighting).split(':').join(' : ')}</span>
                  <span className="font-semibold text-[#1a365d]">כניסת השבת</span>
                </div>
                <div className="flex justify-between items-center text-xl">
                  <span className="font-bold text-[#2d3748]">{formatTimeOnly(shabbatTimes.havdalah).split(':').join(' : ')}</span>
                  <span className="font-semibold text-[#1a365d]">צאת השבת</span>
                </div>
                <div className="flex justify-between items-center text-xl">
                  <span className="font-bold text-[#2d3748]">{formatTimeOnly(shabbatTimes.havdalahRT).split(':').join(' : ')}</span>
                  <span className="font-semibold text-[#1a365d]">צאת השבת ר״ת</span>
                </div>
              </div>
            </div>
          </div>

          {/* Center Column - Memorial & Announcements */}
          <div className="space-y-3">
            {/* Memorial Display */}
            <div className="bg-gradient-to-b from-[#1a1a2e] to-[#0d0d1a] rounded-xl p-4 border-2 border-[#4a4a6a] shadow-xl min-h-[250px]">
              <h2 className="text-2xl font-bold text-center text-amber-300 mb-4 border-b border-amber-600 pb-2">
                לעילוי נשמת
              </h2>
              
              {todayYahrzeits.length > 0 ? (
                <AnimatePresence mode="wait">
                  {todayYahrzeits.map((yahrzeit: MemorialName, index: number) => (
                    <motion.div
                      key={yahrzeit.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-white mb-4"
                    >
                      <div className="text-2xl font-bold text-amber-200 mb-2">
                        {yahrzeit.deceased_name}
                      </div>
                      <div className="text-lg text-gray-300">
                        {yahrzeit.is_male ? 'בן' : 'בת'} {yahrzeit.father_name}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        נלב״ע {yahrzeit.hebrew_death_day}׳ {HEBREW_MONTHS.find(m => m.value === yahrzeit.hebrew_death_month)?.label}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              ) : (
                <div className="text-center text-gray-400 py-4">
                  אין יארצייט היום
                </div>
              )}
              
              {/* Candles */}
              <div className="flex justify-center gap-8 mt-4">
                <motion.div
                  animate={{ 
                    opacity: [0.7, 1, 0.7],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-4xl"
                >
                  🕯️
                </motion.div>
                <motion.div
                  animate={{ 
                    opacity: [0.7, 1, 0.7],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  className="text-4xl"
                >
                  🕯️
                </motion.div>
              </div>
              
              <div className="text-center text-amber-400 mt-3 text-lg">
                ת.נ.צ.ב.ה
              </div>
            </div>

            {/* Announcements */}
            <div className="bg-[#f5f0e1] rounded-xl p-4 border-2 border-[#8b7355] shadow-lg flex-1">
              <h2 className="text-2xl font-bold text-center text-[#8b2500] mb-3 bg-[#e8dfc4] py-1 rounded-lg border border-[#8b7355]">
                הודעות
              </h2>
              <div className="space-y-2 text-lg text-center">
                {announcements.length > 0 ? announcements.slice(0, 4).map((ann: Announcement) => (
                  <div key={ann.id} className="text-[#1a365d] py-1 border-b border-dotted border-[#8b7355] last:border-0">
                    {ann.content}
                  </div>
                )) : (
                  <div className="text-gray-500">אין הודעות</div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Daily Times */}
          <div className="space-y-3">
            {/* Daily Zmanim */}
            <div className="bg-[#f5f0e1] rounded-xl p-4 border-2 border-[#8b7355] shadow-lg">
              <h2 className="text-2xl font-bold text-center text-[#8b2500] mb-3 border-b-2 border-dashed border-[#8b7355] pb-2">
                זמני היום
              </h2>
              <div className="space-y-2 text-lg">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#2d3748]">{formatTimeOnly(dailyZmanim.sunrise).split(':').join(' : ')}</span>
                  <span className="font-semibold text-[#1a365d]">נץ החמה</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#2d3748]">{formatTimeOnly(dailyZmanim.sunset).split(':').join(' : ')}</span>
                  <span className="font-semibold text-[#1a365d]">שקיעה</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#2d3748]">{formatTimeOnly(dailyZmanim.alotHashachar).split(':').join(' : ')}</span>
                  <span className="font-semibold text-[#1a365d]">עלות השחר</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#2d3748]">{formatTimeOnly(dailyZmanim.misheyakir).split(':').join(' : ')}</span>
                  <span className="font-semibold text-[#1a365d]">טלית ותפילין</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#2d3748]">{formatTimeOnly(dailyZmanim.sofZmanShmaMGA).split(':').join(' : ')}</span>
                  <span className="font-semibold text-[#1a365d]">קריאת שמע למג״א</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#2d3748]">{formatTimeOnly(dailyZmanim.sofZmanShmaGRA).split(':').join(' : ')}</span>
                  <span className="font-semibold text-[#1a365d]">קריאת שמע לגר״א</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#2d3748]">{formatTimeOnly(dailyZmanim.sofZmanTfillaGRA).split(':').join(' : ')}</span>
                  <span className="font-semibold text-[#1a365d]">זמן תפילה לגר״א</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#2d3748]">{formatTimeOnly(dailyZmanim.chatzot).split(':').join(' : ')}</span>
                  <span className="font-semibold text-[#1a365d]">חצות היום</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#2d3748]">{formatTimeOnly(dailyZmanim.minchaGedola).split(':').join(' : ')}</span>
                  <span className="font-semibold text-[#1a365d]">מנחה גדולה</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#2d3748]">{formatTimeOnly(dailyZmanim.plagHaMincha).split(':').join(' : ')}</span>
                  <span className="font-semibold text-[#1a365d]">פלג המנחה</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#2d3748]">{formatTimeOnly(dailyZmanim.tzeit).split(':').join(' : ')}</span>
                  <span className="font-semibold text-[#1a365d]">צאת הכוכבים</span>
                </div>
              </div>
            </div>

            {/* Birkat Hashanim */}
            <div className="bg-[#fdf6e3] rounded-xl p-4 border-2 border-[#8b7355] shadow-lg">
              <h3 className="text-xl font-bold text-center text-[#c41e3a] mb-3 bg-[#ffe4b5] py-1 rounded-lg">
                ברכת השנים
              </h3>
              <div className="space-y-2 text-lg">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#2d3748]">ברך עלינו</span>
                  <span className="font-semibold text-[#1a365d]">משיב הרוח</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-[#e8dfc4] py-2 px-6 text-center border-t-2 border-[#8b7355]">
          <div className="text-lg text-[#5d4e37]">
            {ISRAEL_LOCATIONS[selectedLocation]?.name || 'עכו'}
          </div>
        </footer>
      </div>
    </div>
  );
}