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
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className={`flex justify-between items-center py-[1.4vh] px-[2vw] rounded-xl mx-[0.5vw] my-[0.3vh] transition-colors ${
        isLesson ? "hover:bg-blue-800/30" : "hover:bg-blue-800/40"
      }`}
    >
      {/* ===== שיפור 1: שעה גדולה יותר עם צל וצבע זהב עשיר יותר ===== */}
      <span
        dir="ltr"
        className={`font-bold tabular-nums tracking-wide ${
          isLesson ? "text-[3vh] md:text-[3.8vh]" : "text-[3.8vh] md:text-[4.8vh]"
        } text-amber-300`}
        style={{ textShadow: "0 0 20px rgba(251,191,36,0.5), 0 2px 8px rgba(0,0,0,0.8)" }}
      >
        {entry.time}
      </span>
      {/* ===== שיפור 2: שם תפילה גדול יותר עם צל ===== */}
      <span
        className={`font-bold ${isLesson ? "text-[2.8vh] md:text-[3.5vh]" : "text-[3.2vh] md:text-[4.2vh]"} text-white`}
        style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}
      >
        {entry.name}
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
      // ===== שיפור 3: border זהב, border-radius גדול יותר, backdrop-blur =====
      className="rounded-3xl overflow-hidden shadow-2xl"
      style={{
        background: "rgba(15, 30, 80, 0.65)",
        backdropFilter: "blur(12px)",
        border: "1.5px solid rgba(251,191,36,0.35)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      {/* ===== שיפור 4: כותרת פאנל מודגשת יותר ===== */}
      <div
        className="px-[2vw] py-[1.2vh] border-b"
        style={{
          background: "linear-gradient(to left, rgba(180,120,0,0.35), rgba(120,80,0,0.15))",
          borderColor: "rgba(251,191,36,0.3)",
        }}
      >
        <h3
          className="text-[2.8vh] md:text-[3.5vh] font-bold text-amber-400 flex items-center justify-end gap-[0.8vw]"
          style={{ textShadow: "0 2px 12px rgba(251,191,36,0.6)" }}
        >
          {title} {icon}
        </h3>
      </div>

      {/* ===== שיפור 5: מפריד עדין בין שורות ===== */}
      <div className="px-[0.5vw] py-[0.8vh]">
        {entries.map((entry, idx) => (
          <div key={idx}>
            <TimeRow entry={entry} isLesson={isLesson} index={idx} />
            {idx < entries.length - 1 && <div className="mx-[2vw] h-px bg-blue-600/20" />}
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
      className="w-full h-full flex flex-col items-center justify-center p-[3vw]"
    >
      {/* ===== שיפור 6: כותרת ראשית עם גלו זהב ===== */}
      <motion.h2
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-[4.5vh] md:text-[6vh] font-bold text-amber-400 mb-[2.5vh] text-center"
        style={{
          textShadow: "0 0 30px rgba(251,191,36,0.7), 0 3px 15px rgba(0,0,0,0.9)",
          letterSpacing: "0.02em",
        }}
      >
        🕎 {titleText}
      </motion.h2>

      {/* ===== שיפור 7: גריד רספונסיבי עם גאפ גדול יותר ===== */}
      <div
        className={`w-full max-w-[92vw] ${
          hasLessons ? "grid grid-cols-1 md:grid-cols-2 gap-[3vw]" : "flex justify-center max-w-[55vw]"
        }`}
      >
        <SectionPanel title="זמני תפילה" icon="🕐" entries={prayers} />
        {hasLessons && <SectionPanel title="שיעורי תורה" icon="📖" entries={lessons} isLesson />}
      </div>
    </motion.div>
  );
}
