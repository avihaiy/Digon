import { useState, useEffect, useMemo } from 'react';
import { useDisplayRotation } from '@/hooks/useDisplayRotation';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { HDate } from '@hebcal/core';
import { 
  getHebrewDate, getCurrentParasha, 
  getShabbatTimes, getDailyZmanim, formatTimeOnly, 
  ISRAEL_LOCATIONS, isShabbat, isFriday
} from '@/lib/hebrew-utils';
import { getSpecialTimesData } from '@/lib/holiday-utils';
import { TimeDisplay, PrayerRow, ZmanRow } from '@/components/display/TimeDisplay';
import { MemorialSection } from '@/components/display/MemorialSection';
import { BirkatHashanimSection } from '@/components/display/BirkatHashanimSection';
import { AnnouncementsSection } from '@/components/display/AnnouncementsSection';
import { HolidaySection } from '@/components/display/HolidaySection';

interface PrayerTime {
  id: string;
  name: string;
  time: string;
  day_type: string;
  is_active: boolean;
  notes: string | null;
}

interface Announcement {
  id: string;
  content: string;
  priority: number;
  show_on_shabbat: boolean;
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
  const isShabbatDay = isShabbat(today);
  const isFridayDay = isFriday(today);
  const isShabbatMode = isShabbatDay || isFridayDay;

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

  // Load synagogue name
  const { data: synagogueName } = useQuery({
    queryKey: ['app-settings-synagogue-name'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'synagogue_name')
        .single();
      return data?.value || 'בית הכנסת';
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

  // Get holiday/special times data
  const specialTimesData = useMemo(() => {
    return getSpecialTimesData(selectedLocation, currentTime);
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

  // Filter prayer times by day type
  const weekdayPrayers = prayerTimes.filter((p: PrayerTime) => p.day_type === 'weekday');
  const shabbatPrayers = prayerTimes.filter((p: PrayerTime) => p.day_type === 'shabbat');
  const torahClasses = prayerTimes.filter((p: PrayerTime) => p.day_type === 'torah_class');
  const shabbatTorahClasses = prayerTimes.filter((p: PrayerTime) => p.day_type === 'shabbat_torah_class');

  // Filter announcements for Shabbat
  const displayAnnouncements = isShabbatMode 
    ? announcements.filter((a: Announcement) => a.show_on_shabbat)
    : announcements;

  const hebrewDayName = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'][currentTime.getDay()];

  // Format time for display
  const formatPrayerTime = (time: string) => {
    return time.slice(0, 5);
  };

  const { rotationStyle } = useDisplayRotation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 p-4 overflow-hidden" dir="rtl" style={rotationStyle}>
      {/* Main Container with Decorative Border */}
      <div className="h-full bg-gradient-to-b from-amber-100/80 to-orange-100/60 rounded-2xl border-4 border-amber-700 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <header className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-800 py-4 px-8 flex items-center justify-between">
          {/* Star of David Left */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border-2 border-amber-500 shadow-lg">
            <span className="text-amber-400 text-4xl">✡</span>
          </div>
          
          {/* Synagogue Name */}
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-amber-100 tracking-wide"
            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.4)' }}
          >
            {synagogueName}
          </motion.h1>
          
          {/* Star of David Right */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border-2 border-amber-500 shadow-lg">
            <span className="text-amber-400 text-4xl">✡</span>
          </div>
        </header>

        {/* Date Bar */}
        <div className="bg-amber-100 py-3 px-8 flex items-center justify-between border-b-2 border-amber-600">
          <div className="text-xl font-bold text-amber-900">
            יום {hebrewDayName} | {getHebrewDate(currentTime)}
          </div>
          <div 
            dir="ltr" 
            className="text-4xl font-bold text-slate-800 bg-white/80 px-8 py-2 rounded-xl border-2 border-amber-500 shadow-md tabular-nums"
          >
            {currentTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="text-xl font-bold text-amber-900">
            פרשת {getCurrentParasha()}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-3 gap-4 p-4 h-[calc(100vh-200px)]">
          
          {/* Left Column - Prayer Times */}
          <div className="space-y-4">
            {/* Current Day Prayer Times */}
            <div className="bg-white/90 rounded-xl p-5 border-2 border-amber-600 shadow-lg">
              <h2 className="text-2xl font-bold text-center text-amber-800 mb-3 border-b-2 border-dashed border-amber-400 pb-3">
                זמני תפילה
              </h2>
              
              {/* Weekday or Shabbat based on current day */}
              <h3 className={`text-xl font-bold text-center mb-4 py-2 rounded-lg ${
                isShabbatMode 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {isShabbatMode ? 'שבת' : 'יום חול'}
              </h3>
              
              <div className="space-y-1">
                {(isShabbatMode ? shabbatPrayers : weekdayPrayers).length > 0 ? (
                  (isShabbatMode ? shabbatPrayers : weekdayPrayers).map((prayer: PrayerTime) => (
                    <PrayerRow 
                      key={prayer.id} 
                      name={prayer.name} 
                      time={formatPrayerTime(prayer.time)}
                    />
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    לא הוגדרו זמני תפילה
                  </div>
                )}
              </div>

              {/* Torah Classes */}
              {((isShabbatMode ? shabbatTorahClasses : torahClasses).length > 0) && (
                <div className="mt-4 pt-4 border-t-2 border-dashed border-amber-300">
                  <h4 className="text-lg font-bold text-center text-emerald-700 mb-3 bg-emerald-50 py-1 rounded-lg">
                    שיעורי תורה
                  </h4>
                  {(isShabbatMode ? shabbatTorahClasses : torahClasses).map((cls: PrayerTime) => (
                    <div key={cls.id} className="mb-2">
                      <PrayerRow 
                        name={cls.name} 
                        time={formatPrayerTime(cls.time)}
                      />
                      {cls.notes && (
                        <div className="text-sm text-gray-600 text-center mt-1">
                          {cls.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shabbat Times */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-5 border-2 border-purple-300 shadow-lg">
              <h3 className="text-xl font-bold text-center text-purple-800 mb-4 bg-purple-100 py-2 rounded-lg">
                זמני שבת
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2">
                  <TimeDisplay 
                    time={formatTimeOnly(shabbatTimes.candleLighting)} 
                    className="text-xl text-orange-600"
                  />
                  <span className="font-semibold text-lg">🕯️ הדלקת נרות</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <TimeDisplay 
                    time={formatTimeOnly(shabbatTimes.havdalah)} 
                    className="text-xl text-blue-600"
                  />
                  <span className="font-semibold text-lg">צאת השבת</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <TimeDisplay 
                    time={formatTimeOnly(shabbatTimes.havdalahRT)} 
                    className="text-xl text-purple-600"
                  />
                  <span className="font-semibold text-lg">צאת השבת ר״ת</span>
                </div>
              </div>
            </div>
          </div>

          {/* Center Column - Memorial & Announcements */}
          <div className="space-y-4">
            {/* Memorial Display */}
            <MemorialSection names={todayYahrzeits} />

            {/* Announcements with auto-scroll */}
            <AnnouncementsSection announcements={displayAnnouncements} />
          </div>

          {/* Right Column - Daily Times & Birkat Hashanim */}
          <div className="space-y-4">
            {/* Daily Zmanim */}
            <div className="bg-white/90 rounded-xl p-5 border-2 border-amber-600 shadow-lg">
              <h2 className="text-2xl font-bold text-center text-amber-800 mb-4 border-b-2 border-dashed border-amber-400 pb-3">
                זמני היום
              </h2>
              <div className="space-y-1 text-base">
                <ZmanRow name="עלות השחר" time={formatTimeOnly(dailyZmanim.alotHashachar)} compact />
                <ZmanRow name="נץ החמה" time={formatTimeOnly(dailyZmanim.sunrise)} compact />
                <ZmanRow name="טלית ותפילין" time={formatTimeOnly(dailyZmanim.misheyakir)} compact />
                <div className="border-t border-amber-200 my-2" />
                <ZmanRow name="סוף זמן ק״ש מג״א" time={formatTimeOnly(dailyZmanim.sofZmanShmaMGA)} compact />
                <ZmanRow name="סוף זמן ק״ש גר״א" time={formatTimeOnly(dailyZmanim.sofZmanShmaGRA)} compact />
                <ZmanRow name="סוף זמן תפילה גר״א" time={formatTimeOnly(dailyZmanim.sofZmanTfillaGRA)} compact />
                <div className="border-t border-amber-200 my-2" />
                <ZmanRow name="חצות היום" time={formatTimeOnly(dailyZmanim.chatzot)} compact />
                <ZmanRow name="מנחה גדולה" time={formatTimeOnly(dailyZmanim.minchaGedola)} compact />
                <ZmanRow name="פלג המנחה" time={formatTimeOnly(dailyZmanim.plagHaMincha)} compact />
                <div className="border-t border-amber-200 my-2" />
                <ZmanRow name="שקיעה" time={formatTimeOnly(dailyZmanim.sunset)} compact />
                <ZmanRow name="צאת הכוכבים" time={formatTimeOnly(dailyZmanim.tzeit)} compact />
              </div>
            </div>

            {/* Holiday Section - only shows when relevant */}
            <HolidaySection data={specialTimesData} />

            {/* Birkat Hashanim */}
            <BirkatHashanimSection date={currentTime} />
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-amber-100 py-2 px-8 text-center border-t-2 border-amber-600">
          <div className="text-lg text-amber-800 font-medium">
            📍 {ISRAEL_LOCATIONS[selectedLocation]?.name || 'עכו'}
          </div>
        </footer>
      </div>
    </div>
  );
}
