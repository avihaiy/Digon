import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Megaphone, Clock, Calendar, Palette } from 'lucide-react';

type DayType = 'weekdays' | 'friday' | 'shabbat';
type StyleType = 'traditional_gold' | 'modern_dark' | 'clean_white' | 'royal_blue';

interface ScheduledAnnouncement {
  id: string;
  title: string;
  content: string;
  day_type: DayType;
  start_time: string;
  end_time: string;
  style: StyleType;
  is_active: boolean;
  priority: number;
  created_at: string;
}

const DAY_TYPE_LABELS: Record<DayType, string> = {
  weekdays: "ימי חול (א'-ה')",
  friday: 'יום שישי',
  shabbat: 'שבת',
};

const STYLE_LABELS: Record<StyleType, string> = {
  traditional_gold: 'מסורתי זהב',
  modern_dark: 'מודרני כהה',
  clean_white: 'לבן נקי',
  royal_blue: 'כחול מלכותי',
};

const STYLE_PREVIEWS: Record<StyleType, string> = {
  traditional_gold: 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900 border-amber-400',
  modern_dark: 'bg-gradient-to-br from-slate-800 to-slate-900 text-white border-slate-600',
  clean_white: 'bg-white text-slate-800 border-slate-200',
  royal_blue: 'bg-gradient-to-br from-blue-600 to-blue-800 text-white border-blue-400',
};

const defaultFormData = {
  title: '',
  content: '',
  day_type: 'weekdays' as DayType,
  start_time: '08:00',
  end_time: '22:00',
  style: 'traditional_gold' as StyleType,
  priority: 0,
};

export default function ManageAds() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(defaultFormData);

  // Fetch announcements
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['scheduled-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_announcements')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ScheduledAnnouncement[];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from('scheduled_announcements')
          .update({
            title: data.title,
            content: data.content,
            day_type: data.day_type,
            start_time: data.start_time,
            end_time: data.end_time,
            style: data.style,
            priority: data.priority,
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('scheduled_announcements')
          .insert({
            title: data.title,
            content: data.content,
            day_type: data.day_type,
            start_time: data.start_time,
            end_time: data.end_time,
            style: data.style,
            priority: data.priority,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-announcements'] });
      toast.success(editingId ? 'המודעה עודכנה בהצלחה' : 'המודעה נוספה בהצלחה');
      handleCloseDialog();
    },
    onError: () => {
      toast.error('שגיאה בשמירת המודעה');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scheduled_announcements')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-announcements'] });
      toast.success('המודעה נמחקה בהצלחה');
    },
    onError: () => {
      toast.error('שגיאה במחיקת המודעה');
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('scheduled_announcements')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-announcements'] });
      toast.success('הסטטוס עודכן');
    },
    onError: () => {
      toast.error('שגיאה בעדכון הסטטוס');
    },
  });

  const handleEdit = (announcement: ScheduledAnnouncement) => {
    setEditingId(announcement.id);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      day_type: announcement.day_type,
      start_time: announcement.start_time.slice(0, 5),
      end_time: announcement.end_time.slice(0, 5),
      style: announcement.style,
      priority: announcement.priority,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({ ...formData, id: editingId || undefined });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="w-6 h-6" />
            ניהול מודעות
          </h1>
          <p className="text-muted-foreground">נהל מודעות מתוזמנות לתצוגת הטלוויזיה</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingId(null); setFormData(defaultFormData); }}>
              <Plus className="w-4 h-4 ml-2" />
              הוסף מודעה
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingId ? 'עריכת מודעה' : 'הוספת מודעה חדשה'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">כותרת</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="כותרת המודעה"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">תוכן</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="תוכן המודעה"
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  יום הצגה
                </Label>
                <Select
                  value={formData.day_type}
                  onValueChange={(value: DayType) => setFormData({ ...formData, day_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DAY_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    שעת התחלה
                  </Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">שעת סיום</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  סגנון עיצוב
                </Label>
                <Select
                  value={formData.style}
                  onValueChange={(value: StyleType) => setFormData({ ...formData, style: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STYLE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded border ${STYLE_PREVIEWS[value as StyleType]}`} />
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Style Preview */}
                <div className={`p-4 rounded-lg border-2 mt-2 ${STYLE_PREVIEWS[formData.style]}`}>
                  <p className="font-bold text-lg">{formData.title || 'כותרת לדוגמה'}</p>
                  <p className="text-sm opacity-90">{formData.content || 'תוכן המודעה יופיע כאן'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">עדיפות (0-100)</Label>
                <Input
                  id="priority"
                  type="number"
                  min={0}
                  max={100}
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  ביטול
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'שומר...' : editingId ? 'עדכן' : 'הוסף'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Announcements Table */}
      <Card>
        <CardHeader>
          <CardTitle>רשימת מודעות ({announcements.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">טוען...</div>
          ) : announcements.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>אין מודעות. לחץ על "הוסף מודעה" כדי להתחיל.</p>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="block sm:hidden divide-y divide-border">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold">{announcement.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{announcement.content}</p>
                      </div>
                      <Switch
                        checked={announcement.is_active}
                        onCheckedChange={(checked) => 
                          toggleActiveMutation.mutate({ id: announcement.id, is_active: checked })
                        }
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{DAY_TYPE_LABELS[announcement.day_type]}</Badge>
                      <Badge variant="secondary">
                        {announcement.start_time.slice(0, 5)} - {announcement.end_time.slice(0, 5)}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(announcement)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => deleteMutation.mutate(announcement.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">כותרת</TableHead>
                      <TableHead className="text-right">יום</TableHead>
                      <TableHead className="text-right">שעות</TableHead>
                      <TableHead className="text-right">סגנון</TableHead>
                      <TableHead className="text-right">פעיל</TableHead>
                      <TableHead className="text-right">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {announcements.map((announcement) => (
                      <TableRow key={announcement.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{announcement.title}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1">{announcement.content}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{DAY_TYPE_LABELS[announcement.day_type]}</Badge>
                        </TableCell>
                        <TableCell dir="ltr" className="text-right">
                          {announcement.start_time.slice(0, 5)} - {announcement.end_time.slice(0, 5)}
                        </TableCell>
                        <TableCell>
                          <div className={`px-2 py-1 rounded text-xs ${STYLE_PREVIEWS[announcement.style]}`}>
                            {STYLE_LABELS[announcement.style]}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={announcement.is_active}
                            onCheckedChange={(checked) => 
                              toggleActiveMutation.mutate({ id: announcement.id, is_active: checked })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(announcement)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteMutation.mutate(announcement.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
