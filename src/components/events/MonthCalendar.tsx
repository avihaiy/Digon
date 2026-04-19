import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronLeft, MapPin, Clock } from 'lucide-react';
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CalEvent {
  id: string;
  title: string;
  location: string | null;
  start_at: string;
  end_at: string | null;
  event_type: string;
  color: string;
}

interface MonthCalendarProps {
  events: CalEvent[];
}

const HEBREW_WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

export default function MonthCalendar({ events }: MonthCalendarProps) {
  const [cursor, setCursor] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    const out: Date[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      out.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      const key = format(new Date(e.start_at), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [events]);

  const selectedDayEvents = selectedDay
    ? eventsByDay.get(format(selectedDay, 'yyyy-MM-dd')) || []
    : [];

  return (
    <Card>
      <CardContent className="p-3 md:p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="icon" onClick={() => setCursor(subMonths(cursor, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
          <h3 className="text-base md:text-lg font-bold">
            {format(cursor, 'MMMM yyyy', { locale: he })}
          </h3>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
              היום
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setCursor(addMonths(cursor, 1))}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">
          {HEBREW_WEEKDAYS.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDay.get(key) || [];
            const inMonth = isSameMonth(day, cursor);
            const today = isToday(day);
            const selected = selectedDay && isSameDay(day, selectedDay);
            return (
              <button
                key={key}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  'aspect-square min-h-[40px] md:min-h-[60px] rounded-md border p-1 text-xs flex flex-col items-stretch transition-colors',
                  inMonth ? 'bg-card' : 'bg-muted/30 text-muted-foreground',
                  today && 'ring-2 ring-primary',
                  selected && 'bg-primary/10 border-primary',
                  'hover:bg-accent',
                )}
              >
                <span className={cn('text-right font-semibold', today && 'text-primary')}>
                  {format(day, 'd')}
                </span>
                <div className="flex-1 flex flex-col gap-0.5 mt-0.5 overflow-hidden">
                  {dayEvents.slice(0, 2).map((e) => (
                    <span
                      key={e.id}
                      className={cn(
                        'truncate rounded px-1 text-[10px] leading-tight border',
                        e.color,
                      )}
                    >
                      {e.title}
                    </span>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{dayEvents.length - 2}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {selectedDay && (
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">
                {format(selectedDay, 'EEEE, d בMMMM', { locale: he })}
              </h4>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDay(null)}>
                סגור
              </Button>
            </div>
            {selectedDayEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">אין אירועים ביום זה</p>
            ) : (
              selectedDayEvents.map((e) => (
                <div key={e.id} className="rounded-md border p-2 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{e.title}</span>
                    <Badge variant="outline" className={cn('text-[10px]', e.color)}>
                      {e.event_type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {format(new Date(e.start_at), 'HH:mm')}
                      {e.end_at && ` - ${format(new Date(e.end_at), 'HH:mm')}`}
                    </span>
                  </div>
                  {e.location && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{e.location}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
