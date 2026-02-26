import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  Megaphone,
  Clock,
  Calendar,
  Palette,
  Image,
  Upload,
  X,
  Wallet,
  Timer,
  GripVertical,
  Eye,
  EyeOff,
  Tv,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import MemorialManager from "@/components/display/MemorialManager";
import PrayerTimesEditor from "@/components/display/PrayerTimesEditor";
import SlideOrderManager from "@/components/display/SlideOrderManager";

type DayType = "weekdays" | "friday" | "shabbat";
type StyleType = "traditional_gold" | "modern_dark" | "clean_white" | "royal_blue";

interface ScheduledAnnouncement {
  id: string;
  title: string;
  content: string;
  day_types: DayType[];
  start_time: string;
  end_time: string;
  style: StyleType;
  is_active: boolean;
  priority: number;
  image_url: string | null;
  duration_seconds: number | null;
  created_at: string;
}
interface TickerItem {
  id: string;
  text: string;
  is_active: boolean;
  order_index: number;
}

const DAY_TYPE_OPTIONS: { value: DayType; label: string }[] = [
  { value: "weekdays", label: "ימי חול (א׳-ה׳)" },
  { value: "friday", label: "יום שישי" },
  { value: "shabbat", label: "שבת" },
];
const DAY_TYPE_LABELS: Record<DayType, string> = { weekdays: "חול", friday: "שישי", shabbat: "שבת" };
const STYLE_LABELS: Record<StyleType, string> = {
  traditional_gold: "מסורתי זהב",
  modern_dark: "מודרני כהה",
  clean_white: "לבן נקי",
  royal_blue: "כחול מלכותי",
};
const STYLE_PREVIEWS: Record<StyleType, string> = {
  traditional_gold: "bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900 border-amber-400",
  modern_dark: "bg-gradient-to-br from-slate-800 to-slate-900 text-white border-slate-600",
  clean_white: "bg-white text-slate-800 border-slate-200",
  royal_blue: "bg-gradient-to-br from-blue-600 to-blue-800 text-white border-blue-400",
};
const defaultFormData = {
  title: "",
  content: "",
  day_types: ["weekdays"] as DayType[],
  start_time: "08:00",
  end_time: "22:00",
  style: "traditional_gold" as StyleType,
  priority: 0,
  image_url: null as string | null,
  duration_seconds: 10,
};

function isPrayerTimesTitle(t: string) {
  return t === "זמני תפילה" || t === "זמני תפילה שבת";
}
function getDefaultPrayerJson(title: string): string {
  if (title === "זמני תפילה שבת") {
    return JSON.stringify(
      {
        shabbat: {
          prayers: [
            { name: "קבלת שבת", time: "18:00" },
            { name: "שחרית", time: "08:30" },
            { name: "מנחה", time: "17:30" },
            { name: "ערבית", time: "19:15" },
          ],
          lessons: [],
        },
      },
      null,
      2,
    );
  }
  return JSON.stringify(
    {
      weekday: {
        prayers: [
          { name: "שחרית", time: "05:00" },
          { name: "מנחה", time: "17:00" },
          { name: "ערבית", time: "17:50" },
        ],
        lessons: [],
      },
      shabbat: { prayers: [{ name: "שחרית", time: "08:30" }], lessons: [] },
    },
    null,
    2,
  );
}

// ── hook לזיהוי נייד ──
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

// ── CollapsibleCard (נייד בלבד) ──
function CollapsibleCard({
  title,
  icon,
  subtitle,
  children,
  defaultOpen = false,
  accentClass = "border-gray-200",
}: {
  title: string;
  icon: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accentClass?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className={`${accentClass} overflow-hidden`}>
      <button type="button" className="w-full flex items-center gap-3 p-4 text-right" onClick={() => setOpen(!open)}>
        <div className="shrink-0">{icon}</div>
        <div className="flex-1 text-right">
          <p className="font-semibold text-base">{title}</p>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {open ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </Card>
  );
}

// ── TICKER SPEEDS ──
const TICKER_SPEEDS = [
  { label: "🐢 איטי", value: "slow" },
  { label: "🚶 בינוני", value: "medium" },
  { label: "🚀 מהיר", value: "fast" },
];

function TickerManager({ isMobile }: { isMobile: boolean }) {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [newText, setNewText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [speed, setSpeed] = useState("medium");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase.from("ticker_items").select("*").order("order_index", { ascending: true });
    if (data) setItems(data);
    setLoading(false);
  };
  const fetchSpeed = async () => {
    const { data } = await supabase.from("app_settings").select("value").eq("key", "ticker_speed").maybeSingle();
    if (data?.value) setSpeed(data.value);
  };
  useEffect(() => {
    fetchItems();
    fetchSpeed();
  }, []);

  const saveSpeed = async (val: string) => {
    setSpeed(val);
    const { data: ex } = await supabase.from("app_settings").select("id").eq("key", "ticker_speed").maybeSingle();
    if (ex) await supabase.from("app_settings").update({ value: val }).eq("key", "ticker_speed");
    else await supabase.from("app_settings").insert({ key: "ticker_speed", value: val });
    toast.success("מהירות עודכנה");
  };
  const addItem = async () => {
    if (!newText.trim()) return;
    setSaving(true);
    const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.order_index)) + 1 : 0;
    await supabase.from("ticker_items").insert({ text: newText.trim(), is_active: true, order_index: maxOrder });
    setNewText("");
    fetchItems();
    setSaving(false);
    toast.success("נוסף לטיקר");
  };
  const toggleItem = async (item: TickerItem) => {
    await supabase.from("ticker_items").update({ is_active: !item.is_active }).eq("id", item.id);
    fetchItems();
  };
  const deleteItem = async (id: string) => {
    await supabase.from("ticker_items").delete().eq("id", id);
    fetchItems();
    toast.success("נמחק");
  };
  const startEdit = (item: TickerItem) => {
    setEditingId(item.id);
    setEditText(item.text);
  };
  const saveEdit = async () => {
    if (!editingId || !editText.trim()) return;
    await supabase.from("ticker_items").update({ text: editText.trim() }).eq("id", editingId);
    setEditingId(null);
    setEditText("");
    fetchItems();
    toast.success("עודכן");
  };

  const inputH = isMobile ? "h-12 text-base" : "h-9 text-sm";
  const btnH = isMobile ? "h-12" : "h-9";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className={isMobile ? "text-base font-medium" : "text-sm font-medium"}>מהירות ריצה</Label>
        <div className="grid grid-cols-3 gap-2">
          {TICKER_SPEEDS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => saveSpeed(s.value)}
              className={`py-2.5 px-2 rounded-xl border font-medium transition-all active:scale-95 ${isMobile ? "text-base" : "text-sm"}
              ${speed === s.value ? "bg-orange-500 text-white border-orange-500 shadow-sm" : "bg-white border-orange-200 text-orange-700 hover:bg-orange-50"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder="הכנס עדכון חדש..."
          className={`flex-1 text-right ${inputH}`}
          dir="rtl"
        />
        <Button onClick={addItem} disabled={saving || !newText.trim()} className={`${btnH} px-4 shrink-0`}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {loading ? (
        <div className="text-center text-muted-foreground py-4 text-sm">טוען...</div>
      ) : items.length === 0 ? (
        <div className="text-center text-muted-foreground py-6 border-2 border-dashed border-orange-200 rounded-xl text-sm">
          אין עדכונים בטיקר
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border transition-all ${item.is_active ? "bg-white border-orange-200" : "bg-gray-50 border-gray-200 opacity-60"}`}
            >
              {editingId === item.id ? (
                <div className="p-3 space-y-2">
                  <Input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className={`text-right ${inputH}`}
                    dir="rtl"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit} className={`flex-1 ${btnH}`}>
                      שמור
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className={`flex-1 ${btnH}`}>
                      ביטול
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={`flex items-center gap-2 ${isMobile ? "p-3" : "p-2"}`}>
                  <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className={`flex-1 text-right truncate ${isMobile ? "text-base" : "text-sm"}`} dir="rtl">
                    {item.text}
                  </span>
                  <button
                    onClick={() => startEdit(item)}
                    className={`${isMobile ? "p-2.5" : "p-1.5"} rounded-lg text-blue-500 hover:bg-blue-50 shrink-0`}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleItem(item)}
                    className={`${isMobile ? "p-2.5" : "p-1.5"} rounded-lg shrink-0 ${item.is_active ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-100"}`}
                  >
                    {item.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className={`${isMobile ? "p-2.5" : "p-1.5"} rounded-lg text-red-400 hover:bg-red-50 shrink-0`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── טופס מודעה (משותף) ──
function AnnouncementForm({
  editingId,
  formData,
  setFormData,
  imageFile,
  setImageFile,
  imagePreview,
  setImagePreview,
  onClose,
  onSubmit,
  isPending,
  isUploading,
  isMobile,
}: {
  editingId: string | null;
  formData: typeof defaultFormData;
  setFormData: (d: typeof defaultFormData) => void;
  imageFile: File | null;
  setImageFile: (f: File | null) => void;
  imagePreview: string | null;
  setImagePreview: (s: string | null) => void;
  onClose: () => void;
  onSubmit: () => void;
  isPending: boolean;
  isUploading: boolean;
  isMobile: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputH = isMobile ? "h-12 text-base" : "h-9 text-sm";

  const handleTitleChange = (newTitle: string) => {
    const updates: Partial<typeof formData> = { title: newTitle };
    if (isPrayerTimesTitle(newTitle)) {
      try {
        JSON.parse(formData.content);
      } catch {
        updates.content = getDefaultPrayerJson(newTitle);
      }
    }
    if (newTitle === "זמני תפילה שבת" && !editingId) updates.day_types = ["friday", "shabbat"];
    else if (newTitle === "זמני תפילה" && !editingId) updates.day_types = ["weekdays", "friday"];
    setFormData({ ...formData, ...updates });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("קובץ גדול מדי");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 border">
        💡 כותרות מיוחדות: <strong>זמני תפילה</strong> · <strong>זמני תפילה שבת</strong>
      </div>
      <div className="space-y-1.5">
        <Label className={isMobile ? "text-base" : "text-sm"}>כותרת</Label>
        <Input
          value={formData.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="כותרת המודעה"
          required
          className={inputH}
        />
      </div>
      {isPrayerTimesTitle(formData.title) ? (
        <PrayerTimesEditor
          value={formData.content}
          onChange={(json) => setFormData({ ...formData, content: json })}
          mode={formData.title === "זמני תפילה שבת" ? "shabbat" : "both"}
        />
      ) : (
        <div className="space-y-1.5">
          <Label className={isMobile ? "text-base" : "text-sm"}>תוכן</Label>
          <Textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="תוכן המודעה"
            rows={3}
            required
            className={isMobile ? "text-base" : "text-sm"}
          />
        </div>
      )}
      <div className="space-y-1.5">
        <Label className={`flex items-center gap-2 ${isMobile ? "text-base" : "text-sm"}`}>
          <Calendar className="w-4 h-4" />
          ימי הצגה
        </Label>
        <div className="grid grid-cols-1 gap-2 p-3 border rounded-xl bg-muted/20">
          {DAY_TYPE_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center gap-3 py-0.5">
              <Checkbox
                id={`day-${option.value}`}
                checked={formData.day_types.includes(option.value)}
                onCheckedChange={(checked) => {
                  if (checked) setFormData({ ...formData, day_types: [...formData.day_types, option.value] });
                  else if (formData.day_types.length > 1)
                    setFormData({ ...formData, day_types: formData.day_types.filter((d) => d !== option.value) });
                }}
              />
              <Label htmlFor={`day-${option.value}`} className={`cursor-pointer ${isMobile ? "text-base" : "text-sm"}`}>
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className={`flex items-center gap-1 ${isMobile ? "text-base" : "text-sm"}`}>
            <Clock className="w-3 h-3" />
            התחלה
          </Label>
          <Input
            type="time"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            required
            className={inputH}
          />
        </div>
        <div className="space-y-1.5">
          <Label className={isMobile ? "text-base" : "text-sm"}>סיום</Label>
          <Input
            type="time"
            value={formData.end_time}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            required
            className={inputH}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className={`flex items-center gap-2 ${isMobile ? "text-base" : "text-sm"}`}>
          <Palette className="w-4 h-4" />
          סגנון
        </Label>
        <Select value={formData.style} onValueChange={(v: StyleType) => setFormData({ ...formData, style: v })}>
          <SelectTrigger className={inputH}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STYLE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border ${STYLE_PREVIEWS[value as StyleType]}`} />
                  {label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isPrayerTimesTitle(formData.title) && (
          <div className={`p-3 rounded-xl border-2 ${STYLE_PREVIEWS[formData.style]}`}>
            <p className="font-bold text-sm">{formData.title || "כותרת לדוגמה"}</p>
            <p className="text-xs opacity-90">{formData.content || "תוכן המודעה"}</p>
          </div>
        )}
      </div>
      {!isPrayerTimesTitle(formData.title) && (
        <div className="space-y-1.5">
          <Label className={`flex items-center gap-2 ${isMobile ? "text-base" : "text-sm"}`}>
            <Image className="w-4 h-4" />
            תמונה (אופציונלי)
          </Label>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          {imagePreview ? (
            <div className="relative">
              <img src={imagePreview} alt="" className="w-full h-28 object-cover rounded-xl border" />
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="absolute top-2 left-2 w-8 h-8"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                  setFormData({ ...formData, image_url: null });
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full h-20 border-dashed rounded-xl"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-1">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">העלה תמונה</span>
              </div>
            </Button>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className={isMobile ? "text-base" : "text-sm"}>עדיפות (0-100)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
            className={inputH}
          />
        </div>
        <div className="space-y-1.5">
          <Label className={`flex items-center gap-1 ${isMobile ? "text-base" : "text-sm"}`}>
            <Timer className="w-3 h-3" />
            שניות
          </Label>
          <Input
            type="number"
            min={3}
            max={120}
            value={formData.duration_seconds}
            onChange={(e) => setFormData({ ...formData, duration_seconds: parseInt(e.target.value) || 10 })}
            className={inputH}
          />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className={`flex-1 ${isMobile ? "h-12 text-base" : "h-9 text-sm"}`}
        >
          ביטול
        </Button>
        <Button
          type="submit"
          disabled={isPending || isUploading}
          className={`flex-1 ${isMobile ? "h-12 text-base" : "h-9 text-sm"}`}
        >
          {isUploading ? "מעלה..." : isPending ? "שומר..." : editingId ? "עדכן" : "הוסף"}
        </Button>
      </div>
    </form>
  );
}

// ── Main ──
export default function ManageAds() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showMemorial, setShowMemorial] = useState(true);
  const [synagogueName, setSynagogueName] = useState("");
  const [synagogueNameSaving, setSynagogueNameSaving] = useState(false);
  const [showHeichal, setShowHeichal] = useState(false);
  const [showFinance, setShowFinance] = useState(false);
  const [displayBgUrl, setDisplayBgUrl] = useState<string | null>(null);
  const [bgUploading, setBgUploading] = useState(false);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", [
          "show_memorial_on_display",
          "show_finance_on_display",
          "display_background_url",
          "show_heichal_on_display",
          "synagogue_name",
        ]);
      if (data) {
        for (const s of data) {
          if (s.key === "show_memorial_on_display") setShowMemorial(s.value !== "false");
          if (s.key === "show_finance_on_display") setShowFinance(s.value === "true");
          if (s.key === "display_background_url") setDisplayBgUrl(s.value || null);
          if (s.key === "show_heichal_on_display") setShowHeichal(s.value === "true");
          if (s.key === "synagogue_name") setSynagogueName(s.value || "");
        }
      }
    };
    fetchSettings();
  }, []);

  const upsertSetting = async (key: string, value: string) => {
    const { data: ex } = await supabase.from("app_settings").select("id").eq("key", key).maybeSingle();
    if (ex) await supabase.from("app_settings").update({ value }).eq("key", key);
    else await supabase.from("app_settings").insert({ key, value });
  };

  const saveSynagogueName = async (name: string) => {
    setSynagogueNameSaving(true);
    await upsertSetting("synagogue_name", name);
    setSynagogueNameSaving(false);
    toast.success("שם בית הכנסת עודכן");
  };
  const toggleMemorial = async (c: boolean) => {
    setShowMemorial(c);
    await upsertSetting("show_memorial_on_display", c ? "true" : "false");
    toast.success(c ? "אשכבות יוצגו" : "אשכבות הוסרו");
  };
  const toggleHeichal = async (c: boolean) => {
    setShowHeichal(c);
    await upsertSetting("show_heichal_on_display", c ? "true" : "false");
    toast.success(c ? "היכל ה׳ יוצג" : "היכל ה׳ הוסר");
  };
  const toggleFinance = async (c: boolean) => {
    setShowFinance(c);
    await upsertSetting("show_finance_on_display", c ? "true" : "false");
    toast.success(c ? "כספים יוצגו" : "כספים הוסרו");
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("קובץ גדול מדי (מקס 5MB)");
      return;
    }
    setBgUploading(true);
    try {
      const fileName = `background/${Date.now()}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage.from("announcement-images").upload(fileName, file);
      if (error) throw error;
      const {
        data: { publicUrl },
      } = supabase.storage.from("announcement-images").getPublicUrl(fileName);
      await upsertSetting("display_background_url", publicUrl);
      setDisplayBgUrl(publicUrl);
      toast.success("רקע עודכן");
    } catch {
      toast.error("שגיאה בהעלאה");
    } finally {
      setBgUploading(false);
      if (bgFileInputRef.current) bgFileInputRef.current.value = "";
    }
  };
  const handleRemoveBg = async () => {
    await upsertSetting("display_background_url", "");
    setDisplayBgUrl(null);
    toast.success("רקע הוסר");
  };

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["scheduled-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_announcements")
        .select("*")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ScheduledAnnouncement[];
    },
  });

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileName = `announcements/${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("announcement-images").upload(fileName, file);
    if (error) return null;
    const {
      data: { publicUrl },
    } = supabase.storage.from("announcement-images").getPublicUrl(fileName);
    return publicUrl;
  };

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      setIsUploading(true);
      let imageUrl = data.image_url;
      if (imageFile) {
        const url = await uploadImage(imageFile);
        if (url) imageUrl = url;
        else throw new Error("Upload failed");
      }
      const payload = {
        title: data.title,
        content: data.content,
        day_types: data.day_types,
        start_time: data.start_time,
        end_time: data.end_time,
        style: data.style,
        priority: data.priority,
        image_url: imageUrl,
        duration_seconds: data.duration_seconds,
      };
      if (data.id) {
        const { error } = await supabase.from("scheduled_announcements").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("scheduled_announcements").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-announcements"] });
      toast.success(editingId ? "עודכן" : "נוסף");
      handleCloseDialog();
    },
    onError: () => toast.error("שגיאה בשמירה"),
    onSettled: () => setIsUploading(false),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scheduled_announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-announcements"] });
      toast.success("נמחק");
    },
    onError: () => toast.error("שגיאה במחיקה"),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("scheduled_announcements").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-announcements"] });
    },
  });

  const handleEdit = (a: ScheduledAnnouncement) => {
    setEditingId(a.id);
    setFormData({
      title: a.title,
      content: a.content,
      day_types: a.day_types,
      start_time: a.start_time.slice(0, 5),
      end_time: a.end_time.slice(0, 5),
      style: a.style,
      priority: a.priority,
      image_url: a.image_url,
      duration_seconds: a.duration_seconds ?? 10,
    });
    setImagePreview(a.image_url);
    setImageFile(null);
    setIsDialogOpen(true);
  };
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData(defaultFormData);
    setImageFile(null);
    setImagePreview(null);
  };

  // ── פריסת מחשב: 2 עמודות ──
  if (!isMobile) {
    return (
      <div className="space-y-5 pb-8" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Megaphone className="w-6 h-6" />
              ניהול מודעות
            </h1>
            <p className="text-muted-foreground text-sm">נהל מודעות מתוזמנות, טיקר ותצוגות מסך</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingId(null);
                  setFormData(defaultFormData);
                }}
              >
                <Plus className="w-4 h-4 ml-2" />
                הוסף מודעה
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-right">{editingId ? "עריכת מודעה" : "מודעה חדשה"}</DialogTitle>
              </DialogHeader>
              <AnnouncementForm
                editingId={editingId}
                formData={formData}
                setFormData={setFormData}
                imageFile={imageFile}
                setImageFile={setImageFile}
                imagePreview={imagePreview}
                setImagePreview={setImagePreview}
                onClose={handleCloseDialog}
                onSubmit={() => saveMutation.mutate({ ...formData, id: editingId || undefined })}
                isPending={saveMutation.isPending}
                isUploading={isUploading}
                isMobile={false}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* עמודה שמאל: הגדרות */}
          <div className="space-y-4">
            {/* שם בית כנסת */}
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🕍</span>
                  <div>
                    <p className="font-semibold text-sm">שם בית הכנסת</p>
                    <p className="text-xs text-muted-foreground">יוצג בראש המסך</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={synagogueName}
                    onChange={(e) => setSynagogueName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveSynagogueName(synagogueName)}
                    placeholder="שם בית הכנסת"
                    className="flex-1 text-right h-9 text-sm"
                    dir="rtl"
                  />
                  <Button onClick={() => saveSynagogueName(synagogueName)} disabled={synagogueNameSaving} size="sm">
                    {synagogueNameSaving ? "..." : "שמור"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <MemorialManager
              showMemorial={showMemorial}
              onToggleMemorial={toggleMemorial}
              showHeichal={showHeichal}
              onToggleHeichal={toggleHeichal}
            />
            <SlideOrderManager />

            {/* כספים */}
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="font-semibold text-sm">מצב כספי</p>
                      <p className="text-xs text-muted-foreground">הצג הכנסות ויתרה</p>
                    </div>
                  </div>
                  <Switch checked={showFinance} onCheckedChange={toggleFinance} />
                </div>
              </CardContent>
            </Card>

            {/* רקע */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Image className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-semibold text-sm">רקע מסך תצוגה</p>
                    <p className="text-xs text-muted-foreground">תמונת רקע</p>
                  </div>
                </div>
                <input ref={bgFileInputRef} type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
                {displayBgUrl ? (
                  <div className="relative rounded-lg overflow-hidden border">
                    <img src={displayBgUrl} alt="רקע" className="w-full h-24 object-cover" />
                    <div className="absolute top-2 left-2 flex gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => bgFileInputRef.current?.click()}
                        disabled={bgUploading}
                        className="h-7 text-xs"
                      >
                        החלף
                      </Button>
                      <Button size="sm" variant="destructive" onClick={handleRemoveBg} className="h-7 text-xs">
                        הסר
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-14 border-dashed"
                    onClick={() => bgFileInputRef.current?.click()}
                    disabled={bgUploading}
                  >
                    <Upload className="w-4 h-4 ml-2 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{bgUploading ? "מעלה..." : "העלה תמונת רקע"}</span>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* טיקר */}
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Tv className="w-4 h-4 text-orange-500" />
                  טיקר תחתון
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <TickerManager isMobile={false} />
              </CardContent>
            </Card>
          </div>

          {/* עמודה ימין: מודעות */}
          <div>
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Megaphone className="w-4 h-4" />
                  מודעות ({announcements.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">טוען...</div>
                ) : announcements.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">אין מודעות עדיין</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {announcements.map((a) => (
                      <div key={a.id} className="p-3 space-y-2">
                        <div className="flex items-start gap-2">
                          {a.image_url && (
                            <img src={a.image_url} alt="" className="w-10 h-10 object-cover rounded-lg shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm">{a.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{a.content}</p>
                          </div>
                          <Switch
                            checked={a.is_active}
                            onCheckedChange={(c) => toggleActiveMutation.mutate({ id: a.id, is_active: c })}
                            className="shrink-0"
                          />
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {a.day_types.map((day) => (
                            <Badge key={day} variant="secondary" className="text-xs px-1.5 py-0">
                              {DAY_TYPE_LABELS[day]}
                            </Badge>
                          ))}
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            {a.start_time.slice(0, 5)}–{a.end_time.slice(0, 5)}
                          </Badge>
                        </div>
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(a)}
                            className="flex-1 h-8 text-xs"
                          >
                            <Edit className="w-3 h-3 ml-1" />
                            עריכה
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteMutation.mutate(a.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ── פריסת נייד: עמודה אחת + sticky button ──
  return (
    <div className="space-y-4 pb-28" dir="rtl">
      <div className="pt-2 pb-1">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Megaphone className="w-5 h-5" />
          ניהול מודעות
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">מודעות, טיקר והגדרות מסך</p>
      </div>

      {/* שם בית כנסת */}
      <CollapsibleCard
        title="שם בית הכנסת"
        icon={<span className="text-xl">🕍</span>}
        subtitle="יוצג בראש מסך התצוגה"
        accentClass="border-amber-200 bg-amber-50/40"
        defaultOpen
      >
        <div className="flex gap-2 pt-2">
          <Input
            value={synagogueName}
            onChange={(e) => setSynagogueName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveSynagogueName(synagogueName)}
            placeholder="שם בית הכנסת"
            className="flex-1 h-12 text-right text-base"
            dir="rtl"
          />
          <Button
            onClick={() => saveSynagogueName(synagogueName)}
            disabled={synagogueNameSaving}
            className="h-12 px-5 shrink-0 text-base"
          >
            {synagogueNameSaving ? "..." : "שמור"}
          </Button>
        </div>
      </CollapsibleCard>

      {/* אשכבות */}
      <Card className="border-gray-200 overflow-hidden">
        <MemorialManager
          showMemorial={showMemorial}
          onToggleMemorial={toggleMemorial}
          showHeichal={showHeichal}
          onToggleHeichal={toggleHeichal}
        />
      </Card>

      {/* סדר סליידים */}
      <CollapsibleCard
        title="סדר סליידים"
        icon={<GripVertical className="w-5 h-5 text-purple-500" />}
        subtitle="שנה את סדר הצגת הסליידים"
        accentClass="border-purple-200 bg-purple-50/30"
      >
        <div className="pt-2">
          <SlideOrderManager />
        </div>
      </CollapsibleCard>

      {/* טיקר */}
      <CollapsibleCard
        title="טיקר תחתון"
        icon={<Tv className="w-5 h-5 text-orange-500" />}
        subtitle="עדכונים שוטפים בתחתית המסך"
        accentClass="border-orange-200 bg-orange-50/30"
        defaultOpen
      >
        <div className="pt-2">
          <TickerManager isMobile={true} />
        </div>
      </CollapsibleCard>

      {/* כספים */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-blue-500" />
              <div>
                <p className="font-semibold text-base">מצב כספי</p>
                <p className="text-sm text-muted-foreground">הצג הכנסות ויתרה</p>
              </div>
            </div>
            <Switch checked={showFinance} onCheckedChange={toggleFinance} />
          </div>
        </CardContent>
      </Card>

      {/* רקע */}
      <CollapsibleCard
        title="רקע מסך תצוגה"
        icon={<Image className="w-5 h-5 text-gray-500" />}
        subtitle="תמונת רקע מאחורי התוכן"
        accentClass="border-gray-200"
      >
        <div className="pt-2">
          <input ref={bgFileInputRef} type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
          {displayBgUrl ? (
            <div className="relative rounded-xl overflow-hidden border">
              <img src={displayBgUrl} alt="רקע" className="w-full h-32 object-cover" />
              <div className="absolute top-2 left-2 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => bgFileInputRef.current?.click()}
                  disabled={bgUploading}
                  className="h-8 text-sm"
                >
                  החלף
                </Button>
                <Button size="sm" variant="destructive" onClick={handleRemoveBg} className="h-8 text-sm">
                  הסר
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full h-16 border-dashed"
              onClick={() => bgFileInputRef.current?.click()}
              disabled={bgUploading}
            >
              <Upload className="w-4 h-4 ml-2 text-muted-foreground" />
              <span className="text-base text-muted-foreground">{bgUploading ? "מעלה..." : "העלה תמונת רקע"}</span>
            </Button>
          )}
        </div>
      </CollapsibleCard>

      {/* מודעות */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="w-4 h-4" />
            מודעות ({announcements.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">טוען...</div>
          ) : announcements.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">אין מודעות עדיין</p>
            </div>
          ) : (
            <div className="divide-y">
              {announcements.map((a) => (
                <div key={a.id} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    {a.image_url && (
                      <img src={a.image_url} alt="" className="w-12 h-12 object-cover rounded-xl shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base leading-tight">{a.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{a.content}</p>
                    </div>
                    <Switch
                      checked={a.is_active}
                      onCheckedChange={(c) => toggleActiveMutation.mutate({ id: a.id, is_active: c })}
                      className="shrink-0 mt-0.5"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {a.day_types.map((day) => (
                      <Badge key={day} variant="secondary" className="text-sm px-2 py-0.5">
                        {DAY_TYPE_LABELS[day]}
                      </Badge>
                    ))}
                    <Badge variant="outline" className="text-sm px-2 py-0.5">
                      {a.start_time.slice(0, 5)}–{a.end_time.slice(0, 5)}
                    </Badge>
                    {!a.is_active && (
                      <Badge variant="outline" className="text-sm text-muted-foreground">
                        מושהה
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(a)}
                      className="flex-1 h-11 text-base rounded-xl"
                    >
                      <Edit className="w-4 h-4 ml-1" />
                      עריכה
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(a.id)}
                      className="h-11 w-11 rounded-xl p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* כפתור הוסף — sticky תחתית */}
      <div className="fixed bottom-0 right-0 left-0 p-3 bg-background/95 backdrop-blur-sm border-t z-40">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="w-full h-14 text-base font-semibold rounded-2xl shadow-lg"
              onClick={() => {
                setEditingId(null);
                setFormData(defaultFormData);
              }}
            >
              <Plus className="w-5 h-5 ml-2" />
              הוסף מודעה חדשה
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right text-lg">{editingId ? "עריכת מודעה" : "מודעה חדשה"}</DialogTitle>
            </DialogHeader>
            <AnnouncementForm
              editingId={editingId}
              formData={formData}
              setFormData={setFormData}
              imageFile={imageFile}
              setImageFile={setImageFile}
              imagePreview={imagePreview}
              setImagePreview={setImagePreview}
              onClose={handleCloseDialog}
              onSubmit={() => saveMutation.mutate({ ...formData, id: editingId || undefined })}
              isPending={saveMutation.isPending}
              isUploading={isUploading}
              isMobile={true}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
