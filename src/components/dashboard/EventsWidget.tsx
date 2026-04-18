import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, ArrowLeft, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const TYPE_LABELS: Record<string, string> = {
  wedding: 'חתונה',
  bar_mitzvah: 'בר מצווה',
  memorial: 'אזכרה',
  lesson: 'שיעור',
  meeting: 'פגישה',
  holiday: 'חג',
  other: 'אחר',
};

interface EventRow {
  id: string;
  title: string;
  location: string | null;
  event_type: string;
  start_at: string;
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
            return (
              <Link
                key={e.id}
                to="/events"
                className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-semibold truncate">{e.title}</h4>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {TYPE_LABELS[e.event_type] || 'אחר'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                  <span>
                    {format(start, 'EEE, d בMMM', { locale: he })} • {format(start, 'HH:mm')}
                  </span>
                  {e.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {e.location}
                    </span>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
