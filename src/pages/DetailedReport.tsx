import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { FileText, FileSpreadsheet, ClipboardList, Users, TrendingUp, TrendingDown } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  all: 'הכל',
  donation: 'תרומה',
  ashkava: 'אשכבה',
  yearly_bracha: 'ברכת השנים',
  hall: 'אולם',
  other: 'אחר',
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'מזומן',
  bit: 'ביט',
  check: "צ'ק",
  bank_transfer: 'העברה בנקאית',
};

const RECORD_TYPE_LABELS: Record<string, string> = {
  all: 'הכל',
  payments: 'תשלומים (הכנסות)',
  expenses: 'הוצאות',
  budget_income: 'הכנסות תקציב',
  budget_expense: 'הוצאות תקציב',
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0 }).format(amount);

interface UnifiedRecord {
  id: string;
  name: string;
  type: string;
  typeLabel: string;
  method: string;
  amount: number;
  date: string;
  notes: string;
  recordKind: 'income' | 'expense';
}

export default function DetailedReport() {
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(subMonths(today, 1)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), 'yyyy-MM-dd'));
  const [typeFilter, setTypeFilter] = useState('all');
  const [recordTypeFilter, setRecordTypeFilter] = useState('all');
  const [groupByMember, setGroupByMember] = useState(false);

  const { data: allRecords = [], isLoading } = useQuery({
    queryKey: ['detailed-report-unified', startDate, endDate, typeFilter, recordTypeFilter],
    queryFn: async () => {
      const records: UnifiedRecord[] = [];

      // Fetch payments (income)
      if (recordTypeFilter === 'all' || recordTypeFilter === 'payments') {
        let query = supabase
          .from('payments')
          .select('id, amount, method, created_at, payment_type, notes, member_id, members(full_name)')
          .eq('status', 'confirmed')
          .gte('created_at', startDate)
          .lte('created_at', endDate + 'T23:59:59')
          .order('created_at', { ascending: false });

        if (typeFilter !== 'all') {
          query = query.eq('payment_type', typeFilter);
        }

        const { data } = await query;
        (data || []).forEach(p => {
          records.push({
            id: p.id,
            name: (p as any).members?.full_name || 'לא ידוע',
            type: p.payment_type,
            typeLabel: PAYMENT_TYPE_LABELS[p.payment_type] || p.payment_type,
            method: METHOD_LABELS[p.method] || p.method,
            amount: Number(p.amount),
            date: p.created_at!,
            notes: p.notes || '',
            recordKind: 'income',
          });
        });
      }

      // Fetch expenses
      if (recordTypeFilter === 'all' || recordTypeFilter === 'expenses') {
        const { data: expData } = await supabase
          .from('expenses')
          .select('id, amount, expense_date, notes, supplier, category_id, expense_categories(name)')
          .gte('expense_date', startDate)
          .lte('expense_date', endDate)
          .order('expense_date', { ascending: false });

        (expData || []).forEach(e => {
          records.push({
            id: e.id,
            name: e.supplier || 'ספק לא ידוע',
            type: 'expense',
            typeLabel: (e as any).expense_categories?.name || 'הוצאה',
            method: '-',
            amount: Number(e.amount),
            date: e.expense_date,
            notes: e.notes || '',
            recordKind: 'expense',
          });
        });
      }

      // Fetch budget transactions
      if (recordTypeFilter === 'all' || recordTypeFilter === 'budget_income' || recordTypeFilter === 'budget_expense') {
        let btQuery = supabase
          .from('budget_transactions')
          .select('id, amount, transaction_date, type, description, reference, category_id, budget_categories(name)')
          .gte('transaction_date', startDate)
          .lte('transaction_date', endDate)
          .order('transaction_date', { ascending: false });

        if (recordTypeFilter === 'budget_income') {
          btQuery = btQuery.eq('type', 'income');
        } else if (recordTypeFilter === 'budget_expense') {
          btQuery = btQuery.eq('type', 'expense');
        }

        const { data: btData } = await btQuery;
        (btData || []).forEach(b => {
          records.push({
            id: b.id,
            name: b.description || ((b as any).budget_categories?.name || (b.type === 'income' ? 'הכנסה' : 'הוצאה')),
            type: b.type,
            typeLabel: (b as any).budget_categories?.name || (b.type === 'income' ? 'הכנסת תקציב' : 'הוצאת תקציב'),
            method: b.reference || '-',
            amount: Number(b.amount),
            date: b.transaction_date,
            notes: b.description || '',
            recordKind: b.type === 'income' ? 'income' : 'expense',
          });
        });
      }

      // Sort by date descending
      records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return records;
    },
  });

  const totalIncome = useMemo(() => allRecords.filter(r => r.recordKind === 'income').reduce((s, r) => s + r.amount, 0), [allRecords]);
  const totalExpenses = useMemo(() => allRecords.filter(r => r.recordKind === 'expense').reduce((s, r) => s + r.amount, 0), [allRecords]);
  const totalBalance = totalIncome - totalExpenses;

  const groupedData = useMemo(() => {
    const groups: Record<string, { name: string; records: UnifiedRecord[]; totalIncome: number; totalExpenses: number }> = {};
    allRecords.forEach(r => {
      if (!groups[r.name]) groups[r.name] = { name: r.name, records: [], totalIncome: 0, totalExpenses: 0 };
      groups[r.name].records.push(r);
      if (r.recordKind === 'income') groups[r.name].totalIncome += r.amount;
      else groups[r.name].totalExpenses += r.amount;
    });
    return Object.values(groups).sort((a, b) => (b.totalIncome - b.totalExpenses) - (a.totalIncome - a.totalExpenses));
  }, [allRecords]);

  const formatDate = (d: string) => {
    try { return format(new Date(d), 'dd/MM/yyyy'); } catch { return d; }
  };

  const handleExportCSV = () => {
    const headers = ['שם', 'סוג', 'קטגוריה', 'אמצעי/אסמכתא', 'סכום', 'הכנסה/הוצאה', 'תאריך', 'הערות'];
    const rows = allRecords.map(r => [
      r.name,
      r.recordKind === 'income' ? 'הכנסה' : 'הוצאה',
      r.typeLabel,
      r.method,
      r.amount,
      r.recordKind === 'income' ? 'הכנסה' : 'הוצאה',
      formatDate(r.date),
      r.notes,
    ]);

    const lines = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      '',
      `"סה״כ הכנסות","","","","${totalIncome}","","",""`,
      `"סה״כ הוצאות","","","","${totalExpenses}","","",""`,
      `"יתרה","","","","${totalBalance}","","",""`,
    ];

    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `דוח_מפורט_${startDate}_${endDate}.csv`;
    link.click();
  };

  const handleExportPDF = () => {
    const styles = `
      body { font-family: Arial, sans-serif; padding: 20px; direction: rtl; }
      h1 { text-align: center; margin-bottom: 5px; }
      .subtitle { text-align: center; color: #666; margin-bottom: 20px; }
      .summary { display: flex; justify-content: center; gap: 30px; margin-bottom: 20px; }
      .summary-item { text-align: center; padding: 10px 20px; border-radius: 8px; }
      .income-bg { background: #e8f5e9; }
      .expense-bg { background: #fce4ec; }
      .balance-bg { background: #e3f2fd; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: right; font-size: 13px; }
      th { background: #f0f0f0; font-weight: bold; }
      tr:nth-child(even) { background: #fafafa; }
      .income-row { color: #2e7d32; }
      .expense-row { color: #c62828; }
      .total-row { font-weight: bold; background: #e8f5e9 !important; }
      .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #999; }
      @media print { button { display: none; } }
    `;

    const bodyContent = `
      <div class="summary">
        <div class="summary-item income-bg"><div>הכנסות</div><div><strong>${formatCurrency(totalIncome)}</strong></div></div>
        <div class="summary-item expense-bg"><div>הוצאות</div><div><strong>${formatCurrency(totalExpenses)}</strong></div></div>
        <div class="summary-item balance-bg"><div>יתרה</div><div><strong>${formatCurrency(totalBalance)}</strong></div></div>
      </div>
      <table>
        <thead><tr><th>#</th><th>שם</th><th>סוג</th><th>קטגוריה</th><th>אמצעי</th><th>סכום</th><th>תאריך</th><th>הערות</th></tr></thead>
        <tbody>
          ${allRecords.map((r, i) => `
            <tr class="${r.recordKind === 'income' ? 'income-row' : 'expense-row'}">
              <td>${i + 1}</td>
              <td>${r.name}</td>
              <td>${r.recordKind === 'income' ? 'הכנסה' : 'הוצאה'}</td>
              <td>${r.typeLabel}</td>
              <td>${r.method}</td>
              <td>${formatCurrency(r.amount)}</td>
              <td>${formatDate(r.date)}</td>
              <td>${r.notes || '-'}</td>
            </tr>
          `).join('')}
          <tr class="total-row"><td colspan="5">סה״כ הכנסות</td><td>${formatCurrency(totalIncome)}</td><td colspan="2"></td></tr>
          <tr style="font-weight:bold;background:#fce4ec"><td colspan="5">סה״כ הוצאות</td><td>${formatCurrency(totalExpenses)}</td><td colspan="2"></td></tr>
          <tr style="font-weight:bold;background:#e3f2fd"><td colspan="5">יתרה</td><td>${formatCurrency(totalBalance)}</td><td colspan="2"></td></tr>
        </tbody>
      </table>
    `;

    const printContent = `
      <!DOCTYPE html><html dir="rtl" lang="he">
      <head><meta charset="UTF-8"><title>דוח מפורט</title><style>${styles}</style></head>
      <body>
        <h1>ברית שלום - דוח מפורט</h1>
        <p class="subtitle">תקופה: ${format(parseISO(startDate), 'dd/MM/yyyy')} - ${format(parseISO(endDate), 'dd/MM/yyyy')}</p>
        ${bodyContent}
        <p class="footer">הופק בתאריך ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        <button onclick="window.print()" style="margin:20px auto;display:block;padding:10px 30px;cursor:pointer;">הדפס / שמור כ-PDF</button>
      </body></html>
    `;

    const w = window.open('', '_blank');
    if (w) { w.document.write(printContent); w.document.close(); }
  };

  const MobileRecordCard = ({ record, index }: { record: UnifiedRecord; index: number }) => (
    <div className="p-4 border-b border-border last:border-b-0">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground bg-muted rounded-full w-6 h-6 flex items-center justify-center">{index + 1}</span>
          <span className="font-medium text-sm">{record.name}</span>
        </div>
        <span className={`font-bold text-sm font-mono ${record.recordKind === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
          {record.recordKind === 'expense' ? '-' : '+'}{formatCurrency(record.amount)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant={record.recordKind === 'income' ? 'default' : 'destructive'} className="text-xs">
          {record.recordKind === 'income' ? 'הכנסה' : 'הוצאה'}
        </Badge>
        <Badge variant="secondary" className="text-xs">{record.typeLabel}</Badge>
        {record.method !== '-' && <Badge variant="outline" className="text-xs">{record.method}</Badge>}
        <span className="text-muted-foreground">{formatDate(record.date)}</span>
      </div>
      {record.notes && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{record.notes}</p>}
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-up" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6" />
            דוח מפורט
          </h1>
          <div className="flex gap-2">
            <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-1 h-9 px-3">
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Excel</span>
            </Button>
            <Button onClick={handleExportPDF} variant="outline" size="sm" className="gap-1 h-9 px-3">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground text-xs sm:text-sm">הכנסות, הוצאות ותנועות תקציב</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">מתאריך</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} dir="ltr" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">עד תאריך</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} dir="ltr" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">סוג רשומה</Label>
              <Select value={recordTypeFilter} onValueChange={setRecordTypeFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RECORD_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">סוג תשלום</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 col-span-2 sm:col-span-4 pt-1">
              <Switch checked={groupByMember} onCheckedChange={setGroupByMember} id="group-toggle" />
              <Label htmlFor="group-toggle" className="text-xs flex items-center gap-1 cursor-pointer">
                <Users className="w-3.5 h-3.5" />
                קיבוץ לפי שם
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 sm:p-4 flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs text-muted-foreground">הכנסות</span>
            </div>
            <span className="text-sm sm:text-lg font-bold text-emerald-600">{isLoading ? '...' : formatCurrency(totalIncome)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 text-red-600">
              <TrendingDown className="w-4 h-4" />
              <span className="text-xs text-muted-foreground">הוצאות</span>
            </div>
            <span className="text-sm sm:text-lg font-bold text-red-600">{isLoading ? '...' : formatCurrency(totalExpenses)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground">יתרה</span>
            <span className={`text-sm sm:text-lg font-bold ${totalBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              {isLoading ? '...' : formatCurrency(totalBalance)}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 sm:h-10 w-full" />)}
            </div>
          ) : allRecords.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">אין רשומות בתקופה זו</div>
          ) : groupByMember && groupedData ? (
            <div>
              {groupedData.map((group) => (
                <div key={group.name} className="border-b border-border last:border-b-0">
                  <div className="px-4 py-3 bg-muted/40 flex items-center justify-between sticky top-0">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="font-bold text-sm">{group.name}</span>
                      <Badge variant="secondary" className="text-xs">{group.records.length}</Badge>
                    </div>
                    <div className="flex gap-3 text-xs font-bold">
                      {group.totalIncome > 0 && <span className="text-emerald-600">+{formatCurrency(group.totalIncome)}</span>}
                      {group.totalExpenses > 0 && <span className="text-red-600">-{formatCurrency(group.totalExpenses)}</span>}
                    </div>
                  </div>
                  <div className="sm:hidden">
                    {group.records.map((r, i) => <MobileRecordCard key={r.id} record={r} index={i} />)}
                  </div>
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">סוג</TableHead>
                          <TableHead className="text-right">קטגוריה</TableHead>
                          <TableHead className="text-right">אמצעי</TableHead>
                          <TableHead className="text-right">סכום</TableHead>
                          <TableHead className="text-right">תאריך</TableHead>
                          <TableHead className="text-right">הערות</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.records.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>
                              <Badge variant={r.recordKind === 'income' ? 'default' : 'destructive'} className="text-xs">
                                {r.recordKind === 'income' ? 'הכנסה' : 'הוצאה'}
                              </Badge>
                            </TableCell>
                            <TableCell>{r.typeLabel}</TableCell>
                            <TableCell>{r.method}</TableCell>
                            <TableCell className={`font-mono ${r.recordKind === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                              {formatCurrency(r.amount)}
                            </TableCell>
                            <TableCell>{formatDate(r.date)}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{r.notes || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
              <div className="p-4 bg-muted/50 flex items-center justify-between font-bold text-sm">
                <span>סה״כ ({allRecords.length} רשומות)</span>
                <span className={`font-mono ${totalBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(totalBalance)}</span>
              </div>
            </div>
          ) : (
            <>
              <div className="sm:hidden">
                {allRecords.map((r, i) => <MobileRecordCard key={r.id} record={r} index={i} />)}
                <div className="p-4 bg-muted/50 flex items-center justify-between font-bold text-sm">
                  <span>סה״כ ({allRecords.length} רשומות)</span>
                  <span className={`font-mono ${totalBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(totalBalance)}</span>
                </div>
              </div>
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">#</TableHead>
                      <TableHead className="text-right">שם</TableHead>
                      <TableHead className="text-right">סוג</TableHead>
                      <TableHead className="text-right">קטגוריה</TableHead>
                      <TableHead className="text-right">אמצעי</TableHead>
                      <TableHead className="text-right">סכום</TableHead>
                      <TableHead className="text-right">תאריך</TableHead>
                      <TableHead className="text-right">הערות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allRecords.map((r, i) => (
                      <TableRow key={r.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>
                          <Badge variant={r.recordKind === 'income' ? 'default' : 'destructive'} className="text-xs">
                            {r.recordKind === 'income' ? 'הכנסה' : 'הוצאה'}
                          </Badge>
                        </TableCell>
                        <TableCell>{r.typeLabel}</TableCell>
                        <TableCell>{r.method}</TableCell>
                        <TableCell className={`font-mono ${r.recordKind === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(r.amount)}
                        </TableCell>
                        <TableCell>{formatDate(r.date)}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{r.notes || '-'}</TableCell>
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
