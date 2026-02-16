import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

interface MemorialPerson {
  id: string;
  deceased_name: string;
  father_name: string;
  is_male: boolean | null;
  hebrew_date_display: string;
  days_until: number;
}

interface MemorialDisplaySlideProps {
  people: MemorialPerson[];
  textClass?: string;
  accentClass?: string;
}

function CandleIcon({ className = '' }: { className?: string }) {
  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      <motion.div
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.85, 1, 0.85],
        }}
        transition={{ 
          duration: 1.8, 
          repeat: Infinity, 
          ease: 'easeInOut' 
        }}
        className="relative"
      >
        <Flame className="w-[3.5vh] h-[3.5vh] text-amber-400 fill-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.7)]" />
      </motion.div>
      <div className="w-[1vh] h-[4vh] bg-gradient-to-b from-amber-100 to-amber-300 rounded-b-sm shadow-inner" />
      <div className="w-[2vh] h-[0.8vh] bg-gradient-to-b from-slate-400 to-slate-500 rounded-b-md" />
    </div>
  );
}

function getDaysLabel(days: number): string | null {
  if (days === 0) return 'היום';
  if (days === 1) return 'מחר';
  return `בעוד ${days} ימים`;
}

function ParchmentCard({ person, index }: { person: MemorialPerson; index: number }) {
  const daysLabel = getDaysLabel(person.days_until);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15, duration: 0.6 }}
      className="relative"
    >
      {/* Parchment card */}
      <div className="relative bg-gradient-to-br from-amber-50 via-amber-100/90 to-yellow-100 
        border-2 border-amber-700/40 rounded-lg shadow-lg overflow-hidden
        px-[2vw] py-[2vh] min-h-[14vh] flex flex-col items-center justify-center text-center"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 20% 50%, rgba(139, 90, 43, 0.06) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 50%, rgba(139, 90, 43, 0.06) 0%, transparent 60%),
            linear-gradient(to bottom, rgba(210, 180, 140, 0.15), rgba(245, 235, 210, 0.3), rgba(210, 180, 140, 0.15))
          `
        }}
      >
        {/* Inner decorative border */}
        <div className="absolute inset-[0.5vh] border border-amber-600/20 rounded pointer-events-none" />
        
        {/* Candle at top */}
        <CandleIcon className="mb-[0.5vh]" />
        
        {/* Name */}
        <p className="text-[2.8vh] md:text-[3.5vh] font-bold leading-tight text-blue-900 mt-[0.3vh]">
          {person.deceased_name} ז״ל
        </p>
        
        {/* Father's name */}
        <p className="text-[2vh] md:text-[2.5vh] text-blue-800/80 mt-[0.3vh]">
          {person.is_male !== false ? 'בן' : 'בת'} {person.father_name}
        </p>
        
        {/* Hebrew date */}
        <p className="text-[1.6vh] md:text-[1.8vh] text-amber-800/70 mt-[0.5vh]">
          {person.hebrew_date_display}
        </p>

        {/* Days until indicator */}
        {person.days_until > 0 && daysLabel && (
          <p className="text-[1.4vh] md:text-[1.6vh] mt-[0.3vh] text-amber-600 font-semibold">
            {daysLabel}
          </p>
        )}
      </div>
    </motion.div>
  );
}

export default function MemorialDisplaySlide({ people }: MemorialDisplaySlideProps) {
  const gridClass = people.length === 1 
    ? 'flex justify-center' 
    : people.length === 2 
      ? 'grid grid-cols-2 gap-[2vw]' 
      : people.length <= 4 
        ? 'grid grid-cols-2 gap-[2vw]' 
        : people.length <= 6
          ? 'grid grid-cols-3 gap-[1.5vw]'
          : 'grid grid-cols-3 lg:grid-cols-4 gap-[1.5vw]';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
      className="text-center w-full max-w-[92vw] flex flex-col items-center p-[2vw]"
    >
      {/* Title */}
      <div className="mb-[2vh]">
        <h2 className="text-[4vh] md:text-[5vh] font-bold text-white flex items-center justify-center gap-[1vw]">
          <span className="text-[3vh]">🕯️</span>
          <span>אשכבה</span>
          <span className="text-[3vh]">🕯️</span>
        </h2>
        <p className="text-[2vh] md:text-[2.5vh] mt-[0.5vh] text-slate-300">
          לעילוי נשמת
        </p>
      </div>

      {/* Names grid */}
      <div className={`w-full max-w-[80vw] ${gridClass}`}>
        {people.map((person, index) => (
          <ParchmentCard key={person.id} person={person} index={index} />
        ))}
      </div>

      {/* Footer */}
      <p className="text-[2vh] mt-[2vh] text-amber-300/80 font-semibold">
        תהא נשמתם צרורה בצרור החיים
      </p>
    </motion.div>
  );
}
