import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, MapPin, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const EVENT_TYPES = [
  { value: 'wedding', label: 'חתונה', color: 'bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30' },
  { value: 'bar_mitzvah', label: 'בר מצווה', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' },
  { value: 'memorial', label: 'אזכרה', color: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30' },
  { value: 'lesson', label: 'שיעור', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  { value: 'meeting', label: 'פגישה', color: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30' },
  { value: 'holiday', label: 'חג', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  { value: 'other', label: 'אחר', color: 'bg-muted text-muted-foreground border-border' },
] as const;

type EventType = typeof EVENT_TYPES[number]['value'];

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_type: EventType;
  start_at: string;
  end_at: string | null;
}

const emptyForm = {
  id: '',
  title: '',
  description: '',
  location: '',
  event_type: 'other' as EventType,
  start_date: format(new Date(), 'yyyy-MM-dd'),
  start_time: '20:00',
  end_date: '',
  end_time: '',
};

export default function Events() {
  const queryClient = useQueryClient();
  const { isAdmin, userRole } = useAuth();
  const canEdit = isAdmin || userRole === 'gabai';

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('events')
        .select('*')
        .order('start_at', { ascending: true });
      if (error) throw error;
      return data as EventRow[];
    },
  });

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.end_at || e.start_at) >= now);
  const past = events.filter((e) => new Date(e.end_at || e.start_at) < now).reverse();

  const openNew = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (e: EventRow) => {
    const start = new Date(e.start_at);
    const end = e.end_at ? new Date(e.end_at) : null;
    setForm({
      id: e.id,
      title: e.title,
      description: e.description || '',
      location: e.location || '',
      event_type: e.event_type,
      start_date: format(start, 'yyyy-MM-dd'),
      start_time: format(start, 'HH:mm'),
      end_date: end ? format(end, 'yyyy-MM-dd') : '',
      end_time: end ? format(end, 'HH:mm') : '',
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast.error('יש להזין כותרת');
      return;
    }
    if (!form.start_date || !form.start_time) {
      toast.error('יש להזין תאריך ושעת התחלה');
      return;
    }
    const startISO = new Date(`${form.start_date}T${form.start_time}`).toISOString();
    const endISO =
      form.end_date && form.end_time
        ? new Date(`${form.end_date}T${form.end_time}`).toISOString()
        : null;

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      event_type: form.event_type,
      start_at: startISO,
      end_at: endISO,
    };

    const { error } = form.id
      ? await (supabase as any).from('events').update(payload).eq('id', form.id)
      : await (supabase as any).from('events').insert(payload);

    if (error) {
      toast.error('שמירה נכשלה: ' + error.message);
      return;
    }
    toast.success(form.id ? 'האירוע עודכן' : 'האירוע נוסף');
    setDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['events'] });
    queryClient.invalidateQueries({ queryKey: ['events-widget'] });
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await (supabase as any).from('events').delete().eq('id', deleteId);
    if (error) {
      toast.error('המחיקה נכשלה');
      return;
    }
    toast.success('האירוע נמחק');
    setDeleteId(null);
    queryClient.invalidateQueries({ queryKey: ['events'] });
    queryClient.invalidateQueries({ queryKey: ['events-widget'] });
  };

  const renderCard = (e: EventRow) => {
    const meta = EVENT_TYPES.find((t) => t.value === e.event_type) || EVENT_TYPES[6];
    const start = new Date(e.start_at);
    const end = e.end_at ? new Date(e.end_at) : null;
    return (
      <Card key={e.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-lg">{e.title}</h3>
                <Badge variant="outline" className={meta.color}>
                  {meta.label}
                </Badge>
              </div>
            </div>
            {canEdit && (
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => openEdit(e)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setDeleteId(e.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            <span>{format(start, 'EEEE, d בMMMM yyyy', { locale: he })}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {format(start, 'HH:mm')}
              {end && ` - ${format(end, 'HH:mm')}`}
            </span>
          </div>
          {e.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{e.location}</span>
            </div>
          )}
          {e.description && (
            <p className="text-sm whitespace-pre-line pt-1 border-t">{e.description}</p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">יומן אירועים</h1>
          <p className="text-muted-foreground">ניהול אירועי בית הכנסת</p>
        </div>
        {canEdit && (
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" />
            אירוע חדש
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>אירועים קרובים ({upcoming.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-muted-foreground text-center py-6">טוען...</p>
          ) : upcoming.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">אין אירועים קרובים</p>
          ) : (
            upcoming.map(renderCard)
          )}
        </CardContent>
      </Card>

      {past.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground">אירועים שעברו ({past.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 opacity-75">
            {past.map(renderCard)}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'עריכת אירוע' : 'אירוע חדש'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>כותרת *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="שם האירוע"
              />
            </div>
            <div>
              <Label>סוג אירוע</Label>
              <Select
                value={form.event_type}
                onValueChange={(v) => setForm({ ...form, event_type: v as EventType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>תאריך התחלה *</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>שעת התחלה *</Label>
                <Input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>תאריך סיום</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
              <div>
                <Label>שעת סיום</Label>
                <Input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>מיקום</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="אולם / חדר / כתובת"
              />
            </div>
            <div>
              <Label>תיאור</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="פרטים נוספים..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={save}>שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת אירוע</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את האירוע? פעולה זו אינה הפיכה.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
