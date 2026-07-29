import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { databases, APPWRITE_DB_ID, APPWRITE_PROFILES_ID } from "@/lib/appwrite";
import { Query } from "appwrite";
import { useTournaments, Tournament } from "@/hooks/useTournaments";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy } from "lucide-react";
import { toast } from "sonner";

interface Props {
  tournament: Tournament;
}

export function EndTournamentDialog({ tournament }: Props) {
  const [open, setOpen] = useState(false);
  const [winnerId, setWinnerId] = useState("");
  const { endTournament, isEnding } = useTournaments();

  // Fetch users for the dropdown
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["usersForTournament"],
    queryFn: async () => {
      const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_PROFILES_ID, [
        Query.limit(100),
        Query.orderDesc("points")
      ]);
      return res.documents;
    },
    enabled: open
  });

  const handleEnd = () => {
    if (!winnerId) {
      toast.error("אנא בחר זוכה");
      return;
    }
    
    endTournament(
      { tournamentId: tournament.$id, winnerId, prize: tournament.prize_points },
      {
        onSuccess: () => {
          toast.success("התחרות הסתיימה בהצלחה והפרס נשלח לזוכה!");
          setOpen(false);
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="mt-4 w-full bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black border-yellow-500/50">
          <Trophy className="w-4 h-4 ml-2" />
          סגור תחרות (Admin)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>סיום תחרות - {tournament.title}</DialogTitle>
          <DialogDescription>
            בחר את הזוכה בתחרות. המשתמש יקבל אוטומטית {tournament.prize_points} נקודות, תג אלוף, והתראת זכייה!
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-2 my-4">
          <Label htmlFor="winner" className="mb-1">בחר דייג זוכה</Label>
          <Select value={winnerId} onValueChange={setWinnerId} disabled={isLoadingUsers}>
            <SelectTrigger id="winner" className="w-full">
              <SelectValue placeholder={isLoadingUsers ? "טוען משתמשים..." : "בחר זוכה מהרשימה..."} />
            </SelectTrigger>
            <SelectContent dir="rtl">
              {users?.map((u: any) => (
                <SelectItem key={u.user_id} value={u.user_id}>
                  {u.full_name || u.user_name || "משתמש אנונימי"} ({u.points} נק׳)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter className="sm:justify-start">
          <Button type="button" onClick={handleEnd} disabled={isEnding || !winnerId} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold">
            {isEnding ? "מסיים תחרות..." : "הכרז על זוכה וסיים תחרות!"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
