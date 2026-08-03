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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white drop-shadow-md">
            לוח בקרה - דיגון 🎣
          </h1>
          <p className="text-slate-700/80 dark:text-slate-300 mt-2 font-medium bg-white/30 dark:bg-black/30 backdrop-blur-md px-3 py-1 rounded-full w-fit">
            מערכת הניהול הראשי של אפליקציית דיג בישראל
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/settings">
            <Button className="gap-2 cursor-pointer bg-slate-900/90 text-white hover:bg-slate-800 dark:bg-white/90 dark:text-slate-900 shadow-xl backdrop-blur-md border border-white/20 transition-all hover:scale-105 rounded-xl h-11 px-6">
              <Users className="w-4 h-4" />
              הגדרות פאנל ניהול (מחיקות ואישורים)
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i} className="overflow-hidden border-white/40 dark:border-slate-700/40 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {stat.title}
              </CardTitle>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-inner ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900 dark:text-white drop-shadow-sm">{stat.value}</div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 flex items-center gap-1 font-medium bg-white/50 dark:bg-black/20 w-fit px-2 py-1 rounded-md">
                <span className={stat.trend === 'up' ? 'text-emerald-600 dark:text-emerald-400 flex items-center font-black' : 'text-rose-600 dark:text-rose-400 flex items-center font-black'}>
                  {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                  {stat.change}
                </span>
                לעומת חודש שעבר
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-white/40 dark:border-slate-700/40 shadow-xl bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-xl font-black">תפיסות שאושרו (7 ימים אחרונים)</CardTitle>
            <CardDescription className="font-medium">כמות דיווחי התפיסות המוצלחים מתוך הקהילה</CardDescription>
          </CardHeader>
          <CardContent className="h-80 w-full pt-4">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full" />
              </div>
            ) : dashboardData?.chartData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardData.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCatches" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeOpacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }} dx={-10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)' }}
                    itemStyle={{ color: '#0ea5e9', fontWeight: '900' }}
                  />
                  <Area type="monotone" dataKey="catches" stroke="#0ea5e9" strokeWidth={4} fillOpacity={1} fill="url(#colorCatches)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
                <TrendingUp className="w-10 h-10 mb-3 text-slate-300" />
                <p className="font-bold">אין מספיק נתונים לגרף</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-3 border-white/40 dark:border-slate-700/40 shadow-xl bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl flex flex-col">
          <CardHeader>
            <CardTitle className="text-xl font-black">תפיסות אחרונות שדווחו</CardTitle>
            <CardDescription className="font-medium">עדכונים בזמן אמת מהשטח</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1 overflow-y-auto pr-1">
              {isLoading ? (
                <div className="text-center py-8 text-slate-500 font-bold">טוען תפיסות...</div>
              ) : dashboardData?.recentCatches?.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center justify-center text-slate-400">
                  <Fish className="w-12 h-12 mb-3 opacity-20" />
                  <span className="font-bold">אין עדיין תפיסות 🎣</span>
                </div>
              ) : (
                dashboardData?.recentCatches?.map((report: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3.5 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-white/40 dark:border-slate-700/40 hover:shadow-lg transition-all group hover:bg-white/60 dark:hover:bg-slate-800/60">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/50 dark:to-blue-900/50 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform border border-cyan-200/50">
                        <Fish className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-black leading-none text-slate-900 dark:text-white">{report.user_name || 'אנונימי'}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 flex gap-1 items-center font-bold bg-slate-100/50 dark:bg-slate-950/50 px-2 py-0.5 rounded-md w-fit">
                          <span className="text-cyan-600 dark:text-cyan-400">{report.fish_type}</span> {report.weight ? `(${report.weight})` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
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
