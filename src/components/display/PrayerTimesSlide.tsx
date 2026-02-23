import { motion } from "framer-motion";
import { useMemo } from "react";

interface PrayerEntry {
  name: string;
  time: string;
}

interface PrayerTimesData {
  weekday?: {
    prayers?: PrayerEntry[];
    lessons?: PrayerEntry[];
  };
  shabbat?: {
    prayers?: PrayerEntry[];
    lessons?: PrayerEntry[];
  };
}

interface PrayerTimesSlideProps {
  content: string;
  isShabbat: boolean;
}

function TimeRow({ entry, isLesson = false, index = 0 }: { entry: PrayerEntry; isLesson?: boolean; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className={`flex items-center py-[1.4vh] px-[2vw] rounded-xl mx-[0.5vw] my-[0.3vh] transition-colors ${
        isLesson ? "hover:bg-amber-900/20" : "hover:bg-amber-900/30"
      }`}
      dir="rtl"
    >
      <span
        className={`font-bold flex-1 text-right ${
          isLesson ? "text-[2.8vh] md:text-[3.5vh]" : "text-[3.2vh] md:text-[4.2vh]"
        } text-amber-950`}
        style={{ textShadow: "0 1px 3px rgba(0,0,0,0.15)" }}
      >
        {entry.name}
      </span>
      <span
        className={`font-bold tabular-nums tracking-wide ${
          isLesson ? "text-[3vh] md:text-[3.8vh]" : "text-[3.8vh] md:text-[4.8vh]"
        } text-amber-800`}
        style={{ textShadow: "0 1px 4px rgba(180,100,0,0.3)", direction: "ltr" }}
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-3xl overflow-hidden shadow-2xl"
      style={{
        background: "rgba(245, 230, 190, 0.50)",
        backdropFilter: "blur(10px)",
        border: "1.5px solid rgba(160, 110, 40, 0.5)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.6)",
      }}
    >
      <div
        className="px-[2vw] py-[1.2vh] border-b"
        dir="rtl"
        style={{
          background: "linear-gradient(to left, rgba(160,100,0,0.25), rgba(200,140,0,0.15))",
          borderColor: "rgba(160,110,40,0.4)",
        }}
      >
        <h3
          className="text-[2.8vh] md:text-[3.5vh] font-bold text-amber-800 flex items-center gap-[0.8vw]"
          style={{ textShadow: "0 1px 6px rgba(160,100,0,0.4)" }}
        >
          {icon} {title}
        </h3>
      </div>

      <div className="px-[0.5vw] py-[0.8vh]">
        {entries.map((entry, idx) => (
          <div key={idx}>
            <TimeRow entry={entry} isLesson={isLesson} index={idx} />
            {idx < entries.length - 1 && <div className="mx-[2vw] h-px bg-amber-800/20" />}
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
      if (parsed && (parsed.weekday || parsed.shabbat)) return parsed;
      return null;
    } catch {
      return null;
    }
  }, [content]);

  if (!data) return null;

  const section = isShabbat ? data.shabbat : data.weekday;
  if (!section) return null;

  const prayers = section.prayers || [];
  const lessons = section.lessons || [];
  const titleText = isShabbat ? "תפילות שבת וחג" : "תפילות חול";
  const hasLessons = lessons.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="w-full h-full flex flex-col items-center justify-center p-[3vw] min-h-0"
      dir="rtl"
    >
      <motion.h2
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-[4.5vh] md:text-[6vh] font-bold text-amber-800 mb-[2.5vh] text-center px-[4vw] py-[1.2vh] rounded-2xl"
        style={{
          background: "rgba(240, 215, 160, 0.50)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(160,110,40,0.45)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          textShadow: "0 2px 8px rgba(160,100,0,0.4)",
          letterSpacing: "0.02em",
        }}
      >
        🕎 {titleText}
      </motion.h2>

      <div
        className={`w-full max-w-[92vw] my-auto ${
          hasLessons ? "grid grid-cols-1 md:grid-cols-2 gap-[3vw]" : "flex justify-center max-w-[55vw]"
        }`}
      >
        <SectionPanel title="זמני תפילה" icon="🕐" entries={prayers} />
        {hasLessons && <SectionPanel title="שיעורי תורה" icon="📖" entries={lessons} isLesson />}
      </div>
    </motion.div>
  );
}
