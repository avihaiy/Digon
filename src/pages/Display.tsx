import { motion } from "framer-motion";
import { useMemo } from "react";
import { getDailyZmanim, formatTimeOnly } from "@/lib/hebrew-utils";

const ZMANIM_ROWS = [
  { label: "עלות השחר", key: "alotHashachar", icon: "🌅" },
  { label: "הנץ החמה", key: "sunrise", icon: "☀️" },
  { label: "סוף ק״ש (גר״א)", key: "sofZmanShmaGRA", icon: "📖" },
  { label: "סוף תפילה (גר״א)", key: "sofZmanTfillaGRA", icon: "🙏" },
  { label: "חצות", key: "chatzot", icon: "🕛" },
  { label: "מנחה גדולה", key: "minchaGedola", icon: "🕐" },
  { label: "מנחה קטנה", key: "minchaKetana", icon: "🕐" },
  { label: "פלג המנחה", key: "plagHaMincha", icon: "🌇" },
  { label: "שקיעה", key: "sunset", icon: "🌆" },
  { label: "צאת הכוכבים", key: "tzeit", icon: "⭐" },
] as const;

export default function ZmanimDisplaySlide() {
  const zmanim = useMemo(() => getDailyZmanim("akko"), []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.6 }}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "clamp(6px, 1vw, 14px)",
        gap: "clamp(4px, 0.7vh, 10px)",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* כותרת */}
      <div
        style={{
          flexShrink: 0,
          textAlign: "center",
          padding: "clamp(5px, 0.8vh, 10px) clamp(10px, 2vw, 20px)",
          borderRadius: "12px",
          background: "rgba(250,235,195,0.8)",
          border: "1.5px solid rgba(160,110,40,0.5)",
          boxShadow: "0 3px 16px rgba(0,0,0,0.18)",
        }}
      >
        <div
          style={{
            fontSize: "clamp(18px, 3.5vh, 42px)",
            fontWeight: 900,
            color: "#3b1a00",
            lineHeight: 1.1,
          }}
        >
          🕐 זמני היום — עכו
        </div>
      </div>

      {/* גריד 2 עמודות */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: `repeat(${Math.ceil(ZMANIM_ROWS.length / 2)}, 1fr)`,
          gap: "clamp(3px, 0.5vh, 7px)",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {ZMANIM_ROWS.map((row, idx) => {
          const time = zmanim[row.key as keyof typeof zmanim];
          const timeStr = formatTimeOnly(time as Date | null);
          const important = ["sunrise", "sofZmanShmaGRA", "chatzot", "sunset", "tzeit"].includes(row.key);
          return (
            <motion.div
              key={row.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.25 }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "clamp(4px, 0.7vh, 10px) clamp(6px, 1vw, 14px)",
                borderRadius: "9px",
                background: important ? "rgba(250,235,195,0.85)" : "rgba(250,235,195,0.55)",
                border: important ? "1px solid rgba(160,110,40,0.5)" : "1px solid rgba(160,110,40,0.2)",
              }}
              dir="rtl"
            >
              <span
                style={{
                  fontSize: "clamp(12px, 1.8vh, 20px)",
                  fontWeight: important ? 700 : 500,
                  color: "#3b1a00",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                }}
              >
                {row.icon} {row.label}
              </span>
              <span
                style={{
                  fontSize: "clamp(14px, 2.2vh, 24px)",
                  fontWeight: 800,
                  color: important ? "#7c2d12" : "#92400e",
                  direction: "ltr",
                  flexShrink: 0,
                  marginRight: "4px",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {timeStr}
              </span>
            </motion.div>
          );
        })}
      </div>

      <div
        style={{
          flexShrink: 0,
          textAlign: "center",
          fontSize: "clamp(9px, 1.2vh, 13px)",
          color: "rgba(92,46,0,0.45)",
        }}
      >
        זמנים לפי מיקום עכו • חישוב הלכתי
      </div>
    </motion.div>
  );
}
