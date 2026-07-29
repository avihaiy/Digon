import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { databases, APPWRITE_DB_ID, APPWRITE_PROFILES_ID, APPWRITE_CATCHES_ID } from "@/lib/appwrite";
import { Query } from "appwrite";
import { BadgeIcon } from "@/components/fishing/BadgeIcon";
import { getImageUrl } from "@/hooks/useCatches";
import { ArrowRight, Trophy, Fish, Star, MapPin, Scale, Activity, UserPlus, Check, Users, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useFollowers } from "@/hooks/useFollowers";
import { Button } from "@/components/ui/button";

export default function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { followersCount, followingCount, isFollowing, toggleFollow, isToggling } = useFollowers(userId || "");

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-background max-w-lg mx-auto text-foreground">
        <h2 className="text-xl font-bold mb-4">פרופיל לא נמצא</h2>
        <button onClick={() => navigate(-1)} className="text-primary hover:underline">חזור אחורה</button>
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
          // Convert grams to kg for comparison
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

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background pb-20 max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-xl shadow-black/5 ring-1 ring-border/50">
      {/* Header Cover */}
      <div className="h-44 bg-gradient-to-br from-cyan-600 to-blue-800 dark:from-cyan-900 dark:to-blue-950 relative overflow-hidden rounded-b-3xl shadow-md">
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-4 right-4 w-10 h-10 bg-black/20 hover:bg-black/40 transition-colors backdrop-blur-md rounded-full flex items-center justify-center z-20"
        >
          <ArrowRight className="w-5 h-5 text-white" />
        </button>
        <div className="absolute inset-0 bg-[url('/fishing_sunset_bg.jpg')] opacity-30 bg-cover bg-center mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute -bottom-10 right-6 z-20">
          <div className="w-24 h-24 rounded-3xl border-4 border-background bg-gradient-to-tr from-cyan-500 to-blue-500 shadow-2xl flex items-center justify-center text-3xl font-black text-white transform rotate-3 hover:rotate-0 transition-transform">
            {profile.full_name?.charAt(0) || profile.user_name?.charAt(0) || "ד"}
          </div>
        </div>
      </div>

      <div className="px-6 pt-14">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{profile.full_name || profile.user_name || "דייג"}</h1>
            {profile.title && (
              <span className="inline-flex items-center gap-1 mt-1.5 text-xs bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30 px-2.5 py-0.5 rounded-full font-bold shadow-sm">
                <Trophy className="w-3 h-3" /> {profile.title}
              </span>
            )}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground font-medium">
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> <strong className="text-slate-900 dark:text-white text-sm">{followersCount}</strong> עוקבים</span>
              <span className="flex items-center gap-1"><UserPlus className="w-3.5 h-3.5" /> <strong className="text-slate-900 dark:text-white text-sm">{followingCount}</strong> נעקבים</span>
            </div>
          </div>
          {currentUser && currentUser.$id !== userId && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={isFollowing ? "outline" : "default"}
                onClick={() => toggleFollow()}
                disabled={isToggling}
                className={`rounded-full h-8 px-4 text-xs font-bold ${isFollowing ? 'border-cyan-500/50 text-cyan-400' : 'bg-cyan-600 hover:bg-cyan-700'}`}
              >
                {isFollowing ? (
                  <>
                    <Check className="w-3 h-3 ml-1" />
                    נעקב
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3 h-3 ml-1" />
                    עקוב
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full h-8 px-3 border-cyan-500/50 text-cyan-400 hover:bg-cyan-950/30"
                onClick={() => navigate('/fishing/messages')}
              >
                <MessageCircle className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Stats Glass Card */}
        <div className="flex items-center gap-6 mt-6 bg-white dark:bg-white/5 rounded-3xl p-5 border border-slate-100 dark:border-white/10 shadow-lg shadow-slate-200/50 dark:shadow-none">
          <div className="flex flex-col items-center justify-center flex-1 group">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Fish className="w-6 h-6 text-blue-500 dark:text-cyan-400" />
            </div>
            <span className="font-black text-xl text-slate-900 dark:text-white">{catches.length}</span>
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">תפיסות</span>
          </div>
          <div className="w-px h-16 bg-slate-100 dark:bg-white/10"></div>
          <div className="flex flex-col items-center justify-center flex-1 group">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Star className="w-6 h-6 text-amber-500 dark:text-amber-400" />
            </div>
            <span className="font-black text-xl text-slate-900 dark:text-white">{profile.points || 0}</span>
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">מוניטין</span>
          </div>
        </div>

        {catches.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-300 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              סטטיסטיקות אישיות
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 shadow-sm rounded-2xl p-4 flex items-center gap-3">
                <div className="bg-cyan-50 dark:bg-cyan-500/10 p-2.5 rounded-xl">
                  <Fish className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground">הדג הכי נפוץ</p>
                  <p className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-[90px]">{mostCaughtSpecies}</p>
                </div>
              </div>
              <div className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 shadow-sm rounded-2xl p-4 flex items-center gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-500/10 p-2.5 rounded-xl">
                  <Scale className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground">משקל שיא</p>
                  <p className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-[90px]" dir="ltr">{biggestCatchWeight}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {badges.length > 0 && (
          <div className="mt-8">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-300 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              תגיות והישגים ({badges.length})
            </div>
          </h3>  <div className="flex flex-wrap gap-2">
              {badges.map((badgeId: string) => (
                <BadgeIcon key={badgeId} badgeId={badgeId} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-300 mb-4">גלריית תפיסות ({catches.length})</h3>
          {isCatchesLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full" />
            </div>
          ) : catches.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {catches.map((catchItem, index) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  key={catchItem.$id} 
                  className="relative aspect-square rounded-2xl overflow-hidden group border border-slate-100 dark:border-white/10 shadow-sm"
                >
                  <img src={getImageUrl(catchItem.image_id)} alt={catchItem.fish_type} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-3 right-3 left-3">
                    <p className="font-bold text-sm text-white truncate">{catchItem.fish_type}</p>
                    <p className="text-[10px] text-white/70 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {catchItem.location}
      <div className="min-h-screen flex flex-col items-center justify-center bg-background max-w-lg mx-auto text-foreground">
        <h2 className="text-xl font-bold mb-4">פרופיל לא נמצא</h2>
        <button onClick={() => navigate(-1)} className="text-primary hover:underline">חזור אחורה</button>
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
          // Convert grams to kg for comparison
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

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background pb-20 max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-xl shadow-black/5 ring-1 ring-border/50">
      {/* Header Cover */}
      <div className="h-44 bg-gradient-to-br from-cyan-600 to-blue-800 dark:from-cyan-900 dark:to-blue-950 relative overflow-hidden rounded-b-3xl shadow-md">
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-4 right-4 w-10 h-10 bg-black/20 hover:bg-black/40 transition-colors backdrop-blur-md rounded-full flex items-center justify-center z-20"
        >
          <ArrowRight className="w-5 h-5 text-white" />
        </button>
        <div className="absolute inset-0 bg-[url('/fishing_sunset_bg.jpg')] opacity-30 bg-cover bg-center mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute -bottom-10 right-6 z-20">
          <div className="w-24 h-24 rounded-3xl border-4 border-background bg-gradient-to-tr from-cyan-500 to-blue-500 shadow-2xl flex items-center justify-center text-3xl font-black text-white transform rotate-3 hover:rotate-0 transition-transform">
            {profile.full_name?.charAt(0) || profile.user_name?.charAt(0) || "ד"}
          </div>
        </div>
      </div>

      <div className="px-6 pt-14">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{profile.full_name || profile.user_name || "דייג"}</h1>
            {profile.title && (
              <span className="inline-flex items-center gap-1 mt-1.5 text-xs bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30 px-2.5 py-0.5 rounded-full font-bold shadow-sm">
                <Trophy className="w-3 h-3" /> {profile.title}
              </span>
            )}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground font-medium">
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> <strong className="text-slate-900 dark:text-white text-sm">{followersCount}</strong> עוקבים</span>
              <span className="flex items-center gap-1"><UserPlus className="w-3.5 h-3.5" /> <strong className="text-slate-900 dark:text-white text-sm">{followingCount}</strong> נעקבים</span>
            </div>
          </div>
          {currentUser && currentUser.$id !== userId && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={isFollowing ? "outline" : "default"}
                onClick={() => toggleFollow()}
                disabled={isToggling}
                className={`rounded-full h-8 px-4 text-xs font-bold ${isFollowing ? 'border-cyan-500/50 text-cyan-400' : 'bg-cyan-600 hover:bg-cyan-700'}`}
              >
                {isFollowing ? (
                  <>
                    <Check className="w-3 h-3 ml-1" />
                    נעקב
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3 h-3 ml-1" />
                    עקוב
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full h-8 px-3 border-cyan-500/50 text-cyan-400 hover:bg-cyan-950/30"
                onClick={() => navigate('/fishing/messages')}
              >
                <MessageCircle className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Stats Glass Card */}
        <div className="flex items-center gap-6 mt-6 bg-white dark:bg-white/5 rounded-3xl p-5 border border-slate-100 dark:border-white/10 shadow-lg shadow-slate-200/50 dark:shadow-none">
          <div className="flex flex-col items-center justify-center flex-1 group">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Fish className="w-6 h-6 text-blue-500 dark:text-cyan-400" />
            </div>
            <span className="font-black text-xl text-slate-900 dark:text-white">{catches.length}</span>
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">תפיסות</span>
          </div>
          <div className="w-px h-16 bg-slate-100 dark:bg-white/10"></div>
          <div className="flex flex-col items-center justify-center flex-1 group">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Star className="w-6 h-6 text-amber-500 dark:text-amber-400" />
            </div>
            <span className="font-black text-xl text-slate-900 dark:text-white">{profile.points || 0}</span>
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">מוניטין</span>
          </div>
        </div>

        {catches.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-300 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              סטטיסטיקות אישיות
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 shadow-sm rounded-2xl p-4 flex items-center gap-3">
                <div className="bg-cyan-50 dark:bg-cyan-500/10 p-2.5 rounded-xl">
                  <Fish className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground">הדג הכי נפוץ</p>
                  <p className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-[90px]">{mostCaughtSpecies}</p>
                </div>
              </div>
              <div className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 shadow-sm rounded-2xl p-4 flex items-center gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-500/10 p-2.5 rounded-xl">
                  <Scale className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground">משקל שיא</p>
                  <p className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-[90px]" dir="ltr">{biggestCatchWeight}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {badges.length > 0 && (
          <div className="mt-8">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-300 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              תגיות והישגים ({badges.length})
            </div>
          </h3>  <div className="flex flex-wrap gap-2">
              {badges.map((badgeId: string) => (
                <BadgeIcon key={badgeId} badgeId={badgeId} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-300 mb-4">גלריית תפיסות ({catches.length})</h3>
          {isCatchesLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full" />
            </div>
          ) : catches.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {catches.map((catchItem, index) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  key={catchItem.$id} 
                  className="relative aspect-square rounded-2xl overflow-hidden group border border-slate-100 dark:border-white/10 shadow-sm"
                >
                  <img src={getImageUrl(catchItem.image_id)} alt={catchItem.fish_type} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-3 right-3 left-3">
                    <p className="font-bold text-sm text-white truncate">{catchItem.fish_type}</p>
                    <p className="text-[10px] text-white/70 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {catchItem.location}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-3xl shadow-sm">
              <Fish className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">עוד לא העלה תפיסות</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
