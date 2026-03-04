import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BookOpen,
  Plus,
  Calendar as CalendarIcon,
  Loader2,
  Trash2,
  User,
  Star,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  formatCurrency,
  getNextShabbat,
  getHebrewDate,
  getOccasionForDate,
  getUpcomingOccasions,
  ALIYA_TYPES,
  ALIYA_STATUS,
  type DateOccasion,
} from '@/lib/hebrew-utils';

export default function Aliyot() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(getNextShabbat());

  // Get the occasion for the selected date
  const occasion = useMemo(() => getOccasionForDate(selectedDate), [selectedDate]);

  // Get upcoming occasions for quick navigation
  const upcomingOccasions = useMemo(() => getUpcomingOccasions(new Date(), 120), []);

  // Form state
  const [formData, setFormData] = useState({
    aliya_type: '',
    member_id: '',
    price: '',
  });

  // Fetch aliyot for selected date
  const shabbatDateStr = selectedDate.toISOString().split('T')[0];
  const { data: aliyot, isLoading: aliyotLoading } = useQuery({
    queryKey: ['aliyot', shabbatDateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aliyot')
        .select(`*, member:members(id, full_name)`)
        .eq('shabbat_date', shabbatDateStr)
        .order('created_at');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch members for dropdown
  const { data: members } = useQuery({
    queryKey: ['members-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('id, full_name')
        .eq('active', true)
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Create aliya
  const createAliya = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('aliyot').insert({
        shabbat_date: shabbatDateStr,
        parasha: occasion.name || 'לא ידוע',
        aliya_type: formData.aliya_type as any,
        member_id: formData.member_id || null,
        price: Number(formData.price) || 0,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('העלייה נוספה בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['aliyot'] });
      handleCloseDialog();
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast.error('עלייה מסוג זה כבר קיימת לתאריך זה');
      } else {
        toast.error('שגיאה בהוספת העלייה', { description: error.message });
      }
    },
  });

  // Update aliya status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('aliyot')
        .update({ status: status as any })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('הסטטוס עודכן');
      queryClient.invalidateQueries({ queryKey: ['aliyot'] });
    },
  });

  // Delete aliya
  const deleteAliya = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('aliyot').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('העלייה נמחקה');
      queryClient.invalidateQueries({ queryKey: ['aliyot'] });
    },
  });

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormData({ aliya_type: '', member_id: '', price: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.aliya_type) {
      toast.error('יש לבחור סוג עלייה');
      return;
    }
    createAliya.mutate();
  };

  // Navigate to next/prev occasion
  const currentIndex = upcomingOccasions.findIndex(
    (o) => o.date.toISOString().split('T')[0] === shabbatDateStr
  );
  const navigateOccasion = (direction: 'prev' | 'next') => {
    if (direction === 'next' && currentIndex < upcomingOccasions.length - 1) {
      setSelectedDate(upcomingOccasions[currentIndex + 1].date);
    } else if (direction === 'prev' && currentIndex > 0) {
      setSelectedDate(upcomingOccasions[currentIndex - 1].date);
    }
  };

  // Get available aliya types (not yet assigned)
  const assignedTypes = aliyot?.map((a: any) => a.aliya_type) || [];
  const availableTypes = Object.keys(ALIYA_TYPES).filter(
    (type) => !assignedTypes.includes(type)
  );

  const occasionBadgeColor = occasion.type === 'holiday' || occasion.type === 'shabbat_holiday'
    ? 'bg-amber-600 text-white'
    : 'bg-primary text-primary-foreground';

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            ניהול עליות
          </h1>
          <p className="text-muted-foreground">שיוך עליות לשבתות וחגים</p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="btn-primary-gradient gap-2"
          disabled={availableTypes.length === 0}
        >
          <Plus className="w-4 h-4" />
          הוסף עלייה
        </Button>
      </div>

      {/* Date Navigation */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Navigation arrows + current date */}
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateOccasion('next')}
                disabled={currentIndex >= upcomingOccasions.length - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>

              <div className="text-center flex-1">
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" className="gap-2 text-sm">
                      <CalendarIcon className="w-4 h-4" />
                      {format(selectedDate, 'EEEE, d בMMMM yyyy', { locale: he })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date);
                          setCalendarOpen(false);
                        }
                      }}
                      locale={he}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">{getHebrewDate(selectedDate)}</p>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateOccasion('prev')}
                disabled={currentIndex <= 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>

            {/* Occasion badge + count */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {occasion.type !== 'none' && (
                <Badge className={`text-base px-4 py-1 ${occasionBadgeColor}`}>
                  {occasion.type === 'holiday' || occasion.type === 'shabbat_holiday' ? (
                    <Star className="w-4 h-4 ml-1 inline" />
                  ) : null}
                  {occasion.label}
                </Badge>
              )}
              <Badge variant="secondary" className="text-base px-4 py-1">
                {aliyot?.length || 0} עליות משויכות
              </Badge>
            </div>

            {/* Quick occasion selector */}
            <div className="flex flex-wrap gap-2 justify-center">
              {upcomingOccasions.slice(0, 8).map((o) => {
                const dateStr = o.date.toISOString().split('T')[0];
                const isSelected = dateStr === shabbatDateStr;
                const isHoliday = o.occasion.type === 'holiday' || o.occasion.type === 'shabbat_holiday';
                return (
                  <Button
                    key={dateStr}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    className={`text-xs ${isHoliday && !isSelected ? 'border-amber-500 text-amber-700 dark:text-amber-400' : ''}`}
                    onClick={() => setSelectedDate(o.date)}
                  >
                    {isHoliday && <Star className="w-3 h-3 ml-1" />}
                    {o.occasion.name.length > 12 ? o.occasion.name.slice(0, 12) + '…' : o.occasion.name}
                    <span className="mr-1 opacity-60 text-[10px]">
                      {format(o.date, 'd/M')}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aliyot Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {aliyotLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))
        ) : aliyot?.length === 0 ? (
          <Card className="col-span-full glass-card py-12">
            <CardContent className="text-center text-muted-foreground">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">אין עליות לתאריך זה</p>
              <p className="text-sm">לחץ על "הוסף עלייה" להוספת עליות</p>
            </CardContent>
          </Card>
        ) : (
          aliyot?.map((aliya: any) => (
            <Card key={aliya.id} className="glass-card gold-accent">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Badge variant="outline" className="text-lg font-bold mb-2">
                      {ALIYA_TYPES[aliya.aliya_type as keyof typeof ALIYA_TYPES]}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      {aliya.parasha}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteAliya.mutate(aliya.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                      {aliya.member?.full_name || (
                        <span className="text-muted-foreground italic">לא משויך</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold hebrew-number">
                      {formatCurrency(Number(aliya.price))}
                    </span>
                    <Select
                      value={aliya.status}
                      onValueChange={(value) =>
                        updateStatus.mutate({ id: aliya.id, status: value })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ALIYA_STATUS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Aliya Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הוספת עלייה חדשה</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Show occasion info */}
            <div className="p-3 rounded-md border border-border bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground">
                {format(selectedDate, 'EEEE, d בMMMM yyyy', { locale: he })}
              </p>
              <p className={`text-lg font-bold mt-1 ${occasion.type === 'holiday' || occasion.type === 'shabbat_holiday' ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                {occasion.label || getHebrewDate(selectedDate)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>סוג עלייה *</Label>
              <Select
                value={formData.aliya_type}
                onValueChange={(value) => setFormData({ ...formData, aliya_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר סוג עלייה" />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {ALIYA_TYPES[type as keyof typeof ALIYA_TYPES]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>חבר (אופציונלי)</Label>
              <Select
                value={formData.member_id || 'none'}
                onValueChange={(value) => setFormData({ ...formData, member_id: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר חבר" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ללא שיוך</SelectItem>
                  {members?.map((member: any) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>מחיר</Label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0"
                dir="ltr"
                className="text-left"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseDialog} className="flex-1">
                ביטול
              </Button>
              <Button
                type="submit"
                className="flex-1 btn-primary-gradient"
                disabled={createAliya.isPending || !formData.aliya_type}
              >
                {createAliya.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    שומר...
                  </>
                ) : (
                  'הוסף עלייה'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
