import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Upload, FileText, Image, Download, Eye, Search, Filter } from 'lucide-react';
import { DeleteCodeDialog } from '@/components/DeleteCodeDialog';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import ExpenseAttachmentPreview from '@/components/expenses/ExpenseAttachmentPreview';
import ExpenseCategoryManager from '@/components/expenses/ExpenseCategoryManager';

interface ExpenseCategory {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface ExpenseAttachment {
  id: string;
  expense_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
}

interface Expense {
  id: string;
  amount: number;
  category_id: string | null;
  expense_date: string;
  supplier: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  expense_categories: ExpenseCategory | null;
  expense_attachments: ExpenseAttachment[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function Expenses() {
  const { isManager } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<ExpenseAttachment | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [pendingEditExpense, setPendingEditExpense] = useState<Expense | null>(null);
  
  const [formData, setFormData] = useState({
    amount: '',
    category_id: '',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    supplier: '',
    notes: '',
  });

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as ExpenseCategory[];
    },
  });

  // Fetch expenses with categories and attachments
  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          expense_categories(*),
          expense_attachments(*)
        `)
        .order('expense_date', { ascending: false });
      if (error) throw error;
      return data as Expense[];
    },
  });

  // Save expense mutation
  const saveExpenseMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const expenseData = {
        amount: Number(data.amount),
        category_id: data.category_id || null,
        expense_date: data.expense_date,
        supplier: data.supplier || null,
        notes: data.notes || null,
      };

      let expenseId = data.id;

      if (data.id) {
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { data: newExpense, error } = await supabase
          .from('expenses')
          .insert(expenseData)
          .select()
          .single();
        if (error) throw error;
        expenseId = newExpense.id;
      }

      // Upload file if pending
      if (pendingFile && expenseId) {
        await uploadAttachment(expenseId, pendingFile);
      }

      return expenseId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success(editingExpense ? 'ההוצאה עודכנה בהצלחה' : 'ההוצאה נוספה בהצלחה');
      closeDialog();
    },
    onError: (error) => {
      toast.error('שגיאה בשמירת ההוצאה');
      console.error(error);
    },
  });

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      // First delete attachments from storage
      const { data: attachments } = await supabase
        .from('expense_attachments')
        .select('file_url')
        .eq('expense_id', id);

      if (attachments) {
        for (const att of attachments) {
          const path = att.file_url.split('/expense-receipts/')[1];
          if (path) {
            await supabase.storage.from('expense-receipts').remove([path]);
          }
        }
      }

      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('ההוצאה נמחקה בהצלחה');
    },
    onError: (error) => {
      toast.error('שגיאה במחיקת ההוצאה');
      console.error(error);
    },
  });

  const uploadAttachment = async (expenseId: string, file: File) => {
    setUploadingFile(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${expenseId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('expense-receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('expense-receipts')
        .getPublicUrl(fileName);

      const { error: attachmentError } = await supabase
        .from('expense_attachments')
        .insert({
          expense_id: expenseId,
          file_url: publicUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
        });

      if (attachmentError) throw attachmentError;

      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('הקבלה הועלתה בהצלחה');
    } catch (error) {
      toast.error('שגיאה בהעלאת הקבלה');
      console.error(error);
    } finally {
      setUploadingFile(false);
      setPendingFile(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error('סוג קובץ לא נתמך. נא להעלות JPG, PNG או PDF');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('הקובץ גדול מדי. מקסימום 10MB');
        return;
      }
      setPendingFile(file);
    }
  };

  const openAddDialog = () => {
    setEditingExpense(null);
    setFormData({
      amount: '',
      category_id: '',
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      supplier: '',
      notes: '',
    });
    setPendingFile(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      amount: String(expense.amount),
      category_id: expense.category_id || '',
      expense_date: expense.expense_date,
      supplier: expense.supplier || '',
      notes: expense.notes || '',
    });
    setPendingFile(null);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingExpense(null);
    setPendingFile(null);
  };

  const handleSubmit = () => {
    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.error('נא להזין סכום תקין');
      return;
    }
    saveExpenseMutation.mutate({
      ...formData,
      id: editingExpense?.id,
    });
  };

  const openPreview = (attachment: ExpenseAttachment) => {
    setSelectedAttachment(attachment);
    setIsPreviewOpen(true);
  };

  const handleDirectUpload = async (expenseId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error('סוג קובץ לא נתמך');
        return;
      }
      await uploadAttachment(expenseId, file);
    }
  };

  // Filter expenses
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = 
      expense.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.expense_categories?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || expense.category_id === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // Calculate totals
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const isLoading = categoriesLoading || expensesLoading;

  return (
    <AppLayout>
      <div className="container mx-auto p-4 md:p-6 space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">ניהול הוצאות</h1>
            <p className="text-muted-foreground">ניהול הוצאות בית הכנסת</p>
          </div>
          {isManager && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsCategoryDialogOpen(true)}>
                <Filter className="ml-2 h-4 w-4" />
                ניהול קטגוריות
              </Button>
              <Button onClick={openAddDialog}>
                <Plus className="ml-2 h-4 w-4" />
                הוצאה חדשה
              </Button>
            </div>
          )}
        </div>

        {/* Summary Card */}
        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">סה"כ הוצאות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600" dir="ltr">
              {formatCurrency(totalExpenses)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredExpenses.length} הוצאות
            </p>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="חיפוש לפי ספק, הערות..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="כל הקטגוריות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הקטגוריות</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>לא נמצאו הוצאות</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">תאריך</TableHead>
                      <TableHead className="text-right">קטגוריה</TableHead>
                      <TableHead className="text-right">ספק</TableHead>
                      <TableHead className="text-right">סכום</TableHead>
                      <TableHead className="text-right">קבלה</TableHead>
                      <TableHead className="text-right">הערות</TableHead>
                      {isManager && <TableHead className="text-right">פעולות</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map(expense => (
                      <TableRow key={expense.id}>
                        <TableCell dir="ltr" className="text-right">
                          {format(new Date(expense.expense_date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          {expense.expense_categories ? (
                            <Badge variant="secondary">
                              {expense.expense_categories.name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{expense.supplier || '-'}</TableCell>
                        <TableCell dir="ltr" className="text-right font-medium text-red-600">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell>
                          {expense.expense_attachments.length > 0 ? (
                            <div className="flex gap-1">
                              {expense.expense_attachments.map(att => (
                                <Button
                                  key={att.id}
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openPreview(att)}
                                  title={att.file_name}
                                >
                                  {att.file_type.includes('pdf') ? (
                                    <FileText className="h-4 w-4 text-red-500" />
                                  ) : (
                                    <Image className="h-4 w-4 text-blue-500" />
                                  )}
                                </Button>
                              ))}
                            </div>
                          ) : isManager ? (
                            <label className="cursor-pointer">
                              <input
                                type="file"
                                className="hidden"
                                accept="image/jpeg,image/png,application/pdf"
                                onChange={(e) => handleDirectUpload(expense.id, e)}
                                disabled={uploadingFile}
                              />
                              <Button variant="ghost" size="sm" asChild>
                                <span>
                                  <Upload className="h-4 w-4" />
                                </span>
                              </Button>
                            </label>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {expense.notes || '-'}
                        </TableCell>
                        {isManager && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPendingEditExpense(expense)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteExpenseId(expense.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? 'עריכת הוצאה' : 'הוספת הוצאה חדשה'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>סכום *</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>תאריך *</Label>
                  <Input
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    dir="ltr"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>קטגוריה</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר קטגוריה" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Show custom description when "אחר" is selected */}
              {categories.find(c => c.id === formData.category_id)?.name === 'אחר' && (
                <div className="space-y-2">
                  <Label>פירוט ההוצאה *</Label>
                  <Input
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="כתוב את סוג ההוצאה..."
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>ספק</Label>
                <Input
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="שם הספק"
                />
              </div>

              <div className="space-y-2">
                <Label>הערות</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="הערות נוספות..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>קבלה</Label>
                <div className="flex items-center gap-2">
                  <label className="flex-1">
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,application/pdf"
                      onChange={handleFileSelect}
                    />
                    <Button variant="outline" className="w-full" asChild>
                      <span>
                        <Upload className="ml-2 h-4 w-4" />
                        {pendingFile ? pendingFile.name : 'העלאת קבלה'}
                      </span>
                    </Button>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG או PDF עד 10MB
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={closeDialog}>
                ביטול
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={saveExpenseMutation.isPending || uploadingFile}
              >
                {saveExpenseMutation.isPending ? 'שומר...' : 'שמור'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Category Manager Dialog */}
        <ExpenseCategoryManager
          open={isCategoryDialogOpen}
          onOpenChange={setIsCategoryDialogOpen}
        />

        {/* Attachment Preview */}
        <ExpenseAttachmentPreview
          attachment={selectedAttachment}
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
        />

      <DeleteCodeDialog
        open={!!deleteExpenseId}
        onOpenChange={(open) => !open && setDeleteExpenseId(null)}
        title="מחיקת הוצאה"
        description="האם למחוק את ההוצאה? פעולה זו אינה ניתנת לביטול."
        onConfirm={() => {
          if (deleteExpenseId) {
            deleteExpenseMutation.mutate(deleteExpenseId);
            setDeleteExpenseId(null);
          }
        }}
        isPending={deleteExpenseMutation.isPending}
      />
      </div>
    </AppLayout>
  );
}
