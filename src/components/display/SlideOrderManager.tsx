import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { GripVertical, ArrowUp, ArrowDown, Layers } from "lucide-react";

export type SlideId = "heichal" | "memorial" | "finance" | "announcements";

const SLIDE_LABELS: Record<SlideId, { label: string; emoji: string; desc: string }> = {
  heichal: { label: "היכל ה'", emoji: "🕍", desc: "תמונת היכל" },
  memorial: { label: "אשכבות", emoji: "🕯️", desc: "יארצייט היום" },
  finance: { label: "מצב כספי", emoji: "💰", desc: "הכנסות והוצאות" },
  announcements: { label: "מודעות", emoji: "📢", desc: "מודעות מתוזמנות" },
};

const DEFAULT_ORDER: SlideId[] = ["heichal", "memorial", "finance", "announcements"];
const SETTINGS_KEY = "display_slide_order";

async function loadOrder(): Promise<SlideId[]> {
  const { data } = await supabase.from("app_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
  if (data?.value) {
    try {
      const parsed = JSON.parse(data.value) as SlideId[];
      // וודא שכל הסליידים קיימים
      const valid = parsed.filter((id) => id in SLIDE_LABELS);
      const missing = DEFAULT_ORDER.filter((id) => !valid.includes(id));
      return [...valid, ...missing];
    } catch {
      /* fall through */
    }
  }
  return DEFAULT_ORDER;
}

async function saveOrder(order: SlideId[]): Promise<void> {
  const { data: existing } = await supabase.from("app_settings").select("id").eq("key", SETTINGS_KEY).maybeSingle();
  if (existing) {
    await supabase
      .from("app_settings")
      .update({ value: JSON.stringify(order) })
      .eq("key", SETTINGS_KEY);
  } else {
    await supabase.from("app_settings").insert({ key: SETTINGS_KEY, value: JSON.stringify(order) });
  }
}

export default function SlideOrderManager() {
  const [order, setOrder] = useState<SlideId[]>(DEFAULT_ORDER);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  useEffect(() => {
    loadOrder().then(setOrder);
  }, []);

  const move = async (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    const newOrder = [...order];
    const [item] = newOrder.splice(from, 1);
    newOrder.splice(to, 0, item);
    setOrder(newOrder);
    setSaving(true);
    try {
      await saveOrder(newOrder);
      toast.success("סדר הסליידים עודכן");
    } catch {
      toast.error("שגיאה בשמירת הסדר");
    } finally {
      setSaving(false);
    }
  };

  // Drag handlers
  const onDragStart = (idx: number) => setDragging(idx);
  const onDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOver(idx);
  };
  const onDrop = async (idx: number) => {
    if (dragging !== null && dragging !== idx) {
      await move(dragging, idx);
    }
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
        <p className="text-xs text-muted-foreground">גרור או השתמש בחצים לשינוי הסדר</p>
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
                className={`
                  flex items-center gap-3 p-3 rounded-lg border bg-background cursor-grab active:cursor-grabbing
                  transition-all duration-150 select-none
                  ${isDragging ? "opacity-40 scale-95" : "opacity-100"}
                  ${isOver && !isDragging ? "border-purple-400 bg-purple-50 dark:bg-purple-950/40 scale-[1.02]" : "border-border"}
                `}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-xl shrink-0">{info.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{info.label}</p>
                  <p className="text-xs text-muted-foreground">{info.desc}</p>
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
