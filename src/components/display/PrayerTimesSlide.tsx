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

function TimeRow({ entry, isLesson = false, index = 0 }: { entry: PrayerEntry; isLesson?: boolean; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className="flex items-center justify-between py-[1.2vh] px-[2vw] rounded-xl"
      style={{ background: index % 2 === 0 ? "rgba(160,100,0,0.08)" : "transparent" }}
      dir="rtl"
    >
      <span
        className="font-bold text-right leading-tight"
        style={{
          fontSize: "clamp(14px, 3.2vh, 32px)",
          color: isLesson ? "#92400e" : "#78350f",
          textShadow: "0 1px 3px rgba(0,0,0,0.1)",
          flex: 1,
        }}
      >
        {entry.name}
      </span>
      <span
        className="font-bold tabular-nums tracking-wide"
        style={{
          fontSize: "clamp(16px, 3.8vh, 38px)",
          color: "#b45309",
          textShadow: "0 1px 4px rgba(180,100,0,0.25)",
          direction: "ltr",
          minWidth: "5ch",
          textAlign: "right",
        }}
      >
        {entry.time}
      </span>
    </motion.div>
  );
}

function SectionPanel({
  title,
  icon,
  entries,
  isLesson = false,
}: {
  title: string;
  icon: string;
  entries: PrayerEntry[];
  isLesson?: boolean;
}) {
  if (!entries || entries.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl overflow-hidden flex-1"
      style={{
        background: "rgba(245, 230, 190, 0.52)",
        backdropFilter: "blur(12px)",
        border: "1.5px solid rgba(160, 110, 40, 0.5)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.65)",
      }}
    >
      <div
        className="px-[2.5vw] py-[1.2vh] border-b flex items-center gap-[0.8vw]"
        dir="rtl"
        style={{
          background: "linear-gradient(to left, rgba(160,100,0,0.22), rgba(200,140,0,0.12))",
          borderColor: "rgba(160,110,40,0.35)",
        }}
      >
        <span style={{ fontSize: "clamp(14px, 2.6vh, 26px)" }}>{icon}</span>
        <h3
          className="font-bold text-amber-800"
          style={{ fontSize: "clamp(14px, 2.6vh, 26px)", textShadow: "0 1px 5px rgba(160,100,0,0.35)" }}
        >
          {title}
        </h3>
      </div>
      <div className="px-[1vw] py-[0.6vh]">
        {entries.map((entry, idx) => (
          <div key={idx}>
            <TimeRow entry={entry} isLesson={isLesson} index={idx} />
            {idx < entries.length - 1 && (
              <div className="mx-[2vw] h-px" style={{ background: "rgba(160,110,40,0.18)" }} />
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
      className="w-full h-full flex flex-col items-center justify-start"
      style={{ padding: "clamp(8px, 2vw, 24px)", gap: "clamp(6px, 1.5vh, 18px)" }}
      dir="rtl"
    >
      {/* כותרת */}
      <motion.h2
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="font-bold text-amber-800 text-center rounded-2xl w-full"
        style={{
          fontSize: "clamp(20px, 4.5vh, 52px)",
          padding: "clamp(6px, 1.2vh, 14px) clamp(12px, 3vw, 32px)",
          background: "rgba(240, 215, 160, 0.52)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(160,110,40,0.4)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
          textShadow: "0 2px 8px rgba(160,100,0,0.35)",
          letterSpacing: "0.02em",
          flexShrink: 0,
        }}
      >
        🕎 {titleText}
      </motion.h2>

      {/* תוכן */}
      <div
        className="w-full flex-1 min-h-0"
        style={{
          display: "flex",
          flexDirection: hasLessons ? undefined : "column",
          gap: "clamp(8px, 1.5vw, 20px)",
          ...(hasLessons ? { display: "grid", gridTemplateColumns: "1fr 1fr" } : {}),
        }}
      >
        <SectionPanel title="זמני תפילה" icon="🕐" entries={prayers} />
        {hasLessons && <SectionPanel title="שיעורי תורה" icon="📖" entries={lessons} isLesson />}
      </div>
    </motion.div>
  );
}
