import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  Calendar,
  Filter,
  Trash2,
  Edit,
  PiggyBank,
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';

type TransactionType = Database['public']['Enums']['transaction_type'];

interface BudgetCategory {
  id: string;
  name: string;
  type: TransactionType;
  description: string | null;
  is_active: boolean | null;
}

interface BudgetTransaction {
  id: string;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  description: string | null;
  reference: string | null;
  transaction_date: string;
  created_at: string | null;
  budget_categories?: BudgetCategory | null;
}

export default function Budget() {
  const { isManager } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<BudgetTransaction | null>(null);
  const [formData, setFormData] = useState({
    type: 'income' as TransactionType,
    category_id: '',
    amount: '',
    description: '',
    reference: '',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
  });
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    type: 'income' as TransactionType,
    description: '',
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['budget-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as BudgetCategory[];
    },
  });

  // Fetch transactions
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['budget-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_transactions')
        .select('*, budget_categories(*)')
        .order('transaction_date', { ascending: false });
      if (error) throw error;
      return data as BudgetTransaction[];
    },
  });

  // Calculate totals
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  // Create/Update transaction
  const saveTransactionMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from('budget_transactions')
          .update({
            type: data.type,
            category_id: data.category_id || null,
            amount: Number(data.amount),
            description: data.description || null,
            reference: data.reference || null,
            transaction_date: data.transaction_date,
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('budget_transactions')
          .insert({
            type: data.type,
            category_id: data.category_id || null,
            amount: Number(data.amount),
            description: data.description || null,
            reference: data.reference || null,
            transaction_date: data.transaction_date,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-transactions'] });
      toast.success(editingTransaction ? 'התנועה עודכנה בהצלחה' : 'התנועה נוספה בהצלחה');
      closeDialog();
    },
    onError: (error) => {
      toast.error('שגיאה בשמירה: ' + error.message);
    },
  });

  // Delete transaction
  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('budget_transactions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-transactions'] });
      toast.success('התנועה נמחקה בהצלחה');
    },
    onError: (error) => {
      toast.error('שגיאה במחיקה: ' + error.message);
    },
  });

  // Create category
  const createCategoryMutation = useMutation({
    mutationFn: async (data: typeof categoryForm) => {
      const { error } = await supabase
        .from('budget_categories')
        .insert({
          name: data.name,
          type: data.type,
          description: data.description || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-categories'] });
      toast.success('הקטגוריה נוספה בהצלחה');
      setCategoryDialogOpen(false);
      setCategoryForm({ name: '', type: 'income', description: '' });
    },
    onError: (error) => {
      toast.error('שגיאה ביצירת קטגוריה: ' + error.message);
    },
  });

  const openAddDialog = (type: TransactionType) => {
    setEditingTransaction(null);
    setFormData({
      type,
      category_id: '',
      amount: '',
      description: '',
      reference: '',
      transaction_date: format(new Date(), 'yyyy-MM-dd'),
    });
    setDialogOpen(true);
  };

  const openEditDialog = (transaction: BudgetTransaction) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type,
      category_id: transaction.category_id || '',
      amount: String(transaction.amount),
      description: transaction.description || '',
      reference: transaction.reference || '',
      transaction_date: transaction.transaction_date,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingTransaction(null);
    setFormData({
      type: 'income',
      category_id: '',
      amount: '',
      description: '',
      reference: '',
      transaction_date: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const handleSubmit = () => {
    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.error('יש להזין סכום חוקי');
      return;
    }
    saveTransactionMutation.mutate({
      ...formData,
      id: editingTransaction?.id,
    });
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.reference?.toLowerCase().includes(search.toLowerCase()) ||
      t.budget_categories?.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const filteredCategories = categories.filter(c => c.type === formData.type);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
              <Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              ניהול תקציב
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">מעקב אחר הכנסות והוצאות</p>
          </div>
          {isManager && (
            <div className="flex gap-2">
              <Button onClick={() => openAddDialog('income')} size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 flex-1 sm:flex-none">
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">הוסף</span> הכנסה
              </Button>
              <Button onClick={() => openAddDialog('expense')} variant="destructive" size="sm" className="gap-2 flex-1 sm:flex-none">
                <TrendingDown className="w-4 h-4" />
                <span className="hidden sm:inline">הוסף</span> הוצאה
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card border-emerald-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">סה"כ הכנסות</p>
                <p className="text-2xl font-bold text-emerald-500">₪{totalIncome.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-destructive/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">סה"כ הוצאות</p>
                <p className="text-2xl font-bold text-destructive">₪{totalExpense.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`glass-card ${balance >= 0 ? 'border-emerald-500/20' : 'border-destructive/20'}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${balance >= 0 ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
                <PiggyBank className={`w-6 h-6 ${balance >= 0 ? 'text-emerald-500' : 'text-destructive'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">יתרה</p>
                <p className={`text-2xl font-bold ${balance >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                  ₪{balance.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="glass-card">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              תנועות
            </CardTitle>
            {isManager && (
              <Button variant="outline" size="sm" onClick={() => setCategoryDialogOpen(true)}>
                <Plus className="w-4 h-4 ml-1" />
                קטגוריה חדשה
              </Button>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'all' | TransactionType)}>
              <SelectTrigger className="w-32">
                <Filter className="w-4 h-4 ml-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="income">הכנסות</SelectItem>
                <SelectItem value="expense">הוצאות</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              לא נמצאו תנועות
            </div>
          ) : (
            <>
              {/* Mobile view - Cards */}
              <div className="block sm:hidden space-y-3">
                {filteredTransactions.map((transaction) => (
                  <div key={transaction.id} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'} className="text-xs">
                            {transaction.type === 'income' ? 'הכנסה' : 'הוצאה'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(transaction.transaction_date), 'dd/MM/yy', { locale: he })}
                          </span>
                        </div>
                        <p className="text-sm font-medium truncate">{transaction.budget_categories?.name || '-'}</p>
                        {transaction.description && (
                          <p className="text-xs text-muted-foreground truncate">{transaction.description}</p>
                        )}
                      </div>
                      <div className="text-left shrink-0">
                        <p className={`font-bold ${transaction.type === 'income' ? 'text-emerald-500' : 'text-destructive'}`}>
                          {transaction.type === 'income' ? '+' : '-'}₪{Number(transaction.amount).toLocaleString()}
                        </p>
                        {isManager && (
                          <div className="flex gap-1 mt-1 justify-end">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditDialog(transaction)}>
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => deleteTransactionMutation.mutate(transaction.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop view - Table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>תאריך</TableHead>
                      <TableHead>סוג</TableHead>
                      <TableHead>קטגוריה</TableHead>
                      <TableHead>תיאור</TableHead>
                      <TableHead>סכום</TableHead>
                      {isManager && <TableHead>פעולות</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {format(new Date(transaction.transaction_date), 'dd/MM/yyyy', { locale: he })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'}>
                            {transaction.type === 'income' ? 'הכנסה' : 'הוצאה'}
                          </Badge>
                        </TableCell>
                        <TableCell>{transaction.budget_categories?.name || '-'}</TableCell>
                        <TableCell className="max-w-xs truncate">{transaction.description || '-'}</TableCell>
                        <TableCell className={transaction.type === 'income' ? 'text-emerald-500 font-medium' : 'text-destructive font-medium'}>
                          {transaction.type === 'income' ? '+' : '-'}₪{Number(transaction.amount).toLocaleString()}
                        </TableCell>
                        {isManager && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEditDialog(transaction)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteTransactionMutation.mutate(transaction.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Transaction Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {formData.type === 'income' ? (
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-destructive" />
              )}
              {editingTransaction ? 'עריכת תנועה' : formData.type === 'income' ? 'הוספת הכנסה' : 'הוספת הוצאה'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Tabs value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as TransactionType, category_id: '' })}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="income" className="gap-2">
                  <TrendingUp className="w-4 h-4" />
                  הכנסה
                </TabsTrigger>
                <TabsTrigger value="expense" className="gap-2">
                  <TrendingDown className="w-4 h-4" />
                  הוצאה
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">סכום *</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">תאריך *</label>
                <Input
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">קטגוריה</label>
              <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר קטגוריה" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">תיאור</label>
              <Textarea
                placeholder="תיאור התנועה..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">אסמכתא</label>
              <Input
                placeholder="מספר חשבונית / אסמכתא"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>ביטול</Button>
            <Button onClick={handleSubmit} disabled={saveTransactionMutation.isPending}>
              {saveTransactionMutation.isPending ? 'שומר...' : 'שמור'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>הוספת קטגוריה חדשה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">שם הקטגוריה *</label>
              <Input
                placeholder="שם הקטגוריה"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">סוג *</label>
              <Select value={categoryForm.type} onValueChange={(v) => setCategoryForm({ ...categoryForm, type: v as TransactionType })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">הכנסה</SelectItem>
                  <SelectItem value="expense">הוצאה</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">תיאור</label>
              <Textarea
                placeholder="תיאור הקטגוריה..."
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>ביטול</Button>
            <Button
              onClick={() => createCategoryMutation.mutate(categoryForm)}
              disabled={!categoryForm.name || createCategoryMutation.isPending}
            >
              {createCategoryMutation.isPending ? 'שומר...' : 'צור קטגוריה'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
