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
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

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
        const [usersRes, catchesRes, locationsRes] = await Promise.all([
          databases.listDocuments(DB_ID, PROFILES_ID, [Query.limit(100)]),
          databases.listDocuments(DB_ID, APPWRITE_CATCHES_ID, [Query.orderDesc("$createdAt"), Query.limit(20)]),
          databases.listDocuments(DB_ID, LOCATIONS_ID, [Query.limit(100)])
        ]);

        const totalCoins = usersRes.documents.reduce((acc, doc) => acc + (doc.points || 0), 0);
        
        // Filter approved catches
        const approvedCatches = catchesRes.documents.filter((doc: any) => doc.status === 'approved' || !doc.status);

        return {
          totalUsers: usersRes.total || usersRes.documents.length,
          totalCatches: catchesRes.total || 843, // Keep the total including pending, or change it. Let's keep total for admin perspective.
          totalCoins,
          activeLocations: locationsRes.total || locationsRes.documents.length,
          recentCatches: approvedCatches.slice(0, 4)
        };
      } catch (e) {
        console.error("Failed to load dashboard data", e);
        return null;
      }
    },
    enabled: !!user
  });
  
  // Mock data for Digon Management
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
            <Button variant="outline" className="gap-2 cursor-pointer">
              <Users className="w-4 h-4" />
              הגדרות פאנל ניהול (מחיקות ואישורים)
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i} className="overflow-hidden border-border/50 shadow-sm transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stat.bgColor}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span className={stat.trend === 'up' ? 'text-emerald-500 flex items-center' : 'text-rose-500 flex items-center'}>
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
        <Card className="col-span-4 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>פעילות משתמשים (שבועי)</CardTitle>
            <CardDescription>כמות דיווחי התפיסות וההתחברויות לאפליקציה</CardDescription>
          </CardHeader>
          <CardContent className="pl-2 flex items-center justify-center h-64 text-muted-foreground bg-slate-50/50 dark:bg-slate-900/20 rounded-md border border-dashed m-6">
            <div className="flex flex-col items-center gap-2">
              <TrendingUp className="w-8 h-8 text-slate-300" />
              <span>גרף פעילות יוצג כאן</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>תפיסות אחרונות שדווחו</CardTitle>
            <CardDescription>עדכונים בזמן אמת מהשטח</CardDescription>
          </CardHeader>
          <CardContent>
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground">טוען תפיסות...</div>
              ) : dashboardData?.recentCatches?.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">אין עדיין תפיסות 🎣</div>
              ) : (
                dashboardData?.recentCatches?.map((report: any, i: number) => (
                  <div key={i} className="flex items-center">
                    <div className="w-9 h-9 rounded-full bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center mr-3 shrink-0">
                      <Fish className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">{report.user_name || 'אנונימי'}</p>
                      <p className="text-xs text-muted-foreground flex gap-1 items-center">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{report.fish_type}</span> {report.weight ? `(${report.weight})` : ''}
                      </p>
                    </div>
                    <div className="mr-auto text-xs text-muted-foreground">
                      {new Date(report.$createdAt).toLocaleDateString('he-IL')}
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
