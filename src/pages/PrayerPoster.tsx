import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Printer, Save, ArrowRight, Image as ImageIcon, X, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { getCurrentParasha, getShabbatTimes, formatTimeOnly } from "@/lib/hebrew-utils";
import posterLogo from "@/assets/brit-shalom-poster-logo.png";
import html2pdf from "html2pdf.js";

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
  footer: "שבת שלום ומבורך",
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

// Inject Google Fonts once
function useGoogleFonts() {
  useEffect(() => {
    const id = "poster-google-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700;900&family=David+Libre:wght@400;500;700&family=Heebo:wght@400;700;900&display=swap";
    document.head.appendChild(link);
  }, []);
}

export default function PrayerPoster() {
  useGoogleFonts();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"shabbat" | "weekday">("shabbat");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [shabbatData, setShabbatData] = useState<PosterData>(() => loadData("poster-shabbat", DEFAULT_SHABBAT));
  const [weekdayData, setWeekdayData] = useState<PosterData>(() => loadData("poster-weekday", DEFAULT_WEEKDAY));
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  const data = tab === "shabbat" ? shabbatData : weekdayData;
  const setData = tab === "shabbat" ? setShabbatData : setWeekdayData;

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

  // Open print in a new window — bypasses AppLayout chrome and ensures the poster renders correctly
  const handlePrint = () => {
    handleSave();
    const html = buildPrintHtml(data, tab === "shabbat" ? "shabbat" : "weekday", orientation);
    const w = window.open("", "_blank", orientation === "landscape" ? "width=1200,height=675" : "width=900,height=1200");
    if (!w) {
      toast({ title: "החלון נחסם — אשר חלונות קופצים", variant: "destructive" });
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    // Wait for fonts/images before printing
    const doPrint = () => {
      try { w.focus(); w.print(); } catch (e) { /* ignore */ }
    };
    if ((w.document as any).fonts?.ready) {
      (w.document as any).fonts.ready.then(() => setTimeout(doPrint, 350));
    } else {
      w.onload = () => setTimeout(doPrint, 500);
    }
  };

  const handleDownloadImage = async () => {
    if (!posterRef.current) return;
    
    const root = document.documentElement;
    const originalDir = root.dir;
    
    try {
      setIsGeneratingImage(true);
      root.dir = 'ltr';

      const el = posterRef.current;
      const clone = el.cloneNode(true) as HTMLElement;
      clone.dir = 'rtl'; // Restore RTL direction for internal layout since outer container forces LTR

      const outerContainer = document.createElement('div');
      outerContainer.style.position = 'absolute';
      outerContainer.style.top = '0';
      outerContainer.style.left = '0';
      outerContainer.style.zIndex = '-9999';
      outerContainer.dir = 'ltr';
      
      const scaledContainer = document.createElement('div');
      scaledContainer.style.transform = 'scale(0.5)';
      scaledContainer.style.transformOrigin = 'top left';
      scaledContainer.style.textAlign = 'initial';
      
      scaledContainer.appendChild(clone);
      outerContainer.appendChild(scaledContainer);
      document.body.appendChild(outerContainer);

      await new Promise(resolve => setTimeout(resolve, 150));

      const width = clone.offsetWidth * 0.5;
      const height = clone.offsetHeight * 0.5;

      const worker = html2pdf().set({
        margin: 0,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: {
          scale: 6, // 6 * 0.5 = 3 (matches original high quality)
          useCORS: true,
          backgroundColor: '#ffffff',
          letterRendering: true,
          width,
          height,
          windowWidth: document.documentElement.clientWidth,
          windowHeight: document.documentElement.clientHeight,
          scrollX: 0,
          scrollY: 0,
        },
      }).from(outerContainer).toCanvas();

      const canvas: HTMLCanvasElement | undefined = await (worker as any).get('canvas');
      document.body.removeChild(outerContainer);
      
      if (!canvas) throw new Error('Failed to render canvas');

      const blob = await new Promise<Blob>((resolve, reject) => {
        if (typeof canvas.toBlob === 'function') {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Canvas to blob failed'))),
            'image/jpeg',
            0.98,
          );
          return;
        }
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.98);
          const [meta, base64 = ''] = dataUrl.split(',');
          const byteCharacters = atob(base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          resolve(new Blob([new Uint8Array(byteNumbers)], { type: 'image/jpeg' }));
        } catch (err) {
          reject(err);
        }
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prayer-times-${orientation}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast({ title: "התמונה נשמרה בהצלחה" });
    } catch (error) {
      console.error(error);
      toast({ title: "שגיאה ביצירת התמונה", variant: "destructive" });
    } finally {
      root.dir = originalDir;
      setIsGeneratingImage(false);
    }
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
    <div dir="rtl" className="min-h-screen bg-muted/30 p-4 md:p-6">
      <div className="max-w-7xl mx-auto mb-4 flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowRight className="w-4 h-4 ml-1" /> חזרה
        </Button>
        <h1 className="text-2xl font-bold flex-1">טופס זמני תפילות להדפסה</h1>
        <Button onClick={handleSave} variant="outline">
          <Save className="w-4 h-4 ml-1" /> שמירה
        </Button>
        <Button onClick={handlePrint} variant="outline">
          <Printer className="w-4 h-4 ml-1" /> PDF
        </Button>
        <Button onClick={handleDownloadImage} disabled={isGeneratingImage}>
          <Download className="w-4 h-4 ml-1" /> {isGeneratingImage ? "מייצר..." : "שמור כתמונה"}
        </Button>
      </div>

      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 mb-4">
        <Button variant={orientation === "portrait" ? "default" : "outline"} onClick={() => setOrientation("portrait")} className="w-40">
          פוסטר לאורך (A4)
        </Button>
        <Button variant={orientation === "landscape" ? "default" : "outline"} onClick={() => setOrientation("landscape")} className="w-40">
          פוסטר לרוחב (מסך)
        </Button>
      </div>

      <div className="max-w-7xl mx-auto">
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
              orientation={orientation}
              posterRef={posterRef}
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
              orientation={orientation}
              posterRef={posterRef}
            />
          </TabsContent>
        </Tabs>
      </div>
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
  orientation: "portrait" | "landscape";
  posterRef: React.RefObject<HTMLDivElement>;
}

function EditorAndPreview({
  data, updateField, updateRow, addRow, removeRow, moveRow, fillFromShabbatTimes, handleImageUpload, isShabbat, orientation, posterRef
}: EAPProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

      <div className="flex justify-center overflow-auto">
        <div id="poster-scale-wrapper" style={{ transform: orientation === "landscape" ? "scale(0.5)" : "scale(0.55)", transformOrigin: "top center", marginBottom: orientation === "landscape" ? "-200px" : "0" }}>
          <div ref={posterRef}>
            <PosterPreview data={data} variant={isShabbat ? "shabbat" : "weekday"} orientation={orientation} />
          </div>
        </div>
      </div>
    </div>
  );
}


type Variant = "shabbat" | "weekday";

interface Theme {
  bg: string;
  borderColor: string;
  borderShadow: string;
  innerBorder: string;
  accent: string;
  accentSoft: string;
  textPrimary: string;
  textSecondary: string;
  highlight: string;
  corner: string;
  divider: string;
  fontFamily: string;
}

const THEMES: Record<Variant, Theme> = {
  shabbat: {
    bg: "radial-gradient(ellipse at 30% 10%, #fffaf0 0%, #fbf3df 45%, #f6e9c5 100%)",
    borderColor: "#a8842c",
    borderShadow: "inset 0 0 0 1px #f1dca0, inset 0 0 0 4px rgba(168,132,44,0.18)",
    innerBorder: "1px solid rgba(168,132,44,0.45)",
    accent: "#a8842c",
    accentSoft: "rgba(168,132,44,0.4)",
    textPrimary: "#2a1d0a",
    textSecondary: "#5a4015",
    highlight: "#8a1818",
    corner: "❦",
    divider: "✦",
    fontFamily: '"Frank Ruhl Libre", "David Libre", "Heebo", serif',
  },
  weekday: {
    bg: "linear-gradient(180deg, #f7f9fc 0%, #eef2f8 100%)",
    borderColor: "#2d4a6b",
    borderShadow: "inset 0 0 0 1px #c4d3e5, inset 0 0 0 3px rgba(45,74,107,0.12)",
    innerBorder: "1px solid rgba(45,74,107,0.35)",
    accent: "#2d4a6b",
    accentSoft: "rgba(45,74,107,0.35)",
    textPrimary: "#0f1b2d",
    textSecondary: "#3a5470",
    highlight: "#1f4068",
    corner: "✡",
    divider: "◆",
    fontFamily: '"Heebo", "Frank Ruhl Libre", sans-serif',
  },
};

function PosterPreview({ data, variant, orientation = "portrait" }: { data: PosterData; variant: Variant; orientation?: "portrait" | "landscape" }) {
  const t = THEMES[variant];
  const nameParts = splitName(data.synagogueName);
  const isLandscape = orientation === "landscape";
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [dynamicWidth, setDynamicWidth] = useState<string>(isLandscape ? "297mm" : "210mm");

  useEffect(() => {
    if (!isLandscape) {
      setDynamicWidth("210mm");
      return;
    }

    const updateWidth = () => {
      if (containerRef.current) {
        const height = containerRef.current.offsetHeight;
        // 1mm = 3.78px approx. 297mm = ~1122px.
        const targetWidth = height * (16 / 9);
        if (targetWidth > 1122) {
          setDynamicWidth(`${targetWidth}px`);
        } else {
          setDynamicWidth("297mm");
        }
      }
    };

    updateWidth();
    // Re-check width after a short delay to allow fonts to render
    setTimeout(updateWidth, 100);
  }, [isLandscape, data.rows.length, data]);

  const minHeight = isLandscape ? "167mm" : "297mm";
  const sf = isLandscape ? 1.4 : 1; // Scale factor for landscape fonts
  
  return (
    <div
      ref={containerRef}
      className="poster-page relative shadow-2xl"
      style={{
        width: dynamicWidth,
        minHeight,
        padding: "20mm 18mm",
        boxSizing: "border-box",
        fontFamily: t.fontFamily,
        background: t.bg,
        color: t.textPrimary,
      }}
    >
      {/* Outer border */}
      <div
        className="absolute inset-[10mm] pointer-events-none"
        style={{
          border: `3px ${variant === "shabbat" ? "double" : "solid"} ${t.borderColor}`,
          borderRadius: variant === "shabbat" ? "6px" : "2px",
          boxShadow: t.borderShadow,
        }}
      />
      {/* Inner thin frame */}
      <div
        className="absolute inset-[14mm] pointer-events-none"
        style={{ border: t.innerBorder, borderRadius: "2px" }}
      />

      {/* Corner ornaments */}
      {[
        { top: "8mm", right: "8mm", rotate: "0deg" },
        { top: "8mm", left: "8mm", rotate: "90deg" },
        { bottom: "8mm", right: "8mm", rotate: "-90deg" },
        { bottom: "8mm", left: "8mm", rotate: "180deg" },
      ].map((pos, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            ...pos,
            transform: `rotate(${pos.rotate})`,
            color: t.accent,
            fontSize: "26px",
            lineHeight: 1,
          }}
        >
          {t.corner}
        </div>
      ))}

      <div className="absolute right-[20mm] top-[18mm] text-sm font-bold" style={{ color: t.textSecondary }}>
        בס"ד
      </div>

      <div className="relative text-center" style={{ paddingTop: "4mm" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "3mm" }}>
          <img src={posterLogo} alt="לוגו" style={{ height: "14mm", objectFit: "contain" }} />
        </div>
        <div style={{ fontSize: `${22 * sf}px`, fontWeight: 500, letterSpacing: "1px", color: t.textSecondary }}>
          {nameParts.prefix}
        </div>
        {nameParts.quoted && (
          <div
            style={{
              fontSize: `${42 * sf}px`,
              fontWeight: 900,
              letterSpacing: variant === "shabbat" ? "2px" : "1px",
              color: t.textPrimary,
              marginTop: "2px",
            }}
          >
            "{nameParts.quoted}"
          </div>
        )}
        {nameParts.main && (
          <div
            style={{
              fontSize: `${42 * sf}px`,
              fontWeight: 900,
              letterSpacing: variant === "shabbat" ? "2px" : "1px",
              color: t.textPrimary,
              marginTop: nameParts.quoted ? "2px" : "6px",
            }}
          >
            {nameParts.main}
          </div>
        )}
        {data.subtitle && (
          <div style={{ fontSize: `${18 * sf}px`, color: t.textSecondary, marginTop: "6px", letterSpacing: "0.5px" }}>
            {data.subtitle}
          </div>
        )}

        <Divider theme={t} />

        <div
          style={{
            fontSize: `${38 * sf}px`,
            fontWeight: 900,
            color: t.textPrimary,
            margin: "4mm 0 2mm",
            letterSpacing: "1px",
          }}
        >
          {data.title}
        </div>

        {data.parasha && variant === "shabbat" && (
          <div
            style={{
              fontSize: `${28 * sf}px`,
              fontWeight: 700,
              color: t.highlight,
              margin: "0 0 2mm",
              letterSpacing: "1px",
            }}
          >
            פרשת {data.parasha}
          </div>
        )}

        <Divider theme={t} />

        <div style={{ padding: "3mm 3mm 0", textAlign: "right", direction: "rtl" }}>
          {data.rows.map((row, idx) => (
            <div key={row.id}>
              {row.isHeader ? (
                <div
                  style={{
                    fontSize: `${26 * sf}px`,
                    fontWeight: 900,
                    color: t.highlight,
                    textAlign: "center",
                    margin: "2mm 0 1mm",
                    letterSpacing: "0.5px",
                  }}
                >
                  {variant === "shabbat" ? `❖ ${row.label} ❖` : `— ${row.label} —`}
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    direction: "rtl",
                    fontSize: `${26 * sf}px`,
                    fontWeight: 800,
                    color: t.textPrimary,
                    padding: "2mm 0",
                    borderBottom:
                      idx < data.rows.length - 1
                        ? variant === "shabbat"
                          ? `1px dotted ${t.accentSoft}`
                          : `1px solid ${t.accentSoft}`
                        : "none",
                  }}
                >
                  <span>{row.label}</span>
                  <span
                    dir="ltr"
                    style={{
                      fontFamily: '"Heebo", sans-serif',
                      fontSize: `${28 * sf}px`,
                      fontWeight: 900,
                      color: t.textSecondary,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {row.time}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {data.footer && (
          <>
            <Divider theme={t} />
            <div
              style={{
                fontSize: `${26 * sf}px`,
                fontWeight: 900,
                color: t.highlight,
                marginTop: "2mm",
                letterSpacing: "1px",
              }}
            >
              {data.footer}
            </div>
          </>
        )}

        {data.bottomImage && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: "3mm" }}>
            <img src={data.bottomImage} alt="" style={{ maxHeight: "22mm", objectFit: "contain" }} />
          </div>
        )}
      </div>
    </div>
  );
}

function Divider({ theme }: { theme: Theme }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        margin: "2mm 0",
        color: theme.accent,
      }}
    >
      <span style={{ flex: 1, height: "1px", background: `linear-gradient(to left, transparent, ${theme.accent}, transparent)` }} />
      <span style={{ fontSize: `${20 * sf}px` }}>{theme.divider}</span>
      <span style={{ flex: 1, height: "1px", background: `linear-gradient(to right, transparent, ${theme.accent}, transparent)` }} />
    </div>
  );
}

function splitName(name: string): { prefix: string; quoted: string } {
  const m = name.match(/^(.*?)["“]([^"”]+)["”](.*)$/);
  if (m) return { prefix: m[1].trim(), quoted: m[2].trim() };
  return { prefix: name, quoted: "" };
}

// Build standalone HTML for print window
function buildPrintHtml(data: PosterData, variant: Variant, orientation: "portrait" | "landscape" = "portrait"): string {
  const t = THEMES[variant];
  const nameParts = splitName(data.synagogueName);
  
  // Use a two-column grid if landscape and there are many rows
  const isLandscape = orientation === "landscape";
  const shouldSplitColumns = isLandscape && data.rows.length > 5;
  
  const rowsHtml = data.rows
    .map((row, idx) => {
      if (row.isHeader) {
        const label = variant === "shabbat" ? `❖ ${escapeHtml(row.label)} ❖` : `— ${escapeHtml(row.label)} —`;
        return `<div class="hdr" style="${shouldSplitColumns ? 'grid-column: 1 / -1;' : ''}">${label}</div>`;
      }
      const borderStyle = variant === "shabbat" ? "dotted" : "solid";
      // In grid mode, we might not want bottom borders, or we need to be careful
      const border =
        (idx < data.rows.length - 1 && !shouldSplitColumns) ? `border-bottom:1px ${borderStyle} ${t.accentSoft};` : "";
      return `<div class="row" style="${border}">
        <span>${escapeHtml(row.label)}</span>
        <span class="time" dir="ltr">${escapeHtml(row.time)}</span>
      </div>`;
    })
    .join("");

  const rowsContainerCss = shouldSplitColumns 
    ? `display: grid; grid-template-columns: 1fr 1fr; column-gap: 12mm; align-items: start;`
    : ``;

  const divider = `<div class="divider"><span class="line"></span><span class="star">${t.divider}</span><span class="line"></span></div>`;
  const borderStyleOuter = variant === "shabbat" ? "double" : "solid";

  const pageWidth = isLandscape ? "297mm" : "210mm";
  const pageHeight = isLandscape ? "167mm" : "297mm";
  const pageCss = isLandscape ? `@page { size: 297mm 167mm; margin: 0; }` : `@page { size: A4 portrait; margin: 0; }`;

  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(data.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700;900&family=David+Libre:wght@400;500;700&family=Heebo:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  /* Zero printer margins — our own padding handles whitespace, and auto-fit ensures content never overflows */
  ${pageCss}
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin:0; padding:0; background:#e9e4d4; font-family:${t.fontFamily}; color:${t.textPrimary}; }
  .sheet {
    width:${pageWidth}; height:${pageHeight}; position:relative; overflow:hidden;
    background: ${t.bg};
    margin:0 auto;
  }
  .page {
    width:${pageWidth}; padding:20mm 18mm; position:relative;
    transform-origin: top center;
  }
  .border-outer { position:absolute; inset:10mm; border:3px ${borderStyleOuter} ${t.borderColor}; border-radius:${variant === "shabbat" ? "6px" : "2px"};
    box-shadow: ${t.borderShadow}; pointer-events:none; }
  .border-inner { position:absolute; inset:14mm; border:${t.innerBorder}; border-radius:2px; pointer-events:none; }
  .corner { position:absolute; color:${t.accent}; font-size:26px; line-height:1; }
  .c1 { top:8mm; right:8mm; }
  .c2 { top:8mm; left:8mm; transform:rotate(90deg); }
  .c3 { bottom:8mm; right:8mm; transform:rotate(-90deg); }
  .c4 { bottom:8mm; left:8mm; transform:rotate(180deg); }
  .bsd { position:absolute; right:20mm; top:18mm; font-size:14px; font-weight:700; color:${t.textSecondary}; }
  .content { position:relative; text-align:center; padding-top:4mm; }
  .logo-wrap { display:flex; justify-content:center; margin-bottom:3mm; }
  .logo-wrap img { height:14mm; object-fit:contain; }
  .name-prefix { font-size:18px; font-weight:500; letter-spacing:1px; color:${t.textSecondary}; }
  .name-quoted { font-size:34px; font-weight:900; letter-spacing:${variant === "shabbat" ? "2px" : "1px"}; color:${t.textPrimary}; margin-top:2px; }
  .subtitle { font-size:13px; color:${t.textSecondary}; margin-top:6px; letter-spacing:0.5px; }
  .title { font-size:30px; font-weight:900; color:${t.textPrimary}; margin:4mm 0 2mm; letter-spacing:1px; }
  .parasha { font-size:22px; font-weight:700; color:${t.highlight}; margin:0 0 2mm; letter-spacing:1px; }
  .rows { padding:3mm 3mm 0; text-align:right; ${rowsContainerCss} }
  .row { display:flex; align-items:baseline; justify-content:space-between; font-size:19px; font-weight:700; color:${t.textPrimary}; padding:2mm 0; }
  .row .time { font-family:"Heebo",sans-serif; font-weight:900; color:${t.textSecondary}; font-variant-numeric: tabular-nums; }
  .hdr { font-size:20px; font-weight:700; color:${t.highlight}; text-align:center; margin:2mm 0 1mm; letter-spacing:0.5px; }
  .footer { font-size:20px; font-weight:700; color:${t.highlight}; margin-top:2mm; letter-spacing:1px; }
  .divider { display:flex; align-items:center; justify-content:center; gap:10px; margin:2mm 0; color:${t.accent}; }
  .divider .line { flex:1; height:1px; background:linear-gradient(to right, transparent, ${t.accent}, transparent); }
  .divider .star { font-size:16px; }
  .img-wrap { display:flex; justify-content:center; margin-top:3mm; }
  .img-wrap img { max-height:22mm; object-fit:contain; }
</style>
</head>
<body>
  <div class="sheet" id="sheet">
    <div class="page" id="page">
      <div class="border-outer"></div>
      <div class="border-inner"></div>
      <div class="corner c1">${t.corner}</div>
      <div class="corner c2">${t.corner}</div>
      <div class="corner c3">${t.corner}</div>
      <div class="corner c4">${t.corner}</div>
      <div class="bsd">בס"ד</div>
      <div class="content">
        <div class="logo-wrap"><img src="${new URL(posterLogo, window.location.origin).href}" alt="לוגו" /></div>
        <div class="name-prefix">${escapeHtml(nameParts.prefix)}</div>
        ${nameParts.quoted ? `<div class="name-quoted">"${escapeHtml(nameParts.quoted)}"</div>` : ""}
        ${data.subtitle ? `<div class="subtitle">${escapeHtml(data.subtitle)}</div>` : ""}
        ${divider}
        <div class="title">${escapeHtml(data.title)}</div>
        ${data.parasha && variant === "shabbat" ? `<div class="parasha">פרשת ${escapeHtml(data.parasha)}</div>` : ""}
        ${divider}
        <div class="rows">${rowsHtml}</div>
        ${data.footer ? `${divider}<div class="footer">${escapeHtml(data.footer)}</div>` : ""}
        ${data.bottomImage ? `<div class="img-wrap"><img src="${data.bottomImage}" alt="" /></div>` : ""}
      </div>
    </div>
  </div>
<script>
  // Auto-fit: shrink the page proportionally if content exceeds A4 (297mm).
  // This guarantees nothing spills onto a second page regardless of printer margins.
  (function () {
    function fit() {
      var sheet = document.getElementById('sheet');
      var page = document.getElementById('page');
      if (!sheet || !page) return;
      page.style.transform = 'scale(1)';
      var sheetH = sheet.getBoundingClientRect().height;
      var pageH = page.getBoundingClientRect().height;
      if (pageH > sheetH) {
        var scale = sheetH / pageH;
        page.style.transform = 'scale(' + scale + ')';
        // After scaling down, give the page the original width so it remains centered correctly
        page.style.width = '${pageWidth}';
      }
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function(){ setTimeout(fit, 50); });
    } else {
      window.addEventListener('load', function(){ setTimeout(fit, 100); });
    }
    window.addEventListener('beforeprint', fit);
  })();
</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

