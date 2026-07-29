import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { databases, APPWRITE_DB_ID, APPWRITE_PROFILES_ID, APPWRITE_CATCHES_ID } from "@/lib/appwrite";
import { Query } from "appwrite";
import { BadgeIcon } from "@/components/fishing/BadgeIcon";
import { getImageUrl } from "@/hooks/useCatches";
import { ArrowRight, Trophy, Fish, Star, MapPin } from "lucide-react";
import { motion } from "framer-motion";

export default function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();

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
          </div>
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
