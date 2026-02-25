import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TickerItem {
  id: string;
  text: string;
  is_active: boolean;
  order_index: number;
}

const SPEED_MAP: Record<string, number> = {
  slow: 60,
  medium: 35,
  fast: 18,
};

export default function TickerBanner() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [speed, setSpeed] = useState("medium");

  const fetchAll = async () => {
    const [{ data: tickerData }, { data: speedData }] = await Promise.all([
      supabase.from("ticker_items").select("*").eq("is_active", true).order("order_index", { ascending: true }),
      supabase.from("app_settings").select("value").eq("key", "ticker_speed").maybeSingle(),
    ]);
    if (tickerData) setItems(tickerData);
    if (speedData?.value) setSpeed(speedData.value);
  };

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel("ticker-display")
      .on("postgres_changes", { event: "*", schema: "public", table: "ticker_items" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, fetchAll)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (items.length === 0) return null;

  const animDuration = SPEED_MAP[speed] ?? 35;
  const text = items.map((i) => i.text).join("   •   ");
  const fullText = text + "   •   " + text;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "clamp(28px, 4.5vh, 48px)",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(8px)",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        overflow: "hidden",
        flexShrink: 0,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
      }}
    >
      {/* קו זהב */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "2px",
          background: "linear-gradient(to left, transparent, #F59E0B 20%, #F59E0B 80%, transparent)",
        }}
      />

      {/* תווית */}
      <div
        style={{
          flexShrink: 0,
          padding: "0 clamp(8px, 1.5vw, 16px)",
          fontSize: "clamp(10px, 1.6vh, 15px)",
          fontWeight: 700,
          color: "#F59E0B",
          borderLeft: "2px solid rgba(245,158,11,0.4)",
          whiteSpace: "nowrap",
          zIndex: 2,
          background: "rgba(0,0,0,0.55)",
        }}
      >
        📢 עדכונים
      </div>

      {/* טיקר */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          position: "relative",
          height: "100%",
          display: "flex",
          alignItems: "center",
        }}
      >
        <style>{`
          @keyframes ticker-rtl-${speed} {
            0%   { transform: translateX(0); }
            100% { transform: translateX(50%); }
          }
        `}</style>
        <div
          style={{
            display: "flex",
            whiteSpace: "nowrap",
            animation: `ticker-rtl-${speed} ${animDuration}s linear infinite`,
            fontSize: "clamp(12px, 2vh, 18px)",
            fontWeight: 500,
            color: "rgba(255,255,255,0.92)",
            direction: "rtl",
          }}
        >
          {fullText}&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;{fullText}
        </div>
      </div>
    </div>
  );
}
