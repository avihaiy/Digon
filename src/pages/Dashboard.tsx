import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import {
  Users,
  CreditCard,
  Receipt,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ArrowLeft,
  Wallet,
  PieChart,
  Monitor,
} from 'lucide-react';
import { formatCurrency, getNextShabbat, formatDate, getCurrentParasha, getHebrewDate } from '@/lib/hebrew-utils';
import { format, startOfMonth, subMonths, endOfMonth } from 'date-fns';
import { he } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const nextShabbat = getNextShabbat();
  const parasha = getCurrentParasha();

  // Fetch stats including income and expenses
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const [membersRes, paymentsRes, receiptsRes, expensesRes, budgetExpensesRes] = await Promise.all([
        supabase.from('members').select('id', { count: 'exact' }).eq('active', true),
        supabase.from('payments').select('id, amount, status, created_at').eq('status', 'confirmed'),
        supabase.from('receipts').select('id, total_amount'),
        supabase.from('expenses').select('amount, expense_date'),
        supabase.from('budget_transactions').select('amount, transaction_date, type'),
      ]);

      const totalPayments = paymentsRes.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      
      // This month calculations
      const thisMonthPayments = paymentsRes.data?.filter(p => new Date(p.created_at) >= startOfMonth)
        .reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const thisMonthBudgetIncome = budgetExpensesRes.data?.filter(b => b.type === 'income' && new Date(b.transaction_date) >= startOfMonth)
        .reduce((sum, b) => sum + Number(b.amount), 0) || 0;
      const thisMonthIncome = thisMonthPayments + thisMonthBudgetIncome;
      
      // Total expenses
      const totalExpensesModule = expensesRes.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const totalExpensesBudget = budgetExpensesRes.data?.filter(b => b.type === 'expense')
        .reduce((sum, b) => sum + Number(b.amount), 0) || 0;
      const totalExpenses = totalExpensesModule + totalExpensesBudget;
      
      // This month expenses
      const thisMonthExpensesModule = expensesRes.data?.filter(e => new Date(e.expense_date) >= startOfMonth)
        .reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const thisMonthExpensesBudget = budgetExpensesRes.data?.filter(b => b.type === 'expense' && new Date(b.transaction_date) >= startOfMonth)
        .reduce((sum, b) => sum + Number(b.amount), 0) || 0;
      const thisMonthExpenses = thisMonthExpensesModule + thisMonthExpensesBudget;

      return {
        totalMembers: membersRes.count || 0,
        totalPayments,
        totalReceipts: receiptsRes.data?.length || 0,
        thisMonthIncome,
        thisMonthExpenses,
        totalExpenses,
        balance: totalPayments - totalExpenses,
      };
    },
  });

  // Fetch monthly history for chart
  const { data: monthlyHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['monthly-history'],
    queryFn: async () => {
      const now = new Date();
      const [paymentsRes, expensesRes, budgetRes] = await Promise.all([
        supabase.from('payments').select('amount, created_at').eq('status', 'confirmed'),
        supabase.from('expenses').select('amount, expense_date'),
        supabase.from('budget_transactions').select('amount, transaction_date, type'),
      ]);

      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(subMonths(now, i));
        
        const monthIncome = (paymentsRes.data?.filter(p => {
          const d = new Date(p.created_at);
          return d >= monthStart && d <= monthEnd;
        }).reduce((sum, p) => sum + Number(p.amount), 0) || 0) +
        (budgetRes.data?.filter(b => b.type === 'income' && (() => {
          const d = new Date(b.transaction_date);
          return d >= monthStart && d <= monthEnd;
        })()).reduce((sum, b) => sum + Number(b.amount), 0) || 0);
        
        const monthExpenses = (expensesRes.data?.filter(e => {
          const d = new Date(e.expense_date);
          return d >= monthStart && d <= monthEnd;
        }).reduce((sum, e) => sum + Number(e.amount), 0) || 0) +
        (budgetRes.data?.filter(b => b.type === 'expense' && (() => {
          const d = new Date(b.transaction_date);
          return d >= monthStart && d <= monthEnd;
        })()).reduce((sum, b) => sum + Number(b.amount), 0) || 0);

        monthlyData.push({
          month: format(monthStart, 'MMM', { locale: he }),
          הכנסות: monthIncome,
          הוצאות: monthExpenses,
        });
      }

      return monthlyData;
    },
  });

  // Fetch outstanding member debts
  const { data: totalDebts, isLoading: debtsLoading } = useQuery({
    queryKey: ['dashboard-debts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('member_charges')
        .select('remaining_balance')
        .gt('remaining_balance', 0);
      if (error) throw error;
      return data?.reduce((sum, r) => sum + Number(r.remaining_balance), 0) || 0;
    },
  });

  const [debtsDialogOpen, setDebtsDialogOpen] = useState(false);

  // Fetch detailed debts grouped by member
  const { data: memberDebts } = useQuery({
    queryKey: ['dashboard-debts-detail'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('member_charges')
        .select('id, member_id, description, amount, remaining_balance, charge_date, member:members(full_name)')
        .gt('remaining_balance', 0)
        .order('charge_date', { ascending: false });
      if (error) throw error;

      const grouped: Record<string, { full_name: string; total: number; charges: { description: string | null; amount: number }[] }> = {};
      for (const row of data || []) {
        const name = (row.member as any)?.full_name || 'לא ידוע';
        const mid = row.member_id;
        if (!grouped[mid]) grouped[mid] = { full_name: name, total: 0, charges: [] };
        grouped[mid].total += Number(row.remaining_balance);
        grouped[mid].charges.push({ description: row.description, amount: Number(row.remaining_balance) });
      }
      return Object.values(grouped).sort((a, b) => b.total - a.total);
    },
    enabled: debtsDialogOpen,
  });

  // Realtime: auto-refresh debts
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-debts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'member_charges' }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-debts'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: recentPayments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['recent-payments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select(`
          *,
          member:members(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const quickActions = [
    { label: 'הוסף חבר', icon: Users, href: '/members?action=add', variant: 'secondary' as const },
    { label: 'קבל תשלום', icon: CreditCard, href: '/payments?action=add', variant: 'secondary' as const },
    { label: 'דו"ח כספי', icon: PieChart, href: '/expense-reports', variant: 'primary' as const },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">לוח בקרה</h1>
          <p className="text-muted-foreground">
            שבת פרשת {parasha} • {formatDate(nextShabbat)} • {getHebrewDate(nextShabbat)}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 w-full md:w-auto md:flex">
          <Link to="/payments?action=add" className="col-span-1">
            <Button className="gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              <CreditCard className="w-4 h-4" />
              <span>קבל תשלום</span>
            </Button>
          </Link>
          <Link to="/budget" className="col-span-1">
            <Button variant="destructive" className="gap-1 w-full text-xs md:text-sm px-2">
              <Wallet className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">הוצאות</span>
            </Button>
          </Link>
          <Link to="/members" className="col-span-1">
            <Button className="gap-2 w-full bg-orange-600 hover:bg-orange-700 text-white">
              <Users className="w-4 h-4" />
              <span>חברים</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="glass-card border-emerald-500/20 hover-lift animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardContent className="p-4">
            {statsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">הכנסות החודש</p>
                  <p className="text-xl font-bold text-emerald-600">{formatCurrency(stats?.thisMonthIncome || 0)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card border-red-500/20 hover-lift animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <CardContent className="p-4">
            {statsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">הוצאות החודש</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(stats?.thisMonthExpenses || 0)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={`glass-card hover-lift animate-fade-in ${(stats?.balance || 0) >= 0 ? 'border-blue-500/20' : 'border-orange-500/20'}`} style={{ animationDelay: '0.2s' }}>
          <CardContent className="p-4">
            {statsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${(stats?.balance || 0) >= 0 ? 'bg-blue-500/10' : 'bg-orange-500/10'}`}>
                  <Wallet className={`w-6 h-6 ${(stats?.balance || 0) >= 0 ? 'text-blue-500' : 'text-orange-500'}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">יתרה כוללת</p>
                  <p className={`text-xl font-bold ${(stats?.balance || 0) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {formatCurrency(stats?.balance || 0)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card hover-lift animate-fade-in" style={{ animationDelay: '0.25s' }}>
          <CardContent className="p-4">
            {statsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">קבלות הונפקו</p>
                  <p className="text-xl font-bold">{stats?.totalReceipts || 0}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Link to="/payments">
          <Card className="relative overflow-hidden border-red-500/30 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/20 hover-lift animate-fade-in cursor-pointer shadow-md hover:shadow-lg transition-all" style={{ animationDelay: '0.3s' }}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/5 rounded-full -translate-y-6 translate-x-6" />
            <CardContent className="p-4">
              {debtsLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center ring-2 ring-red-500/20">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">חובות שטרם נגבו</p>
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalDebts || 0)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Income vs Expenses Mini Chart */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">הכנסות מול הוצאות החודש</CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="space-y-4">
              {/* Income Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                    <span className="font-medium">הכנסות</span>
                  </div>
                  <span className="font-bold text-emerald-600">{formatCurrency(stats?.thisMonthIncome || 0)}</span>
                </div>
                <div className="h-6 bg-secondary rounded-md overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-md transition-all duration-500"
                    style={{ 
                      width: `${Math.min(100, ((stats?.thisMonthIncome || 0) / Math.max(stats?.thisMonthIncome || 1, stats?.thisMonthExpenses || 1)) * 100)}%` 
                    }}
                  />
                </div>
              </div>

              {/* Expenses Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-red-500" />
                    <span className="font-medium">הוצאות</span>
                  </div>
                  <span className="font-bold text-red-600">{formatCurrency(stats?.thisMonthExpenses || 0)}</span>
                </div>
                <div className="h-6 bg-secondary rounded-md overflow-hidden">
                  <div 
                    className="h-full bg-red-500 rounded-md transition-all duration-500"
                    style={{ 
                      width: `${Math.min(100, ((stats?.thisMonthExpenses || 0) / Math.max(stats?.thisMonthIncome || 1, stats?.thisMonthExpenses || 1)) * 100)}%` 
                    }}
                  />
                </div>
              </div>

              {/* Balance Summary */}
              <div className="pt-2 border-t flex justify-between items-center">
                <span className="text-muted-foreground">יתרה החודש:</span>
                <span className={`text-lg font-bold ${(stats?.thisMonthIncome || 0) - (stats?.thisMonthExpenses || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency((stats?.thisMonthIncome || 0) - (stats?.thisMonthExpenses || 0))}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly History Chart */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">היסטוריית הכנסות והוצאות (6 חודשים)</CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="הכנסות" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="הוצאות" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <StatsCard
          title="חברים פעילים"
          value={stats?.totalMembers || 0}
          icon={Users}
          loading={statsLoading}
        />
        <StatsCard
          title="סה״כ הכנסות"
          value={formatCurrency(stats?.totalPayments || 0)}
          icon={TrendingUp}
          loading={statsLoading}
          isAmount
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Link key={action.href} to={action.href}>
            <div className="quick-action group">
              <div className={`w-12 h-12 rounded-xl mb-3 flex items-center justify-center ${
                action.variant === 'primary' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors'
              }`}>
                <action.icon className="w-6 h-6" />
              </div>
              <p className="font-medium">{action.label}</p>
            </div>
          </Link>
        ))}
      </div>


      {/* Recent Activity */}
      <div className="grid gap-6">
        {/* Recent Payments */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-semibold">תשלומים אחרונים</CardTitle>
            <Link to="/payments">
              <Button variant="ghost" size="sm">
                הצג הכל
                <ArrowLeft className="w-4 h-4 mr-1 flip-icon" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentPayments?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>אין תשלומים אחרונים</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPayments?.map((payment: any) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 table-row-hover"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        payment.method === 'bit' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'
                      }`}>
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <span className="font-medium">
                        {payment.member?.full_name}
                      </span>
                    </div>
                    <span className="font-bold hebrew-number">
                      {formatCurrency(Number(payment.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Stats Card Component
function StatsCard({
  title,
  value,
  icon: Icon,
  loading,
  alert,
  isAmount,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  loading: boolean;
  alert?: number;
  isAmount?: boolean;
}) {
  return (
    <Card className="glass-card relative overflow-hidden">
      <CardContent className="p-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10`}>
                <Icon className="w-5 h-5 text-primary" />
              </div>
              {alert !== undefined && alert > 0 && (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="w-3 h-3 ml-1" />
                  {alert} ממתינים
                </Badge>
              )}
            </div>
            <p className={`text-2xl font-bold ${isAmount ? 'hebrew-number' : ''}`}>
              {value}
            </p>
            <p className="text-sm text-muted-foreground">{title}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
