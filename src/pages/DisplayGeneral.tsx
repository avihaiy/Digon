import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { HDate } from '@hebcal/core';
import { 
  getHebrewDate, getCurrentParasha, getNextShabbat, ALIYA_TYPES, formatCurrency,
  getShabbatTimes, formatTimeOnly, ISRAEL_LOCATIONS 
} from '@/lib/hebrew-utils';
import { Clock, Star, Flame, Sun, Moon, Sunset, CandlestickChart } from 'lucide-react';

interface PrayerTime {
  id: string;
  name: string;
  time: string;
  day_type: string;
  is_active: boolean;
}

interface Aliya {
  id: string;
  aliya_type: string;
  member_id: string | null;
  price: number;
  status: string;
  members?: { full_name: string } | null;
}

interface Announcement {
  id: string;
  content: string;
  priority: number;
}

export default function DisplayGeneral() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedLocation, setSelectedLocation] = useState('jerusalem');
  const today = new Date();
  const isFriday = today.getDay() === 5;
  const isShabbat = today.getDay() === 6;
  const isShabbatMode = isFriday || isShabbat;

  // Calculate Shabbat times
  const shabbatTimes = useMemo(() => {
    return getShabbatTimes(selectedLocation, currentTime);
  }, [selectedLocation, currentTime.toDateString()]);

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch prayer times
  const { data: prayerTimes = [] } = useQuery({
    queryKey: ['prayer-times-display', isShabbatMode ? 'shabbat' : 'weekday'],
    queryFn: async () => {
      const { data } = await supabase
        .from('prayer_times')
        .select('*')
        .eq('is_active', true)
        .in('day_type', isShabbatMode ? ['shabbat'] : ['weekday'])
        .order('time');
      return data || [];
    },
  });

  // Fetch aliyot for next Shabbat
  const nextShabbat = getNextShabbat();
  const { data: aliyot = [] } = useQuery({
    queryKey: ['aliyot-display', nextShabbat.toISOString().split('T')[0]],
    queryFn: async () => {
      const { data } = await supabase
        .from('aliyot')
        .select('*, members(full_name)')
        .eq('shabbat_date', nextShabbat.toISOString().split('T')[0])
        .order('created_at');
      return data || [];
    },
  });

  // Fetch announcements
  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements-display', isShabbatMode],
    queryFn: async () => {
      let query = supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });
      
      if (!isShabbatMode) {
        query = query.eq('show_on_shabbat', false);
      }
      
      const { data } = await query;
      return data || [];
    },
  });

  // Real-time subscriptions
  useEffect(() => {
    const channels = [
      supabase.channel('prayer-times-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'prayer_times' }, () => {})
        .subscribe(),
      supabase.channel('aliyot-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'aliyot' }, () => {})
        .subscribe(),
      supabase.channel('announcements-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {})
        .subscribe(),
    ];
    
    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, []);

  const getPrayerIcon = (name: string) => {
    if (name.includes('שחרית')) return <Sun className="w-8 h-8 text-yellow-400" />;
    if (name.includes('מנחה')) return <Sunset className="w-8 h-8 text-orange-400" />;
    if (name.includes('ערבית')) return <Moon className="w-8 h-8 text-blue-300" />;
    return <Clock className="w-8 h-8" />;
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5);
  };

  // Find next prayer
  const currentTimeStr = currentTime.toTimeString().slice(0, 5);
  const nextPrayer = prayerTimes.find((p: PrayerTime) => p.time.slice(0, 5) > currentTimeStr);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-6 overflow-hidden" dir="rtl">
      {/* Header - Clock & Date */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="text-8xl font-bold tracking-wider mb-4 bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent">
          {currentTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="text-3xl text-blue-200 mb-2">
          {getHebrewDate(currentTime)}
        </div>
        <div className="text-xl text-gray-400">
          {currentTime.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Star className="w-8 h-8 text-amber-400" />
          <span className="text-4xl font-bold text-amber-300">פרשת {getCurrentParasha()}</span>
          <Star className="w-8 h-8 text-amber-400" />
        </div>
        {isShabbatMode && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="mt-4 inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-amber-500/30 to-orange-500/30 rounded-full border border-amber-400/50"
          >
            <Flame className="w-6 h-6 text-orange-400 animate-pulse" />
            <span className="text-xl text-amber-200">מצב שבת</span>
            <Flame className="w-6 h-6 text-orange-400 animate-pulse" />
          </motion.div>
        )}

        {/* Shabbat Times Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 flex items-center justify-center gap-8 px-8 py-4 bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-purple-900/40 rounded-2xl border border-purple-500/30"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/30 flex items-center justify-center">
              <Flame className="w-6 h-6 text-orange-400" />
            </div>
            <div className="text-right">
              <div className="text-sm text-purple-300">הדלקת נרות</div>
              <div className="text-2xl font-bold text-orange-300">{formatTimeOnly(shabbatTimes.candleLighting)}</div>
            </div>
          </div>
          
          <div className="h-12 w-px bg-purple-500/30" />
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/30 flex items-center justify-center">
              <Sunset className="w-6 h-6 text-amber-400" />
            </div>
            <div className="text-right">
              <div className="text-sm text-purple-300">כניסת שבת</div>
              <div className="text-2xl font-bold text-amber-300">{formatTimeOnly(shabbatTimes.shabbatStart)}</div>
            </div>
          </div>
          
          <div className="h-12 w-px bg-purple-500/30" />
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/30 flex items-center justify-center">
              <Star className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-right">
              <div className="text-sm text-purple-300">צאת שבת / הבדלה</div>
              <div className="text-2xl font-bold text-blue-300">{formatTimeOnly(shabbatTimes.havdalah)}</div>
            </div>
          </div>
          
          <div className="h-12 w-px bg-purple-500/30" />
          
          <div className="text-center">
            <div className="text-sm text-purple-300">מיקום</div>
            <div className="text-lg font-medium text-purple-200">
              {ISRAEL_LOCATIONS[selectedLocation]?.name || 'ירושלים'}
            </div>
          </div>
        </motion.div>
      </motion.header>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-320px)]">
        {/* Prayer Times - Right Panel */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="col-span-4 bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
        >
          <h2 className="text-3xl font-bold text-center mb-6 text-blue-200">זמני תפילות</h2>
          <div className="space-y-4">
            {prayerTimes.map((prayer: PrayerTime, index: number) => (
              <motion.div
                key={prayer.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center justify-between p-4 rounded-xl ${
                  nextPrayer?.id === prayer.id 
                    ? 'bg-gradient-to-r from-amber-500/30 to-orange-500/30 border-2 border-amber-400 animate-pulse' 
                    : 'bg-white/5'
                }`}
              >
                <div className="flex items-center gap-4">
                  {getPrayerIcon(prayer.name)}
                  <span className="text-2xl font-semibold">{prayer.name}</span>
                </div>
                <span className="text-3xl font-bold text-amber-300">
                  {formatTime(prayer.time)}
                </span>
              </motion.div>
            ))}
            {prayerTimes.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                אין זמני תפילות מוגדרים
              </div>
            )}
          </div>
        </motion.div>

        {/* Aliyot Table - Left Panel */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="col-span-8 bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
        >
          <h2 className="text-3xl font-bold text-center mb-6 text-blue-200">
            עליות לתורה - שבת {nextShabbat.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {aliyot.map((aliya: Aliya, index: number) => (
              <motion.div
                key={aliya.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 bg-white/5 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <span className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-lg font-bold">
                    {ALIYA_TYPES[aliya.aliya_type as keyof typeof ALIYA_TYPES]?.charAt(0) || '?'}
                  </span>
                  <div>
                    <div className="text-xl font-semibold text-amber-200">
                      {ALIYA_TYPES[aliya.aliya_type as keyof typeof ALIYA_TYPES] || aliya.aliya_type}
                    </div>
                    <div className="text-lg text-gray-300">
                      {aliya.members?.full_name || 'פתוח'}
                    </div>
                  </div>
                </div>
                <div className="text-lg text-green-400">
                  {formatCurrency(aliya.price)}
                </div>
              </motion.div>
            ))}
            {aliyot.length === 0 && (
              <div className="col-span-2 text-center text-gray-400 py-12">
                לא נקבעו עליות לשבת הקרובה
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Scrolling Ticker Footer */}
      <motion.footer 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-blue-900/90 via-slate-900/90 to-blue-900/90 backdrop-blur-sm py-4 border-t border-white/10"
      >
        <div className="overflow-hidden">
          <motion.div
            animate={{ x: ['100%', '-100%'] }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            className="whitespace-nowrap"
          >
            {announcements.length > 0 ? (
              announcements.map((ann: Announcement, i: number) => (
                <span key={ann.id} className="inline-flex items-center mx-12">
                  <Star className="w-5 h-5 text-amber-400 mx-2" />
                  <span className="text-2xl">{ann.content}</span>
                </span>
              ))
            ) : (
              <span className="text-2xl text-gray-400">
                <Star className="w-5 h-5 text-amber-400 inline mx-2" />
                ברוכים הבאים לבית הכנסת
                <Star className="w-5 h-5 text-amber-400 inline mx-2" />
              </span>
            )}
          </motion.div>
        </div>
      </motion.footer>
    </div>
  );
}
