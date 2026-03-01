import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { gematriya } from "@hebcal/core";
import { fetchWithCache, getCacheData } from "@/lib/display-cache";
import { gematriya } from "@hebcal/core";

interface HeichalName {
  id: string;
  name: string;
  father_name: string | null;
  is_male: boolean | null;
  hebrew_day: number;
  hebrew_month: number;
}

const HEBREW_MONTH_NAMES: Record<number, string> = {
  1: "ניסן",
  2: "אייר",
  3: "סיוון",
  4: "תמוז",
  5: "אב",
  6: "אלול",
  7: "תשרי",
  8: "חשוון",
  9: "כסלו",
  10: "טבת",
  11: "שבט",
  12: "אדר",
  13: "אדר ב'",
};

const NAMES_PER_PAGE = 5;
const CYCLE_INTERVAL = 12000;

function AnimatedTallCandle({ uniqueId }: { uniqueId: string }) {
  return (
    <div className="relative flex flex-col items-center h-full">
      <div className="relative flex flex-col items-center">
        <motion.div
          className="absolute -top-[2vh] w-[6vh] h-[6vh] rounded-full blur-xl z-0"
          style={{
            background: "radial-gradient(circle, rgba(251,191,36,0.5) 0%, rgba(245,158,11,0.15) 50%, transparent 100%)",
          }}
          animate={{ scale: [1, 1.4, 0.95, 1.25, 1], opacity: [0.5, 0.85, 0.4, 0.7, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.svg
          viewBox="0 0 24 36"
          className="w-[3vh] h-[4.5vh] relative z-10"
          animate={{ scaleX: [1, 0.85, 1.1, 0.9, 1], scaleY: [1, 1.1, 0.9, 1.05, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <defs>
            <radialGradient id={`flameGrad-${uniqueId}`} cx="50%" cy="60%" r="50%">
              <stop offset="0%" stopColor="#FFF7ED" />
              <stop offset="30%" stopColor="#FDE68A" />
              <stop offset="60%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </radialGradient>
          </defs>
          <path
            d="M12 2 C12 2, 4 14, 4 22 C4 28, 8 32, 12 32 C16 32, 20 28, 20 22 C20 14, 12 2, 12 2Z"
            fill={`url(#flameGrad-${uniqueId})`}
          />
          <path
            d="M12 10 C12 10, 8 18, 8 22 C8 26, 10 28, 12 28 C14 28, 16 26, 16 22 C16 18, 12 10, 12 10Z"
            fill="#FEF3C7"
            opacity="0.7"
          />
        </motion.svg>
      </div>
      <div className="w-[0.4vh] h-[0.8vh] bg-gray-700 rounded-b-full relative z-10" />
      <div
        className="flex-1 w-[1.8vh] rounded-b-sm relative z-10"
        style={{
          background: "linear-gradient(180deg, #F5E6A3 0%, #D4A843 30%, #C4942E 50%, #D4A843 70%, #F5E6A3 100%)",
          boxShadow: "inset -2px 0 4px rgba(0,0,0,0.15), inset 2px 0 4px rgba(255,255,255,0.3)",
          minHeight: "6vh",
        }}
      />
      <div className="w-[2.5vh] h-[0.8vh] bg-gradient-to-b from-amber-600 to-amber-800 rounded-b-md relative z-10" />
    </div>
  );
}

export default function HeichalDisplaySlide() {
  const [currentPage, setCurrentPage] = useState(0);

  // ===== שליפה מטבלת heichal_names הנפרדת =====
  const { data: allNames = [] } = useQuery({
    queryKey: ["heichal-names"],
    queryFn: async () => {
      const { data: result } = await fetchWithCache('heichal-names', async () => {
        const { data } = await (supabase as any)
          .from("heichal_names")
          .select("id, name, father_name, is_male, hebrew_day, hebrew_month")
          .eq("is_active", true)
          .order("hebrew_month")
          .order("hebrew_day");
        return (data || []) as HeichalName[];
      });
      return result || (getCacheData<HeichalName[]>('heichal-names') || []);
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const totalPages = Math.max(1, Math.ceil(allNames.length / NAMES_PER_PAGE));

  useEffect(() => {
    if (totalPages <= 1) return;
    const timer = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, CYCLE_INTERVAL);
    return () => clearInterval(timer);
  }, [totalPages]);

  useEffect(() => {
    if (currentPage >= totalPages) setCurrentPage(0);
  }, [totalPages, currentPage]);

  const pageNames = allNames.slice(currentPage * NAMES_PER_PAGE, (currentPage + 1) * NAMES_PER_PAGE);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="text-center w-full max-w-[92vw] flex flex-col items-center p-[2vw]"
    >
      {/* כותרת */}
      <div className="mb-[1.5vh]">
        <h2
          className="text-[4.5vh] md:text-[5.5vh] font-bold"
          style={{
            background: "linear-gradient(180deg, #FFD700 0%, #DAA520 40%, #B8860B 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 2px 4px rgba(218,165,32,0.3))",
          }}
        >
          היכל ה׳ לזכרון עולם
        </h2>
        <p className="text-[1.8vh] md:text-[2.2vh] mt-[0.3vh] text-amber-200/60">— לעילוי נשמת כל ישראל —</p>
        <p className="text-[1.4vh] md:text-[1.6vh] mt-[0.2vh] text-amber-300/40 italic">
          ״וְזָכַרְתִּי אֶת־בְּרִיתִי...״
        </p>
      </div>

      {/* רשימת שמות */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: "easeInOut" }}
          className="w-full max-w-[75vw] space-y-[1.2vh]"
        >
          {pageNames.length > 0 ? (
            pageNames.map((person, index) => (
              <motion.div
                key={person.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-stretch gap-[1.5vw]"
              >
                {/* נר ימין */}
                <div className="flex-shrink-0 py-[0.5vh]">
                  <AnimatedTallCandle uniqueId={`r-${person.id}`} />
                </div>

                {/* כרטיס */}
                <div
                  className="flex-1 rounded-xl overflow-hidden px-[2vw] py-[1.2vh] flex flex-col items-center justify-center text-center"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(40,40,40,0.9) 0%, rgba(30,30,30,0.95) 50%, rgba(40,40,40,0.9) 100%)",
                    border: "1px solid rgba(180,150,80,0.3)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}
                >
                  <p className="text-[2.6vh] md:text-[3vh] font-bold leading-tight text-amber-100">{person.name} ז״ל</p>
                  {person.father_name && (
                    <p className="text-[1.6vh] md:text-[1.8vh] mt-[0.2vh] text-amber-200/70">
                      {person.is_male !== false ? "בן" : "מלכה"} {person.father_name}
                    </p>
                  )}
                  <p className="text-[1.4vh] md:text-[1.6vh] mt-[0.3vh] font-semibold text-amber-400">
                    {gematriya(person.hebrew_day)} {HEBREW_MONTH_NAMES[person.hebrew_month] || ""}
                  </p>
                </div>

                {/* נר שמאל */}
                <div className="flex-shrink-0 py-[0.5vh]">
                  <AnimatedTallCandle uniqueId={`l-${person.id}`} />
                </div>
              </motion.div>
            ))
          ) : (
            <p className="text-[2.5vh] text-amber-200/50">אין שמות ברשימה — הוסף דרך ממשק הניהול</p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* אינדיקטור עמודים */}
      <div className="mt-[1.5vh]">
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mb-[0.8vh]">
            {Array.from({ length: totalPages }).map((_, i) => (
              <div
                key={i}
                className={`w-[1vh] h-[1vh] rounded-full transition-all duration-300 ${
                  i === currentPage ? "bg-amber-400 scale-125" : "bg-amber-800/50"
                }`}
              />
            ))}
          </div>
        )}
        <p className="text-[1.6vh] text-amber-300/50 font-semibold">תהא נשמתם צרורה בצרור החיים</p>
      </div>
    </motion.div>
  );
}
