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
  BookOpen,
  CreditCard,
  Download,
  FileSpreadsheet,
  Calendar,
} from 'lucide-react';
import { formatCurrency } from '@/lib/hebrew-utils';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Reports() {
  // Fetch comprehensive stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['reports-stats'],
    queryFn: async () => {
      const now = new Date();
      const thisMonthStart = startOfMonth(now);
      const thisMonthEnd = endOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));

      // This month payments
      const { data: thisMonthPayments } = await supabase
        .from('payments')
        .select('amount, method, created_at')
        .gte('created_at', thisMonthStart.toISOString())
        .lte('created_at', thisMonthEnd.toISOString())
        .eq('status', 'confirmed');

      // Last month payments
      const { data: lastMonthPayments } = await supabase
        .from('payments')
        .select('amount')
        .gte('created_at', lastMonthStart.toISOString())
        .lte('created_at', lastMonthEnd.toISOString())
        .eq('status', 'confirmed');

      // All payments for chart
      const { data: allPayments } = await supabase
        .from('payments')
        .select('amount, created_at')
        .eq('status', 'confirmed')
        .order('created_at');

      // Members count
      const { count: membersCount } = await supabase
        .from('members')
        .select('id', { count: 'exact' })
        .eq('active', true);

      // Aliyot stats
      const { data: aliyotData } = await supabase
        .from('aliyot')
        .select('status, price');

      // Calculate stats
      const thisMonthTotal = thisMonthPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const lastMonthTotal = lastMonthPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const monthlyChange = lastMonthTotal > 0 
        ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(1)
        : 0;

      // Payment methods breakdown
      const bitPayments = thisMonthPayments?.filter(p => p.method === 'bit').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const cashPayments = thisMonthPayments?.filter(p => p.method === 'cash').reduce((sum, p) => sum + Number(p.amount), 0) || 0;

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

      // Aliyot breakdown
      const paidAliyot = aliyotData?.filter(a => a.status === 'paid').length || 0;
      const pendingAliyot = aliyotData?.filter(a => a.status === 'pending').length || 0;
      const waivedAliyot = aliyotData?.filter(a => a.status === 'waived').length || 0;

      return {
        thisMonthTotal,
        lastMonthTotal,
        monthlyChange: Number(monthlyChange),
        membersCount: membersCount || 0,
        totalAliyot: aliyotData?.length || 0,
        paidAliyot,
        pendingAliyot,
        waivedAliyot,
        bitPayments,
        cashPayments,
        monthlyData,
      };
    },
  });

  const paymentMethodData = [
    { name: 'ביט', value: stats?.bitPayments || 0, color: '#9333ea' },
    { name: 'מזומן', value: stats?.cashPayments || 0, color: '#22c55e' },
  ];

  const aliyotStatusData = [
    { name: 'שולם', value: stats?.paidAliyot || 0, color: '#22c55e' },
    { name: 'ממתין', value: stats?.pendingAliyot || 0, color: '#eab308' },
    { name: 'וויתור', value: stats?.waivedAliyot || 0, color: '#94a3b8' },
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
        <Button onClick={handleExportExcel} variant="outline" className="gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          ייצוא לאקסל
        </Button>
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

        <Card className="glass-card">
          <CardContent className="p-4">
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center mb-2">
                  <BookOpen className="w-5 h-5 text-accent-foreground" />
                </div>
                <p className="text-2xl font-bold">{stats?.totalAliyot}</p>
                <p className="text-sm text-muted-foreground">סה״כ עליות</p>
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
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center mb-2">
                  <Calendar className="w-5 h-5 text-warning" />
                </div>
                <p className="text-2xl font-bold">{stats?.pendingAliyot}</p>
                <p className="text-sm text-muted-foreground">ממתינים לתשלום</p>
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

        {/* Aliyot Status */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">סטטוס עליות</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="flex flex-wrap justify-center gap-8">
                {aliyotStatusData.map((item) => (
                  <div key={item.name} className="text-center">
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-2"
                      style={{ background: `${item.color}20` }}
                    >
                      <span className="text-2xl font-bold" style={{ color: item.color }}>
                        {item.value}
                      </span>
                    </div>
                    <p className="font-medium">{item.name}</p>
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
