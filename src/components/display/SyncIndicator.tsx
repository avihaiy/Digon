import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Wifi, WifiOff } from "lucide-react";

function formatRelative(date: Date | null): string {
  if (!date) return "ממתין לסנכרון…";
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 5) return "עודכן עכשיו";
  if (seconds < 60) return `עודכן לפני ${seconds} שניות`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `עודכן לפני ${minutes} דק׳`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `עודכן לפני ${hours} שע׳`;
  return date.toLocaleString("he-IL");
}

export default function SyncIndicator() {
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [online, setOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [, setTick] = useState(0);

  useEffect(() => {
    const ping = () => setLastSync(new Date());
    ping();

    const channel = supabase
      .channel("display-sync-indicator")
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, ping)
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, ping)
      .on("postgres_changes", { event: "*", schema: "public", table: "budget_transactions" }, ping)
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, ping)
      .on("postgres_changes", { event: "*", schema: "public", table: "scheduled_announcements" }, ping)
      .on("postgres_changes", { event: "*", schema: "public", table: "memorial_names" }, ping)
      .on("postgres_changes", { event: "*", schema: "public", table: "heichal_names" }, ping)
      .on("postgres_changes", { event: "*", schema: "public", table: "prayer_times" }, ping)
      .on("postgres_changes", { event: "*", schema: "public", table: "ticker_items" }, ping)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, ping)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") ping();
      });

    const tickInterval = setInterval(() => setTick((n) => n + 1), 1000);

    const handleOnline = () => {
      setOnline(true);
      ping();
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(tickInterval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div
      dir="rtl"
      className="fixed bottom-3 left-3 z-[60] flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-white/85 backdrop-blur-md pointer-events-none select-none"
      style={{
        background: "rgba(0,0,0,0.4)",
        border: "1px solid rgba(255,255,255,0.15)",
      }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{
          background: online ? "#34d399" : "#f87171",
          boxShadow: online ? "0 0 6px #34d399" : "0 0 6px #f87171",
        }}
      />
      {online ? <Wifi className="w-3 h-3 opacity-70" /> : <WifiOff className="w-3 h-3 opacity-70" />}
      <span className="tabular-nums">{online ? formatRelative(lastSync) : "לא מחובר"}</span>
    </div>
  );
}
