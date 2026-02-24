import { motion } from "framer-motion";
import { useState, useEffect } from "react";

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
    <div className="relative flex flex-col items-center flex-shrink-0" style={{ height: "8vh", width: "3vh" }}>
      <div className="relative flex flex-col items-center">
        <motion.div
          className="absolute rounded-full blur-lg z-0"
          style={{
            width: "4vh",
            height: "4vh",
            top: "-1vh",
            background: "radial-gradient(circle, rgba(251,191,36,0.55) 0%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.4, 0.9, 1.2, 1], opacity: [0.5, 0.8, 0.4, 0.7, 0.5] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.svg
          viewBox="0 0 24 36"
          style={{ width: "2vh", height: "3vh", position: "relative", zIndex: 10 }}
          animate={{ scaleX: [1, 0.82, 1.1, 0.9, 1], scaleY: [1, 1.1, 0.88, 1.05, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <defs>
            <radialGradient id="fg3" cx="50%" cy="60%" r="50%">
              <stop offset="0%" stopColor="#FFF7ED" />
              <stop offset="35%" stopColor="#FDE68A" />
              <stop offset="65%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </radialGradient>
          </defs>
          <path
            d="M12 2 C12 2, 4 14, 4 22 C4 28, 8 32, 12 32 C16 32, 20 28, 20 22 C20 14, 12 2, 12 2Z"
            fill="url(#fg3)"
          />
          <path
            d="M12 10 C12 10, 8 18, 8 22 C8 26, 10 28, 12 28 C14 28, 16 26, 16 22 C16 18, 12 10, 12 10Z"
            fill="#FEF3C7"
            opacity="0.7"
          />
        </motion.svg>
      </div>
      <div style={{ width: "0.3vh", height: "0.6vh", background: "#374151", position: "relative", zIndex: 10 }} />
      <div
        style={{
          flex: 1,
          width: "1.4vh",
          position: "relative",
          zIndex: 10,
          minHeight: "3vh",
          background: "linear-gradient(180deg, #F5E6A3 0%, #D4A843 35%, #C4942E 50%, #D4A843 70%, #F5E6A3 100%)",
          boxShadow: "inset -1px 0 2px rgba(0,0,0,0.15), inset 1px 0 2px rgba(255,255,255,0.3)",
        }}
      />
      <div
        style={{
          width: "2vh",
          height: "0.6vh",
          background: "linear-gradient(to bottom, #B45309, #92400E)",
          borderRadius: "0 0 3px 3px",
          position: "relative",
          zIndex: 10,
        }}
      />
    </div>
  );
}

function MemorialCard({ person, index, compact }: { person: MemorialPerson; index: number; compact: boolean }) {
  const isToday = person.days_until === 0;
  const daysLabel = person.days_until === 1 ? "מחר" : person.days_until > 1 ? `בעוד ${person.days_until} ימים` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ display: "flex", alignItems: "center", gap: "clamp(4px, 1vw, 12px)" }}
    >
      <AnimatedCandle />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: compact
            ? "clamp(3px, 0.6vh, 8px) clamp(6px, 1vw, 12px)"
            : "clamp(5px, 1vh, 12px) clamp(8px, 1.5vw, 16px)",
          borderRadius: "10px",
          background: isToday
            ? "linear-gradient(135deg, rgba(60,40,10,0.95), rgba(45,30,5,0.98))"
            : "linear-gradient(135deg, rgba(35,35,35,0.92), rgba(25,25,25,0.96))",
          border: isToday ? "1px solid rgba(212,175,55,0.55)" : "1px solid rgba(160,130,60,0.2)",
          boxShadow: isToday ? "0 0 16px rgba(212,175,55,0.12)" : "none",
        }}
      >
        <p
          style={{
            fontSize: compact ? "clamp(12px, 1.8vh, 20px)" : "clamp(14px, 2.4vh, 26px)",
            fontWeight: 700,
            lineHeight: 1.2,
            color: isToday ? "#FDE68A" : "#FEF3C7",
          }}
        >
          {person.is_male !== false ? "ר'" : "מרת"} {person.deceased_name} ז״ל
        </p>
        <p
          style={{
            fontSize: compact ? "clamp(9px, 1.3vh, 14px)" : "clamp(11px, 1.6vh, 17px)",
            color: "rgba(253,230,138,0.6)",
            marginTop: "1px",
          }}
        >
          {person.is_male !== false ? "בן" : "בת"} {person.father_name}
        </p>
        <p
          style={{
            fontSize: compact ? "clamp(9px, 1.2vh, 13px)" : "clamp(10px, 1.4vh, 15px)",
            color: "#F59E0B",
            fontWeight: 600,
            marginTop: "1px",
          }}
        >
          {person.hebrew_date_display}
        </p>
        {daysLabel && (
          <p style={{ fontSize: "clamp(8px, 1vh, 11px)", color: "rgba(245,158,11,0.6)", marginTop: "1px" }}>
            {daysLabel}
          </p>
        )}
      </div>
      <AnimatedCandle />
    </motion.div>
  );
}

// כמה אנשים נכנסים בעמוד אחד לפי מספר עמודות וסה"כ
function getPageSize(total: number): { cols: number; perPage: number } {
  if (total <= 3) return { cols: 1, perPage: 3 };
  if (total <= 6) return { cols: 2, perPage: 6 };
  if (total <= 9) return { cols: 3, perPage: 6 }; // 3 עמודות, 2 שורות = 6
  return { cols: 2, perPage: 6 };
}

export default function MemorialDisplaySlide({ people }: MemorialDisplaySlideProps) {
  const { cols, perPage } = getPageSize(people.length);
  const pages = Math.ceil(people.length / perPage);
  const [page, setPage] = useState(0);
  const compact = cols > 1;

  // החלפת עמוד כל 5 שניות אם יש יותר מעמוד אחד
  useEffect(() => {
    if (pages <= 1) return;
    const t = setInterval(() => setPage((p) => (p + 1) % pages), 5000);
    return () => clearInterval(t);
  }, [pages]);

  const visible = people.slice(page * perPage, page * perPage + perPage);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
      style={{
        width: "100%",
        maxWidth: "98vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "clamp(4px, 1vh, 14px)",
        padding: "clamp(4px, 1vw, 16px)",
      }}
    >
      {/* כותרת */}
      <div style={{ textAlign: "center", flexShrink: 0 }}>
        <h2
          style={{
            fontSize: "clamp(16px, 3.5vh, 42px)",
            fontWeight: 700,
            lineHeight: 1.1,
            background: "linear-gradient(180deg, #FFD700 0%, #DAA520 45%, #B8860B 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 2px 4px rgba(218,165,32,0.3))",
          }}
        >
          היכל ה׳ לזכרון עולם
        </h2>
        <p style={{ fontSize: "clamp(9px, 1.5vh, 17px)", color: "rgba(253,230,138,0.5)", marginTop: "2px" }}>
          — לעילוי נשמת כל ישראל —
        </p>
      </div>

      {/* רשימה */}
      <div
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: compact ? "clamp(4px, 0.8vh, 10px)" : "clamp(6px, 1.2vh, 14px)",
          maxWidth: cols === 1 ? "75vw" : cols === 2 ? "96vw" : "98vw",
          margin: "0 auto",
        }}
      >
        {visible.map((person, idx) => (
          <MemorialCard key={person.id} person={person} index={idx} compact={compact} />
        ))}
      </div>

      {/* אינדיקטור עמודים */}
      {pages > 1 && (
        <div style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
          {Array.from({ length: pages }).map((_, i) => (
            <div
              key={i}
              style={{
                width: i === page ? "16px" : "8px",
                height: "6px",
                borderRadius: "3px",
                background: i === page ? "rgba(245,158,11,0.8)" : "rgba(245,158,11,0.3)",
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>
      )}

      {/* כיתוב תחתון */}
      <p style={{ fontSize: "clamp(9px, 1.4vh, 16px)", color: "rgba(245,158,11,0.45)", fontWeight: 600 }}>
        תהא נשמתם צרורה בצרור החיים
      </p>
    </motion.div>
  );
}
