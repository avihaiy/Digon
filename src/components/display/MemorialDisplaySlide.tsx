import { motion, AnimatePresence } from "framer-motion";
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
        width: "clamp(20px, 3.5vw, 40px)",
        flexShrink: 0,
      }}
    >
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <motion.div
          style={{
            position: "absolute",
            top: "-8px",
            width: "clamp(24px, 4vw, 44px)",
            height: "clamp(24px, 4vw, 44px)",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(251,191,36,0.65) 0%, transparent 70%)",
            filter: "blur(8px)",
          }}
          animate={{ scale: [1, 1.5, 0.85, 1.3, 1], opacity: [0.5, 0.9, 0.35, 0.8, 0.5] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.svg
          viewBox="0 0 24 36"
          style={{
            width: "clamp(14px, 2.5vw, 28px)",
            height: "clamp(20px, 3.8vw, 42px)",
            position: "relative",
            zIndex: 10,
          }}
          animate={{ scaleX: [1, 0.82, 1.12, 0.9, 1], scaleY: [1, 1.12, 0.88, 1.06, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <defs>
            <radialGradient id="cf4" cx="50%" cy="60%" r="50%">
              <stop offset="0%" stopColor="#FFF7ED" />
              <stop offset="30%" stopColor="#FDE68A" />
              <stop offset="62%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </radialGradient>
          </defs>
          <path d="M12 2C12 2 4 14 4 22c0 6 4 10 8 10s8-4 8-10C20 14 12 2 12 2z" fill="url(#cf4)" />
          <path d="M12 10c0 0-4 8-4 12 0 4 2 6 4 6s4-2 4-6c0-4-4-12-4-12z" fill="#FEF3C7" opacity="0.75" />
        </motion.svg>
      </div>
      <div style={{ width: "2px", height: "5px", background: "#4B5563" }} />
      <div
        style={{
          width: "clamp(10px, 1.8vw, 20px)",
          flex: 1,
          minHeight: "clamp(30px, 5vh, 60px)",
          background: "linear-gradient(180deg, #F5E6A3 0%, #D4A843 35%, #C4942E 50%, #D4A843 70%, #F5E6A3 100%)",
          boxShadow: "inset -1px 0 3px rgba(0,0,0,0.18), inset 1px 0 3px rgba(255,255,255,0.35)",
        }}
      />
      <div
        style={{
          width: "clamp(14px, 2.5vw, 28px)",
          height: "clamp(5px, 0.8vh, 10px)",
          background: "linear-gradient(to bottom, #B45309, #92400E)",
          borderRadius: "0 0 4px 4px",
        }}
      />
    </div>
  );
}

function MemorialCard({ person, index }: { person: MemorialPerson; index: number }) {
  const isToday = person.days_until === 0;
  const daysLabel = person.days_until === 1 ? "מחר" : person.days_until > 1 ? `בעוד ${person.days_until} ימים` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ display: "flex", alignItems: "stretch", gap: "clamp(8px, 1.5vw, 20px)" }}
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
          padding: "clamp(8px, 1.4vh, 18px) clamp(10px, 2vw, 24px)",
          borderRadius: "14px",
          background: isToday
            ? "linear-gradient(135deg, rgba(80,52,8,0.97), rgba(55,34,4,0.99))"
            : "linear-gradient(135deg, rgba(28,28,28,0.95), rgba(18,18,18,0.98))",
          border: isToday ? "1.5px solid rgba(212,175,55,0.65)" : "1px solid rgba(180,150,70,0.28)",
          boxShadow: isToday
            ? "0 4px 24px rgba(0,0,0,0.4), 0 0 24px rgba(212,175,55,0.14)"
            : "0 3px 16px rgba(0,0,0,0.35)",
        }}
      >
        {/* שם הנפטר */}
        <p
          style={{
            fontSize: "clamp(18px, 3.5vh, 36px)",
            fontWeight: 800,
            lineHeight: 1.15,
            color: isToday ? "#FDE68A" : "#FFFFFF",
            textShadow: isToday ? "0 1px 6px rgba(212,175,55,0.4)" : "0 1px 8px rgba(0,0,0,0.5)",
            marginBottom: "3px",
          }}
        >
          {person.is_male !== false ? "ר'" : "מרת"} {person.deceased_name} ז״ל
        </p>

        {/* שם האב */}
        <p
          style={{
            fontSize: "clamp(14px, 2.5vh, 26px)",
            fontWeight: 500,
            color: isToday ? "rgba(253,230,138,0.85)" : "rgba(240,240,240,0.82)",
            lineHeight: 1.2,
          }}
        >
          {person.is_male !== false ? "בן" : "בת"} {person.father_name}
        </p>

        {/* תאריך עברי */}
        <p
          style={{
            fontSize: "clamp(13px, 2.2vh, 22px)",
            fontWeight: 700,
            color: isToday ? "#FBBF24" : "#F59E0B",
            marginTop: "3px",
            textShadow: "0 1px 4px rgba(0,0,0,0.4)",
          }}
        >
          {person.hebrew_date_display}
        </p>

        {daysLabel && (
          <p
            style={{
              fontSize: "clamp(11px, 1.7vh, 17px)",
              color: "rgba(245,158,11,0.72)",
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

export default function MemorialDisplaySlide({ people }: MemorialDisplaySlideProps) {
  const PER_PAGE = 4;
  const pages = Math.ceil(people.length / PER_PAGE);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [people.length]);

  useEffect(() => {
    if (pages <= 1) return;
    const t = setInterval(() => setPage((p) => (p + 1) % pages), 5000);
    return () => clearInterval(t);
  }, [pages]);

  const visible = people.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
      style={{
        width: "100%",
        maxWidth: "88vw",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "clamp(8px, 1.5vh, 20px)",
        padding: "clamp(6px, 1.2vw, 16px)",
      }}
    >
      {/* כותרת */}
      <div style={{ textAlign: "center", flexShrink: 0 }}>
        <h2
          style={{
            fontSize: "clamp(24px, 5vh, 56px)",
            fontWeight: 800,
            lineHeight: 1.1,
            background: "linear-gradient(180deg, #FFD700 0%, #F0B800 40%, #B8860B 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 2px 6px rgba(218,165,32,0.5))",
          }}
        >
          🕯️ היכל ה׳ לזכרון עולם
        </h2>
        <p
          style={{
            fontSize: "clamp(13px, 2.2vh, 24px)",
            color: "rgba(253,230,138,0.7)",
            marginTop: "3px",
            fontWeight: 500,
          }}
        >
          — לעילוי נשמת כל ישראל —
        </p>
      </div>

      {/* רשימה — 4 בעמוד */}
      <AnimatePresence mode="wait">
        <motion.div
          key={page}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.4 }}
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "clamp(6px, 1.2vh, 16px)",
          }}
        >
          {visible.map((person, idx) => (
            <MemorialCard key={person.id} person={person} index={idx} />
          ))}
        </motion.div>
      </AnimatePresence>

      {/* אינדיקטור עמודים */}
      {pages > 1 && (
        <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
          {Array.from({ length: pages }).map((_, i) => (
            <div
              key={i}
              style={{
                width: i === page ? "22px" : "8px",
                height: "7px",
                borderRadius: "4px",
                background: i === page ? "rgba(245,158,11,0.9)" : "rgba(245,158,11,0.3)",
                transition: "all 0.35s",
              }}
            />
          ))}
        </div>
      )}

      {/* כיתוב תחתון */}
      <p
        style={{
          fontSize: "clamp(12px, 1.8vh, 20px)",
          color: "rgba(245,158,11,0.6)",
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        תהא נשמתם צרורה בצרור החיים
      </p>
    </motion.div>
  );
}
