import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ScrollText, Plus, Pencil, Trash2, Star, Search, Calendar as CalendarIcon, Moon, Lock, Info, Check, AlertTriangle } from 'lucide-react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
  time_slot: string;
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
  
  // States for Inventory Tab
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('name_asc');
  
  // UI States for Modals/Sheets
  const [isAddSeferOpen, setIsAddSeferOpen] = useState(false);
  const [isEditSeferOpen, setIsEditSeferOpen] = useState(false);
  const [isAddScheduleOpen, setIsAddScheduleOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('1');

  // States for Schedule Tab
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [schedMode, setSchedMode] = useState<'date' | 'month'>('date');
  const [schedDate, setSchedDate] = useState<Date | undefined>(undefined);
  const [schedMonthYear, setSchedMonthYear] = useState<string>('');
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
      toast({ title: 'אין הרשאה - רק מנהל יכול לשבץ', variant: 'destructive' });
      return;
    }
    if ((schedMode === 'date' && !schedDate) || (schedMode === 'month' && !schedMonthYear) || schedSeferIds.length === 0) {
      toast({ title: 'יש לבחור תאריך/חודש ולפחות ספר תורה אחד', variant: 'destructive' });
      return;
    }

    let datesToSchedule: Date[] = [];

    if (schedMode === 'date' && schedDate) {
      datesToSchedule = [schedDate];
    } else if (schedMode === 'month' && schedMonthYear) {
      const [yearStr, monthStr] = schedMonthYear.split('-');
      const hYear = parseInt(yearStr);
      const hMonth = parseInt(monthStr);
      
      let hd = new HDate(1, hMonth, hYear);
      while (hd.getMonth() === hMonth) {
        if (hd.getDay() === 6) { // 6 = Saturday
          datesToSchedule.push(hd.greg());
        }
        hd = hd.next();
      }
      
      if (datesToSchedule.length === 0) {
        toast({ title: 'לא נמצאו שבתות בחודש זה', variant: 'destructive' });
        return;
      }
    }

    const allRows: any[] = [];
    datesToSchedule.forEach(date => {
      const dateIso = toIsoDate(date);
      schedSeferIds.forEach((sefer_id, idx) => {
        allRows.push({
          scheduled_date: dateIso,
          sefer_id,
          label: schedLabel.trim() || null,
          position: idx + 1,
          time_slot: schedSlot,
        });
      });
    });

    const { error } = await db
      .from('sifrei_torah_schedule')
      .upsert(allRows, { onConflict: 'scheduled_date,time_slot,sefer_id' });
      
    if (error) {
      toast({ title: 'שגיאה בשמירת השיוך', description: error.message, variant: 'destructive' });
      return;
    }
    
    setSchedDate(undefined);
    setSchedMonthYear('');
    setSchedMode('date');
    setSchedSeferIds([]);
    setSchedLabel('');
    setSchedSlot('all');
    setIsAddScheduleOpen(false);
    toast({ title: `נשמרו ${allRows.length} שיבוצים` });
    load();
  };

  const nextHebrewMonths = useMemo(() => {
    const months = [];
    let hd = new HDate();
    hd = new HDate(1, hd.getMonth(), hd.getFullYear());
    for (let i = 0; i < 12; i++) {
      const parts = hd.render('he-x-NoNikud').split(' ');
      parts.shift(); // Remove the day (א׳)
      months.push({
        value: `${hd.getFullYear()}-${hd.getMonth()}`,
        label: parts.join(' '),
      });
      const nextHd = new HDate(hd.abs() + 32);
      hd = new HDate(1, nextHd.getMonth(), nextHd.getFullYear());
    }
    return months;
  }, []);

  const removeSchedule = (id: string) => {
    if (!isAdmin) {
      toast({ title: 'אין הרשאה', variant: 'destructive' });
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
    if (!isAdmin) return;
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
  };

  const toggleMonthOverrideSefer = async (month: number, id: string) => {
    if (!isAdmin) return;
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
  };

  const clearMonthOverride = async (month: number) => {
    if (!isAdmin) return;
    setMonthOverrides((prev) => {
      const copy = { ...prev };
      delete copy[month];
      return copy;
    });
    const key = `${ROSH_CHODESH_MONTH_PREFIX}${month}`;
    await supabase.from('app_settings').delete().eq('key', key);
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
    setIsAddSeferOpen(false);
    toast({ title: 'ספר התורה נוסף' });
    load();
  };

  const startEdit = (s: SeferTorah) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditNotes(s.notes || '');
    setIsEditSeferOpen(true);
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
    setIsEditSeferOpen(false);
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

  const previewDisplay = useMemo(() => {
    const targetDate = getNextShabbat(new Date());
    const targetIso = toIsoDate(targetDate);
    
    let activeName = '';
    const daySchedule = schedule.filter(s => s.scheduled_date === targetIso);
    if (daySchedule.length > 0) {
      const sorted = daySchedule.sort((a,b) => a.position - b.position);
      activeName = sorted.map(row => {
        const sefer = list.find(s => s.id === row.sefer_id);
        return sefer ? sefer.name : '';
      }).filter(Boolean).join(" · ");
    } else {
      const activeSefer = list.find(s => s.id === activeId);
      if (activeSefer) activeName = activeSefer.name;
    }

    const req = getRequiredSifreiTorah(targetDate);
    
    if (activeName) {
      const isPlural = activeName.includes(" · ");
      let text = isPlural ? "ספרי תורה" : "ספר תורה";
      if (req.reasons.length > 0) {
        const specialReasons = req.reasons.filter(r => !r.startsWith('פרשת'));
        if (specialReasons.length > 0) text += ` (${specialReasons.join(', ')})`;
      }
      return { icon: "📜", text: `${text}: ${activeName}` };
    } else if (req.count > 1) {
      const specialReasons = req.reasons.filter(r => !r.startsWith('פרשת'));
      const reasonsStr = specialReasons.length > 0 ? ` (${specialReasons.join(', ')})` : '';
      return { icon: "📜", text: `מוציאים ${req.count} ספרי תורה${reasonsStr}` };
    }
    return { icon: "📜", text: "ספר תורה" };
  }, [activeId, list, schedule]);

  const missingAlerts = useMemo(() => {
    const alerts: { date: Date; reason: string; count: number; daySchedCount: number }[] = [];
    const today = new Date();
    // Scan next 14 days
    for (let i = 0; i <= 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const iso = toIsoDate(d);
      
      const req = getRequiredSifreiTorah(d);
      const isRegular = req.reasons.length === 1 && req.reasons[0].startsWith('פרשת');
      
      if (!isRegular && req.count >= 1) {
        const daySched = schedule.filter(s => s.scheduled_date === iso);
        
        // Skip if ONLY Rosh Chodesh and we have enough defaults
        const isOnlyRoshChodesh = req.reasons.length === 1 && req.reasons[0] === 'ראש חודש';
        if (isOnlyRoshChodesh && daySched.length === 0 && roshChodeshIds.length >= req.count) {
          continue;
        }

        const isChagOrSpecial = req.reasons.some(r => r === 'חג' || r === 'שמחת תורה' || r.startsWith('שבת ') || r === 'חנוכה');
        
        if (req.count > 1 || isChagOrSpecial) {
          if (daySched.length < req.count) {
            alerts.push({
              date: d,
              reason: req.reasons.join(', '),
              count: req.count,
              daySchedCount: daySched.length
            });
          }
        }
      }
    }
    return alerts;
  }, [schedule, roshChodeshIds]);

  return (
    <Card className="border-0 shadow-none sm:border sm:shadow-sm sm:bg-card bg-transparent min-h-[70vh]">
      <CardContent className="p-0 sm:p-6 sm:pt-6">
        <Tabs defaultValue="inventory" className="w-full flex flex-col items-center">
          
          {/* ALERTS SECTION */}
          {missingAlerts.length > 0 && (
            <div className="w-full max-w-[600px] mb-6 space-y-3 px-3 sm:px-0">
              {missingAlerts.map((alert, idx) => (
                <Alert key={idx} className="bg-red-50/80 dark:bg-red-950/30 text-red-900 dark:text-red-200 border-red-200 dark:border-red-900/50 shadow-sm animate-in fade-in slide-in-from-top-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <AlertTitle className="font-bold text-[15px] mb-1.5 flex items-center gap-2">
                    התראה: חסר שיבוץ ל{format(alert.date, 'EEEE, d בMMMM', { locale: he })}
                  </AlertTitle>
                  <AlertDescription className="text-[13.5px] leading-relaxed opacity-90">
                    ביום זה חל <strong>{alert.reason}</strong> ונדרשים <strong>{alert.count}</strong> ספרי תורה.
                    {alert.daySchedCount > 0 ? ` שובצו ${alert.daySchedCount} ספרים בלבד.` : ' לא שובץ אף ספר ידנית.'}
                    <span className="block mt-1 font-medium underline underline-offset-2 decoration-red-300 dark:decoration-red-800">
                      אנא עבור ללשונית ״שיבוץ״ כדי להגדיר אילו ספרים יוצאים.
                    </span>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          <TabsList className="w-full max-w-[400px] h-12 flex mb-6 bg-muted/50 p-1.5 rounded-full shadow-sm">
            <TabsTrigger value="inventory" className="flex-1 rounded-full text-sm font-medium data-[state=active]:shadow-sm data-[state=active]:bg-background transition-all">
              מלאי ספרים
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex-1 rounded-full text-sm font-medium data-[state=active]:shadow-sm data-[state=active]:bg-background transition-all">
              שיבוץ
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex-1 rounded-full text-sm font-medium data-[state=active]:shadow-sm data-[state=active]:bg-background transition-all">
              ראשי חודשים
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: INVENTORY */}
          <TabsContent value="inventory" className="space-y-4 px-3 sm:px-0 w-full animate-in fade-in slide-in-from-bottom-2">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="חיפוש ספרים..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pr-10 h-11 bg-background border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
                  <SelectTrigger className="w-[120px] sm:w-[140px] h-11 bg-background rounded-xl border-slate-200 dark:border-slate-800 focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name_asc">א׳-ת׳</SelectItem>
                    <SelectItem value="name_desc">ת׳-א׳</SelectItem>
                    <SelectItem value="created_desc">הכי חדש</SelectItem>
                    <SelectItem value="created_asc">הכי ישן</SelectItem>
                  </SelectContent>
                </Select>
                {isAdmin && (
                  <Button onClick={() => setIsAddSeferOpen(true)} className="h-11 rounded-xl px-4 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shrink-0">
                    <Plus className="w-5 h-5 sm:ml-1" />
                    <span className="hidden sm:inline">ספר חדש</span>
                  </Button>
                )}
              </div>
            </div>

            {list.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-muted/20 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-sm mb-4">
                  <ScrollText className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">אין ספרי תורה במערכת</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-[250px] leading-relaxed">לחצו על הוספת ספר חדש כדי להתחיל לנהל את מלאי הספרים שלכם.</p>
              </div>
            ) : displayList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">לא נמצאו תוצאות לחיפוש "{search}".</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {displayList.map((s) => (
                  <div
                    key={s.id}
                    className={cn(
                      "flex flex-col p-4.5 sm:p-5 rounded-2xl border shadow-sm transition-all duration-200",
                      activeId === s.id ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 shadow-amber-100 dark:shadow-none' : 'bg-background hover:shadow-md border-slate-200 dark:border-slate-800'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {activeId === s.id && <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />}
                        <h4 className={cn("font-semibold text-[15px] truncate", !s.is_active && 'line-through text-muted-foreground opacity-70')}>
                          {s.name}
                        </h4>
                      </div>
                    </div>
                    {s.notes && (
                      <p className="text-[13px] text-slate-500 dark:text-slate-400 line-clamp-3 mb-4 leading-relaxed">
                        {s.notes}
                      </p>
                    )}
                    <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={s.is_active}
                          onCheckedChange={() => toggleActive(s)}
                          disabled={!isAdmin}
                          className="data-[state=checked]:bg-emerald-500 h-5 w-9 [&_span]:h-4 [&_span]:w-4"
                          aria-label="פעיל/מושבת"
                        />
                        <span className="text-xs font-medium text-slate-500">{s.is_active ? 'פעיל' : 'מושבת'}</span>
                      </div>
                      
                      {isAdmin && (
                        <div className="flex items-center gap-0.5">
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800" onClick={() => startEdit(s)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-950/50" onClick={() => setDeleteId(s.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: SCHEDULE */}
          <TabsContent value="schedule" className="space-y-6 px-3 sm:px-0 w-full animate-in fade-in slide-in-from-bottom-2">
            {previewDisplay && (
              <div className="bg-slate-900 dark:bg-black rounded-2xl p-6 border border-amber-900/30 shadow-xl overflow-hidden relative">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent pointer-events-none" />
                <Label className="text-amber-500/80 text-xs font-bold uppercase tracking-wider mb-4 block text-center">תצוגה מקדימה למסך הראשי (לשבת הקרובה)</Label>
                <div className="flex items-center justify-center gap-3 text-center relative z-10" dir="rtl">
                  <span className="text-2xl sm:text-3xl filter drop-shadow-md">{previewDisplay.icon}</span>
                  <span className="text-lg sm:text-2xl font-bold text-[#d4af37]" style={{ textShadow: "0 2px 12px rgba(212,175,55,0.4)" }}>
                    {previewDisplay.text}
                  </span>
                </div>
              </div>
            )}

            <div className="p-5 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:border-amber-900/50 dark:from-amber-950/30 dark:to-background space-y-4 shadow-sm">
              <div>
                <Label className="flex items-center gap-2 text-amber-900 dark:text-amber-300 text-base font-semibold">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  ספר התורה הקבוע (לשבת הקרובה)
                </Label>
                <p className="text-[13px] text-amber-700/80 dark:text-amber-400/80 mt-1.5 leading-relaxed">
                  בחר את הספר שיופיע תמיד במסך התצוגה כברירת מחדל (אם אין שיבוץ ספציפי או חג מיוחד).
                </p>
              </div>
              <Select value={activeId || 'none'} onValueChange={saveActive} disabled={!isAdmin}>
                <SelectTrigger className="h-12 bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-800/60 rounded-xl text-base shadow-sm">
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
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <CalendarIcon className="w-5 h-5 text-indigo-500" />
                    שיבוצים עתידיים
                  </h3>
                  <p className="text-[13px] text-muted-foreground mt-1 hidden sm:block">
                    ספרים ששוריינו לתאריכים ספציפיים (חגים, קריאות מיוחדות).
                  </p>
                </div>
                {!isAdmin && (
                  <span className="text-[10px] font-semibold text-muted-foreground inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted">
                    <Lock className="w-3 h-3" /> צפייה בלבד
                  </span>
                )}
                {isAdmin && (
                  <Button onClick={() => setIsAddScheduleOpen(true)} className="h-10 sm:h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shrink-0">
                    <Plus className="w-4 h-4 ml-1" />
                    שיבוץ מיוחד
                  </Button>
                )}
              </div>

              {schedule.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      return (
                        <div key={key} className="p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-background shadow-sm flex flex-col gap-3 transition-shadow hover:shadow-md">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-[15px] text-slate-900 dark:text-slate-100">{format(d, 'EEEE, d בMMMM yyyy', { locale: he })}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className={cn(
                                  'text-[11px] px-2.5 py-1 rounded-full font-bold border tracking-wide',
                                  slot === 'mincha' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:border-purple-800/50 dark:text-purple-300' :
                                  slot === 'morning' ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:border-sky-800/50 dark:text-sky-300' :
                                  'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-300'
                                )}>
                                  {slotLabel}
                                </span>
                                {label && <span className="text-[11px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800/50 dark:text-indigo-300 px-2.5 py-1 rounded-full tracking-wide">{label}</span>}
                              </div>
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full text-[11px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {sorted.length} ספרים
                            </div>
                          </div>
                          <div className="mt-2 space-y-1 bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                            {sorted.map((row, i) => {
                              const sefer = list.find((s) => s.id === row.sefer_id);
                              return (
                                <div key={row.id} className="flex items-center justify-between text-[13px] p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <span className="w-5 h-5 flex items-center justify-center bg-white dark:bg-slate-900 rounded-full text-[10px] font-bold text-slate-500 shadow-sm shrink-0 border border-slate-100 dark:border-slate-700">{i + 1}</span> 
                                    <span className="truncate font-medium text-slate-700 dark:text-slate-300">{sefer?.name || '—'}</span>
                                  </div>
                                  {isAdmin && (
                                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 rounded-full shrink-0" onClick={() => removeSchedule(row.id)}>
                                      <Trash2 className="w-3.5 h-3.5 text-slate-400" />
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
              ) : (
                <div className="text-center py-12 bg-muted/20 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                  <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 dark:text-slate-400 font-medium">אין שיבוצים מיוחדים במערכת</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 3: RULES (ROSH CHODESH) */}
          <TabsContent value="rules" className="space-y-6 px-3 sm:px-0 w-full animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-background border rounded-2xl overflow-hidden shadow-sm">
              <div className="p-5 border-b bg-sky-50/30 dark:bg-sky-950/10">
                <h3 className="text-[17px] font-semibold flex items-center gap-2 text-sky-700 dark:text-sky-400">
                  <Moon className="w-5 h-5" />
                  ראשי חודשים כללי (ברירת מחדל)
                </h3>
                <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
                  הספרים שיסומנו כאן יופיעו תמיד אוטומטית בכל ראש חודש רגיל, למעט חודשים שיוגדרו מטה בנפרד.
                </p>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {list.filter(s => s.is_active).length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">אין ספרי תורה פעילים.</div>
                ) : (
                  list.filter(s => s.is_active).map(s => {
                    const checked = roshChodeshIds.includes(s.id);
                    return (
                      <div key={s.id} className="flex items-center justify-between p-4.5 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <Switch 
                            checked={checked} 
                            disabled={!isAdmin} 
                            onCheckedChange={() => toggleRoshChodeshSefer(s.id)}
                            className="data-[state=checked]:bg-sky-500 shadow-sm"
                          />
                          <span className={cn("font-medium text-[15px]", checked ? "text-slate-900 dark:text-slate-100" : "text-slate-600 dark:text-slate-400")}>{s.name}</span>
                        </div>
                        {checked && <span className="text-[10px] font-bold px-2.5 py-1 bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300 rounded-full">מופעל</span>}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <Accordion type="single" collapsible className="bg-background border rounded-2xl overflow-hidden shadow-sm">
              <AccordionItem value="exceptions" className="border-b-0">
                <AccordionTrigger className="px-5 py-4.5 hover:bg-slate-50 dark:hover:bg-slate-900/50 text-[15px] font-semibold text-purple-700 dark:text-purple-400 transition-colors">
                  <span className="flex items-center gap-2.5">
                    <Info className="w-5 h-5" />
                    הגדרות חריגות (לפי חודש ספציפי)
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-6 pt-3 border-t bg-slate-50/50 dark:bg-slate-950/50">
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                    כאן ניתן לקבוע הרכב ספרים שונה עבור ראשי חודשים מסוימים (לדוגמה: אדר). הגדרה כאן תדרוס את הגדרת ברירת המחדל.
                  </p>
                  <div className="space-y-5">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="w-full md:w-[280px] h-12 bg-white dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800 text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 13 }, (_, i) => i + 1).map((m) => {
                          const has = (monthOverrides[m] || []).length > 0;
                          return (
                            <SelectItem key={m} value={String(m)}>
                              ראש חודש {HEBREW_MONTH_NAMES[m]} {has ? `(✓ הוגדר)` : ''}
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
                        <div className="space-y-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                          <h4 className="font-semibold text-sm mb-1 text-slate-700 dark:text-slate-300">בחירת ספרים לר״ח {HEBREW_MONTH_NAMES[month]}</h4>
                          {active.length === 0 ? (
                            <p className="text-sm text-muted-foreground">אין ספרי תורה פעילים.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {active.map(s => {
                                const checked = selectedIds.includes(s.id);
                                return (
                                  <label key={s.id} className={cn(
                                    "flex items-center gap-3.5 p-3.5 rounded-xl border transition-all cursor-pointer select-none",
                                    checked ? "border-purple-300 bg-purple-50/50 dark:border-purple-800/60 dark:bg-purple-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                  )}>
                                    <input 
                                      type="checkbox" 
                                      checked={checked} 
                                      disabled={!isAdmin}
                                      onChange={() => toggleMonthOverrideSefer(month, s.id)} 
                                      className="w-4.5 h-4.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className={cn("text-sm font-medium truncate", checked ? "text-purple-900 dark:text-purple-300" : "text-slate-700 dark:text-slate-300")}>{s.name}</span>
                                  </label>
                                )
                              })}
                            </div>
                          )}
                          {isAdmin && selectedIds.length > 0 && (
                            <div className="pt-4 border-t mt-4 flex">
                              <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-950/50 rounded-lg" onClick={() => clearMonthOverride(month)}>
                                <Trash2 className="w-4 h-4 ml-2" />
                                נקה הגדרה מיוחדת זו
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Sheets / Drawers */}
      
      {/* Add Sefer */}
      <Sheet open={isAddSeferOpen} onOpenChange={setIsAddSeferOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-6 overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-xl">הוספת ספר תורה חדש</SheetTitle>
            <SheetDescription>הזינו את פרטי ספר התורה למאגר.</SheetDescription>
          </SheetHeader>
          <div className="space-y-5 mt-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">שם הספר (חובה)</Label>
              <Input
                placeholder="לדוגמה: ספר יוסף כהן"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-12 bg-muted/50 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">הערות ופרטים נוספים</Label>
              <Textarea
                placeholder="מצב הספר, מקור, היסטוריה..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                rows={5}
                className="resize-none bg-muted/50 rounded-xl"
              />
            </div>
            <Button onClick={addSefer} disabled={loading || !newName.trim()} className="w-full h-12 text-base rounded-xl mt-4 bg-indigo-600 hover:bg-indigo-700">
              {loading ? 'שומר...' : 'הוסף ספר למלאי'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Sefer */}
      <Sheet open={isEditSeferOpen} onOpenChange={setIsEditSeferOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-6 overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-xl">עריכת פרטי ספר</SheetTitle>
            <SheetDescription>עדכנו את המידע וההערות.</SheetDescription>
          </SheetHeader>
          <div className="space-y-5 mt-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">שם הספר (חובה)</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-12 bg-muted/50 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">הערות ופרטים נוספים</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={5}
                className="resize-none bg-muted/50 rounded-xl"
              />
            </div>
            <Button onClick={saveEdit} disabled={!editName.trim()} className="w-full h-12 text-base rounded-xl mt-4 bg-indigo-600 hover:bg-indigo-700">
              שמור שינויים
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Schedule */}
      <Sheet open={isAddScheduleOpen} onOpenChange={setIsAddScheduleOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full bg-slate-50 dark:bg-slate-950">
          <div className="p-6 border-b bg-background">
            <SheetHeader>
              <SheetTitle className="text-xl">שיבוץ ספרים לתאריך</SheetTitle>
              <SheetDescription>בחרו תאריך ואת הספרים הרלוונטיים.</SheetDescription>
            </SheetHeader>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Halachic Alert */}
            {(() => {
              const targetDate = schedDate || getNextShabbat(new Date());
              const req = getRequiredSifreiTorah(targetDate);
              if (req.count > 1) {
                return (
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 rounded-2xl text-indigo-800 dark:text-indigo-300 shadow-sm">
                    <p className="font-semibold flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      לתאריך זה דרושים {req.count} ספרים
                    </p>
                    <p className="text-[13px] mt-1.5 opacity-90 leading-relaxed">סיבה הלכתית: {req.reasons.join(', ')}</p>
                    {!schedDate && <p className="text-[11px] mt-2 font-bold bg-indigo-100 dark:bg-indigo-900/40 inline-block px-2.5 py-1 rounded-full text-indigo-700 dark:text-indigo-300">ההתרעה מתייחסת לשבת הקרובה</p>}
                  </div>
                );
              }
              return null;
            })()}

            <Tabs value={schedMode} onValueChange={(v) => setSchedMode(v as 'date' | 'month')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-2">
                <TabsTrigger value="date">תאריך ספציפי</TabsTrigger>
                <TabsTrigger value="month">לכל החודש (שבתות)</TabsTrigger>
              </TabsList>
            </Tabs>

            {schedMode === 'date' ? (
              <div className="space-y-2.5">
                <Label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">תאריך השיבוץ</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-right font-normal h-12 bg-white dark:bg-slate-900 rounded-xl', !schedDate && 'text-muted-foreground')}>
                      <CalendarIcon className="w-4.5 h-4.5 ml-2.5 opacity-50" />
                      {schedDate ? format(schedDate, 'PPP', { locale: he }) : 'לחץ לבחירת תאריך מלוח השנה'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={schedDate} onSelect={setSchedDate} initialFocus locale={he} />
                  </PopoverContent>
                </Popover>
              </div>
            ) : (
              <div className="space-y-2.5">
                <Label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">בחר חודש עברי</Label>
                <Select value={schedMonthYear} onValueChange={setSchedMonthYear}>
                  <SelectTrigger className="bg-white dark:bg-slate-900 h-12 rounded-xl">
                    <SelectValue placeholder="בחר חודש לשיבוץ כל השבתות שבו" />
                  </SelectTrigger>
                  <SelectContent>
                    {nextHebrewMonths.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">המערכת תשבץ את הספרים באופן אוטומטי לכל השבתות שחלות בחודש הנבחר.</p>
              </div>
            )}

            <div className="space-y-2.5">
              <Label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">זמן התפילה</Label>
              <Select value={schedSlot} onValueChange={setSchedSlot}>
                <SelectTrigger className="bg-white dark:bg-slate-900 h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל היום (ברירת מחדל)</SelectItem>
                  <SelectItem value="morning">שחרית (בוקר)</SelectItem>
                  <SelectItem value="mincha">מנחה (אחר הצהריים)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2.5">
              <Label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">תווית מיוחדת (אופציונלי)</Label>
              <Input
                placeholder="למשל: פרשת זכור"
                value={schedLabel}
                onChange={(e) => setSchedLabel(e.target.value)}
                className="bg-white dark:bg-slate-900 h-12 rounded-xl"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>בחירת ספרי תורה מתוך המלאי</span>
                <span className="text-[11px] text-muted-foreground font-normal bg-muted px-2 py-0.5 rounded-full">סדר הבחירה קובע</span>
              </Label>
              <div className="bg-white dark:bg-slate-900 border rounded-xl overflow-hidden divide-y shadow-sm">
                {list.filter((s) => s.is_active).length === 0 ? (
                  <p className="text-[13px] text-muted-foreground p-5 text-center">אין ספרי תורה פעילים במלאי.</p>
                ) : (
                  list.filter((s) => s.is_active).map((s) => {
                    const idx = schedSeferIds.indexOf(s.id);
                    const checked = idx !== -1;
                    return (
                      <label key={s.id} className={cn(
                        "flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                        checked && "bg-indigo-50/50 dark:bg-indigo-900/10"
                      )}>
                        <div className="flex items-center gap-3.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) setSchedSeferIds((prev) => [...prev, s.id]);
                              else setSchedSeferIds((prev) => prev.filter((id) => id !== s.id));
                            }}
                            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shadow-sm"
                          />
                          <span className="font-medium text-[15px]">{s.name}</span>
                        </div>
                        {checked && (
                          <span className="w-7 h-7 flex items-center justify-center bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 rounded-full text-xs font-bold shrink-0 shadow-sm border border-indigo-200 dark:border-indigo-800">
                            {idx + 1}
                          </span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          
          <div className="p-5 bg-white dark:bg-slate-900 border-t shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
            <Button onClick={addSchedule} disabled={!schedDate || schedSeferIds.length === 0} className="w-full h-12 text-[15px] font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
              <Check className="w-5 h-5 ml-2" /> שמור שיבוץ זה
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת ספר תורה</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const s = list.find((x) => x.id === deleteId);
                return s
                  ? `האם למחוק לחלוטין את "${s.name}"? הפעולה תמחק גם את כל השיוכים העתידיים אליו.`
                  : 'האם למחוק ספר תורה זה?';
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl h-11">ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} className="bg-red-600 hover:bg-red-700 rounded-xl h-11 text-white">מחק לצמיתות</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteScheduleId} onOpenChange={(open) => !open && setDeleteScheduleId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת שיבוץ</AlertDialogTitle>
            <AlertDialogDescription>למחוק את השיבוץ של הספר הזה לתאריך הספציפי?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl h-11">ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveSchedule} className="bg-red-600 hover:bg-red-700 rounded-xl h-11 text-white">הסר שיבוץ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
