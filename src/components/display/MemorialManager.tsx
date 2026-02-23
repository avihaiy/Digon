import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Flame, Star } from "lucide-react";

interface MemorialName {
  id: string;
  deceased_name: string;
  father_name: string;
  is_male: boolean | null;
  hebrew_death_day: number;
  hebrew_death_month: number;
  is_active: boolean | null;
  notes: string | null;
  family_member_id: string | null;
}

interface HeichalName {
  id: string;
  name: string;
  father_name: string | null;
  is_male: boolean | null;
  hebrew_day: number;
  hebrew_month: number;
  is_active: boolean | null;
}

const HEBREW_MONTHS = [
  { value: 1, label: "ניסן" },
  { value: 2, label: "אייר" },
  { value: 3, label: "סיוון" },
  { value: 4, label: "תמוז" },
  { value: 5, label: "אב" },
  { value: 6, label: "אלול" },
  { value: 7, label: "תשרי" },
  { value: 8, label: "חשוון" },
  { value: 9, label: "כסלו" },
  { value: 10, label: "טבת" },
  { value: 11, label: "שבט" },
  { value: 12, label: "אדר" },
  { value: 13, label: "אדר ב'" },
];

const MONTH_LABELS: Record<number, string> = Object.fromEntries(HEBREW_MONTHS.map((m) => [m.value, m.label]));

const HEBREW_DAY_LABELS: Record<number, string> = {
  1: "א'",
  2: "ב'",
  3: "ג'",
  4: "ד'",
  5: "ה'",
  6: "ו'",
  7: "ז'",
  8: "ח'",
  9: "ט'",
  10: "י'",
  11: 'י"א',
  12: 'י"ב',
  13: 'י"ג',
  14: 'י"ד',
  15: 'ט"ו',
  16: 'ט"ז',
  17: 'י"ז',
  18: 'י"ח',
  19: 'י"ט',
  20: "כ'",
  21: 'כ"א',
  22: 'כ"ב',
  23: 'כ"ג',
  24: 'כ"ד',
  25: 'כ"ה',
  26: 'כ"ו',
  27: 'כ"ז',
  28: 'כ"ח',
  29: 'כ"ט',
  30: "ל'",
};

const HEBREW_DAYS = Array.from({ length: 30 }, (_, i) => ({ value: i + 1, label: HEBREW_DAY_LABELS[i + 1] }));

const defaultMemorialForm = {
  deceased_name: "",
  father_name: "",
  is_male: true,
  hebrew_death_day: 1,
  hebrew_death_month: 7,
  notes: "",
};
const defaultHeichalForm = { name: "", father_name: "", is_male: true, hebrew_day: 1, hebrew_month: 7 };

interface MemorialManagerProps {
  showMemorial: boolean;
  onToggleMemorial: (checked: boolean) => void;
  showHeichal: boolean;
  onToggleHeichal: (checked: boolean) => void;
}

const saveSetting = async (key: string, value: string) => {
  const { data: existing } = await supabase.from("app_settings").select("id").eq("key", key).maybeSingle();
  if (existing) {
    await supabase.from("app_settings").update({ value }).eq("key", key);
  } else {
    await supabase.from("app_settings").insert({ key, value });
  }
};

export default function MemorialManager({
  showMemorial,
  onToggleMemorial,
  showHeichal,
  onToggleHeichal,
}: MemorialManagerProps) {
  const queryClient = useQueryClient();

  // Memorial state
  const [isMemorialOpen, setIsMemorialOpen] = useState(false);
  const [editingMemorialId, setEditingMemorialId] = useState<string | null>(null);
  const [memorialForm, setMemorialForm] = useState(defaultMemorialForm);
  const [showWeekBefore, setShowWeekBefore] = useState(false);

  // Heichal state
  const [isHeichalOpen, setIsHeichalOpen] = useState(false);
  const [editingHeichalId, setEditingHeichalId] = useState<string | null>(null);
  const [heichalForm, setHeichalForm] = useState(defaultHeichalForm);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "memorial_show_week_before")
        .maybeSingle();
      if (data) setShowWeekBefore(data.value === "true");
    };
    fetch();
  }, []);

  const toggleWeekBefore = async (checked: boolean) => {
    setShowWeekBefore(checked);
    await saveSetting("memorial_show_week_before", checked ? "true" : "false");
    toast.success(checked ? "תצוגת שבוע לפני אזכרה הופעלה" : "תצוגת שבוע לפני אזכרה כובתה");
  };

  // ===== Memorial queries =====
  const { data: memorials = [], isLoading: memorialsLoading } = useQuery({
    queryKey: ["memorial-names-manage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memorial_names")
        .select("*")
        .order("hebrew_death_month")
        .order("hebrew_death_day");
      if (error) throw error;
      return data as MemorialName[];
    },
  });

  const saveMemorialMutation = useMutation({
    mutationFn: async (data: typeof memorialForm & { id?: string }) => {
      const payload = {
        deceased_name: data.deceased_name,
        father_name: data.father_name,
        is_male: data.is_male,
        hebrew_death_day: data.hebrew_death_day,
        hebrew_death_month: data.hebrew_death_month,
        notes: data.notes || null,
      };
      if (data.id) {
        const { error } = await supabase.from("memorial_names").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("memorial_names").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memorial-names-manage"] });
      toast.success(editingMemorialId ? "הנפטר עודכן" : "הנפטר נוסף");
      closeMemorial();
    },
    onError: () => toast.error("שגיאה בשמירה"),
  });

  const deleteMemorialMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("memorial_names").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memorial-names-manage"] });
      toast.success("הנפטר נמחק");
    },
    onError: () => toast.error("שגיאה במחיקה"),
  });

  const toggleMemorialActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("memorial_names").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["memorial-names-manage"] }),
    onError: () => toast.error("שגיאה בעדכון"),
  });

  const closeMemorial = () => {
    setIsMemorialOpen(false);
    setEditingMemorialId(null);
    setMemorialForm(defaultMemorialForm);
  };
  const handleEditMemorial = (m: MemorialName) => {
    setEditingMemorialId(m.id);
    setMemorialForm({
      deceased_name: m.deceased_name,
      father_name: m.father_name,
      is_male: m.is_male !== false,
      hebrew_death_day: m.hebrew_death_day,
      hebrew_death_month: m.hebrew_death_month,
      notes: m.notes || "",
    });
    setIsMemorialOpen(true);
  };

  // ===== Heichal queries =====
  const { data: heichalNames = [], isLoading: heichalLoading } = useQuery({
    queryKey: ["heichal-names-manage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("heichal_names")
        .select("*")
        .order("hebrew_month")
        .order("hebrew_day");
      if (error) throw error;
      return data as HeichalName[];
    },
  });

  const saveHeichalMutation = useMutation({
    mutationFn: async (data: typeof heichalForm & { id?: string }) => {
      const payload = {
        name: data.name,
        father_name: data.father_name || null,
        is_male: data.is_male,
        hebrew_day: data.hebrew_day,
        hebrew_month: data.hebrew_month,
      };
      if (data.id) {
        const { error } = await supabase.from("heichal_names").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("heichal_names").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["heichal-names-manage"] });
      toast.success(editingHeichalId ? "השם עודכן" : "השם נוסף להיכל");
      closeHeichal();
    },
    onError: () => toast.error("שגיאה בשמירה"),
  });

  const deleteHeichalMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("heichal_names").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["heichal-names-manage"] });
      toast.success("השם נמחק");
    },
    onError: () => toast.error("שגיאה במחיקה"),
  });

  const closeHeichal = () => {
    setIsHeichalOpen(false);
    setEditingHeichalId(null);
    setHeichalForm(defaultHeichalForm);
  };
  const handleEditHeichal = (h: HeichalName) => {
    setEditingHeichalId(h.id);
    setHeichalForm({
      name: h.name,
      father_name: h.father_name || "",
      is_male: h.is_male !== false,
      hebrew_day: h.hebrew_day,
      hebrew_month: h.hebrew_month,
    });
    setIsHeichalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* ===== כרטיס אשכבות ===== */}
      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Flame className="w-5 h-5 text-amber-500" />
              <div>
                <p className="font-semibold text-sm">ניהול אשכבות</p>
                <p className="text-xs text-muted-foreground">
                  {memorials.filter((m) => m.is_active).length} נפטרים פעילים
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">אזכרות (לפי תאריך)</span>
                <Switch checked={showMemorial} onCheckedChange={onToggleMemorial} />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">הצג שבוע לפני</span>
                <Switch checked={showWeekBefore} onCheckedChange={toggleWeekBefore} />
              </div>
            </div>
          </div>

          <Dialog open={isMemorialOpen} onOpenChange={setIsMemorialOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingMemorialId(null);
                  setMemorialForm(defaultMemorialForm);
                }}
                className="w-full sm:w-auto min-h-[44px]"
              >
                <Plus className="w-4 h-4 ml-1" />
                הוסף נפטר
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle>{editingMemorialId ? "עריכת נפטר" : "הוספת נפטר"}</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveMemorialMutation.mutate({ ...memorialForm, id: editingMemorialId || undefined });
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>שם הנפטר/ת</Label>
                  <Input
                    value={memorialForm.deceased_name}
                    onChange={(e) => setMemorialForm({ ...memorialForm, deceased_name: e.target.value })}
                    placeholder="שם הנפטר"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>שם האב</Label>
                  <Input
                    value={memorialForm.father_name}
                    onChange={(e) => setMemorialForm({ ...memorialForm, father_name: e.target.value })}
                    placeholder="שם האב"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>מין</Label>
                  <Select
                    value={memorialForm.is_male ? "male" : "female"}
                    onValueChange={(v) => setMemorialForm({ ...memorialForm, is_male: v === "male" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">זכר (בן)</SelectItem>
                      <SelectItem value="female">נקבה (בת)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>יום עברי</Label>
                    <Select
                      value={String(memorialForm.hebrew_death_day)}
                      onValueChange={(v) => setMemorialForm({ ...memorialForm, hebrew_death_day: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HEBREW_DAYS.map((d) => (
                          <SelectItem key={d.value} value={String(d.value)}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>חודש עברי</Label>
                    <Select
                      value={String(memorialForm.hebrew_death_month)}
                      onValueChange={(v) => setMemorialForm({ ...memorialForm, hebrew_death_month: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HEBREW_MONTHS.map((m) => (
                          <SelectItem key={m.value} value={String(m.value)}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>הערות (אופציונלי)</Label>
                  <Input
                    value={memorialForm.notes}
                    onChange={(e) => setMemorialForm({ ...memorialForm, notes: e.target.value })}
                    placeholder="הערות"
                  />
                </div>
                <div className="flex gap-2 justify-end sticky bottom-0 bg-background pt-2">
                  <Button type="button" variant="outline" onClick={closeMemorial} className="min-h-[44px]">
                    ביטול
                  </Button>
                  <Button type="submit" disabled={saveMemorialMutation.isPending} className="min-h-[44px]">
                    {saveMemorialMutation.isPending ? "שומר..." : editingMemorialId ? "עדכן" : "הוסף"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {memorialsLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">טוען...</p>
          ) : memorials.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">אין נפטרים ברשימה</p>
          ) : (
            <div className="divide-y divide-border rounded-lg border overflow-hidden">
              {memorials.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 flex items-center justify-between gap-2 ${!m.is_active ? "opacity-50" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {m.deceased_name} {m.is_male !== false ? "בן" : "בת"} {m.father_name}
                    </p>
                    <div className="flex gap-1.5 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {HEBREW_DAY_LABELS[m.hebrew_death_day] || m.hebrew_death_day}{" "}
                        {MONTH_LABELS[m.hebrew_death_month] || ""}
                      </Badge>
                      {m.notes && (
                        <Badge variant="secondary" className="text-xs truncate max-w-[120px]">
                          {m.notes}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Switch
                      checked={m.is_active !== false}
                      onCheckedChange={(checked) =>
                        toggleMemorialActiveMutation.mutate({ id: m.id, is_active: checked })
                      }
                    />
                    <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => handleEditMemorial(m)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-destructive"
                      onClick={() => deleteMemorialMutation.mutate(m.id)}
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

      {/* ===== כרטיס היכל ה' ===== */}
      <Card className="border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/20 dark:border-yellow-800">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="font-semibold text-sm">היכל ה׳ — לזכרון עולם</p>
                <p className="text-xs text-muted-foreground">{heichalNames.length} שמות ברשימה</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">הצג על המסך</span>
              <Switch checked={showHeichal} onCheckedChange={onToggleHeichal} />
            </div>
          </div>

          <Dialog open={isHeichalOpen} onOpenChange={setIsHeichalOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingHeichalId(null);
                  setHeichalForm(defaultHeichalForm);
                }}
                className="w-full sm:w-auto min-h-[44px]"
              >
                <Plus className="w-4 h-4 ml-1" />
                הוסף שם להיכל
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle>{editingHeichalId ? "עריכת שם" : "הוספת שם להיכל ה'"}</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveHeichalMutation.mutate({ ...heichalForm, id: editingHeichalId || undefined });
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>שם הנפטר/ת</Label>
                  <Input
                    value={heichalForm.name}
                    onChange={(e) => setHeichalForm({ ...heichalForm, name: e.target.value })}
                    placeholder="לדוגמה: יצחק"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>שם האב</Label>
                  <Input
                    value={heichalForm.father_name}
                    onChange={(e) => setHeichalForm({ ...heichalForm, father_name: e.target.value })}
                    placeholder="לדוגמה: אברהם"
                  />
                </div>
                <div className="space-y-2">
                  <Label>מין</Label>
                  <Select
                    value={heichalForm.is_male ? "male" : "female"}
                    onValueChange={(v) => setHeichalForm({ ...heichalForm, is_male: v === "male" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">זכר (ר')</SelectItem>
                      <SelectItem value="female">נקבה (מרת)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>יום פטירה (עברי)</Label>
                    <Select
                      value={String(heichalForm.hebrew_day)}
                      onValueChange={(v) => setHeichalForm({ ...heichalForm, hebrew_day: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HEBREW_DAYS.map((d) => (
                          <SelectItem key={d.value} value={String(d.value)}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>חודש פטירה (עברי)</Label>
                    <Select
                      value={String(heichalForm.hebrew_month)}
                      onValueChange={(v) => setHeichalForm({ ...heichalForm, hebrew_month: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HEBREW_MONTHS.map((m) => (
                          <SelectItem key={m.value} value={String(m.value)}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 justify-end sticky bottom-0 bg-background pt-2">
                  <Button type="button" variant="outline" onClick={closeHeichal} className="min-h-[44px]">
                    ביטול
                  </Button>
                  <Button type="submit" disabled={saveHeichalMutation.isPending} className="min-h-[44px]">
                    {saveHeichalMutation.isPending ? "שומר..." : editingHeichalId ? "עדכן" : "הוסף"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {heichalLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">טוען...</p>
          ) : heichalNames.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">אין שמות — לחץ "הוסף שם להיכל"</p>
          ) : (
            <div className="divide-y divide-border rounded-lg border overflow-hidden">
              {heichalNames.map((h) => (
                <div key={h.id} className="p-3 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {h.is_male !== false ? "ר'" : "מרת"} {h.name} ז״ל
                    </p>
                    <div className="flex gap-1.5 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {h.is_male !== false ? "בן" : "בת"} {h.father_name}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {HEBREW_DAY_LABELS[h.hebrew_day]} {MONTH_LABELS[h.hebrew_month]}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => handleEditHeichal(h)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-destructive"
                      onClick={() => deleteHeichalMutation.mutate(h.id)}
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
