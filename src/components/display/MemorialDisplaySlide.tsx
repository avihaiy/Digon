import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

interface MemorialPerson {
  id: string;
  deceased_name: string;
  father_name: string;
  is_male: boolean | null;
  hebrew_date_display: string;
}

interface MemorialDisplaySlideProps {
  people: MemorialPerson[];
  textClass: string;
  accentClass: string;
}

function CandleIcon({ className = '' }: { className?: string }) {
  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      {/* Flame */}
      <motion.div
        animate={{ 
          scale: [1, 1.15, 1],
          opacity: [0.9, 1, 0.9],
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity, 
          ease: 'easeInOut' 
        }}
        className="relative"
      >
        <Flame className="w-[4vh] h-[4vh] text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
      </motion.div>
      {/* Candle body */}
      <div className="w-[1.2vh] h-[5vh] bg-gradient-to-b from-amber-100 to-amber-200 rounded-b-sm shadow-inner" />
      {/* Base */}
      <div className="w-[2.5vh] h-[1vh] bg-gradient-to-b from-slate-400 to-slate-500 rounded-b-md" />
    </div>
  );
}

export default function MemorialDisplaySlide({ people, textClass, accentClass }: MemorialDisplaySlideProps) {
  // Determine layout based on number of people
  const gridClass = people.length <= 2 
    ? 'flex flex-col gap-[4vh]' 
    : people.length <= 4 
      ? 'grid grid-cols-2 gap-[3vh]' 
      : 'grid grid-cols-2 lg:grid-cols-3 gap-[2vh]';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
      className="text-center w-full max-w-[90vw] flex flex-col items-center p-[2vw]"
    >
      {/* Title */}
      <div className="mb-[3vh]">
        <h2 className={`text-[4vh] md:text-[5vh] font-bold ${textClass}`}>
          🕯️ אשכבה 🕯️
        </h2>
        <p className={`text-[2vh] md:text-[2.5vh] mt-[1vh] ${accentClass}`}>
          לעילוי נשמת
        </p>
      </div>

      {/* Names grid */}
      <div className={gridClass}>
        {people.map((person, index) => (
          <motion.div
            key={person.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.2, duration: 0.5 }}
            className="flex items-center gap-[2vw] justify-center"
          >
            <CandleIcon />
            <div className="text-center min-w-0">
              <p className={`text-[3vh] md:text-[4vh] font-bold leading-tight ${textClass}`}>
                {person.deceased_name} {person.is_male !== false ? 'בן' : 'בת'} {person.father_name}
              </p>
              <p className={`text-[2vh] md:text-[2.5vh] mt-[0.5vh] ${accentClass}`}>
                {person.hebrew_date_display}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <p className={`text-[2vh] mt-[3vh] ${accentClass} opacity-70`}>
        תהא נשמתם צרורה בצרור החיים
      </p>
    </motion.div>
  );
}
