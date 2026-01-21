import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Wallet, Calendar } from 'lucide-react';
import { formatCurrency, getHebrewDate, getCurrentParasha } from '@/lib/hebrew-utils';
import { format, startOfMonth, subMonths, endOfMonth } from 'date-fns';
import { he } from 'date-fns/locale';
import { useEffect, useState } from 'react';

export default function DisplayFinance() {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch financial data
  const { data: stats, isLoading } = useQuery({
    queryKey: ['display-finance-stats'],
    queryFn: async () => {
      const now = new Date();
      const startOfCurrentMonth = startOfMonth(now);
      
      // Fetch all data
      const [paymentsRes, expensesRes, budgetRes] = await Promise.all([
        supabase.from('payments').select('amount, created_at').eq('status', 'confirmed'),
        supabase.from('expenses').select('amount, expense_date'),
        supabase.from('budget_transactions').select('amount, transaction_date, type'),
      ]);

      // Calculate monthly data for the last 6 months
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
          month: format(monthStart, 'MMMM yyyy', { locale: he }),
          income: monthIncome,
          expenses: monthExpenses,
          balance: monthIncome - monthExpenses,
        });
      }

      // Current month totals
      const thisMonthIncome = (paymentsRes.data?.filter(p => new Date(p.created_at) >= startOfCurrentMonth)
        .reduce((sum, p) => sum + Number(p.amount), 0) || 0) +
        (budgetRes.data?.filter(b => b.type === 'income' && new Date(b.transaction_date) >= startOfCurrentMonth)
        .reduce((sum, b) => sum + Number(b.amount), 0) || 0);

      const thisMonthExpenses = (expensesRes.data?.filter(e => new Date(e.expense_date) >= startOfCurrentMonth)
        .reduce((sum, e) => sum + Number(e.amount), 0) || 0) +
        (budgetRes.data?.filter(b => b.type === 'expense' && new Date(b.transaction_date) >= startOfCurrentMonth)
        .reduce((sum, b) => sum + Number(b.amount), 0) || 0);

      // Total balance
      const totalIncome = paymentsRes.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const totalBudgetIncome = budgetRes.data?.filter(b => b.type === 'income').reduce((sum, b) => sum + Number(b.amount), 0) || 0;
      const totalExpenses = (expensesRes.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0) +
        (budgetRes.data?.filter(b => b.type === 'expense').reduce((sum, b) => sum + Number(b.amount), 0) || 0);

      return {
        thisMonthIncome,
        thisMonthExpenses,
        thisMonthBalance: thisMonthIncome - thisMonthExpenses,
        totalBalance: totalIncome + totalBudgetIncome - totalExpenses,
        monthlyData,
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const parasha = getCurrentParasha();
  const hebrewDate = getHebrewDate(currentTime);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">בית הכנסת - מצב כספי</h1>
        <p className="text-xl text-slate-300">
          פרשת {parasha} • {hebrewDate}
        </p>
        <p className="text-lg text-slate-400 mt-1">
          {format(currentTime, 'EEEE, d בMMMM yyyy', { locale: he })}
        </p>
      </div>

      {/* Current Month Stats */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <Card className="bg-emerald-900/30 border-emerald-500/30">
          <CardContent className="p-6 text-center">
            {isLoading ? (
              <Skeleton className="h-24 w-full bg-emerald-800/30" />
            ) : (
              <>
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-emerald-400" />
                <p className="text-slate-300 mb-2">הכנסות החודש</p>
                <p className="text-4xl font-bold text-emerald-400">
                  {formatCurrency(stats?.thisMonthIncome || 0)}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-red-900/30 border-red-500/30">
          <CardContent className="p-6 text-center">
            {isLoading ? (
              <Skeleton className="h-24 w-full bg-red-800/30" />
            ) : (
              <>
                <TrendingDown className="w-12 h-12 mx-auto mb-4 text-red-400" />
                <p className="text-slate-300 mb-2">הוצאות החודש</p>
                <p className="text-4xl font-bold text-red-400">
                  {formatCurrency(stats?.thisMonthExpenses || 0)}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={`${(stats?.thisMonthBalance || 0) >= 0 ? 'bg-blue-900/30 border-blue-500/30' : 'bg-orange-900/30 border-orange-500/30'}`}>
          <CardContent className="p-6 text-center">
            {isLoading ? (
              <Skeleton className="h-24 w-full bg-blue-800/30" />
            ) : (
              <>
                <Wallet className="w-12 h-12 mx-auto mb-4 text-blue-400" />
                <p className="text-slate-300 mb-2">יתרה החודש</p>
                <p className={`text-4xl font-bold ${(stats?.thisMonthBalance || 0) >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                  {formatCurrency(stats?.thisMonthBalance || 0)}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Total Balance */}
      <Card className="bg-slate-800/50 border-slate-600/30 mb-8">
        <CardContent className="p-6 text-center">
          {isLoading ? (
            <Skeleton className="h-16 w-full bg-slate-700/30" />
          ) : (
            <>
              <p className="text-xl text-slate-300 mb-2">יתרה כוללת</p>
              <p className={`text-5xl font-bold ${(stats?.totalBalance || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(stats?.totalBalance || 0)}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Monthly History */}
      <Card className="bg-slate-800/50 border-slate-600/30">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold text-center mb-6 flex items-center justify-center gap-2">
            <Calendar className="w-6 h-6" />
            היסטוריה חודשית
          </h2>
          
          {isLoading ? (
            <Skeleton className="h-64 w-full bg-slate-700/30" />
          ) : (
            <div className="grid grid-cols-6 gap-4">
              {stats?.monthlyData?.map((month, index) => (
                <div key={index} className="text-center p-4 rounded-lg bg-slate-700/30">
                  <p className="text-sm text-slate-400 mb-3">{month.month}</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-emerald-400">+</span>
                      <span className="text-emerald-400">{formatCurrency(month.income)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-red-400">-</span>
                      <span className="text-red-400">{formatCurrency(month.expenses)}</span>
                    </div>
                    <div className="border-t border-slate-600 pt-2">
                      <span className={`font-bold ${month.balance >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                        {formatCurrency(month.balance)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-center text-slate-500 mt-8 text-sm">
        מתעדכן אוטומטית • עדכון אחרון: {format(currentTime, 'HH:mm', { locale: he })}
      </p>
    </div>
  );
}
