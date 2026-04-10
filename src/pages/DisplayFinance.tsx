import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { formatCurrency, getHebrewDate, getHebrewDayOfWeek } from '@/lib/hebrew-utils';
import { format, startOfMonth, subMonths, endOfMonth } from 'date-fns';
import { he } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { useDisplayRotation } from '@/hooks/useDisplayRotation';

export default function DisplayFinance() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch financial data with auto-refresh every 5 minutes
  const { data: stats, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['display-finance-tv-stats'],
    queryFn: async () => {
      const now = new Date();
      const startOfCurrentMonth = startOfMonth(now);
      
      const [paymentsRes, expensesRes, budgetRes] = await Promise.all([
        supabase.from('payments').select('amount, created_at').eq('status', 'confirmed'),
        supabase.from('expenses').select('amount, expense_date'),
        supabase.from('budget_transactions').select('amount, transaction_date, type'),
      ]);

      // Calculate monthly data for the last 4 months
      const monthlyData = [];
      for (let i = 3; i >= 0; i--) {
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
          month: format(monthStart, 'MMMM', { locale: he }),
          year: format(monthStart, 'yyyy'),
          isCurrent: i === 0,
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

      return {
        thisMonthIncome,
        thisMonthExpenses,
        thisMonthBalance: thisMonthIncome - thisMonthExpenses,
        monthlyData,
      };
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  // Update lastUpdated when data changes
  useEffect(() => {
    if (dataUpdatedAt) {
      setLastUpdated(new Date(dataUpdatedAt));
    }
  }, [dataUpdatedAt]);

  const hebrewDate = getHebrewDate(currentTime);
  const dayOfWeek = getHebrewDayOfWeek(currentTime);
  const balance = stats?.thisMonthBalance || 0;

  // Status text and color based on balance
  const getStatusInfo = () => {
    if (balance > 0) {
      return { text: 'החודש בעודף', bgColor: 'bg-emerald-600/20', borderColor: 'border-emerald-500' };
    } else if (balance < 0) {
      return { text: 'החודש בגירעון', bgColor: 'bg-red-600/20', borderColor: 'border-red-500' };
    }
    return { text: 'החודש מאוזן', bgColor: 'bg-blue-600/20', borderColor: 'border-blue-500' };
  };

  const statusInfo = getStatusInfo();

  const { rotationStyle } = useDisplayRotation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden select-none" style={rotationStyle}>
      {/* Header */}
      <header className="px-12 py-8 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          {/* Title and Date */}
          <div>
            <h1 className="text-5xl font-bold tracking-tight mb-3">
              בית הכנסת – מצב כספי
            </h1>
            <div className="text-2xl text-slate-300 space-y-1">
              <p>{hebrewDate}</p>
              <p className="text-slate-400">
                יום {dayOfWeek} • {format(currentTime, 'd בMMMM yyyy', { locale: he })}
              </p>
            </div>
          </div>
          
          {/* Clock and Last Updated */}
          <div className="text-left">
            <div className="text-7xl font-bold font-mono tabular-nums tracking-tight">
              {format(currentTime, 'HH:mm')}
            </div>
            <p className="text-lg text-slate-500 mt-2">
              עודכן לאחרונה: {format(lastUpdated, 'HH:mm')}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-12 py-10 flex flex-col gap-10">
        
        {/* Big Numbers - 3 Cards */}
        <div className="grid grid-cols-3 gap-8">
          {/* Income Card */}
          <div className="bg-emerald-950/40 border-2 border-emerald-500/40 rounded-3xl p-10 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="w-12 h-12 text-emerald-400" strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-3xl text-emerald-300/80 mb-4 font-medium">הכנסות החודש</p>
            {isLoading ? (
              <div className="h-24 bg-emerald-800/20 rounded-xl animate-pulse" />
            ) : (
              <p className="text-7xl font-bold text-emerald-400 tracking-tight">
                {formatCurrency(stats?.thisMonthIncome || 0)}
              </p>
            )}
          </div>

          {/* Expenses Card */}
          <div className="bg-red-950/40 border-2 border-red-500/40 rounded-3xl p-10 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
                <TrendingDown className="w-12 h-12 text-red-400" strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-3xl text-red-300/80 mb-4 font-medium">הוצאות החודש</p>
            {isLoading ? (
              <div className="h-24 bg-red-800/20 rounded-xl animate-pulse" />
            ) : (
              <p className="text-7xl font-bold text-red-400 tracking-tight">
                {formatCurrency(stats?.thisMonthExpenses || 0)}
              </p>
            )}
          </div>

          {/* Balance Card */}
          <div className={`${balance >= 0 ? 'bg-blue-950/40 border-blue-500/40' : 'bg-orange-950/40 border-orange-500/40'} border-2 rounded-3xl p-10 text-center`}>
            <div className="flex justify-center mb-6">
              <div className={`w-20 h-20 rounded-full ${balance >= 0 ? 'bg-blue-500/20' : 'bg-orange-500/20'} flex items-center justify-center`}>
                <Wallet className={`w-12 h-12 ${balance >= 0 ? 'text-blue-400' : 'text-orange-400'}`} strokeWidth={2.5} />
              </div>
            </div>
            <p className={`text-3xl ${balance >= 0 ? 'text-blue-300/80' : 'text-orange-300/80'} mb-4 font-medium`}>
              יתרת החודש
            </p>
            {isLoading ? (
              <div className="h-24 bg-slate-800/20 rounded-xl animate-pulse" />
            ) : (
              <p className={`text-7xl font-bold ${balance >= 0 ? 'text-blue-400' : 'text-orange-400'} tracking-tight`}>
                {formatCurrency(balance)}
              </p>
            )}
          </div>
        </div>

        {/* Status Bar */}
        <div className={`${statusInfo.bgColor} border ${statusInfo.borderColor} rounded-2xl py-6 px-10`}>
          <p className="text-4xl font-bold text-center">
            {statusInfo.text}
          </p>
        </div>

        {/* Monthly History - Last 4 Months */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-3xl p-10">
          <h2 className="text-3xl font-bold text-center mb-8 text-slate-200">
            היסטוריה חודשית
          </h2>
          
          {isLoading ? (
            <div className="h-32 bg-slate-700/20 rounded-xl animate-pulse" />
          ) : (
            <div className="grid grid-cols-4 gap-6">
              {stats?.monthlyData?.map((month, index) => (
                <div 
                  key={index} 
                  className={`text-center p-6 rounded-2xl transition-all ${
                    month.isCurrent 
                      ? 'bg-slate-700/50 border-2 border-slate-500 scale-105' 
                      : 'bg-slate-800/40 border border-slate-700/30'
                  }`}
                >
                  <p className={`text-2xl font-semibold mb-4 ${month.isCurrent ? 'text-white' : 'text-slate-400'}`}>
                    {month.month}
                    {month.isCurrent && <span className="text-sm mr-2 text-slate-400">(נוכחי)</span>}
                  </p>
                  
                  <div className={`text-5xl font-bold ${
                    month.balance >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {formatCurrency(month.balance)}
                  </div>
                  
                  {/* Small color indicator */}
                  <div className={`mt-4 h-2 rounded-full mx-auto w-16 ${
                    month.balance >= 0 ? 'bg-emerald-500' : 'bg-red-500'
                  }`} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer - Static info only */}
      <footer className="absolute bottom-0 left-0 right-0 px-12 py-4 border-t border-slate-800/50">
        <p className="text-center text-slate-600 text-lg">
          מערכת ניהול גבאות • מתעדכן אוטומטית כל 5 דקות
        </p>
      </footer>
    </div>
  );
}
