import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';

interface ExpenseCategory {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface ExpenseCategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ExpenseCategoryManager({
  open,
  onOpenChange,
}: ExpenseCategoryManagerProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [editData, setEditData] = useState({ name: '', description: '' });
  const [isAdding, setIsAdding] = useState(false);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['expense-categories-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as ExpenseCategory[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const { error } = await supabase
        .from('expense_categories')
        .insert({
          name: data.name,
          description: data.description || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      queryClient.invalidateQueries({ queryKey: ['expense-categories-all'] });
      toast.success('הקטגוריה נוספה בהצלחה');
      setNewCategory({ name: '', description: '' });
      setIsAdding(false);
    },
    onError: () => toast.error('שגיאה בהוספת קטגוריה'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ExpenseCategory> }) => {
      const { error } = await supabase
        .from('expense_categories')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      queryClient.invalidateQueries({ queryKey: ['expense-categories-all'] });
      toast.success('הקטגוריה עודכנה');
      setEditingId(null);
    },
    onError: () => toast.error('שגיאה בעדכון קטגוריה'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      queryClient.invalidateQueries({ queryKey: ['expense-categories-all'] });
      toast.success('הקטגוריה נמחקה');
    },
    onError: () => toast.error('שגיאה במחיקת קטגוריה'),
  });

  const startEdit = (cat: ExpenseCategory) => {
    setEditingId(cat.id);
    setEditData({ name: cat.name, description: cat.description || '' });
  };

  const handleAdd = () => {
    if (!newCategory.name.trim()) {
      toast.error('נא להזין שם קטגוריה');
      return;
    }
    createMutation.mutate(newCategory);
  };

  const handleUpdate = (id: string) => {
    if (!editData.name.trim()) {
      toast.error('נא להזין שם קטגוריה');
      return;
    }
    updateMutation.mutate({
      id,
      data: { name: editData.name, description: editData.description || null },
    });
  };

  const toggleActive = (cat: ExpenseCategory) => {
    updateMutation.mutate({
      id: cat.id,
      data: { is_active: !cat.is_active },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>ניהול קטגוריות הוצאות</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new category */}
          {isAdding ? (
            <div className="flex gap-2 items-end p-4 border rounded-lg bg-muted/50">
              <div className="flex-1 space-y-2">
                <Label>שם קטגוריה</Label>
                <Input
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  placeholder="שם הקטגוריה"
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label>תיאור</Label>
                <Input
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  placeholder="תיאור (אופציונלי)"
                />
              </div>
              <Button onClick={handleAdd} disabled={createMutation.isPending}>
                <Save className="ml-2 h-4 w-4" />
                שמור
              </Button>
              <Button variant="ghost" onClick={() => setIsAdding(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsAdding(true)} variant="outline">
              <Plus className="ml-2 h-4 w-4" />
              הוסף קטגוריה
            </Button>
          )}

          {/* Categories list */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">שם</TableHead>
                <TableHead className="text-right">תיאור</TableHead>
                <TableHead className="text-right">פעיל</TableHead>
                <TableHead className="text-right">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell>
                    {editingId === cat.id ? (
                      <Input
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      />
                    ) : (
                      cat.name
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === cat.id ? (
                      <Input
                        value={editData.description}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      />
                    ) : (
                      cat.description || '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={cat.is_active}
                      onCheckedChange={() => toggleActive(cat)}
                    />
                  </TableCell>
                  <TableCell>
                    {editingId === cat.id ? (
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => handleUpdate(cat.id)}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(cat)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm('האם למחוק את הקטגוריה?')) {
                              deleteMutation.mutate(cat.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
