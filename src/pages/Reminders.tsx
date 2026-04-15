import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DeleteCodeDialog } from '@/components/DeleteCodeDialog';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bell, Plus, Trash2, X, Clock, CalendarIcon, History, CheckCircle, Pencil, CalendarPlus, Repeat, Star } from 'lucide-react';
import { format, isBefore, isAfter, addDays, addWeeks, addMonths } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const RECURRENCE_LABELS: Record<string, string> = {
  daily: 'יומי',
  weekly: 'שבועי',
  monthly: 'חודשי',
};

function generateICSFile(reminder: any): string {
  const date = new Date(reminder.reminder_date);
  const endDate = new Date(date.getTime() + 30 * 60000); // 30 min duration
  const formatICS = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  
  let rrule = '';
  if (reminder.recurrence === 'daily') rrule = '\nRRULE:FREQ=DAILY';
  else if (reminder.recurrence === 'weekly') rrule = '\nRRULE:FREQ=WEEKLY';
  else if (reminder.recurrence === 'monthly') rrule = '\nRRULE:FREQ=MONTHLY';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Brit Shalom//Reminders//HE',
    'BEGIN:VEVENT',
    `DTSTART:${formatICS(date)}`,
    `DTEND:${formatICS(endDate)}`,
    `SUMMARY:${reminder.content}`,
    `DESCRIPTION:תזכורת מברית שלום`,
    'BEGIN:VALARM',
    'TRIGGER:-PT10M',
    'ACTION:DISPLAY',
    'DESCRIPTION:תזכורת',
    'END:VALARM',
    rrule,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

function downloadICS(reminder: any) {
  const ics = generateICSFile(reminder);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reminder-${reminder.id.slice(0, 8)}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success('קובץ יומן הורד - פתח אותו כדי להוסיף ליומן');
}

const invalidateAll = (qc: any) => {
  qc.invalidateQueries({ queryKey: ['reminders'] });
  qc.invalidateQueries({ queryKey: ['reminders-history'] });
  qc.invalidateQueries({ queryKey: ['active-reminders'] });
};

export default function Reminders() {
  const { user, loading, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [recurrence, setRecurrence] = useState<string>('none');
  const [monthDay, setMonthDay] = useState<number>(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('active');

  const initFormWithCurrentDateTime = () => {
    const now = new Date();
    setContent('');
    setReminderDate(format(now, 'yyyy-MM-dd'));
    setReminderTime(format(now, 'HH:mm'));
    setRecurrence('none');
    setMonthDay(now.getDate());
    setEditingId(null);
    setShowForm(true);
  };

  const startEdit = (r: any) => {
    const d = new Date(r.reminder_date);
    setContent(r.content);
    setReminderDate(format(d, 'yyyy-MM-dd'));
    setReminderTime(format(d, 'HH:mm'));
    setRecurrence(r.recurrence || 'none');
    setMonthDay(d.getDate());
    setEditingId(r.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Active reminders (not dismissed)
  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['reminders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminders' as any)
        .select('*')
        .eq('is_dismissed', false)
        .order('reminder_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Dismissed reminders (history)
  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['reminders-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminders' as any)
        .select('*')
        .eq('is_dismissed', true)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (params: { content: string; reminder_date: string; recurrence: string | null }) => {
      const { error } = await supabase
        .from('reminders' as any)
        .insert({
          content: params.content,
          reminder_date: params.reminder_date,
          recurrence: params.recurrence,
          created_by: user?.id,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll(queryClient);
      resetForm();
      toast.success('תזכורת נוספה בהצלחה');
    },
    onError: () => toast.error('שגיאה בהוספת תזכורת'),
  });

  const updateMutation = useMutation({
    mutationFn: async (params: { id: string; content: string; reminder_date: string; recurrence: string | null }) => {
      const { error } = await supabase
        .from('reminders' as any)
        .update({
          content: params.content,
          reminder_date: params.reminder_date,
          recurrence: params.recurrence,
        } as any)
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll(queryClient);
      resetForm();
      toast.success('תזכורת עודכנה בהצלחה');
    },
    onError: () => toast.error('שגיאה בעדכון תזכורת'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('reminders' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll(queryClient);
      toast.success('תזכורת נמחקה');
    },
    onError: () => toast.error('שגיאה במחיקת תזכורת'),
  });

  const dismissMutation = useMutation({
    mutationFn: async (reminder: any) => {
      // If recurring, create next occurrence before dismissing
      if (reminder.recurrence && reminder.recurrence !== 'none') {
        const currentDate = new Date(reminder.reminder_date);
        let nextDate: Date;
        if (reminder.recurrence === 'daily') nextDate = addDays(currentDate, 1);
        else if (reminder.recurrence === 'weekly') nextDate = addWeeks(currentDate, 1);
        else {
          // Monthly: preserve original day
          const originalDay = currentDate.getDate();
          nextDate = addMonths(currentDate, 1);
          const maxDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
          nextDate.setDate(Math.min(originalDay, maxDay));
        }

        await supabase
          .from('reminders' as any)
          .insert({
            content: reminder.content,
            reminder_date: nextDate.toISOString(),
            recurrence: reminder.recurrence,
            created_by: reminder.created_by,
            is_important: reminder.is_important || false,
          } as any);
      }

      const { error } = await supabase
        .from('reminders' as any)
        .update({ is_dismissed: true } as any)
        .eq('id', reminder.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll(queryClient);
      toast.success('תזכורת נסגרה');
    },
  });

  const toggleImportantMutation = useMutation({
    mutationFn: async ({ id, is_important }: { id: string; is_important: boolean }) => {
      const { error } = await supabase
        .from('reminders' as any)
        .update({ is_important } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll(queryClient);
    },
  });

  const resetForm = () => {
    setContent('');
    setReminderDate('');
    setReminderTime('');
    setRecurrence('none');
    setMonthDay(1);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = () => {
    if (!content.trim()) return;
    const time = reminderTime || '00:00';
    let dateObj = reminderDate
      ? new Date(`${reminderDate}T${time}`)
      : new Date();
    
    // For monthly recurrence, set the chosen day of month
    if (recurrence === 'monthly') {
      const maxDay = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0).getDate();
      dateObj.setDate(Math.min(monthDay, maxDay));
    }

    const dateStr = dateObj.toISOString();
    const rec = recurrence === 'none' ? null : recurrence;

    if (editingId) {
      updateMutation.mutate({ id: editingId, content: content.trim(), reminder_date: dateStr, recurrence: rec });
    } else {
      addMutation.mutate({ content: content.trim(), reminder_date: dateStr, recurrence: rec });
    }
  };

  const now = new Date();
  const sortByImportance = (a: any, b: any) => (b.is_important ? 1 : 0) - (a.is_important ? 1 : 0);
  const activeReminders = reminders.filter((r: any) => isBefore(new Date(r.reminder_date), now)).sort(sortByImportance);
  const scheduledReminders = reminders.filter((r: any) => isAfter(new Date(r.reminder_date), now)).sort(sortByImportance);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="space-y-4 md:space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <Bell className="w-5 h-5 md:w-6 md:h-6 text-primary shrink-0" />
          <h1 className="text-xl md:text-2xl font-bold truncate">תזכורות</h1>
          {reminders.length > 0 && (
            <Badge variant="secondary" className="shrink-0">{reminders.length}</Badge>
          )}
        </div>
        {isAdmin && (
          <Button
            onClick={initFormWithCurrentDateTime}
            size="sm"
            className="shrink-0"
          >
            <Plus className="w-4 h-4 ml-1" />
            <span className="hidden sm:inline">הוסף תזכורת</span>
            <span className="sm:hidden">הוסף</span>
          </Button>
        )}
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <Card className="animate-in slide-in-from-top-2 border-primary/30">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={editingId ? 'default' : 'secondary'} className="text-xs">
                {editingId ? 'עריכת תזכורת' : 'תזכורת חדשה'}
              </Badge>
            </div>
            <Input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="תוכן התזכורת..."
              className="text-base"
              autoFocus
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  className="flex-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="flex-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-muted-foreground shrink-0" />
                <Select value={recurrence} onValueChange={(v) => { setRecurrence(v); if (v === 'monthly') setMonthDay(new Date().getDate()); }}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="חד פעמי" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">חד פעמי</SelectItem>
                    <SelectItem value="daily">יומי</SelectItem>
                    <SelectItem value="weekly">שבועי</SelectItem>
                    <SelectItem value="monthly">חודשי</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {recurrence === 'monthly' && (
              <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
                <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">כל יום</span>
                <Select value={String(monthDay)} onValueChange={(v) => setMonthDay(Number(v))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">בחודש</span>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={resetForm} size="sm">
                ביטול
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!content.trim() || addMutation.isPending || updateMutation.isPending}
                size="sm"
              >
                {editingId ? 'עדכן' : 'שמור תזכורת'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="active" className="text-xs sm:text-sm">
            <Bell className="w-3.5 h-3.5 ml-1 hidden sm:block" />
            פעילות
            {activeReminders.length > 0 && (
              <Badge variant="destructive" className="mr-1.5 h-5 min-w-[20px] text-[10px]">
                {activeReminders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="text-xs sm:text-sm">
            <Clock className="w-3.5 h-3.5 ml-1 hidden sm:block" />
            מתוזמנות
            {scheduledReminders.length > 0 && (
              <Badge variant="secondary" className="mr-1.5 h-5 min-w-[20px] text-[10px]">
                {scheduledReminders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm">
            <History className="w-3.5 h-3.5 ml-1 hidden sm:block" />
            היסטוריה
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {isLoading ? (
            <LoadingState />
          ) : activeReminders.length === 0 ? (
            <EmptyState icon={Bell} text="אין תזכורות פעילות" />
          ) : (
            <div className="space-y-2">
              {activeReminders.map((r: any) => (
                <ReminderCard
                  key={r.id}
                  reminder={r}
                  onDismiss={() => dismissMutation.mutate(r)}
                  onDelete={isAdmin ? () => deleteMutation.mutate(r.id) : undefined}
                  onEdit={isAdmin ? () => startEdit(r) : undefined}
                  onAddToCalendar={() => downloadICS(r)}
                  onToggleImportant={isAdmin ? () => toggleImportantMutation.mutate({ id: r.id, is_important: !r.is_important }) : undefined}
                  showDate
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="scheduled" className="mt-4">
          {isLoading ? (
            <LoadingState />
          ) : scheduledReminders.length === 0 ? (
            <EmptyState icon={Clock} text="אין תזכורות מתוזמנות" />
          ) : (
            <div className="space-y-2">
              {scheduledReminders.map((r: any) => (
                <ReminderCard
                  key={r.id}
                  reminder={r}
                  onDismiss={() => dismissMutation.mutate(r)}
                  onDelete={isAdmin ? () => deleteMutation.mutate(r.id) : undefined}
                  onEdit={isAdmin ? () => startEdit(r) : undefined}
                  onAddToCalendar={() => downloadICS(r)}
                  onToggleImportant={isAdmin ? () => toggleImportantMutation.mutate({ id: r.id, is_important: !r.is_important }) : undefined}
                  showDate
                  isScheduled
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {historyLoading ? (
            <LoadingState />
          ) : history.length === 0 ? (
            <EmptyState icon={History} text="אין היסטוריה" />
          ) : (
            <div className="space-y-2">
              {history.map((r: any) => (
                <ReminderCard
                  key={r.id}
                  reminder={r}
                  onDelete={isAdmin ? () => deleteMutation.mutate(r.id) : undefined}
                  isDismissed
                  showDate
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReminderCard({
  reminder,
  onDismiss,
  onDelete,
  onEdit,
  onAddToCalendar,
  onToggleImportant,
  showDate,
  isScheduled,
  isDismissed,
}: {
  reminder: any;
  onDismiss?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onAddToCalendar?: () => void;
  onToggleImportant?: () => void;
  showDate?: boolean;
  isScheduled?: boolean;
  isDismissed?: boolean;
}) {
  return (
    <Card className={cn(
      'transition-all',
      isDismissed && 'opacity-60',
      isScheduled && 'border-dashed',
      reminder.is_important && !isDismissed && 'border-amber-400/50 bg-amber-50/30 dark:bg-amber-950/10'
    )}>
      <CardContent className="py-3 px-3 sm:px-4 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {onToggleImportant && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 mt-0.5"
              onClick={onToggleImportant}
              title={reminder.is_important ? 'הסר סימון חשוב' : 'סמן כחשוב'}
            >
              <Star className={cn('w-4 h-4 transition-colors', reminder.is_important ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground')} />
            </Button>
          )}
          <div className="flex-1 min-w-0">
          <p className={cn('text-sm md:text-base', !isDismissed && 'font-medium')}>
            {reminder.content}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
            {showDate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                {format(new Date(reminder.reminder_date), 'dd/MM/yyyy HH:mm', { locale: he })}
              </span>
            )}
            {reminder.recurrence && reminder.recurrence !== 'none' && (
              <Badge variant="outline" className="text-[10px] h-5">
                <Repeat className="w-3 h-3 ml-1" />
                {RECURRENCE_LABELS[reminder.recurrence] || reminder.recurrence}
                {reminder.recurrence === 'monthly' && ` (${new Date(reminder.reminder_date).getDate()} בחודש)`}
              </Badge>
            )}
            {isScheduled && (
              <Badge variant="outline" className="text-[10px] h-5">
                <Clock className="w-3 h-3 ml-1" />
                ממתינה
              </Badge>
            )}
            {isDismissed && (
              <Badge variant="secondary" className="text-[10px] h-5">
                <CheckCircle className="w-3 h-3 ml-1" />
                נסגרה
              </Badge>
            )}
          </div>
        </div>
        </div>
        <div className="flex gap-0.5 shrink-0 flex-wrap justify-end">
          {onAddToCalendar && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={onAddToCalendar}
              title="הוסף ליומן"
            >
              <CalendarPlus className="w-4 h-4" />
            </Button>
          )}
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={onEdit}
              title="ערוך תזכורת"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onDismiss}
              title="סגור תזכורת"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              title="מחק תזכורת"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center text-muted-foreground">
        <Icon className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">{text}</p>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return <div className="text-center py-8 text-muted-foreground text-sm">טוען...</div>;
}
