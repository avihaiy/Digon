import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame } from 'lucide-react';
import { HEBREW_MONTHS } from '@/lib/hebrew-utils';

interface MemorialName {
  id: string;
  deceased_name: string;
  father_name: string;
  is_male: boolean;
  hebrew_death_day: number;
  hebrew_death_month: number;
}

interface MemorialSectionProps {
  names: MemorialName[];
  cycleInterval?: number;
}

export function MemorialSection({ names, cycleInterval = 8000 }: MemorialSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    if (names.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % names.length);
    }, cycleInterval);
    
    return () => clearInterval(timer);
  }, [names.length, cycleInterval]);

  const currentName = names[currentIndex];

  return (
    <div className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 rounded-xl p-6 border border-amber-900/30 shadow-xl min-h-[280px] flex flex-col">
      <h2 className="text-2xl font-bold text-center text-amber-300 mb-4 border-b border-amber-700/50 pb-3">
        לעילוי נשמת
      </h2>
      
      <div className="flex-1 flex flex-col items-center justify-center">
        {names.length > 0 ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentName?.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              {/* Candle */}
              <motion.div
                className="flex justify-center mb-4"
                animate={{ 
                  filter: ['brightness(1)', 'brightness(1.3)', 'brightness(1)']
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="relative">
                  <Flame className="w-12 h-12 text-amber-500" />
                  <motion.div
                    className="absolute inset-0"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Flame className="w-12 h-12 text-orange-400 blur-sm" />
                  </motion.div>
                </div>
              </motion.div>
              
              <div className="text-2xl font-bold text-amber-200 mb-2">
                {currentName?.deceased_name}
              </div>
              <div className="text-lg text-gray-300">
                {currentName?.is_male ? 'בן' : 'בת'} {currentName?.father_name}
              </div>
              <div className="text-sm text-gray-400 mt-2">
                נלב״ע {currentName?.hebrew_death_day}׳ {HEBREW_MONTHS.find(m => m.value === currentName?.hebrew_death_month)?.label}
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="text-center text-gray-500 py-4">
            אין יארצייט היום
          </div>
        )}
      </div>
      
      {/* Page indicators */}
      {names.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {names.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentIndex ? 'bg-amber-400' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
      )}
      
      <div className="text-center text-amber-500 mt-3 text-lg font-semibold">
        ת.נ.צ.ב.ה
      </div>
    </div>
  );
}
