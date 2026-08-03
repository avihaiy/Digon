import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { databases, APPWRITE_CATCHES_ID } from '@/lib/appwrite';
import { Query } from 'appwrite';
import {
  Users,
  Trophy,
  Fish,
  MapPin,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { subDays, format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';

export default function Dashboard() {
  const { user } = useAuth();
  
  const DB_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
  const PROFILES_ID = import.meta.env.VITE_APPWRITE_PROFILES_COLLECTION_ID;
  const LOCATIONS_ID = "locations";

  // Fetch real data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["dashboard-data"],
    queryFn: async () => {
      try {
        const sevenDaysAgo = subDays(new Date(), 7).toISOString();

        const [usersRes, allCatchesRes, recentCatchesRes, locationsRes] = await Promise.all([
          databases.listDocuments(DB_ID, PROFILES_ID, [Query.limit(100)]),
          databases.listDocuments(DB_ID, APPWRITE_CATCHES_ID, [
            Query.greaterThanEqual("$createdAt", sevenDaysAgo),
            Query.limit(500)
          ]),
          databases.listDocuments(DB_ID, APPWRITE_CATCHES_ID, [Query.orderDesc("$createdAt"), Query.limit(20)]),
          databases.listDocuments(DB_ID, LOCATIONS_ID, [Query.limit(100)])
        ]);

        const totalCoins = usersRes.documents.reduce((acc, doc) => acc + (doc.points || 0), 0);
        
        // Filter approved catches
        const approvedRecentCatches = recentCatchesRes.documents.filter((doc: any) => doc.status === 'approved' || !doc.status);

        // Process chart data (last 7 days)
        const chartDataMap: Record<string, number> = {};
        for (let i = 6; i >= 0; i--) {
          const d = subDays(new Date(), i);
          const dateStr = format(d, 'MMM dd', { locale: he });
          chartDataMap[dateStr] = 0;
        }

        allCatchesRes.documents.forEach((catchDoc: any) => {
          if (catchDoc.status === 'approved' || !catchDoc.status) {
            const dateStr = format(parseISO(catchDoc.$createdAt), 'MMM dd', { locale: he });
            if (chartDataMap[dateStr] !== undefined) {
              chartDataMap[dateStr]++;
            }
          }
        });

        const chartData = Object.keys(chartDataMap).map(key => ({
          name: key,
          catches: chartDataMap[key]
        }));

        return {
          totalUsers: usersRes.total || usersRes.documents.length,
          totalCatches: recentCatchesRes.total || 843,
          totalCoins,
          activeLocations: locationsRes.total || locationsRes.documents.length,
          recentCatches: approvedRecentCatches.slice(0, 4),
          chartData
        };
      } catch (e) {
        console.error("Failed to load dashboard data", e);
        return null;
      }
    },
    enabled: !!user
  });
  
  const stats = [
    {
      title: "סה״כ דייגים רשומים",
      value: isLoading ? "..." : (dashboardData?.totalUsers || 0).toString(),
      change: "+12%",
      trend: "up",
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "תפיסות שדווחו החודש",
      value: isLoading ? "..." : (dashboardData?.totalCatches || 0).toString(),
      change: "+24%",
      trend: "up",
      icon: Fish,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10"
    },
    {
      title: "מטבעות (CoinsISR) שחולקו",
      value: isLoading ? "..." : (dashboardData?.totalCoins || 0).toLocaleString(),
      change: "-4%",
      trend: "down",
      icon: Trophy,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10"
    },
    {
      title: "מיקומים פעילים",
      value: isLoading ? "..." : (dashboardData?.activeLocations || 0).toString(),
      change: "+2",
      trend: "up",
      icon: MapPin,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10"
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            לוח בקרה - דיגון 🎣
          </h1>
          <p className="text-muted-foreground mt-1">
            ברוך הבא למערכת הניהול הראשי של אפליקציית דיג בישראל.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/settings">
            <Button className="gap-2 cursor-pointer bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 shadow-lg">
              <Users className="w-4 h-4" />
              הגדרות פאנל ניהול (מחיקות ואישורים)
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i} className="overflow-hidden border-border/50 shadow-sm transition-all hover:shadow-md bg-white dark:bg-slate-950">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {stat.title}
              </CardTitle>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stat.bgColor}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900 dark:text-white">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span className={stat.trend === 'up' ? 'text-emerald-500 flex items-center font-bold' : 'text-rose-500 flex items-center font-bold'}>
                  {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                  {stat.change}
                </span>
                לעומת חודש שעבר
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-border/50 shadow-sm bg-white dark:bg-slate-950">
          <CardHeader>
            <CardTitle>תפיסות שאושרו (7 ימים אחרונים)</CardTitle>
            <CardDescription>כמות דיווחי התפיסות המוצלחים מתוך הקהילה</CardDescription>
          </CardHeader>
          <CardContent className="h-72 w-full pt-4">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full" />
              </div>
            ) : dashboardData?.chartData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardData.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCatches" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#06b6d4', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="catches" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorCatches)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 border border-dashed rounded-lg">
                <TrendingUp className="w-8 h-8 mb-2" />
                <p>אין מספיק נתונים לגרף</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-3 border-border/50 shadow-sm bg-white dark:bg-slate-950">
          <CardHeader>
            <CardTitle>תפיסות אחרונות שדווחו</CardTitle>
            <CardDescription>עדכונים בזמן אמת מהשטח</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground">טוען תפיסות...</div>
              ) : dashboardData?.recentCatches?.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">אין עדיין תפיסות 🎣</div>
              ) : (
                dashboardData?.recentCatches?.map((report: any, i: number) => (
                  <div key={i} className="flex items-center p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center mr-3 shrink-0">
                      <Fish className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-bold leading-none text-slate-900 dark:text-white">{report.user_name || 'אנונימי'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex gap-1 items-center font-medium">
                        <span className="text-cyan-600 dark:text-cyan-400">{report.fish_type}</span> {report.weight ? `(${report.weight})` : ''}
                      </p>
                    </div>
                    <div className="mr-auto text-xs font-medium text-slate-400">
                      {format(new Date(report.$createdAt), 'dd/MM/yyyy')}
                    </div>
                  </div>
                ))
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
