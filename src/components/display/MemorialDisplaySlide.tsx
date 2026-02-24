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

function CandleIcon() {
  return <span style={{ fontSize: "clamp(18px, 3vh, 32px)", lineHeight: 1 }}>🕯️</span>;
}

function MemorialCard({ person }: { person: MemorialPerson }) {
  const isToday = person.days_until === 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "clamp(6px, 1vw, 12px)",
        padding: "clamp(8px, 1.2vh, 16px) clamp(10px, 1.5vw, 18px)",
        borderRadius: "12px",
        background: isToday
          ? "linear-gradient(135deg, rgba(80,52,8,0.97), rgba(55,34,4,0.99))"
          : "rgba(255,255,255,0.06)",
        border: isToday ? "1.5px solid rgba(212,175,55,0.65)" : "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <CandleIcon />
      <div style={{ flex: 1, textAlign: "center" }}>
        <div
          style={{
            fontSize: "clamp(16px, 2.8vh, 30px)",
            fontWeight: 800,
            color: isToday ? "#FDE68A" : "#FFFFFF",
            lineHeight: 1.2,
          }}
        >
          {person.is_male !== false ? "ר'" : "מרת"} {person.deceased_name} ז״ל
        </div>
        <div
          style={{
            fontSize: "clamp(13px, 2vh, 22px)",
            color: isToday ? "rgba(253,230,138,0.85)" : "rgba(220,220,220,0.85)",
            lineHeight: 1.2,
          }}
        >
          {person.is_male !== false ? "בן" : "בת"} {person.father_name}
        </div>
        <div
          style={{
            fontSize: "clamp(12px, 1.8vh, 20px)",
            fontWeight: 700,
            color: "#F59E0B",
          }}
        >
          {person.hebrew_date_display}
          {person.days_until === 1 && " • מחר"}
          {person.days_until > 1 && ` • בעוד ${person.days_until} ימים`}
        </div>
      </div>
      <CandleIcon />
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

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "clamp(6px, 1vw, 14px)",
        gap: "clamp(6px, 1vh, 12px)",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* כותרת — תמיד נראית */}
      <div style={{ textAlign: "center", flexShrink: 0 }}>
        <div
          style={{
            fontSize: "clamp(20px, 4vh, 46px)",
            fontWeight: 900,
            background: "linear-gradient(180deg, #FFD700 0%, #F0B800 40%, #B8860B 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            lineHeight: 1.1,
          }}
        >
          🕯️ היכל ה׳ לזכרון עולם
        </div>
        <div
          style={{
            fontSize: "clamp(11px, 1.8vh, 20px)",
            color: "rgba(253,230,138,0.65)",
            marginTop: "2px",
          }}
        >
          — לעילוי נשמת כל ישראל —
        </div>
      </div>

      {/* כרטיסי נפטרים — בדיוק 4 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={page}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35 }}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "clamp(5px, 0.8vh, 10px)",
            overflow: "hidden",
          }}
        >
          {visible.map((person) => (
            <MemorialCard key={person.id} person={person} />
          ))}
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
          fontSize: "clamp(11px, 1.6vh, 18px)",
          color: "rgba(245,158,11,0.55)",
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        תהא נשמתם צרורה בצרור החיים
      </div>
    </div>
  );
}
