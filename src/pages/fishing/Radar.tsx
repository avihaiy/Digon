import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { databases, APPWRITE_DB_ID, APPWRITE_CATCHES_ID } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { MapPin, Target, Flame, Activity } from "lucide-react";
import { motion } from "framer-motion";

export default function Radar() {
  const { profileData, points, updateProfileField, loading: authLoading } = useAuth();
  const [scanning, setScanning] = useState(true);
  const [unlocking, setUnlocking] = useState(false);

  const isUnlocked = profileData?.radar_unlocked === true;

  const handleUnlock = async () => {
    if (points < 50) {
      toast.error("אין לך מספיק נקודות לפתוח את הראדאר!");
      return;
    }
    setUnlocking(true);
    const success = await updateProfileField('radar_unlocked', true);
    if (success) {
      updateProfileField('points', points - 50);
      toast.success("הראדאר נפתח עבורך לתמיד! 🎯");
    } else {
      toast.error("שגיאה בפתיחת הראדאר");
    }
    setUnlocking(false);
  };

  const { data: hotspots, isLoading } = useQuery({
    queryKey: ["hotspots"],
    queryFn: async () => {
      try {
        const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_CATCHES_ID, [
          Query.orderDesc("$createdAt"),
          Query.limit(50) // Last 50 catches
        ]);
        
        // Group by location
        const locationCounts: Record<string, { count: number, fishTypes: Set<string> }> = {};
        
        res.documents.forEach((doc: any) => {
          if (doc.status !== 'approved') return;
          const loc = doc.location || "לא ידוע";
          if (!locationCounts[loc]) {
            locationCounts[loc] = { count: 0, fishTypes: new Set() };
          }
          locationCounts[loc].count += 1;
          if (doc.fish_type) {
            locationCounts[loc].fishTypes.add(doc.fish_type);
          }
        });

        // Convert to array and sort by count (hottest first)
        const sortedHotspots = Object.keys(locationCounts)
          .map(loc => ({
            name: loc,
            count: locationCounts[loc].count,
            topFish: Array.from(locationCounts[loc].fishTypes).slice(0, 3)
          }))
          .sort((a, b) => b.count - a.count)
          .filter(loc => loc.name !== "לא ידוע");

        return sortedHotspots;
      } catch (e) {
        return [];
      }
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => setScanning(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto min-h-[calc(100vh-80px)] flex flex-col">
      
      {/* Header */}
      <div className="flex flex-col px-4 mt-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          רדאר נקודות חמות <Target className="w-6 h-6 text-rose-500" />
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          איפה יש תנועה של דגים עכשיו?
        </p>
      </div>

      {!isUnlocked && !authLoading ? (
        <div className="px-4 mt-8">
          <Card className="border-rose-500/30 bg-rose-500/5 text-center">
            <CardContent className="p-8">
              <div className="w-20 h-20 bg-rose-500/20 rounded-full mx-auto flex items-center justify-center mb-4">
                <Target className="w-10 h-10 text-rose-500" />
              </div>
              <h2 className="text-xl font-bold mb-2">ראדאר סודי נעול</h2>
              <p className="text-muted-foreground text-sm mb-6">
                גלה בדיוק איפה תופסים דגים ברגע זה. הראדאר סורק נתונים מהקהילה ומציג את החופים הכי חמים לדיג!
              </p>
              <Button 
                onClick={handleUnlock} 
                disabled={unlocking || points < 50}
                className="w-full h-14 text-lg font-bold bg-rose-500 hover:bg-rose-600 rounded-2xl"
              >
                פתח לצמיתות (50 🪙)
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <div className="px-4">
            {/* Radar Animation Area */}
            <div className="relative w-full aspect-square max-w-[300px] mx-auto my-8 bg-slate-900 rounded-full overflow-hidden border-4 border-slate-800 shadow-[0_0_30px_rgba(225,29,72,0.3)]">
              {/* Grid lines */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-[1px] bg-emerald-500/20" />
                <div className="absolute h-full w-[1px] bg-emerald-500/20" />
                <div className="absolute w-[33%] h-[33%] rounded-full border border-emerald-500/20" />
                <div className="absolute w-[66%] h-[66%] rounded-full border border-emerald-500/20" />
              </div>

              {/* Sweeping scanner */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                className="absolute inset-0 origin-center"
                style={{
                  background: "conic-gradient(from 0deg, transparent 70%, rgba(16, 185, 129, 0.4) 100%)",
                }}
              />

              {/* Blips (Dots) */}
              {!scanning && hotspots && hotspots.slice(0, 5).map((spot, i) => {
                // Random position for visual effect
                const angle = Math.random() * Math.PI * 2;
                const distance = 20 + Math.random() * 30; // 20% to 50% from center
                const top = 50 + Math.sin(angle) * distance;
                const left = 50 + Math.cos(angle) * distance;
                
                return (
                  <motion.div
                    key={spot.name}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: [0, 1, 0.5, 1], scale: [0, 1.2, 1, 1] }}
                    transition={{ duration: 1, delay: i * 0.3 }}
                    className="absolute w-3 h-3 bg-rose-500 rounded-full shadow-[0_0_10px_rgba(225,29,72,1)]"
                    style={{ top: `${top}%`, left: `${left}%`, transform: 'translate(-50%, -50%)' }}
                  />
                );
              })}
              
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                {scanning ? (
                  <span className="text-emerald-400 font-mono text-sm tracking-widest animate-pulse">סורק...</span>
                ) : (
                  <span className="text-emerald-500/50 font-mono text-xs tracking-widest">LIVE RADAR</span>
                )}
              </div>
            </div>
          </div>

          <div className="px-4 flex-1">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Flame className="w-5 h-5 text-rose-500" /> רותח עכשיו בקהילה
        </h3>
        
        <div className="space-y-3">
          {isLoading || scanning ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-20 bg-muted/50 rounded-2xl animate-pulse" />
            ))
          ) : hotspots?.length === 0 ? (
            <div className="text-center p-8 bg-muted/30 rounded-3xl">
              <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">אין מספיק נתונים כרגע כדי לזהות מוקדים חמים.</p>
            </div>
          ) : (
            hotspots?.map((spot, i) => (
              <motion.div
                key={spot.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className={`border-border/50 shadow-sm overflow-hidden ${i === 0 ? 'bg-rose-500/5 border-rose-500/20' : ''}`}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {i === 0 && <Flame className="w-4 h-4 text-rose-500" />}
                        <span className="font-bold text-base">{spot.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {spot.topFish.map(f => (
                          <Badge key={f} variant="outline" className="text-[10px] bg-background">{f}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-center">
                        <span className="block text-xl font-black text-rose-500">{spot.count}</span>
                        <span className="block text-[10px] text-muted-foreground uppercase">תפיסות</span>
                      </div>
                      <MapPin className="w-5 h-5 text-muted-foreground/30" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
          </div>
        </div>
        </>
      )}
    </div>
  );
}
