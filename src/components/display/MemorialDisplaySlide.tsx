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
        padding: "clamp(8px, 1.5vh, 18px) clamp(6px, 1vw, 14px)",
        borderRadius: "14px",
        background: isToday
          ? "linear-gradient(135deg, rgba(80,52,8,0.97), rgba(55,34,4,0.99))"
          : "rgba(255,255,255,0.07)",
        border: isToday ? "1.5px solid rgba(212,175,55,0.7)" : "1px solid rgba(255,255,255,0.12)",
        gap: "3px",
        flex: 1,
      }}
    >
      {/* נר */}
      <div style={{ fontSize: "clamp(20px, 3.5vh, 38px)", lineHeight: 1, marginBottom: "4px" }}>🕯️</div>

      {/* שם */}
      <div
        style={{
          fontSize: "clamp(14px, 2.4vh, 26px)",
          fontWeight: 800,
          color: isToday ? "#FDE68A" : "#FFFFFF",
          lineHeight: 1.2,
        }}
      >
        {person.is_male !== false ? "ר'" : "מרת"} {person.deceased_name} ז״ל
      </div>

      {/* אב */}
      <div
        style={{
          fontSize: "clamp(12px, 1.8vh, 20px)",
          color: isToday ? "rgba(253,230,138,0.85)" : "rgba(210,210,210,0.85)",
          lineHeight: 1.2,
        }}
      >
        {person.is_male !== false ? "בן" : "בת"} {person.father_name}
      </div>

      {/* תאריך */}
      <div
        style={{
          fontSize: "clamp(11px, 1.7vh, 18px)",
          fontWeight: 700,
          color: "#F59E0B",
          marginTop: "2px",
        }}
      >
        {person.hebrew_date_display}
        {person.days_until === 0 && " 🕯️"}
        {person.days_until === 1 && " • מחר"}
      </div>
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
  // תמיד 4 slots — אם פחות ממלאים עם null
  const slots = [...visible, ...Array(Math.max(0, PER_PAGE - visible.length)).fill(null)];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "clamp(8px, 1.2vw, 16px)",
        gap: "clamp(6px, 1vh, 12px)",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* כותרת */}
      <div style={{ textAlign: "center", flexShrink: 0 }}>
        <div
          style={{
            fontSize: "clamp(18px, 3.5vh, 40px)",
            fontWeight: 900,
            background: "linear-gradient(180deg, #FFD700 0%, #D4A017 60%, #B8860B 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            lineHeight: 1.15,
          }}
        >
          🕯️ היכל ה׳ לזכרון עולם
        </div>
        <div
          style={{
            fontSize: "clamp(10px, 1.6vh, 18px)",
            color: "rgba(253,230,138,0.6)",
            marginTop: "2px",
          }}
        >
          — לעילוי נשמת כל ישראל —
        </div>
      </div>

      {/* גריד 2x2 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={page}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.35 }}
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "1fr 1fr",
            gap: "clamp(6px, 1vw, 12px)",
            overflow: "hidden",
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
                  border: "1px dashed rgba(255,255,255,0.06)",
                }}
              />
            ),
          )}
        </motion.div>
      </AnimatePresence>

      {/* נקודות עמוד */}
      {pages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", flexShrink: 0 }}>
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
          fontSize: "clamp(10px, 1.5vh, 16px)",
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
