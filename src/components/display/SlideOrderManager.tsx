import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { GripVertical, ArrowUp, ArrowDown, Layers, Timer } from "lucide-react";

export type SlideId = "heichal" | "memorial" | "zmanim" | "finance" | "vort" | "announcements";

const SLIDE_LABELS: Record<SlideId, { label: string; emoji: string; desc: string }> = {
  heichal: { label: "היכל ה'", emoji: "🕍", desc: "תמונת היכל" },
  memorial: { label: "אשכבות", emoji: "🕯️", desc: "יארצייט היום" },
  zmanim: { label: "זמני היום", emoji: "🕐", desc: "זמני הלכה יומיים" },
  finance: { label: "מצב כספי", emoji: "💰", desc: "הכנסות והוצאות" },
  vort: { label: "דבר תורה", emoji: "✡️", desc: "פסוק או הודעת יום" },
  announcements: { label: "מודעות", emoji: "📢", desc: "הודעות ומודעות" },
};

const DEFAULT_ORDER: SlideId[] = ["heichal", "memorial", "zmanim", "finance", "vort", "announcements"];
const ORDER_KEY = "display_slide_order";
const DURATIONS_KEY = "display_slide_durations";

// ברירת מחדל שניות לכל סליייד
const DEFAULT_DURATIONS: Record<SlideId, number> = {
  heichal: 10,
  memorial: 15,
  zmanim: 20,
  finance: 10,
  announcements: 10,
};

async function upsertSetting(key: string, value: string) {
  const { data: existing } = await supabase.from("app_settings").select("id").eq("key", key).maybeSingle();
  if (existing) {
    await supabase.from("app_settings").update({ value }).eq("key", key);
  } else {
    await supabase.from("app_settings").insert({ key, value });
  }
}

async function loadSetting(key: string): Promise<string | null> {
  const { data } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}

export default function SlideOrderManager() {
  const [order, setOrder] = useState<SlideId[]>(DEFAULT_ORDER);
  const [durations, setDurations] = useState<Record<SlideId, number>>(DEFAULT_DURATIONS);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const orderVal = await loadSetting(ORDER_KEY);
      if (orderVal) {
        try {
          const parsed = JSON.parse(orderVal) as SlideId[];
          const valid = parsed.filter((id) => id in SLIDE_LABELS);
          const missing = DEFAULT_ORDER.filter((id) => !valid.includes(id));
          setOrder([...valid, ...missing]);
        } catch {}
      }
      const durVal = await loadSetting(DURATIONS_KEY);
      if (durVal) {
        try {
          setDurations({ ...DEFAULT_DURATIONS, ...JSON.parse(durVal) });
        } catch {}
      }
    };
    load();
  }, []);

  const saveOrder = async (newOrder: SlideId[]) => {
    setSaving(true);
    try {
      await upsertSetting(ORDER_KEY, JSON.stringify(newOrder));
      toast.success("סדר הסליידים עודכן");
    } catch {
      toast.error("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  const saveDurations = async (newDurations: Record<SlideId, number>) => {
    try {
      await upsertSetting(DURATIONS_KEY, JSON.stringify(newDurations));
    } catch {}
  };

  const move = async (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    const newOrder = [...order];
    const [item] = newOrder.splice(from, 1);
    newOrder.splice(to, 0, item);
    setOrder(newOrder);
    await saveOrder(newOrder);
  };

  const updateDuration = async (id: SlideId, val: number) => {
    const v = Math.max(3, Math.min(120, val || 10));
    const newDur = { ...durations, [id]: v };
    setDurations(newDur);
    await saveDurations(newDur);
  };

  const onDragStart = (idx: number) => setDragging(idx);
  const onDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOver(idx);
  };
  const onDrop = async (idx: number) => {
    if (dragging !== null && dragging !== idx) await move(dragging, idx);
    setDragging(null);
    setDragOver(null);
  };
  const onDragEnd = () => {
    setDragging(null);
    setDragOver(null);
  };

  return (
    <Card className="border-purple-200 bg-purple-50/40 dark:bg-purple-950/20 dark:border-purple-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-500" />
          סדר הצגת סליידים
          {saving && <span className="text-xs text-muted-foreground font-normal">שומר...</span>}
        </CardTitle>
        <p className="text-xs text-muted-foreground">גרור לשינוי סדר · קבע זמן הצגה לכל סליייד</p>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="space-y-1.5">
          {order.map((id, idx) => {
            const info = SLIDE_LABELS[id];
            const isDragging = dragging === idx;
            const isOver = dragOver === idx;
            return (
              <div
                key={id}
                draggable
                onDragStart={() => onDragStart(idx)}
                onDragOver={(e) => onDragOver(e, idx)}
                onDrop={() => onDrop(idx)}
                onDragEnd={onDragEnd}
                className={`flex items-center gap-2 p-2.5 rounded-lg border bg-background cursor-grab active:cursor-grabbing transition-all duration-150 select-none
                  ${isDragging ? "opacity-40 scale-95" : "opacity-100"}
                  ${isOver && !isDragging ? "border-purple-400 bg-purple-50 dark:bg-purple-950/40 scale-[1.02]" : "border-border"}`}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-lg shrink-0">{info.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{info.label}</p>
                  <p className="text-xs text-muted-foreground">{info.desc}</p>
                </div>
                {/* שדה שניות */}
                <div className="flex items-center gap-1 shrink-0">
                  <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    type="number"
                    min={3}
                    max={120}
                    value={durations[id]}
                    onChange={(e) => updateDuration(id, parseInt(e.target.value) || 10)}
                    className="w-16 h-7 text-xs text-center px-1"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-xs text-muted-foreground">ש'</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={idx === 0}
                    onClick={() => move(idx, idx - 1)}
                  >
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={idx === order.length - 1}
                    onClick={() => move(idx, idx + 1)}
                  >
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground w-4 text-center font-mono">{idx + 1}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
