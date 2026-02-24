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

function Candle() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <motion.div
        animate={{ scaleX: [1, 0.75, 1.15, 0.85, 1], scaleY: [1, 1.2, 0.88, 1.12, 1], opacity: [0.9, 1, 0.8, 1, 0.9] }}
        transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: "clamp(7px, 1.2vw, 14px)",
          height: "clamp(12px, 2.2vw, 24px)",
          background:
            "radial-gradient(ellipse at 50% 80%, rgba(255,247,237,0.9) 20%, #fbbf24 55%, #f59e0b 80%, transparent 100%)",
          borderRadius: "50% 50% 30% 30%",
          boxShadow: "0 0 8px 4px rgba(251,191,36,0.55), 0 0 18px 6px rgba(251,191,36,0.2)",
          filter: "blur(0.3px)",
        }}
      />
      <div
        style={{
          width: "clamp(5px, 0.9vw, 11px)",
          height: "clamp(24px, 4vh, 48px)",
          background: "linear-gradient(180deg, #f5e6a3 0%, #d4a843 40%, #c4942e 55%, #d4a843 75%, #f5e6a3 100%)",
          borderRadius: "1px",
          boxShadow: "inset -1px 0 2px rgba(0,0,0,0.15), inset 1px 0 2px rgba(255,255,255,0.35)",
        }}
      />
      <div
        style={{
          width: "clamp(9px, 1.5vw, 17px)",
          height: "clamp(3px, 0.5vh, 6px)",
          background: "linear-gradient(to bottom, #b45309, #92400e)",
          borderRadius: "0 0 3px 3px",
        }}
      />
    </div>
  );
}

function MemorialCard({ person }: { person: MemorialPerson }) {
  const isToday = person.days_until === 0;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "clamp(6px, 1vh, 12px) clamp(6px, 0.8vw, 12px)",
        borderRadius: "10px",
        background: isToday
          ? "linear-gradient(135deg, rgba(120,80,10,0.95), rgba(80,50,5,0.98))"
          : "rgba(245,225,170,0.55)",
        border: isToday ? "1.5px solid rgba(212,175,55,0.8)" : "1.5px solid rgba(160,110,40,0.35)",
        boxShadow: isToday ? "0 4px 16px rgba(212,175,55,0.2)" : "0 2px 8px rgba(0,0,0,0.12)",
        gap: "clamp(3px, 0.5vh, 7px)",
        height: "100%",
        boxSizing: "border-box" as const,
      }}
    >
      <Candle />
      <div
        style={{
          fontSize: "clamp(12px, 2vh, 22px)",
          fontWeight: 800,
          color: isToday ? "#FDE68A" : "#3b1a00",
          lineHeight: 1.2,
        }}
      >
        {person.is_male !== false ? "ר'" : "מרת"} {person.deceased_name} ז״ל
      </div>
      <div
        style={{
          fontSize: "clamp(10px, 1.6vh, 17px)",
          color: isToday ? "rgba(253,230,138,0.85)" : "#7c3800",
          lineHeight: 1.2,
        }}
      >
        {person.is_male !== false ? "בן" : "בת"} {person.father_name}
      </div>
      <div style={{ fontSize: "clamp(10px, 1.5vh, 16px)", fontWeight: 700, color: isToday ? "#fbbf24" : "#92400e" }}>
        {person.hebrew_date_display}
        {isToday && " 🕯️"}
        {person.days_until === 1 && " • מחר"}
      </div>
    </div>
  );
}

export default function MemorialDisplaySlide({ people }: MemorialDisplaySlideProps) {
  const PER_PAGE = 6;
  const pages = Math.max(1, Math.ceil(people.length / PER_PAGE));
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
  const slots: (MemorialPerson | null)[] = [...visible, ...Array(Math.max(0, PER_PAGE - visible.length)).fill(null)];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "clamp(6px, 1vw, 14px)",
        gap: "clamp(4px, 0.7vh, 10px)",
        overflow: "hidden",
        boxSizing: "border-box" as const,
      }}
    >
      <div style={{ textAlign: "center", flexShrink: 0 }}>
        <div
          style={{
            fontSize: "clamp(16px, 3.2vh, 38px)",
            fontWeight: 900,
            background: "linear-gradient(180deg, #FFD700 0%, #D4A017 50%, #B8860B 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 2px 4px rgba(218,165,32,0.4))",
            lineHeight: 1.15,
          }}
        >
          🕯️ היכל ה׳ לזכרון עולם
        </div>
        <div style={{ fontSize: "clamp(9px, 1.4vh, 15px)", color: "rgba(253,230,138,0.6)", marginTop: "1px" }}>
          — לעילוי נשמת כל ישראל —
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={page}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "1fr 1fr 1fr",
            gap: "clamp(4px, 0.7vh, 10px)",
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          {slots.map((person, idx) =>
            person ? (
              <MemorialCard key={person.id} person={person} />
            ) : (
              <div
                key={`e-${idx}`}
                style={{
                  borderRadius: "10px",
                  background: "rgba(245,225,170,0.2)",
                  border: "1.5px dashed rgba(160,110,40,0.15)",
                }}
              />
            ),
          )}
        </motion.div>
      </AnimatePresence>

      {pages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "7px", flexShrink: 0 }}>
          {Array.from({ length: pages }).map((_, i) => (
            <div
              key={i}
              style={{
                width: i === page ? "20px" : "7px",
                height: "7px",
                borderRadius: "4px",
                background: i === page ? "#F59E0B" : "rgba(245,158,11,0.3)",
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>
      )}

      <div
        style={{
          textAlign: "center",
          fontSize: "clamp(9px, 1.3vh, 14px)",
          color: "rgba(245,158,11,0.5)",
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        תהא נשמתם צרורה בצרור החיים
      </div>
    </div>
  );
}
