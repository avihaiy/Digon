import { motion } from "framer-motion";
import { useMemo } from "react";

interface PrayerEntry {
  name: string;
  time: string;
}

interface PrayerTimesData {
  weekday?: { prayers?: PrayerEntry[]; lessons?: PrayerEntry[] };
  shabbat?: { prayers?: PrayerEntry[]; lessons?: PrayerEntry[] };
}

interface PrayerTimesSlideProps {
  content: string;
  isShabbat: boolean;
}

function TimeRow({ entry, index = 0 }: { entry: PrayerEntry; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className="flex items-center justify-between px-[2vw] rounded-xl"
      style={{
        padding: "clamp(10px, 1.8vh, 22px) clamp(12px, 2vw, 24px)",
        background: index % 2 === 0 ? "rgba(255,255,255,0.07)" : "transparent",
      }}
      dir="rtl"
    >
      <span
        style={{
          fontSize: "clamp(18px, 3.5vh, 40px)",
          fontWeight: 700,
          color: "#FFFFFF",
          flex: 1,
          textAlign: "right",
          textShadow: "0 1px 6px rgba(0,0,0,0.4)",
        }}
      >
        {entry.name}
      </span>
      <span
        style={{
          fontSize: "clamp(22px, 4.2vh, 48px)",
          fontWeight: 800,
          color: "#FCD34D",
          direction: "ltr",
          minWidth: "5ch",
          textAlign: "left",
          textShadow: "0 1px 8px rgba(0,0,0,0.4)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {entry.time}
      </span>
    </motion.div>
  );
}

function SectionPanel({ title, icon, entries }: { title: string; icon: string; entries: PrayerEntry[] }) {
  if (!entries || entries.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        borderRadius: "16px",
        overflow: "hidden",
        flex: 1,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(14px)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      {/* כותרת פאנל */}
      <div
        dir="rtl"
        style={{
          padding: "clamp(8px, 1.4vh, 16px) clamp(12px, 2.5vw, 28px)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "rgba(255,255,255,0.06)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <span style={{ fontSize: "clamp(16px, 2.8vh, 30px)" }}>{icon}</span>
        <h3
          style={{
            fontSize: "clamp(16px, 3vh, 32px)",
            fontWeight: 800,
            color: "#FDE68A",
            textShadow: "0 1px 6px rgba(0,0,0,0.4)",
          }}
        >
          {title}
        </h3>
      </div>

      {/* שורות */}
      <div style={{ padding: "clamp(4px, 0.6vh, 8px) 0" }}>
        {entries.map((entry, idx) => (
          <div key={idx}>
            <TimeRow entry={entry} index={idx} />
            {idx < entries.length - 1 && (
              <div
                style={{ margin: "0 clamp(12px, 2vw, 24px)", height: "1px", background: "rgba(255,255,255,0.08)" }}
              />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function PrayerTimesSlide({ content, isShabbat }: PrayerTimesSlideProps) {
  const data = useMemo<PrayerTimesData | null>(() => {
    try {
      const parsed = JSON.parse(content);
      return parsed?.weekday || parsed?.shabbat ? parsed : null;
    } catch {
      return null;
    }
  }, [content]);

  if (!data) return null;
  const section = isShabbat ? data.shabbat : data.weekday;
  if (!section) return null;

  const prayers = section.prayers || [];
  const lessons = section.lessons || [];
  const hasLessons = lessons.length > 0;
  const titleText = isShabbat ? "תפילות שבת וחג" : "תפילות חול";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.7, ease: "easeInOut" }}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "clamp(8px, 2vw, 24px)",
        gap: "clamp(8px, 1.5vh, 20px)",
      }}
      dir="rtl"
    >
      {/* כותרת ראשית */}
      <motion.h2
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          fontSize: "clamp(24px, 5vh, 64px)",
          fontWeight: 900,
          color: "#FFFFFF",
          textAlign: "center",
          width: "100%",
          flexShrink: 0,
          padding: "clamp(8px, 1.4vh, 18px) clamp(16px, 3vw, 40px)",
          borderRadius: "14px",
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.15)",
          textShadow: "0 2px 12px rgba(0,0,0,0.6)",
          letterSpacing: "0.02em",
        }}
      >
        🕎 {titleText}
      </motion.h2>

      {/* תוכן */}
      <div
        style={{
          width: "100%",
          flex: 1,
          minHeight: 0,
          display: hasLessons ? "grid" : "flex",
          flexDirection: hasLessons ? undefined : "column",
          gridTemplateColumns: hasLessons ? "1fr 1fr" : undefined,
          gap: "clamp(8px, 1.5vw, 20px)",
        }}
      >
        <SectionPanel title="זמני תפילה" icon="🕐" entries={prayers} />
        {hasLessons && <SectionPanel title="שיעורי תורה" icon="📖" entries={lessons} />}
      </div>
    </motion.div>
  );
}
