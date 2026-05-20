import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowRight, Search, FileSpreadsheet, Scale, TrendingUp, TrendingDown, CalendarDays } from 'lucide-react';
import { formatCurrency, formatShortDate } from '@/lib/hebrew-utils';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

type FilterMode = 'all' | 'debt' | 'credit' | 'balanced';

function startOfWeekIso(d: Date) {
  // Sunday=0 ... Hebrew week typically Sun-Sat. Use Sunday as start.
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}
function endOfWeekIso(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - day + 6);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

interface Row {
  member_id: string;
  member_name: string;
  periodCharges: number;
  periodPayments: number;
  openDebt: number;
  creditBalance: number;
  net: number; // positive = debt, negative = credit
}

export default function WeeklyBalanceReport() {
  const navigate = useNavigate();
  const today = new Date();
  const [from, setFrom] = useState<string>(startOfWeekIso(today));
  const [to, setTo] = useState<string>(endOfWeekIso(today));
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['weekly-balance-report', from, to],
    queryFn: async () => {
      const fromTs = `${from}T00:00:00`;
      const toTs = `${to}T23:59:59`;

      const [membersRes, chargesPeriodRes, paymentsPeriodRes, openChargesRes, allConfirmedPaysRes, allChargePaysRes] = await Promise.all([
        supabase.from('members').select('id, full_name, active'),
        supabase.from('member_charges').select('member_id, amount').gte('charge_date', from).lte('charge_date', to),
        supabase.from('payments').select('member_id, amount, payment_type').eq('status', 'confirmed').gte('created_at', fromTs).lte('created_at', toTs),
        supabase.from('member_charges').select('member_id, remaining_balance').gt('remaining_balance', 0),
        supabase.from('payments').select('id, member_id, amount, payment_type').eq('status', 'confirmed'),
        supabase.from('charge_payments').select('payment_id, amount'),
      ]);

      const err = membersRes.error || chargesPeriodRes.error || paymentsPeriodRes.error || openChargesRes.error || allConfirmedPaysRes.error || allChargePaysRes.error;
      if (err) throw err;

      const members = (membersRes.data || []) as { id: string; full_name: string; active: boolean }[];
      const periodCharges = new Map<string, number>();
      (chargesPeriodRes.data || []).forEach((c: any) => {
        periodCharges.set(c.member_id, (periodCharges.get(c.member_id) || 0) + Number(c.amount || 0));
      });
      const periodPayments = new Map<string, number>();
      (paymentsPeriodRes.data || []).forEach((p: any) => {
        // include all payment types in "total received" for the period
        periodPayments.set(p.member_id, (periodPayments.get(p.member_id) || 0) + Number(p.amount || 0));
      });
      const openDebt = new Map<string, number>();
      (openChargesRes.data || []).forEach((c: any) => {
        openDebt.set(c.member_id, (openDebt.get(c.member_id) || 0) + Number(c.remaining_balance || 0));
      });

      // Credit balance per member: sum(non-hall confirmed payments) - sum(charge_payments from those payments)
      const allocatedByPayment = new Map<string, number>();
      (allChargePaysRes.data || []).forEach((cp: any) => {
        allocatedByPayment.set(cp.payment_id, (allocatedByPayment.get(cp.payment_id) || 0) + Number(cp.amount || 0));
      });
      const creditByMember = new Map<string, number>();
      (allConfirmedPaysRes.data || []).forEach((p: any) => {
        if ((p.payment_type || '') === 'hall') return;
        const allocated = allocatedByPayment.get(p.id) || 0;
        const left = Math.max(0, Number(p.amount || 0) - allocated);
        if (left > 0) {
          creditByMember.set(p.member_id, (creditByMember.get(p.member_id) || 0) + left);
        }
      });

      const rows: Row[] = members.map((m) => {
        const debt = openDebt.get(m.id) || 0;
        const credit = creditByMember.get(m.id) || 0;
        return {
          member_id: m.id,
          member_name: m.full_name,
          periodCharges: periodCharges.get(m.id) || 0,
          periodPayments: periodPayments.get(m.id) || 0,
          openDebt: debt,
          creditBalance: credit,
          net: debt - credit,
        };
      });

      return rows;
    },
  });

  const filtered = useMemo(() => {
    let rows = data || [];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(r => r.member_name.toLowerCase().includes(q));
    }
    if (filter === 'debt') rows = rows.filter(r => r.net > 0);
    else if (filter === 'credit') rows = rows.filter(r => r.creditBalance > 0 && r.openDebt === 0);
    else if (filter === 'balanced') rows = rows.filter(r => r.openDebt === 0 && r.creditBalance === 0);
    else rows = rows.filter(r => r.openDebt > 0 || r.creditBalance > 0 || r.periodCharges > 0 || r.periodPayments > 0);
    return rows.sort((a, b) => b.net - a.net || b.creditBalance - a.creditBalance || a.member_name.localeCompare(b.member_name, 'he'));
  }, [data, search, filter]);

  const totals = useMemo(() => {
    const rows = data || [];
    return {
      members: rows.length,
      debtors: rows.filter(r => r.net > 0).length,
      creditors: rows.filter(r => r.creditBalance > 0 && r.openDebt === 0).length,
      totalOpenDebt: rows.reduce((s, r) => s + r.openDebt, 0),
      totalCredit: rows.reduce((s, r) => s + r.creditBalance, 0),
      totalPeriodCharges: rows.reduce((s, r) => s + r.periodCharges, 0),
      totalPeriodPayments: rows.reduce((s, r) => s + r.periodPayments, 0),
    };
  }, [data]);

  const setThisWeek = () => {
    const t = new Date();
    setFrom(startOfWeekIso(t));
    setTo(endOfWeekIso(t));
  };
  const setLastWeek = () => {
    const t = new Date();
    t.setDate(t.getDate() - 7);
    setFrom(startOfWeekIso(t));
    setTo(endOfWeekIso(t));
  };
  const setThisMonth = () => {
    const t = new Date();
    const first = new Date(t.getFullYear(), t.getMonth(), 1);
    const last = new Date(t.getFullYear(), t.getMonth() + 1, 0);
    setFrom(first.toISOString().slice(0, 10));
    setTo(last.toISOString().slice(0, 10));
  };

  const exportExcel = () => {
    if (!filtered.length) {
      toast.error('אין נתונים לייצוא');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(filtered.map(r => ({
      'שם חבר': r.member_name,
      'חיובים בתקופה': r.periodCharges,
      'תשלומים בתקופה': r.periodPayments,
      'חוב פתוח': r.openDebt,
      'יתרת זכות': r.creditBalance,
      'מאזן נטו': r.net,
      'סטטוס': r.net > 0 ? 'חוב' : r.creditBalance > 0 ? 'זכות' : 'מאוזן',
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'מאזן');
    XLSX.writeFile(wb, `weekly-balance-${from}_${to}.xlsx`);
  };

  return (
    <div className="space-y-4 animate-fade-up p-4 max-w-7xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="w-6 h-6" />
            דוח מאזני חברים
          </h1>
          <p className="text-sm text-muted-foreground">מי בחוב, מי בזכות, וסיכום פעילות לתקופה</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowRight className="w-4 h-4" />
            חזור
          </Button>
          <Button onClick={exportExcel} variant="outline" className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            ייצוא לאקסל
          </Button>
        </div>
      </div>

      {/* Date range */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">מתאריך</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">עד תאריך</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" />
            </div>
            <div className="flex gap-1 mr-auto">
              <Button size="sm" variant="outline" onClick={setThisWeek}>השבוע</Button>
              <Button size="sm" variant="outline" onClick={setLastWeek}>שבוע שעבר</Button>
              <Button size="sm" variant="outline" onClick={setThisMonth}>החודש</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">סה״כ חובות פתוחים</p>
            <p className="text-xl font-black text-destructive">{formatCurrency(totals.totalOpenDebt)}</p>
            <p className="text-[11px] text-muted-foreground">{totals.debtors} חברים</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-emerald-700 dark:text-emerald-400">סה״כ יתרות זכות</p>
            <p className="text-xl font-black text-emerald-600">{formatCurrency(totals.totalCredit)}</p>
            <p className="text-[11px] text-muted-foreground">{totals.creditors} חברים</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">חיובים בתקופה</p>
            <p className="text-xl font-black">{formatCurrency(totals.totalPeriodCharges)}</p>
            <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1"><TrendingUp className="w-3 h-3" />חיובים חדשים</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">תשלומים בתקופה</p>
            <p className="text-xl font-black text-green-600">{formatCurrency(totals.totalPeriodPayments)}</p>
            <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1"><TrendingDown className="w-3 h-3" />הכנסות</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="חיפוש לפי שם חבר..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {([
            { k: 'all', l: 'הכל' },
            { k: 'debt', l: 'בחוב' },
            { k: 'credit', l: 'בזכות' },
            { k: 'balanced', l: 'מאוזן' },
          ] as { k: FilterMode; l: string }[]).map(f => (
            <Button key={f.k} size="sm" variant={filter === f.k ? 'default' : 'outline'} onClick={() => setFilter(f.k)}>
              {f.l}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">אין נתונים להצגה לטווח/סינון הנבחרים</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">חבר</TableHead>
                  <TableHead className="text-right">חיובים בתקופה</TableHead>
                  <TableHead className="text-right">תשלומים בתקופה</TableHead>
                  <TableHead className="text-right">חוב פתוח</TableHead>
                  <TableHead className="text-right">יתרת זכות</TableHead>
                  <TableHead className="text-right">מאזן נטו</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.member_id} className="hover:bg-muted/40">
                    <TableCell className="font-medium">{r.member_name}</TableCell>
                    <TableCell>{r.periodCharges > 0 ? formatCurrency(r.periodCharges) : '—'}</TableCell>
                    <TableCell className="text-green-600">{r.periodPayments > 0 ? formatCurrency(r.periodPayments) : '—'}</TableCell>
                    <TableCell className="text-destructive">{r.openDebt > 0 ? formatCurrency(r.openDebt) : '—'}</TableCell>
                    <TableCell className="text-emerald-600">{r.creditBalance > 0 ? formatCurrency(r.creditBalance) : '—'}</TableCell>
                    <TableCell className={`font-bold ${r.net > 0 ? 'text-destructive' : r.creditBalance > 0 ? 'text-emerald-600' : ''}`}>
                      {r.net > 0 ? formatCurrency(r.net) : r.creditBalance > 0 ? `-${formatCurrency(r.creditBalance)}` : formatCurrency(0)}
                    </TableCell>
                    <TableCell>
                      {r.net > 0 ? (
                        <Badge variant="destructive">חוב</Badge>
                      ) : r.creditBalance > 0 ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-700">זכות</Badge>
                      ) : (
                        <Badge variant="secondary">מאוזן</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        טווח התאריכים משפיע על "חיובים בתקופה" ו-"תשלומים בתקופה" בלבד. החוב הפתוח ויתרת הזכות תמיד מוצגים נכון להיום (תשלומי אולם לא נכללים בחישוב יתרת הזכות).
      </p>
    </div>
  );
}
