import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, APPWRITE_DB_ID, APPWRITE_TOURNAMENTS_ID, APPWRITE_PROFILES_ID, APPWRITE_NOTIFICATIONS_ID } from "@/lib/appwrite";
import { ID, Query } from "appwrite";

export interface Tournament {
  $id: string;
  title: string;
  description: string;
  prize_points: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  winner_user_id?: string;
  $createdAt: string;
}

export function useTournaments() {
  const queryClient = useQueryClient();

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ["tournaments"],
    queryFn: async () => {
      try {
        const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_TOURNAMENTS_ID, [
          Query.orderDesc("$createdAt")
        ]);
        return res.documents as unknown as Tournament[];
      } catch (e) {
        console.error("Failed to fetch tournaments", e);
        return [];
      }
    }
  });

  const activeTournaments = tournaments.filter(t => t.is_active);

  const createTournamentMutation = useMutation({
    mutationFn: async (data: Omit<Tournament, "$id" | "$createdAt">) => {
      await databases.createDocument(APPWRITE_DB_ID, APPWRITE_TOURNAMENTS_ID, ID.unique(), data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
    }
  });

  const endTournamentMutation = useMutation({
    mutationFn: async ({ tournamentId, winnerId, prize }: { tournamentId: string, winnerId: string, prize: number }) => {
      // 1. Mark as inactive and set winner
      await databases.updateDocument(APPWRITE_DB_ID, APPWRITE_TOURNAMENTS_ID, tournamentId, {
        is_active: false,
        winner_user_id: winnerId
      });

      // 2. Add prize points and badge to winner
      const profileRes = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_PROFILES_ID, [
        Query.equal("user_id", winnerId)
      ]);
      if (profileRes.documents.length > 0) {
        const profile = profileRes.documents[0];
        const newBadges = [...((profile.badges as string[]) || [])];
        if (!newBadges.includes("tournament_winner")) {
          newBadges.push("tournament_winner");
        }
        await databases.updateDocument(APPWRITE_DB_ID, APPWRITE_PROFILES_ID, profile.$id, {
          points: (profile.points || 0) + prize,
          badges: newBadges
        });
      }

      // 3. Send notification
      await databases.createDocument(APPWRITE_DB_ID, APPWRITE_NOTIFICATIONS_ID, ID.unique(), {
        user_id: winnerId,
        title: "ניצחת בתחרות! 🏆",
        message: `מזל טוב! זכית במקום הראשון וקיבלת ${prize} נקודות, ותג אלוף חדש!`,
        is_read: "false",
        type: "tournament_win"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    }
  });

  return {
    tournaments,
    activeTournaments,
    isLoading,
    createTournament: (data: any) => createTournamentMutation.mutate(data),
    endTournament: (data: any) => endTournamentMutation.mutate(data),
    isCreating: createTournamentMutation.isPending,
    isEnding: endTournamentMutation.isPending
  };
}
