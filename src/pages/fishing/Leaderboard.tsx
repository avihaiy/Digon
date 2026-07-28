import { useQuery } from "@tanstack/react-query";
import { databases, APPWRITE_DB_ID, APPWRITE_PROFILES_ID } from "@/lib/appwrite";
import { Query } from "appwrite";
import { useAuth } from "@/hooks/useAuth";
import { Trophy, Medal, Star, Crown } from "lucide-react";
import { motion } from "framer-motion";

export default function Leaderboard() {
  const { user } = useAuth();

  const { data: leaders, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      try {
        const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_PROFILES_ID, [
          Query.orderDesc("points"),
          Query.limit(50)
        ]);
        return res.documents;
      } catch (e) {
        return [];
      }
    },
  });

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 mt-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            טבלת האלופים <Trophy className="w-6 h-6 text-yellow-500" />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            הדייגים המובילים של החודש
          </p>
        </div>
      </div>

      {/* Podium for Top 3 */}
      {!isLoading && leaders && leaders.length >= 3 && (
        <div className="flex items-end justify-center gap-4 px-4 h-48 mt-8 mb-12">
          {/* 2nd Place */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="flex flex-col items-center w-24"
          >
            <div className="relative">
              <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-xl font-bold border-4 border-slate-300 dark:border-slate-600 shadow-lg">
                {leaders[1]?.name?.charAt(0) || "ד"}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-slate-300 dark:bg-slate-600 rounded-full p-1 border-2 border-background">
                <Medal className="w-4 h-4 text-slate-500 dark:text-slate-300" />
              </div>
            </div>
            <p className="font-bold text-sm mt-3 truncate w-full text-center">{leaders[1]?.name?.split(' ')[0]}</p>
            <p className="text-xs text-yellow-600 dark:text-yellow-500 font-bold">{leaders[1]?.points || 0} נק׳</p>
            <div className="w-full h-16 bg-gradient-to-t from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700/50 mt-2 rounded-t-xl border-x border-t border-slate-200 dark:border-slate-700/50 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center text-3xl font-black text-slate-300 dark:text-slate-600/50">2</div>
            </div>
          </motion.div>

          {/* 1st Place */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="flex flex-col items-center w-28 -mt-8 relative z-10"
          >
            <div className="relative">
              <Crown className="w-8 h-8 text-yellow-500 absolute -top-6 left-1/2 -translate-x-1/2 -rotate-12" />
              <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center text-2xl font-bold border-4 border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.5)]">
                {leaders[0]?.name?.charAt(0) || "ד"}
              </div>
            </div>
            <p className="font-black text-base mt-3 truncate w-full text-center text-yellow-600 dark:text-yellow-500">{leaders[0]?.name?.split(' ')[0]}</p>
            <p className="text-sm text-yellow-600 dark:text-yellow-500 font-bold bg-yellow-500/10 px-2 py-0.5 rounded-full mt-1">{leaders[0]?.points || 0} נק׳</p>
            <div className="w-full h-24 bg-gradient-to-t from-yellow-500/20 to-yellow-500/5 mt-2 rounded-t-xl border-x border-t border-yellow-500/30 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center text-5xl font-black text-yellow-500/20">1</div>
            </div>
          </motion.div>

          {/* 3rd Place */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="flex flex-col items-center w-24"
          >
            <div className="relative">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center text-xl font-bold border-4 border-orange-400 dark:border-orange-700 shadow-lg">
                {leaders[2]?.name?.charAt(0) || "ד"}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-orange-200 dark:bg-orange-800 rounded-full p-1 border-2 border-background">
                <Medal className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="font-bold text-sm mt-3 truncate w-full text-center">{leaders[2]?.name?.split(' ')[0]}</p>
            <p className="text-xs text-yellow-600 dark:text-yellow-500 font-bold">{leaders[2]?.points || 0} נק׳</p>
            <div className="w-full h-12 bg-gradient-to-t from-orange-200/50 to-orange-100/50 dark:from-orange-900/30 dark:to-orange-800/10 mt-2 rounded-t-xl border-x border-t border-orange-300 dark:border-orange-800/50 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center text-3xl font-black text-orange-400/20 dark:text-orange-700/30">3</div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Rest of the List */}
      <section className="px-4">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            {leaders?.slice(3).map((leader: any, index: number) => {
              const rank = index + 4;
              const isCurrentUser = leader.user_id === user?.$id;
              
              return (
                <div 
                  key={leader.$id} 
                  className={`flex items-center p-4 border-b border-border last:border-0 ${
                    isCurrentUser ? 'bg-primary/5 relative' : ''
                  }`}
                >
                  {isCurrentUser && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                  )}
                  
                  <div className="w-8 font-bold text-muted-foreground text-sm">
                    #{rank}
                  </div>
                  
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold shrink-0 mx-3">
                    {leader.name?.charAt(0) || "ד"}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${isCurrentUser ? 'text-primary' : ''}`}>
                      {leader.name || "משתמש לא ידוע"}
                      {isCurrentUser && <span className="ml-2 text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-normal">אתה</span>}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1.5 bg-yellow-500/10 px-3 py-1 rounded-full">
                    <Star className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-500 fill-yellow-600 dark:fill-yellow-500" />
                    <span className="font-bold text-sm text-yellow-600 dark:text-yellow-500">{leader.points || 0}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
