import { motion } from 'framer-motion';
import { Flame, Moon, Star, Sun } from 'lucide-react';
import { SpecialTimesData } from '@/lib/holiday-utils';
import { formatTimeOnly } from '@/lib/hebrew-utils';
import { TimeDisplay } from './TimeDisplay';

interface HolidaySectionProps {
  data: SpecialTimesData;
}

export function HolidaySection({ data }: HolidaySectionProps) {
  const { holidays, fastTimes, chanukah } = data;
  
  // Only show if there's something special
  if (holidays.length === 0 && !fastTimes && !chanukah) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border-2 border-purple-300 shadow-lg"
    >
      <h3 className="text-xl font-bold text-center text-purple-800 mb-4 bg-purple-100 py-2 rounded-lg flex items-center justify-center gap-2">
        <Star className="w-5 h-5 text-yellow-500" />
        ימים מיוחדים
      </h3>
      
      <div className="space-y-4">
        {/* Holiday Names */}
        {holidays.map((holiday, idx) => (
          <div 
            key={idx}
            className={`text-center py-2 px-4 rounded-lg ${
              holiday.type === 'major' 
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' 
                : holiday.type === 'fast'
                ? 'bg-gray-100 text-gray-800 border border-gray-300'
                : holiday.type === 'chanukah'
                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                : 'bg-purple-50 text-purple-700'
            }`}
          >
            <span className="text-lg font-bold">{holiday.hebrewName}</span>
          </div>
        ))}
        
        {/* Chanukah Candles */}
        {chanukah && chanukah.time && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-center gap-2 mb-3">
              {Array.from({ length: chanukah.candles }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    opacity: [0.7, 1, 0.7],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity,
                    delay: i * 0.1 
                  }}
                >
                  <Flame className="w-6 h-6 text-orange-500" />
                </motion.div>
              ))}
            </div>
            <div className="text-center">
              <div className="text-sm text-blue-600 mb-1">הדלקת נרות חנוכה</div>
              <TimeDisplay 
                time={formatTimeOnly(chanukah.time)} 
                className="text-2xl text-blue-800"
              />
            </div>
          </div>
        )}
        
        {/* Fast Times */}
        {fastTimes && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-center mb-3">
              <Moon className="w-8 h-8 mx-auto text-gray-600 mb-1" />
              <div className="text-lg font-bold text-gray-800">{fastTimes.fastName}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-1">תחילת הצום</div>
                <TimeDisplay 
                  time={formatTimeOnly(fastTimes.fastStart)} 
                  className="text-xl text-gray-800"
                />
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-1">סוף הצום</div>
                <TimeDisplay 
                  time={formatTimeOnly(fastTimes.fastEnd)} 
                  className="text-xl text-gray-800"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
