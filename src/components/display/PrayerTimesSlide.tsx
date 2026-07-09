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
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "clamp(6px, 1vh, 12px) clamp(10px, 1.8vw, 20px)",
        borderRadius: "10px",
        background: index % 2 === 0 ? "rgba(160,100,0,0.1)" : "transparent",
      }}
      dir="rtl"
    >
      <span
        style={{
          fontSize: "clamp(15px, 2.6vh, 30px)",
          fontWeight: 800,
          color: "#3b1a00",
          flex: 1,
          textAlign: "right",
        }}
      >
        {entry.name}
      </span>
      <span
        style={{
          fontSize: "clamp(17px, 3vh, 34px)",
          fontWeight: 900,
          color: "#7c2d12",
          direction: "ltr",
          minWidth: "5ch",
          textAlign: "left",
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
        borderRadius: "18px",
        overflow: "hidden",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        background: "rgba(250, 235, 195, 0.75)",
        backdropFilter: "blur(14px)",
        border: "1.5px solid rgba(160,110,40,0.55)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.7)",
      }}
    >
      {/* כותרת פאנל */}
      <div
        dir="rtl"
        style={{
          padding: "clamp(5px, 0.9vh, 10px) clamp(10px, 1.8vw, 20px)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "linear-gradient(to left, rgba(160,100,0,0.2), rgba(200,140,0,0.1))",
          borderBottom: "1.5px solid rgba(160,110,40,0.3)",
        }}
      >
        <span style={{ fontSize: "clamp(14px, 2.4vh, 26px)" }}>{icon}</span>
        <h3
          style={{
            fontSize: "clamp(14px, 2.4vh, 26px)",
            fontWeight: 900,
            color: "#3b1a00",
          }}
        >
          {title}
        </h3>
      </div>

      <div style={{ padding: "clamp(4px, 0.5vh, 8px) 0" }}>
        {entries.map((entry, idx) => (
          <div key={idx}>
            <TimeRow entry={entry} index={idx} />
            {idx < entries.length - 1 && (
              <div
                style={{ margin: "0 clamp(10px, 1.8vw, 20px)", height: "1px", background: "rgba(160,110,40,0.2)" }}
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
          fontSize: "clamp(20px, 3.8vh, 46px)",
          fontWeight: 900,
          color: "#3b1a00",
          textAlign: "center",
          width: "100%",
          flexShrink: 0,
          padding: "clamp(6px, 1vh, 12px) clamp(14px, 2.5vw, 32px)",
          borderRadius: "14px",
          background: "rgba(250, 235, 195, 0.75)",
          backdropFilter: "blur(10px)",
          border: "1.5px solid rgba(160,110,40,0.5)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.7)",
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
