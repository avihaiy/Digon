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
import { FileText, FileSpreadsheet, ClipboardList, Users } from 'lucide-react';
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
  const [groupByMember, setGroupByMember] = useState(false);

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

  // Grouped data by member (always computed for export)
  const groupedData = useMemo(() => {
    const groups: Record<string, { name: string; payments: typeof payments; total: number }> = {};
    payments.forEach(p => {
      const name = (p as any).members?.full_name || 'לא ידוע';
      if (!groups[name]) groups[name] = { name, payments: [], total: 0 };
      groups[name].payments.push(p);
      groups[name].total += Number(p.amount);
    });
    return Object.values(groups).sort((a, b) => b.total - a.total);
  }, [payments]);

  const handleExportCSV = () => {
    let csvContent: string;

    if (groupByMember) {
      const headers = ['שם חבר', 'סוג תשלום', 'אמצעי תשלום', 'סכום', 'תאריך', 'הערות'];
      const lines = [headers.join(',')];
      groupedData.forEach(group => {
        group.payments.forEach(p => {
          lines.push([
            group.name,
            PAYMENT_TYPE_LABELS[p.payment_type] || p.payment_type,
            METHOD_LABELS[p.method] || p.method,
            p.amount,
            format(new Date(p.created_at!), 'dd/MM/yyyy'),
            p.notes || '',
          ].map(cell => `"${cell}"`).join(','));
        });
        lines.push(`"סה״כ ${group.name}","","","${group.total}","",""`);
        lines.push('');
      });
      lines.push(`"סה״כ כללי","","","${totalAmount}","",""`);
      csvContent = lines.join('\n');
    } else {
      const headers = ['שם', 'סוג תשלום', 'אמצעי תשלום', 'סכום', 'תאריך', 'הערות'];
      const rows = payments.map(p => [
        (p as any).members?.full_name || '-',
        PAYMENT_TYPE_LABELS[p.payment_type] || p.payment_type,
        METHOD_LABELS[p.method] || p.method,
        p.amount,
        format(new Date(p.created_at!), 'dd/MM/yyyy'),
        p.notes || '',
      ]);
      csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
        '',
        `"סה״כ","","","${totalAmount}","",""`,
      ].join('\n');
    }

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `דוח_מפורט_${groupByMember ? 'מקובץ_' : ''}${startDate}_${endDate}.csv`;
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

  // Mobile card view for each payment
  const MobilePaymentCard = ({ payment, index }: { payment: any; index: number }) => (
    <div className="p-4 border-b border-border last:border-b-0">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground bg-muted rounded-full w-6 h-6 flex items-center justify-center">{index + 1}</span>
          <span className="font-medium text-sm">{payment.members?.full_name || '-'}</span>
        </div>
        <span className="font-bold text-sm font-mono">{formatCurrency(Number(payment.amount))}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="secondary" className="text-xs">
          {PAYMENT_TYPE_LABELS[payment.payment_type] || payment.payment_type}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {METHOD_LABELS[payment.method] || payment.method}
        </Badge>
        <span className="text-muted-foreground">
          {format(new Date(payment.created_at!), 'dd/MM/yyyy')}
        </span>
      </div>
      {payment.notes && (
        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{payment.notes}</p>
      )}
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
        <p className="text-muted-foreground text-xs sm:text-sm">רשימת תשלומים עם שמות וסכומים</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">מתאריך</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} dir="ltr" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">עד תאריך</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} dir="ltr" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
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
            {/* Group by member toggle */}
            <div className="flex items-center gap-2 col-span-2 sm:col-span-3 pt-1">
              <Switch checked={groupByMember} onCheckedChange={setGroupByMember} id="group-toggle" />
              <Label htmlFor="group-toggle" className="text-xs flex items-center gap-1 cursor-pointer">
                <Users className="w-3.5 h-3.5" />
                קיבוץ לפי חבר
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center justify-between">
            <span className="text-muted-foreground text-xs sm:text-sm">סה״כ</span>
            <span className="text-base sm:text-xl font-bold">{isLoading ? '...' : formatCurrency(totalAmount)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center justify-between">
            <span className="text-muted-foreground text-xs sm:text-sm">רשומות</span>
            <span className="text-base sm:text-xl font-bold">{isLoading ? '...' : payments.length}</span>
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
          ) : payments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">אין תשלומים בתקופה זו</div>
          ) : groupByMember && groupedData ? (
            /* Grouped by member view */
            <div>
              {groupedData.map((group) => (
                <div key={group.name} className="border-b border-border last:border-b-0">
                  {/* Group header */}
                  <div className="px-4 py-3 bg-muted/40 flex items-center justify-between sticky top-0">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="font-bold text-sm">{group.name}</span>
                      <Badge variant="secondary" className="text-xs">{group.payments.length} תשלומים</Badge>
                    </div>
                    <span className="font-bold text-sm font-mono">{formatCurrency(group.total)}</span>
                  </div>
                  {/* Group items - mobile */}
                  <div className="sm:hidden">
                    {group.payments.map((p, i) => (
                      <MobilePaymentCard key={p.id} payment={p} index={i} />
                    ))}
                  </div>
                  {/* Group items - desktop */}
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">סוג</TableHead>
                          <TableHead className="text-right">אמצעי</TableHead>
                          <TableHead className="text-right">סכום</TableHead>
                          <TableHead className="text-right">תאריך</TableHead>
                          <TableHead className="text-right">הערות</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.payments.map((p) => (
                          <TableRow key={p.id}>
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
                </div>
              ))}
              {/* Grand total */}
              <div className="p-4 bg-muted/50 flex items-center justify-between font-bold text-sm">
                <span>סה״כ כללי ({groupedData.length} חברים, {payments.length} רשומות)</span>
                <span className="font-mono">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          ) : (
            /* Flat list view */
            <>
              {/* Mobile */}
              <div className="sm:hidden">
                {payments.map((p, i) => (
                  <MobilePaymentCard key={p.id} payment={p} index={i} />
                ))}
                <div className="p-4 bg-muted/50 flex items-center justify-between font-bold text-sm">
                  <span>סה״כ ({payments.length} רשומות)</span>
                  <span className="font-mono">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
              {/* Desktop */}
              <div className="hidden sm:block overflow-x-auto">
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
