import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { databases, APPWRITE_DB_ID, APPWRITE_CATCHES_ID, APPWRITE_PROFILES_ID } from "@/lib/appwrite";
import { Query } from "appwrite";
import { useTournaments } from "@/hooks/useTournaments";
import { ArrowRight, Trophy, Medal, Scale, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export default function TournamentView() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { tournaments, isLoading: isTournamentsLoading } = useTournaments();
  const { user } = useAuth();
  
  const tournament = tournaments.find(t => t.$id === tournamentId);

  // Fetch Catches for this tournament
  const { data: leaderboard, isLoading: isLeaderboardLoading } = useQuery({
    queryKey: ["tournament-leaderboard", tournamentId],
    queryFn: async () => {
      if (!tournamentId || !tournament) return [];
      
      const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_CATCHES_ID, [
        Query.equal("tournament_id", tournamentId),
        Query.equal("status", "approved"),
        Query.limit(500)
      ]);

      // Calculate total weight per user
      const userStats: Record<string, { userId: string, userName: string, totalWeight: number, catches: number }> = {};
      
      res.documents.forEach((catchDoc: any) => {
        let weightInGrams = 0;
        const weightStr = (catchDoc.weight || "").toLowerCase();
        
        const numMatch = weightStr.match(/[\d.]+/);
        if (numMatch) {
          let val = parseFloat(numMatch[0]);
          if (weightStr.includes('kg') || weightStr.includes('ק"ג') || weightStr.includes('קילו')) {
            weightInGrams = val * 1000;
          } else {
            weightInGrams = val;
          }
        }
        
        if (!userStats[catchDoc.user_id]) {
          userStats[catchDoc.user_id] = {
            userId: catchDoc.user_id,
            userName: catchDoc.user_name || "דייג אנונימי",
            totalWeight: 0,
            catches: 0
          };
        }
        
        userStats[catchDoc.user_id].totalWeight += weightInGrams;
        userStats[catchDoc.user_id].catches += 1;
      });

      // Sort by total weight descending
      return Object.values(userStats).sort((a, b) => b.totalWeight - a.totalWeight);
    },
    enabled: !!tournamentId && !!tournament
  });

  if (isTournamentsLoading || isLeaderboardLoading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="text-center p-8">
        <p>תחרות לא נמצאה.</p>
        <Button onClick={() => navigate("/fishing/tournaments")} className="mt-4">חזור לתחרויות</Button>
      </div>
    );
  }

  const formatWeight = (grams: number) => {
    if (grams >= 1000) return `${(grams / 1000).toFixed(2)} ק״ג`;
    return `${grams} גרם`;
  };

  const isRegistered = user ? tournament.participants?.includes(user.$id) : false;

  return (
    <div className="max-w-md mx-auto space-y-6 pb-24 animate-fade-in">
      <div className="flex items-center gap-3 px-4 pt-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/fishing/tournaments")} className="rounded-full bg-white/5">
          <ArrowRight className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">{tournament.title}</h1>
      </div>

      <div className="px-4">
        <Card className="p-6 border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card relative overflow-hidden shadow-xl shadow-amber-900/5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="relative z-10 flex flex-col items-center text-center space-y-2">
            <Trophy className="w-12 h-12 text-amber-500 mb-2 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
            <h2 className="text-2xl font-black text-amber-500">קופת הפרס</h2>
            <div className="text-4xl font-black bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              {tournament.prize_pool} 🪙
            </div>
            <p className="text-sm text-slate-500 font-medium mt-2">סך הכל {tournament.participants?.length || 0} משתתפים נרשמו</p>
          </div>
        </Card>
      </div>

      <div className="px-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Medal className="w-5 h-5 text-amber-500" /> טבלת מובילים (סך משקל)
          </h3>
        </div>

        {leaderboard?.length === 0 ? (
          <div className="text-center p-8 bg-card rounded-2xl border border-border">
            <Scale className="w-12 h-12 text-slate-300 mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground font-medium">אין תפיסות עדיין. היה הראשון לדווח!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard?.map((userStat, index) => (
              <div 
                key={userStat.userId}
                className={`flex items-center justify-between p-4 rounded-2xl border ${
                  index === 0 
                    ? "bg-gradient-to-r from-amber-500/20 to-amber-500/5 border-amber-500/50 shadow-lg shadow-amber-500/10" 
                    : index === 1 
                      ? "bg-slate-300/10 border-slate-300/30" 
                      : index === 2 
                        ? "bg-orange-700/10 border-orange-700/30" 
                        : "bg-card border-border"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${
                    index === 0 ? "bg-amber-500 text-white shadow-md shadow-amber-500/30" :
                    index === 1 ? "bg-slate-300 text-slate-800" :
                    index === 2 ? "bg-orange-700 text-white" :
                    "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className={`font-bold ${index === 0 ? "text-amber-600 dark:text-amber-400 text-lg" : ""}`}>
                      {userStat.userName}
                    </p>
                    <p className="text-xs text-slate-500">{userStat.catches} תפיסות בדיווח</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className={`font-black ${index === 0 ? "text-amber-600 dark:text-amber-400 text-xl" : "text-lg"}`}>
                    {formatWeight(userStat.totalWeight)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {!isRegistered && tournament.status === 'active' && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-40">
          <Button 
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-xl shadow-orange-500/30"
            onClick={() => navigate("/fishing/tournaments")}
          >
            חזור והירשם לתחרות 🏆
          </Button>
        </div>
      )}
    </div>
  );
}
