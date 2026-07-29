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
      <div className="min-h-screen flex items-center justify-center bg-[#020610]">
        <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#020610] text-white">
        <h2 className="text-xl font-bold mb-4">פרופיל לא נמצא</h2>
        <button onClick={() => navigate(-1)} className="text-cyan-400">חזור אחורה</button>
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
    <div className="min-h-screen bg-[#020610] text-white pb-20">
      {/* Header Cover */}
      <div className="h-40 bg-gradient-to-br from-cyan-900 to-blue-900 relative">
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-4 right-4 w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center z-10"
        >
          <ArrowRight className="w-5 h-5 text-white" />
        </button>
        <div className="absolute inset-0 bg-[url('/fishing_bg.jpg')] opacity-20 bg-cover bg-center"></div>
        <div className="absolute -bottom-12 right-6">
          <div className="w-24 h-24 rounded-full border-4 border-[#020610] bg-gradient-to-tr from-cyan-500 to-blue-500 shadow-xl flex items-center justify-center text-3xl font-black text-white">
            {profile.full_name?.charAt(0) || profile.user_name?.charAt(0) || "ד"}
          </div>
        </div>
      </div>

      <div className="px-6 pt-16">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black">{profile.full_name || profile.user_name || "דייג"}</h1>
            {profile.title && (
              <span className="inline-block mt-1 text-xs bg-cyan-900/40 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-md font-bold">
                {profile.title}
              </span>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
              <span><strong className="text-white">{followersCount}</strong> עוקבים</span>
              <span><strong className="text-white">{followingCount}</strong> נעקבים</span>
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

        <div className="flex items-center gap-6 mt-6 bg-white/5 rounded-2xl p-4 border border-white/5">
          <div className="flex flex-col items-center justify-center flex-1">
            <Fish className="w-6 h-6 text-cyan-400 mb-1" />
            <span className="font-bold text-lg">{catches.length}</span>
            <span className="text-[10px] text-slate-400">תפיסות</span>
          </div>
          <div className="w-px h-10 bg-white/10"></div>
          <div className="flex flex-col items-center justify-center flex-1">
            <Star className="w-6 h-6 text-amber-400 mb-1" />
            <span className="font-bold text-lg">{profile.points || 0}</span>
            <span className="text-[10px] text-slate-400">מוניטין</span>
          </div>
        </div>

        {catches.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-500" />
              סטטיסטיקות אישיות
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                <div className="bg-cyan-500/20 p-2 rounded-lg">
                  <Fish className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">הדג הכי נפוץ</p>
                  <p className="font-bold text-sm text-white truncate max-w-[100px]">{mostCaughtSpecies}</p>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                <div className="bg-emerald-500/20 p-2 rounded-lg">
                  <Scale className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">משקל שיא</p>
                  <p className="font-bold text-sm text-white truncate max-w-[100px]">{biggestCatchWeight}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {badges.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              תגים והישגים
            </h3>
            <div className="flex flex-wrap gap-2">
              {badges.map((badgeId: string) => (
                <BadgeIcon key={badgeId} badgeId={badgeId} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <h3 className="text-sm font-bold text-slate-300 mb-3">גלריית תפיסות ({catches.length})</h3>
          {isCatchesLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full" />
            </div>
          ) : catches.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {catches.map((catchItem, index) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  key={catchItem.$id} 
                  className="relative aspect-square rounded-xl overflow-hidden group border border-white/10"
                >
                  <img src={getImageUrl(catchItem.image_id)} alt={catchItem.fish_type} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#020610] via-transparent to-transparent opacity-80"></div>
                  <div className="absolute bottom-2 right-2 left-2">
                    <p className="font-bold text-sm text-white drop-shadow-md truncate">{catchItem.fish_type}</p>
                    <p className="text-[9px] text-slate-300 flex items-center gap-1 drop-shadow-md">
                      <MapPin className="w-2.5 h-2.5" />
                      {catchItem.location}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 bg-white/5 rounded-2xl border border-dashed border-white/10">
              <Fish className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
              <p className="text-sm text-slate-400">עוד לא העלה תפיסות</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
