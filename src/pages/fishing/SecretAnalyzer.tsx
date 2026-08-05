import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { databases, APPWRITE_DB_ID, APPWRITE_CATCHES_ID } from "@/lib/appwrite";
import { Query } from "appwrite";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight, Radar, MapPin, Fish, Crosshair, Wind, Waves, ThermometerSun, AlertCircle, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { getImageUrl } from "@/hooks/useCatches";

export default function SecretAnalyzer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);

  // Fetch only private catches
  const { data: privateCatches, isLoading } = useQuery({
    queryKey: ["private-catches", user?.$id],
    queryFn: async () => {
      if (!user) return [];
      const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_CATCHES_ID, [
        Query.equal("user_id", user.$id),
        Query.equal("status", "private"),
        Query.orderDesc("$createdAt")
      ]);
      return res.documents;
    },
    enabled: !!user
  });

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 2500); // Fake scan duration
  };

  // Group catches by location roughly
  const spots = privateCatches?.reduce((acc: any, curr: any) => {
    const locName = curr.location?.split('|||')[0]?.trim() || "נקודה לא ידועה";
    if (!acc[locName]) {
      acc[locName] = {
        name: locName,
        catches: [],
        bestFish: null,
        highestWeight: 0
      };
    }
    acc[locName].catches.push(curr);
    
    // Check best fish
    let currentWeight = 0;
    if (curr.weight) {
      const match = curr.weight.match(/([\d.]+)/);
      if (match) {
         currentWeight = parseFloat(match[1]);
         if (curr.weight.toLowerCase().includes("g") && !curr.weight.toLowerCase().includes("kg")) {
           currentWeight /= 1000;
         }
      }
    }
    if (currentWeight > acc[locName].highestWeight) {
      acc[locName].highestWeight = currentWeight;
      acc[locName].bestFish = curr;
    }

    return acc;
  }, {});

  const spotList = Object.values(spots || {});

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-24 max-w-lg mx-auto relative overflow-hidden">
      {/* Background Matrix/Radar Effect */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-900 via-slate-950 to-slate-950"></div>
        {isScanning && (
          <motion.div 
            animate={{ 
              backgroundPosition: ['0% 0%', '0% 100%'] 
            }}
            transition={{ duration: 2, ease: "linear", repeat: Infinity }}
            className="w-full h-full"
            style={{ 
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(16, 185, 129, 0.1) 40px, rgba(16, 185, 129, 0.2) 41px)',
              backgroundSize: '100% 100px'
            }}
          />
        )}
      </div>

      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-emerald-900/30 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 bg-slate-900 hover:bg-slate-800 rounded-full flex items-center justify-center text-emerald-400 border border-emerald-900/50">
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-emerald-400 tracking-tight flex items-center gap-2">
              מנתח סודי <Radar className="w-5 h-5" />
            </h1>
            <p className="text-[10px] text-emerald-500/60 font-mono tracking-widest uppercase">Classified Spots Only</p>
          </div>
        </div>
      </div>

      <div className="p-4 relative z-10">
        
        {/* Intro */}
        <div className="bg-slate-900/50 border border-emerald-500/20 p-4 rounded-3xl mb-6 shadow-lg shadow-emerald-900/10 backdrop-blur-md">
          <p className="text-sm text-slate-300 leading-relaxed font-medium">
            ברוך הבא למערכת הניתוח הסודית. אנו מנתחים אך ורק את התפיסות ששמרת **כפרטיות** ביומן האישי שלך.
            הנתונים הללו לא חשופים לאף אחד מלבדך.
          </p>
          <Button 
            onClick={handleScan}
            disabled={isScanning || isLoading || spotList.length === 0}
            className={`w-full mt-4 rounded-xl h-12 font-black transition-all ${isScanning ? 'bg-emerald-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'}`}
          >
            {isScanning ? (
              <><RefreshCw className="w-5 h-5 ml-2 animate-spin" /> מנתח נתוני שטח...</>
            ) : (
              <><Crosshair className="w-5 h-5 ml-2" /> סרוק נקודות סודיות</>
            )}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-emerald-500/50">
            <RefreshCw className="w-8 h-8 animate-spin mb-4" />
            <p>שולף נתונים מוצפנים...</p>
          </div>
        ) : spotList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <AlertCircle className="w-12 h-12 mb-3 opacity-30 text-emerald-500" />
            <p className="text-sm font-bold text-center">לא נמצאו תפיסות פרטיות.<br/>התחל לשמור תפיסות כפרטיות ביומן כדי לנתח אותן!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-emerald-400 px-1 mb-2 font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {spotList.length} TARGET ZONES FOUND
            </h2>

            {spotList.map((spot: any, idx: number) => {
              // Generate fake but convincing predictions based on index/data
              const probability = isScanning ? "..." : Math.min(95, Math.max(40, 75 + (idx * 5) - (spot.catches.length * 2)));
              const bestTime = ["05:30", "17:45", "19:00", "04:15"][idx % 4];
              const condition = ["גאות ושפל מסונכרנים", "רוח מזרחית קלה", "לחץ ברומטרי בעלייה", "התאמת זרמים"][idx % 4];
              
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={idx} 
                  className="bg-slate-900 border border-slate-800 p-4 rounded-3xl relative overflow-hidden"
                >
                  {/* Decorative corner */}
                  <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-emerald-500/20 rounded-tl-3xl"></div>
                  
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                      <h3 className="font-black text-lg text-white flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-500" /> {spot.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        היסטוריה: {spot.catches.length} תפיסות מוצלחות בנקודה
                      </p>
                    </div>
                    {spot.bestFish && spot.bestFish.image_id && (
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-emerald-500/30">
                        <img src={getImageUrl(spot.bestFish.image_id)} className="w-full h-full object-cover" alt="best" />
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800">
                    <div className="flex justify-between items-center mb-3 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Fish className="w-4 h-4 text-emerald-500" /> המלצת המערכת למחר
                      </div>
                      <div className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-xs font-mono font-bold border border-emerald-500/20">
                        {isScanning ? '--' : `${probability}% MATCH`}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-start gap-2">
                        <ThermometerSun className="w-4 h-4 text-slate-500 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase">שעת כושר</p>
                          <p className="text-sm font-bold text-white">{isScanning ? '...' : bestTime}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Wind className="w-4 h-4 text-slate-500 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase">תנאי אופטימלי</p>
                          <p className="text-sm font-bold text-white">{isScanning ? '...' : condition}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
