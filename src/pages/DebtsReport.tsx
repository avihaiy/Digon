import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Download, Search, FileSpreadsheet, FileText } from 'lucide-react';
import { formatCurrency, formatShortDate } from '@/lib/hebrew-utils';
import { format } from 'date-fns';

interface DebtRow {
  id: string;
  member_name: string;
  description: string | null;
  amount: number;
  remaining_balance: number;
  charge_date: string;
}

export default function DebtsReport() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: debts, isLoading } = useQuery({
    queryKey: ['debts-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('member_charges')
        .select('id, member_id, description, amount, remaining_balance, charge_date, member:members(full_name)')
        .gt('remaining_balance', 0)
        .order('charge_date', { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        member_name: row.member?.full_name || 'לא ידוע',
        description: row.description,
        amount: Number(row.amount),
        remaining_balance: Number(row.remaining_balance),
        charge_date: row.charge_date,
      })) as DebtRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!debts) return [];
    if (!searchQuery.trim()) return debts;
    const q = searchQuery.trim().toLowerCase();
    return debts.filter(d =>
      d.member_name.toLowerCase().includes(q) ||
      (d.description || '').toLowerCase().includes(q)
    );
  }, [debts, searchQuery]);

  // Group by member for summary
  const memberSummary = useMemo(() => {
    const grouped: Record<string, { name: string; total: number; count: number }> = {};
    for (const d of filtered) {
      if (!grouped[d.member_name]) {
        grouped[d.member_name] = { name: d.member_name, total: 0, count: 0 };
      }
      grouped[d.member_name].total += d.remaining_balance;
      grouped[d.member_name].count += 1;
    }
    return Object.values(grouped).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const totalDebt = filtered.reduce((sum, d) => sum + d.remaining_balance, 0);

  const exportCSV = () => {
    if (!filtered.length) return;
    const bom = '\uFEFF';
    const header = 'שם חבר,תיאור,סכום חיוב,יתרה לתשלום,תאריך\n';
    const rows = filtered.map(d =>
      `"${d.member_name}","${d.description || ''}",${d.amount},${d.remaining_balance},"${d.charge_date}"`
    ).join('\n');
    const summary = `\n\n"סה״כ חובות",,,"${totalDebt}",""`;
    const blob = new Blob([bom + header + rows + summary], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `דוח_חובות_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <AlertCircle className="w-7 h-7 text-red-500" />
          דוח חובות מפורט
        </h1>
        <Button onClick={exportCSV} variant="outline" className="gap-2" disabled={!filtered.length}>
          <FileSpreadsheet className="w-4 h-4" />
          ייצוא Excel
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden border-red-500/30 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/20">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">סה״כ חובות</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 hebrew-number">{formatCurrency(totalDebt)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">חברים חייבים</p>
            <p className="text-2xl font-bold">{memberSummary.length}</p>
          </CardContent>
        </Card>
        <Card className="glass-card col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">חיובים פתוחים</p>
            <p className="text-2xl font-bold">{filtered.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="חיפוש לפי שם חבר..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Summary by Member */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">סיכום לפי חבר</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : memberSummary.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">אין חובות פתוחים 🎉</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">שם חבר</TableHead>
                    <TableHead className="text-right">מס׳ חיובים</TableHead>
                    <TableHead className="text-right">סה״כ חוב</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberSummary.map(m => (
                    <TableRow key={m.name}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{m.count}</TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="hebrew-number">{formatCurrency(m.total)}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell>סה״כ</TableCell>
                    <TableCell>{filtered.length}</TableCell>
                    <TableCell>
                      <span className="text-red-600 dark:text-red-400 hebrew-number">{formatCurrency(totalDebt)}</span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">פירוט חיובים</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-60 w-full" />
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">לא נמצאו חיובים</p>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">שם חבר</TableHead>
                      <TableHead className="text-right">תיאור</TableHead>
                      <TableHead className="text-right">סכום חיוב</TableHead>
                      <TableHead className="text-right">יתרה לתשלום</TableHead>
                      <TableHead className="text-right">תאריך</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(d => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.member_name}</TableCell>
                        <TableCell className="text-muted-foreground">{d.description || '-'}</TableCell>
                        <TableCell className="hebrew-number">{formatCurrency(d.amount)}</TableCell>
                        <TableCell>
                          <Badge variant="destructive" className="hebrew-number">{formatCurrency(d.remaining_balance)}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatShortDate(d.charge_date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filtered.map(d => (
                  <Card key={d.id} className="border">
                    <CardContent className="p-3 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">{d.member_name}</span>
                        <Badge variant="destructive" className="hebrew-number">{formatCurrency(d.remaining_balance)}</Badge>
                      </div>
                      {d.description && <p className="text-sm text-muted-foreground">{d.description}</p>}
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>חיוב מקורי: {formatCurrency(d.amount)}</span>
                        <span>{formatShortDate(d.charge_date)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
