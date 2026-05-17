import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ScrollText, Plus, Pencil, Trash2, Check, X, Star } from 'lucide-react';

interface SeferTorah {
  id: string;
  name: string;
  notes: string | null;
  is_active: boolean;
}

const ACTIVE_KEY = 'active_sefer_torah_id';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export default function SifreiTorahManager() {
  const [list, setList] = useState<SeferTorah[]>([]);
  const [activeId, setActiveId] = useState<string>('none');
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const [{ data: items }, { data: setting }] = await Promise.all([
      db.from('sifrei_torah').select('*').order('created_at', { ascending: true }),
      supabase.from('app_settings').select('value').eq('key', ACTIVE_KEY).maybeSingle(),
    ]);
    setList((items || []) as SeferTorah[]);
    setActiveId(setting?.value || 'none');
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('sifrei-torah-manager')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sifrei_torah' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
    toast({ title: 'ספר התורה נוסף' });
    load();
  };

  const startEdit = (s: SeferTorah) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditNotes(s.notes || '');
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
    toast({ title: 'עודכן בהצלחה' });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('למחוק ספר תורה זה?')) return;
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="w-5 h-5" />
          ספרי תורה
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            ספר התורה לשבת/חג הקרובים
          </Label>
          <Select value={activeId || 'none'} onValueChange={saveActive}>
            <SelectTrigger>
              <SelectValue placeholder="בחר ספר תורה" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— ללא הצגה —</SelectItem>
              {list
                .filter((s) => s.is_active)
                .map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            השם יופיע במסך התצוגה הציבורי בכותרת.
          </p>
        </div>

        <div className="border-t pt-4 space-y-3">
          <Label className="text-sm font-semibold">הוספת ספר תורה חדש</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input
              placeholder="שם הספר (לדוג' ספר רבי יוסף)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="md:col-span-1"
            />
            <Input
              placeholder="הערות (אופציונלי)"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="md:col-span-1"
            />
            <Button onClick={addSefer} disabled={loading || !newName.trim()}>
              <Plus className="w-4 h-4 ml-1" />
              הוסף
            </Button>
          </div>
        </div>

        <div className="border-t pt-4 space-y-2">
          <Label className="text-sm font-semibold">רשימת ספרי התורה</Label>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">אין ספרי תורה. הוסף את הראשון למעלה.</p>
          ) : (
            <div className="space-y-2">
              {list.map((s) => (
                <div
                  key={s.id}
                  className={`flex items-center gap-2 p-3 rounded-lg border ${
                    activeId === s.id ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : 'bg-background'
                  }`}
                >
                  {editingId === s.id ? (
                    <>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1"
                        placeholder="שם"
                      />
                      <Input
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="flex-1"
                        placeholder="הערות"
                      />
                      <Button size="icon" variant="ghost" onClick={saveEdit}>
                        <Check className="w-4 h-4 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {activeId === s.id && <Star className="w-4 h-4 text-amber-500 fill-amber-400" />}
                          <p className={`font-medium truncate ${!s.is_active ? 'line-through text-muted-foreground' : ''}`}>
                            {s.name}
                          </p>
                        </div>
                        {s.notes && <p className="text-xs text-muted-foreground truncate">{s.notes}</p>}
                      </div>
                      <Button
                        size="sm"
                        variant={s.is_active ? 'outline' : 'secondary'}
                        onClick={() => toggleActive(s)}
                      >
                        {s.is_active ? 'פעיל' : 'מושבת'}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => startEdit(s)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(s.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
