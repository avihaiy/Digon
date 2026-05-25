import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Printer, Save, ArrowRight, Image as ImageIcon, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { getCurrentParasha, getShabbatTimes, formatTimeOnly } from "@/lib/hebrew-utils";

interface PosterRow {
  id: string;
  label: string;
  time: string;
  isHeader?: boolean;
}

interface PosterData {
  synagogueName: string;
  subtitle: string;
  title: string;
  parasha: string;
  rows: PosterRow[];
  footer: string;
  bottomImage?: string | null;
}

const DEFAULT_SHABBAT: PosterData = {
  synagogueName: 'בית הכנסת "ברית שלום"',
  subtitle: "רח' קדושי קהיר עכו",
  title: "זמני תפילות השבת",
  parasha: "",
  rows: [
    { id: "1", label: "כניסת השבת", time: "19:01" },
    { id: "2", label: "מנחה ערב שבת", time: "18:50" },
    { id: "3", label: "שחרית של שבת", time: "07:30" },
    { id: "4", label: "שיעור תורה", time: "18:00" },
    { id: "5", label: "מנחה של שבת", time: "19:00" },
    { id: "6", label: "סעודה שלישית", time: "", isHeader: true },
    { id: "7", label: 'ערבית מוצ"ש', time: "20:00" },
    { id: "8", label: "יציאת שבת", time: "20:14" },
  ],
  footer: "שבת שלום",
  bottomImage: null,
};

const DEFAULT_WEEKDAY: PosterData = {
  synagogueName: 'בית הכנסת "ברית שלום"',
  subtitle: "רח' קדושי קהיר עכו",
  title: "זמני תפילות יום חול",
  parasha: "",
  rows: [
    { id: "1", label: "שחרית", time: "06:00" },
    { id: "2", label: "מנחה", time: "18:30" },
    { id: "3", label: "ערבית", time: "19:15" },
    { id: "4", label: "שיעור תורה", time: "20:00" },
  ],
  footer: "",
  bottomImage: null,
};

function loadData(key: string, fallback: PosterData): PosterData {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return { ...fallback, ...JSON.parse(raw) };
  } catch (e) { /* ignore */ }
  return fallback;
}

export default function PrayerPoster() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"shabbat" | "weekday">("shabbat");
  const [shabbatData, setShabbatData] = useState<PosterData>(() => loadData("poster-shabbat", DEFAULT_SHABBAT));
  const [weekdayData, setWeekdayData] = useState<PosterData>(() => loadData("poster-weekday", DEFAULT_WEEKDAY));

  const data = tab === "shabbat" ? shabbatData : weekdayData;
  const setData = tab === "shabbat" ? setShabbatData : setWeekdayData;

  // Load synagogue name from settings (default suggestion only)
  const { data: synagogueName } = useQuery({
    queryKey: ["app-settings-synagogue-name"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "synagogue_name").single();
      return data?.value || null;
    },
  });

  useEffect(() => {
    if (synagogueName && shabbatData.synagogueName === DEFAULT_SHABBAT.synagogueName) {
      setShabbatData((d) => ({ ...d, synagogueName: `בית הכנסת "${synagogueName}"` }));
    }
    if (synagogueName && weekdayData.synagogueName === DEFAULT_WEEKDAY.synagogueName) {
      setWeekdayData((d) => ({ ...d, synagogueName: `בית הכנסת "${synagogueName}"` }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [synagogueName]);

  // Auto-suggest parasha for shabbat
  useEffect(() => {
    if (!shabbatData.parasha) {
      setShabbatData((d) => ({ ...d, parasha: getCurrentParasha() }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateField = <K extends keyof PosterData>(key: K, value: PosterData[K]) => {
    setData({ ...data, [key]: value });
  };

  const updateRow = (idx: number, patch: Partial<PosterRow>) => {
    const rows = [...data.rows];
    rows[idx] = { ...rows[idx], ...patch };
    setData({ ...data, rows });
  };

  const addRow = (isHeader = false) => {
    setData({
      ...data,
      rows: [...data.rows, { id: Date.now().toString(), label: "", time: "", isHeader }],
    });
  };

  const removeRow = (idx: number) => {
    setData({ ...data, rows: data.rows.filter((_, i) => i !== idx) });
  };

  const moveRow = (idx: number, dir: -1 | 1) => {
    const rows = [...data.rows];
    const target = idx + dir;
    if (target < 0 || target >= rows.length) return;
    [rows[idx], rows[target]] = [rows[target], rows[idx]];
    setData({ ...data, rows });
  };

  const handleSave = () => {
    localStorage.setItem("poster-shabbat", JSON.stringify(shabbatData));
    localStorage.setItem("poster-weekday", JSON.stringify(weekdayData));
    toast({ title: "נשמר בהצלחה" });
  };

  const handlePrint = () => {
    handleSave();
    window.print();
  };

  const fillFromShabbatTimes = () => {
    if (tab !== "shabbat") return;
    const t = getShabbatTimes("akko");
    const map: Record<string, string> = {
      "כניסת השבת": formatTimeOnly(t.candleLighting),
      "יציאת שבת": formatTimeOnly(t.havdalah),
    };
    const rows = data.rows.map((r) => (map[r.label] ? { ...r, time: map[r.label] } : r));
    setData({ ...data, rows, parasha: getCurrentParasha() });
    toast({ title: "מולא אוטומטית מזמני השבת" });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "התמונה גדולה מדי (מקס׳ 2MB)", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateField("bottomImage", reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-muted/30 p-4 md:p-6 print:p-0 print:bg-white">
      {/* Toolbar — hidden when printing */}
      <div className="print:hidden max-w-7xl mx-auto mb-4 flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowRight className="w-4 h-4 ml-1" /> חזרה
        </Button>
        <h1 className="text-2xl font-bold flex-1">טופס זמני תפילות להדפסה</h1>
        <Button onClick={handleSave} variant="outline">
          <Save className="w-4 h-4 ml-1" /> שמירה
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="w-4 h-4 ml-1" /> הדפס / שמור PDF
        </Button>
      </div>

      <div className="print:hidden max-w-7xl mx-auto">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "shabbat" | "weekday")}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="shabbat">שבת וחג</TabsTrigger>
            <TabsTrigger value="weekday">יום חול</TabsTrigger>
          </TabsList>

          <TabsContent value="shabbat" className="mt-4">
            <EditorAndPreview
              data={shabbatData}
              setData={setShabbatData}
              updateField={(k, v) => setShabbatData({ ...shabbatData, [k]: v })}
              updateRow={updateRow}
              addRow={addRow}
              removeRow={removeRow}
              moveRow={moveRow}
              fillFromShabbatTimes={fillFromShabbatTimes}
              handleImageUpload={handleImageUpload}
              isShabbat
            />
          </TabsContent>
          <TabsContent value="weekday" className="mt-4">
            <EditorAndPreview
              data={weekdayData}
              setData={setWeekdayData}
              updateField={(k, v) => setWeekdayData({ ...weekdayData, [k]: v })}
              updateRow={updateRow}
              addRow={addRow}
              removeRow={removeRow}
              moveRow={moveRow}
              fillFromShabbatTimes={fillFromShabbatTimes}
              handleImageUpload={handleImageUpload}
              isShabbat={false}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Print-only poster */}
      <div className="hidden print:block">
        <PosterPreview data={data} />
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { margin: 0; }
        }
      `}</style>
    </div>
  );
}

interface EAPProps {
  data: PosterData;
  setData: (d: PosterData) => void;
  updateField: <K extends keyof PosterData>(k: K, v: PosterData[K]) => void;
  updateRow: (idx: number, patch: Partial<PosterRow>) => void;
  addRow: (isHeader?: boolean) => void;
  removeRow: (idx: number) => void;
  moveRow: (idx: number, dir: -1 | 1) => void;
  fillFromShabbatTimes: () => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isShabbat: boolean;
}

function EditorAndPreview({
  data, updateField, updateRow, addRow, removeRow, moveRow, fillFromShabbatTimes, handleImageUpload, isShabbat,
}: EAPProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Editor */}
      <Card className="p-4 space-y-4">
        <div className="space-y-2">
          <Label>שם בית הכנסת</Label>
          <Input value={data.synagogueName} onChange={(e) => updateField("synagogueName", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>כתובת / כיתוב משנה</Label>
          <Input value={data.subtitle} onChange={(e) => updateField("subtitle", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>כותרת ראשית</Label>
          <Input value={data.title} onChange={(e) => updateField("title", e.target.value)} />
        </div>
        {isShabbat && (
          <div className="space-y-2">
            <Label>פרשה</Label>
            <div className="flex gap-2">
              <Input value={data.parasha} onChange={(e) => updateField("parasha", e.target.value)} placeholder="לדוגמה: במדבר" />
              <Button type="button" variant="outline" onClick={fillFromShabbatTimes}>מלא זמני שבת</Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>רשומות (תפילות / שיעורים / כותרות)</Label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => addRow(false)}>
                <Plus className="w-4 h-4 ml-1" /> שורה
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addRow(true)}>
                <Plus className="w-4 h-4 ml-1" /> כותרת
              </Button>
            </div>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {data.rows.map((row, idx) => (
              <div key={row.id} className="flex items-center gap-1.5 p-2 rounded-md bg-muted/40">
                <div className="flex flex-col gap-0.5">
                  <button type="button" onClick={() => moveRow(idx, -1)} className="text-xs px-1 hover:bg-background rounded">▲</button>
                  <button type="button" onClick={() => moveRow(idx, 1)} className="text-xs px-1 hover:bg-background rounded">▼</button>
                </div>
                <Input
                  value={row.label}
                  onChange={(e) => updateRow(idx, { label: e.target.value })}
                  placeholder={row.isHeader ? "כותרת ביניים" : "שם"}
                  className="flex-1"
                />
                {!row.isHeader && (
                  <Input
                    type="time"
                    value={row.time}
                    onChange={(e) => updateRow(idx, { time: e.target.value })}
                    className="w-28"
                    dir="ltr"
                  />
                )}
                <label className="flex items-center gap-1 text-xs px-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!row.isHeader}
                    onChange={(e) => updateRow(idx, { isHeader: e.target.checked, time: e.target.checked ? "" : row.time })}
                  />
                  כותרת
                </label>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeRow(idx)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>כיתוב תחתון</Label>
          <Input value={data.footer} onChange={(e) => updateField("footer", e.target.value)} placeholder="לדוגמה: שבת שלום" />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> תמונה תחתונה (אופציונלי)
          </Label>
          <div className="flex items-center gap-2">
            <Input type="file" accept="image/*" onChange={handleImageUpload} />
            {data.bottomImage && (
              <Button type="button" variant="ghost" size="icon" onClick={() => updateField("bottomImage", null)}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Preview */}
      <div className="flex justify-center">
        <PosterPreview data={data} />
      </div>
    </div>
  );
}

function PosterPreview({ data }: { data: PosterData }) {
  return (
    <div
      className="poster-page bg-[#fdf6e3] relative shadow-2xl print:shadow-none"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "18mm 16mm",
        boxSizing: "border-box",
        fontFamily: '"Heebo", "Frank Ruhl Libre", serif',
        backgroundImage:
          "radial-gradient(ellipse at top left, rgba(218,165,32,0.15), transparent 60%), radial-gradient(ellipse at bottom right, rgba(218,165,32,0.12), transparent 60%)",
      }}
    >
      {/* Ornate double border */}
      <div
        className="absolute inset-[8mm] pointer-events-none"
        style={{
          border: "4px double #b08d3d",
          borderRadius: "10px",
          boxShadow: "inset 0 0 0 2px #f5e6b0, inset 0 0 0 6px #b08d3d33",
        }}
      />
      {/* Corner flourishes */}
      <div className="absolute top-[6mm] right-[6mm] text-[#b08d3d] text-4xl leading-none">❦</div>
      <div className="absolute top-[6mm] left-[6mm] text-[#b08d3d] text-4xl leading-none rotate-90">❦</div>
      <div className="absolute bottom-[6mm] right-[6mm] text-[#b08d3d] text-4xl leading-none -rotate-90">❦</div>
      <div className="absolute bottom-[6mm] left-[6mm] text-[#b08d3d] text-4xl leading-none rotate-180">❦</div>

      {/* בס"ד */}
      <div className="text-right text-sm text-[#3a2a10] font-bold mb-2 relative">בס"ד</div>

      <div className="relative text-center space-y-4">
        <div>
          <div className="text-2xl text-[#3a2a10] font-bold">{data.synagogueName.split('"')[0]}</div>
          {data.synagogueName.includes('"') && (
            <div className="text-4xl font-extrabold text-[#3a2a10] tracking-wide">
              "{data.synagogueName.split('"')[1]}"
            </div>
          )}
          {data.subtitle && <div className="text-sm text-[#3a2a10] mt-1">{data.subtitle}</div>}
        </div>

        <div className="text-4xl font-extrabold text-[#3a2a10] py-2">{data.title}</div>

        {data.parasha && (
          <div className="text-3xl font-bold text-[#7a1818] py-3">פרשת : {data.parasha}</div>
        )}

        <div className="space-y-3 px-4 text-right pt-2">
          {data.rows.map((row) => (
            <div key={row.id}>
              {row.isHeader ? (
                <div className="text-2xl font-bold text-[#7a1818] text-center py-1">{row.label}</div>
              ) : (
                <div className="flex items-center justify-between text-2xl font-bold text-[#1a1a1a]">
                  <span>{row.label}:</span>
                  <span dir="ltr" className="tabular-nums">{row.time}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {data.footer && (
          <div className="text-xl text-[#3a2a10] pt-6">{data.footer}</div>
        )}

        {data.bottomImage && (
          <div className="flex justify-center pt-2">
            <img src={data.bottomImage} alt="" className="max-h-[40mm] object-contain" />
          </div>
        )}
      </div>
    </div>
  );
}
