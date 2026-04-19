import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, ArrowLeft, MapPin, Clock, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, differenceInHours, isToday, isTomorrow } from 'date-fns';
import { he } from 'date-fns/locale';
import { getHebrewDate } from '@/lib/hebrew-utils';
import { cn } from '@/lib/utils';

const TYPE_META: Record<string, { label: string; color: string }> = {
  wedding: { label: 'חתונה', color: 'bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30' },
  bar_mitzvah: { label: 'בר מצווה', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' },
  memorial: { label: 'אזכרה', color: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30' },
  lesson: { label: 'שיעור', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  meeting: { label: 'פגישה', color: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30' },
  holiday: { label: 'חג', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  other: { label: 'אחר', color: 'bg-muted text-muted-foreground border-border' },
};

interface EventRow {
  id: string;
  title: string;
  location: string | null;
  event_type: string;
  start_at: string;
}

function getRelativeLabel(date: Date): { text: string; urgent: boolean } {
  if (isToday(date)) return { text: 'היום', urgent: true };
  if (isTomorrow(date)) return { text: 'מחר', urgent: true };
  const days = differenceInDays(date, new Date());
  if (days < 7) return { text: `בעוד ${days} ימים`, urgent: false };
  return { text: format(date, 'd בMMM', { locale: he }), urgent: false };
}

export default function EventsWidget() {
  const { data: events = [] } = useQuery({
    queryKey: ['events-widget'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('events')
        .select('id,title,location,event_type,start_at,end_at')
        .gte('start_at', new Date().toISOString())
        .order('start_at', { ascending: true })
        .limit(5);
      if (error) throw error;
      return data as EventRow[];
    },
  });

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-primary" />
          אירועים קרובים
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/events" className="gap-1">
            לכל היומן
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            אין אירועים מתוכננים
          </p>
        ) : (
          events.map((e) => {
            const start = new Date(e.start_at);
            const meta = TYPE_META[e.event_type] || TYPE_META.other;
            const rel = getRelativeLabel(start);
            const hebDate = getHebrewDate(start);
            const hoursUntil = differenceInHours(start, new Date());
            const showBell = hoursUntil <= 24 && hoursUntil >= 0;

            return (
              <Link
                key={e.id}
                to="/events"
                className={cn(
                  'block rounded-lg border transition-all hover:shadow-md active:scale-[0.99]',
                  'md:p-3',
                  rel.urgent && 'border-primary/40 bg-primary/5',
                )}
              >
                {/* Mobile: reminder-style row layout */}
                <div className="md:hidden flex items-stretch gap-3 p-3">
                  <div
                    className={cn(
                      'flex flex-col items-center justify-center rounded-md px-2 py-1 min-w-[52px] shrink-0 border',
                      rel.urgent
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted border-border',
                    )}
                  >
                    <span className="text-[10px] font-medium leading-tight">
                      {format(start, 'MMM', { locale: he })}
                    </span>
                    <span className="text-xl font-bold leading-tight">
                      {format(start, 'd')}
                    </span>
                    <span className="text-[10px] leading-tight">
                      {format(start, 'HH:mm')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-semibold text-sm leading-tight truncate">{e.title}</h4>
                      {showBell && (
                        <Bell className="h-3 w-3 text-primary shrink-0 animate-pulse" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-muted-foreground">
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] py-0 px-1.5 h-4', meta.color)}
                      >
                        {meta.label}
                      </Badge>
                      <span className={cn(rel.urgent && 'text-primary font-semibold')}>
                        {rel.text}
                      </span>
                      <span className="opacity-70">• {hebDate}</span>
                    </div>
                    {e.location && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPin className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{e.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Desktop: original compact layout + Hebrew date */}
                <div className="hidden md:block">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <h4 className="font-semibold truncate">{e.title}</h4>
                      {showBell && (
                        <Bell className="h-3.5 w-3.5 text-primary shrink-0 animate-pulse" />
                      )}
                    </div>
                    <Badge variant="outline" className={cn('shrink-0 text-xs', meta.color)}>
                      {meta.label}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(start, 'EEE, d בMMM', { locale: he })} • {format(start, 'HH:mm')}
                    </span>
                    <span className="opacity-80">{hebDate}</span>
                    {e.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {e.location}
                      </span>
                    )}
                    <span
                      className={cn(
                        'mr-auto',
                        rel.urgent && 'text-primary font-semibold',
                      )}
                    >
                      {rel.text}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
