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
  const [shabbatData, setShabbatData] = useState<PosterData>(() => loadData("poster-shabbat", DEFAULT_SHABBAT));
  const [weekdayData, setWeekdayData] = useState<PosterData>(() => loadData("poster-weekday", DEFAULT_WEEKDAY));

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
    const html = buildPrintHtml(data);
    const w = window.open("", "_blank", "width=900,height=1200");
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
      (w.document as any).fonts.ready.then(() => setTimeout(doPrint, 250));
    } else {
      w.onload = () => setTimeout(doPrint, 400);
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
        <Button onClick={handlePrint}>
          <Printer className="w-4 h-4 ml-1" /> הדפס / שמור PDF
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
        <div style={{ transform: "scale(0.55)", transformOrigin: "top center" }}>
          <PosterPreview data={data} />
        </div>
      </div>
    </div>
  );
}

function PosterPreview({ data }: { data: PosterData }) {
  const nameParts = splitName(data.synagogueName);
  return (
    <div
      className="poster-page relative shadow-2xl"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "20mm 18mm",
        boxSizing: "border-box",
        fontFamily: '"Frank Ruhl Libre", "David Libre", "Heebo", serif',
        background:
          "radial-gradient(ellipse at 30% 10%, #fffaf0 0%, #fbf3df 45%, #f6e9c5 100%)",
        color: "#2a1d0a",
      }}
    >
      {/* Outer ornate border */}
      <div
        className="absolute inset-[10mm] pointer-events-none"
        style={{
          border: "3px double #a8842c",
          borderRadius: "6px",
          boxShadow:
            "inset 0 0 0 1px #f1dca0, inset 0 0 0 4px rgba(168,132,44,0.18), 0 0 0 1px rgba(168,132,44,0.2)",
        }}
      />
      {/* Inner thin frame */}
      <div
        className="absolute inset-[14mm] pointer-events-none"
        style={{ border: "1px solid rgba(168,132,44,0.45)", borderRadius: "3px" }}
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
            color: "#a8842c",
            fontSize: "28px",
            lineHeight: 1,
            letterSpacing: "-2px",
          }}
        >
          ❦
        </div>
      ))}

      <div className="absolute right-[20mm] top-[18mm] text-sm font-bold" style={{ color: "#5a4015" }}>
        בס"ד
      </div>

      <div className="relative text-center" style={{ paddingTop: "8mm" }}>
        {/* Synagogue name */}
        <div style={{ fontSize: "20px", fontWeight: 500, letterSpacing: "1px", color: "#5a4015" }}>
          {nameParts.prefix}
        </div>
        {nameParts.quoted && (
          <div
            style={{
              fontSize: "44px",
              fontWeight: 900,
              letterSpacing: "2px",
              color: "#2a1d0a",
              marginTop: "2px",
              textShadow: "0 1px 0 rgba(168,132,44,0.15)",
            }}
          >
            “{nameParts.quoted}”
          </div>
        )}
        {data.subtitle && (
          <div style={{ fontSize: "13px", color: "#7a5a20", marginTop: "6px", letterSpacing: "0.5px" }}>
            {data.subtitle}
          </div>
        )}

        {/* Divider */}
        <Divider />

        {/* Main title */}
        <div
          style={{
            fontSize: "38px",
            fontWeight: 900,
            color: "#2a1d0a",
            margin: "6mm 0 4mm",
            letterSpacing: "1px",
          }}
        >
          {data.title}
        </div>

        {data.parasha && (
          <div
            style={{
              fontSize: "30px",
              fontWeight: 700,
              color: "#8a1818",
              margin: "0 0 4mm",
              letterSpacing: "1px",
            }}
          >
            פרשת {data.parasha}
          </div>
        )}

        <Divider />

        {/* Rows */}
        <div style={{ padding: "6mm 6mm 0", textAlign: "right" }}>
          {data.rows.map((row, idx) => (
            <div key={row.id}>
              {row.isHeader ? (
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: 700,
                    color: "#8a1818",
                    textAlign: "center",
                    margin: "4mm 0 2mm",
                    letterSpacing: "0.5px",
                  }}
                >
                  ❖ {row.label} ❖
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "#1a1208",
                    padding: "3mm 0",
                    borderBottom:
                      idx < data.rows.length - 1 ? "1px dotted rgba(168,132,44,0.4)" : "none",
                  }}
                >
                  <span>{row.label}</span>
                  <span
                    dir="ltr"
                    style={{
                      fontFamily: '"Heebo", sans-serif',
                      fontWeight: 900,
                      color: "#5a4015",
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
            <Divider />
            <div
              style={{
                fontSize: "26px",
                fontWeight: 700,
                color: "#8a1818",
                marginTop: "4mm",
                letterSpacing: "1px",
              }}
            >
              {data.footer}
            </div>
          </>
        )}

        {data.bottomImage && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: "6mm" }}>
            <img src={data.bottomImage} alt="" style={{ maxHeight: "40mm", objectFit: "contain" }} />
          </div>
        )}
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        margin: "4mm 0",
        color: "#a8842c",
      }}
    >
      <span style={{ flex: 1, height: "1px", background: "linear-gradient(to left, transparent, #a8842c, transparent)" }} />
      <span style={{ fontSize: "18px" }}>✦</span>
      <span style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, #a8842c, transparent)" }} />
    </div>
  );
}

function splitName(name: string): { prefix: string; quoted: string } {
  const m = name.match(/^(.*?)["“]([^"”]+)["”](.*)$/);
  if (m) return { prefix: m[1].trim(), quoted: m[2].trim() };
  return { prefix: name, quoted: "" };
}

// Build standalone HTML for print window
function buildPrintHtml(data: PosterData): string {
  const nameParts = splitName(data.synagogueName);
  const rowsHtml = data.rows
    .map((row, idx) => {
      if (row.isHeader) {
        return `<div class="hdr">❖ ${escapeHtml(row.label)} ❖</div>`;
      }
      const border =
        idx < data.rows.length - 1 ? "border-bottom:1px dotted rgba(168,132,44,0.4);" : "";
      return `<div class="row" style="${border}">
        <span>${escapeHtml(row.label)}</span>
        <span class="time" dir="ltr">${escapeHtml(row.time)}</span>
      </div>`;
    })
    .join("");

  const divider = `<div class="divider"><span class="line"></span><span class="star">✦</span><span class="line"></span></div>`;

  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(data.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700;900&family=David+Libre:wght@400;500;700&family=Heebo:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin:0; padding:0; background:#e9e4d4; font-family:"Frank Ruhl Libre","David Libre","Heebo",serif; color:#2a1d0a; }
  .page {
    width:210mm; min-height:297mm; padding:20mm 18mm; position:relative;
    background: radial-gradient(ellipse at 30% 10%, #fffaf0 0%, #fbf3df 45%, #f6e9c5 100%);
    margin:0 auto;
  }
  .border-outer { position:absolute; inset:10mm; border:3px double #a8842c; border-radius:6px;
    box-shadow: inset 0 0 0 1px #f1dca0, inset 0 0 0 4px rgba(168,132,44,0.18); pointer-events:none; }
  .border-inner { position:absolute; inset:14mm; border:1px solid rgba(168,132,44,0.45); border-radius:3px; pointer-events:none; }
  .corner { position:absolute; color:#a8842c; font-size:28px; line-height:1; }
  .c1 { top:8mm; right:8mm; }
  .c2 { top:8mm; left:8mm; transform:rotate(90deg); }
  .c3 { bottom:8mm; right:8mm; transform:rotate(-90deg); }
  .c4 { bottom:8mm; left:8mm; transform:rotate(180deg); }
  .bsd { position:absolute; right:20mm; top:18mm; font-size:14px; font-weight:700; color:#5a4015; }
  .content { position:relative; text-align:center; padding-top:8mm; }
  .name-prefix { font-size:20px; font-weight:500; letter-spacing:1px; color:#5a4015; }
  .name-quoted { font-size:44px; font-weight:900; letter-spacing:2px; color:#2a1d0a; margin-top:2px; }
  .subtitle { font-size:13px; color:#7a5a20; margin-top:6px; letter-spacing:0.5px; }
  .title { font-size:38px; font-weight:900; color:#2a1d0a; margin:6mm 0 4mm; letter-spacing:1px; }
  .parasha { font-size:30px; font-weight:700; color:#8a1818; margin:0 0 4mm; letter-spacing:1px; }
  .rows { padding:6mm 6mm 0; text-align:right; }
  .row { display:flex; align-items:baseline; justify-content:space-between; font-size:22px; font-weight:700; color:#1a1208; padding:3mm 0; }
  .row .time { font-family:"Heebo",sans-serif; font-weight:900; color:#5a4015; font-variant-numeric: tabular-nums; }
  .hdr { font-size:24px; font-weight:700; color:#8a1818; text-align:center; margin:4mm 0 2mm; letter-spacing:0.5px; }
  .footer { font-size:26px; font-weight:700; color:#8a1818; margin-top:4mm; letter-spacing:1px; }
  .divider { display:flex; align-items:center; justify-content:center; gap:10px; margin:4mm 0; color:#a8842c; }
  .divider .line { flex:1; height:1px; background:linear-gradient(to right, transparent, #a8842c, transparent); }
  .divider .star { font-size:18px; }
  .img-wrap { display:flex; justify-content:center; margin-top:6mm; }
  .img-wrap img { max-height:40mm; object-fit:contain; }
</style>
</head>
<body>
  <div class="page">
    <div class="border-outer"></div>
    <div class="border-inner"></div>
    <div class="corner c1">❦</div>
    <div class="corner c2">❦</div>
    <div class="corner c3">❦</div>
    <div class="corner c4">❦</div>
    <div class="bsd">בס"ד</div>
    <div class="content">
      <div class="name-prefix">${escapeHtml(nameParts.prefix)}</div>
      ${nameParts.quoted ? `<div class="name-quoted">“${escapeHtml(nameParts.quoted)}”</div>` : ""}
      ${data.subtitle ? `<div class="subtitle">${escapeHtml(data.subtitle)}</div>` : ""}
      ${divider}
      <div class="title">${escapeHtml(data.title)}</div>
      ${data.parasha ? `<div class="parasha">פרשת ${escapeHtml(data.parasha)}</div>` : ""}
      ${divider}
      <div class="rows">${rowsHtml}</div>
      ${data.footer ? `${divider}<div class="footer">${escapeHtml(data.footer)}</div>` : ""}
      ${data.bottomImage ? `<div class="img-wrap"><img src="${data.bottomImage}" alt="" /></div>` : ""}
    </div>
  </div>
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
