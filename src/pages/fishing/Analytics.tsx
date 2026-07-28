import { useCatches, getImageUrl } from "@/hooks/useCatches";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { Fish, MapPin, Scale, Trophy, CalendarDays, Activity } from "lucide-react";
import { motion } from "framer-motion";

export default function Analytics() {
  const { catches, isLoading } = useCatches();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Analytics Calculations
  const totalCatches = catches?.length || 0;
  
  const totalWeight = catches?.reduce((sum, current) => {
    return sum + (current.weight || 0);
  }, 0) || 0;

  // Most common fish
  const fishCounts = catches?.reduce((acc: any, curr) => {
    const name = curr.fish_type || 'לא ידוע';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  
  let mostCommonFish = 'אין נתונים';
  let mostCommonFishCount = 0;
  if (fishCounts) {
    Object.keys(fishCounts).forEach(key => {
      if (fishCounts[key] > mostCommonFishCount) {
        mostCommonFishCount = fishCounts[key];
        mostCommonFish = key;
      }
    });
  }

  // Data for Pie Chart (Fish Types)
  const pieData = Object.keys(fishCounts || {}).map(key => ({
    name: key,
    value: fishCounts[key]
  }));
  const COLORS = ['#0ea5e9', '#3b82f6', '#14b8a6', '#f59e0b', '#8b5cf6'];

  // Catches by Month (Mock simple aggregation by createAt)
  const monthCounts = catches?.reduce((acc: any, curr) => {
    const month = new Date(curr.$createdAt).toLocaleString('he-IL', { month: 'short' });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});
  
  const barData = Object.keys(monthCounts || {}).map(key => ({
    name: key,
    'תפיסות': monthCounts[key]
  }));

  // Biggest Catch
  let biggestCatch = catches?.[0] || null;
  catches?.forEach(c => {
    if ((c.weight || 0) > (biggestCatch?.weight || 0)) {
      biggestCatch = c;
    }
  });

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto min-h-[calc(100vh-80px)]">
      
      <div className="flex flex-col px-4 mt-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          הסטטיסטיקות שלי <Activity className="w-6 h-6 text-primary" />
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          ניתוח נתוני הדייג שלך לאורך זמן
        </p>
      </div>

      {totalCatches === 0 ? (
        <div className="px-4 text-center mt-12">
          <div className="bg-muted/30 rounded-3xl p-8 border border-border flex flex-col items-center justify-center">
            <Fish className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="font-bold text-lg mb-2">עוד אין מספיק נתונים</h3>
            <p className="text-sm text-muted-foreground">התחל לדווח על תפיסות כדי לראות את הסטטיסטיקות שלך מנותחות כאן!</p>
          </div>
        </div>
      ) : (
        <div className="px-4 space-y-4">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-border/50 shadow-sm bg-gradient-to-br from-blue-500/10 to-cyan-500/10 h-full">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <Fish className="w-6 h-6 text-blue-500 mb-2" />
                  <p className="text-3xl font-black text-slate-900 dark:text-white">{totalCatches}</p>
                  <p className="text-xs font-bold text-muted-foreground mt-1">סה״כ תפיסות</p>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-border/50 shadow-sm bg-gradient-to-br from-emerald-500/10 to-teal-500/10 h-full">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <Scale className="w-6 h-6 text-emerald-500 mb-2" />
                  <p className="text-3xl font-black text-slate-900 dark:text-white">{totalWeight.toFixed(1)}<span className="text-sm ms-1 text-muted-foreground">ק״ג</span></p>
                  <p className="text-xs font-bold text-muted-foreground mt-1">משקל כולל</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500/10 rounded-full text-amber-500">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground">הדג הנפוץ ביותר שלך</p>
                    <p className="font-black text-lg">{mostCommonFish}</p>
                  </div>
                </div>
                <div className="text-xl font-black text-amber-500">{mostCommonFishCount} <span className="text-xs font-normal">פעמים</span></div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Charts */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-primary" /> פילוג תפיסות לפי סוג דג
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {pieData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1 text-[10px] font-medium">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      {entry.name} ({entry.value})
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" /> תפיסות לפי חודש
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                      <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: 'transparent'}} />
                      <Bar dataKey="תפיסות" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

        </div>
      )}
    </div>
  );
}
