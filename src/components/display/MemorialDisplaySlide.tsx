import { motion } from "framer-motion";

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

function AnimatedCandle({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const h = size === "sm" ? "7vh" : size === "lg" ? "14vh" : "10vh";
  return (
    <div className="relative flex flex-col items-center flex-shrink-0" style={{ height: h }}>
      <div className="relative flex flex-col items-center">
        <motion.div
          className="absolute rounded-full blur-lg z-0"
          style={{
            width: "5vh",
            height: "5vh",
            top: "-1.5vh",
            background: "radial-gradient(circle, rgba(251,191,36,0.55) 0%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.4, 0.9, 1.2, 1], opacity: [0.5, 0.8, 0.4, 0.7, 0.5] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.svg
          viewBox="0 0 24 36"
          style={{ width: "2.5vh", height: "3.8vh", position: "relative", zIndex: 10 }}
          animate={{ scaleX: [1, 0.82, 1.1, 0.9, 1], scaleY: [1, 1.1, 0.88, 1.05, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <defs>
            <radialGradient id="fg2" cx="50%" cy="60%" r="50%">
              <stop offset="0%" stopColor="#FFF7ED" />
              <stop offset="35%" stopColor="#FDE68A" />
              <stop offset="65%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </radialGradient>
          </defs>
          <path
            d="M12 2 C12 2, 4 14, 4 22 C4 28, 8 32, 12 32 C16 32, 20 28, 20 22 C20 14, 12 2, 12 2Z"
            fill="url(#fg2)"
          />
          <path
            d="M12 10 C12 10, 8 18, 8 22 C8 26, 10 28, 12 28 C14 28, 16 26, 16 22 C16 18, 12 10, 12 10Z"
            fill="#FEF3C7"
            opacity="0.7"
          />
        </motion.svg>
      </div>
      <div
        style={{
          width: "0.35vh",
          height: "0.7vh",
          background: "#374151",
          borderRadius: "0 0 2px 2px",
          position: "relative",
          zIndex: 10,
        }}
      />
      <div
        style={{
          flex: 1,
          width: "1.6vh",
          borderRadius: "0 0 2px 2px",
          position: "relative",
          zIndex: 10,
          minHeight: "4vh",
          background: "linear-gradient(180deg, #F5E6A3 0%, #D4A843 35%, #C4942E 50%, #D4A843 70%, #F5E6A3 100%)",
          boxShadow: "inset -1px 0 3px rgba(0,0,0,0.15), inset 1px 0 3px rgba(255,255,255,0.3)",
        }}
      />
      <div
        style={{
          width: "2.2vh",
          height: "0.8vh",
          background: "linear-gradient(to bottom, #B45309, #92400E)",
          borderRadius: "0 0 4px 4px",
          position: "relative",
          zIndex: 10,
        }}
      />
    </div>
  );
}

function getDaysLabel(days: number): string | null {
  if (days === 0) return null;
  if (days === 1) return "מחר";
  return `בעוד ${days} ימים`;
}

function MemorialCard({
  person,
  index,
  compact = false,
}: {
  person: MemorialPerson;
  index: number;
  compact?: boolean;
}) {
  const daysLabel = getDaysLabel(person.days_until);
  const isToday = person.days_until === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-stretch"
      style={{ gap: "clamp(6px, 1.2vw, 16px)" }}
    >
      <div className="flex-shrink-0 flex items-center">
        <AnimatedCandle size={compact ? "sm" : "md"} />
      </div>

      <div
        className="flex-1 flex flex-col items-center justify-center text-center rounded-xl overflow-hidden"
        style={{
          padding: compact
            ? "clamp(4px, 0.8vh, 10px) clamp(8px, 1.5vw, 16px)"
            : "clamp(6px, 1.2vh, 14px) clamp(10px, 2vw, 20px)",
          background: isToday
            ? "linear-gradient(135deg, rgba(60,40,10,0.95) 0%, rgba(45,30,5,0.98) 100%)"
            : "linear-gradient(135deg, rgba(35,35,35,0.92) 0%, rgba(25,25,25,0.96) 100%)",
          border: isToday ? "1px solid rgba(212,175,55,0.55)" : "1px solid rgba(160,130,60,0.25)",
          boxShadow: isToday
            ? "0 4px 20px rgba(0,0,0,0.35), 0 0 20px rgba(212,175,55,0.12)"
            : "0 3px 14px rgba(0,0,0,0.28)",
        }}
      >
        <p
          className="font-bold leading-tight"
          style={{
            fontSize: compact ? "clamp(13px, 2.2vh, 22px)" : "clamp(15px, 2.8vh, 30px)",
            color: isToday ? "#FDE68A" : "#FEF3C7",
          }}
        >
          {person.is_male !== false ? "ר'" : "מרת"} {person.deceased_name} ז״ל
        </p>
        <p
          style={{
            fontSize: compact ? "clamp(10px, 1.5vh, 16px)" : "clamp(12px, 1.8vh, 20px)",
            color: "rgba(253,230,138,0.65)",
            marginTop: "2px",
          }}
        >
          {person.is_male !== false ? "בן" : "בת"} ר' {person.father_name}
        </p>
        <p
          style={{
            fontSize: compact ? "clamp(10px, 1.4vh, 15px)" : "clamp(11px, 1.6vh, 18px)",
            color: "#F59E0B",
            fontWeight: 600,
            marginTop: "2px",
          }}
        >
          {person.hebrew_date_display}
        </p>
        {daysLabel && (
          <p style={{ fontSize: "clamp(9px, 1.2vh, 13px)", color: "rgba(245,158,11,0.65)", marginTop: "1px" }}>
            {daysLabel}
          </p>
        )}
      </div>

      <div className="flex-shrink-0 flex items-center">
        <AnimatedCandle size={compact ? "sm" : "md"} />
      </div>
    </motion.div>
  );
}

export default function MemorialDisplaySlide({ people }: MemorialDisplaySlideProps) {
  // זיהוי אוטומטי: אם יש יותר מ-3 אנשים — grid שתי עמודות
  const useGrid = people.length > 3;
  const compact = people.length > 4;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: "easeInOut" }}
      className="w-full h-full flex flex-col items-center"
      style={{ padding: "clamp(6px, 1.5vw, 20px)", gap: "clamp(6px, 1.2vh, 16px)", overflow: "hidden" }}
    >
      {/* כותרת */}
      <div className="text-center flex-shrink-0">
        <h2
          className="font-bold"
          style={{
            fontSize: "clamp(18px, 4vh, 46px)",
            background: "linear-gradient(180deg, #FFD700 0%, #DAA520 45%, #B8860B 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 2px 4px rgba(218,165,32,0.3))",
            lineHeight: 1.1,
          }}
        >
          היכל ה׳ לזכרון עולם
        </h2>
        <p style={{ fontSize: "clamp(11px, 1.7vh, 20px)", color: "rgba(253,230,138,0.55)", marginTop: "2px" }}>
          — לעילוי נשמת כל ישראל —
        </p>
      </div>

      {/* רשימת שמות */}
      <div
        className="w-full flex-1 min-h-0"
        style={{
          display: "grid",
          gridTemplateColumns: useGrid ? "1fr 1fr" : "1fr",
          gap: compact ? "clamp(4px, 0.8vh, 10px)" : "clamp(6px, 1.2vh, 14px)",
          maxWidth: useGrid ? "96vw" : "80vw",
          margin: "0 auto",
          alignContent: "start",
          overflow: "hidden",
        }}
      >
        {people.map((person, index) => (
          <MemorialCard key={person.id} person={person} index={index} compact={compact} />
        ))}
      </div>

      {/* כיתוב תחתון */}
      <p
        className="font-semibold flex-shrink-0"
        style={{ fontSize: "clamp(10px, 1.6vh, 18px)", color: "rgba(245,158,11,0.55)" }}
      >
        תהא נשמתם צרורה בצרור החיים
      </p>
    </motion.div>
  );
}
