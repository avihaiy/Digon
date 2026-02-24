import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Clock, BookOpen } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface PrayerEntry {
  name: string;
  time: string;
}

interface PrayerTimesData {
  weekday?: { prayers: PrayerEntry[]; lessons: PrayerEntry[] };
  shabbat?: { prayers: PrayerEntry[]; lessons: PrayerEntry[] };
}

function parseContent(content: string, mode: "both" | "shabbat"): PrayerTimesData {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.weekday || parsed?.shabbat) {
      return {
        weekday:
          mode === "both"
            ? { prayers: parsed.weekday?.prayers || [], lessons: parsed.weekday?.lessons || [] }
            : undefined,
        shabbat: { prayers: parsed.shabbat?.prayers || [], lessons: parsed.shabbat?.lessons || [] },
      };
    }
  } catch {
    /* empty */
  }
  if (mode === "shabbat") {
    return { shabbat: { prayers: [{ name: "", time: "" }], lessons: [] } };
  }
  return {
    weekday: { prayers: [{ name: "", time: "" }], lessons: [] },
    shabbat: { prayers: [{ name: "", time: "" }], lessons: [] },
  };
}

interface EntryListProps {
  entries: PrayerEntry[];
  onChange: (entries: PrayerEntry[]) => void;
  label: string;
  icon: React.ReactNode;
  namePlaceholder: string;
}

function EntryList({ entries, onChange, label, icon, namePlaceholder }: EntryListProps) {
  const addEntry = () => onChange([...entries, { name: "", time: "" }]);
  const removeEntry = (idx: number) => onChange(entries.filter((_, i) => i !== idx));
  const updateEntry = (idx: number, field: "name" | "time", value: string) => {
    const updated = [...entries];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-sm font-semibold">
          {icon} {label}
        </Label>
        <Button type="button" variant="ghost" size="sm" onClick={addEntry} className="h-7 px-2 text-xs">
          <Plus className="w-3 h-3 ml-1" />
          הוסף
        </Button>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">אין רשומות — לחץ &#34;הוסף&#34;</p>
      ) : (
        <div className="space-y-1.5">
          {entries.map((entry, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={entry.name}
                onChange={(e) => updateEntry(idx, "name", e.target.value)}
                placeholder={namePlaceholder}
                className="flex-1 h-9 text-sm"
              />
              <Input
                type="time"
                value={entry.time}
                onChange={(e) => updateEntry(idx, "time", e.target.value)}
                className="w-28 h-9 text-sm"
                dir="ltr"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                onClick={() => removeEntry(idx)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface PrayerTimesEditorProps {
  value: string;
  onChange: (json: string) => void;
  mode?: "both" | "shabbat"; // both = חול + שבת, shabbat = שבת בלבד
}

export default function PrayerTimesEditor({ value, onChange, mode = "both" }: PrayerTimesEditorProps) {
  const [data, setData] = useState<PrayerTimesData>(() => parseContent(value, mode));
  const [activeTab, setActiveTab] = useState<"weekday" | "shabbat">(mode === "shabbat" ? "shabbat" : "weekday");

  const syncToParent = useCallback(
    (newData: PrayerTimesData) => {
      setData(newData);
      // הסר שדות undefined
      const toSave: PrayerTimesData = {};
      if (newData.weekday) toSave.weekday = newData.weekday;
      if (newData.shabbat) toSave.shabbat = newData.shabbat;
      onChange(JSON.stringify(toSave, null, 2));
    },
    [onChange],
  );

  useEffect(() => {
    setData(parseContent(value, mode));
    if (mode === "shabbat") setActiveTab("shabbat");
  }, [mode]);

  const updateSection = (section: "weekday" | "shabbat", field: "prayers" | "lessons", entries: PrayerEntry[]) => {
    const newData = { ...data, [section]: { ...(data[section] || { prayers: [], lessons: [] }), [field]: entries } };
    syncToParent(newData);
  };

  const currentSection = (activeTab === "weekday" ? data.weekday : data.shabbat) || { prayers: [], lessons: [] };

  return (
    <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
      <Label className="text-sm font-bold flex items-center gap-1.5">
        🕎 {mode === "shabbat" ? "עורך זמני תפילה — שבת וחג" : "עורך זמני תפילה ושיעורים"}
      </Label>

      {/* טאבים — רק במצב both */}
      {mode === "both" && (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={activeTab === "weekday" ? "default" : "outline"}
            onClick={() => setActiveTab("weekday")}
            className="flex-1 min-h-[40px]"
          >
            ימי חול
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activeTab === "shabbat" ? "default" : "outline"}
            onClick={() => setActiveTab("shabbat")}
            className="flex-1 min-h-[40px]"
          >
            שבת וחג
          </Button>
        </div>
      )}

      <EntryList
        entries={currentSection.prayers}
        onChange={(entries) => updateSection(activeTab, "prayers", entries)}
        label="זמני תפילה"
        icon={<Clock className="w-4 h-4" />}
        namePlaceholder="שם התפילה (לדוגמה: שחרית)"
      />
      <Separator />
      <EntryList
        entries={currentSection.lessons}
        onChange={(entries) => updateSection(activeTab, "lessons", entries)}
        label="שיעורי תורה"
        icon={<BookOpen className="w-4 h-4" />}
        namePlaceholder="שם השיעור (לדוגמה: שיעור תורה יומי)"
      />
    </div>
  );
}
