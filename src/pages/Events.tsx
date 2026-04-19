import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import {
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Clock,
  Calendar as CalendarIcon,
  Download,
  List,
  LayoutGrid,
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import MonthCalendar from '@/components/events/MonthCalendar';
import { buildIcs, downloadIcs } from '@/lib/ics-export';

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
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<EventType | 'all'>('all');

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

  // Filter events based on search and type
  const filteredEvents = events.filter((e) => {
    const matchesType = selectedType === 'all' || e.event_type === selectedType;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query ||
      e.title.toLowerCase().includes(query) ||
      (e.description?.toLowerCase() || '').includes(query) ||
      (e.location?.toLowerCase() || '').includes(query);
    return matchesType && matchesSearch;
  });

  const now = new Date();
  const upcoming = filteredEvents.filter((e) => new Date(e.end_at || e.start_at) >= now);
  const past = filteredEvents.filter((e) => new Date(e.end_at || e.start_at) < now).reverse();

  const calendarEvents = events.map((e) => {
    const meta = EVENT_TYPES.find((t) => t.value === e.event_type) || EVENT_TYPES[6];
    return {
      id: e.id,
      title: e.title,
      location: e.location,
      start_at: e.start_at,
      end_at: e.end_at,
      event_type: meta.label,
      color: meta.color,
    };
  });

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

  const exportIcs = (scope: 'upcoming' | 'all') => {
    const list = scope === 'upcoming' ? upcoming : events;
    if (list.length === 0) {
      toast.error('אין אירועים לייצוא');
      return;
    }
    const ics = buildIcs(list);
    const filename = `events-${scope}-${format(new Date(), 'yyyy-MM-dd')}.ics`;
    downloadIcs(ics, filename);
    toast.success(`יוצא: ${list.length} אירועים`);
  };

  const renderCard = (e: EventRow) => {
    const meta = EVENT_TYPES.find((t) => t.value === e.event_type) || EVENT_TYPES[6];
    const start = new Date(e.start_at);
    const end = e.end_at ? new Date(e.end_at) : null;
    return (
      <Card key={e.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-3 md:p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base md:text-lg">{e.title}</h3>
                <Badge variant="outline" className={meta.color}>
                  {meta.label}
                </Badge>
              </div>
            </div>
            {canEdit && (
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => openEdit(e)} className="h-8 w-8 md:h-9 md:w-9">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setDeleteId(e.id)} className="h-8 w-8 md:h-9 md:w-9">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{format(start, 'EEEE, d בMMMM yyyy', { locale: he })}</span>
          </div>
          <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            <span>
              {format(start, 'HH:mm')}
              {end && ` - ${format(end, 'HH:mm')}`}
            </span>
          </div>
          {e.location && (
            <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{e.location}</span>
            </div>
          )}
          {e.description && (
            <p className="text-xs md:text-sm whitespace-pre-line pt-1 border-t">{e.description}</p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-3 md:p-6 space-y-4 md:space-y-6 max-w-5xl pb-24 md:pb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold">יומן אירועים</h1>
          <p className="text-sm text-muted-foreground">ניהול אירועי בית הכנסת</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select onValueChange={(v) => exportIcs(v as 'upcoming' | 'all')}>
            <SelectTrigger className="w-auto gap-2 h-9">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">ייצוא ICS</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming">קרובים בלבד ({upcoming.length})</SelectItem>
              <SelectItem value="all">כל האירועים ({events.length})</SelectItem>
            </SelectContent>
          </Select>
          {canEdit && (
            <Button onClick={openNew} className="gap-2 h-9">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">אירוע חדש</span>
              <span className="sm:hidden">חדש</span>
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList className="grid grid-cols-2 w-full md:w-auto">
          <TabsTrigger value="list" className="gap-2">
            <List className="h-4 w-4" />
            רשימה
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            לוח חודשי
          </TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש באירועים..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9"
              />
            </div>
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="h-9 px-2"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant={selectedType === 'all' ? 'default' : 'outline'}
              className="cursor-pointer h-7 px-3"
              onClick={() => setSelectedType('all')}
            >
              הכל ({events.length})
            </Badge>
            {EVENT_TYPES.map((t) => {
              const count = events.filter((e) => e.event_type === t.value).length;
              const isSelected = selectedType === t.value;
              return (
                <Badge
                  key={t.value}
                  variant={isSelected ? 'default' : 'outline'}
                  className={`cursor-pointer h-7 px-3 transition-colors ${
                    isSelected ? '' : 'hover:bg-muted'
                  } ${t.color}`}
                  onClick={() => setSelectedType(isSelected ? 'all' : t.value)}
                >
                  {t.label} ({count})
                </Badge>
              );
            })}
          </div>
          
          {(searchQuery || selectedType !== 'all') && (
            <p className="text-sm text-muted-foreground">
              מציג {filteredEvents.length} מתוך {events.length} אירועים
            </p>
          )}
        </div>

        <TabsContent value="list" className="space-y-4 md:space-y-6 mt-0">
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">
                אירועים קרובים ({upcoming.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-3 md:p-6 pt-0 md:pt-0">
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
              <CardHeader className="p-3 md:p-6">
                <CardTitle className="text-muted-foreground text-base md:text-lg">
                  אירועים שעברו ({past.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 opacity-75 p-3 md:p-6 pt-0 md:pt-0">
                {past.map(renderCard)}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-0">
          <MonthCalendar events={calendarEvents} />
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto w-[95vw] md:w-full">
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
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
              ביטול
            </Button>
            <Button onClick={save} className="w-full sm:w-auto">שמור</Button>
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
