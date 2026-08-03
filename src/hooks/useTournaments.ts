import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, APPWRITE_DB_ID, APPWRITE_TOURNAMENTS_ID, APPWRITE_PROFILES_ID, APPWRITE_NOTIFICATIONS_ID } from "@/lib/appwrite";
import { ID, Query } from "appwrite";

export interface Tournament {
  $id: string;
  title: string;
  description: string;
  status: string; // 'active', 'upcoming', 'completed'
  start_date: string;
  end_date: string;
  entry_fee: number;
  prize_pool: number;
  participants: string[];
  image_id?: string;
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

  const activeTournaments = tournaments.filter(t => t.status === 'active');

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
      // 1. Mark as completed and set winner
      await databases.updateDocument(APPWRITE_DB_ID, APPWRITE_TOURNAMENTS_ID, tournamentId, {
        status: 'completed',
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
        message: `מזל טוב! זכית במקום הראשון וקיבלת ${prize} נקודות מהקופה, ותג אלוף חדש!`,
        is_read: "false",
        type: "tournament_win"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    }
  });

  const joinTournamentMutation = useMutation({
    mutationFn: async ({ tournamentId, entryFee, userId }: { tournamentId: string, entryFee: number, userId: string }) => {
      // 1. Get user profile and check points
      const profileRes = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_PROFILES_ID, [
        Query.equal("user_id", userId)
      ]);
      if (profileRes.documents.length === 0) throw new Error("Profile not found");
      const profile = profileRes.documents[0];
      
      if ((profile.points || 0) < entryFee) {
        throw new Error("אין מספיק נקודות דיגון להרשמה");
      }

      // 2. Deduct points
      await databases.updateDocument(APPWRITE_DB_ID, APPWRITE_PROFILES_ID, profile.$id, {
        points: profile.points - entryFee
      });

      // 3. Update tournament (add participant, add entry_fee to prize_pool)
      const t = await databases.getDocument(APPWRITE_DB_ID, APPWRITE_TOURNAMENTS_ID, tournamentId);
      const newParticipants = [...(t.participants || []), userId];
      await databases.updateDocument(APPWRITE_DB_ID, APPWRITE_TOURNAMENTS_ID, tournamentId, {
        participants: newParticipants,
        prize_pool: (t.prize_pool || 0) + entryFee
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    }
  });

  const deleteTournamentMutation = useMutation({
    mutationFn: async (tournamentId: string) => {
      await databases.deleteDocument(APPWRITE_DB_ID, APPWRITE_TOURNAMENTS_ID, tournamentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
    }
  });

  return {
    tournaments,
    activeTournaments,
    isLoading,
    createTournament: (data: any) => createTournamentMutation.mutate(data),
    endTournament: (data: any) => endTournamentMutation.mutate(data),
    deleteTournament: (id: string) => deleteTournamentMutation.mutate(id),
    joinTournament: (data: any) => joinTournamentMutation.mutateAsync(data),
    isCreating: createTournamentMutation.isPending,
    isEnding: endTournamentMutation.isPending,
    isDeleting: deleteTournamentMutation.isPending,
    isJoining: joinTournamentMutation.isPending
  };
}
