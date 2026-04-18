import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/hebrew-utils";
import { fetchWithCache, getCacheData } from "@/lib/display-cache";
import { fetchPublicFinanceDisplayStats, type PublicFinanceDisplayStats } from "@/lib/public-finance-display";
import { supabase } from "@/integrations/supabase/client";

interface FinanceDisplaySlideProps {
  textClass?: string;
  accentClass?: string;
}

export default function FinanceDisplaySlide({ textClass, accentClass }: FinanceDisplaySlideProps) {
  const queryClient = useQueryClient();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["display-finance-slide"],
    queryFn: async () => {
      const { data: result } = await fetchWithCache('finance-display', async () => {
        return fetchPublicFinanceDisplayStats(3);
      });
      return result || getCacheData<PublicFinanceDisplayStats>('finance-display');
    },
    refetchInterval: 5 * 60 * 1000,
  });

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const invalidate = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["display-finance-slide"] });
      }, 400);
    };

    const channel = supabase
      .channel("finance-display-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "budget_transactions" }, invalidate)
      .subscribe();

    return () => {
      if (timeout) clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const balance = stats?.thisMonthBalance || 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="w-full flex flex-col items-center justify-center px-[3vw] py-[2vh] gap-[2vh]"
      dir="rtl"
    >
      {/* כותרת */}
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-[4vh] font-bold text-white"
        style={{ textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}
      >
        💰 מצב כספי — חודש נוכחי
      </motion.h2>

      {/* 3 כרטיסים ראשיים */}
      <div className="grid grid-cols-3 gap-[2vw] w-full max-w-[90vw]">
        {/* הכנסות */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-[2vh] flex flex-col items-center gap-[1vh]"
          style={{
            background: "rgba(16,185,129,0.18)",
            border: "2px solid rgba(16,185,129,0.5)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
        >
          <TrendingUp style={{ color: "#34d399", width: "5vh", height: "5vh" }} />
          <p className="text-[2vh] text-emerald-200 font-medium">הכנסות</p>
          {isLoading ? (
            <div className="w-full h-[5vh] rounded-lg animate-pulse bg-emerald-500/20" />
          ) : (
            <p className="text-[3.5vh] font-bold text-emerald-300 tabular-nums" dir="ltr">
              {formatCurrency(stats?.thisMonthIncome || 0)}
            </p>
          )}
        </motion.div>

        {/* הוצאות */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl p-[2vh] flex flex-col items-center gap-[1vh]"
          style={{
            background: "rgba(239,68,68,0.18)",
            border: "2px solid rgba(239,68,68,0.5)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
        >
          <TrendingDown style={{ color: "#f87171", width: "5vh", height: "5vh" }} />
          <p className="text-[2vh] text-red-200 font-medium">הוצאות</p>
          {isLoading ? (
            <div className="w-full h-[5vh] rounded-lg animate-pulse bg-red-500/20" />
          ) : (
            <p className="text-[3.5vh] font-bold text-red-300 tabular-nums" dir="ltr">
              {formatCurrency(stats?.thisMonthExpenses || 0)}
            </p>
          )}
        </motion.div>

        {/* יתרה */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl p-[2vh] flex flex-col items-center gap-[1vh]"
          style={{
            background: balance >= 0 ? "rgba(59,130,246,0.18)" : "rgba(249,115,22,0.18)",
            border: `2px solid ${balance >= 0 ? "rgba(59,130,246,0.5)" : "rgba(249,115,22,0.5)"}`,
            backdropFilter: "blur(10px)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
        >
          <Wallet style={{ color: balance >= 0 ? "#60a5fa" : "#fb923c", width: "5vh", height: "5vh" }} />
          <p className="text-[2vh] font-medium" style={{ color: balance >= 0 ? "#93c5fd" : "#fdba74" }}>
            יתרה
          </p>
          {isLoading ? (
            <div className="w-full h-[5vh] rounded-lg animate-pulse bg-blue-500/20" />
          ) : (
            <p
              className="text-[3.5vh] font-bold tabular-nums"
              dir="ltr"
              style={{ color: balance >= 0 ? "#60a5fa" : "#fb923c" }}
            >
              {formatCurrency(balance)}
            </p>
          )}
        </motion.div>
      </div>

      {/* היסטוריה — 3 חודשים */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-[90vw] rounded-2xl p-[2vh]"
        style={{
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.15)",
          backdropFilter: "blur(10px)",
        }}
      >
        <p className="text-[2.2vh] font-bold text-white/80 mb-[1.5vh] text-center">היסטוריה חודשית</p>
        <div className="grid grid-cols-3 gap-[2vw]">
          {stats?.monthlyData?.map((month, i) => (
            <div
              key={i}
              className="text-center rounded-xl p-[1.5vh]"
              style={{
                background: month.isCurrent ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
                border: month.isCurrent ? "1px solid rgba(255,255,255,0.25)" : "1px solid transparent",
              }}
            >
              <p className="text-[1.8vh] text-white/60 mb-[0.5vh]">
                {month.label}
                {month.isCurrent && <span className="text-[1.4vh] opacity-50"> ✓</span>}
              </p>
              <p
                className="text-[2.8vh] font-bold tabular-nums"
                dir="ltr"
                style={{ color: month.balance >= 0 ? "#34d399" : "#f87171" }}
              >
                {formatCurrency(month.balance)}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
