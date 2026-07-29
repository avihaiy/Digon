import { useTournaments } from "@/hooks/useTournaments";
import { Card } from "@/components/ui/card";
import { Trophy, Clock, Target } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { EndTournamentDialog } from "@/components/fishing/EndTournamentDialog";

export default function Tournaments() {
  const { tournaments, isLoading } = useTournaments();
  const { userRole } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const activeTournaments = tournaments.filter(t => t.is_active);
  const pastTournaments = tournaments.filter(t => !t.is_active);

  return (
    <div className="max-w-md mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-yellow-500/20 rounded-2xl">
          <Trophy className="w-8 h-8 text-yellow-500" />
        </div>
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-l from-yellow-400 to-amber-600 bg-clip-text text-transparent">תחרויות ואתגרים</h1>
          <p className="text-sm text-muted-foreground">השתתף בתחרויות וזכה בפרסים שווים!</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-bold text-lg px-2 flex items-center gap-2">
          <Target className="w-5 h-5 text-green-500" />
          תחרויות פעילות
        </h2>
        {activeTournaments.length === 0 ? (
          <div className="text-center p-8 bg-card rounded-2xl border border-border">
            <p className="text-muted-foreground">אין תחרויות פעילות כרגע.</p>
          </div>
        ) : (
          activeTournaments.map(t => (
            <Card key={t.$id} className="p-5 border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-transparent relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
              
              <div className="flex justify-between items-start relative z-10">
                <h3 className="text-xl font-bold text-yellow-500">{t.title}</h3>
                <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full animate-pulse">פעיל עכשיו!</span>
              </div>
              
              <p className="text-sm mt-3 text-slate-300">{t.description}</p>
              
              <div className="mt-5 flex items-center justify-between border-t border-yellow-500/20 pt-4">
                <div className="flex items-center gap-2 text-yellow-400 font-bold">
                  <Trophy className="w-4 h-4" />
                  פרס: {t.prize_points} נק׳
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  עד: {format(new Date(t.end_date), "dd/MM/yyyy")}
                </div>
              </div>
              
              <div className="mt-4 bg-black/40 text-center p-2 rounded-lg text-xs text-slate-400 border border-white/5">
                כדי להשתתף, פשוט העלה דיווח תפיסה ושייך אותו לתחרות זו.
              </div>

              {userRole === 'admin' && (
                <EndTournamentDialog tournament={t} />
              )}
            </Card>
          ))
        )}
      </div>

      {pastTournaments.length > 0 && (
        <div className="space-y-4 mt-10">
          <h2 className="font-bold text-lg px-2 opacity-80">תחרויות עבר</h2>
          {pastTournaments.map(t => (
            <Card key={t.$id} className="p-4 opacity-70">
              <h3 className="font-bold">{t.title}</h3>
              <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                <span>פרס: {t.prize_points} נק׳</span>
                <span>הסתיימה</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
