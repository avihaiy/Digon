import { motion } from 'framer-motion';

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

function AnimatedCandle() {
  return (
    <div className="relative flex flex-col items-center w-[3.5vh]">
      {/* Outer ambient glow */}
      <motion.div
        className="absolute -top-[1.5vh] w-[5vh] h-[5vh] rounded-full blur-xl"
        style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.45) 0%, rgba(245,158,11,0.15) 50%, transparent 100%)' }}
        animate={{
          scale: [1, 1.4, 0.95, 1.25, 1],
          opacity: [0.5, 0.85, 0.4, 0.7, 0.5],
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Inner bright glow */}
      <motion.div
        className="absolute -top-[0.3vh] w-[2.5vh] h-[2.5vh] rounded-full blur-md"
        style={{ background: 'radial-gradient(circle, rgba(254,243,199,0.8) 0%, rgba(251,191,36,0.3) 60%, transparent 100%)' }}
        animate={{
          scale: [1, 1.2, 0.9, 1.15, 1],
          opacity: [0.7, 1, 0.6, 0.9, 0.7],
        }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Flame */}
      <motion.svg
        viewBox="0 0 24 36"
        className="w-[2.5vh] h-[3.5vh] relative z-10"
        animate={{
          scaleX: [1, 0.85, 1.1, 0.9, 1],
          scaleY: [1, 1.1, 0.9, 1.05, 1],
        }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <defs>
          <radialGradient id="flameGrad" cx="50%" cy="60%" r="50%">
            <stop offset="0%" stopColor="#FFF7ED" />
            <stop offset="30%" stopColor="#FDE68A" />
            <stop offset="60%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </radialGradient>
        </defs>
        <path
          d="M12 2 C12 2, 4 14, 4 22 C4 28, 8 32, 12 32 C16 32, 20 28, 20 22 C20 14, 12 2, 12 2Z"
          fill="url(#flameGrad)"
        />
        <path
          d="M12 10 C12 10, 8 18, 8 22 C8 26, 10 28, 12 28 C14 28, 16 26, 16 22 C16 18, 12 10, 12 10Z"
          fill="#FEF3C7"
          opacity="0.7"
        />
      </motion.svg>
      {/* Wick */}
      <div className="w-[0.3vh] h-[0.8vh] bg-gray-700 rounded-b-full -mt-[0.3vh] relative z-10" />
      {/* Candle body */}
      <div className="w-[1.2vh] h-[4vh] bg-gradient-to-b from-amber-100 via-amber-50 to-amber-200 rounded-b-sm shadow-inner relative z-10" />
      {/* Candle base */}
      <div className="w-[1.8vh] h-[0.6vh] bg-gradient-to-b from-slate-400 to-slate-500 rounded-b-md relative z-10" />
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
      initial={{ opacity: 0, y: 40, scale: 0.92, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      transition={{
        delay: index * 0.18,
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="relative"
    >
      <div
        className="relative rounded-lg overflow-hidden shadow-lg
          px-[2vw] py-[2.5vh] min-h-[18vh] h-[18vh]
          flex flex-col items-center justify-center text-center"
        style={{
          background: `
            radial-gradient(ellipse at 30% 20%, rgba(218, 195, 150, 0.25) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, rgba(188, 160, 110, 0.2) 0%, transparent 50%),
            linear-gradient(175deg, #F5ECD7 0%, #EDE3C8 30%, #E8D9B5 60%, #F0E5CC 100%)
          `,
          boxShadow: `
            inset 0 2px 8px rgba(139, 90, 43, 0.15),
            inset 0 -2px 6px rgba(139, 90, 43, 0.1),
            0 4px 20px rgba(0, 0, 0, 0.15)
          `,
          border: '1.5px solid rgba(180, 150, 100, 0.4)',
        }}
      >
        {/* Inner decorative border */}
        <div
          className="absolute inset-[0.6vh] rounded pointer-events-none"
          style={{ border: '1px solid rgba(160, 130, 80, 0.2)' }}
        />

        {/* Top decorative line */}
        <div
          className="absolute top-[1.2vh] left-[8%] right-[8%] h-[1px]"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(160, 130, 80, 0.3), transparent)' }}
        />

        {/* Name */}
        <p
          className="text-[2.8vh] md:text-[3.2vh] font-bold leading-tight"
          style={{ color: '#1a365d', fontFamily: "'Heebo', 'Assistant', sans-serif" }}
        >
          {person.deceased_name} ז״ל
        </p>

        {/* Father's name */}
        <p
          className="text-[1.8vh] md:text-[2.2vh] mt-[0.5vh]"
          style={{ color: '#2a4a7f', fontFamily: "'Heebo', 'Assistant', sans-serif" }}
        >
          {person.is_male !== false ? 'בן' : 'בת'} {person.father_name}
        </p>

        {/* Hebrew date */}
        <p
          className="text-[1.4vh] md:text-[1.6vh] mt-[0.8vh]"
          style={{ color: '#8B6914' }}
        >
          {person.hebrew_date_display}
        </p>

        {/* Days until indicator */}
        {person.days_until > 0 && daysLabel && (
          <p
            className="text-[1.2vh] md:text-[1.4vh] mt-[0.3vh] font-semibold"
            style={{ color: '#92400E' }}
          >
            {daysLabel}
          </p>
        )}

        {/* Candle in bottom-left corner */}
        <div className="absolute bottom-[1vh] left-[1.5vw]">
          <AnimatedCandle />
        </div>

        {/* Bottom decorative line */}
        <div
          className="absolute bottom-[1.2vh] left-[8%] right-[8%] h-[1px]"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(160, 130, 80, 0.3), transparent)' }}
        />
      </div>
    </motion.div>
  );
}

export default function MemorialDisplaySlide({ people }: MemorialDisplaySlideProps) {
  const gridClass =
    people.length === 1
      ? 'flex justify-center'
      : people.length === 2
        ? 'grid grid-cols-1 sm:grid-cols-2 gap-[2vw]'
        : people.length <= 4
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[2vw]'
          : people.length <= 6
            ? 'grid grid-cols-2 lg:grid-cols-3 gap-[1.5vw]'
            : 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[1.5vw]';

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
          <span>אזכרה</span>
          <span className="text-[3vh]">🕯️</span>
        </h2>
        <p className="text-[2vh] md:text-[2.5vh] mt-[0.5vh] text-slate-300">
          לעילוי נשמת
        </p>
      </div>

      {/* Names grid */}
      <div className={`w-full max-w-[85vw] ${gridClass}`}>
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
