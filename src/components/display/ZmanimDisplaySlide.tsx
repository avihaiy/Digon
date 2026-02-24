import { motion } from "framer-motion";
import { useMemo } from "react";
import { getDailyZmanim, formatTimeOnly, DailyZmanim } from "@/lib/hebrew-utils";

interface ZmanimRow {
  label: string;
  key: keyof DailyZmanim;
  icon: string;
  highlight?: boolean;
}

const ZMANIM_ROWS: ZmanimRow[] = [
  { label: "עלות השחר",        key: "alotHashachar",     icon: "🌅" },
  { label: "הנץ החמה",         key: "sunrise",           icon: "☀️", highlight: true },
  { label: "משיכיר",           key: "misheyakir",        icon: "🌄" },
  { label: "סוף ק״ש (גר״א)",  key: "sofZmanShmaGRA",    icon: "📖", highlight: true },
  { label: "סוף תפילה (גר״א)", key: "sofZmanTfillaGRA",  icon: "🙏", highlight: true },
  { label: "חצות",             key: "chatzot",           icon: "🕛", highlight: true },
  { label: "מנחה גדולה",       key: "minchaGedola",      icon: "⏰" },
  { label: "מנחה קטנה",        key: "minchaKetana",      icon: "⏰" },
  { label: "פלג המנחה",        key: "plagHaMincha",      icon: "🌇" },
  { label: "שקיעה",            key: "sunset",            icon: "🌆", highlight: true },
  { label: "צאת הכוכבים",      key: "tzeit",             icon: "⭐", highlight: true },
];

export default function ZmanimDisplaySlide() {
  const zmanim = useMemo(() => getDailyZmanim("akko"), []);
  const today = new Date();
  const dateStr = today.toLocaleDateString("he-IL", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

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
      {/* כותרת */}
      <div style={{ textAlign: "center", flexShrink: 0, width: "100%" }}>
        <motion.h2
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            fontSize: "clamp(20px, 3.8vh, 46px)",
            fontWeight: 900,
            color: "#3b1a00",
            padding: "clamp(6px, 1vh, 12px) clamp(14px, 2.5vw, 32px)",
            borderRadius: "14px",
            background: "rgba(250, 235, 195, 0.75)",
            backdropFilter: "blur(10px)",
            border: "1.5px solid rgba(160,110,40,0.5)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.7)",
            letterSpacing: "0.02em",
          }}
        >
          🕐 זמני היום — עכו
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          style={{
            fontSize: "clamp(12px, 2vh, 22px)",
            color: "#6b4c1e",
            marginTop: "6px",
            fontWeight: 600,
          }}
        >
          {dateStr}
        </motion.p>
      </div>

      {/* טבלת זמנים */}
      <div
        style={{
          flex: 1,
          width: "100%",
          minHeight: 0,
          overflow: "auto",
          borderRadius: "18px",
          background: "rgba(250, 235, 195, 0.75)",
          backdropFilter: "blur(14px)",
          border: "1.5px solid rgba(160,110,40,0.55)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.7)",
          padding: "clamp(4px, 0.5vh, 8px) 0",
        }}
      >
        {ZMANIM_ROWS.map((row, idx) => {
          const time = zmanim[row.key];
          const timeStr = formatTimeOnly(time as Date | null);
          return (
            <motion.div
              key={row.key}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.35 }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "clamp(6px, 1vh, 12px) clamp(10px, 1.8vw, 20px)",
                borderRadius: "10px",
                background: row.highlight
                  ? "rgba(160,100,0,0.12)"
                  : idx % 2 === 0
                  ? "rgba(160,100,0,0.05)"
                  : "transparent",
              }}
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
                {row.icon} {row.label}
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
                {timeStr}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* כיתוב תחתון */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        style={{
          fontSize: "clamp(10px, 1.5vh, 16px)",
          color: "#6b4c1e",
          fontWeight: 600,
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        זמנים לפי מיקום עכו • חישוב הלכתי
      </motion.p>
    </motion.div>
  );
}
