import { motion } from 'framer-motion';
import { useMemo } from 'react';

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

function TimeRow({ entry, isLesson = false }: { entry: PrayerEntry; isLesson?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-[1.2vh] px-[1.5vw] ${
      isLesson ? 'opacity-90' : ''
    }`}>
      <span
        dir="ltr"
        className={`font-bold tabular-nums ${
          isLesson ? 'text-[2.8vh] md:text-[3.5vh]' : 'text-[3.2vh] md:text-[4vh]'
        } text-amber-300`}
      >
        {entry.time}
      </span>
      <span className={`font-semibold ${
        isLesson ? 'text-[2.5vh] md:text-[3vh]' : 'text-[3vh] md:text-[3.8vh]'
      } text-white`}>
        {entry.name}
      </span>
    </div>
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
    <div className="bg-blue-900/60 rounded-2xl border border-blue-700/40 overflow-hidden">
      <div className="bg-gradient-to-l from-amber-600/30 to-amber-500/10 px-[2vw] py-[1vh] border-b border-amber-500/30">
        <h3 className="text-[2.5vh] md:text-[3vh] font-bold text-amber-400 flex items-center justify-end gap-[0.8vw]">
          {title} {icon}
        </h3>
      </div>
      <div className="px-[1vw] py-[0.5vh] divide-y divide-blue-700/30">
        {entries.map((entry, idx) => (
          <TimeRow key={idx} entry={entry} isLesson={isLesson} />
        ))}
      </div>
    </div>
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
  const titleText = isShabbat ? 'תפילות שבת וחג' : 'תפילות חול';
  const hasLessons = lessons.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
      className="w-full h-full flex flex-col items-center justify-center p-[3vw]"
    >
      {/* Title */}
      <h2 className="text-[4vh] md:text-[5.5vh] font-bold text-amber-400 mb-[2vh] text-center">
        🕎 {titleText}
      </h2>

      {/* Content - responsive grid */}
      <div className={`w-full max-w-[90vw] ${
        hasLessons
          ? 'grid grid-cols-1 md:grid-cols-2 gap-[2vw]'
          : 'flex justify-center'
      }`}>
        {/* Prayers */}
        <SectionPanel
          title="זמני תפילה"
          icon="🕐"
          entries={prayers}
        />

        {/* Lessons */}
        {hasLessons && (
          <SectionPanel
            title="שיעורי תורה"
            icon="📖"
            entries={lessons}
            isLesson
          />
        )}
      </div>
    </motion.div>
  );
}
