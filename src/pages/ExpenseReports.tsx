import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, TrendingUp, TrendingDown, Wallet, FileSpreadsheet, FileText } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
  }).format(amount);
};

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function ExpenseReports() {
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(subMonths(today, 5)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), 'yyyy-MM-dd'));

  // Fetch income from payments
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['report-payments', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('amount, created_at')
        .eq('status', 'confirmed')
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59');
      if (error) throw error;
      return data;
    },
  });

  // Fetch income from budget_transactions
  const { data: budgetIncome = [], isLoading: budgetLoading } = useQuery({
    queryKey: ['report-budget-income', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_transactions')
        .select('amount, transaction_date')
        .eq('type', 'income')
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate);
      if (error) throw error;
      return data;
    },
  });

  // Fetch expenses
  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ['report-expenses', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          expense_categories(name),
          expense_attachments(file_url, file_name)
        `)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)
        .order('expense_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch expense categories for chart
  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const isLoading = paymentsLoading || budgetLoading || expensesLoading;

  // Calculate totals
  const totals = useMemo(() => {
    const paymentIncome = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const otherIncome = budgetIncome.reduce((sum, b) => sum + Number(b.amount), 0);
    const totalIncome = paymentIncome + otherIncome;
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const balance = totalIncome - totalExpenses;
    
    return { paymentIncome, otherIncome, totalIncome, totalExpenses, balance };
  }, [payments, budgetIncome, expenses]);

  // Monthly data for chart
  const monthlyData = useMemo(() => {
    const months: { [key: string]: { month: string; income: number; expenses: number } } = {};
    
    // Process payments
    payments.forEach(p => {
      const monthKey = format(new Date(p.created_at), 'yyyy-MM');
      if (!months[monthKey]) {
        months[monthKey] = { 
          month: format(new Date(p.created_at), 'MMM yyyy', { locale: he }), 
          income: 0, 
          expenses: 0 
        };
      }
      months[monthKey].income += Number(p.amount);
    });

    // Process budget income
    budgetIncome.forEach(b => {
      const monthKey = format(parseISO(b.transaction_date), 'yyyy-MM');
      if (!months[monthKey]) {
        months[monthKey] = { 
          month: format(parseISO(b.transaction_date), 'MMM yyyy', { locale: he }), 
          income: 0, 
          expenses: 0 
        };
      }
      months[monthKey].income += Number(b.amount);
    });

    // Process expenses
    expenses.forEach(e => {
      const monthKey = format(parseISO(e.expense_date), 'yyyy-MM');
      if (!months[monthKey]) {
        months[monthKey] = { 
          month: format(parseISO(e.expense_date), 'MMM yyyy', { locale: he }), 
          income: 0, 
          expenses: 0 
        };
      }
      months[monthKey].expenses += Number(e.amount);
    });

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, data]) => data);
  }, [payments, budgetIncome, expenses]);

  // Category breakdown for pie chart
  const categoryData = useMemo(() => {
    const catTotals: { [key: string]: number } = {};
    
    expenses.forEach(e => {
      const catName = e.expense_categories?.name || 'לא מסווג';
      catTotals[catName] = (catTotals[catName] || 0) + Number(e.amount);
    });

    return Object.entries(catTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  // Export to Excel (CSV)
  const handleExportExcel = () => {
    const headers = ['תאריך', 'קטגוריה', 'ספק', 'סכום', 'הערות', 'קבלה'];
    const rows = expenses.map(e => [
      e.expense_date,
      e.expense_categories?.name || '',
      e.supplier || '',
      e.amount,
      e.notes || '',
      e.expense_attachments?.[0]?.file_url || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `expenses_${startDate}_${endDate}.csv`;
    link.click();
  };

  // Export to PDF (simplified - creates printable HTML)
  const handleExportPdf = () => {
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <title>דו"ח הוצאות</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
          th { background: #f5f5f5; }
          .summary { display: flex; gap: 20px; margin: 20px 0; }
          .summary-card { flex: 1; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
          .income { color: green; }
          .expense { color: red; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <h1>דו"ח הכנסות והוצאות</h1>
        <p>תקופה: ${format(parseISO(startDate), 'dd/MM/yyyy')} - ${format(parseISO(endDate), 'dd/MM/yyyy')}</p>
        
        <div class="summary">
          <div class="summary-card">
            <strong>סה"כ הכנסות:</strong>
            <div class="income">${formatCurrency(totals.totalIncome)}</div>
          </div>
          <div class="summary-card">
            <strong>סה"כ הוצאות:</strong>
            <div class="expense">${formatCurrency(totals.totalExpenses)}</div>
          </div>
          <div class="summary-card">
            <strong>יתרה:</strong>
            <div class="${totals.balance >= 0 ? 'income' : 'expense'}">${formatCurrency(totals.balance)}</div>
          </div>
        </div>

        <h2>פירוט הוצאות</h2>
        <table>
          <thead>
            <tr>
              <th>תאריך</th>
              <th>קטגוריה</th>
              <th>ספק</th>
              <th>סכום</th>
              <th>הערות</th>
            </tr>
          </thead>
          <tbody>
            ${expenses.map(e => `
              <tr>
                <td>${format(parseISO(e.expense_date), 'dd/MM/yyyy')}</td>
                <td>${e.expense_categories?.name || '-'}</td>
                <td>${e.supplier || '-'}</td>
                <td>${formatCurrency(e.amount)}</td>
                <td>${e.notes || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <button class="no-print" onclick="window.print()">הדפס</button>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-4 md:p-6 space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">דו"ח הכנסות והוצאות</h1>
            <p className="text-muted-foreground">ניתוח מצב פיננסי</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportExcel}>
              <FileSpreadsheet className="ml-2 h-4 w-4" />
              ייצוא Excel
            </Button>
            <Button variant="outline" onClick={handleExportPdf}>
              <FileText className="ml-2 h-4 w-4" />
              ייצוא PDF
            </Button>
          </div>
        </div>

        {/* Date Range Filter */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="space-y-2 flex-1">
                <Label>מתאריך</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label>עד תאריך</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  dir="ltr"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  סה"כ הכנסות
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600" dir="ltr">
                  {formatCurrency(totals.totalIncome)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  תשלומים: {formatCurrency(totals.paymentIncome)} | אחר: {formatCurrency(totals.otherIncome)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  סה"כ הוצאות
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600" dir="ltr">
                  {formatCurrency(totals.totalExpenses)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {expenses.length} הוצאות
                </p>
              </CardContent>
            </Card>

            <Card className={`bg-gradient-to-br ${totals.balance >= 0 ? 'from-blue-500/10 to-blue-600/5 border-blue-200' : 'from-orange-500/10 to-orange-600/5 border-orange-200'}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wallet className={`h-5 w-5 ${totals.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                  יתרה
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${totals.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`} dir="ltr">
                  {formatCurrency(totals.balance)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {totals.balance >= 0 ? 'עודף' : 'גירעון'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts */}
        <Tabs defaultValue="monthly" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="monthly">גרף חודשי</TabsTrigger>
            <TabsTrigger value="categories">פילוח קטגוריות</TabsTrigger>
          </TabsList>
          
          <TabsContent value="monthly">
            <Card>
              <CardHeader>
                <CardTitle>הכנסות מול הוצאות לפי חודש</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : monthlyData.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    אין נתונים לתצוגה
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="income" name="הכנסות" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="הוצאות" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle>פילוח הוצאות לפי קטגוריה</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : categoryData.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    אין נתונים לתצוגה
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row gap-8">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">קטגוריה</TableHead>
                            <TableHead className="text-right">סכום</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {categoryData.map((cat, index) => (
                            <TableRow key={cat.name}>
                              <TableCell className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                />
                                {cat.name}
                              </TableCell>
                              <TableCell dir="ltr" className="text-right">
                                {formatCurrency(cat.value)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Expenses Table */}
        <Card>
          <CardHeader>
            <CardTitle>פירוט הוצאות</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : expenses.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                אין הוצאות בטווח התאריכים שנבחר
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
                      <TableHead className="text-right">הערות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map(expense => (
                      <TableRow key={expense.id}>
                        <TableCell dir="ltr" className="text-right">
                          {format(parseISO(expense.expense_date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>{expense.expense_categories?.name || '-'}</TableCell>
                        <TableCell>{expense.supplier || '-'}</TableCell>
                        <TableCell dir="ltr" className="text-right font-medium text-red-600">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {expense.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
