import { useTournaments } from "@/hooks/useTournaments";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Clock, Target, Users, Coins, Flame } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Tournaments() {
  const { tournaments, isLoading, joinTournament } = useTournaments();
  const { user } = useAuth();
  const [joiningId, setJoiningId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const activeTournaments = tournaments.filter(t => t.status === 'active');
  const pastTournaments = tournaments.filter(t => t.status !== 'active');

  const handleJoin = async (t: any) => {
    if (!user) {
      toast.error("יש להתחבר כדי להירשם לתחרות");
      return;
    }
    setJoiningId(t.$id);
    try {
      await joinTournament({ tournamentId: t.$id, entryFee: t.entry_fee, userId: user.$id });
      toast.success(`נרשמת בהצלחה ל${t.title}! בהצלחה! 🎣`);
    } catch (e: any) {
      toast.error(e.message || "שגיאה בהרשמה לתחרות");
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pb-20 animate-fade-in">
      <div className="flex items-center gap-3 mb-6 px-2">
        <div className="p-3 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-2xl shadow-lg shadow-amber-500/20">
          <Trophy className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-l from-yellow-400 to-amber-600 bg-clip-text text-transparent">ליגת דיגון</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">הירשם, תפוס דגים, וקח את כל הקופה!</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-bold text-lg px-2 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
          תחרויות חמות
        </h2>
        
        {activeTournaments.length === 0 ? (
          <div className="text-center p-8 bg-card rounded-2xl border border-border">
            <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground font-medium">אין תחרויות פעילות כרגע, עקוב אחרי העדכונים!</p>
          </div>
        ) : (
          activeTournaments.map(t => {
            const isRegistered = user ? t.participants?.includes(user.$id) : false;

            return (
              <Card key={t.$id} className="p-5 border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card relative overflow-hidden shadow-xl shadow-amber-900/5">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                
                <div className="flex justify-between items-start relative z-10">
                  <h3 className="text-xl font-bold text-amber-500">{t.title}</h3>
                  {isRegistered ? (
                    <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm shadow-green-500/30">
                      נרשמת בהצלחה! ✓
                    </span>
                  ) : (
                    <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse shadow-sm shadow-amber-500/30">
                      הרשמה פתוחה
                    </span>
                  )}
                </div>
                
                <p className="text-sm mt-3 text-slate-600 dark:text-slate-300 relative z-10 font-medium">{t.description}</p>
                
                <div className="grid grid-cols-2 gap-3 mt-5 relative z-10">
                  <div className="bg-white/50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-500 mb-1 font-bold">קופת פרס מצטברת</p>
                    <div className="flex items-center gap-1.5 text-amber-500 font-black text-lg">
                      <Trophy className="w-4 h-4" />
                      {t.prize_pool} 🪙
                    </div>
                  </div>
                  <div className="bg-white/50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-500 mb-1 font-bold">משתתפים שנירשמו</p>
                    <div className="flex items-center gap-1.5 text-blue-500 font-black text-lg">
                      <Users className="w-4 h-4" />
                      {t.participants?.length || 0}
                    </div>
                  </div>
                </div>
                
                <div className="mt-5 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-4 relative z-10">
                  <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                    <Clock className="w-4 h-4" />
                    עד: {format(new Date(t.end_date), "dd/MM/yyyy")}
                  </div>
                  
                  <div className="flex gap-2">
                    {!isRegistered && (
                      <Button 
                        onClick={() => handleJoin(t)} 
                        disabled={joiningId === t.$id}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold px-6 shadow-md shadow-orange-500/20"
                      >
                        {joiningId === t.$id ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>הירשם ב-{t.entry_fee} 🪙</>
                        )}
                      </Button>
                    )}
                    {isRegistered && (
                      <Button variant="outline" className="font-bold border-green-500/30 text-green-600 bg-green-500/10 cursor-default hover:bg-green-500/10 hover:text-green-600">
                        מתחרה בפנים! 🎣
                      </Button>
                    )}
                    <Button 
                      variant="outline"
                      className="border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                      onClick={() => navigate(`/fishing/tournaments/${t.$id}`)}
                    >
                      צפה בטבלה
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {pastTournaments.length > 0 && (
        <div className="space-y-4 mt-10">
          <h2 className="font-bold text-lg px-2 opacity-80 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            היסטוריית תחרויות
          </h2>
          {pastTournaments.map(t => (
            <Card key={t.$id} className="p-4 opacity-70 border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-700 dark:text-slate-300">{t.title}</h3>
              <div className="flex justify-between mt-2 text-sm text-muted-foreground items-end">
                <div className="space-y-1">
                  <span className="flex items-center gap-1"><Trophy className="w-3 h-3"/> קופה: {t.prize_pool} 🪙</span>
                  <span className="font-bold text-slate-500">{t.status === 'upcoming' ? 'בקרוב' : 'הסתיימה'}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-8 text-xs font-bold"
                  onClick={() => navigate(`/fishing/tournaments/${t.$id}`)}
                >
                  צפה בטבלה
                </Button>
              </div>
              {t.winner_user_id && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-amber-500">
                  מנצח: {t.winner_user_id}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
