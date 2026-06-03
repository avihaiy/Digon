import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ScrollText, Plus, Pencil, Trash2, Check, X, Star, Search, ArrowUpDown, Calendar as CalendarIcon, Moon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type SortMode = 'name_asc' | 'name_desc' | 'created_asc' | 'created_desc';

interface SeferTorah {
  id: string;
  name: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

interface ScheduleRow {
  id: string;
  scheduled_date: string;
  sefer_id: string;
  label: string | null;
  position: number;
  time_slot: string; // 'all' | 'morning' | 'mincha'
}

const TIME_SLOT_LABELS: Record<string, string> = {
  all: 'כל היום',
  morning: 'שחרית (בוקר)',
  mincha: 'מנחה (אחה״צ)',
};


const ACTIVE_KEY = 'active_sefer_torah_id';
const ROSH_CHODESH_KEY = 'rosh_chodesh_sefer_ids';
const ROSH_CHODESH_MONTH_PREFIX = 'rosh_chodesh_sefer_ids_m';
const HEBREW_MONTH_NAMES: Record<number, string> = {
  1: 'ניסן', 2: 'אייר', 3: 'סיוון', 4: 'תמוז', 5: 'אב', 6: 'אלול',
  7: 'תשרי', 8: 'חשוון', 9: 'כסלו', 10: 'טבת', 11: 'שבט', 12: 'אדר', 13: 'אדר ב׳',
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const toIsoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function SifreiTorahManager() {
  const [list, setList] = useState<SeferTorah[]>([]);
  const [activeId, setActiveId] = useState<string>('none');
  const [roshChodeshIds, setRoshChodeshIds] = useState<string[]>([]);
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('name_asc');

  // שיוך לפי תאריך
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [schedDate, setSchedDate] = useState<Date | undefined>(undefined);
  const [schedSeferIds, setSchedSeferIds] = useState<string[]>([]);
  const [schedLabel, setSchedLabel] = useState('');
  const [schedSlot, setSchedSlot] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null);


  const load = async () => {
    const todayIso = toIsoDate(new Date());
    const [{ data: items }, { data: settings }, { data: sched }] = await Promise.all([
      db.from('sifrei_torah').select('*').order('created_at', { ascending: true }),
      supabase.from('app_settings').select('key,value').in('key', [ACTIVE_KEY, ROSH_CHODESH_KEY]),
      db
        .from('sifrei_torah_schedule')
        .select('*')
        .gte('scheduled_date', todayIso)
        .order('scheduled_date', { ascending: true }),
    ]);
    setList((items || []) as SeferTorah[]);
    const settingsMap = new Map<string, string>((settings || []).map((s: { key: string; value: string }) => [s.key, s.value]));
    setActiveId(settingsMap.get(ACTIVE_KEY) || 'none');
    const rcRaw = settingsMap.get(ROSH_CHODESH_KEY) || '';
    setRoshChodeshIds(rcRaw ? rcRaw.split(',').filter(Boolean) : []);
    setSchedule((sched || []) as ScheduleRow[]);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('sifrei-torah-manager')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sifrei_torah' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sifrei_torah_schedule' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addSchedule = async () => {
    if (!schedDate || schedSeferIds.length === 0) {
      toast({ title: 'יש לבחור תאריך ולפחות ספר תורה אחד', variant: 'destructive' });
      return;
    }
    const dateIso = toIsoDate(schedDate);
    const rows = schedSeferIds.map((sefer_id, idx) => ({
      scheduled_date: dateIso,
      sefer_id,
      label: schedLabel.trim() || null,
      position: idx + 1,
      time_slot: schedSlot,
    }));
    const { error } = await db
      .from('sifrei_torah_schedule')
      .upsert(rows, { onConflict: 'scheduled_date,time_slot,sefer_id' });
    if (error) {
      toast({ title: 'שגיאה בשמירת השיוך', description: error.message, variant: 'destructive' });
      return;
    }
    setSchedDate(undefined);
    setSchedSeferIds([]);
    setSchedLabel('');
    setSchedSlot('all');
    toast({ title: `נשמרו ${rows.length} ספרים לתאריך (${TIME_SLOT_LABELS[schedSlot]})` });
    load();
  };

  const removeSchedule = (id: string) => setDeleteScheduleId(id);

  const confirmRemoveSchedule = async () => {
    if (!deleteScheduleId) return;
    const id = deleteScheduleId;
    setDeleteScheduleId(null);
    const { error } = await db.from('sifrei_torah_schedule').delete().eq('id', id);
    if (error) {
      toast({ title: 'שגיאה במחיקה', variant: 'destructive' });
      return;
    }
    toast({ title: 'נמחק' });
    load();
  };


  const saveActive = async (id: string) => {
    setActiveId(id);
    const value = id === 'none' ? '' : id;
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .eq('key', ACTIVE_KEY)
      .maybeSingle();
    if (existing) {
      await supabase.from('app_settings').update({ value }).eq('key', ACTIVE_KEY);
    } else {
      await supabase.from('app_settings').insert({ key: ACTIVE_KEY, value });
    }
    toast({ title: id === 'none' ? 'בוטל ספר תורה פעיל' : 'ספר התורה הפעיל עודכן' });
  };

  const toggleRoshChodeshSefer = async (id: string) => {
    const next = roshChodeshIds.includes(id)
      ? roshChodeshIds.filter((x) => x !== id)
      : [...roshChodeshIds, id];
    setRoshChodeshIds(next);
    const value = next.join(',');
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .eq('key', ROSH_CHODESH_KEY)
      .maybeSingle();
    if (existing) {
      await supabase.from('app_settings').update({ value }).eq('key', ROSH_CHODESH_KEY);
    } else {
      await supabase.from('app_settings').insert({ key: ROSH_CHODESH_KEY, value });
    }
    toast({ title: 'הגדרת ראש חודש עודכנה' });
  };

  const addSefer = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    const { error } = await db.from('sifrei_torah').insert({
      name: newName.trim(),
      notes: newNotes.trim() || null,
    });
    setLoading(false);
    if (error) {
      toast({ title: 'שגיאה בהוספה', variant: 'destructive' });
      return;
    }
    setNewName('');
    setNewNotes('');
    toast({ title: 'ספר התורה נוסף' });
    load();
  };

  const startEdit = (s: SeferTorah) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditNotes(s.notes || '');
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    const { error } = await db
      .from('sifrei_torah')
      .update({ name: editName.trim(), notes: editNotes.trim() || null })
      .eq('id', editingId);
    if (error) {
      toast({ title: 'שגיאה בעדכון', variant: 'destructive' });
      return;
    }
    setEditingId(null);
    toast({ title: 'עודכן בהצלחה' });
    load();
  };

  const confirmRemove = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    const { error } = await db.from('sifrei_torah').delete().eq('id', id);
    if (error) {
      toast({ title: 'שגיאה במחיקה', variant: 'destructive' });
      return;
    }
    if (activeId === id) saveActive('none');
    toast({ title: 'נמחק' });
    load();
  };

  const toggleActive = async (s: SeferTorah) => {
    await db.from('sifrei_torah').update({ is_active: !s.is_active }).eq('id', s.id);
    load();
  };

  const displayList = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? list.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            (s.notes || '').toLowerCase().includes(q),
        )
      : list;
    const sorted = [...filtered].sort((a, b) => {
      switch (sort) {
        case 'name_asc':
          return a.name.localeCompare(b.name, 'he');
        case 'name_desc':
          return b.name.localeCompare(a.name, 'he');
        case 'created_asc':
          return (a.created_at || '').localeCompare(b.created_at || '');
        case 'created_desc':
          return (b.created_at || '').localeCompare(a.created_at || '');
      }
    });
    return sorted;
  }, [list, search, sort]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="w-5 h-5" />
          ספרי תורה
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-3 sm:px-6">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            ספר התורה לשבת/חג הקרובים
          </Label>
          <Select value={activeId || 'none'} onValueChange={saveActive}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="בחר ספר תורה" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— ללא הצגה —</SelectItem>
              {list
                .filter((s) => s.is_active)
                .map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            השם יופיע במסך התצוגה הציבורי בכותרת.
          </p>
        </div>

        <div className="border-t pt-4 space-y-2">
          <Label className="flex items-center gap-2 text-sm font-semibold">
            <Moon className="w-4 h-4 text-indigo-500" />
            ספרי תורה לראש חודש (קבוע)
          </Label>
          <p className="text-xs text-muted-foreground">
            בכל ראש חודש המסך יציג אוטומטית את הספרים שנבחרו כאן — אין צורך לעדכן ידנית בכל חודש. שיוך ספציפי לתאריך גובר על הגדרה זו.
          </p>
          <div className="border rounded-lg p-2 space-y-1 bg-background">
            {list.filter((s) => s.is_active).length === 0 ? (
              <p className="text-xs text-muted-foreground p-2">אין ספרי תורה פעילים.</p>
            ) : (
              list
                .filter((s) => s.is_active)
                .map((s) => {
                  const checked = roshChodeshIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={cn(
                        'flex items-center gap-3 p-3 sm:p-2 rounded cursor-pointer hover:bg-muted/50 min-h-[44px]',
                        checked && 'bg-indigo-50 dark:bg-indigo-950/20',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRoshChodeshSefer(s.id)}
                        className="w-5 h-5 accent-indigo-500"
                      />
                      <span className="text-sm truncate flex-1">{s.name}</span>
                      {checked && (
                        <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 shrink-0 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50">
                          ר״ח
                        </span>
                      )}
                    </label>
                  );
                })
            )}
          </div>
        </div>


        <div className="border-t pt-4 space-y-3">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-amber-500" />
            שיוך ספר תורה לתאריך (שבת/חג)
          </Label>
          <p className="text-xs text-muted-foreground">
            בתאריך שנבחר — המסך יציג אוטומטית את הספרים המשויכים, כולל מקרים של 2 או 3 ספרי תורה (כמו ראש חודש, חנוכה, פרשת שקלים וכו').
          </p>

          <div className="grid grid-cols-1 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('justify-start text-right font-normal', !schedDate && 'text-muted-foreground')}
                >
                  <CalendarIcon className="w-4 h-4 ml-2" />
                  {schedDate ? format(schedDate, 'PPP', { locale: he }) : 'בחר תאריך'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={schedDate}
                  onSelect={setSchedDate}
                  initialFocus
                  locale={he}
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>

            <div className="border rounded-lg p-2 space-y-1 max-h-64 overflow-y-auto bg-background">
              <p className="text-xs text-muted-foreground px-1 pb-1">
                סמן את הספרים שיוצאו (סדר הסימון = סדר ההצגה)
              </p>
              {list.filter((s) => s.is_active).length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">אין ספרי תורה פעילים.</p>
              ) : (
                list
                  .filter((s) => s.is_active)
                  .map((s) => {
                    const idx = schedSeferIds.indexOf(s.id);
                    const checked = idx !== -1;
                    return (
                      <label
                        key={s.id}
                        className={cn(
                          'flex items-center justify-between gap-3 p-3 sm:p-2 rounded cursor-pointer hover:bg-muted/50 min-h-[44px]',
                          checked && 'bg-amber-50 dark:bg-amber-950/20',
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSchedSeferIds((prev) => [...prev, s.id]);
                              } else {
                                setSchedSeferIds((prev) => prev.filter((id) => id !== s.id));
                              }
                            }}
                            className="w-5 h-5 accent-amber-500"
                          />
                          <span className="text-sm truncate">{s.name}</span>
                        </div>
                        {checked && (
                          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 shrink-0 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40">
                            #{idx + 1}
                          </span>
                        )}
                      </label>
                    );
                  })
              )}
            </div>


            <Input
              placeholder="תיאור (למשל: פרשת שקלים / ראש חודש) — אופציונלי"
              value={schedLabel}
              onChange={(e) => setSchedLabel(e.target.value)}
            />

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">מועד היציאה</Label>
              <Select value={schedSlot} onValueChange={setSchedSlot}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל היום (ברירת מחדל)</SelectItem>
                  <SelectItem value="morning">שחרית (בוקר)</SelectItem>
                  <SelectItem value="mincha">מנחה (אחר הצהריים)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                בשבת ניתן להגדיר ספר אחד לשחרית וספר אחר למנחה — המסך יחליף ביניהם אוטומטית. בראש חודש/חנוכה/שקלים: בחרו "כל היום" וסמנו 2-3 ספרים.
              </p>
            </div>
          </div>

          <Button
            onClick={addSchedule}
            disabled={!schedDate || schedSeferIds.length === 0}
            className="w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 ml-1" />
            הוסף שיוך ({schedSeferIds.length} ספרים · {TIME_SLOT_LABELS[schedSlot]})
          </Button>

          {schedule.length > 0 && (
            <div className="space-y-2 pt-2">
              <Label className="text-xs text-muted-foreground">שיוכים עתידיים</Label>
              {(() => {
                const grouped = new Map<string, ScheduleRow[]>();
                schedule.forEach((row) => {
                  const key = `${row.scheduled_date}__${row.time_slot || 'all'}`;
                  const arr = grouped.get(key) || [];
                  arr.push(row);
                  grouped.set(key, arr);
                });
                const entries = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
                return entries.map(([key, rows]) => {
                  const [date, slot] = key.split('__');
                  const d = new Date(date + 'T00:00:00');
                  const sorted = [...rows].sort((a, b) => (a.position || 0) - (b.position || 0));
                  const label = sorted.find((r) => r.label)?.label;
                  const slotLabel = TIME_SLOT_LABELS[slot] || slot;
                  const slotColor =
                    slot === 'mincha'
                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                      : slot === 'morning'
                      ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                      : 'bg-muted text-foreground';
                  return (
                    <div key={key} className="p-2 rounded-lg border bg-background space-y-1">
                      <p className="text-sm font-medium flex flex-wrap items-center gap-2">
                        <span>{format(d, 'EEEE, d בMMMM yyyy', { locale: he })}</span>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full', slotColor)}>
                          {slotLabel}
                        </span>
                        {label ? <span className="text-muted-foreground"> • {label}</span> : null}
                        {sorted.length > 1 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            {sorted.length} ספרים
                          </span>
                        )}
                      </p>
                      <div className="space-y-1">
                        {sorted.map((row, i) => {
                          const sefer = list.find((s) => s.id === row.sefer_id);
                          return (
                            <div
                              key={row.id}
                              className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
                            >
                              <span className="truncate">
                                📜 #{i + 1} {sefer?.name || '—'}
                              </span>
                              <Button size="icon" variant="ghost" onClick={() => removeSchedule(row.id)}>
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>


        <div className="border-t pt-4 space-y-3">
          <Label className="text-sm font-semibold">הוספת ספר תורה חדש</Label>
          <Input
            placeholder="שם הספר (לדוג' ספר רבי יוסף)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Textarea
            placeholder="הערות (אופציונלי) — תיאור, מקור, מצב הספר וכו'"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            rows={3}
          />
          <Button onClick={addSefer} disabled={loading || !newName.trim()}>
            <Plus className="w-4 h-4 ml-1" />
            הוסף
          </Button>
        </div>

        <div className="border-t pt-4 space-y-3">
          <Label className="text-sm font-semibold">רשימת ספרי התורה</Label>

          {list.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="חיפוש לפי שם או הערות..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
                <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name_asc">שם — א׳-ת׳</SelectItem>
                    <SelectItem value="name_desc">שם — ת׳-א׳</SelectItem>
                    <SelectItem value="created_desc">חדש → ישן</SelectItem>
                    <SelectItem value="created_asc">ישן → חדש</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">אין ספרי תורה. הוסף את הראשון למעלה.</p>
          ) : displayList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">לא נמצאו תוצאות לחיפוש "{search}".</p>
          ) : (
            <div className="space-y-2">
              {displayList.map((s) => (
                <div
                  key={s.id}
                  className={`p-3 rounded-lg border ${
                    activeId === s.id ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : 'bg-background'
                  }`}
                >
                  {editingId === s.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="שם הספר"
                      />
                      <Textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="הערות"
                        rows={4}
                      />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          <X className="w-4 h-4 ml-1" />
                          ביטול
                        </Button>
                        <Button size="sm" onClick={saveEdit}>
                          <Check className="w-4 h-4 ml-1" />
                          שמור
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {activeId === s.id && <Star className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />}
                          <p className={`font-medium ${!s.is_active ? 'line-through text-muted-foreground' : ''}`}>
                            {s.name}
                          </p>
                        </div>
                        {s.notes && (
                          <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{s.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 self-end sm:self-start">
                        <Button
                          size="sm"
                          variant={s.is_active ? 'outline' : 'secondary'}
                          onClick={() => toggleActive(s)}
                        >
                          {s.is_active ? 'פעיל' : 'מושבת'}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => startEdit(s)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteId(s.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת ספר תורה</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const s = list.find((x) => x.id === deleteId);
                return s
                  ? `האם למחוק את "${s.name}"? לא ניתן לשחזר פעולה זו, וכל השיוכים העתידיים לתאריכים שמשתמשים בספר זה יימחקו אף הם.`
                  : 'האם למחוק ספר תורה זה?';
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteScheduleId} onOpenChange={(open) => !open && setDeleteScheduleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת שיוך</AlertDialogTitle>
            <AlertDialogDescription>
              למחוק שיוך זה? אם יש מספר ספרים לאותו תאריך, רק שורה זו תוסר.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveSchedule}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
