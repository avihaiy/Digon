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
    <motion.div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      {/* להבה */}
      <motion.div
        animate={{ scaleX: [1, 0.8, 1.1, 0.85, 1], scaleY: [1, 1.15, 0.9, 1.1, 1], opacity: [0.9, 1, 0.85, 1, 0.9] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: "clamp(8px, 1.4vw, 16px)",
          height: "clamp(14px, 2.5vw, 28px)",
          background: "radial-gradient(ellipse at 50% 80%, #fff7 30%, #fbbf24 60%, #f59e0b 80%, transparent 100%)",
          borderRadius: "50% 50% 30% 30%",
          filter: "blur(0.5px)",
          boxShadow: "0 0 8px 3px rgba(251,191,36,0.5), 0 0 16px 6px rgba(251,191,36,0.2)",
        }}
      />
      {/* שמן */}
      <div
        style={{
          width: "clamp(6px, 1vw, 12px)",
          height: "clamp(30px, 5vh, 60px)",
          background: "linear-gradient(180deg, #f5e6a3 0%, #d4a843 40%, #c4942e 60%, #d4a843 80%, #f5e6a3 100%)",
          borderRadius: "2px",
          boxShadow: "inset -1px 0 2px rgba(0,0,0,0.15), inset 1px 0 2px rgba(255,255,255,0.3)",
        }}
      />
      {/* בסיס */}
      <div
        style={{
          width: "clamp(10px, 1.6vw, 18px)",
          height: "clamp(4px, 0.6vh, 7px)",
          background: "linear-gradient(to bottom, #b45309, #92400e)",
          borderRadius: "0 0 3px 3px",
        }}
      />
    </motion.div>
  );
}

function MemorialCard({ person }: { person: MemorialPerson }) {
  const isToday = person.days_until === 0;
  const isTomorrow = person.days_until === 1;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "clamp(6px, 1vw, 14px)",
        padding: "clamp(8px, 1.3vh, 16px) clamp(8px, 1.2vw, 16px)",
        borderRadius: "14px",
        background: isToday
          ? "linear-gradient(135deg, rgba(80,52,8,0.97), rgba(55,34,4,0.99))"
          : "rgba(255,255,255,0.07)",
        border: isToday ? "1.5px solid rgba(212,175,55,0.7)" : "1px solid rgba(255,255,255,0.1)",
        boxShadow: isToday ? "0 4px 20px rgba(212,175,55,0.15)" : "none",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* נר שמאל */}
      <Candle />

      {/* תוכן */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: "2px",
        }}
      >
        <div
          style={{
            fontSize: "clamp(13px, 2.2vh, 24px)",
            fontWeight: 800,
            color: isToday ? "#FDE68A" : "#FFFFFF",
            lineHeight: 1.2,
          }}
        >
          {person.is_male !== false ? "ר'" : "מרת"} {person.deceased_name} ז״ל
        </div>
        <div
          style={{
            fontSize: "clamp(11px, 1.7vh, 19px)",
            color: isToday ? "rgba(253,230,138,0.85)" : "rgba(210,210,210,0.85)",
            lineHeight: 1.2,
          }}
        >
          {person.is_male !== false ? "בן" : "בת"} {person.father_name}
        </div>
        <div
          style={{
            fontSize: "clamp(11px, 1.6vh, 18px)",
            fontWeight: 700,
            color: "#F59E0B",
          }}
        >
          {person.hebrew_date_display}
          {isToday && " 🕯️"}
          {isTomorrow && " • מחר"}
        </div>
      </div>

      {/* נר ימין */}
      <Candle />
    </div>
  );
}

export default function MemorialDisplaySlide({ people }: MemorialDisplaySlideProps) {
  const PER_PAGE = 4;
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
  // תמיד 4 slots בגריד 2x2
  const slots: (MemorialPerson | null)[] = [...visible, ...Array(Math.max(0, PER_PAGE - visible.length)).fill(null)];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "clamp(6px, 1vw, 14px)",
        gap: "clamp(5px, 0.8vh, 10px)",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* כותרת */}
      <div style={{ textAlign: "center", flexShrink: 0 }}>
        <div
          style={{
            fontSize: "clamp(18px, 3.5vh, 42px)",
            fontWeight: 900,
            background: "linear-gradient(180deg, #FFD700 0%, #D4A017 55%, #B8860B 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            lineHeight: 1.15,
            filter: "drop-shadow(0 2px 4px rgba(218,165,32,0.4))",
          }}
        >
          🕯️ היכל ה׳ לזכרון עולם
        </div>
        <div
          style={{
            fontSize: "clamp(10px, 1.5vh, 17px)",
            color: "rgba(253,230,138,0.6)",
            marginTop: "1px",
          }}
        >
          — לעילוי נשמת כל ישראל —
        </div>
      </div>

      {/* גריד 2×2 */}
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
            gridTemplateRows: "1fr 1fr",
            gap: "clamp(5px, 0.8vh, 10px)",
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          {slots.map((person, idx) =>
            person ? (
              <MemorialCard key={person.id} person={person} />
            ) : (
              <div
                key={`empty-${idx}`}
                style={{
                  borderRadius: "14px",
                  border: "1px dashed rgba(255,255,255,0.05)",
                }}
              />
            ),
          )}
        </motion.div>
      </AnimatePresence>

      {/* נקודות עמוד */}
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

      {/* כיתוב תחתון */}
      <div
        style={{
          textAlign: "center",
          fontSize: "clamp(10px, 1.4vh, 15px)",
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
