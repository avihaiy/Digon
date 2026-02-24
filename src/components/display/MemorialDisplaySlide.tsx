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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "4vw",
        minWidth: "28px",
        maxWidth: "44px",
      }}
    >
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <motion.div
          style={{
            position: "absolute",
            top: "-8px",
            width: "5vw",
            height: "5vw",
            maxWidth: "36px",
            maxHeight: "36px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(251,191,36,0.6) 0%, transparent 70%)",
            filter: "blur(6px)",
          }}
          animate={{ scale: [1, 1.5, 0.9, 1.3, 1], opacity: [0.5, 0.9, 0.4, 0.8, 0.5] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.svg
          viewBox="0 0 24 36"
          style={{
            width: "3vw",
            height: "4.5vw",
            minWidth: "18px",
            maxWidth: "26px",
            position: "relative",
            zIndex: 10,
          }}
          animate={{ scaleX: [1, 0.82, 1.1, 0.9, 1], scaleY: [1, 1.1, 0.88, 1.05, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <defs>
            <radialGradient id="candleFlame" cx="50%" cy="60%" r="50%">
              <stop offset="0%" stopColor="#FFF7ED" />
              <stop offset="35%" stopColor="#FDE68A" />
              <stop offset="65%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </radialGradient>
          </defs>
          <path
            d="M12 2 C12 2, 4 14, 4 22 C4 28, 8 32, 12 32 C16 32, 20 28, 20 22 C20 14, 12 2, 12 2Z"
            fill="url(#candleFlame)"
          />
          <path
            d="M12 10 C12 10, 8 18, 8 22 C8 26, 10 28, 12 28 C14 28, 16 26, 16 22 C16 18, 12 10, 12 10Z"
            fill="#FEF3C7"
            opacity="0.7"
          />
        </motion.svg>
      </div>
      <div style={{ width: "2px", height: "6px", background: "#374151" }} />
      <div
        style={{
          width: "2vw",
          minWidth: "12px",
          maxWidth: "18px",
          flex: 1,
          minHeight: "40px",
          background: "linear-gradient(180deg, #F5E6A3 0%, #D4A843 35%, #C4942E 50%, #D4A843 70%, #F5E6A3 100%)",
          boxShadow: "inset -1px 0 3px rgba(0,0,0,0.15), inset 1px 0 3px rgba(255,255,255,0.3)",
        }}
      />
      <div
        style={{
          width: "3vw",
          minWidth: "18px",
          maxWidth: "24px",
          height: "8px",
          background: "linear-gradient(to bottom, #B45309, #92400E)",
          borderRadius: "0 0 4px 4px",
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
      style={{ display: "flex", alignItems: "stretch", gap: "clamp(6px, 1.5vw, 18px)" }}
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
            ? "clamp(6px, 1vh, 12px) clamp(8px, 1.5vw, 16px)"
            : "clamp(10px, 1.8vh, 20px) clamp(12px, 2.5vw, 28px)",
          borderRadius: "12px",
          background: isToday
            ? "linear-gradient(135deg, rgba(70,45,10,0.97), rgba(50,30,5,0.99))"
            : "linear-gradient(135deg, rgba(30,30,30,0.94), rgba(20,20,20,0.97))",
          border: isToday ? "1.5px solid rgba(212,175,55,0.6)" : "1px solid rgba(160,130,60,0.25)",
          boxShadow: isToday ? "0 0 20px rgba(212,175,55,0.15)" : "0 2px 12px rgba(0,0,0,0.3)",
        }}
      >
        {/* שם הנפטר — הכי גדול */}
        <p
          style={{
            fontSize: compact ? "clamp(16px, 3vh, 28px)" : "clamp(20px, 4vh, 38px)",
            fontWeight: 800,
            lineHeight: 1.15,
            color: isToday ? "#FDE68A" : "#FEF3C7",
            marginBottom: "2px",
          }}
        >
          {person.is_male !== false ? "ר'" : "מרת"} {person.deceased_name} ז״ל
        </p>

        {/* שם האב */}
        <p
          style={{
            fontSize: compact ? "clamp(13px, 2.2vh, 22px)" : "clamp(16px, 3vh, 28px)",
            color: "rgba(253,230,138,0.75)",
            lineHeight: 1.2,
          }}
        >
          {person.is_male !== false ? "בן" : "בת"} {person.father_name}
        </p>

        {/* תאריך עברי */}
        <p
          style={{
            fontSize: compact ? "clamp(12px, 2vh, 20px)" : "clamp(14px, 2.5vh, 24px)",
            color: "#F59E0B",
            fontWeight: 700,
            marginTop: "2px",
          }}
        >
          {person.hebrew_date_display}
        </p>

        {daysLabel && (
          <p
            style={{
              fontSize: compact ? "clamp(10px, 1.5vh, 16px)" : "clamp(12px, 1.8vh, 18px)",
              color: "rgba(245,158,11,0.65)",
              marginTop: "2px",
            }}
          >
            {daysLabel}
          </p>
        )}
      </div>

      <AnimatedCandle />
    </motion.div>
  );
}

function getPageSize(total: number): { cols: number; perPage: number } {
  if (total <= 3) return { cols: 1, perPage: 3 };
  if (total <= 6) return { cols: 2, perPage: 6 };
  return { cols: 2, perPage: 6 };
}

export default function MemorialDisplaySlide({ people }: MemorialDisplaySlideProps) {
  const { cols, perPage } = getPageSize(people.length);
  const pages = Math.ceil(people.length / perPage);
  const [page, setPage] = useState(0);
  const compact = cols > 1;

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
        maxWidth: "96vw",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "clamp(6px, 1.2vh, 16px)",
        padding: "clamp(6px, 1.5vw, 20px)",
      }}
    >
      {/* כותרת */}
      <div style={{ textAlign: "center" }}>
        <h2
          style={{
            fontSize: "clamp(22px, 4.5vh, 52px)",
            fontWeight: 800,
            lineHeight: 1.1,
            background: "linear-gradient(180deg, #FFD700 0%, #DAA520 45%, #B8860B 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 2px 6px rgba(218,165,32,0.4))",
          }}
        >
          🕯️ היכל ה׳ לזכרון עולם
        </h2>
        <p
          style={{
            fontSize: "clamp(12px, 2vh, 22px)",
            color: "rgba(253,230,138,0.6)",
            marginTop: "3px",
          }}
        >
          — לעילוי נשמת כל ישראל —
        </p>
      </div>

      {/* רשימה */}
      <div
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: compact ? "clamp(5px, 1vh, 12px)" : "clamp(8px, 1.5vh, 18px)",
          maxWidth: cols === 1 ? "72vw" : "96vw",
          margin: "0 auto",
        }}
      >
        {visible.map((person, idx) => (
          <MemorialCard key={person.id} person={person} index={idx} compact={compact} />
        ))}
      </div>

      {/* עמודים */}
      {pages > 1 && (
        <div style={{ display: "flex", gap: "8px" }}>
          {Array.from({ length: pages }).map((_, i) => (
            <div
              key={i}
              style={{
                width: i === page ? "20px" : "8px",
                height: "7px",
                borderRadius: "4px",
                background: i === page ? "rgba(245,158,11,0.85)" : "rgba(245,158,11,0.3)",
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>
      )}

      <p
        style={{
          fontSize: "clamp(11px, 1.8vh, 20px)",
          color: "rgba(245,158,11,0.5)",
          fontWeight: 600,
        }}
      >
        תהא נשמתם צרורה בצרור החיים
      </p>
    </motion.div>
  );
}
