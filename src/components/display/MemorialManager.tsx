import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Flame } from 'lucide-react';

interface MemorialName {
  id: string;
  deceased_name: string;
  father_name: string;
  is_male: boolean | null;
  hebrew_death_day: number;
  hebrew_death_month: number;
  is_active: boolean | null;
  notes: string | null;
  family_member_id: string | null;
}

const HEBREW_MONTHS = [
  { value: 1, label: 'ניסן' },
  { value: 2, label: 'אייר' },
  { value: 3, label: 'סיוון' },
  { value: 4, label: 'תמוז' },
  { value: 5, label: 'אב' },
  { value: 6, label: 'אלול' },
  { value: 7, label: 'תשרי' },
  { value: 8, label: 'חשוון' },
  { value: 9, label: 'כסלו' },
  { value: 10, label: 'טבת' },
  { value: 11, label: 'שבט' },
  { value: 12, label: 'אדר' },
  { value: 13, label: "אדר ב'" },
];

const MONTH_LABELS: Record<number, string> = Object.fromEntries(
  HEBREW_MONTHS.map(m => [m.value, m.label])
);

const HEBREW_DAY_LABELS: Record<number, string> = {
  1: "א'", 2: "ב'", 3: "ג'", 4: "ד'", 5: "ה'", 6: "ו'", 7: "ז'", 8: "ח'", 9: "ט'", 10: "י'",
  11: "י\"א", 12: "י\"ב", 13: "י\"ג", 14: "י\"ד", 15: "ט\"ו", 16: "ט\"ז", 17: "י\"ז", 18: "י\"ח", 19: "י\"ט", 20: "כ'",
  21: "כ\"א", 22: "כ\"ב", 23: "כ\"ג", 24: "כ\"ד", 25: "כ\"ה", 26: "כ\"ו", 27: "כ\"ז", 28: "כ\"ח", 29: "כ\"ט", 30: "ל'",
};

const HEBREW_DAYS = Array.from({ length: 30 }, (_, i) => ({
  value: i + 1,
  label: HEBREW_DAY_LABELS[i + 1],
}));

const defaultMemorialForm = {
  deceased_name: '',
  father_name: '',
  is_male: true,
  hebrew_death_day: 1,
  hebrew_death_month: 7,
  notes: '',
};

interface MemorialManagerProps {
  showMemorial: boolean;
  onToggleMemorial: (checked: boolean) => void;
}

export default function MemorialManager({ showMemorial, onToggleMemorial }: MemorialManagerProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultMemorialForm);

  const { data: memorials = [], isLoading } = useQuery({
    queryKey: ['memorial-names-manage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memorial_names')
        .select('*')
        .order('hebrew_death_month', { ascending: true })
        .order('hebrew_death_day', { ascending: true });
      if (error) throw error;
      return data as MemorialName[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form & { id?: string }) => {
      const payload = {
        deceased_name: data.deceased_name,
        father_name: data.father_name,
        is_male: data.is_male,
        hebrew_death_day: data.hebrew_death_day,
        hebrew_death_month: data.hebrew_death_month,
        notes: data.notes || null,
      };
      if (data.id) {
        const { error } = await supabase
          .from('memorial_names')
          .update(payload)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('memorial_names')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memorial-names-manage'] });
      toast.success(editingId ? 'הנפטר עודכן' : 'הנפטר נוסף');
      handleClose();
    },
    onError: () => toast.error('שגיאה בשמירה'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('memorial_names').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memorial-names-manage'] });
      toast.success('הנפטר נמחק');
    },
    onError: () => toast.error('שגיאה במחיקה'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('memorial_names')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memorial-names-manage'] });
    },
    onError: () => toast.error('שגיאה בעדכון'),
  });

  const handleEdit = (m: MemorialName) => {
    setEditingId(m.id);
    setForm({
      deceased_name: m.deceased_name,
      father_name: m.father_name,
      is_male: m.is_male !== false,
      hebrew_death_day: m.hebrew_death_day,
      hebrew_death_month: m.hebrew_death_month,
      notes: m.notes || '',
    });
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingId(null);
    setForm(defaultMemorialForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({ ...form, id: editingId || undefined });
  };

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
      <CardContent className="p-4 space-y-4">
        {/* Header with toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Flame className="w-5 h-5 text-amber-500" />
            <div>
              <p className="font-semibold text-sm">ניהול אשכבות</p>
              <p className="text-xs text-muted-foreground">
                {memorials.filter(m => m.is_active).length} נפטרים פעילים
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">הצג על המסך</span>
            <Switch checked={showMemorial} onCheckedChange={onToggleMemorial} />
          </div>
        </div>

        {/* Add button + Dialog */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => { setEditingId(null); setForm(defaultMemorialForm); }}
              className="w-full sm:w-auto min-h-[44px]"
            >
              <Plus className="w-4 h-4 ml-1" />
              הוסף נפטר
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingId ? 'עריכת נפטר' : 'הוספת נפטר'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>שם הנפטר/ת</Label>
                <Input
                  value={form.deceased_name}
                  onChange={(e) => setForm({ ...form, deceased_name: e.target.value })}
                  placeholder="שם הנפטר"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>שם האב</Label>
                <Input
                  value={form.father_name}
                  onChange={(e) => setForm({ ...form, father_name: e.target.value })}
                  placeholder="שם האב"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>מין</Label>
                <Select
                  value={form.is_male ? 'male' : 'female'}
                  onValueChange={(v) => setForm({ ...form, is_male: v === 'male' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">זכר (בן)</SelectItem>
                    <SelectItem value="female">נקבה (בת)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>יום עברי</Label>
                  <Select
                    value={String(form.hebrew_death_day)}
                    onValueChange={(v) => setForm({ ...form, hebrew_death_day: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HEBREW_DAYS.map((d) => (
                        <SelectItem key={d.value} value={String(d.value)}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>חודש עברי</Label>
                  <Select
                    value={String(form.hebrew_death_month)}
                    onValueChange={(v) => setForm({ ...form, hebrew_death_month: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HEBREW_MONTHS.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>הערות (אופציונלי)</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="הערות"
                />
              </div>
              <div className="flex gap-2 justify-end sticky bottom-0 bg-background pt-2">
                <Button type="button" variant="outline" onClick={handleClose} className="min-h-[44px]">
                  ביטול
                </Button>
                <Button type="submit" disabled={saveMutation.isPending} className="min-h-[44px]">
                  {saveMutation.isPending ? 'שומר...' : editingId ? 'עדכן' : 'הוסף'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Memorial names list */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">טוען...</p>
        ) : memorials.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">אין נפטרים ברשימה</p>
        ) : (
          <div className="divide-y divide-border rounded-lg border overflow-hidden">
            {memorials.map((m) => (
              <div
                key={m.id}
                className={`p-3 flex items-center justify-between gap-2 ${
                  !m.is_active ? 'opacity-50' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {m.deceased_name} {m.is_male !== false ? 'בן' : 'בת'} {m.father_name}
                  </p>
                  <div className="flex gap-1.5 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {HEBREW_DAY_LABELS[m.hebrew_death_day] || m.hebrew_death_day} {MONTH_LABELS[m.hebrew_death_month] || ''}
                    </Badge>
                    {m.notes && (
                      <Badge variant="secondary" className="text-xs truncate max-w-[120px]">
                        {m.notes}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Switch
                    checked={m.is_active !== false}
                    onCheckedChange={(checked) =>
                      toggleActiveMutation.mutate({ id: m.id, is_active: checked })
                    }
                  />
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => handleEdit(m)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-destructive"
                    onClick={() => deleteMutation.mutate(m.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
