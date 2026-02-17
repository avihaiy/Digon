import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/hebrew-utils';
import { format, startOfMonth, subMonths, endOfMonth } from 'date-fns';
import { he } from 'date-fns/locale';

interface FinanceDisplaySlideProps {
  textClass?: string;
  accentClass?: string;
}

export default function FinanceDisplaySlide({ textClass, accentClass }: FinanceDisplaySlideProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['display-finance-slide'],
    queryFn: async () => {
      const now = new Date();
      const startOfCurrentMonth = startOfMonth(now);

      const [paymentsRes, expensesRes, budgetRes] = await Promise.all([
        supabase.from('payments').select('amount, created_at').eq('status', 'confirmed'),
        supabase.from('expenses').select('amount, expense_date'),
        supabase.from('budget_transactions').select('amount, transaction_date, type'),
      ]);

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
          isCurrent: i === 0,
          income: monthIncome,
          expenses: monthExpenses,
          balance: monthIncome - monthExpenses,
        });
      }

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
    refetchInterval: 5 * 60 * 1000,
  });

  const balance = stats?.thisMonthBalance || 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
      className="text-center w-full max-w-[92vw] flex flex-col items-center p-[2vw]"
    >
      {/* Title */}
      <h2 className={`text-[4vh] md:text-[5vh] font-bold mb-[2vh] ${textClass}`}>
        💰 מצב כספי חודשי
      </h2>

      {/* Big Numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-[2vw] w-full max-w-[85vw] mb-[2vh]">
        {/* Income */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="rounded-2xl p-[2vh] text-center border-2"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.08) 100%)',
            borderColor: 'rgba(16,185,129,0.4)',
          }}
        >
          <TrendingUp className="w-[4vh] h-[4vh] mx-auto mb-[1vh]" style={{ color: '#34d399' }} />
          <p className="text-[1.8vh] md:text-[2vh] mb-[0.5vh]" style={{ color: '#6ee7b7' }}>הכנסות</p>
          {isLoading ? (
            <div className="h-[4vh] rounded animate-pulse" style={{ background: 'rgba(16,185,129,0.2)' }} />
          ) : (
            <p className="text-[3.5vh] md:text-[4.5vh] font-bold" style={{ color: '#34d399' }}>
              {formatCurrency(stats?.thisMonthIncome || 0)}
            </p>
          )}
        </motion.div>

        {/* Expenses */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="rounded-2xl p-[2vh] text-center border-2"
          style={{
            background: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(220,38,38,0.08) 100%)',
            borderColor: 'rgba(239,68,68,0.4)',
          }}
        >
          <TrendingDown className="w-[4vh] h-[4vh] mx-auto mb-[1vh]" style={{ color: '#f87171' }} />
          <p className="text-[1.8vh] md:text-[2vh] mb-[0.5vh]" style={{ color: '#fca5a5' }}>הוצאות</p>
          {isLoading ? (
            <div className="h-[4vh] rounded animate-pulse" style={{ background: 'rgba(239,68,68,0.2)' }} />
          ) : (
            <p className="text-[3.5vh] md:text-[4.5vh] font-bold" style={{ color: '#f87171' }}>
              {formatCurrency(stats?.thisMonthExpenses || 0)}
            </p>
          )}
        </motion.div>

        {/* Balance */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="rounded-2xl p-[2vh] text-center border-2"
          style={{
            background: balance >= 0
              ? 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.08) 100%)'
              : 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(234,88,12,0.08) 100%)',
            borderColor: balance >= 0 ? 'rgba(59,130,246,0.4)' : 'rgba(249,115,22,0.4)',
          }}
        >
          <Wallet className="w-[4vh] h-[4vh] mx-auto mb-[1vh]" style={{ color: balance >= 0 ? '#60a5fa' : '#fb923c' }} />
          <p className="text-[1.8vh] md:text-[2vh] mb-[0.5vh]" style={{ color: balance >= 0 ? '#93c5fd' : '#fdba74' }}>
            יתרה
          </p>
          {isLoading ? (
            <div className="h-[4vh] rounded animate-pulse" style={{ background: 'rgba(59,130,246,0.2)' }} />
          ) : (
            <p className="text-[3.5vh] md:text-[4.5vh] font-bold" style={{ color: balance >= 0 ? '#60a5fa' : '#fb923c' }}>
              {formatCurrency(balance)}
            </p>
          )}
        </motion.div>
      </div>

      {/* Monthly History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="w-full max-w-[85vw] rounded-2xl p-[2vh] border"
        style={{
          background: 'rgba(255,255,255,0.05)',
          borderColor: 'rgba(255,255,255,0.1)',
        }}
      >
        <h3 className={`text-[2.5vh] font-bold mb-[1.5vh] ${textClass}`}>היסטוריה חודשית</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-[1.5vw]">
          {stats?.monthlyData?.map((month, index) => (
            <div
              key={index}
              className={`text-center p-[1.5vh] rounded-xl ${
                month.isCurrent ? 'ring-2 ring-white/30' : ''
              }`}
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <p className={`text-[1.6vh] font-medium mb-[0.5vh] ${month.isCurrent ? textClass : accentClass}`}>
                {month.month}
                {month.isCurrent && <span className="text-[1.2vh] mr-1 opacity-60">(נוכחי)</span>}
              </p>
              <p
                className="text-[2.5vh] md:text-[3vh] font-bold"
                style={{ color: month.balance >= 0 ? '#34d399' : '#f87171' }}
              >
                {formatCurrency(month.balance)}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
