import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchWithCache } from "@/lib/display-cache";

// Default Torah verses for rotation when no custom message is set
const DEFAULT_VERSES = [
  { text: "שִׁוִּיתִי ה׳ לְנֶגְדִּי תָמִיד", source: "תהלים ט״ז, ח׳" },
  { text: "בְּכָל דְּרָכֶיךָ דָעֵהוּ וְהוּא יְיַשֵּׁר אֹרְחֹתֶיךָ", source: "משלי ג׳, ו׳" },
  { text: "וְאָהַבְתָּ לְרֵעֲךָ כָּמוֹךָ", source: "ויקרא י״ט, י״ח" },
  { text: "דַּע לִפְנֵי מִי אַתָּה עוֹמֵד", source: "ברכות כ״ח ע״ב" },
  { text: "אִם אֵין אֲנִי לִי מִי לִי, וּכְשֶׁאֲנִי לְעַצְמִי מָה אֲנִי, וְאִם לֹא עַכְשָׁיו אֵימָתַי", source: "אבות א׳, י״ד" },
  { text: "עֲשֵׂה רְצוֹנוֹ כִרְצוֹנְךָ כְּדֵי שֶׁיַּעֲשֶׂה רְצוֹנְךָ כִרְצוֹנוֹ", source: "אבות ב׳, ד׳" },
  { text: "הֱוֵי מְקַבֵּל אֶת כָּל הָאָדָם בְּסֵבֶר פָּנִים יָפוֹת", source: "אבות א׳, ט״ו" },
  { text: "כָּל יִשְׂרָאֵל עֲרֵבִים זֶה בָּזֶה", source: "שבועות ל״ט ע״א" },
];

export default function TorahVortSlide() {
  const [customMessage, setCustomMessage] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState<string | null>(null);

  useEffect(() => {
    const fetchMessage = async () => {
      const { data } = await fetchWithCache("vort-message", async () => {
        const { data } = await supabase
          .from("app_settings")
          .select("key, value")
          .in("key", ["display_vort_message", "display_vort_title"]);
        return data;
      });
      if (data) {
        for (const s of data) {
          if (s.key === "display_vort_message" && s.value) setCustomMessage(s.value);
          if (s.key === "display_vort_title" && s.value) setCustomTitle(s.value);
        }
      }
    };
    fetchMessage();
  }, []);

  // Pick a verse based on the day
  const dailyVerse = useMemo(() => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    return DEFAULT_VERSES[dayOfYear % DEFAULT_VERSES.length];
  }, []);

  const displayText = customMessage || dailyVerse.text;
  const displaySource = customTitle || (customMessage ? "הודעת היום" : dailyVerse.source);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(16px, 3vw, 40px)",
        gap: "clamp(12px, 2vh, 24px)",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Decorative top */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        style={{
          fontSize: "clamp(28px, 5vh, 60px)",
          lineHeight: 1,
        }}
      >
        ✡️
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        style={{
          fontSize: "clamp(16px, 2.5vh, 28px)",
          fontWeight: 600,
          color: "rgba(253,230,138,0.7)",
          letterSpacing: "0.05em",
        }}
      >
        — דבר תורה —
      </motion.div>

      {/* Main text */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        style={{
          maxWidth: "80vw",
          textAlign: "center",
          padding: "clamp(16px, 3vh, 36px) clamp(20px, 4vw, 48px)",
          borderRadius: "16px",
          background: "rgba(40,35,20,0.85)",
          border: "1.5px solid rgba(212,175,55,0.4)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        <p
          style={{
            fontSize: "clamp(20px, 4vh, 48px)",
            fontWeight: 800,
            color: "#FDE68A",
            lineHeight: 1.5,
            textShadow: "0 2px 8px rgba(218,165,32,0.3)",
          }}
          dir="rtl"
        >
          ״{displayText}״
        </p>
      </motion.div>

      {/* Source */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        style={{
          fontSize: "clamp(14px, 2vh, 24px)",
          color: "rgba(245,158,11,0.6)",
          fontWeight: 600,
          fontStyle: "italic",
        }}
      >
        ({displaySource})
      </motion.div>
    </motion.div>
  );
}
