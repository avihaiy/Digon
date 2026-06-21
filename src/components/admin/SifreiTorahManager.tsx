import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ScrollText, Plus, Pencil, Trash2, Check, X, Star, Search, ArrowUpDown, Calendar as CalendarIcon, Moon, Lock } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getRequiredSifreiTorah, getNextShabbat } from '@/lib/hebrew-utils';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


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
  const { isAdmin } = useAuth();
  const [list, setList] = useState<SeferTorah[]>([]);

  const [activeId, setActiveId] = useState<string>('none');
  const [roshChodeshIds, setRoshChodeshIds] = useState<string[]>([]);
  const [monthOverrides, setMonthOverrides] = useState<Record<number, string[]>>({});
  const [selectedMonth, setSelectedMonth] = useState<string>('1');
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
    const monthKeys = Array.from({ length: 13 }, (_, i) => `${ROSH_CHODESH_MONTH_PREFIX}${i + 1}`);
    const [{ data: items }, { data: settings }, { data: sched }] = await Promise.all([
      db.from('sifrei_torah').select('*').order('created_at', { ascending: true }),
      supabase.from('app_settings').select('key,value').in('key', [ACTIVE_KEY, ROSH_CHODESH_KEY, ...monthKeys]),
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
    const overrides: Record<number, string[]> = {};
    for (let m = 1; m <= 13; m++) {
      const v = settingsMap.get(`${ROSH_CHODESH_MONTH_PREFIX}${m}`) || '';
      if (v) overrides[m] = v.split(',').filter(Boolean);
    }
    setMonthOverrides(overrides);
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
    if (!isAdmin) {
      toast({ title: 'אין הרשאה — פעולה זו זמינה למנהל בלבד', variant: 'destructive' });
      return;
    }
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

  const removeSchedule = (id: string) => {
    if (!isAdmin) {
      toast({ title: 'אין הרשאה — פעולה זו זמינה למנהל בלבד', variant: 'destructive' });
      return;
    }
    setDeleteScheduleId(id);
  };

  const confirmRemoveSchedule = async () => {
    if (!deleteScheduleId) return;
    if (!isAdmin) { setDeleteScheduleId(null); return; }

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
    if (!isAdmin) {
      toast({ title: 'אין הרשאה — פעולה זו זמינה למנהל בלבד', variant: 'destructive' });
      return;
    }
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

  const toggleMonthOverrideSefer = async (month: number, id: string) => {
    if (!isAdmin) {
      toast({ title: 'אין הרשאה — פעולה זו זמינה למנהל בלבד', variant: 'destructive' });
      return;
    }
    const current = monthOverrides[month] || [];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    setMonthOverrides((prev) => ({ ...prev, [month]: next }));
    const key = `${ROSH_CHODESH_MONTH_PREFIX}${month}`;
    const value = next.join(',');
    const { data: existing } = await supabase
      .from('app_settings').select('id').eq('key', key).maybeSingle();
    if (existing) {
      await supabase.from('app_settings').update({ value }).eq('key', key);
    } else {
      await supabase.from('app_settings').insert({ key, value });
    }
    toast({ title: `עודכן ר״ח ${HEBREW_MONTH_NAMES[month]}` });
  };

  const clearMonthOverride = async (month: number) => {
    if (!isAdmin) {
      toast({ title: 'אין הרשאה — פעולה זו זמינה למנהל בלבד', variant: 'destructive' });
      return;
    }
    setMonthOverrides((prev) => {
      const copy = { ...prev };
      delete copy[month];
      return copy;
    });
    const key = `${ROSH_CHODESH_MONTH_PREFIX}${month}`;
    await supabase.from('app_settings').delete().eq('key', key);
    toast({ title: `נמחקה הגדרה לר״ח ${HEBREW_MONTH_NAMES[month]}` });
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
      <CardContent className="p-0 sm:p-6 sm:pt-6">
        <Tabs defaultValue="inventory" className="w-full">
          <TabsList className="w-full h-auto flex flex-wrap mb-4 bg-muted/50 p-1">
            <TabsTrigger value="inventory" className="flex-1 py-3 data-[state=active]:bg-background">
              <ScrollText className="w-4 h-4 ml-2" />
              מלאי ספרים
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex-1 py-3 data-[state=active]:bg-background">
              <CalendarIcon className="w-4 h-4 ml-2" />
              שיבוץ
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex-1 py-3 data-[state=active]:bg-background">
              <Moon className="w-4 h-4 ml-2" />
              ר"ח
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-4 px-3 sm:px-0">
            {/* הוספת ספר */}
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Plus className="w-4 h-4" /> הוספת ספר תורה חדש
              </Label>
              <Input
                placeholder="שם הספר (לדוג' ספר רבי יוסף)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Textarea
                placeholder="הערות (אופציונלי) — תיאור, מקור, מצב הספר וכו'"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                rows={2}
              />
              <Button onClick={addSefer} disabled={loading || !newName.trim()}>
                הוסף ספר
              </Button>
            </div>

            {/* רשימת הספרים */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">רשימת ספרי התורה ({list.length})</Label>

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
                <p className="text-sm text-muted-foreground text-center py-8 bg-muted/20 rounded-lg border border-dashed">אין ספרי תורה במערכת.</p>
              ) : displayList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">לא נמצאו תוצאות לחיפוש "{search}".</p>
              ) : (
                <div className="space-y-2">
                  {displayList.map((s) => (
                    <div
                      key={s.id}
                      className={`p-3 rounded-lg border ${
                        activeId === s.id ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : 'bg-background hover:bg-muted/30 transition-colors'
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
                            rows={3}
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                              <X className="w-4 h-4 ml-1" /> ביטול
                            </Button>
                            <Button size="sm" onClick={saveEdit}>
                              <Check className="w-4 h-4 ml-1" /> שמור
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {activeId === s.id && <Star className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />}
                              <p className={`font-medium ${!s.is_active ? 'line-through text-muted-foreground' : ''}`}>
                                {s.name}
                              </p>
                            </div>
                            {s.notes && (
                              <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line bg-muted/30 p-2 rounded">{s.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0 self-end sm:self-start bg-background p-1 rounded-md border shadow-sm">
                            <Button
                              size="sm"
                              variant={s.is_active ? 'ghost' : 'secondary'}
                              onClick={() => toggleActive(s)}
                              className="h-7 text-xs px-2"
                            >
                              {s.is_active ? 'פעיל' : 'מושבת'}
                            </Button>
                            <div className="w-px h-4 bg-border mx-1" />
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(s)}>
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteId(s.id)}>
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6 px-3 sm:px-0">
            {/* בחירת ספר פעיל (שבת קרובה) */}
            <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/10 space-y-3">
              <Label className="flex items-center gap-2 text-amber-900 dark:text-amber-300">
                <Star className="w-4 h-4 text-amber-500" />
                ספר התורה לשבת/חג הקרובים
              </Label>
              <Select value={activeId || 'none'} onValueChange={saveActive}>
                <SelectTrigger className="h-11 bg-background">
                  <SelectValue placeholder="בחר ספר תורה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— ללא תצוגה מיוחדת —</SelectItem>
                  {list
                    .filter((s) => s.is_active)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                השם יופיע במסך התצוגה הציבורי בכותרת באופן קבוע עד שישונה.
              </p>
            </div>

            {/* שיוך לתאריך ספציפי */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-indigo-500" />
                    שיבוץ לפי תאריך
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    שיבוץ לספרים ספציפיים לתאריך עתידי (לדוג' שמחת תורה, שבת זכור). שיבוץ זה גובר על הגדרות ר"ח.
                  </p>
                </div>
                {!isAdmin && (
                  <span className="text-[10px] font-semibold text-muted-foreground inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted">
                    <Lock className="w-3 h-3" /> לצפייה בלבד
                  </span>
                )}
              </div>

              {/* Halachic Requirement Alert */}
              {(() => {
                const targetDate = schedDate || getNextShabbat(new Date());
                const req = getRequiredSifreiTorah(targetDate);
                if (req.count > 1) {
                  return (
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-lg text-indigo-800 dark:text-indigo-300 shadow-sm animate-in fade-in slide-in-from-top-2">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        שים לב: לתאריך {format(targetDate, 'dd/MM/yyyy')} דרושים {req.count} ספרי תורה
                      </p>
                      <p className="text-xs mt-1 opacity-90">
                        סיבה: {req.reasons.join(', ')}
                      </p>
                      {!schedDate && <p className="text-[10px] mt-1 font-bold bg-indigo-100 dark:bg-indigo-900/50 inline-block px-2 py-0.5 rounded">ההתרעה מתייחסת לשבת/חג הקרובים</p>}
                    </div>
                  );
                }
                return null;
              })()}

              {isAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/20">
                  <div className="space-y-3">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn('w-full justify-start text-right font-normal bg-background', !schedDate && 'text-muted-foreground')}
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
                        />
                      </PopoverContent>
                    </Popover>
                    
                    <div className="space-y-1">
                      <Select value={schedSlot} onValueChange={setSchedSlot}>
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">כל היום (ברירת מחדל)</SelectItem>
                          <SelectItem value="morning">שחרית (בוקר)</SelectItem>
                          <SelectItem value="mincha">מנחה (אחר הצהריים)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Input
                      placeholder="תיאור (למשל: פרשת זכור) — אופציונלי"
                      value={schedLabel}
                      onChange={(e) => setSchedLabel(e.target.value)}
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-3 flex flex-col h-full">
                    <div className="border rounded-lg p-2 flex-1 overflow-y-auto bg-background max-h-48">
                      <p className="text-xs text-muted-foreground px-1 pb-2 font-medium">סמן את הספרים (לפי סדר הוצאתם):</p>
                      {list.filter((s) => s.is_active).length === 0 ? (
                        <p className="text-xs text-muted-foreground p-2">אין ספרי תורה פעילים.</p>
                      ) : (
                        <div className="space-y-1">
                          {list.filter((s) => s.is_active).map((s) => {
                            const idx = schedSeferIds.indexOf(s.id);
                            const checked = idx !== -1;
                            return (
                              <label
                                key={s.id}
                                className={cn(
                                  'flex items-center justify-between gap-3 p-2 rounded cursor-pointer hover:bg-muted transition-colors',
                                  checked && 'bg-indigo-50 dark:bg-indigo-950/20'
                                )}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      if (e.target.checked) setSchedSeferIds((prev) => [...prev, s.id]);
                                      else setSchedSeferIds((prev) => prev.filter((id) => id !== s.id));
                                    }}
                                    className="w-4 h-4 accent-indigo-600"
                                  />
                                  <span className="text-sm truncate">{s.name}</span>
                                </div>
                                {checked && (
                                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/40 w-5 h-5 flex items-center justify-center rounded-full shrink-0">
                                    {idx + 1}
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <Button onClick={addSchedule} disabled={!schedDate || schedSeferIds.length === 0} className="w-full">
                      <Plus className="w-4 h-4 ml-1" /> הוסף שיבוץ
                    </Button>
                  </div>
                </div>
              )}

              {/* רשימת שיוכים קיימים */}
              {schedule.length > 0 && (
                <div className="space-y-3 pt-2">
                  <Label className="text-sm font-semibold">שיבוצים קיימים</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
                          : slot === 'morning'
                          ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300'
                          : 'bg-muted text-foreground';
                      return (
                        <div key={key} className="p-3 rounded-lg border bg-background flex flex-col gap-2 shadow-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-sm">{format(d, 'EEEE, d בMMMM yyyy', { locale: he })}</p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                <span className={cn('text-[10px] px-2 py-0.5 rounded-md font-medium', slotColor)}>
                                  {slotLabel}
                                </span>
                                {label && <span className="text-[10px] bg-muted px-2 py-0.5 rounded-md text-muted-foreground">{label}</span>}
                              </div>
                            </div>
                            {sorted.length > 1 && (
                              <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">
                                {sorted.length} ספרים
                              </span>
                            )}
                          </div>
                          <div className="mt-2 space-y-1.5 border-t pt-2">
                            {sorted.map((row, i) => {
                              const sefer = list.find((s) => s.id === row.sefer_id);
                              return (
                                <div key={row.id} className="flex items-center justify-between gap-2 text-xs bg-muted/30 p-1.5 rounded">
                                  <span className="truncate flex items-center gap-2">
                                    <span className="text-muted-foreground font-mono">{i + 1}.</span> 
                                    {sefer?.name || '—'}
                                  </span>
                                  {isAdmin && (
                                    <Button size="icon" variant="ghost" className="h-5 w-5 hover:bg-destructive/10 hover:text-destructive text-muted-foreground" onClick={() => removeSchedule(row.id)}>
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="rules" className="space-y-6 px-3 sm:px-0">
            <div className="bg-muted/30 p-4 rounded-lg border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="flex items-center gap-2 text-sm font-semibold">
                    <Moon className="w-4 h-4 text-sky-500" />
                    ספרי תורה קבועים לראשי חודשים
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    הספרים שיבחרו כאן יוצגו אוטומטית בכל ראש חודש, אלא אם כן הוגדר חוק ספציפי לחודש מסוים.
                  </p>
                </div>
                {!isAdmin && (
                  <span className="text-[10px] font-semibold text-muted-foreground inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background border">
                    <Lock className="w-3 h-3" /> לצפייה בלבד
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {list.filter((s) => s.is_active).length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">אין ספרי תורה פעילים.</p>
                ) : (
                  list.filter((s) => s.is_active).map((s) => {
                    const checked = roshChodeshIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border bg-background transition-colors',
                          isAdmin ? 'cursor-pointer hover:bg-muted/50' : 'cursor-not-allowed opacity-90',
                          checked && 'border-sky-300 bg-sky-50/50 dark:border-sky-900 dark:bg-sky-950/20'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!isAdmin}
                          onChange={() => toggleRoshChodeshSefer(s.id)}
                          className="w-4 h-4 accent-sky-500 disabled:cursor-not-allowed"
                        />
                        <span className="text-sm truncate flex-1">{s.name}</span>
                        {checked && (
                          <span className="text-[10px] font-semibold text-sky-700 bg-sky-100 dark:text-sky-300 dark:bg-sky-900/50 px-2 py-0.5 rounded-full">
                            ר״ח קבוע
                          </span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="flex items-center gap-2 text-sm font-semibold">
                    <Moon className="w-4 h-4 text-purple-500" />
                    הגדרות חריגות לפי חודש עברי
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    כאן ניתן להגדיר הרכב ספרים שונה לחודש ספציפי (לדוגמה ר"ח אדר).
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-full md:w-64 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 13 }, (_, i) => i + 1).map((m) => {
                      const has = (monthOverrides[m] || []).length > 0;
                      return (
                        <SelectItem key={m} value={String(m)}>
                          {HEBREW_MONTH_NAMES[m]} {has ? `• הוגדרו ${monthOverrides[m].length} ספרים` : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                
                {(() => {
                  const month = Number(selectedMonth);
                  const selectedIds = monthOverrides[month] || [];
                  const active = list.filter((s) => s.is_active);
                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {active.length === 0 ? (
                          <p className="text-xs text-muted-foreground p-2">אין ספרי תורה פעילים.</p>
                        ) : (
                          active.map((s) => {
                            const checked = selectedIds.includes(s.id);
                            return (
                              <label
                                key={s.id}
                                className={cn(
                                  'flex items-center gap-3 p-3 rounded-lg border bg-background transition-colors',
                                  isAdmin ? 'cursor-pointer hover:bg-muted/50' : 'cursor-not-allowed opacity-90',
                                  checked && 'border-purple-300 bg-purple-50/50 dark:border-purple-900 dark:bg-purple-950/20'
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={!isAdmin}
                                  onChange={() => toggleMonthOverrideSefer(month, s.id)}
                                  className="w-4 h-4 accent-purple-500 disabled:cursor-not-allowed"
                                />
                                <span className="text-sm truncate flex-1">{s.name}</span>
                                {checked && (
                                  <span className="text-[10px] font-semibold text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/50 px-2 py-0.5 rounded-full">
                                    ר״ח {HEBREW_MONTH_NAMES[month]}
                                  </span>
                                )}
                              </label>
                            );
                          })
                        )}
                      </div>
                      
                      {isAdmin && selectedIds.length > 0 && (
                        <div className="pt-2 flex">
                          <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground" onClick={() => clearMonthOverride(month)}>
                            <Trash2 className="w-3.5 h-3.5 ml-2" />
                            נקה הגדרה מיוחדת לר"ח {HEBREW_MONTH_NAMES[month]}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </TabsContent>
        </Tabs>
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
