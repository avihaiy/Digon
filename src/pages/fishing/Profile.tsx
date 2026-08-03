import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { databases, APPWRITE_DB_ID, APPWRITE_PROFILES_ID, APPWRITE_CATCHES_ID } from "@/lib/appwrite";
import { Query } from "appwrite";
import { BadgeIcon } from "@/components/fishing/BadgeIcon";
import { getImageUrl } from "@/hooks/useCatches";
import { 
  ArrowRight, Trophy, Fish, Star, MapPin, Scale, 
  UserPlus, Check, Users, MessageCircle, Camera, Calendar, Grid, BarChart3, Medal, ExternalLink
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFollowers } from "@/hooks/useFollowers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

type Tab = 'gallery' | 'stats' | 'badges';

export default function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { followersCount, followingCount, isFollowing, toggleFollow, isToggling } = useFollowers(userId || "");
  const [selectedCatch, setSelectedCatch] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>('gallery');

  // Fetch Profile
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_PROFILES_ID, [
        Query.equal("user_id", userId),
        Query.limit(1)
      ]);
      return res.documents[0] || null;
    },
    enabled: !!userId
  });

  // Fetch User Catches
  const { data: catches = [], isLoading: isCatchesLoading } = useQuery({
    queryKey: ["catches", userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_CATCHES_ID, [
        Query.equal("user_id", userId),
        Query.equal("status", "approved"),
        Query.orderDesc("$createdAt")
      ]);
      return res.documents;
    },
    enabled: !!userId
  });

  if (isProfileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background max-w-lg mx-auto">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground max-w-lg mx-auto">
        <h2 className="text-xl font-bold mb-4">פרופיל לא נמצא</h2>
        <button onClick={() => navigate(-1)} className="text-primary hover:underline font-bold">חזור אחורה</button>
      </div>
    );
  }

  const badges = (profile.badges as string[]) || [];

  // Calculate Stats
  let mostCaughtSpecies = "אין מידע";
  let biggestCatchWeight = "אין מידע";

  if (catches.length > 0) {
    const speciesCount: Record<string, number> = {};
    let maxWeight = 0;

    catches.forEach((c: any) => {
      if (c.fish_type) {
        speciesCount[c.fish_type] = (speciesCount[c.fish_type] || 0) + 1;
      }
      
      if (c.weight) {
        const match = c.weight.match(/([\d.]+)/);
        if (match) {
          let val = parseFloat(match[1]);
          if (c.weight.toLowerCase().includes("g") && !c.weight.toLowerCase().includes("kg")) {
            val = val / 1000;
          }
          if (val > maxWeight) {
            maxWeight = val;
            biggestCatchWeight = c.weight;
          }
        }
      }
    });

    if (Object.keys(speciesCount).length > 0) {
      mostCaughtSpecies = Object.keys(speciesCount).reduce((a, b) => speciesCount[a] > speciesCount[b] ? a : b);
    }
  }

  const isOwnProfile = currentUser?.$id === userId;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black pb-24 max-w-lg mx-auto animate-in fade-in duration-500 shadow-2xl relative overflow-x-hidden">
      
      {/* 1. HERO SECTION (Native App Style) */}
      <div className="relative">
        {/* Cover Image */}
        <div className="h-56 bg-slate-900 w-full relative">
          <div className="absolute inset-0 bg-[url('/fishing_sunset_bg.jpg')] opacity-40 bg-cover bg-center"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          
          {/* Back Button */}
          <button 
            onClick={() => navigate(-1)}
            className="absolute top-4 right-4 w-10 h-10 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center z-20 border border-white/10"
          >
            <ArrowRight className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Floating Profile Card */}
        <div className="px-4 -mt-16 relative z-10">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xl ring-1 ring-black/5 dark:ring-white/10 flex flex-col items-center text-center">
            
            {/* Avatar */}
            <div className={cn(
              "w-28 h-28 -mt-16 mb-3 rounded-[2rem] bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-xl flex items-center justify-center text-4xl font-black text-white transform rotate-3 transition-transform hover:rotate-0",
              profile.border === 'gold' ? 'ring-4 ring-yellow-400 ring-offset-4 ring-offset-white dark:ring-offset-slate-900 shadow-[0_0_30px_rgba(250,204,21,0.6)]' :
              profile.border === 'platinum' ? 'ring-4 ring-slate-300 ring-offset-4 ring-offset-white dark:ring-offset-slate-900 shadow-[0_0_30px_rgba(203,213,225,0.6)]' :
              profile.border === 'ocean' ? 'ring-4 ring-cyan-400 ring-offset-4 ring-offset-white dark:ring-offset-slate-900 shadow-[0_0_30px_rgba(34,211,238,0.6)]' :
              profile.border === 'fire' ? 'ring-4 ring-orange-500 ring-offset-4 ring-offset-white dark:ring-offset-slate-900 shadow-[0_0_30px_rgba(249,115,22,0.6)]' :
              'border-4 border-white dark:border-slate-900'
            )}>
              {profile.full_name?.charAt(0) || profile.user_name?.charAt(0) || "ד"}
            </div>

            {/* Name & Title */}
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {profile.full_name || profile.user_name || "דייג אנונימי"}
            </h1>
            {profile.title && (
              <span className="inline-flex items-center gap-1 mt-1 text-xs bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-400 px-2.5 py-0.5 rounded-full font-bold">
                <Trophy className="w-3 h-3" /> {profile.title}
              </span>
            )}

            {/* Core Stats Bar */}
            <div className="flex items-center justify-between w-full mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-col items-center flex-1">
                <span className="font-black text-lg text-slate-900 dark:text-white">{catches.length}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase">תפיסות</span>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-800"></div>
              <div className="flex flex-col items-center flex-1">
                <span className="font-black text-lg text-slate-900 dark:text-white">{followersCount}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase">עוקבים</span>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-800"></div>
              <div className="flex flex-col items-center flex-1">
                <span className="font-black text-lg text-amber-500">{profile.points || 0}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase">מוניטין</span>
              </div>
            </div>

            {/* Action Buttons */}
            {!isOwnProfile && currentUser && (
              <div className="flex gap-2 w-full mt-5">
                <Button
                  variant={isFollowing ? "outline" : "default"}
                  onClick={() => toggleFollow()}
                  disabled={isToggling}
                  className={`flex-1 rounded-2xl h-12 font-black ${isFollowing ? 'border-cyan-500/50 text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-950/30' : 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/25'}`}
                >
                  {isFollowing ? <><Check className="w-4 h-4 ml-2" /> נעקב</> : <><UserPlus className="w-4 h-4 ml-2" /> עקוב אחרו</>}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-2xl h-12 w-12 shrink-0 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  onClick={() => navigate('/fishing/messages')}
                >
                  <MessageCircle className="w-5 h-5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. TAB NAVIGATION (Sticky App-like Bar) */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 mt-4 px-2">
        <div className="flex items-center justify-between max-w-sm mx-auto">
          <button 
            onClick={() => setActiveTab('gallery')}
            className={`flex-1 py-4 flex flex-col items-center gap-1 relative ${activeTab === 'gallery' ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <Grid className="w-5 h-5" />
            <span className="text-[10px] font-black">גלריה</span>
            {activeTab === 'gallery' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-4 right-4 h-1 bg-cyan-500 rounded-t-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-4 flex flex-col items-center gap-1 relative ${activeTab === 'stats' ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] font-black">סטטיסטיקות</span>
            {activeTab === 'stats' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-4 right-4 h-1 bg-cyan-500 rounded-t-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('badges')}
            className={`flex-1 py-4 flex flex-col items-center gap-1 relative ${activeTab === 'badges' ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <Medal className="w-5 h-5" />
            <span className="text-[10px] font-black">הישגים</span>
            {activeTab === 'badges' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-4 right-4 h-1 bg-cyan-500 rounded-t-full" />}
          </button>
        </div>
      </div>

      {/* 3. TAB CONTENT */}
      <div className="pt-2 min-h-[50vh]">
        <AnimatePresence mode="wait">
          
          {/* GALLERY TAB */}
          {activeTab === 'gallery' && (
            <motion.div 
              key="gallery"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {catches.length > 0 ? (
                <div className="grid grid-cols-3 gap-0.5 w-full">
                  {catches.map((c: any) => (
                    <div 
                      key={c.$id} 
                      className="aspect-square bg-slate-200 dark:bg-slate-800 relative group cursor-pointer"
                      onClick={() => setSelectedCatch(c)}
                    >
                      {c.image_id ? (
                        <img 
                          src={getImageUrl(c.image_id)} 
                          alt="Catch" 
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-400">
                          <Fish className="w-6 h-6 opacity-30" />
                        </div>
                      )}
                      {/* Weight overlay icon */}
                      {c.weight && (
                        <div className="absolute top-1 right-1 bg-black/50 backdrop-blur-sm rounded px-1.5 py-0.5 text-[9px] font-bold text-white flex items-center gap-0.5">
                          <Scale className="w-2.5 h-2.5" />
                          {c.weight}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Camera className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-bold">אין תמונות עדיין</p>
                </div>
              )}
            </motion.div>
          )}

          {/* STATS TAB */}
          {activeTab === 'stats' && (
            <motion.div 
              key="stats"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-4 space-y-3"
            >
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center shrink-0">
                  <Fish className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">הדג הכי נפוץ</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white">{mostCaughtSpecies}</p>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Scale className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">משקל שיא</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white" dir="ltr">{biggestCatchWeight}</p>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                  <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">ממוצע תפיסות לחודש</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white">{catches.length > 0 ? (catches.length / 3).toFixed(1) : 0}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* BADGES TAB */}
          {activeTab === 'badges' && (
            <motion.div 
              key="badges"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-4"
            >
              {badges.length > 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    ארון הגביעים ({badges.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {badges.map((badgeId: string) => (
                      <BadgeIcon key={badgeId} badgeId={badgeId} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Medal className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-bold">אין תגיות עדיין</p>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* FULL SCREEN CATCH MODAL (Mobile Optimized) */}
      <Dialog open={!!selectedCatch} onOpenChange={(open) => !open && setSelectedCatch(null)}>
        <DialogContent className="max-w-md w-full h-[100dvh] md:h-[90vh] p-0 md:rounded-3xl border-0 bg-black shadow-2xl flex flex-col m-0">
          {selectedCatch && (
            <>
              {/* Image Section */}
              <div className="relative w-full flex-1 bg-black overflow-hidden flex items-center justify-center">
                {selectedCatch.image_id ? (
                  <img 
                    src={getImageUrl(selectedCatch.image_id)} 
                    alt={selectedCatch.fish_type} 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Fish className="w-20 h-20 text-white/20" />
                )}
                
                {/* Gradient Overlay for Text */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10 pointer-events-none" />
                
                {/* Close Button Native Style */}
                <button 
                  onClick={() => setSelectedCatch(null)}
                  className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center z-50 text-white"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>

                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                  <h3 className="text-3xl font-black text-white shadow-sm drop-shadow-md mb-2">{selectedCatch.fish_type || 'דג לא ידוע'}</h3>
                  
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="flex items-center gap-1.5 text-white/90 text-sm font-bold bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl">
                      <Scale className="w-4 h-4" /> {selectedCatch.weight || 'משקל לא צוין'}
                    </span>
                    <span className="flex items-center gap-1.5 text-white/90 text-sm font-bold bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl" dir="ltr">
                      <Calendar className="w-4 h-4" /> {format(new Date(selectedCatch.$createdAt), 'dd/MM/yyyy')}
                    </span>
                  </div>

                  {selectedCatch.text && (
                    <p className="text-sm text-white/80 font-medium leading-relaxed bg-black/40 backdrop-blur-md p-4 rounded-2xl mb-4 border border-white/10">
                      {selectedCatch.text}
                    </p>
                  )}

                  {selectedCatch.location?.includes('|||') && (
                    <Button 
                      className="w-full bg-cyan-500 hover:bg-cyan-600 text-white rounded-2xl h-14 font-black shadow-xl"
                      onClick={() => window.open(selectedCatch.location.split('|||')[1].trim(), '_blank')}
                    >
                      <MapPin className="w-5 h-5 ml-2" /> פתח מיקום הדיג במפה
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
