import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  { value: "weekdays", label: "ימי חול (א'-ה')" },
  { value: "friday", label: "יום שישי" },
  { value: "shabbat", label: "שבת" },
];

const DAY_TYPE_LABELS: Record<DayType, string> = {
  weekdays: "ימי חול",
  friday: "שישי",
  shabbat: "שבת",
};

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

function isPrayerTimesTitle(title: string): boolean {
  return title === "זמני תפילה" || title === "זמני תפילה שבת";
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

// ── TickerManager ──────────────────────────────────────────────
const TICKER_SPEEDS = [
  { label: "🐢 איטי", value: "slow", seconds: 60 },
  { label: "🚶 בינוני", value: "medium", seconds: 35 },
  { label: "🚀 מהיר", value: "fast", seconds: 18 },
];

function TickerManager() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [newText, setNewText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [speed, setSpeed] = useState("medium");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("ticker_items").select("*").order("order_index", { ascending: true });
    if (!error && data) setItems(data);
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
    const { data: existing } = await supabase.from("app_settings").select("id").eq("key", "ticker_speed").maybeSingle();
    if (existing) await supabase.from("app_settings").update({ value: val }).eq("key", "ticker_speed");
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

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Tv className="w-5 h-5 text-orange-500" />
          טיקר תחתון — עדכוני מערכת
        </CardTitle>
        <p className="text-xs text-muted-foreground">טקסט רץ שמוצג בתחתית מסך התצוגה בכל העמודים</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* מהירות */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">מהירות ריצה</Label>
          <div className="grid grid-cols-3 gap-2">
            {TICKER_SPEEDS.map((s) => (
              <button
                key={s.value}
                onClick={() => saveSpeed(s.value)}
                className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all ${
                  speed === s.value
                    ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                    : "bg-white border-orange-200 text-orange-700 hover:bg-orange-50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* הוספה */}
        <div className="flex gap-2">
          <Input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            placeholder="הכנס עדכון חדש..."
            className="flex-1 min-h-[48px] text-right"
            dir="rtl"
          />
          <Button onClick={addItem} disabled={saving || !newText.trim()} className="min-h-[48px] shrink-0">
            <Plus className="w-4 h-4 ml-1" />
            הוסף
          </Button>
        </div>

        {/* רשימה */}
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
                  /* מצב עריכה */
                  <div className="p-3 space-y-2">
                    <Input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="min-h-[44px] text-right"
                      dir="rtl"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit} className="flex-1 min-h-[40px] text-sm">
                        שמור
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(null)}
                        className="flex-1 min-h-[40px] text-sm"
                      >
                        ביטול
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* מצב תצוגה */
                  <div className="flex items-center gap-2 p-3">
                    <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm text-right truncate" dir="rtl">
                      {item.text}
                    </span>
                    <button
                      onClick={() => startEdit(item)}
                      className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors shrink-0"
                      title="עריכה"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleItem(item)}
                      className={`p-2 rounded-lg transition-colors shrink-0 ${item.is_active ? "text-green-600 hover:bg-green-100" : "text-gray-400 hover:bg-gray-100"}`}
                      title={item.is_active ? "הסתר" : "הצג"}
                    >
                      {item.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-100 transition-colors shrink-0"
                      title="מחק"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
// ──────────────────────────────────────────────────────────────

export default function ManageAds() {
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        for (const setting of data) {
          if (setting.key === "show_memorial_on_display") setShowMemorial(setting.value !== "false");
          if (setting.key === "show_finance_on_display") setShowFinance(setting.value === "true");
          if (setting.key === "display_background_url") setDisplayBgUrl(setting.value || null);
          if (setting.key === "show_heichal_on_display") setShowHeichal(setting.value === "true");
          if (setting.key === "synagogue_name") setSynagogueName(setting.value || "");
        }
      }
    };
    fetchSettings();
  }, []);

  const upsertSetting = async (key: string, value: string) => {
    const { data: existing } = await supabase.from("app_settings").select("id").eq("key", key).maybeSingle();
    if (existing) {
      await supabase.from("app_settings").update({ value }).eq("key", key);
    } else {
      await supabase.from("app_settings").insert({ key, value });
    }
  };

  const saveSynagogueName = async (name: string) => {
    setSynagogueNameSaving(true);
    await upsertSetting("synagogue_name", name);
    setSynagogueNameSaving(false);
    toast.success("שם בית הכנסת עודכן");
  };

  const toggleMemorial = async (checked: boolean) => {
    setShowMemorial(checked);
    await upsertSetting("show_memorial_on_display", checked ? "true" : "false");
    toast.success(checked ? "אשכבות יוצגו" : "אשכבות הוסרו");
  };
  const toggleHeichal = async (checked: boolean) => {
    setShowHeichal(checked);
    await upsertSetting("show_heichal_on_display", checked ? "true" : "false");
    toast.success(checked ? "היכל ה׳ יוצג" : "היכל ה׳ הוסר");
  };
  const toggleFinance = async (checked: boolean) => {
    setShowFinance(checked);
    await upsertSetting("show_finance_on_display", checked ? "true" : "false");
    toast.success(checked ? "כספים יוצגו" : "כספים הוסרו");
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
      toast.success("עודכן");
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

  return (
    <div className="space-y-5 pb-8" dir="rtl">
      {/* כותרת */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="w-6 h-6" />
          ניהול מודעות
        </h1>
        <p className="text-muted-foreground text-sm">נהל מודעות מתוזמנות, טיקר ותצוגות מסך</p>
      </div>

      {/* שם בית כנסת */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xl">🕍</span>
            <div>
              <p className="font-semibold text-sm">שם בית הכנסת</p>
              <p className="text-xs text-muted-foreground">יוצג בפינה הימנית העליונה של המסך</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              value={synagogueName}
              onChange={(e) => setSynagogueName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveSynagogueName(synagogueName)}
              placeholder="לדוגמה: בית כנסת אור החיים"
              className="flex-1 min-h-[48px] text-right"
              dir="rtl"
            />
            <Button
              onClick={() => saveSynagogueName(synagogueName)}
              disabled={synagogueNameSaving}
              className="min-h-[48px] shrink-0"
            >
              {synagogueNameSaving ? "שומר..." : "שמור"}
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

      {/* טיקר */}
      <TickerManager />

      {/* כספים */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-blue-500" />
              <div>
                <p className="font-semibold text-sm">תצוגת מצב כספי</p>
                <p className="text-xs text-muted-foreground">הצג הכנסות, הוצאות ויתרה</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">הצג</span>
              <Switch checked={showFinance} onCheckedChange={toggleFinance} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* רקע */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Image className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-semibold text-sm">רקע מסך תצוגה</p>
              <p className="text-xs text-muted-foreground">תמונת רקע מאחורי התוכן</p>
            </div>
          </div>
          <input ref={bgFileInputRef} type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
          {displayBgUrl ? (
            <div className="relative rounded-lg overflow-hidden border">
              <img src={displayBgUrl} alt="רקע" className="w-full h-28 object-cover" />
              <div className="absolute top-2 left-2 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => bgFileInputRef.current?.click()}
                  disabled={bgUploading}
                  className="h-8 text-xs"
                >
                  החלף
                </Button>
                <Button size="sm" variant="destructive" onClick={handleRemoveBg} className="h-8 text-xs">
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
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{bgUploading ? "מעלה..." : "העלה תמונת רקע"}</span>
              </div>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* כפתור הוסף מודעה */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            className="w-full min-h-[48px] text-base"
            onClick={() => {
              setEditingId(null);
              setFormData(defaultFormData);
            }}
          >
            <Plus className="w-5 h-5 ml-2" />
            הוסף מודעה חדשה
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? "עריכת מודעה" : "הוספת מודעה חדשה"}</DialogTitle>
          </DialogHeader>
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 border">
            💡 כותרות מיוחדות: <strong>זמני תפילה</strong> · <strong>זמני תפילה שבת</strong>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate({ ...formData, id: editingId || undefined });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>כותרת</Label>
              <Input
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="כותרת המודעה"
                required
                className="min-h-[44px]"
              />
            </div>

            {isPrayerTimesTitle(formData.title) ? (
              <PrayerTimesEditor
                value={formData.content}
                onChange={(json) => setFormData({ ...formData, content: json })}
                mode={formData.title === "זמני תפילה שבת" ? "shabbat" : "both"}
              />
            ) : (
              <div className="space-y-2">
                <Label>תוכן</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="תוכן המודעה"
                  rows={3}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                ימי הצגה
              </Label>
              <div className="grid grid-cols-1 gap-2 p-3 border rounded-lg">
                {DAY_TYPE_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`day-${option.value}`}
                      checked={formData.day_types.includes(option.value)}
                      onCheckedChange={(checked) => {
                        if (checked) setFormData({ ...formData, day_types: [...formData.day_types, option.value] });
                        else if (formData.day_types.length > 1)
                          setFormData({ ...formData, day_types: formData.day_types.filter((d) => d !== option.value) });
                      }}
                    />
                    <Label htmlFor={`day-${option.value}`} className="cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  התחלה
                </Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-2">
                <Label>סיום</Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  required
                  className="min-h-[44px]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                סגנון
              </Label>
              <Select value={formData.style} onValueChange={(v: StyleType) => setFormData({ ...formData, style: v })}>
                <SelectTrigger className="min-h-[44px]">
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
                <div className={`p-3 rounded-lg border-2 ${STYLE_PREVIEWS[formData.style]}`}>
                  <p className="font-bold">{formData.title || "כותרת לדוגמה"}</p>
                  <p className="text-sm opacity-90">{formData.content || "תוכן המודעה"}</p>
                </div>
              )}
            </div>

            {!isPrayerTimesTitle(formData.title) && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  תמונה (אופציונלי)
                </Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="" className="w-full h-28 object-cover rounded-lg border" />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 left-2 w-7 h-7"
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
                    className="w-full h-20 border-dashed"
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
              <div className="space-y-2">
                <Label>עדיפות (0-100)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  שניות הצגה
                </Label>
                <Input
                  type="number"
                  min={3}
                  max={120}
                  value={formData.duration_seconds}
                  onChange={(e) => setFormData({ ...formData, duration_seconds: parseInt(e.target.value) || 10 })}
                  className="min-h-[44px]"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end sticky bottom-0 bg-background pt-2 pb-1">
              <Button type="button" variant="outline" onClick={handleCloseDialog} className="min-h-[48px] flex-1">
                ביטול
              </Button>
              <Button type="submit" disabled={saveMutation.isPending || isUploading} className="min-h-[48px] flex-1">
                {isUploading ? "מעלה..." : saveMutation.isPending ? "שומר..." : editingId ? "עדכן" : "הוסף"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* רשימת מודעות */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">מודעות ({announcements.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">טוען...</div>
          ) : announcements.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">אין מודעות. לחץ "הוסף מודעה" כדי להתחיל.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {announcements.map((a) => (
                <div key={a.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    {a.image_url && (
                      <img src={a.image_url} alt="" className="w-14 h-14 object-cover rounded-lg shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">{a.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{a.content}</p>
                    </div>
                    <Switch
                      checked={a.is_active}
                      onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: a.id, is_active: checked })}
                      className="shrink-0"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className={`text-xs ${STYLE_PREVIEWS[a.style]}`}>
                      {STYLE_LABELS[a.style]}
                    </Badge>
                    {a.day_types.map((day) => (
                      <Badge key={day} variant="outline" className="text-xs">
                        {DAY_TYPE_LABELS[day]}
                      </Badge>
                    ))}
                    <Badge variant="secondary" className="text-xs">
                      {a.start_time.slice(0, 5)} - {a.end_time.slice(0, 5)}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(a)}
                      className="flex-1 min-h-[44px] text-sm"
                    >
                      <Edit className="w-4 h-4 ml-1" />
                      עריכה
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(a.id)}
                      className="min-h-[44px] px-4"
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
    </div>
  );
}
