import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, FileSpreadsheet, ClipboardList } from 'lucide-react';
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

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0 }).format(amount);

export default function DetailedReport() {
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(subMonths(today, 1)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), 'yyyy-MM-dd'));
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['detailed-report', startDate, endDate, typeFilter],
    queryFn: async () => {
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

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const totalAmount = useMemo(() => payments.reduce((sum, p) => sum + Number(p.amount), 0), [payments]);

  const handleExportCSV = () => {
    const headers = ['שם', 'סוג תשלום', 'אמצעי תשלום', 'סכום', 'תאריך', 'הערות'];
    const rows = payments.map(p => [
      (p as any).members?.full_name || '-',
      PAYMENT_TYPE_LABELS[p.payment_type] || p.payment_type,
      METHOD_LABELS[p.method] || p.method,
      p.amount,
      format(new Date(p.created_at!), 'dd/MM/yyyy'),
      p.notes || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      '',
      `"סה״כ","","","${totalAmount}","",""`,
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `דוח_מפורט_${startDate}_${endDate}.csv`;
    link.click();
  };

  const handleExportPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <title>דוח מפורט</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; direction: rtl; }
          h1 { text-align: center; margin-bottom: 5px; }
          .subtitle { text-align: center; color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: right; font-size: 13px; }
          th { background: #f0f0f0; font-weight: bold; }
          tr:nth-child(even) { background: #fafafa; }
          .total-row { font-weight: bold; background: #e8f5e9 !important; }
          .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #999; }
          @media print { 
            button { display: none; }
            body { padding: 10px; }
          }
        </style>
      </head>
      <body>
        <h1>ברית שלום - דוח מפורט</h1>
        <p class="subtitle">תקופה: ${format(parseISO(startDate), 'dd/MM/yyyy')} - ${format(parseISO(endDate), 'dd/MM/yyyy')}
        ${typeFilter !== 'all' ? ' | סוג: ' + (PAYMENT_TYPE_LABELS[typeFilter] || typeFilter) : ''}</p>
        
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>שם</th>
              <th>סוג תשלום</th>
              <th>אמצעי תשלום</th>
              <th>סכום</th>
              <th>תאריך</th>
              <th>הערות</th>
            </tr>
          </thead>
          <tbody>
            ${payments.map((p, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${(p as any).members?.full_name || '-'}</td>
                <td>${PAYMENT_TYPE_LABELS[p.payment_type] || p.payment_type}</td>
                <td>${METHOD_LABELS[p.method] || p.method}</td>
                <td>${formatCurrency(Number(p.amount))}</td>
                <td>${format(new Date(p.created_at!), 'dd/MM/yyyy')}</td>
                <td>${p.notes || '-'}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="4">סה"כ (${payments.length} רשומות)</td>
              <td>${formatCurrency(totalAmount)}</td>
              <td colspan="2"></td>
            </tr>
          </tbody>
        </table>
        
        <p class="footer">הופק בתאריך ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        <button onclick="window.print()" style="margin: 20px auto; display: block; padding: 10px 30px; cursor: pointer;">הדפס / שמור כ-PDF</button>
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
    <div className="space-y-6 animate-fade-up" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6" />
            דוח מפורט
          </h1>
          <p className="text-muted-foreground text-sm">רשימת תשלומים עם שמות וסכומים</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </Button>
          <Button onClick={handleExportPDF} variant="outline" size="sm" className="gap-2">
            <FileText className="w-4 h-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1">
              <Label>מתאריך</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} dir="ltr" />
            </div>
            <div className="space-y-2 flex-1">
              <Label>עד תאריך</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} dir="ltr" />
            </div>
            <div className="space-y-2 flex-1">
              <Label>סוג תשלום</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="flex items-center gap-4">
        <Card className="flex-1">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-muted-foreground">סה״כ</span>
            <span className="text-xl font-bold">{isLoading ? '...' : formatCurrency(totalAmount)}</span>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-muted-foreground">רשומות</span>
            <span className="text-xl font-bold">{isLoading ? '...' : payments.length}</span>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">אין תשלומים בתקופה זו</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">#</TableHead>
                    <TableHead className="text-right">שם</TableHead>
                    <TableHead className="text-right">סוג</TableHead>
                    <TableHead className="text-right">אמצעי</TableHead>
                    <TableHead className="text-right">סכום</TableHead>
                    <TableHead className="text-right">תאריך</TableHead>
                    <TableHead className="text-right">הערות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p, i) => (
                    <TableRow key={p.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{(p as any).members?.full_name || '-'}</TableCell>
                      <TableCell>{PAYMENT_TYPE_LABELS[p.payment_type] || p.payment_type}</TableCell>
                      <TableCell>{METHOD_LABELS[p.method] || p.method}</TableCell>
                      <TableCell className="font-mono">{formatCurrency(Number(p.amount))}</TableCell>
                      <TableCell>{format(new Date(p.created_at!), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{p.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
