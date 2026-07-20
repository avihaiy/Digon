import { useState, useEffect } from "react";
import { getDailyQuote, DailyQuote } from "@/lib/daily-quotes";
import { Quote } from "lucide-react";
import { motion } from "framer-motion";

export function DailyQuoteWidget() {
  const [quote, setQuote] = useState<DailyQuote | null>(null);

  useEffect(() => {
    setQuote(getDailyQuote());
  }, []);

  if (!quote) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="w-full overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-100/50 dark:border-indigo-800/30 shadow-sm relative backdrop-blur-md"
      dir="rtl"
    >
      <div className="absolute -right-4 -top-4 opacity-[0.03] dark:opacity-10 pointer-events-none">
        <Quote className="w-32 h-32 rotate-180 text-indigo-900 dark:text-indigo-100" />
      </div>
      
      <div className="p-4 relative z-10">
        <div className="flex items-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400">
          <Quote className="w-4 h-4" />
          <h3 className="text-xs font-bold uppercase tracking-wider">רגע של השראה</h3>
        </div>
        
        <p className="text-slate-800 dark:text-slate-200 text-sm md:text-base font-medium leading-relaxed italic pr-2 border-r-2 border-indigo-300 dark:border-indigo-600">
          "{quote.text}"
        </p>
        
        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium text-left pl-1">
          – {quote.source}
        </div>
      </div>
    </motion.div>
  );
}
