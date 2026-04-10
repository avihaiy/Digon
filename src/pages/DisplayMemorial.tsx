import { useState, useEffect } from 'react';
import { useDisplayRotation } from '@/hooks/useDisplayRotation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { HDate } from '@hebcal/core';
import { getHebrewDate } from '@/lib/hebrew-utils';
import { Flame } from 'lucide-react';

interface MemorialName {
  id: string;
  deceased_name: string;
  father_name: string;
  is_male: boolean;
}

export default function DisplayMemorial() {
  const [currentGroup, setCurrentGroup] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const NAMES_PER_GROUP = 5;
  const CYCLE_INTERVAL = 10000; // 10 seconds

  // Get today's Hebrew date
  const todayHebrew = new HDate(new Date());
  const todayMonth = todayHebrew.getMonth();
  const todayDay = todayHebrew.getDate();

  // Fetch memorial names for today
  const { data: todayNames = [] } = useQuery({
    queryKey: ['memorial-names-today', todayMonth, todayDay],
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

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('memorial-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memorial_names' }, () => {})
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Cycle through name groups
  useEffect(() => {
    if (todayNames.length <= NAMES_PER_GROUP) return;
    
    const timer = setInterval(() => {
      setCurrentGroup(prev => {
        const totalGroups = Math.ceil(todayNames.length / NAMES_PER_GROUP);
        return (prev + 1) % totalGroups;
      });
    }, CYCLE_INTERVAL);
    
    return () => clearInterval(timer);
  }, [todayNames.length]);

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentNames = todayNames.slice(
    currentGroup * NAMES_PER_GROUP,
    (currentGroup + 1) * NAMES_PER_GROUP
  );

  const totalGroups = Math.ceil(todayNames.length / NAMES_PER_GROUP);

  // Flickering candle component
  const FlickeringCandle = () => (
    <motion.div
      animate={{ 
        scale: [1, 1.1, 0.95, 1.05, 1],
        opacity: [0.8, 1, 0.9, 1, 0.85]
      }}
      transition={{ 
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
      className="relative"
    >
      <Flame className="w-10 h-10 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
      <div className="absolute inset-0 bg-amber-400/20 blur-xl rounded-full" />
    </motion.div>
  );

  const { rotationStyle } = useDisplayRotation();

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      dir="rtl"
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 25%, #16213e 50%, #0f0f23 75%, #0a0a0a 100%)',
        ...rotationStyle,
      }}
    >
      {/* Marble texture overlay */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Gold border frame */}
      <div className="absolute inset-4 border-2 border-amber-600/30 rounded-lg pointer-events-none" />
      <div className="absolute inset-6 border border-amber-500/20 rounded-lg pointer-events-none" />

      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pt-12 pb-8 relative z-10"
      >
        <div className="flex justify-center gap-6 mb-6">
          <FlickeringCandle />
          <FlickeringCandle />
        </div>
        
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(251,191,36,0.3)]">
          לזכר נשמות
        </h1>
        
        <div className="text-3xl text-amber-200/80 mb-2">
          {getHebrewDate(currentTime)}
        </div>
        
        <div className="h-0.5 w-48 mx-auto bg-gradient-to-r from-transparent via-amber-500/50 to-transparent mt-4" />
      </motion.header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-12 py-8 relative z-10">
        <AnimatePresence mode="wait">
          {todayNames.length > 0 ? (
            <motion.div
              key={currentGroup}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
              className="space-y-8 w-full max-w-4xl"
            >
              {currentNames.map((name: MemorialName, index: number) => (
                <motion.div
                  key={name.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.2, duration: 0.8 }}
                  className="flex items-center justify-center gap-6 py-6"
                >
                  <FlickeringCandle />
                  
                  <div className="text-center">
                    <div className="text-4xl font-bold text-amber-100 tracking-wide mb-2">
                      {name.deceased_name}
                    </div>
                    <div className="text-2xl text-amber-300/70">
                      {name.is_male ? 'בן' : 'בת'} {name.father_name}
                    </div>
                  </div>
                  
                  <FlickeringCandle />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <FlickeringCandle />
              <div className="text-4xl font-bold text-amber-200/80 mt-8 mb-4">
                זכר צדיק לברכה
              </div>
              <div className="text-2xl text-amber-300/50">
                לזכר קדושי הקהילה
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Page indicator */}
      {totalGroups > 1 && (
        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3">
          {Array.from({ length: totalGroups }).map((_, i) => (
            <motion.div
              key={i}
              className={`w-3 h-3 rounded-full ${
                i === currentGroup ? 'bg-amber-400' : 'bg-amber-800/50'
              }`}
              animate={i === currentGroup ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
            />
          ))}
        </div>
      )}

      {/* Footer ornament */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-amber-600/30 to-transparent" />
    </div>
  );
}
