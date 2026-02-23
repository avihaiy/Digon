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

function AnimatedTallCandle({ height = '100%' }: { height?: string }) {
  return (
    <div className="relative flex flex-col items-center" style={{ height }}>
      {/* Flame container */}
      <div className="relative flex flex-col items-center">
        {/* Outer ambient glow */}
        <motion.div
          className="absolute -top-[2vh] w-[6vh] h-[6vh] rounded-full blur-xl z-0"
          style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.5) 0%, rgba(245,158,11,0.15) 50%, transparent 100%)' }}
          animate={{
            scale: [1, 1.4, 0.95, 1.25, 1],
            opacity: [0.5, 0.85, 0.4, 0.7, 0.5],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Flame */}
        <motion.svg
          viewBox="0 0 24 36"
          className="w-[3vh] h-[4.5vh] relative z-10"
          animate={{
            scaleX: [1, 0.85, 1.1, 0.9, 1],
            scaleY: [1, 1.1, 0.9, 1.05, 1],
          }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <defs>
            <radialGradient id="flameGradTall" cx="50%" cy="60%" r="50%">
              <stop offset="0%" stopColor="#FFF7ED" />
              <stop offset="30%" stopColor="#FDE68A" />
              <stop offset="60%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </radialGradient>
          </defs>
          <path
            d="M12 2 C12 2, 4 14, 4 22 C4 28, 8 32, 12 32 C16 32, 20 28, 20 22 C20 14, 12 2, 12 2Z"
            fill="url(#flameGradTall)"
          />
          <path
            d="M12 10 C12 10, 8 18, 8 22 C8 26, 10 28, 12 28 C14 28, 16 26, 16 22 C16 18, 12 10, 12 10Z"
            fill="#FEF3C7"
            opacity="0.7"
          />
        </motion.svg>
      </div>
      {/* Wick */}
      <div className="w-[0.4vh] h-[0.8vh] bg-gray-700 rounded-b-full relative z-10" />
      {/* Candle body - tall golden candle */}
      <div
        className="flex-1 w-[1.8vh] rounded-b-sm relative z-10"
        style={{
          background: 'linear-gradient(180deg, #F5E6A3 0%, #D4A843 30%, #C4942E 50%, #D4A843 70%, #F5E6A3 100%)',
          boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.15), inset 2px 0 4px rgba(255,255,255,0.3)',
          minHeight: '8vh',
        }}
      />
      {/* Candle base */}
      <div className="w-[2.5vh] h-[1vh] bg-gradient-to-b from-amber-600 to-amber-800 rounded-b-md relative z-10" />
    </div>
  );
}

function getDaysLabel(days: number): string | null {
  if (days === 0) return 'היום';
  if (days === 1) return 'מחר';
  return `בעוד ${days} ימים`;
}

function MemorialCard({ person, index }: { person: MemorialPerson; index: number }) {
  const daysLabel = getDaysLabel(person.days_until);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: index * 0.15,
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="flex items-stretch gap-[1.5vw]"
    >
      {/* Right candle */}
      <div className="flex-shrink-0 py-[1vh]">
        <AnimatedTallCandle />
      </div>

      {/* Card content */}
      <div
        className="flex-1 rounded-xl overflow-hidden px-[2vw] py-[1.5vh] flex flex-col items-center justify-center text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(40,40,40,0.9) 0%, rgba(30,30,30,0.95) 50%, rgba(40,40,40,0.9) 100%)',
          border: '1px solid rgba(180,150,80,0.3)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {/* Name */}
        <p className="text-[2.8vh] md:text-[3.2vh] font-bold leading-tight text-amber-100">
          {person.is_male !== false ? "ר'" : "מרת"} {person.deceased_name} ז״ל
        </p>

        {/* Father's name */}
        <p className="text-[1.8vh] md:text-[2vh] mt-[0.3vh] text-amber-200/70">
          {person.is_male !== false ? "בן" : "בת"} ר' {person.father_name}
        </p>

        {/* Hebrew date */}
        <p className="text-[1.6vh] md:text-[1.8vh] mt-[0.5vh] font-semibold text-amber-400">
          {person.hebrew_date_display}
        </p>

        {/* Days until */}
        {person.days_until > 0 && daysLabel && (
          <p className="text-[1.2vh] md:text-[1.3vh] mt-[0.3vh] text-amber-500/80">
            {daysLabel}
          </p>
        )}
      </div>

      {/* Left candle */}
      <div className="flex-shrink-0 py-[1vh]">
        <AnimatedTallCandle />
      </div>
    </motion.div>
  );
}

export default function MemorialDisplaySlide({ people }: MemorialDisplaySlideProps) {
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
        <h2
          className="text-[4.5vh] md:text-[5.5vh] font-bold"
          style={{
            background: 'linear-gradient(180deg, #FFD700 0%, #DAA520 40%, #B8860B 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 2px 4px rgba(218,165,32,0.3))',
          }}
        >
          היכל ה׳ לזכרון עולם
        </h2>
        <p className="text-[2vh] md:text-[2.5vh] mt-[0.3vh] text-amber-200/60">
          — לעילוי נשמת כל ישראל —
        </p>
        <p className="text-[1.6vh] md:text-[1.8vh] mt-[0.3vh] text-amber-300/40 italic">
          ״וְזָכַרְתִּי אֶת־בְּרִיתִי...״
        </p>
      </div>

      {/* Names list */}
      <div className="w-full max-w-[75vw] space-y-[1.5vh]">
        {people.map((person, index) => (
          <MemorialCard key={person.id} person={person} index={index} />
        ))}
      </div>

      {/* Footer */}
      <p className="text-[1.8vh] mt-[2vh] text-amber-300/60 font-semibold">
        תהא נשמתם צרורה בצרור החיים
      </p>
    </motion.div>
  );
}
