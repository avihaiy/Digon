import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  
  CreditCard,
  Download,
  FileSpreadsheet,
  Calendar,
  PieChart as PieChartIcon,
  ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/lib/hebrew-utils';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Reports() {
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Fetch comprehensive stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['reports-stats', typeFilter],
    queryFn: async () => {
      const now = new Date();
      const thisMonthStart = startOfMonth(now);
      const thisMonthEnd = endOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));

      // Build base query with type filter
      const buildQuery = (query: any) => {
        if (typeFilter !== 'all') {
          return query.eq('payment_type', typeFilter);
        }
        return query;
      };

      // This month payments
      const { data: thisMonthPayments } = await buildQuery(
        supabase
          .from('payments')
          .select('amount, method, created_at, payment_type')
          .gte('created_at', thisMonthStart.toISOString())
          .lte('created_at', thisMonthEnd.toISOString())
          .eq('status', 'confirmed')
      );

      // Last month payments
      const { data: lastMonthPayments } = await buildQuery(
        supabase
          .from('payments')
          .select('amount')
          .gte('created_at', lastMonthStart.toISOString())
          .lte('created_at', lastMonthEnd.toISOString())
          .eq('status', 'confirmed')
      );

      // All payments for chart
      const { data: allPayments } = await buildQuery(
        supabase
          .from('payments')
          .select('amount, created_at, payment_type')
          .eq('status', 'confirmed')
          .order('created_at')
      );

      // Members count
      const { count: membersCount } = await supabase
        .from('members')
        .select('id', { count: 'exact' })
        .eq('active', true);


      // Calculate stats
      const thisMonthTotal = thisMonthPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const lastMonthTotal = lastMonthPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const monthlyChange = lastMonthTotal > 0 
        ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(1)
        : 0;

      // Payment methods breakdown
      const bitPayments = thisMonthPayments?.filter(p => p.method === 'bit').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const cashPayments = thisMonthPayments?.filter(p => p.method === 'cash').reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Payment type breakdown
      const typeBreakdown = {
        aliya: allPayments?.filter((p: any) => p.payment_type === 'aliya').reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0,
        ashkava: allPayments?.filter((p: any) => p.payment_type === 'ashkava').reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0,
        yearly_bracha: allPayments?.filter((p: any) => p.payment_type === 'yearly_bracha').reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0,
        donation: allPayments?.filter((p: any) => p.payment_type === 'donation').reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0,
      };

      // Monthly data for chart (last 6 months)
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(subMonths(now, i));
        const monthPayments = allPayments?.filter(p => {
          const date = new Date(p.created_at);
          return date >= monthStart && date <= monthEnd;
        }) || [];
        const total = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        monthlyData.push({
          month: format(monthStart, 'MMM', { locale: he }),
          amount: total,
        });
      }

      return {
        thisMonthTotal,
        lastMonthTotal,
        monthlyChange: Number(monthlyChange),
        membersCount: membersCount || 0,
        bitPayments,
        cashPayments,
        monthlyData,
        typeBreakdown,
      };
    },
  });

  const paymentMethodData = [
    { name: 'ביט', value: stats?.bitPayments || 0, color: '#9333ea' },
    { name: 'מזומן', value: stats?.cashPayments || 0, color: '#22c55e' },
  ];

  const typeBreakdownData = [
    { name: 'אשכבות', value: stats?.typeBreakdown?.ashkava || 0, color: '#f59e0b' },
    { name: 'ברכות שנה', value: stats?.typeBreakdown?.yearly_bracha || 0, color: '#8b5cf6' },
    { name: 'תרומות', value: stats?.typeBreakdown?.donation || 0, color: '#06b6d4' },
  ];


  const handleExportExcel = () => {
    // Create CSV content
    const headers = ['חודש', 'סכום'];
    const rows = stats?.monthlyData?.map(d => [d.month, d.amount]) || [];
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    
    // Download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `דוח_הכנסות_${format(new Date(), 'yyyy-MM')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            דוחות וסטטיסטיקות
          </h1>
          <p className="text-muted-foreground">
            סקירה כללית של פעילות בית הכנסת
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button asChild variant="outline" className="gap-2">
            <Link to="/weekly-balance">
              <PieChartIcon className="w-4 h-4" />
              דוח מאזני חברים
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/expense-reports">
              <PieChartIcon className="w-4 h-4" />
              דו״ח הכנסות/הוצאות
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <Button onClick={handleExportExcel} variant="outline" className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            ייצוא לאקסל
          </Button>
        </div>
      </div>

      {/* Type Filter */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'הכל' },
          { key: 'donation', label: 'תרומות' },
        ].map(f => (
          <Button
            key={f.key}
            variant={typeFilter === f.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-success" />
                  </div>
                  {stats?.monthlyChange !== undefined && stats.monthlyChange !== 0 && (
                    <span className={`text-sm font-medium ${
                      stats.monthlyChange > 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {stats.monthlyChange > 0 ? '+' : ''}{stats.monthlyChange}%
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold hebrew-number">
                  {formatCurrency(stats?.thisMonthTotal || 0)}
                </p>
                <p className="text-sm text-muted-foreground">הכנסות החודש</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-bold">{stats?.membersCount}</p>
                <p className="text-sm text-muted-foreground">חברים פעילים</p>
              </>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">הכנסות חודשיות</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats?.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'סכום']}
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods Pie Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">אמצעי תשלום החודש</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="flex items-center justify-center gap-8">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {paymentMethodData.map((item) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ background: item.color }}
                      />
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Income by Type */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">הכנסות לפי סוג</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="flex items-center justify-center gap-8">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie
                      data={typeBreakdownData.filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {typeBreakdownData.filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-type-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {typeBreakdownData.map((item) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ background: item.color }}
                      />
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
