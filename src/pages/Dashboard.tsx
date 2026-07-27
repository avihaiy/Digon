import { useEffect, useState, useRef, ReactNode, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Link, Navigate } from 'react-router-dom';
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
  Bell,
  Repeat,
  Clock,
  CalendarIcon,
  Star,
  Fish
} from 'lucide-react';
import { formatCurrency, getNextShabbat, formatDate, getCurrentParasha, getHebrewDate } from '@/lib/hebrew-utils';
import { format, startOfMonth, subMonths, endOfMonth } from 'date-fns';
import { he } from 'date-fns/locale';
// recharts removed - using custom bar chart
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { cn } from '@/lib/utils';
import EventsWidget from '@/components/dashboard/EventsWidget';

// Animated counter that counts from 0 to target value
function AnimatedCounter({ value, duration = 900, className, prefix = '₪ ' }: { value: number; duration?: number; className?: string; prefix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const [done, setDone] = useState(false);
  const prevValue = useRef(0);

  useEffect(() => {
    if (value === 0) { setDisplayValue(0); setDone(true); return; }
    setDone(false);
    const start = prevValue.current;
    const diff = value - start;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplayValue(current);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setDone(true);
        prevValue.current = value;
      }
    };
    requestAnimationFrame(tick);
  }, [value, duration]);

  return (
    <span className={cn(className, done ? 'font-bold' : 'font-semibold', 'transition-all duration-300 tabular-nums')}>
      {prefix}{displayValue.toLocaleString()}
    </span>
  );
}

// Animated progress bar
function AnimatedBar({ percentage, color, delay = 0 }: { percentage: number; color: string; delay?: number }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(percentage), delay + 100);
    return () => clearTimeout(timer);
  }, [percentage, delay]);

  return (
    <div className="h-7 bg-secondary/60 rounded-lg overflow-hidden">
      <div
        className={cn('h-full rounded-lg', color)}
        style={{
          width: `${width}%`,
          transition: `width 1s cubic-bezier(0.34, 1.56, 0.64, 1)`,
        }}
      />
    </div>
  );
}

// Professional animated bar for the comparison chart
function ProBar({ value, maxValue, color, gradientFrom, gradientTo, delay = 0, label }: {
  value: number; maxValue: number; color: string; gradientFrom: string; gradientTo: string; delay?: number; label: string;
}) {
  const [width, setWidth] = useState(0);
  const [hovered, setHovered] = useState(false);
  const pct = maxValue > 0 ? Math.min(100, (value / maxValue) * 100) : 0;

  useEffect(() => {
    const timer = setTimeout(() => setWidth(pct), delay + 200);
    return () => clearTimeout(timer);
  }, [pct, delay]);

  return (
    <div
      className="group/bar relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={cn(
        'h-10 rounded-xl overflow-hidden relative',
        'bg-secondary/40 dark:bg-secondary/30',
        'transition-shadow duration-300',
        hovered && 'shadow-md'
      )}>
        <div
          className="h-full rounded-xl relative overflow-hidden"
          style={{
            width: `${width}%`,
            transition: `width 1s cubic-bezier(0.34, 1.56, 0.64, 1)`,
            background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
          }}
        >
          {/* Shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover/bar:opacity-100 transition-opacity duration-500" style={{ backgroundSize: '200% 100%', animation: hovered ? 'border-shine 2s linear infinite' : 'none' }} />
        </div>
        {/* Hover ring effect */}
        <div className={cn(
          'absolute inset-0 rounded-xl transition-all duration-300 pointer-events-none',
          hovered ? 'ring-2 ring-offset-1' : 'ring-0',
        )} style={{ '--tw-ring-color': gradientFrom } as React.CSSProperties} />
      </div>
      {/* Floating value on hover */}
      <div className={cn(
        'absolute -top-8 right-2 px-2 py-0.5 rounded-md text-xs font-bold text-white shadow-lg transition-all duration-300',
        hovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
      )} style={{ background: gradientFrom }}>
        ₪ {value.toLocaleString()}
      </div>
    </div>
  );
}

// Custom bar chart for monthly history
function MonthlyBarChart({ data }: { data: { month: string; הכנסות: number; הוצאות: number }[] }) {
  const [loaded, setLoaded] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const maxVal = useMemo(() => {
    let m = 0;
    for (const d of data) { m = Math.max(m, d.הכנסות, d.הוצאות); }
    return m || 1;
  }, [data]);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Close tooltip on outside tap (mobile)
  useEffect(() => {
    if (activeIdx === null) return;
    const handler = (e: TouchEvent | MouseEvent) => {
      if (chartRef.current && !chartRef.current.contains(e.target as Node)) {
        setActiveIdx(null);
      }
    };
    document.addEventListener('touchstart', handler);
    document.addEventListener('mousedown', handler);
    return () => {
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('mousedown', handler);
    };
  }, [activeIdx]);

  return (
    <div ref={chartRef} className="flex items-end gap-2 sm:gap-3 h-52 pt-6 px-1 relative">
      {data.map((d, i) => {
        const incomeH = (d.הכנסות / maxVal) * 100;
        const expenseH = (d.הוצאות / maxVal) * 100;
        const diff = d.הכנסות - d.הוצאות;
        const isPositive = diff >= 0;
        const isActive = activeIdx === i;
        return (
          <div
            key={d.month}
            className="flex-1 flex flex-col items-center gap-1 group/col relative cursor-pointer"
            onClick={() => setActiveIdx(isActive ? null : i)}
            onMouseEnter={() => setActiveIdx(i)}
            onMouseLeave={() => setActiveIdx(null)}
          >
            {/* Tooltip */}
            <div className={cn(
              'absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-30 transition-all duration-300 pointer-events-none',
              isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            )}>
              <div className="bg-card dark:bg-popover border border-border rounded-xl shadow-xl p-2.5 sm:p-3 min-w-[120px] sm:min-w-[140px] text-right" dir="rtl">
                <p className="text-[11px] sm:text-xs font-bold text-foreground mb-1.5 sm:mb-2 border-b border-border/50 pb-1 sm:pb-1.5">{d.month}</p>
                <div className="space-y-1 sm:space-y-1.5">
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: '#00897B' }} />
                      <span className="text-[10px] sm:text-[11px] text-muted-foreground">הכנסות</span>
                    </div>
                    <span className="text-[11px] sm:text-xs font-bold tabular-nums">₪ {d.הכנסות.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: '#E63946' }} />
                      <span className="text-[10px] sm:text-[11px] text-muted-foreground">הוצאות</span>
                    </div>
                    <span className="text-[11px] sm:text-xs font-bold tabular-nums">₪ {d.הוצאות.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-border/50 pt-1 sm:pt-1.5 flex items-center justify-between gap-2 sm:gap-3">
                    <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground">הפרש</span>
                    <span className={cn('text-[11px] sm:text-xs font-bold tabular-nums', isPositive ? 'text-[#00897B]' : 'text-[#E63946]')}>
                      {isPositive ? '+' : ''}{diff.toLocaleString()} ₪
                    </span>
                  </div>
                </div>
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-card dark:bg-popover border-b border-r border-border rotate-45" />
              </div>
            </div>

            <div className="flex items-end gap-0.5 sm:gap-1 w-full h-40 justify-center">
              {/* Income bar */}
              <div className="relative w-[45%] flex flex-col justify-end h-full">
                <div
                  className={cn(
                    'w-full rounded-t-lg relative overflow-hidden',
                    'transition-all duration-300',
                    isActive && '-translate-y-0.5 shadow-lg',
                  )}
                  style={{
                    height: loaded ? `${incomeH}%` : '0%',
                    transition: `height 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 120}ms, transform 0.3s, box-shadow 0.3s`,
                    background: 'linear-gradient(180deg, #00897B, #00695C)',
                    boxShadow: isActive ? '0 4px 12px -2px rgba(0, 137, 123, 0.4)' : '0 2px 8px -2px rgba(0, 137, 123, 0.3)',
                    minHeight: d.הכנסות > 0 ? '4px' : '0',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/15" />
                </div>
              </div>
              {/* Expense bar */}
              <div className="relative w-[45%] flex flex-col justify-end h-full">
                <div
                  className={cn(
                    'w-full rounded-t-lg relative overflow-hidden',
                    'transition-all duration-300',
                    isActive && '-translate-y-0.5 shadow-lg',
                  )}
                  style={{
                    height: loaded ? `${expenseH}%` : '0%',
                    transition: `height 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 120 + 60}ms, transform 0.3s, box-shadow 0.3s`,
                    background: 'linear-gradient(180deg, #E63946, #C62828)',
                    boxShadow: isActive ? '0 4px 12px -2px rgba(230, 57, 70, 0.4)' : '0 2px 8px -2px rgba(230, 57, 70, 0.3)',
                    minHeight: d.הוצאות > 0 ? '4px' : '0',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/15" />
                </div>
              </div>
            </div>
            <span className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-1 opacity-0 animate-fade-in" style={{ animationDelay: `${i * 100 + 400}ms`, animationFillMode: 'forwards' }}>{d.month}</span>
          </div>
        );
      })}
    </div>
  );
}

// Mini confetti burst component
function ConfettiBurst({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (!active || fired.current || !canvasRef.current) return;
    fired.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const colors = ['#22c55e', '#10b981', '#fbbf24', '#3b82f6', '#a855f7', '#f43f5e'];
    const particles: { x: number; y: number; vx: number; vy: number; size: number; color: string; life: number; rotation: number; rv: number }[] = [];

    for (let i = 0; i < 40; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 1) * 6 - 2,
        size: Math.random() * 5 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        rotation: Math.random() * 360,
        rv: (Math.random() - 0.5) * 10,
      });
    }

    let frameId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        if (p.life <= 0) continue;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= 0.018;
        p.rotation += p.rv;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      if (alive) frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-20"
    />
  );
}

function RevealSection({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const { ref, isVisible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-700 ease-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

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
      const totalBudgetIncome = budgetExpensesRes.data?.filter(b => b.type === 'income')
        .reduce((sum, b) => sum + Number(b.amount), 0) || 0;
      const totalIncome = totalPayments + totalBudgetIncome;
      
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
        totalPayments: totalIncome,
        totalReceipts: receiptsRes.data?.length || 0,
        thisMonthIncome,
        thisMonthExpenses,
        totalExpenses,
        balance: totalIncome - totalExpenses,
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


  // Fetch active recurring reminders
  const { data: recurringReminders = [], isLoading: remindersLoading } = useQuery({
    queryKey: ['dashboard-recurring-reminders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminders' as any)
        .select('*')
        .eq('is_dismissed', false)
        .not('recurrence', 'is', null)
        .order('reminder_date', { ascending: true });
      if (error) throw error;
      const filtered = (data || []).filter((r: any) => r.recurrence && r.recurrence !== 'none');
      return filtered.sort((a: any, b: any) => (b.is_important ? 1 : 0) - (a.is_important ? 1 : 0));
    },
    refetchInterval: 60000,
  });

  // Active (due) reminders count
  const { data: dueRemindersCount = 0 } = useQuery({
    queryKey: ['dashboard-due-reminders'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('reminders' as any)
        .select('*', { count: 'exact', head: true })
        .eq('is_dismissed', false)
        .lte('reminder_date', new Date().toISOString());
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 60000,
  });

  const RECURRENCE_LABELS: Record<string, string> = {
    daily: 'יומי',
    weekly: 'שבועי',
    monthly: 'חודשי',
  };

  const quickActions = [
    { label: 'הוסף חבר', icon: Users, href: '/members?action=add', variant: 'secondary' as const },
    { label: 'קבל תשלום', icon: CreditCard, href: '/payments?action=add', variant: 'secondary' as const },
    { label: 'דו"ח כספי', icon: PieChart, href: '/expense-reports', variant: 'primary' as const },
  ];

  return (
    <div className="space-y-6">
      {/* Force redirect to fishing app for the user to see it */}
      <Navigate to="/fishing" replace />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground">לוח בקרה</h1>
          <p className="text-muted-foreground">
            שבת פרשת {parasha} • {formatDate(nextShabbat)} • {getHebrewDate(nextShabbat)}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
          {[
            { label: 'קבל תשלום', mobileLabel: 'תשלום', icon: CreditCard, href: '/payments?action=add', from: '#00897B', to: '#00695C', shadow: 'rgba(0,137,123,0.35)', delay: 0 },
            { label: 'הוצאות', mobileLabel: 'הוצאות', icon: Wallet, href: '/budget', from: '#E63946', to: '#C62828', shadow: 'rgba(230,57,70,0.35)', delay: 80 },
            { label: 'חברים', mobileLabel: 'חברים', icon: Users, href: '/members', from: '#FF7043', to: '#E64A19', shadow: 'rgba(255,112,67,0.35)', delay: 160 },
          ].map((btn, i) => (
            <Link key={btn.href} to={btn.href} className="col-span-1">
              <button
                className="hero-action-btn w-full relative overflow-hidden flex items-center justify-center gap-1.5 sm:gap-2 px-2 py-3 sm:px-3 md:px-5 md:py-3.5 text-white font-semibold text-xs sm:text-sm md:text-base rounded-2xl border-0 outline-none cursor-pointer group/btn"
                style={{
                  background: `linear-gradient(135deg, ${btn.from}, ${btn.to})`,
                  ['--hero-shadow' as string]: btn.shadow,
                  animationDelay: `${btn.delay}ms, ${btn.delay + 200}ms, ${btn.delay + 200}ms, ${btn.delay + 400}ms`,
                } as React.CSSProperties}
                onClick={() => { try { navigator.vibrate?.(8); } catch {} }}
              >
                {/* Gradient shift overlay */}
                <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(135deg, ${btn.to}, ${btn.from})` }} />
                {/* Shine sweep - continuous */}
                <div className="hero-shine-sweep absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent" style={{ animationDelay: `${i * 1.5 + 1}s` }} />
                <btn.icon className="w-4 h-4 md:w-5 md:h-5 relative z-10 group-hover/btn:scale-110 group-hover/btn:rotate-6 transition-transform duration-300" />
                <span className="relative z-10 truncate hidden sm:inline">{btn.label}</span>
                <span className="relative z-10 truncate sm:hidden">{btn.mobileLabel}</span>
              </button>
            </Link>
          ))}
        </div>
      </div>

      {/* Fishing App Promo Banner */}
      <div className="bg-gradient-to-r from-[#0F1C35] to-[#1a2f58] rounded-2xl p-4 flex items-center justify-between shadow-lg border border-slate-700/50 animate-fade-up">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
            <Fish className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">אפליקציית דייג בישראל</h3>
            <p className="text-blue-200 text-sm">הממשק החדש זמין כעת!</p>
          </div>
        </div>
        <Link to="/fishing">
          <Button variant="secondary" className="bg-blue-500 hover:bg-blue-600 text-white border-0">
            היכנס לאפליקציה
          </Button>
        </Link>
      </div>

      {/* Recurring Reminders Summary - Top Section */}
      {(recurringReminders.length > 0 || dueRemindersCount > 0) && (
        <RevealSection delay={50}>
       <Card className="glass-card relative overflow-hidden border-0 shadow-sm py-0">
          <CardContent className="relative z-10 px-3 sm:px-4 py-2 sm:py-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Bell className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-xs sm:text-sm font-bold flex-1">תזכורות חוזרות</span>
              {dueRemindersCount > 0 && (
                <Badge variant="destructive" className="animate-pulse text-[8px] sm:text-[9px] h-3.5 px-1">
                  {dueRemindersCount}
                </Badge>
              )}
              <Link to="/reminders">
                <Button variant="ghost" size="sm" className="text-[9px] sm:text-[10px] gap-0.5 h-5 px-1">
                  הכל <ArrowLeft className="w-2.5 h-2.5" />
                </Button>
              </Link>
            </div>
            {remindersLoading ? (
              <Skeleton className="h-6 w-full" />
            ) : recurringReminders.length === 0 ? (
              <p className="text-center text-muted-foreground text-[10px]">אין תזכורות חוזרות</p>
            ) : (
              <div className="space-y-0.5">
                {recurringReminders.slice(0, 3).map((r: any) => {
                  const reminderDate = new Date(r.reminder_date);
                  const isPast = reminderDate <= new Date();
                  return (
                    <div
                      key={r.id}
                      className={cn(
                        'flex items-center gap-1 py-1 px-1.5 rounded-md text-[10px] sm:text-[11px]',
                        isPast ? 'bg-destructive/5' : 'bg-muted/25',
                        r.is_important && !isPast && 'bg-amber-50/15 dark:bg-amber-950/10'
                      )}
                    >
                      {r.is_important ? (
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 shrink-0" />
                      ) : (
                        <Repeat className={cn('w-2.5 h-2.5 shrink-0', isPast ? 'text-destructive' : 'text-primary')} />
                      )}
                      <span className={cn('truncate flex-1', r.is_important && 'text-amber-700 dark:text-amber-300')}>{r.content}</span>
                      <span className="text-[8px] sm:text-[9px] text-muted-foreground shrink-0">{format(reminderDate, 'dd/MM')}</span>
                      {isPast && <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse shrink-0" />}
                    </div>
                  );
                })}
                {recurringReminders.length > 3 && (
                  <Link to="/reminders" className="block text-center">
                    <span className="text-[9px] text-muted-foreground hover:text-primary">+{recurringReminders.length - 3} נוספות</span>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        </RevealSection>
      )}

      {/* Upcoming Events Widget */}
      <RevealSection delay={75}>
        <EventsWidget />
      </RevealSection>

      {/* Financial Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Income */}
        <Card className="stat-card-base stat-card-income animate-fade-up stagger-1 group border-0">
          <div className="border-shine-overlay" />
          <div className="absolute top-0 left-0 w-28 h-28 bg-emerald-500/8 rounded-full -translate-y-12 -translate-x-12 group-hover:scale-150 transition-transform duration-700" />
          <CardContent className="p-4 relative z-10">
            {statsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center ring-1 ring-emerald-500/25 group-hover:scale-110 group-hover:ring-emerald-500/50 transition-all duration-300 animate-bounce-subtle" style={{ animationDelay: '0.3s' }}>
                  <TrendingUp className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.2s' }}>הכנסות החודש</p>
                  <AnimatedCounter value={stats?.thisMonthIncome || 0} className="text-xl text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card className="stat-card-base stat-card-expense animate-fade-up stagger-2 group border-0">
          <div className="border-shine-overlay" />
          <div className="absolute top-0 left-0 w-28 h-28 bg-red-500/8 rounded-full -translate-y-12 -translate-x-12 group-hover:scale-150 transition-transform duration-700" />
          <CardContent className="p-4 relative z-10">
            {statsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-500/15 flex items-center justify-center ring-1 ring-red-500/25 group-hover:scale-110 group-hover:ring-red-500/50 transition-all duration-300 animate-bounce-subtle" style={{ animationDelay: '0.5s' }}>
                  <TrendingDown className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.4s' }}>הוצאות החודש</p>
                  <AnimatedCounter value={stats?.thisMonthExpenses || 0} className="text-xl text-red-600 dark:text-red-400" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Balance */}
        <Card className={cn(
          'stat-card-base animate-fade-up stagger-3 group border-0',
          (stats?.balance || 0) >= 0 ? 'stat-card-balance-pos' : 'stat-card-balance-neg'
        )}>
          <div className="border-shine-overlay" />
          <div className={cn('absolute top-0 left-0 w-28 h-28 rounded-full -translate-y-12 -translate-x-12 group-hover:scale-150 transition-transform duration-700', (stats?.balance || 0) >= 0 ? 'bg-blue-500/8' : 'bg-orange-500/8')} />
          <CardContent className="p-4 relative z-10">
            {statsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="flex items-center gap-3">
                <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center ring-1 group-hover:scale-110 transition-all duration-300 animate-bounce-subtle', (stats?.balance || 0) >= 0 ? 'bg-blue-500/15 ring-blue-500/25 group-hover:ring-blue-500/50' : 'bg-orange-500/15 ring-orange-500/25 group-hover:ring-orange-500/50')} style={{ animationDelay: '0.7s' }}>
                  <Wallet className={cn('w-6 h-6', (stats?.balance || 0) >= 0 ? 'text-blue-500' : 'text-orange-500')} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.6s' }}>יתרה כוללת</p>
                  <AnimatedCounter value={stats?.balance || 0} className={cn('text-xl', (stats?.balance || 0) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400')} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Receipts */}
        <Card className="stat-card-base stat-card-receipts animate-fade-up stagger-4 group border-0">
          <div className="border-shine-overlay" />
          <div className="absolute top-0 left-0 w-28 h-28 bg-primary/5 rounded-full -translate-y-12 -translate-x-12 group-hover:scale-150 transition-transform duration-700" />
          <CardContent className="p-4 relative z-10">
            {statsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center ring-1 ring-primary/25 group-hover:scale-110 group-hover:ring-primary/50 transition-all duration-300">
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

        {/* Debts */}
        <Card className="stat-card-base stat-card-debts animate-fade-up stagger-5 group border-0 cursor-pointer" onClick={() => setDebtsDialogOpen(true)}>
          <div className="border-shine-overlay" />
          <div className="absolute top-0 right-0 w-28 h-28 bg-red-500/8 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-700" />
          <CardContent className="p-4 relative z-10">
            {debtsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-500/15 flex items-center justify-center ring-2 ring-red-500/25 group-hover:scale-110 group-hover:ring-red-500/50 transition-all duration-300">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-400 animate-fade-in">חובות שטרם נגבו</p>
                  <AnimatedCounter value={totalDebts || 0} className="text-xl text-red-600 dark:text-red-400" duration={1100} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <RevealSection>
      {/* Income vs Expenses - Professional */}
      <Card className="glass-card relative overflow-hidden border-0 shadow-lg">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#00897B]/5 dark:bg-[#00897B]/10 rounded-full -translate-y-20 translate-x-20 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#E63946]/5 dark:bg-[#E63946]/10 rounded-full translate-y-16 -translate-x-16 blur-2xl" />

        <CardHeader className="pb-3 relative z-10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold tracking-tight">הכנסות מול הוצאות החודש</CardTitle>
            {/* Legend */}
            <div className="flex items-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full shadow-sm" style={{ background: 'linear-gradient(135deg, #00897B, #00695C)' }} />
                <span className="text-xs font-medium text-muted-foreground">הכנסות</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full shadow-sm" style={{ background: 'linear-gradient(135deg, #E63946, #C62828)' }} />
                <span className="text-xs font-medium text-muted-foreground">הוצאות</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          {statsLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="space-y-5">
              {/* Income Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground animate-fade-in">הכנסות</span>
                  <AnimatedCounter value={stats?.thisMonthIncome || 0} className="font-bold tabular-nums" duration={1000}  />
                </div>
                <ProBar
                  value={stats?.thisMonthIncome || 0}
                  maxValue={Math.max(stats?.thisMonthIncome || 1, stats?.thisMonthExpenses || 1)}
                  color="#00897B"
                  gradientFrom="#00897B"
                  gradientTo="#4DB6AC"
                  delay={200}
                  label="הכנסות"
                />
              </div>

              {/* Expenses Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground animate-fade-in" style={{ animationDelay: '0.15s' }}>הוצאות</span>
                  <AnimatedCounter value={stats?.thisMonthExpenses || 0} className="font-bold tabular-nums" duration={1000} />
                </div>
                <ProBar
                  value={stats?.thisMonthExpenses || 0}
                  maxValue={Math.max(stats?.thisMonthIncome || 1, stats?.thisMonthExpenses || 1)}
                  color="#E63946"
                  gradientFrom="#E63946"
                  gradientTo="#EF9A9A"
                  delay={500}
                  label="הוצאות"
                />
              </div>

              {/* Balance Summary */}
              <div className="pt-3 border-t border-border/50 flex justify-between items-center animate-fade-in relative" style={{ animationDelay: '0.8s' }}>
                <ConfettiBurst active={((stats?.thisMonthIncome || 0) - (stats?.thisMonthExpenses || 0)) > 0} />
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    (stats?.thisMonthIncome || 0) - (stats?.thisMonthExpenses || 0) >= 0 ? 'bg-[#00897B]/15' : 'bg-[#E63946]/15'
                  )}>
                    <Wallet className={cn('w-4 h-4', (stats?.thisMonthIncome || 0) - (stats?.thisMonthExpenses || 0) >= 0 ? 'text-[#00897B]' : 'text-[#E63946]')} />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">יתרה החודש</span>
                </div>
                <AnimatedCounter
                  value={(stats?.thisMonthIncome || 0) - (stats?.thisMonthExpenses || 0)}
                  className={cn('text-xl tabular-nums', (stats?.thisMonthIncome || 0) - (stats?.thisMonthExpenses || 0) >= 0 ? 'text-[#00897B]' : 'text-[#E63946]')}
                  duration={1200}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </RevealSection>

      <RevealSection delay={100}>
      {/* Monthly History - Custom Bars */}
      <Card className="glass-card relative overflow-hidden border-0 shadow-lg">
        <div className="absolute top-0 left-1/2 w-60 h-60 bg-[#00897B]/3 dark:bg-[#00897B]/8 rounded-full -translate-y-40 -translate-x-1/2 blur-3xl pointer-events-none" />
        <CardHeader className="pb-2 relative z-10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold tracking-tight">היסטוריית הכנסות והוצאות</CardTitle>
            <span className="text-xs text-muted-foreground bg-secondary/60 dark:bg-secondary/40 px-2.5 py-1 rounded-full">6 חודשים</span>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'linear-gradient(180deg, #00897B, #00695C)' }} />
              <span className="text-xs text-muted-foreground">הכנסות</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'linear-gradient(180deg, #E63946, #C62828)' }} />
              <span className="text-xs text-muted-foreground">הוצאות</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          {historyLoading ? (
            <Skeleton className="h-52 w-full" />
          ) : (
            <MonthlyBarChart data={monthlyHistory || []} />
          )}
        </CardContent>
      </Card>
      </RevealSection>

      <RevealSection delay={150}>
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
      </RevealSection>


      <RevealSection delay={200}>
      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, i) => (
          <Link key={action.href} to={action.href}>
            <div className="quick-action quick-action-enhanced group click-scale">
              <div className={cn(
                'w-12 h-12 rounded-xl mb-3 flex items-center justify-center transition-all duration-300 relative z-10',
                action.variant === 'primary' 
                  ? 'bg-primary text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/25 group-hover:scale-110' 
                  : 'bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/25 group-hover:scale-110'
              )}>
                <action.icon className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <p className="font-medium relative z-10">{action.label}</p>
            </div>
          </Link>
        ))}
      </div>
      </RevealSection>


      <Dialog open={debtsDialogOpen} onOpenChange={setDebtsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">פירוט חובות שטרם נגבו</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {memberDebts && memberDebts.length > 0 ? (
              <>
                {memberDebts.map((member, idx) => (
                  <Card key={idx} className="glass-card">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold">{member.full_name}</span>
                        <Badge variant="destructive" className="hebrew-number">{formatCurrency(member.total)}</Badge>
                      </div>
                      <div className="space-y-1">
                        {member.charges.map((charge, ci) => (
                          <div key={ci} className="flex justify-between text-sm text-muted-foreground">
                            <span>{charge.description || "חיוב"}</span>
                            <span className="hebrew-number">{formatCurrency(charge.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <div className="border-t pt-3 flex justify-between items-center font-bold text-lg">
                  <span>סה״כ חובות</span>
                  <span className="hebrew-number text-destructive">{formatCurrency(totalDebts || 0)}</span>
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground py-8">אין חובות פתוחים 🎉</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
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
    <Card className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-muted/50 to-muted/20 border hover-lift transition-all duration-300 group">
      <div className="absolute top-0 left-0 w-20 h-20 bg-primary/5 rounded-full -translate-y-8 -translate-x-8 group-hover:scale-125 transition-transform duration-500" />
      <CardContent className="p-4 relative">
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
