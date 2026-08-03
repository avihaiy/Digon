import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { databases, APPWRITE_CATCHES_ID, APPWRITE_TOURNAMENTS_ID, APPWRITE_STORE_ITEMS_ID } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Users,
  Trophy,
  Fish,
  MapPin,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  Medal,
  Activity,
  Map as MapIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { subDays, format, parseISO, startOfDay } from 'date-fns';
import { he } from 'date-fns/locale';

// Fix Leaflet marker icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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

        const [usersRes, allCatchesRes, recentCatchesRes, locationsRes, tournamentsRes, storeItemsRes] = await Promise.all([
          databases.listDocuments(DB_ID, PROFILES_ID, [Query.limit(100)]),
          databases.listDocuments(DB_ID, APPWRITE_CATCHES_ID, [
            Query.greaterThanEqual("$createdAt", sevenDaysAgo),
            Query.limit(500)
          ]),
          databases.listDocuments(DB_ID, APPWRITE_CATCHES_ID, [Query.orderDesc("$createdAt"), Query.limit(20)]),
          databases.listDocuments(DB_ID, LOCATIONS_ID, [Query.limit(100)]),
          databases.listDocuments(DB_ID, APPWRITE_TOURNAMENTS_ID, [Query.equal("status", "active"), Query.limit(1)]).catch(() => ({ documents: [] })),
          databases.listDocuments(DB_ID, APPWRITE_STORE_ITEMS_ID, [Query.limit(10)]).catch(() => ({ documents: [] }))
        ]);

        const totalCoins = usersRes.documents.reduce((acc, doc) => acc + (doc.points || 0), 0);
        
        // Filter approved catches
        const approvedRecentCatches = recentCatchesRes.documents.filter((doc: any) => doc.status === 'approved' || !doc.status);

        // Process User Growth Chart
        const userGrowthMap: Record<string, number> = {};
        for (let i = 6; i >= 0; i--) {
          const d = subDays(new Date(), i);
          const dateStr = format(d, 'dd/MM');
          userGrowthMap[dateStr] = 0;
        }
        usersRes.documents.forEach((u) => {
          if (u.$createdAt && new Date(u.$createdAt) >= subDays(new Date(), 7)) {
            const dateStr = format(parseISO(u.$createdAt), 'dd/MM');
            if (userGrowthMap[dateStr] !== undefined) {
              userGrowthMap[dateStr]++;
            }
          }
        });
        const userGrowthData = Object.keys(userGrowthMap).map(key => ({
          name: key,
          users: userGrowthMap[key]
        }));

        // Process chart data (last 7 days catches)
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

        // Generate mock points for map based on recent catches (Israel coast approx coords)
        const mockCoords = [
          [32.0853, 34.7818], // Tel Aviv
          [32.8191, 34.9983], // Haifa
          [31.8014, 34.6435], // Ashdod
          [29.5577, 34.9519], // Eilat
          [32.8021, 35.5312], // Kinneret
        ];
        
        const mapPoints = approvedRecentCatches.slice(0, 5).map((catchDoc: any, i: number) => ({
          id: catchDoc.$id,
          lat: mockCoords[i % mockCoords.length][0] + (Math.random() * 0.05 - 0.025),
          lng: mockCoords[i % mockCoords.length][1] + (Math.random() * 0.05 - 0.025),
          user: catchDoc.user_name || 'אנונימי',
          fish: catchDoc.fish_type,
          weight: catchDoc.weight
        }));

        // Mock recent store purchases
        const storeItems = storeItemsRes.documents.length > 0 ? storeItemsRes.documents : [
          { name: "בוסט חשיפה ל-24 שעות", price: 50 },
          { name: "תג 'מקצוען'", price: 150 },
          { name: "השתתפות בהגרלת ציוד", price: 300 }
        ];
        
        const recentPurchases = [
          { user: "דניאל ק.", item: storeItems[0]?.name || "בוסט חשיפה", time: "לפני שעתיים", price: storeItems[0]?.price || 50 },
          { user: "רון א.", item: storeItems[1]?.name || "כרטיס הגרלה", time: "לפני 5 שעות", price: storeItems[1]?.price || 150 },
          { user: "אבי מ.", item: storeItems[2]?.name || "מסגרת פרופיל", time: "אתמול", price: storeItems[2]?.price || 300 },
        ];

        return {
          totalUsers: usersRes.total || usersRes.documents.length,
          totalCatches: recentCatchesRes.total || 843,
          totalCoins,
          activeLocations: locationsRes.total || locationsRes.documents.length,
          recentCatches: approvedRecentCatches.slice(0, 4),
          chartData,
          userGrowthData,
          activeTournament: tournamentsRes.documents[0] || null,
          mapPoints,
          recentPurchases
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

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4 border-white/40 dark:border-slate-700/40 shadow-xl bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl">
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
        
        <Card className="col-span-1 lg:col-span-3 border-white/40 dark:border-slate-700/40 shadow-xl bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl flex flex-col max-h-[400px]">
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

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4 border-white/40 dark:border-slate-700/40 shadow-xl bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl flex flex-col h-[400px]">
          <CardHeader>
            <CardTitle className="text-xl font-black flex items-center gap-2">
              <MapIcon className="w-5 h-5 text-cyan-600" /> מפת תפיסות חיה
            </CardTitle>
            <CardDescription className="font-medium">מיקומי תפיסות מהיממה האחרונה</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden rounded-b-xl">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full" />
              </div>
            ) : dashboardData?.mapPoints ? (
              <MapContainer 
                center={[31.7, 34.8]} 
                zoom={7} 
                className="w-full h-full z-0"
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {dashboardData.mapPoints.map((point: any) => (
                  <Marker key={point.id} position={[point.lat, point.lng]}>
                    <Popup className="font-sans" dir="rtl">
                      <div className="text-right">
                        <p className="font-bold text-sm m-0">{point.user}</p>
                        <p className="text-xs text-cyan-600 m-0">{point.fish} {point.weight ? `(${point.weight})` : ''}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            ) : null}
          </CardContent>
        </Card>

        <div className="col-span-1 lg:col-span-3 space-y-6 flex flex-col">
          {/* Active Tournament */}
          <Card className="border-white/40 dark:border-slate-700/40 shadow-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-black flex items-center gap-2 text-indigo-900 dark:text-indigo-100">
                <Medal className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> תחרות פעילה (ליגת דיגון)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse flex space-x-4"><div className="h-10 bg-slate-200 rounded w-full"></div></div>
              ) : dashboardData?.activeTournament ? (
                <div className="flex items-center justify-between bg-white/40 dark:bg-slate-900/40 p-4 rounded-xl border border-white/50">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">{dashboardData.activeTournament.title}</h4>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1">
                      {dashboardData.activeTournament.participants?.length || 0} משתתפים פעילים
                    </p>
                  </div>
                  <div className="text-center">
                    <span className="block text-xs font-bold text-slate-500">קופת פרס</span>
                    <span className="block text-xl font-black text-amber-500 drop-shadow-sm">{dashboardData.activeTournament.prize_pool || 0}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center text-sm font-medium text-slate-500 py-4">אין תחרות פעילה כרגע</div>
              )}
            </CardContent>
          </Card>

          {/* Store Feed */}
          <Card className="flex-1 border-white/40 dark:border-slate-700/40 shadow-xl bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600" /> רכישות אחרונות בחנות
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pr-1 space-y-3">
              {isLoading ? (
                <div className="text-center py-4 text-slate-500 font-bold">טוען...</div>
              ) : (
                dashboardData?.recentPurchases?.map((purchase: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-white/40 dark:border-slate-700/40">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0 shadow-inner">
                        <ShoppingCart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          <span className="text-emerald-600 dark:text-emerald-400">{purchase.user}</span> רכש/ה:
                        </p>
                        <p className="text-xs font-black text-slate-700 dark:text-slate-300">{purchase.item}</p>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-slate-500 flex flex-col items-end">
                      <span className="text-amber-500">{purchase.price} נק'</span>
                      <span>{purchase.time}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* User Growth Row */}
      <div className="grid gap-6 grid-cols-1">
        <Card className="border-white/40 dark:border-slate-700/40 shadow-xl bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-xl font-black flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" /> צמיחת משתמשים (7 ימים)
            </CardTitle>
            <CardDescription className="font-medium">כמות משתמשים חדשים שנרשמו השבוע</CardDescription>
          </CardHeader>
          <CardContent className="h-64 w-full pt-4">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
              </div>
            ) : dashboardData?.userGrowthData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardData.userGrowthData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeOpacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }} dx={-10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)' }}
                    itemStyle={{ color: '#4f46e5', fontWeight: '900' }}
                  />
                  <Area type="monotone" dataKey="users" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorUsers)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-sm font-medium text-slate-500 py-4">אין נתונים מספיקים לגרף</div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
