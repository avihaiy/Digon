import { useQuery } from "@tanstack/react-query";
import { databases, APPWRITE_DB_ID, APPWRITE_PROFILES_ID } from "@/lib/appwrite";
import { Query } from "appwrite";

export function useUserBadges(userId: string) {
  const { data: badges = [], isLoading } = useQuery({
    queryKey: ["badges", userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_PROFILES_ID, [
          Query.equal("user_id", userId),
          Query.limit(1)
        ]);
        if (res.documents.length > 0) {
          const profile = res.documents[0];
          // Badges is stored as an array of strings in Appwrite
          return (profile.badges as string[]) || [];
        }
        return [];
      } catch (e) {
        console.error("Failed to fetch badges", e);
        return [];
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 60 // Cache for 1 hour
  });

  return { badges, isLoading };
}
